import mondaySdk from 'monday-sdk-js';
import fetch from 'node-fetch';
import { prisma } from '@/lib/prisma';

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const isServer = typeof window === 'undefined';

// Initialize Monday.com SDK
const monday = mondaySdk();

// Configure node-fetch for server-side API calls
const serverApi = async (query: string) => {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': MONDAY_API_KEY || ''
    },
    body: JSON.stringify({ query })
  });
  
  const result = await response.json();
  return result;
};

// Set token for client-side usage
if (!isServer) {
  monday.setToken(MONDAY_API_KEY || '');
  console.log('✨ Monday.com SDK initialized with API key (client-side)');
} else {
  console.log('✨ Monday.com API initialized with node-fetch (server-side)');
}

// Helper function to get the appropriate API client
export const getApiClient = () => {
  return isServer ? serverApi : monday.api.bind(monday);
};

// Safe database operation wrapper
const safeDbOperation = async <T>(operation: () => Promise<T>, fallback: T): Promise<T> => {
  if (!isServer) {
    console.error('Database operations can only be performed on the server side');
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error('Database operation error:', error instanceof Error ? error.message : String(error));
    return fallback;
  }
};

const BOARD_ID_USERS = process.env.MONDAY_BOARD_ID_USERS || "5764059860";
const BOARD_ID_DATA = process.env.MONDAY_BOARD_ID_DATA || "6727219152";
const EMAIL_COLUMN_ID = "email7";
const EMAIL_COLUMN_ID_DATA = "email5__1";
const PASSWORD_COLUMN_ID = "text_mknhvpkq";

// Define column IDs for first and last name
const FIRST_NAME_COLUMN_ID = "text25";
const LAST_NAME_COLUMN_ID = "text1";

if (!MONDAY_API_KEY) {
  throw new Error('Monday.com API key not found in environment variables');
}

interface MondayItem {
  id: string;
  name: string;
  updated_at?: string;
  column_values: {
    id: string;
    text: string;
    value: string | null;
  }[];
}

interface MondayResponse {
  data: {
    boards: Array<{
      name: string;
      items_page: {
        items: Array<{
          id: string;
          name: string;
          updated_at?: string;
          column_values: Array<{
            id: string;
            text: string;
            value: string | null;
          }>;
        }>;
        cursor: string | null;
      };
    }>;
  };
}

interface ChangePasswordResult {
  success: boolean;
  error?: string;
  mondayId?: string;
}

// Column mapping for Monday.com board
export const COLUMN_MAP = {
  'text95__1': 'Current Stage',
  'job_address___text__1': 'Job Address',
  'jp_total__1': 'Job Total',
  'text0__1': 'Customer First Name',
  'text1__1': 'Customer Last Name',
  'phone_1__1': 'Customer Phone',
  'email4__1': 'Customer Email',
  'text': 'Job Details',
  'text65__1': 'Job Name',
} as const;

// Interface for job sync result
export interface JobSyncResult {
  created: number;
  updated: number;
  total: number;
  error?: string;
}

export function extractEmailFromItem(item: MondayItem) {
  const emailColumn = item.column_values.find(col => col.id === EMAIL_COLUMN_ID);
  return emailColumn?.text || '';
}

/**
 * Save Monday.com jobs to the database using batch operations
 * @param jobs Array of jobs from Monday.com
 * @param userEmail Email of the user the jobs belong to
 * @returns Promise with the result of the operation
 */
export async function saveJobsToDatabase(
  jobs: Array<{
    id: string;
    name: string;
    email: string;
    details: Record<string, string>;
  }>,
  userEmail: string
): Promise<JobSyncResult> {
  console.log(`💾 Saving ${jobs.length} jobs to database for user: ${userEmail}`);
  
  if (jobs.length === 0) {
    console.log('No jobs to save, skipping database operations');
    return { created: 0, updated: 0, total: 0 };
  }
  
  // Ensure we're on the server side
  if (!isServer) {
    console.error('Database operations can only be performed on the server side');
    return { 
      created: 0, 
      updated: 0, 
      total: 0, 
      error: 'Database operations can only be performed on the server side' 
    };
  }
  
  try {
    // First, get the user ID from the database
    const user = await prisma.monday_users.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      console.error(`User not found in database: ${userEmail}`);
      return { 
        created: 0, 
        updated: 0, 
        total: 0, 
        error: `User not found in database: ${userEmail}` 
      };
    }
    
    // Get all existing jobs for this user to determine which to update vs. create
    const existingJobs = await prisma.monday_jobs.findMany({
      where: {
        user_id: user.id,
        monday_id: { in: jobs.map(job => job.id) }
      },
      select: {
        id: true,
        monday_id: true,
        name: true,
        details: true
      }
    });
    
    // Create a map of monday_id to database job for quick lookup
    const existingJobMap = new Map(
      existingJobs.map(job => [job.monday_id, job])
    );
    
    // Separate jobs into those to create and those to update
    const jobsToCreate: typeof jobs = [];
    const jobsToUpdate: Array<{ id: string; monday_id: string; name: string; details: any; hasChanged: boolean }> = [];
    
    for (const job of jobs) {
      const existingJob = existingJobMap.get(job.id);
      
      if (existingJob) {
        // Check if the job data has actually changed
        const hasNameChanged = existingJob.name !== job.name;
        
        // Compare details objects
        const existingDetails = existingJob.details as Record<string, string>;
        const newDetails = job.details;
        
        // Check if details have changed by comparing JSON strings
        const existingDetailsStr = JSON.stringify(existingDetails);
        const newDetailsStr = JSON.stringify(newDetails);
        const hasDetailsChanged = existingDetailsStr !== newDetailsStr;
        
        const hasChanged = hasNameChanged || hasDetailsChanged;
        
        // Job exists, add to update list with change flag
        jobsToUpdate.push({
          id: existingJob.id,
          monday_id: job.id,
          name: job.name,
          details: job.details as any, // Cast to any for JSON field
          hasChanged
        });
      } else {
        // New job, add to create list
        jobsToCreate.push(job);
      }
    }
    
    console.log(`📊 Processing ${jobsToCreate.length} new jobs and ${jobsToUpdate.length} existing jobs`);
    
    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 100;
    let created = 0;
    let updated = 0;
    
    // Process creates in batches
    for (let i = 0; i < jobsToCreate.length; i += BATCH_SIZE) {
      const batch = jobsToCreate.slice(i, i + BATCH_SIZE);
      
      // Use createMany for better performance
      if (batch.length > 0) {
        const result = await prisma.monday_jobs.createMany({
          data: batch.map(job => ({
            monday_id: job.id,
            name: job.name,
            user_id: user.id,
            details: job.details as any // Cast to any for JSON field
          })),
          skipDuplicates: true
        });
        
        created += result.count;
      }
    }
    
    // Process updates one by one (Prisma doesn't support updateMany with different data per record)
    for (let i = 0; i < jobsToUpdate.length; i += BATCH_SIZE) {
      const batch = jobsToUpdate.slice(i, i + BATCH_SIZE);
      
      // Only update jobs that have actually changed
      const jobsWithChanges = batch.filter(job => job.hasChanged);
      
      // Use Promise.all to process updates in parallel within the batch
      if (jobsWithChanges.length > 0) {
        const updatePromises = jobsWithChanges.map(job => 
          prisma.monday_jobs.update({
            where: { id: job.id },
            data: {
              name: job.name,
              details: job.details,
              updated_at: new Date()
            }
          })
        );
        
        await Promise.all(updatePromises);
        updated += jobsWithChanges.length;
      }
      
      // Log skipped updates
      const skippedCount = batch.length - jobsWithChanges.length;
      if (skippedCount > 0) {
        console.log(`⏭️ Skipped ${skippedCount} jobs with no changes`);
      }
    }
    
    console.log(`✅ Saved jobs to database: ${created} created, ${updated} updated, ${jobsToUpdate.length - updated} skipped (no changes)`);
    
    return {
      created,
      updated,
      total: jobs.length
    };
  } catch (error) {
    console.error('Error saving jobs to database:', error);
    return {
      created: 0,
      updated: 0,
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Sync all jobs for a user from Monday.com to the database
 * @param userEmail Email of the user to sync jobs for
 * @param forceFullSync Force a full sync even if there's a recent sync record
 * @returns Promise with the result of the sync operation
 */
export async function syncUserJobs(userEmail: string, forceFullSync: boolean = false): Promise<JobSyncResult> {
  console.log(`🔄 Syncing jobs for user: ${userEmail}${forceFullSync ? ' (force full sync)' : ''}`);
  
  // Ensure we're on the server side
  if (!isServer) {
    console.error('Database operations can only be performed on the server side');
    return { 
      created: 0, 
      updated: 0, 
      total: 0, 
      error: 'Database operations can only be performed on the server side' 
    };
  }
  
  try {
    // Get the user ID
    const user = await prisma.monday_users.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      throw new Error(`User not found in database: ${userEmail}`);
    }
    
    // Get the last sync record
    let lastSyncTimestamp: Date | undefined = undefined;
    let existingSyncRecord = null;
    
    if (!forceFullSync) {
      existingSyncRecord = await prisma.monday_jobs_sync.findFirst({
        where: {
          user_id: user.id,
          email: userEmail
        }
      });
      
      if (existingSyncRecord?.last_sync_timestamp) {
        // Use the last sync timestamp for incremental sync
        lastSyncTimestamp = existingSyncRecord.last_sync_timestamp;
        console.log(`📅 Last sync was at: ${lastSyncTimestamp.toISOString()}`);
      }
    }
    
    // Get all jobs for the user from Monday.com (with incremental sync if available)
    const jobs = await getAllUserJobs(userEmail, false, lastSyncTimestamp);
    
    // Save jobs to database
    const result = await saveJobsToDatabase(jobs, userEmail);
    
    // Update the sync record
    try {
      const now = new Date();
      
      if (existingSyncRecord) {
        // Update existing record
        await prisma.monday_jobs_sync.update({
          where: { id: existingSyncRecord.id },
          data: {
            last_sync_timestamp: now,
            total_jobs: jobs.length,
            has_more: false,
            last_cursor: null
          }
        });
      } else {
        // Create new record
        await prisma.monday_jobs_sync.create({
          data: {
            user_id: user.id,
            email: userEmail,
            last_sync_timestamp: now,
            total_jobs: jobs.length,
            has_more: false,
            last_cursor: null
          }
        });
      }
    } catch (syncError) {
      console.error('Error updating sync record:', syncError);
      // Continue even if sync record update fails
    }
    
    return result;
  } catch (error) {
    console.error('Error syncing user jobs:', error);
    return {
      created: 0,
      updated: 0,
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export interface JobsResponse {
  items: {
    id: string;
    name: string;
    email: string;
    details: Record<string, string>;
  }[];
  cursor: string | null;
  hasMore: boolean;
  total?: number;
}

export async function getUserJobs(userEmail: string, options?: { 
  cursor?: string | null; 
  limit?: number;
  forceRefresh?: boolean;
}) {
  console.log('🔍 Getting jobs for user:', userEmail, options);
  
  const limit = options?.limit || 50;
  const queryParams = options?.cursor 
    ? `cursor: "${options.cursor}"`
    : `query_params: {rules: [{column_id: "${EMAIL_COLUMN_ID_DATA}", compare_value: ["${userEmail}"]}], order_by: [{ column_id: "__last_updated__", direction: desc }]}`;

  try {
    const query = `query {
      boards(ids: [${BOARD_ID_DATA}]) {
        name
        items_page(
          limit: ${limit}
          ${queryParams}
        ) {
          cursor
          items {
            id
            name
            column_values(ids: ${JSON.stringify(Object.keys(COLUMN_MAP))}) {
              id
              text
              value
            }
          }
        }
      }
    }`;

    // Use the appropriate API client
    const currentApi = getApiClient();
    const response: MondayResponse = await currentApi(query);
    
    if (!response.data?.boards?.[0]?.items_page?.items) {
      console.error('Invalid response structure:', response);
      throw new Error('Invalid response structure from Monday.com API');
    }

    const items = response.data.boards[0].items_page.items;
    const nextCursor = response.data.boards[0].items_page.cursor;
    
    console.log(`📋 Found ${items.length} jobs for user (page):`, userEmail);
    
    const formattedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      email: extractEmailFromItem(item),
      details: item.column_values.reduce((acc: Record<string, string>, col: {id: string, text: string}) => {
        acc[col.id] = col.text;
        return acc;
      }, {} as Record<string, string>)
    }));

    // If forceRefresh is true, save the jobs to the database
    if (options?.forceRefresh) {
      const isServer = typeof window === 'undefined';
      if (isServer) {
        await saveJobsToDatabase(formattedItems, userEmail);
      }
    }

    return {
      items: formattedItems,
      cursor: nextCursor,
      hasMore: Boolean(nextCursor)
    } as JobsResponse;
  } catch (error) {
    console.error('Error fetching user jobs:', error);
    throw error;
  }
}

// Get all jobs for a user (for initial load or full refresh)
export async function getAllUserJobs(
  userEmail: string, 
  saveToDb: boolean = false,
  lastSyncTimestamp?: Date,
  chunkSize: number = 250
) {
  console.log('🔍 Getting all jobs for user:', userEmail, lastSyncTimestamp ? `(since ${lastSyncTimestamp.toISOString()})` : '(full sync)', `chunkSize: ${chunkSize}`);
  
  let allItems: MondayItem[] = [];
  let nextCursor: string | null = null;
  let hasMoreItems = true;
  let isFirstRequest = true;

  try {
    while (hasMoreItems) {
      // Build the query parameters
      let queryRules = `[{column_id: "${EMAIL_COLUMN_ID_DATA}", compare_value: ["${userEmail}"]}]`;
      
      // Add last updated filter if we have a lastSyncTimestamp
      if (lastSyncTimestamp) {
        // Calculate how long ago the last sync was
        const now = new Date();
        const diffInDays = Math.floor((now.getTime() - lastSyncTimestamp.getTime()) / (1000 * 60 * 60 * 24));
        
        // Choose the appropriate filter based on how long ago the last sync was
        let timeFilter = "PAST_DATETIME"; // Default to all items
        
        if (diffInDays === 0) {
          timeFilter = "TODAY"; // If last sync was today
        } else if (diffInDays === 1) {
          timeFilter = "YESTERDAY"; // If last sync was yesterday
        } else if (diffInDays <= 7) {
          timeFilter = "THIS_WEEK"; // If last sync was within the last week
        } else if (diffInDays <= 14) {
          timeFilter = "LAST_WEEK"; // If last sync was within the last two weeks
        } else if (diffInDays <= 30) {
          timeFilter = "THIS_MONTH"; // If last sync was within the last month
        } else if (diffInDays <= 60) {
          timeFilter = "LAST_MONTH"; // If last sync was within the last two months
        }
        
        console.log(`🔍 Using time filter: ${timeFilter} for last sync ${diffInDays} days ago`);
        
        // Use the appropriate time filter
        queryRules = `[
          {column_id: "${EMAIL_COLUMN_ID_DATA}", compare_value: ["${userEmail}"]},
          {column_id: "__last_updated__", compare_value: ["${timeFilter}"], operator: any_of, compare_attribute: "UPDATED_AT"}
        ]`;
        
        // Note: We'll still need to filter by the exact timestamp in our code
      }
      
      const queryParams = isFirstRequest
        ? `query_params: {rules: ${queryRules}, order_by: [{ column_id: "__last_updated__", direction: desc }]}`
        : nextCursor ? `cursor: "${nextCursor}"` : '';
      
      if (isFirstRequest) {
        isFirstRequest = false;
      }

      const query = `query {
        boards(ids: [${BOARD_ID_DATA}]) {
          name
          items_page(
            limit: ${chunkSize}
            ${queryParams}
          ) {
            cursor
            items {
              id
              name
              column_values(ids: ${JSON.stringify(Object.keys(COLUMN_MAP))}) {
                id
                text
                value
              }
            }
          }
        }
      }`;

      // Use the appropriate API client
      const currentApi = getApiClient();
      const response: MondayResponse = await currentApi(query);
      
      if (!response.data?.boards?.[0]?.items_page?.items) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response structure from Monday.com API');
      }

      const items = response.data.boards[0].items_page.items;
      
      // If we have a lastSyncTimestamp, filter items by updated_at
      let filteredItems = items;
      if (lastSyncTimestamp) {
        // Filter items that were updated after the last sync timestamp
        filteredItems = items.filter(item => {
          const itemUpdatedAt = getItemLastUpdatedTimestamp(item);
          // If we can't determine the updated timestamp, include the item (to be safe)
          if (!itemUpdatedAt) return true;
          // Otherwise, only include items updated after the last sync
          return itemUpdatedAt >= lastSyncTimestamp;
        });
        
        console.log(`🔍 Filtered ${items.length} items to ${filteredItems.length} items updated since ${lastSyncTimestamp.toISOString()}`);
      }
      
      allItems = [...allItems, ...filteredItems];
      
      // Get the next cursor
      nextCursor = response.data.boards[0].items_page.cursor ?? null;
      
      // If no cursor or empty items array, we're done
      if (!nextCursor || items.length === 0) {
        hasMoreItems = false;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`📋 Found ${allItems.length} total jobs for user:`, userEmail);
    
    const formattedJobs = allItems.map(item => ({
      id: item.id,
      name: item.name,
      email: extractEmailFromItem(item),
      details: item.column_values.reduce((acc: Record<string, string>, col: {id: string, text: string}) => {
        acc[col.id] = col.text;
        return acc;
      }, {} as Record<string, string>)
    }));

    // If saveToDb is true, save the jobs to the database
    if (saveToDb) {
      const isServer = typeof window === 'undefined';
      if (isServer) {
        await saveJobsToDatabase(formattedJobs, userEmail);
      }
    }
    
    return formattedJobs;
  } catch (error) {
    console.error('Error fetching all user jobs:', error);
    throw error;
  }
}

export async function checkEmailExists(email: string): Promise<boolean> {
  console.log('Checking email existence for:', email);
  try {
    const query = `query {
      boards(ids: [${BOARD_ID_DATA}]) {
        items_page(
          limit: 1,
          query_params: {
            rules: [{column_id: "${EMAIL_COLUMN_ID_DATA}", compare_value: ["${email}"]}],
            operator: and
          }
        ) {
          items {
            id
          }
        }
      }
    }`;

    // Use the appropriate API client
    const currentApi = getApiClient();
    const response: MondayResponse = await currentApi(query);
    
    const item = response.data?.boards?.[0]?.items_page?.items?.[0];
    return Boolean(item);
  } catch (error) {
    console.error('Error checking email existence:', error);
    throw error;
  }
}

export async function checkCredentials(email: string, password: string): Promise<boolean> {
  console.log('Checking credentials for:', email);
  try {
    // First query to get the user and their current password
    const query = `query {
      boards(ids: [${BOARD_ID_USERS}]) {
        items_page(
          limit: 1,
          query_params: {
            rules: [{column_id: "${EMAIL_COLUMN_ID}", compare_value: ["${email}"]}],
            operator: and
          }
        ) {
          items {
            id
            name
            column_values(ids: ["${PASSWORD_COLUMN_ID}", "${FIRST_NAME_COLUMN_ID}", "${LAST_NAME_COLUMN_ID}"]) {
              id
              text
            }
          }
        }
      }
    }`;

    // Use the appropriate API client
    const currentApi = getApiClient();
    console.log(`Using API client: ${isServer ? 'server-side' : 'client-side'}`);
    
    const response: MondayResponse = await currentApi(query);
    console.log('Monday API response received');
    
    if (!response.data) {
      console.error('Invalid Monday.com API response:', response);
      return false;
    }

    const item = response.data?.boards?.[0]?.items_page?.items?.[0];
    if (!item) {
      console.log(`No user found with email: ${email}`);
      return false;
    }

    // Extract column values
    const columnValues = item.column_values;
    const storedPassword = columnValues.find(col => col.id === PASSWORD_COLUMN_ID)?.text || '';
    const firstName = columnValues.find(col => col.id === FIRST_NAME_COLUMN_ID)?.text || '';
    const lastName = columnValues.find(col => col.id === LAST_NAME_COLUMN_ID)?.text || '';

    console.log(`User found: ${item.name}, checking password...`);

    // First time login case: if database password is empty AND input is "RESTORE"
    if (!storedPassword && password === "RESTORE") {
      console.log('First-time login with RESTORE password');
      const mutation = `mutation {
        change_simple_column_value(
          board_id: ${BOARD_ID_USERS},
          item_id: ${item.id},
          column_id: "${PASSWORD_COLUMN_ID}",
          value: ${formatColumnValue("RESTORE")}
        ) {
          id
        }
      }`;

      await currentApi(mutation);
      return true;
    }

    // Normal login case: verify password matches stored password
    const isValidCredentials = storedPassword === password;
    console.log(`Password validation result: ${isValidCredentials}`);
    
    if (isValidCredentials && isServer) {
      console.log('Valid credentials, checking database...');
      // Check if user exists in the database using our safe wrapper
      try {
        const dbUser = await prisma.monday_users.findUnique({
          where: { email }
        });
        
        if (!dbUser) {
          console.log('User not found in database, creating new record');
          // Create user in the database if they don't exist
          await prisma.monday_users.create({
            data: {
              monday_id: item.id,
              email,
              password: storedPassword,
              first_name: firstName,
              last_name: lastName
            }
          });
          console.log(`Created new user in database: ${email}`);
        } else {
          console.log('User found in database');
        }
      } catch (dbError) {
        // Log the error but don't fail authentication if DB operation fails
        console.error('Database operation failed during login:', dbError);
        // Still return true if credentials are valid, even if DB operation fails
        return isValidCredentials;
      }
    } else if (!isServer) {
      console.log('Not on server, skipping database check');
    }
    
    return isValidCredentials;
  } catch (error) {
    console.error('Error checking credentials:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

// Helper function to format column values according to Monday.com's requirements
function formatColumnValue(value: string | null): string {
  if (value === null) {
    return '""'; // Empty string for text columns
  }
  return JSON.stringify(value);
}

export async function changePassword(email: string, currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
  try {
    // Use the appropriate API client
    const currentApi = getApiClient();

    // Get user and verify current password
    const query = `query {
      boards(ids: [${BOARD_ID_USERS}]) {
        items_page(
          limit: 500,
          query_params: {
            rules: [{column_id: "${EMAIL_COLUMN_ID}", compare_value: ["${email}"]}],
            operator: and
          }
        ) {
          items {
            id
            column_values(ids: ["${PASSWORD_COLUMN_ID}"]) {
              text
            }
          }
        }
      }
    }`;

    const response: MondayResponse = await currentApi(query);
    const item = response.data?.boards?.[0]?.items_page?.items?.[0];

    if (!item) {
      return { success: false, error: 'User not found' };
    }

    // Verify current password matches exactly
    const storedPassword = item.column_values[0].text;
    if (storedPassword !== currentPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Update to new password using change_simple_column_value for text columns
    const mutation = `mutation {
      change_simple_column_value(
        board_id: ${BOARD_ID_USERS},
        item_id: ${item.id},
        column_id: "${PASSWORD_COLUMN_ID}",
        value: ${formatColumnValue(newPassword)}
      ) {
        id
      }
    }`;

    await currentApi(mutation);
    
    // Only update the Prisma database when running on the server
    if (isServer) {
      await safeDbOperation(async () => {
        // Also update the password in the Prisma database
        const dbUser = await prisma.monday_users.findUnique({
          where: { email }
        });
        
        if (dbUser) {
          // Update existing user's password
          await prisma.monday_users.update({
            where: { email },
            data: { password: newPassword }
          });
        } else {
          // Create user in the database if they don't exist
          await prisma.monday_users.create({
            data: {
              monday_id: item.id,
              email,
              password: newPassword
            }
          });
        }
        
        return true;
      }, false);
    }
    
    return { success: true, mondayId: item.id };
  } catch (error) {
    console.error('Error changing password:', error instanceof Error ? error.message : String(error));
    return { success: false, error: 'An error occurred while changing password' };
  }
}

// Initialize monday.com client
export const mondayClient = monday;

// Export the API function for use in other modules
export const mondayApiClient = {
  api: getApiClient
};

/**
 * Get jobs for a user from the database
 * @param userEmail Email of the user to get jobs for
 * @param options Optional parameters for pagination
 * @returns Promise with the jobs from the database
 */
export async function getJobsFromDatabase(
  userEmail: string,
  options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'updated_at' | 'name';
    orderDirection?: 'asc' | 'desc';
  }
): Promise<JobsResponse> {
  console.log(`🔍 Getting jobs from database for user: ${userEmail}`);
  
  try {
    // Get the user from the database
    const user = await prisma.monday_users.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      console.error(`User not found in database: ${userEmail}`);
      return { items: [], cursor: null, hasMore: false, total: 0 };
    }
    
    // Set default options
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const orderBy = options?.orderBy || 'updated_at';
    const orderDirection = options?.orderDirection || 'desc';
    
    // Get total count for pagination
    const totalCount = await prisma.monday_jobs.count({
      where: { user_id: user.id }
    });
    
    // Get jobs from database with pagination
    const jobs = await prisma.monday_jobs.findMany({
      where: { user_id: user.id },
      orderBy: { [orderBy]: orderDirection },
      skip: offset,
      take: limit
    });
    
    // Format jobs to match the Monday.com API response
    const formattedJobs = jobs.map(job => ({
      id: job.monday_id,
      name: job.name,
      email: userEmail,
      details: job.details as Record<string, string>,
      notes_count: job.notes_count || 0
    }));
    
    console.log(`📋 Found ${jobs.length} jobs in database for user: ${userEmail}`);
    
    return {
      items: formattedJobs,
      cursor: offset + jobs.length < totalCount ? String(offset + limit) : null,
      hasMore: offset + jobs.length < totalCount,
      total: totalCount
    };
  } catch (error) {
    console.error('Error getting jobs from database:', error);
    throw error;
  }
}

/**
 * Get the last sync information for a user
 * @param userEmail Email of the user to get sync info for
 * @returns Promise with the sync information
 */
export async function getLastSyncInfo(userEmail: string): Promise<{
  lastSyncTimestamp: Date | null;
  totalJobs: number;
}> {
  try {
    // Get the user from the database
    const user = await prisma.monday_users.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return { lastSyncTimestamp: null, totalJobs: 0 };
    }
    
    // Get the actual total count of jobs in the database
    const totalJobs = await prisma.monday_jobs.count({
      where: { user_id: user.id }
    });
    
    // Get the sync record
    const syncRecord = await prisma.monday_jobs_sync.findFirst({
      where: {
        user_id: user.id,
        email: userEmail
      }
    });
    
    if (!syncRecord) {
      return { lastSyncTimestamp: null, totalJobs };
    }
    
    return {
      lastSyncTimestamp: syncRecord.last_sync_timestamp,
      totalJobs
    };
  } catch (error) {
    console.error('Error getting last sync info:', error);
    return { lastSyncTimestamp: null, totalJobs: 0 };
  }
}

/**
 * Start a background sync process for a user's jobs
 * This function is designed to be called from an API route or background job
 * It will sync jobs in chunks to prevent timeouts
 * 
 * @param userEmail Email of the user to sync jobs for
 * @param chunkSize Number of jobs to process in each chunk (default: 250)
 * @param forceFullSync Force a full sync even if there's a recent sync record
 * @returns Promise with the result of the sync operation
 */
export async function startBackgroundSync(
  userEmail: string, 
  chunkSize: number = 250,
  forceFullSync: boolean = false
): Promise<{
  status: string;
  message: string;
  syncId?: string;
  error?: string;
}> {
  console.log(`🔄 Starting background sync for user: ${userEmail}, chunkSize: ${chunkSize}, forceFullSync: ${forceFullSync}`);
  
  // Ensure we're on the server side
  if (!isServer) {
    console.error('Background sync can only be performed on the server side');
    return { 
      status: 'error',
      message: 'Background sync can only be performed on the server side'
    };
  }
  
  try {
    // Get the user ID
    const user = await prisma.monday_users.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      throw new Error(`User not found in database: ${userEmail}`);
    }
    
    // Get the last sync record
    let lastSyncTimestamp: Date | undefined = undefined;
    let existingSyncRecord = null;
    
    if (!forceFullSync) {
      existingSyncRecord = await prisma.monday_jobs_sync.findFirst({
        where: {
          user_id: user.id,
          email: userEmail
        }
      });
      
      if (existingSyncRecord?.last_sync_timestamp) {
        // Use the last sync timestamp for incremental sync
        lastSyncTimestamp = existingSyncRecord.last_sync_timestamp;
        console.log(`📅 Last sync was at: ${lastSyncTimestamp.toISOString()}`);
      }
    }
    
    // Create or update sync record with status "in_progress"
    const now = new Date();
    let syncRecord;
    
    try {
      if (existingSyncRecord) {
        // Update existing record
        syncRecord = await prisma.monday_jobs_sync.update({
          where: { id: existingSyncRecord.id },
          data: {
            status: 'in_progress',
            started_at: now,
            last_sync_timestamp: now,
            has_more: true,
            error_message: null // Clear any previous error message
          }
        });
      } else {
        // Try to find an existing record one more time to avoid unique constraint errors
        const doubleCheckRecord = await prisma.monday_jobs_sync.findFirst({
          where: {
            user_id: user.id,
            email: userEmail
          }
        });
        
        if (doubleCheckRecord) {
          // Update the record we just found
          syncRecord = await prisma.monday_jobs_sync.update({
            where: { id: doubleCheckRecord.id },
            data: {
              status: 'in_progress',
              started_at: now,
              last_sync_timestamp: now,
              has_more: true,
              error_message: null // Clear any previous error message
            }
          });
        } else {
          // Create new record
          syncRecord = await prisma.monday_jobs_sync.create({
            data: {
              user_id: user.id,
              email: userEmail,
              status: 'in_progress',
              started_at: now,
              last_sync_timestamp: now,
              has_more: true,
              error_message: null // Initialize with no error
            }
          });
        }
      }
    } catch (dbError) {
      console.error('Error creating/updating sync record:', dbError instanceof Error ? dbError.message : String(dbError));
      
      // If we hit a unique constraint error, try to update the existing record
      if (dbError instanceof Error && dbError.message.includes('Unique constraint failed')) {
        try {
          // Find the existing record
          const constraintRecord = await prisma.monday_jobs_sync.findFirst({
            where: {
              user_id: user.id,
              email: userEmail
            }
          });
          
          if (constraintRecord) {
            // Update the existing record
            syncRecord = await prisma.monday_jobs_sync.update({
              where: { id: constraintRecord.id },
              data: {
                status: 'in_progress',
                started_at: now,
                last_sync_timestamp: now,
                has_more: true,
                error_message: null // Clear any previous error message
              }
            });
          } else {
            throw new Error('Could not find or create sync record');
          }
        } catch (retryError) {
          console.error('Error retrying sync record update:', retryError instanceof Error ? retryError.message : String(retryError));
          throw new Error('Failed to create or update sync record');
        }
      } else {
        throw dbError; // Re-throw if it's not a unique constraint error
      }
    }
    
    if (!syncRecord) {
      throw new Error('Failed to create or update sync record');
    }
    
    // Start the background sync process
    // This would typically be handled by a background job system
    // For simplicity, we'll just start the process and return
    processSyncInBackground(userEmail, syncRecord.id.toString(), chunkSize, lastSyncTimestamp)
      .catch(error => {
        console.error('Background sync process failed:', error instanceof Error ? error.message : String(error));
        // Update sync record with error status
        prisma.monday_jobs_sync.update({
          where: { id: syncRecord.id },
          data: {
            status: 'error',
            error_message: error instanceof Error ? error.message : String(error),
            completed_at: new Date()
          }
        }).catch(updateError => {
          console.error('Failed to update sync record with error status:', updateError instanceof Error ? updateError.message : String(updateError));
        });
      });
    
    return {
      status: 'started',
      message: 'Background sync process started',
      syncId: syncRecord.id.toString()
    };
  } catch (error) {
    console.error('Error starting background sync:', error instanceof Error ? error.message : String(error));
    return {
      status: 'error',
      message: 'Failed to start background sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Process sync in background
 * This function is called by startBackgroundSync and should not be called directly
 * 
 * @param userEmail Email of the user to sync jobs for
 * @param syncId ID of the sync record
 * @param chunkSize Number of jobs to process in each chunk
 * @param lastSyncTimestamp Last sync timestamp for incremental sync
 */
async function processSyncInBackground(
  userEmail: string,
  syncId: string,
  chunkSize: number = 250,
  lastSyncTimestamp?: Date
): Promise<void> {
  console.log(`🔄 Processing background sync for user: ${userEmail}, syncId: ${syncId}, chunkSize: ${chunkSize}`);
  
  try {
    // Get all jobs for the user from Monday.com (with incremental sync if available)
    const jobs = await getAllUserJobs(userEmail, false, lastSyncTimestamp, chunkSize);
    
    // Process jobs in chunks
    const totalJobs = jobs.length;
    let processedJobs = 0;
    let created = 0;
    let updated = 0;
    
    console.log(`📊 Processing ${totalJobs} jobs in chunks of ${chunkSize}`);
    
    // Update sync record with total jobs
    try {
      await prisma.monday_jobs_sync.update({
        where: { id: syncId },
        data: {
          total_jobs: totalJobs,
          progress: 0,
          error_message: null // Clear any previous error message when starting
        }
      });
    } catch (updateError) {
      console.error('Error updating sync record with total jobs:', 
        updateError instanceof Error ? updateError.message : String(updateError));
      // Continue processing even if update fails
    }
    
    // Process jobs in chunks
    for (let i = 0; i < totalJobs; i += chunkSize) {
      const chunk = jobs.slice(i, i + chunkSize);
      
      // Save chunk to database
      try {
        const result = await saveJobsToDatabase(chunk, userEmail);
        
        // Update counters
        processedJobs += chunk.length;
        created += result.created || 0;
        updated += result.updated || 0;
        
        // Calculate skipped jobs for logging only
        const chunkSkipped = chunk.length - (result.created || 0) - (result.updated || 0);
        
        // Update sync record with progress
        const progress = Math.round((processedJobs / totalJobs) * 100);
        
        try {
          await prisma.monday_jobs_sync.update({
            where: { id: syncId },
            data: {
              progress,
              processed_jobs: processedJobs,
              created_jobs: created,
              updated_jobs: updated
            }
          });
        } catch (progressError) {
          console.error('Error updating sync progress:', 
            progressError instanceof Error ? progressError.message : String(progressError));
          // Continue processing even if progress update fails
        }
        
        console.log(`📈 Progress: ${progress}% (${processedJobs}/${totalJobs}), Created: ${result.created || 0}, Updated: ${result.updated || 0}, Skipped: ${chunkSkipped}`);
      } catch (chunkError) {
        console.error('Error processing chunk:', 
          chunkError instanceof Error ? chunkError.message : String(chunkError));
        // Continue with next chunk even if this one fails
      }
      
      // Add a small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Get the actual total count of jobs in the database for this user
    const user = await prisma.monday_users.findUnique({
      where: { email: userEmail }
    });
    
    let actualTotalJobs = 0;
    if (user) {
      actualTotalJobs = await prisma.monday_jobs.count({
        where: { user_id: user.id }
      });
    }
    
    // Update sync record with completed status
    try {
      await prisma.monday_jobs_sync.update({
        where: { id: syncId },
        data: {
          status: 'completed',
          completed_at: new Date(),
          has_more: false,
          progress: 100,
          processed_jobs: processedJobs,
          created_jobs: created,
          updated_jobs: updated,
          total_jobs: actualTotalJobs, // Update with actual total count
          error_message: null // Clear any error message on successful completion
        }
      });
    } catch (completeError) {
      console.error('Error updating sync record with completed status:', 
        completeError instanceof Error ? completeError.message : String(completeError));
      // We've processed the jobs, so just log the error
    }
    
    // Calculate total skipped for logging
    const totalSkipped = processedJobs - created - updated;
    
    console.log(`✅ Background sync completed: ${created} created, ${updated} updated, ${totalSkipped} skipped (no changes), ${processedJobs} processed, ${actualTotalJobs} total in database`);
  } catch (error) {
    console.error('Error processing background sync:', 
      error instanceof Error ? error.message : String(error));
    
    // Update sync record with error status
    try {
      await prisma.monday_jobs_sync.update({
        where: { id: syncId },
        data: {
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date()
        }
      });
    } catch (errorUpdateError) {
      console.error('Error updating sync record with error status:', 
        errorUpdateError instanceof Error ? errorUpdateError.message : String(errorUpdateError));
    }
    
    throw error;
  }
}

/**
 * Get the last updated timestamp from an item
 * @param item Monday.com item
 * @returns Date object or null if no timestamp is available
 */
function getItemLastUpdatedTimestamp(item: any): Date | null {
  if (item.updated_at) {
    return new Date(item.updated_at);
  }
  
  // If no updated_at field, try to find it in the column values
  const lastUpdatedColumn = item.column_values?.find(
    (col: any) => col.id === '__last_updated__' || col.id === 'last_updated'
  );
  
  if (lastUpdatedColumn?.value) {
    try {
      const valueObj = JSON.parse(lastUpdatedColumn.value);
      if (valueObj.updated_at) {
        return new Date(valueObj.updated_at);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  return null;
}

// Add this function after the checkEmailExists function
export async function getUserByEmail(email: string): Promise<{ 
  id: string; 
  firstName?: string; 
  lastName?: string;
} | null> {
  console.log('Getting user details for:', email);
  try {
    const query = `query {
      boards(ids: [${BOARD_ID_USERS}]) {
        items_page(
          limit: 1,
          query_params: {
            rules: [{column_id: "${EMAIL_COLUMN_ID}", compare_value: ["${email}"]}],
            operator: and
          }
        ) {
          items {
            id
            name
            column_values(ids: ["${FIRST_NAME_COLUMN_ID}", "${LAST_NAME_COLUMN_ID}"]) {
              id
              text
            }
          }
        }
      }
    }`;

    // Use the appropriate API client
    const currentApi = getApiClient();
    const response: MondayResponse = await currentApi(query);
    
    const item = response.data?.boards?.[0]?.items_page?.items?.[0];
    if (!item) {
      console.log(`No user found with email: ${email}`);
      return null;
    }

    // Extract column values
    const columnValues = item.column_values;
    const firstName = columnValues.find(col => col.id === FIRST_NAME_COLUMN_ID)?.text || '';
    const lastName = columnValues.find(col => col.id === LAST_NAME_COLUMN_ID)?.text || '';

    return {
      id: item.id,
      firstName,
      lastName
    };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}