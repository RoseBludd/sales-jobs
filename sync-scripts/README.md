# Monday.com - PostgreSQL Sync Tool

This tool provides real-time bidirectional synchronization between Monday.com boards and a PostgreSQL database. It efficiently syncs data between the Master Project Board and Sales Staff Board in Monday.com with your database, eliminating inefficiencies like mirror columns and slow queries.

## Features

- **Bidirectional Sync**: Data flows seamlessly in both directions (Monday.com → PostgreSQL and PostgreSQL → Monday.com)
- **Real-time Updates**: Webhook-based real-time synchronization of data changes
- **Scheduled Sync**: Regular background sync to catch any missed updates
- **Optimized Database Schema**: Properly normalized database schema design
- **Robust Error Handling**: Comprehensive logging and error recovery
- **Mapping & Tracking**: Maintains relationships between Monday.com and PostgreSQL records

## Setup

### Prerequisites

- Python 3.8 or higher
- PostgreSQL database
- Monday.com account with API key and access to the relevant boards

### Installation

1. Install required Python packages:

```bash
pip install -r requirements.txt
```

2. Set up environment variables (in .env file or through your deployment platform):

```
MONDAY_API_KEY=your_monday_api_key
MONDAY_BOARD_ID_USERS=5764059860
MONDAY_BOARD_ID_DATA=6727219152
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
MONDAY_WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_BASE_URL=https://your-domain.com
```

### Database Schema

The tool interacts with the following database tables:

- `projects`: Stores project information
- `customers`: Stores customer data
- `properties`: Stores property information
- `notes`: Stores customer notes
- `users`: Stores user/sales staff data
- `teams`: Stores team information
- `sync_mapping`: Tracks the relationship between Monday.com items and database records
- `sync_logs`: Logs sync operations for debugging and auditing

## Usage

### Running a sync from Monday.com to PostgreSQL

```bash
python main.py monday-to-pg
```

### Running a sync from PostgreSQL to Monday.com

```bash
python main.py pg-to-monday
```

### Running a bidirectional sync

```bash
python main.py bidirectional
```

### Starting the webhook server for real-time sync

```bash
python main.py webhook
```

### Running scheduled sync (default: every 60 minutes)

```bash
python main.py scheduled --interval 30
```

### Running a specific entity sync

```bash
# Sync only sales staff/users
python sync_monday_to_pg.py --entity users

# Sync only projects
python sync_monday_to_pg.py --entity projects

# Sync with a limit (for testing)
python sync_monday_to_pg.py --entity users --limit 10

# Customize batch size
python sync_monday_to_pg.py --entity users --batch-size 100
```

## Monitoring and Management

### Checking Sync Status

1. **View Sync Logs**:
   ```bash
   # To view the most recent Monday.com sync logs
   cat monday_sync.log | tail -n 200
   ```

2. **Check Database Sync Status**:
   ```bash
   # To view sync mapping stats
   python -c "from db_connector import db; print(db.execute_query('SELECT COUNT(*) FROM sync_mapping WHERE entity_type = \'user\''))"
   
   # To view sync logs stats
   python -c "from db_connector import db; print(db.execute_query('SELECT status, COUNT(*) FROM sync_logs WHERE entity_type = \'user\' GROUP BY status'))"
   ```

3. **Run a Diagnostic Sync**:
   ```bash
   # Run a test sync with just 10 users to verify functionality
   python -c "from sync_monday_to_pg import sync_sales_staff; sync_sales_staff(limit=10)"
   ```

### Performance Optimization

The sync system uses several performance optimization techniques:

1. **Batch Processing**: Users are processed in batches (default: 50 per batch) to improve performance.
2. **Skip Empty Records**: Users with empty email addresses are skipped to prevent database constraint violations.
3. **Efficient Database Operations**: Bulk inserts and updates are used when possible.
4. **Error Recovery**: Failed records are logged but don't stop the entire sync process.

### Schema Handling

The system handles differences between Monday.com's data structure and PostgreSQL:

1. **Single Name Field**: The database uses a single `name` field instead of separate first/last name fields.
2. **Flexible Metadata**: Extra fields from Monday.com are stored in a JSONB `metadata` column.
3. **Monday.com IDs**: Records store `monday_id` and `monday_account_id` for mapping.

## Troubleshooting

### Common Issues

- **API Rate Limiting**: Monday.com API has rate limits. The tool implements basic rate limiting, but you may need to adjust if you're syncing large amounts of data.
- **Database Connection Issues**: Ensure your database connection string is correct and the database is accessible.
- **Webhook Configuration**: Make sure your webhooks are properly configured in Monday.com and your server is publicly accessible.
- **Empty Email Addresses**: Users with empty email addresses are skipped. Check the logs for "Skipping user with empty email".
- **Database Constraint Violations**: If you see unique constraint violations, it may mean duplicate records exist in Monday.com.
- **JSON Parsing Errors**: If addresses or other fields fail to parse, they will be stored as raw strings in the metadata.

### Debugging Tips

1. **Enable Verbose Logging**:
   - Set environment variable `DEBUG=1` for more detailed logs

2. **Check for Database Consistency**:
   ```bash
   # Check for users without Monday IDs
   python -c "from db_connector import db; print(db.execute_query('SELECT COUNT(*) FROM users WHERE monday_id IS NULL'))"
   
   # Check for orphaned sync mappings
   python -c "from db_connector import db; print(db.execute_query('SELECT COUNT(*) FROM sync_mapping sm WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = sm.entity_id) AND sm.entity_type = \'user\''))"
   ```

3. **Reset Sync State** (use with caution):
   ```bash
   # Clear all sync mappings for users
   python -c "from db_connector import db; db.execute_query('DELETE FROM sync_mapping WHERE entity_type = \'user\'', fetch=False)"
   
   # Clear all sync logs for users
   python -c "from db_connector import db; db.execute_query('DELETE FROM sync_logs WHERE entity_type = \'user\'', fetch=False)"
   ```

### Address Parsing

The system uses regular expressions to parse address strings from Monday.com into structured components:

- Street address
- City
- State/Province
- Postal code
- Country

If an address fails to parse, it will be stored as a raw string in the `metadata` JSON.

## Future Improvements

### Immediate Enhancements

1. **Incremental Sync**:
   - Only fetch and process items that have changed since the last sync
   - This would dramatically speed up daily sync operations

2. **Command-Line Interface**:
   - Develop a comprehensive CLI for all sync operations
   - Add configuration options for batch size, error handling, etc.

3. **Better Error Recovery**:
   - Implement retry logic for temporary failures
   - Add ability to resume sync from the point of failure

### Medium-Term Improvements

1. **Parallel Processing**:
   - Use Python's multiprocessing to process batches in parallel
   - This would make use of all CPU cores and speed up processing

2. **Data Diffing**:
   - Only update records that have actually changed
   - Reduce database write operations

3. **Monitoring Dashboard**:
   - Create a web interface to view sync status
   - Show statistics on sync operations, error rates, etc.

### Long-Term Vision

1. **Bi-Directional Real-Time Sync**:
   - Add database triggers for real-time updates to Monday.com
   - Ensure changes from either system propagate correctly

2. **Multi-Board Support**:
   - Support syncing multiple Monday.com boards simultaneously
   - Map complex relationships between boards and database tables

3. **Custom Data Transformations**:
   - Allow configurable transformations between Monday.com and the database
   - Support for different data types and formats

## System Architecture Diagram

```
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│               │      │               │      │               │
│   Monday.com  │◄─────┤  Sync Engine  │◄─────┤  PostgreSQL   │
│    API        │      │               │      │   Database    │
│               │─────►│               │─────►│               │
└───────────────┘      └───────────────┘      └───────────────┘
                              ▲
                              │
                      ┌───────┴───────┐
                      │               │
                      │ Sync Mapping  │
                      │   & Logs      │
                      │               │
                      └───────────────┘
```

## Data Model

### PostgreSQL Schema

```
users
├── id (PK)
├── monday_id
├── monday_account_id
├── name
├── email
├── role
├── department
├── status
├── metadata (JSONB)
├── created_at
└── updated_at

sync_mapping
├── id (PK)
├── monday_id
├── entity_id
├── entity_type
├── monday_board_id
└── created_at

sync_logs
├── id (PK)
├── entity_type
├── entity_id
├── monday_id
├── operation
├── status
├── message
├── created_at
└── updated_at
```

### Monday.com to Database Field Mapping

| Monday.com Column   | Database Field      | Notes                           |
|---------------------|---------------------|----------------------------------|
| Name                | name                | Combined into single field      |
| Email               | email               | Used as unique identifier       |
| Role                | role                | Direct mapping                  |
| Department          | department          | Direct mapping                  |
| Status              | status              | Direct mapping                  |
| Phone               | metadata['phone']   | Stored in JSONB metadata        |
| Address             | metadata['address'] | Parsed and stored in metadata   |
| Notes               | metadata['notes']   | Stored in JSONB metadata        |
| Custom fields       | metadata[field]     | All other fields in metadata    |

## Development and Contribution

### Setup Development Environment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/monday-pg-sync.git
   cd monday-pg-sync
   ```

2. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install development dependencies**:
   ```bash
   pip install -r requirements-dev.txt
   ```

4. **Set up pre-commit hooks**:
   ```bash
   pre-commit install
   ```

### Running Tests

```bash
pytest tests/
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Webhooks

The webhook server handles the following events from Monday.com:

- `create_item`: When a new item is created in Monday.com
- `update_item`: When an item is updated in Monday.com
- `delete_item`: When an item is deleted in Monday.com

Webhooks need to be configured in Monday.com to point to your webhook server endpoint.

## Architecture

### Components

1. **Monday API Client (`monday_api.py`)**: Handles all interactions with the Monday.com API
2. **Database Connector (`db_connector.py`)**: Manages database connections and queries
3. **Data Models (`models.py`)**: Defines the data models and database operations
4. **Sync Scripts**:
   - `sync_monday_to_pg.py`: Syncs data from Monday.com to PostgreSQL
   - `sync_pg_to_monday.py`: Syncs data from PostgreSQL to Monday.com
5. **Webhook Handler (`webhook_handler.py`)**: Handles real-time events from Monday.com
6. **Main Script (`main.py`)**: Command-line interface to run different sync operations

### Data Flow

1. **Monday.com → PostgreSQL**:
   - Monday.com webhooks trigger on data changes
   - Webhook handler processes the event
   - Data is extracted, transformed, and loaded into PostgreSQL
   - Sync mapping is updated to maintain relationships

2. **PostgreSQL → Monday.com**:
   - Database changes are detected during scheduled sync
   - Data is extracted from PostgreSQL
   - Monday.com API is used to update or create items
   - Sync mapping is updated to maintain relationships

## Troubleshooting

### Common Issues

- **API Rate Limiting**: Monday.com API has rate limits. The tool implements basic rate limiting, but you may need to adjust if you're syncing large amounts of data.
- **Database Connection Issues**: Ensure your database connection string is correct and the database is accessible.
- **Webhook Configuration**: Make sure your webhooks are properly configured in Monday.com and your server is publicly accessible.

### Logs

- Check `monday_sync.log` for general sync logs
- Check `webhook_handler.log` for webhook-related logs

## Next Steps

- Implement data diffing to minimize API calls
- Add user interface for monitoring and manual sync
- Add support for more Monday.com column types
- Implement caching to improve performance
