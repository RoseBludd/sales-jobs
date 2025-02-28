import { mondayClient } from '../../monday';
import fetch from 'node-fetch';

const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
const BOARD_ID_USERS = process.env.MONDAY_BOARD_ID_USERS || "5764059860";
const BOARD_ID_DATA = process.env.MONDAY_BOARD_ID_DATA || "6727219152";

// Column mapping for Master Project Board
export const MASTER_PROJECT_COLUMN_MAP = {
  // Project related columns
  'text95__1': 'current_stage',
  'job_progress_link': 'job_progress_link',
  'job_progress_name': 'job_progress_name',
  'job_progress_job_description': 'job_progress_description',
  'company_cam_link': 'company_cam_link',
  'total_price': 'total_price',
  'total_payment': 'total_payment',
  
  // Customer related columns
  'job_progress_contact_full_name': 'full_name',
  'jp_contact_email': 'email',
  'jp_contact_address': 'address',
  'jp_contact_city': 'city',
  'jp_contact_state': 'state',
  'jp_contact_zip': 'zip',
  'phone_1__1': 'phone',
  
  // Property related columns
  'measurements': 'measurements',
  'one_click_codes': 'one_click_codes',
  
  // Sales Team related columns
  'sales_team_name': 'team_name',
  'partner': 'partner',
  'partner_email': 'partner_email',
  'partner_phone': 'partner_phone',
  
  // User roles
  'project_manager': 'project_manager',
  'estimator': 'estimator',
  'superintendent': 'superintendent',
  'sales_rep': 'sales_rep',
  
  // External entities
  'pa_law': 'pa_law',
  'claim': 'claim',
  'policy': 'policy',
  'insurance_company': 'insurance_company',
  'adjuster': 'adjuster',
  
  // Storm related
  'date_of_loss': 'date_of_loss'
};

// Column mapping for Sales Staff Board
export const SALES_STAFF_COLUMN_MAP = {
  'first_name': 'first_name',
  'last_name': 'last_name',
  'email': 'email',
  'phone': 'phone',
  'address': 'address',
  'city': 'city',
  'state': 'state',
  'zip': 'zip',
  'shirt_size': 'shirt_size',
  'team_name': 'team_name',
  'identification_files': 'identification_files',
  'onboarding_files': 'onboarding_files'
};

interface MondayItem {
  id: string;
  name: string;
  column_values: {
    id: string;
    text: string;
    value: string | null;
  }[];
}

// Function to fetch all items from a board with pagination
export async function fetchAllBoardItems(boardId: string): Promise<MondayItem[]> {
  console.log(`🔍 Fetching all items from board: ${boardId}`);
  
  let allItems: MondayItem[] = [];
  let nextCursor: string | null = null;
  let hasMoreItems = true;

  try {
    while (hasMoreItems) {
      let cursorParam = nextCursor ? `cursor: "${nextCursor}"` : '';
      
      const query = `query {
        boards(ids: [${boardId}]) {
          name
          items_page(limit: 100, ${cursorParam}) {
            cursor
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

      const result = await serverApi(query);
      
      if (result.data?.boards?.[0]?.items_page?.items) {
        const items = result.data.boards[0].items_page.items;
        allItems = [...allItems, ...items];
        
        nextCursor = result.data.boards[0].items_page.cursor;
        hasMoreItems = nextCursor !== null;
      } else {
        hasMoreItems = false;
        console.error('❌ Error fetching items:', result.errors);
      }
    }
    
    console.log(`✅ Successfully fetched ${allItems.length} items from board: ${boardId}`);
    return allItems;
  } catch (error) {
    console.error('❌ Error fetching all board items:', error);
    throw error;
  }
}

// Function to update an item in Monday.com
export async function updateMondayItem(boardId: string, itemId: string, columnId: string, value: string) {
  try {
    const query = `mutation {
      change_column_value(board_id: ${boardId}, item_id: ${itemId}, column_id: "${columnId}", value: "${formatColumnValue(value)}") {
        id
      }
    }`;
    
    const result = await serverApi(query);
    return result.data?.change_column_value?.id ? true : false;
  } catch (error) {
    console.error('❌ Error updating Monday item:', error);
    throw error;
  }
}

// Function to create a new item in Monday.com
export async function createMondayItem(boardId: string, itemName: string, columnValues: Record<string, string>) {
  try {
    // Format column values for Monday.com API
    const formattedColumnValues: Record<string, string> = {};
    
    for (const [columnId, value] of Object.entries(columnValues)) {
      formattedColumnValues[columnId] = formatColumnValue(value);
    }
    
    const columnValuesJson = JSON.stringify(formattedColumnValues);
    
    const query = `mutation {
      create_item(board_id: ${boardId}, item_name: "${itemName}", column_values: ${columnValuesJson}) {
        id
      }
    }`;
    
    const result = await serverApi(query);
    return result.data?.create_item?.id;
  } catch (error) {
    console.error('❌ Error creating Monday item:', error);
    throw error;
  }
}

// Function to delete an item in Monday.com
export async function deleteMondayItem(boardId: string, itemId: string) {
  try {
    const query = `mutation {
      delete_item(item_id: ${itemId}) {
        id
      }
    }`;
    
    const result = await serverApi(query);
    return result.data?.delete_item?.id ? true : false;
  } catch (error) {
    console.error('❌ Error deleting Monday item:', error);
    throw error;
  }
}

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

// Helper function to format column values according to Monday.com's requirements
function formatColumnValue(value: string | null): string {
  if (value === null) return '""';
  
  // Escape double quotes
  const escapedValue = value.replace(/"/g, '\\"');
  return `"${escapedValue}"`;
}

export default {
  fetchAllBoardItems,
  updateMondayItem,
  createMondayItem,
  deleteMondayItem,
  MASTER_PROJECT_COLUMN_MAP,
  SALES_STAFF_COLUMN_MAP
};
