# GoHighLevel MCP Server - Tools Inventory

**Total: 254 tools**
**Generated:** 2026-01-07

---

## Summary by Category

| Category | Count |
|----------|-------|
| Calendar & Scheduling | 39 |
| Contact Management | 31 |
| Location & Settings | 24 |
| Conversations & Messaging | 21 |
| Payments & Orders | 20 |
| Invoices & Estimates | 18 |
| Store & Shipping | 18 |
| Social Media | 17 |
| Opportunities & Sales | 10 |
| Associations & Relations | 10 |
| Products & Catalog | 10 |
| Custom Objects | 9 |
| Custom Fields v2 | 8 |
| Blog & Content | 7 |
| Email Marketing | 5 |
| Media Library | 3 |
| Surveys | 2 |
| Workflows | 1 |
| Email Verification | 1 |

---

## 1. CRM & Contact Management (31 tools)

### Core Contact Operations
| Tool | Description |
|------|-------------|
| `create_contact` | Create a new contact in GoHighLevel |
| `search_contacts` | Search for contacts with advanced filtering options |
| `get_contact` | Get detailed information about a specific contact |
| `update_contact` | Update contact information |
| `delete_contact` | Delete a contact from GoHighLevel |
| `upsert_contact` | Create or update contact based on email/phone (smart merge) |
| `get_duplicate_contact` | Check for duplicate contacts by email or phone |
| `get_contacts_by_business` | Get contacts associated with a specific business |

### Tags Management
| Tool | Description |
|------|-------------|
| `add_contact_tags` | Add tags to a contact |
| `remove_contact_tags` | Remove tags from a contact |
| `bulk_update_contact_tags` | Bulk add or remove tags from multiple contacts |
| `bulk_update_contact_business` | Bulk update business association for multiple contacts |

### Tasks
| Tool | Description |
|------|-------------|
| `get_contact_tasks` | Get all tasks for a contact |
| `create_contact_task` | Create a new task for a contact |
| `get_contact_task` | Get a specific task for a contact |
| `update_contact_task` | Update a task for a contact |
| `delete_contact_task` | Delete a task for a contact |
| `update_task_completion` | Update task completion status |

### Notes
| Tool | Description |
|------|-------------|
| `get_contact_notes` | Get all notes for a contact |
| `create_contact_note` | Create a new note for a contact |
| `get_contact_note` | Get a specific note for a contact |
| `update_contact_note` | Update a note for a contact |
| `delete_contact_note` | Delete a note for a contact |

### Followers & Engagement
| Tool | Description |
|------|-------------|
| `add_contact_followers` | Add followers to a contact |
| `remove_contact_followers` | Remove followers from a contact |
| `get_contact_appointments` | Get all appointments for a contact |

### Campaigns & Workflows
| Tool | Description |
|------|-------------|
| `add_contact_to_campaign` | Add contact to a marketing campaign |
| `remove_contact_from_campaign` | Remove contact from a specific campaign |
| `remove_contact_from_all_campaigns` | Remove contact from all campaigns |
| `add_contact_to_workflow` | Add contact to a workflow |
| `remove_contact_from_workflow` | Remove contact from a workflow |

---

## 2. Conversations & Messaging (21 tools)

### Direct Messaging
| Tool | Description |
|------|-------------|
| `send_sms` | Send an SMS message to a contact in GoHighLevel |
| `send_email` | Send an email message to a contact in GoHighLevel |
| `live_chat_typing` | Send typing indicator for live chat conversations |

### Conversation Management
| Tool | Description |
|------|-------------|
| `search_conversations` | Search conversations in GoHighLevel with various filters |
| `get_conversation` | Get detailed conversation information including message history |
| `get_conversation_with_date_filter` | Get conversation messages filtered by date range |
| `create_conversation` | Create a new conversation with a contact |
| `update_conversation` | Update conversation properties (star, mark read, etc.) |
| `delete_conversation` | Delete a conversation permanently |
| `get_recent_messages` | Get recent messages across all conversations for monitoring |

### Message Details
| Tool | Description |
|------|-------------|
| `get_email_message` | Get detailed email message information by email message ID |
| `get_message` | Get detailed message information by message ID |
| `update_message_status` | Update the delivery status of a message |
| `upload_message_attachments` | Upload file attachments for use in messages |

### Manual Message Logging
| Tool | Description |
|------|-------------|
| `add_inbound_message` | Manually add an inbound message to a conversation |
| `add_outbound_call` | Manually add an outbound call record to a conversation |

### Call Recordings & Transcriptions
| Tool | Description |
|------|-------------|
| `get_message_recording` | Get call recording audio for a message |
| `get_message_transcription` | Get call transcription text for a message |
| `download_transcription` | Download call transcription as a text file |

### Scheduled Messages
| Tool | Description |
|------|-------------|
| `cancel_scheduled_message` | Cancel a scheduled message before it is sent |
| `cancel_scheduled_email` | Cancel a scheduled email before it is sent |

---

## 3. Calendar & Scheduling (39 tools)

### Calendar Management
| Tool | Description |
|------|-------------|
| `get_calendars` | Get all calendars in the GoHighLevel location with optional filtering |
| `get_calendar` | Get detailed information about a specific calendar by ID |
| `create_calendar` | Create a new calendar in GoHighLevel |
| `update_calendar` | Update an existing calendar in GoHighLevel |
| `delete_calendar` | Delete a calendar from GoHighLevel |

### Calendar Groups
| Tool | Description |
|------|-------------|
| `get_calendar_groups` | Get all calendar groups in the GoHighLevel location |
| `create_calendar_group` | Create a new calendar group |
| `update_calendar_group` | Update calendar group details |
| `delete_calendar_group` | Delete a calendar group |
| `disable_calendar_group` | Enable or disable a calendar group |
| `validate_group_slug` | Validate if a calendar group slug is available |

### Appointments
| Tool | Description |
|------|-------------|
| `get_calendar_events` | Get appointments/events from calendars within a date range |
| `get_free_slots` | Get available time slots for booking appointments on a specific calendar |
| `create_appointment` | Create a new appointment/booking in GoHighLevel |
| `get_appointment` | Get detailed information about a specific appointment by ID |
| `update_appointment` | Update an existing appointment in GoHighLevel |
| `delete_appointment` | Cancel/delete an appointment from GoHighLevel |

### Appointment Notes
| Tool | Description |
|------|-------------|
| `get_appointment_notes` | Get notes for an appointment |
| `create_appointment_note` | Create a note for an appointment |
| `update_appointment_note` | Update an appointment note |
| `delete_appointment_note` | Delete an appointment note |

### Blocked Slots
| Tool | Description |
|------|-------------|
| `create_block_slot` | Create a blocked time slot to prevent bookings during specific times |
| `update_block_slot` | Update an existing blocked time slot |
| `get_blocked_slots` | Get blocked time slots for a location |

### Equipment Resources
| Tool | Description |
|------|-------------|
| `get_calendar_resources_equipments` | Get calendar equipment resources |
| `create_calendar_resource_equipment` | Create a calendar equipment resource |
| `get_calendar_resource_equipment` | Get specific equipment resource details |
| `update_calendar_resource_equipment` | Update equipment resource details |
| `delete_calendar_resource_equipment` | Delete an equipment resource |

### Room Resources
| Tool | Description |
|------|-------------|
| `get_calendar_resources_rooms` | Get calendar room resources |
| `create_calendar_resource_room` | Create a calendar room resource |
| `get_calendar_resource_room` | Get specific room resource details |
| `update_calendar_resource_room` | Update room resource details |
| `delete_calendar_resource_room` | Delete a room resource |

### Calendar Notifications
| Tool | Description |
|------|-------------|
| `get_calendar_notifications` | Get calendar notifications |
| `create_calendar_notifications` | Create calendar notifications |
| `get_calendar_notification` | Get specific calendar notification |
| `update_calendar_notification` | Update calendar notification |
| `delete_calendar_notification` | Delete calendar notification |

---

## 4. Opportunities & Sales Pipeline (10 tools)

| Tool | Description |
|------|-------------|
| `get_pipelines` | Get all sales pipelines configured in GoHighLevel |
| `search_opportunities` | Search for opportunities in GoHighLevel CRM using various filters |
| `get_opportunity` | Get detailed information about a specific opportunity by ID |
| `create_opportunity` | Create a new opportunity in GoHighLevel CRM |
| `update_opportunity` | Update an existing opportunity with new details (full update) |
| `update_opportunity_status` | Update the status of an opportunity (won, lost, etc.) |
| `delete_opportunity` | Delete an opportunity from GoHighLevel CRM |
| `upsert_opportunity` | Create or update an opportunity based on contact and pipeline (smart merge) |
| `add_opportunity_followers` | Add followers to an opportunity for notifications and tracking |
| `remove_opportunity_followers` | Remove followers from an opportunity |

---

## 5. Location & Settings (24 tools)

### Location Management
| Tool | Description |
|------|-------------|
| `search_locations` | Search for locations/sub-accounts in GoHighLevel with filtering options |
| `get_location` | Get detailed information about a specific location/sub-account by ID |
| `create_location` | Create a new sub-account/location in GoHighLevel (Agency Pro plan required) |
| `update_location` | Update an existing sub-account/location in GoHighLevel |
| `delete_location` | Delete a sub-account/location from GoHighLevel |

### Location Tags
| Tool | Description |
|------|-------------|
| `get_location_tags` | Get all tags for a specific location |
| `create_location_tag` | Create a new tag for a location |
| `get_location_tag` | Get a specific location tag by ID |
| `update_location_tag` | Update an existing location tag |
| `delete_location_tag` | Delete a location tag |

### Location Tasks
| Tool | Description |
|------|-------------|
| `search_location_tasks` | Search tasks within a location with advanced filtering |

### Custom Fields (Location-level)
| Tool | Description |
|------|-------------|
| `get_location_custom_fields` | Get custom fields for a location, optionally filtered by model type |
| `create_location_custom_field` | Create a new custom field for a location |
| `get_location_custom_field` | Get a specific custom field by ID |
| `update_location_custom_field` | Update an existing custom field |
| `delete_location_custom_field` | Delete a custom field from a location |

### Custom Values
| Tool | Description |
|------|-------------|
| `get_location_custom_values` | Get all custom values for a location |
| `create_location_custom_value` | Create a new custom value for a location |
| `get_location_custom_value` | Get a specific custom value by ID |
| `update_location_custom_value` | Update an existing custom value |
| `delete_location_custom_value` | Delete a custom value from a location |

### Templates & Settings
| Tool | Description |
|------|-------------|
| `get_location_templates` | Get SMS/Email templates for a location |
| `delete_location_template` | Delete a template from a location |
| `get_timezones` | Get available timezones for location configuration |

---

## 6. Email Marketing (5 tools)

| Tool | Description |
|------|-------------|
| `get_email_campaigns` | Get a list of email campaigns from GoHighLevel |
| `get_email_templates` | Get a list of email templates from GoHighLevel |
| `create_email_template` | Create a new email template in GoHighLevel |
| `update_email_template` | Update an existing email template in GoHighLevel |
| `delete_email_template` | Delete an email template from GoHighLevel |

---

## 7. Blog & Content Management (7 tools)

| Tool | Description |
|------|-------------|
| `get_blog_sites` | Get all blog sites for the current location |
| `get_blog_posts` | Get blog posts from a specific blog site |
| `create_blog_post` | Create a new blog post in GoHighLevel |
| `update_blog_post` | Update an existing blog post in GoHighLevel |
| `get_blog_authors` | Get all available blog authors for the current location |
| `get_blog_categories` | Get all available blog categories for the current location |
| `check_url_slug` | Check if a URL slug is available for use |

---

## 8. Social Media (17 tools)

### Posts Management
| Tool | Description |
|------|-------------|
| `search_social_posts` | Search and filter social media posts across all platforms |
| `create_social_post` | Create a new social media post for multiple platforms |
| `get_social_post` | Get details of a specific social media post |
| `update_social_post` | Update an existing social media post |
| `delete_social_post` | Delete a social media post |
| `bulk_delete_social_posts` | Delete multiple social media posts at once (max 50) |

### Account Management
| Tool | Description |
|------|-------------|
| `get_social_accounts` | Get all connected social media accounts and groups |
| `delete_social_account` | Delete a social media account connection |
| `start_social_oauth` | Start OAuth process for social media platform |
| `get_platform_accounts` | Get available accounts for a specific platform after OAuth |

### Bulk Operations
| Tool | Description |
|------|-------------|
| `upload_social_csv` | Upload CSV file for bulk social media posts |
| `get_csv_upload_status` | Get status of CSV uploads |
| `set_csv_accounts` | Set accounts for CSV import processing |

### Categories & Tags
| Tool | Description |
|------|-------------|
| `get_social_categories` | Get social media post categories |
| `get_social_category` | Get a specific social media category by ID |
| `get_social_tags` | Get social media post tags |
| `get_social_tags_by_ids` | Get specific social media tags by their IDs |

---

## 9. Media Library (3 tools)

| Tool | Description |
|------|-------------|
| `get_media_files` | Get list of files and folders from the media library with filtering and search capabilities |
| `upload_media_file` | Upload a file to the media library or add a hosted file URL (max 25MB) |
| `delete_media_file` | Delete a specific file or folder from the media library |

---

## 10. Custom Objects (9 tools)

### Schema Management
| Tool | Description |
|------|-------------|
| `get_all_objects` | Get all objects (custom and standard) for a location |
| `create_object_schema` | Create a new custom object schema with labels, key, and primary display property |
| `get_object_schema` | Get object schema details by key including all fields and properties |
| `update_object_schema` | Update object schema properties including labels, description, and searchable fields |

### Record Management
| Tool | Description |
|------|-------------|
| `create_object_record` | Create a new record in a custom or standard object |
| `get_object_record` | Get a specific record by ID from a custom or standard object |
| `update_object_record` | Update an existing record in a custom or standard object |
| `delete_object_record` | Delete a record from a custom or standard object |
| `search_object_records` | Search records within a custom or standard object using searchable properties |

---

## 11. Associations & Relations (10 tools)

### Association Management
| Tool | Description |
|------|-------------|
| `ghl_get_all_associations` | Get all associations for a sub-account/location with pagination |
| `ghl_create_association` | Create a new association that defines relationship types between entities |
| `ghl_get_association_by_id` | Get a specific association by its ID |
| `ghl_get_association_by_key` | Get an association by its key name |
| `ghl_get_association_by_object_key` | Get associations by object keys like contacts, custom objects, and opportunities |
| `ghl_update_association` | Update the labels of an existing association |
| `ghl_delete_association` | Delete a user-defined association |

### Relation Management
| Tool | Description |
|------|-------------|
| `ghl_create_relation` | Create a relation between two entities using an existing association |
| `ghl_get_relations_by_record` | Get all relations for a specific record ID with pagination |
| `ghl_delete_relation` | Delete a specific relation between two entities |

---

## 12. Custom Fields v2 (8 tools)

### Field Management
| Tool | Description |
|------|-------------|
| `ghl_get_custom_field_by_id` | Get a custom field or folder by its ID |
| `ghl_get_custom_fields_by_object_key` | Get all custom fields and folders for a specific object key |
| `ghl_create_custom_field` | Create a new custom field for custom objects or company |
| `ghl_update_custom_field` | Update an existing custom field by ID |
| `ghl_delete_custom_field` | Delete a custom field by ID |

### Folder Management
| Tool | Description |
|------|-------------|
| `ghl_create_custom_field_folder` | Create a new custom field folder for organizing fields |
| `ghl_update_custom_field_folder` | Update the name of an existing custom field folder |
| `ghl_delete_custom_field_folder` | Delete a custom field folder |

---

## 13. Products & Catalog (10 tools)

### Products
| Tool | Description |
|------|-------------|
| `ghl_list_products` | List products with optional filtering |
| `ghl_get_product` | Get a specific product by ID |
| `ghl_create_product` | Create a new product in GoHighLevel |
| `ghl_update_product` | Update an existing product |
| `ghl_delete_product` | Delete a product by ID |

### Pricing
| Tool | Description |
|------|-------------|
| `ghl_create_price` | Create a price for a product |
| `ghl_list_prices` | List prices for a product |

### Inventory & Collections
| Tool | Description |
|------|-------------|
| `ghl_list_inventory` | List inventory items with stock levels |
| `ghl_create_product_collection` | Create a new product collection |
| `ghl_list_product_collections` | List product collections |

---

## 14. Store & Shipping (18 tools)

### Store Settings
| Tool | Description |
|------|-------------|
| `ghl_create_store_setting` | Create or update store settings including shipping origin and notifications |
| `ghl_get_store_setting` | Get current store settings |

### Shipping Zones
| Tool | Description |
|------|-------------|
| `ghl_list_shipping_zones` | List all shipping zones for a location |
| `ghl_get_shipping_zone` | Get details of a specific shipping zone |
| `ghl_create_shipping_zone` | Create a new shipping zone with specific countries and states |
| `ghl_update_shipping_zone` | Update a shipping zone |
| `ghl_delete_shipping_zone` | Delete a shipping zone and all its associated shipping rates |

### Shipping Rates
| Tool | Description |
|------|-------------|
| `ghl_get_available_shipping_rates` | Get available shipping rates for an order based on destination |
| `ghl_list_shipping_rates` | List all shipping rates for a specific shipping zone |
| `ghl_get_shipping_rate` | Get details of a specific shipping rate |
| `ghl_create_shipping_rate` | Create a new shipping rate for a shipping zone |
| `ghl_update_shipping_rate` | Update a shipping rate |
| `ghl_delete_shipping_rate` | Delete a shipping rate |

### Shipping Carriers
| Tool | Description |
|------|-------------|
| `ghl_list_shipping_carriers` | List all shipping carriers for a location |
| `ghl_get_shipping_carrier` | Get details of a specific shipping carrier |
| `ghl_create_shipping_carrier` | Create a new shipping carrier for dynamic rate calculation |
| `ghl_update_shipping_carrier` | Update a shipping carrier |
| `ghl_delete_shipping_carrier` | Delete a shipping carrier |

---

## 15. Payments & Orders (20 tools)

### Orders
| Tool | Description |
|------|-------------|
| `list_orders` | List orders with optional filtering and pagination |
| `get_order_by_id` | Get a specific order by its ID |
| `create_order_fulfillment` | Create a fulfillment for an order |
| `list_order_fulfillments` | List all fulfillments for an order |

### Transactions
| Tool | Description |
|------|-------------|
| `list_transactions` | List transactions with optional filtering and pagination |
| `get_transaction_by_id` | Get a specific transaction by its ID |

### Subscriptions
| Tool | Description |
|------|-------------|
| `list_subscriptions` | List subscriptions with optional filtering and pagination |
| `get_subscription_by_id` | Get a specific subscription by its ID |

### Coupons
| Tool | Description |
|------|-------------|
| `list_coupons` | List all coupons for a location with optional filtering |
| `get_coupon` | Get coupon details by ID or code |
| `create_coupon` | Create a new promotional coupon |
| `update_coupon` | Update an existing coupon |
| `delete_coupon` | Delete a coupon permanently |

### Payment Providers
| Tool | Description |
|------|-------------|
| `create_whitelabel_integration_provider` | Create a white-label integration provider for payments |
| `list_whitelabel_integration_providers` | List white-label integration providers with optional pagination |
| `create_custom_provider_integration` | Create a new custom payment provider integration |
| `delete_custom_provider_integration` | Delete an existing custom payment provider integration |
| `get_custom_provider_config` | Fetch existing payment config for a location |
| `create_custom_provider_config` | Create new payment config for a location |
| `disconnect_custom_provider_config` | Disconnect existing payment config for a location |

---

## 16. Invoices & Estimates (18 tools)

### Invoice Templates
| Tool | Description |
|------|-------------|
| `list_invoice_templates` | List all invoice templates |
| `get_invoice_template` | Get invoice template by ID |
| `create_invoice_template` | Create a new invoice template |
| `update_invoice_template` | Update an existing invoice template |
| `delete_invoice_template` | Delete an invoice template |

### Invoice Schedules
| Tool | Description |
|------|-------------|
| `list_invoice_schedules` | List all invoice schedules |
| `get_invoice_schedule` | Get invoice schedule by ID |
| `create_invoice_schedule` | Create a new invoice schedule |

### Invoices
| Tool | Description |
|------|-------------|
| `list_invoices` | List all invoices |
| `get_invoice` | Get invoice by ID |
| `create_invoice` | Create a new invoice |
| `send_invoice` | Send an invoice to customer |
| `generate_invoice_number` | Generate a unique invoice number |

### Estimates
| Tool | Description |
|------|-------------|
| `list_estimates` | List all estimates |
| `create_estimate` | Create a new estimate |
| `send_estimate` | Send an estimate to customer |
| `create_invoice_from_estimate` | Create an invoice from an estimate |
| `generate_estimate_number` | Generate a unique estimate number |

---

## 17. Surveys (2 tools)

| Tool | Description |
|------|-------------|
| `ghl_get_surveys` | Retrieve all surveys for a location |
| `ghl_get_survey_submissions` | Retrieve survey submissions with advanced filtering and pagination |

---

## 18. Workflows (1 tool)

| Tool | Description |
|------|-------------|
| `ghl_get_workflows` | Retrieve all workflows for a location |

---

## 19. Email Verification (1 tool)

| Tool | Description |
|------|-------------|
| `verify_email` | Verify email address deliverability and get risk assessment |

---

## Tool Naming Conventions

- `create_*` - Create new resources
- `get_*` - Retrieve single resource details
- `list_*` / `search_*` - Retrieve multiple resources with filtering
- `update_*` - Modify existing resources
- `delete_*` - Remove resources
- `upsert_*` - Create or update (smart merge)
- `add_*` / `remove_*` - Add/remove relationships (tags, followers, etc.)
- `ghl_*` - Newer API v2 tools (custom fields, associations, products, etc.)

---

*Report generated from source files in `/src/tools/`*
