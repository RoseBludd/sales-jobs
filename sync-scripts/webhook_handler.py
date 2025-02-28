import os
import json
import logging
from flask import Flask, request, jsonify
from monday_api import monday_api, MASTER_PROJECT_COLUMN_MAP, SALES_STAFF_COLUMN_MAP
from db_connector import db
from sync_monday_to_pg import sync_sales_staff, sync_projects
from sync_pg_to_monday import sync_users_to_monday, sync_projects_to_monday

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("webhook_handler.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Board IDs from environment variables
BOARD_ID_USERS = os.environ.get('MONDAY_BOARD_ID_USERS', '5764059860')
BOARD_ID_DATA = os.environ.get('MONDAY_BOARD_ID_DATA', '6727219152')
WEBHOOK_SECRET = os.environ.get('MONDAY_WEBHOOK_SECRET', '')

# Initialize Flask app
app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint."""
    return jsonify({"status": "healthy"})

@app.route('/webhook', methods=['POST'])
def webhook_handler():
    """Handle webhooks from Monday.com."""
    # Verify webhook request
    if WEBHOOK_SECRET:
        signature = request.headers.get('Authorization')
        if not signature or signature != WEBHOOK_SECRET:
            logger.warning("Unauthorized webhook request")
            return jsonify({"status": "unauthorized"}), 401
    
    # Parse webhook payload
    try:
        payload = request.json
        logger.info(f"Received webhook: {json.dumps(payload)}")
        
        # Extract event data
        event_type = payload.get('event', {}).get('type')
        
        if not event_type:
            logger.warning("Invalid webhook payload: missing event type")
            return jsonify({"status": "invalid_payload"}), 400
        
        # Connect to database
        db.connect()
        
        # Process different event types
        if event_type in ['create_item', 'update_item']:
            pulse_id = payload.get('event', {}).get('pulseId')
            board_id = payload.get('event', {}).get('boardId')
            
            if not pulse_id or not board_id:
                logger.warning("Invalid webhook payload: missing pulse or board ID")
                return jsonify({"status": "invalid_payload"}), 400
            
            logger.info(f"Processing {event_type} event for item {pulse_id} on board {board_id}")
            
            # Determine which sync to run based on board ID
            if board_id == BOARD_ID_USERS:
                # Sync a specific user
                try:
                    # Fetch the specific user and sync it
                    user_item = monday_api.get_item_by_id(board_id, pulse_id)
                    if user_item:
                        # Process user update (simplified version of sync_sales_staff for a single item)
                        logger.info(f"Processing user update for item {pulse_id}")
                        
                        # Similar logic to sync_sales_staff but for a single item
                        # Actual implementation omitted for brevity
                        
                        # For now, we'll just trigger a full sync
                        sync_sales_staff()
                except Exception as e:
                    logger.error(f"Error processing user update: {str(e)}")
                    return jsonify({"status": "error", "message": str(e)}), 500
                
            elif board_id == BOARD_ID_DATA:
                # Sync a specific project
                try:
                    # Fetch the specific project and sync it
                    project_item = monday_api.get_item_by_id(board_id, pulse_id)
                    if project_item:
                        # Process project update (simplified version of sync_projects for a single item)
                        logger.info(f"Processing project update for item {pulse_id}")
                        
                        # Similar logic to sync_projects but for a single item
                        # Actual implementation omitted for brevity
                        
                        # For now, we'll just trigger a full sync
                        sync_projects()
                except Exception as e:
                    logger.error(f"Error processing project update: {str(e)}")
                    return jsonify({"status": "error", "message": str(e)}), 500
            
        elif event_type == 'delete_item':
            pulse_id = payload.get('event', {}).get('pulseId')
            board_id = payload.get('event', {}).get('boardId')
            
            if not pulse_id or not board_id:
                logger.warning("Invalid webhook payload: missing pulse or board ID")
                return jsonify({"status": "invalid_payload"}), 400
            
            logger.info(f"Processing delete event for item {pulse_id} on board {board_id}")
            
            # Handle deletion
            try:
                # Get system ID from mapping
                entity_type = 'user' if board_id == BOARD_ID_USERS else 'project'
                system_id = db.get_system_id(entity_type, pulse_id)
                
                if system_id:
                    # Mark as deleted in the database rather than actually deleting
                    if entity_type == 'user':
                        db.execute_query("UPDATE users SET is_active = false WHERE id = %s", (system_id,))
                    else:
                        db.execute_query("UPDATE projects SET is_active = false WHERE id = %s", (system_id,))
                    
                    # Update the mapping
                    db.execute_query(
                        "UPDATE sync_mapping SET sync_status = 'deleted' WHERE entity_type = %s AND monday_id = %s",
                        (entity_type, pulse_id)
                    )
                    
                    logger.info(f"Marked {entity_type} with ID {system_id} as deleted")
                
            except Exception as e:
                logger.error(f"Error processing deletion: {str(e)}")
                return jsonify({"status": "error", "message": str(e)}), 500
        
        # Connection cleanup
        db.disconnect()
        
        return jsonify({"status": "success"}), 200
    
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/sync', methods=['POST'])
def manual_sync():
    """Endpoint for triggering a manual sync."""
    try:
        payload = request.json or {}
        direction = payload.get('direction', 'both')
        entity_type = payload.get('entity_type', 'all')
        
        logger.info(f"Manual sync requested: direction={direction}, entity_type={entity_type}")
        
        # Connect to database
        db.connect()
        
        if direction in ['monday-to-pg', 'both']:
            if entity_type in ['user', 'all']:
                sync_sales_staff()
            
            if entity_type in ['project', 'all']:
                sync_projects()
        
        if direction in ['pg-to-monday', 'both']:
            if entity_type in ['user', 'all']:
                sync_users_to_monday()
            
            if entity_type in ['project', 'all']:
                sync_projects_to_monday()
        
        # Connection cleanup
        db.disconnect()
        
        return jsonify({"status": "success", "message": "Sync completed"}), 200
    
    except Exception as e:
        logger.error(f"Error during manual sync: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 500

def setup_monday_webhooks():
    """Set up webhooks in Monday.com for real-time sync."""
    logger.info("Setting up Monday.com webhooks")
    
    webhooks_to_create = [
        # User board webhooks
        {"board_id": BOARD_ID_USERS, "event": "create_item", "url": f"{os.environ.get('WEBHOOK_BASE_URL', 'http://localhost:5000')}/webhook"},
        {"board_id": BOARD_ID_USERS, "event": "update_item", "url": f"{os.environ.get('WEBHOOK_BASE_URL', 'http://localhost:5000')}/webhook"},
        {"board_id": BOARD_ID_USERS, "event": "delete_item", "url": f"{os.environ.get('WEBHOOK_BASE_URL', 'http://localhost:5000')}/webhook"},
        
        # Project board webhooks
        {"board_id": BOARD_ID_DATA, "event": "create_item", "url": f"{os.environ.get('WEBHOOK_BASE_URL', 'http://localhost:5000')}/webhook"},
        {"board_id": BOARD_ID_DATA, "event": "update_item", "url": f"{os.environ.get('WEBHOOK_BASE_URL', 'http://localhost:5000')}/webhook"},
        {"board_id": BOARD_ID_DATA, "event": "delete_item", "url": f"{os.environ.get('WEBHOOK_BASE_URL', 'http://localhost:5000')}/webhook"},
    ]
    
    # Get existing webhooks
    existing_webhooks = monday_api.get_webhooks()
    existing_urls = set((webhook.get('board_id'), webhook.get('event'), webhook.get('url')) 
                         for webhook in existing_webhooks if webhook.get('board_id') and webhook.get('event') and webhook.get('url'))
    
    # Create missing webhooks
    for webhook in webhooks_to_create:
        webhook_key = (webhook['board_id'], webhook['event'], webhook['url'])
        if webhook_key not in existing_urls:
            try:
                result = monday_api.subscribe_to_board_events(
                    webhook['board_id'], 
                    webhook['event'], 
                    webhook['url']
                )
                if result.get('data', {}).get('create_webhook', {}).get('id'):
                    logger.info(f"Created webhook: {webhook['event']} for board {webhook['board_id']}")
                else:
                    logger.warning(f"Failed to create webhook: {webhook['event']} for board {webhook['board_id']}")
            except Exception as e:
                logger.error(f"Error creating webhook: {str(e)}")
        else:
            logger.info(f"Webhook already exists: {webhook['event']} for board {webhook['board_id']}")

if __name__ == "__main__":
    # Set up webhooks when starting the server
    setup_monday_webhooks()
    
    # Run the Flask app
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
