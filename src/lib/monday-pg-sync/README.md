# Monday.com to PostgreSQL Sync

This module provides a real-time bidirectional sync between Monday.com boards and a PostgreSQL database. It's designed to sync data from the Master Project Board and Sales Staff Board to a normalized PostgreSQL schema.

## Features

- **Bidirectional Sync**: Data flows seamlessly between Monday.com and PostgreSQL
- **Real-time Updates**: Webhook integration for immediate updates
- **Normalized Database Schema**: Properly structured database with relationships
- **Logging**: Detailed logging of sync operations
- **Error Handling**: Robust error handling and transaction support

## Directory Structure

```
monday-pg-sync/
├── models/           # Database models and schema
│   ├── schema.sql    # PostgreSQL schema definition
│   ├── project.ts    # Project model
│   ├── customer.ts   # Customer model
│   └── user.ts       # User model
├── scripts/          # Sync scripts
│   ├── sync-monday-to-pg.ts    # Monday.com to PostgreSQL sync
│   ├── sync-pg-to-monday.ts    # PostgreSQL to Monday.com sync
│   └── webhook-handler.ts      # Webhook handler for real-time sync
├── tests/            # Test scripts
│   └── test-sync.ts  # Test suite for sync functionality
├── utils/            # Utility functions
│   ├── db.ts         # Database connection and utilities
│   └── monday-api.ts # Monday.com API utilities
└── README.md         # Documentation
```

## Setup

1. **Environment Variables**: Ensure the following environment variables are set:
   - `DATABASE_URL`: PostgreSQL connection string
   - `MONDAY_API_KEY`: Monday.com API key
   - `MONDAY_BOARD_ID_USERS`: Sales Staff Board ID (default: 5764059860)
   - `MONDAY_BOARD_ID_DATA`: Master Project Board ID (default: 6727219152)
   - `MONDAY_WEBHOOK_SECRET`: Secret for webhook verification

2. **Database Setup**: The database schema will be automatically created when the sync script runs. You can also manually initialize it:

   ```bash
   # Run the database initialization
   npx ts-node src/lib/monday-pg-sync/scripts/sync-monday-to-pg.ts
   ```

3. **Webhook Setup**: Configure a webhook in Monday.com to point to your API endpoint:
   - URL: `https://your-domain.com/api/monday-webhook`
   - Events: Item Create, Item Update, Column Value Create, Column Value Update, Item Delete

## Usage

### Running a Full Sync

```typescript
import { syncMondayToPostgres } from './src/lib/monday-pg-sync/scripts/sync-monday-to-pg';
import { syncPostgresToMonday } from './src/lib/monday-pg-sync/scripts/sync-pg-to-monday';

// Sync from Monday.com to PostgreSQL
await syncMondayToPostgres();

// Sync from PostgreSQL to Monday.com
await syncPostgresToMonday();
```

### Testing the Sync

```bash
# Run the test suite
npx ts-node src/lib/monday-pg-sync/tests/test-sync.ts
```

## Database Schema

The PostgreSQL database uses a normalized schema with the following main tables:

- `projects`: Stores project information from the Master Project Board
- `customers`: Stores customer information linked to projects
- `properties`: Stores property information linked to customers and projects
- `notes`: Stores notes linked to customers, projects, and properties
- `sales_teams`: Stores sales team information
- `users`: Stores user information from the Sales Staff Board
- `project_users`: Junction table linking projects and users with roles
- `sync_logs`: Logs sync operations for auditing and troubleshooting

## Webhook Integration

The webhook handler processes real-time events from Monday.com and triggers the appropriate sync operations. It supports the following events:

- `create_item`: When a new item is created in Monday.com
- `update_item`: When an item is updated in Monday.com
- `create_column_value`: When a column value is created in Monday.com
- `update_column_value`: When a column value is updated in Monday.com
- `delete_item`: When an item is deleted in Monday.com

## Troubleshooting

- **Sync Logs**: Check the `sync_logs` table in the database for detailed sync operation logs
- **Server Logs**: Check the server logs for error messages and stack traces
- **Database Connection**: Verify the `DATABASE_URL` environment variable is correct
- **Monday.com API**: Verify the `MONDAY_API_KEY` environment variable is correct and has the necessary permissions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
