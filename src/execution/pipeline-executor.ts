/**
 * Pipeline Executor - Multi-step workflow execution
 *
 * Executes a series of tool calls server-side, passing results between steps
 * via variable references. Only the final result is returned to the LLM.
 *
 * Features:
 * - Sequential step execution
 * - Variable interpolation between steps ({{step_id.field}})
 * - Optional delays between steps
 * - Error handling with partial results
 * - Return template for selecting final output
 */

import { resolveVariables, PipelineContext, getReferencedSteps } from './variable-resolver.js';
import { applyProjection } from './field-projector.js';

/**
 * Single pipeline step definition
 */
export interface PipelineStep {
  /** Unique identifier for this step (used in variable references) */
  id: string;
  /** Name of the tool to execute */
  tool_name: string;
  /** Arguments to pass to the tool (may contain {{var}} references) */
  args: Record<string, unknown>;
  /** Optional delay in milliseconds before executing this step */
  delay_ms?: number;
}

/**
 * Return template specifying which fields to include in final response
 */
export interface ReturnTemplate {
  /** Step ID to field paths mapping */
  [stepId: string]: string[];
}

/**
 * Pipeline execution request
 */
export interface PipelineRequest {
  /** Array of steps to execute in order */
  steps: PipelineStep[];
  /** Optional template specifying which fields to return */
  return?: ReturnTemplate;
}

/**
 * Result of a successful step execution
 */
export interface StepResult {
  step_id: string;
  tool_name: string;
  success: true;
  result: unknown;
  duration_ms: number;
}

/**
 * Result of a failed step execution
 */
export interface StepError {
  step_id: string;
  tool_name: string;
  success: false;
  error: string;
  validation_errors?: string[];
}

/**
 * Full pipeline execution result
 */
export interface PipelineResult {
  success: boolean;
  /** Number of steps completed successfully */
  steps_completed: number;
  /** Total number of steps in pipeline */
  total_steps: number;
  /** Total execution time in milliseconds */
  duration_ms: number;
  /** Final result (projected if return template provided) */
  result?: unknown;
  /** Error information if pipeline failed */
  error?: {
    step_id: string;
    message: string;
    validation_errors?: string[];
  };
  /** Results from completed steps (for debugging/partial recovery) */
  step_results?: Record<string, unknown>;
}

/**
 * Tool executor function type (provided by registry)
 */
export type ToolExecutor = (
  toolName: string,
  args: Record<string, unknown>
) => Promise<{ success: boolean; result?: unknown; error?: string; validationErrors?: string[] }>;

/**
 * Delay execution for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate pipeline steps before execution
 */
export function validatePipeline(request: PipelineRequest): string[] {
  const errors: string[] = [];

  if (!request.steps || !Array.isArray(request.steps)) {
    errors.push('Pipeline must have a "steps" array');
    return errors;
  }

  if (request.steps.length === 0) {
    errors.push('Pipeline must have at least one step');
    return errors;
  }

  const stepIds = new Set<string>();

  for (let i = 0; i < request.steps.length; i++) {
    const step = request.steps[i];
    const stepNum = i + 1;

    // Check required fields
    if (!step.id) {
      errors.push(`Step ${stepNum}: missing "id" field`);
    } else if (stepIds.has(step.id)) {
      errors.push(`Step ${stepNum}: duplicate step id "${step.id}"`);
    } else {
      stepIds.add(step.id);
    }

    if (!step.tool_name) {
      errors.push(`Step ${stepNum}: missing "tool_name" field`);
    }

    if (!step.args || typeof step.args !== 'object') {
      errors.push(`Step ${stepNum}: "args" must be an object`);
    }

    // Check that variable references only refer to previous steps
    if (step.args && step.id) {
      const referencedSteps = getReferencedSteps(step.args);
      for (const refStep of referencedSteps) {
        // Check if referenced step exists and comes before this step
        const refIndex = request.steps.findIndex(s => s.id === refStep);
        if (refIndex === -1) {
          errors.push(`Step ${stepNum} (${step.id}): references unknown step "${refStep}"`);
        } else if (refIndex >= i) {
          errors.push(`Step ${stepNum} (${step.id}): references step "${refStep}" which hasn't executed yet`);
        }
      }
    }

    // Validate delay_ms if provided
    if (step.delay_ms !== undefined) {
      if (typeof step.delay_ms !== 'number' || step.delay_ms < 0) {
        errors.push(`Step ${stepNum}: "delay_ms" must be a non-negative number`);
      } else if (step.delay_ms > 30000) {
        errors.push(`Step ${stepNum}: "delay_ms" cannot exceed 30000 (30 seconds)`);
      }
    }
  }

  // Validate return template if provided
  if (request.return) {
    for (const stepId of Object.keys(request.return)) {
      if (!stepIds.has(stepId)) {
        errors.push(`Return template references unknown step "${stepId}"`);
      }
      const fields = request.return[stepId];
      if (!Array.isArray(fields)) {
        errors.push(`Return template for step "${stepId}" must be an array of field paths`);
      }
    }
  }

  return errors;
}

/**
 * Apply return template to extract selected fields from step results
 */
export function applyReturnTemplate(
  context: PipelineContext,
  template: ReturnTemplate
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [stepId, fields] of Object.entries(template)) {
    const stepResult = context[stepId];
    if (stepResult !== undefined) {
      result[stepId] = applyProjection(stepResult, fields);
    }
  }

  return result;
}

/**
 * Execute a pipeline of tool calls
 *
 * @param request - Pipeline request with steps and optional return template
 * @param executor - Function to execute individual tools
 * @returns Pipeline result with success status and results
 */
export async function executePipeline(
  request: PipelineRequest,
  executor: ToolExecutor
): Promise<PipelineResult> {
  const startTime = Date.now();

  // Validate pipeline structure
  const validationErrors = validatePipeline(request);
  if (validationErrors.length > 0) {
    return {
      success: false,
      steps_completed: 0,
      total_steps: request.steps?.length || 0,
      duration_ms: Date.now() - startTime,
      error: {
        step_id: '_validation',
        message: 'Pipeline validation failed',
        validation_errors: validationErrors
      }
    };
  }

  const context: PipelineContext = {};
  const stepResults: Record<string, unknown> = {};

  // Execute steps sequentially
  for (let i = 0; i < request.steps.length; i++) {
    const step = request.steps[i];

    // Apply delay if specified
    if (step.delay_ms && step.delay_ms > 0) {
      await delay(step.delay_ms);
    }

    // Resolve variable references in args
    const resolvedArgs = resolveVariables(step.args, context) as Record<string, unknown>;

    // Execute the tool
    const stepStartTime = Date.now();
    const execResult = await executor(step.tool_name, resolvedArgs);
    const stepDuration = Date.now() - stepStartTime;

    if (!execResult.success) {
      // Step failed - stop pipeline and return error
      return {
        success: false,
        steps_completed: i,
        total_steps: request.steps.length,
        duration_ms: Date.now() - startTime,
        error: {
          step_id: step.id,
          message: execResult.error || 'Unknown error',
          validation_errors: execResult.validationErrors
        },
        step_results: Object.keys(stepResults).length > 0 ? stepResults : undefined
      };
    }

    // Store result in context for subsequent steps
    context[step.id] = execResult.result;
    stepResults[step.id] = {
      success: true,
      duration_ms: stepDuration
    };
  }

  // All steps completed successfully
  const totalDuration = Date.now() - startTime;

  // Apply return template if provided
  let finalResult: unknown;
  if (request.return) {
    finalResult = applyReturnTemplate(context, request.return);
  } else {
    // Return the last step's result by default
    const lastStep = request.steps[request.steps.length - 1];
    finalResult = context[lastStep.id];
  }

  return {
    success: true,
    steps_completed: request.steps.length,
    total_steps: request.steps.length,
    duration_ms: totalDuration,
    result: finalResult
  };
}
