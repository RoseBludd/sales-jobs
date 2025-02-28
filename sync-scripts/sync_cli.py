#!/usr/bin/env python
"""
Monday.com to PostgreSQL Sync CLI Tool

This command-line interface provides a convenient way to run various sync operations
between Monday.com boards and your PostgreSQL database.
"""

import argparse
import sys
import os
from sync_monday_to_pg import sync_sales_staff, sync_projects, test_sync_limited_users, test_sync_limited_projects
from monday_api import test_monday_connection
from db_connector import db

def main():
    """Main entry point for the CLI application."""
    
    # Create the main parser
    parser = argparse.ArgumentParser(
        description='Monday.com to PostgreSQL Sync Tool',
        epilog='Example: python sync_cli.py users --limit 10 --batch-size 25'
    )
    
    # Create subparsers for different commands
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Add 'users' command
    parser_users = subparsers.add_parser('users', help='Sync users from Monday.com to PostgreSQL')
    parser_users.add_argument('--limit', type=int, default=None, 
                          help='Limit number of users to sync (for testing)')
    parser_users.add_argument('--batch-size', type=int, default=50, 
                          help='Batch size for processing')
    
    # Add 'projects' command
    parser_projects = subparsers.add_parser('projects', help='Sync projects from Monday.com to PostgreSQL')
    parser_projects.add_argument('--limit', type=int, default=None, 
                             help='Limit number of projects to sync (for testing)')
    parser_projects.add_argument('--batch-size', type=int, default=50, 
                             help='Batch size for processing')
    parser_projects.add_argument('--max-pages', type=int, default=None,
                             help='Maximum number of pages to fetch (for testing)')
    
    # Add 'all' command
    parser_all = subparsers.add_parser('all', help='Sync all entities from Monday.com to PostgreSQL')
    parser_all.add_argument('--batch-size', type=int, default=50, 
                         help='Batch size for processing')
    
    # Add 'test' command for quick testing
    parser_test = subparsers.add_parser('test', help='Run a test sync with limited items')
    parser_test.add_argument('--limit', type=int, default=10, 
                          help='Number of users to sync (default: 10)')
    
    # Add 'test-users' command for specifically testing users
    parser_test_users = subparsers.add_parser('test-users', help='Run a test sync with limited users')
    parser_test_users.add_argument('--limit', type=int, default=10, 
                             help='Number of users to sync (default: 10)')
    
    # Add 'test-projects' command for specifically testing projects
    parser_test_projects = subparsers.add_parser('test-projects', help='Run a test sync with limited projects')
    parser_test_projects.add_argument('--limit', type=int, default=10, 
                                help='Number of projects to sync (default: 10)')
    parser_test_projects.add_argument('--use-cache', action='store_true',
                                help='Use cached data if available')
    parser_test_projects.add_argument('--cache-file', type=str, default=None,
                                help='Specific cache file to use')
    parser_test_projects.add_argument('--max-pages', type=int, default=1,
                                help='Maximum number of pages to fetch (default: 1)')
    
    # Add 'test-api' command to test the Monday.com API connection
    parser_test_api = subparsers.add_parser('test-api', help='Test the Monday.com API connection')
    
    # Parse arguments
    args = parser.parse_args()
    
    # If no command is specified, show help
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Establish database connection
    try:
        db.connect()
        db.create_sync_mapping_table()
        db.create_sync_logs_table()
        
        # Execute the appropriate command
        if args.command == 'users':
            sync_sales_staff(limit=args.limit, batch_size=args.batch_size)
        
        elif args.command == 'projects':
            sync_projects(limit=args.limit, batch_size=args.batch_size, 
                         max_pages=args.max_pages if hasattr(args, 'max_pages') else None)
        
        elif args.command == 'all':
            sync_sales_staff(batch_size=args.batch_size)
            sync_projects(batch_size=args.batch_size)
        
        elif args.command == 'test':
            test_sync_limited_users(limit=args.limit)
        
        elif args.command == 'test-users':
            test_sync_limited_users(limit=args.limit)
        
        elif args.command == 'test-projects':
            test_sync_limited_projects(
                limit=args.limit, 
                use_cache=args.use_cache if hasattr(args, 'use_cache') else True, 
                cache_file=args.cache_file if hasattr(args, 'cache_file') else None,
                max_pages=args.max_pages if hasattr(args, 'max_pages') else 1
            )
        
        elif args.command == 'test-api':
            test_monday_connection()
        
    except Exception as e:
        print(f"❌ Error during synchronization: {str(e)}")
        sys.exit(1)
    finally:
        db.disconnect()
    
    print("✅ Command executed successfully")

if __name__ == '__main__':
    main()
