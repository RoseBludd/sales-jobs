import mondaySdk from 'monday-sdk-js';

console.log('🚀 Initializing Monday.com SDK');
const monday = mondaySdk();

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const BOARD_ID = process.env.MONDAY_BOARD_ID || "6727219152";
const EMAIL_COLUMN_ID = "email5__1";

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
        cursor?: string;
      };
    }>;
  };
}

export async function getBoardData() {
  try {
    const query = `query {
      boards(ids: [${BOARD_ID}]) {
        name
        items_page {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }`;

    console.log('🔄 Fetching data from Monday.com board:', BOARD_ID);
    const response: MondayResponse = await monday.api(query);
    
    if (!response.data || !response.data.boards || !response.data.boards[0] || !response.data.boards[0].items_page || !response.data.boards[0].items_page.items) {
      console.error('Invalid response structure:', response);
      throw new Error('Invalid response structure from Monday.com API');
    }

    const items = response.data.boards[0].items_page.items;
    console.log('✅ Successfully fetched Monday.com data:', {
      itemCount: items.length,
      boardName: response.data.boards[0].name
    });
    
    return items;
  } catch (error) {
    console.error('Error fetching Monday.com data:', error);
    throw error;
  }
}

export function extractEmailFromItem(item: MondayItem) {
  const emailColumn = item.column_values.find(col => col.id === EMAIL_COLUMN_ID);
  return emailColumn?.text || '';
}

export async function getUserJobs(userEmail: string) {
  console.log('🔍 Getting jobs for user:', userEmail);
  
  try {
    const query = `query {
      boards(ids: [${BOARD_ID}]) {
        name
        items_page(query_params: {rules: [{column_id: "${EMAIL_COLUMN_ID}", compare_value: ["${userEmail}"]}], operator: and}) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }`;

    const response: MondayResponse = await monday.api(query);
    
    if (!response.data || !response.data.boards || !response.data.boards[0] || !response.data.boards[0].items_page || !response.data.boards[0].items_page.items) {
      console.error('Invalid response structure:', response);
      throw new Error('Invalid response structure from Monday.com API');
    }

    const items = response.data.boards[0].items_page.items;
    console.log(`📋 Found ${items.length} jobs for user:`, userEmail);
    
    return items.map(item => ({
      id: item.id,
      name: item.name,
      email: extractEmailFromItem(item),
      details: item.column_values.reduce((acc: Record<string, string>, col: {id: string, text: string}) => {
        acc[col.id] = col.text;
        return acc;
      }, {} as Record<string, string>)
    }));
  } catch (error) {
    console.error('Error fetching user jobs:', error);
    throw error;
  }
}

export async function checkEmailExists(email: string) {
  console.log('Checking email existence for:', email);
  try {
    const query = `query {
      boards(ids: [${BOARD_ID}]) {
        items_page(query_params: {rules: [{column_id: "${EMAIL_COLUMN_ID}", compare_value: ["${email}"]}]}) {
          cursor
          items {
            id
          }
        }
      }
    }`;

    const response: MondayResponse = await monday.api(query);
    // console.log('Raw response:', JSON.stringify(response, null, 2));
    // console.log('Items:', response?.data?.boards?.[0]?.items_page?.items);
    // console.log('Items length:', response?.data?.boards?.[0]?.items_page?.items?.length);
    
    const exists = response.data && 
                  response.data.boards && 
                  response.data.boards[0] && 
                  response.data.boards[0].items_page && 
                  response.data.boards[0].items_page.items && 
                  response.data.boards[0].items_page.items.length > 0;
    console.log('Email exists?', exists);
    return exists;
  } catch (error) {
    console.error('Error checking email existence:', error);
    throw error;
  }
}

// Initialize monday.com client
export const mondayClient = monday;