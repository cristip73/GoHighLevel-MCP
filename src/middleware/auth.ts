/**
 * Authentication middleware for GoHighLevel MCP Server
 * Validates static API key and ensures required headers are present
 */

import type { Request, Response, NextFunction } from 'express';

const staticKey = process.env.APP_STATIC_KEY;

/**
 * Authentication guard middleware
 * Validates X-App-Key header and ensures Authorization and locationId headers are present
 */
export const authGuard = (req: Request, res: Response, next: NextFunction): void => {
  // Check static key authentication
  if (req.headers['x-app-key'] !== staticKey) {
    console.log(`[AUTH] Invalid X-App-Key: ${req.headers['x-app-key']} (expected: ${staticKey})`);
    res.status(401).json({ error: 'Unauthorized – invalid X-App-Key' });
    return;
  }

  // Check for required headers for GHL API calls
  if (!req.headers.authorization || !req.headers.locationid) {
    console.log(`[AUTH] Missing headers - Authorization: ${!!req.headers.authorization}, locationId: ${!!req.headers.locationid}`);
    res.status(400).json({ 
      error: 'Missing Authorization or locationId headers',
      required: {
        'Authorization': 'Bearer <pit-token>',
        'locationId': '<location-id>'
      }
    });
    return;
  }

  console.log(`[AUTH] ✅ Authentication successful for location: ${req.headers.locationid}`);
  
  // Store headers in request for easy access by downstream handlers
  req.ghlAuth = {
    accessToken: (req.headers.authorization as string).replace('Bearer ', ''),
    locationId: req.headers.locationid as string
  };
  
  next();
};

// Extend Request interface to include GHL auth data
declare global {
  namespace Express {
    interface Request {
      ghlAuth?: {
        accessToken: string;
        locationId: string;
      };
    }
  }
}