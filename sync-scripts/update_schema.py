#!/usr/bin/env python
"""
Script to update the database schema by executing the SQL commands in update_database_schema.sql
"""
from db_connector import db

print('Starting schema update...')

try:
    with open('update_database_schema.sql', 'r') as f:
        sql = f.read()
    
    db.execute_query(sql)
    print('Schema update completed successfully.')
except Exception as e:
    print(f'Error updating schema: {str(e)}')
