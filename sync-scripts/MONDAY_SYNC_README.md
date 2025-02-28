# Monday.com to PostgreSQL Synchronization

This document provides an overview of the Monday.com to PostgreSQL synchronization system that enables data to flow between Monday.com boards and our database.

MONDAY_API_KEY=eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjMxOTcyMjAwMywiYWFpIjoxMSwidWlkIjo1NDE1NDI4MSwiaWFkIjoiMjAyNC0wMi0wOVQyMzowODo0Ni4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTI4NDMxMTksInJnbiI6InVzZTEifQ.xshH7gVvlzc89H7bePImbYudk58FLS9vmr6NggMhxeY
DATABASE_URL=postgresql://neondb_owner:npg_Y0CM8vIVoilD@ep-young-sun-a52te82c-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require

## System Overview

The synchronization system maps data from Monday.com boards to corresponding tables in our PostgreSQL database. The system handles two main boards:

1. **MASTER PROJECT BOARD** (ID: 6727219152) - Contains project and related data
2. **SALES STAFF BOARD** (ID: 5764059860) - Contains sales staff information

## Architecture

The system consists of the following components:

- **Monday API Module** (`monday_api.py`) - Handles communication with Monday.com API
- **Database Connector** (`db_connector.py`) - Manages PostgreSQL database connections
- **Data Models** (`models.py`) - Object models for database entities
- **Sync Scripts**:
  - `sync_monday_to_pg.py` - Syncs data from Monday.com to PostgreSQL
  - `sync_pg_to_monday.py` - Syncs data from PostgreSQL to Monday.com
- **Support Modules**:
  - `data_cache.py` - Caches Monday.com data to reduce API calls
  - `timing.py` - Measures performance of operations

## Database Schema

The database schema includes the following key tables:

- `projects` - Project information
- `customers` - Customer details
- `properties` - Property information
- `users` - User information with different roles
- `sales_teams` - Sales team information
- `pa_law` - Public adjuster/lawyer information
- `policies` - Insurance policy information
- `insurances` - Insurance company information
- `storms` - Storm event information

## Monday.com Column Mappings

The mappings between Monday.com column IDs and our database columns are defined in:

- `monday_api.py` - Contains the column mapping dictionaries
- `monday_to_database_mapping.md` - Comprehensive documentation of all mappings

## Running the Sync

To run the synchronization scripts:

```bash
# Sync from Monday.com to PostgreSQL
python sync_monday_to_pg.py

# Sync from PostgreSQL to Monday.com
python sync_pg_to_monday.py

# Run a test with limited data
python sync_monday_to_pg.py --test --limit 10

# Use cached data for testing
python sync_monday_to_pg.py --test --use-cache
```

## Configuration

The sync scripts use the following environment variables:

- `MONDAY_API_KEY` - Monday.com API key
- `MONDAY_BOARD_ID_USERS` - ID of the sales staff board (default: 5764059860)
- `MONDAY_BOARD_ID_DATA` - ID of the master project board (default: 6727219152)
- Database connection parameters (used by db_connector.py)

## Sync Log and Monitoring

Sync logs are stored in:

- `monday_sync.log` - General sync log
- `logs/` directory - Detailed logs

## Troubleshooting

If synchronization issues occur:

1. Check the log files for errors
2. Verify API credentials
3. Test the Monday.com API connection using the test functions
4. Verify database connectivity
5. Run the test script to validate schema and models: `python test_sync.py`

## Data Flow Diagrams

### Monday to PostgreSQL Flow

```
Monday.com Boards → Monday API → Data Mapping → Model Objects → PostgreSQL
     ↑                             ↑                  ↑
     |                             |                  |
Monday API Module             Column Maps       Database Models
```

### PostgreSQL to Monday Flow

```
PostgreSQL → Model Objects → Data Mapping → Monday API → Monday.com Boards
    ↑              ↑              ↑                ↑
    |              |              |                |
Database      Database       Column Maps     Monday API Module
```

## Extending the System

To add new Monday.com columns to the sync:

1. Update the column mappings in `monday_api.py`
2. Add the corresponding columns to the database schema if needed
3. Update the model classes to handle the new data
4. Document the changes in `monday_to_database_mapping.md`

## Support

For questions or issues, contact the development team.
