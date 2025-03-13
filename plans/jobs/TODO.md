# TODO: Implement Database-Based Job Caching System

## Database Setup
- [x] Create SQL schema for `monday_jobs` and `monday_jobs_sync` tables
- [ ] Execute SQL schema in database
- [ ] Update Prisma schema to include the new tables (if using Prisma for these tables)

## Implementation Tasks

### 1. Update Job Fetching Logic
- [ ] Modify `getUserJobs` function to check database first before making API calls
- [ ] Implement efficient check for updates (limit 1 query to compare with latest job)
- [ ] Update pagination to work with database records

### 2. Implement Sync Process
- [ ] Create function to save jobs to database instead of localStorage
- [ ] Implement incremental sync that compares Monday.com data with database
- [ ] Add logic to track sync status per user in `monday_jobs_sync` table
- [ ] Optimize sync to only fetch new/updated jobs when possible

### 3. Database Integration
- [ ] Create helper functions for database operations:
  - [ ] `saveJobToDatabase(job, userId)`
  - [ ] `getJobsFromDatabase(email, userId, options)`
  - [ ] `updateSyncStatus(email, userId, cursor, hasMore)`
  - [ ] `getSyncStatus(email, userId)`
  - [ ] `checkForUpdates(email, userId)`

### 4. Update UI Components
- [ ] Modify loading states to reflect database operations
- [ ] Update refresh/sync button functionality
- [ ] Ensure pagination works with database records

### 5. Migration Strategy
- [ ] Create one-time migration function to move localStorage data to database
- [ ] Add fallback to localStorage if database operations fail

### 6. Testing
- [ ] Test initial load performance
- [ ] Test sync performance
- [ ] Test pagination with large datasets
- [ ] Test concurrent access from multiple users

## Optimization Considerations
- For checking updates: Query Monday.com with limit=1 and compare with latest job in database
- For pagination: Use database pagination instead of in-memory filtering
- For sync: Only fetch full data when necessary, use incremental updates when possible
- Use database transactions for batch operations

## Sync Algorithm
1. Get latest job from Monday.com (limit=1)
2. Compare with latest job in database
3. If different:
   a. Fetch batch of jobs (limit=50)
   b. Compare each job with database
   c. Update/insert as needed
   d. If all 50 are different, continue to next cursor
   e. Repeat until finding matching jobs or no more jobs
4. Update sync status in database 