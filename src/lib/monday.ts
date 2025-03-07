import mondaySdk from 'monday-sdk-js';
import fetch from 'node-fetch';

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;

console.log('🚀 Initializing Monday.com SDK');
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
const BOARD_ID_USERS = process.env.MONDAY_BOARD_ID_USERS || "5764059860";
const BOARD_ID_DATA = process.env.MONDAY_BOARD_ID_DATA || "6727219152";
const EMAIL_COLUMN_ID = "email7";
const EMAIL_COLUMN_ID_DATA = "email5__1";
const PASSWORD_COLUMN_ID = "text_mknhvpkq";

if (!MONDAY_API_KEY) {
  throw new Error('Monday.com API key not found in environment variables');
}

monday.setToken(MONDAY_API_KEY);
console.log('✨ Monday.com SDK initialized with API key');

interface MondayItem {
  id: string;
  name: string;
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
        items: MondayItem[];
        cursor: string | null;
      };
    }>;
  };
}

interface ChangePasswordResult {
  success: boolean;
  error?: string;
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
} as const;

export function extractEmailFromItem(item: MondayItem) {
  const emailColumn = item.column_values.find(col => col.id === EMAIL_COLUMN_ID);
  return emailColumn?.text || '';
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
    : `query_params: {rules: [{column_id: "${EMAIL_COLUMN_ID_DATA}", compare_value: ["${userEmail}"]}], operator: and}`;

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

    const response: MondayResponse = await monday.api(query);
    
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
export async function getAllUserJobs(userEmail: string) {
  console.log('🔍 Getting all jobs for user:', userEmail);
  
  let allItems: MondayItem[] = [];
  let nextCursor: string | null = null;
  let hasMoreItems = true;
  let isFirstRequest = true;

  try {
    while (hasMoreItems) {
      const queryParams = isFirstRequest
        ? `query_params: {rules: [{column_id: "${EMAIL_COLUMN_ID_DATA}", compare_value: ["${userEmail}"]}], operator: and}`
        : nextCursor ? `cursor: "${nextCursor}"` : '';
      
      if (isFirstRequest) {
        isFirstRequest = false;
      }

      const query = `query {
        boards(ids: [${BOARD_ID_DATA}]) {
          name
          items_page(
            limit: 250
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

      const response: MondayResponse = await monday.api(query);
      
      if (!response.data?.boards?.[0]?.items_page?.items) {
        console.error('Invalid response structure:', response);
        throw new Error('Invalid response structure from Monday.com API');
      }

      const items = response.data.boards[0].items_page.items;
      allItems = [...allItems, ...items];
      
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
    
    return allItems.map(item => ({
      id: item.id,
      name: item.name,
      email: extractEmailFromItem(item),
      details: item.column_values.reduce((acc: Record<string, string>, col: {id: string, text: string}) => {
        acc[col.id] = col.text;
        return acc;
      }, {} as Record<string, string>)
    }));
  } catch (error) {
    console.error('Error fetching all user jobs:', error);
    throw error;
  }
}

export async function checkEmailExists(email: string): Promise<boolean> {
  console.log('Checking email existence for:', email);
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
            column_values(ids: ["${PASSWORD_COLUMN_ID}"]) {
              text
            }
          }
        }
      }
    }`;

    const response: MondayResponse = await monday.api(query);
    
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
            column_values(ids: ["${PASSWORD_COLUMN_ID}"]) {
              text
            }
          }
        }
      }
    }`;

    // Use serverApi for server-side calls (NextAuth) or monday.api for client-side calls
    const isServer = typeof window === 'undefined';
    const api = isServer ? serverApi : monday.api;
    const response: MondayResponse = await api(query);

    const item = response.data?.boards?.[0]?.items_page?.items?.[0];
    if (!item) {
      return false;
    }

    const storedPassword = item.column_values[0].text;

    // First time login case: if database password is empty AND input is "RESTORE"
    if (!storedPassword && password === "RESTORE") {
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

      await api(mutation);
      return true;
    }

    // Normal login case: verify password matches stored password
    return storedPassword === password;
  } catch (error) {
    console.error('Error checking credentials:', error);
    throw error;
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
    const isServer = typeof window === 'undefined';
    const api = isServer ? serverApi : monday.api;

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

    const response: MondayResponse = await api(query);
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

    await api(mutation);
    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: 'An error occurred while changing password' };
  }
}

// Helper function to clear a column value
export async function clearColumnValue(boardId: string, itemId: string, columnId: string): Promise<boolean> {
  try {
    const isServer = typeof window === 'undefined';
    const api = isServer ? serverApi : monday.api;
    
    const mutation = `mutation {
      change_simple_column_value(
        board_id: ${boardId},
        item_id: ${itemId},
        column_id: "${columnId}",
        value: ""
      ) {
        id
      }
    }`;

    await api(mutation);
    return true;
  } catch (error) {
    console.error('Error clearing column value:', error);
    return false;
  }
}

// Initialize monday.com client
export const mondayClient = monday;