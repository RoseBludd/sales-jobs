import os
import sys
import argparse
import logging
import time
import schedule
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("monday_sync.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import sync modules
from sync_monday_to_pg import sync_sales_staff, sync_projects
from sync_pg_to_monday import sync_users_to_monday, sync_projects_to_monday
from db_connector import db
from webhook_handler import app as webhook_app

def run_monday_to_pg():
    """Run sync from Monday.com to PostgreSQL."""
    logger.info("Starting sync from Monday.com to PostgreSQL")
    try:
        db.connect()
        db.create_sync_mapping_table()
        db.create_sync_logs_table()
        
        # Run sync operations
        sync_sales_staff()
        sync_projects()
        
        logger.info("✅ Monday.com to PostgreSQL sync completed")
    except Exception as e:
        logger.error(f"❌ Error during Monday.com to PostgreSQL sync: {str(e)}")
    finally:
        db.disconnect()

def run_pg_to_monday():
    """Run sync from PostgreSQL to Monday.com."""
    logger.info("Starting sync from PostgreSQL to Monday.com")
    try:
        db.connect()
        db.create_sync_mapping_table()
        db.create_sync_logs_table()
        
        # Run sync operations
        sync_users_to_monday()
        sync_projects_to_monday()
        
        logger.info("✅ PostgreSQL to Monday.com sync completed")
    except Exception as e:
        logger.error(f"❌ Error during PostgreSQL to Monday.com sync: {str(e)}")
    finally:
        db.disconnect()

def run_bidirectional_sync():
    """Run bidirectional sync between Monday.com and PostgreSQL."""
    logger.info("Starting bidirectional sync")
    run_monday_to_pg()
    run_pg_to_monday()
    logger.info("✅ Bidirectional sync completed")

def run_webhook_server():
    """Run the webhook server for real-time sync."""
    logger.info("Starting webhook server")
    webhook_app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))

def run_scheduled_sync(interval=60):
    """Run scheduled sync at specified interval (in minutes)."""
    logger.info(f"Starting scheduled sync every {interval} minutes")
    
    # Schedule the sync
    schedule.every(interval).minutes.do(run_bidirectional_sync)
    
    # Run once immediately
    run_bidirectional_sync()
    
    # Keep running indefinitely
    while True:
        schedule.run_pending()
        time.sleep(1)

def main():
    """Main entry point for the sync tool."""
    parser = argparse.ArgumentParser(description="Monday.com - PostgreSQL Sync Tool")
    
    # Add subparsers for different commands
    subparsers = parser.add_subparsers(dest="command", help="Sync command to run")
    
    # monday-to-pg command
    monday_to_pg_parser = subparsers.add_parser("monday-to-pg", help="Sync from Monday.com to PostgreSQL")
    
    # pg-to-monday command
    pg_to_monday_parser = subparsers.add_parser("pg-to-monday", help="Sync from PostgreSQL to Monday.com")
    
    # bidirectional command
    bidirectional_parser = subparsers.add_parser("bidirectional", help="Run bidirectional sync")
    
    # webhook command
    webhook_parser = subparsers.add_parser("webhook", help="Run webhook server for real-time sync")
    
    # scheduled command
    scheduled_parser = subparsers.add_parser("scheduled", help="Run scheduled sync at specified interval")
    scheduled_parser.add_argument(
        "--interval", 
        type=int, 
        default=60, 
        help="Sync interval in minutes (default: 60)"
    )
    
    # Parse arguments
    args = parser.parse_args()
    
    # Run the appropriate command
    if args.command == "monday-to-pg":
        run_monday_to_pg()
    elif args.command == "pg-to-monday":
        run_pg_to_monday()
    elif args.command == "bidirectional":
        run_bidirectional_sync()
    elif args.command == "webhook":
        run_webhook_server()
    elif args.command == "scheduled":
        run_scheduled_sync(args.interval)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
