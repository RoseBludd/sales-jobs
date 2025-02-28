import { NextApiRequest, NextApiResponse } from 'next';
import mondayApi from '../utils/monday-api';
import db from '../utils/db';
import projectModel from '../models/project';
import customerModel from '../models/customer';
import userModel from '../models/user';
import { syncMondayToPostgres } from './sync-monday-to-pg';
import { syncPostgresToMonday } from './sync-pg-to-monday';

// Constants
const BOARD_ID_USERS = process.env.MONDAY_BOARD_ID_USERS || "5764059860";
const BOARD_ID_DATA = process.env.MONDAY_BOARD_ID_DATA || "6727219152";
const WEBHOOK_SECRET = process.env.MONDAY_WEBHOOK_SECRET;

// Verify webhook signature
function verifyWebhookSignature(req: NextApiRequest): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('MONDAY_WEBHOOK_SECRET not set, skipping signature verification');
    return true;
  }
  
  const signature = req.headers['x-monday-signature'];
  
  if (!signature) {
    console.error('Missing Monday.com webhook signature');
    return false;
  }
  
  // In a real implementation, you would verify the signature here
  // using the WEBHOOK_SECRET and the request body
  
  return true;
}

// Handle webhook events
export default async function handleWebhook(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Verify webhook signature
  if (!verifyWebhookSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  try {
    const event = req.body;
    
    // Log the webhook event
    console.log('📩 Received Monday.com webhook event:', JSON.stringify(event));
    
    // Handle different event types
    switch (event.type) {
      case 'create_item':
      case 'update_item':
        await handleItemEvent(event);
        break;
        
      case 'create_column_value':
      case 'update_column_value':
        await handleColumnValueEvent(event);
        break;
        
      case 'delete_item':
        await handleDeleteItemEvent(event);
        break;
        
      default:
        console.log(`Ignoring unhandled event type: ${event.type}`);
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    return res.status(500).json({ error: (error as Error).message });
  }
}

// Handle item creation or update events
async function handleItemEvent(event: any) {
  const { boardId, itemId, userId } = event;
  
  console.log(`🔄 Processing ${event.type} event for item ${itemId} on board ${boardId}`);
  
  // Determine which sync to run based on the board ID
  if (boardId === BOARD_ID_USERS) {
    // Sales Staff Board
    await syncMondayToPostgres();
  } else if (boardId === BOARD_ID_DATA) {
    // Master Project Board
    await syncMondayToPostgres();
  } else {
    console.log(`Ignoring event for untracked board: ${boardId}`);
  }
}

// Handle column value creation or update events
async function handleColumnValueEvent(event: any) {
  const { boardId, itemId, columnId, value } = event;
  
  console.log(`🔄 Processing ${event.type} event for column ${columnId} on item ${itemId}`);
  
  // Determine which sync to run based on the board ID
  if (boardId === BOARD_ID_USERS) {
    // Sales Staff Board
    await syncMondayToPostgres();
  } else if (boardId === BOARD_ID_DATA) {
    // Master Project Board
    await syncMondayToPostgres();
  } else {
    console.log(`Ignoring event for untracked board: ${boardId}`);
  }
}

// Handle item deletion events
async function handleDeleteItemEvent(event: any) {
  const { boardId, itemId } = event;
  
  console.log(`🔄 Processing delete_item event for item ${itemId} on board ${boardId}`);
  
  try {
    // Determine which entity to delete based on the board ID
    if (boardId === BOARD_ID_USERS) {
      // Delete user from PostgreSQL
      const user = await userModel.getUserByMondayId(itemId);
      
      if (user) {
        await userModel.deleteUser(user.id!);
        console.log(`✅ Deleted user with Monday.com ID ${itemId}`);
      } else {
        console.log(`User with Monday.com ID ${itemId} not found in database`);
      }
    } else if (boardId === BOARD_ID_DATA) {
      // Delete project and related customer from PostgreSQL
      const project = await projectModel.getProjectByMondayId(itemId);
      
      if (project) {
        await projectModel.deleteProject(project.id!);
        console.log(`✅ Deleted project with Monday.com ID ${itemId}`);
      } else {
        console.log(`Project with Monday.com ID ${itemId} not found in database`);
      }
      
      // Delete customer with the same Monday.com ID
      const customer = await customerModel.getCustomerByMondayId(itemId);
      
      if (customer) {
        await customerModel.deleteCustomer(customer.id!);
        console.log(`✅ Deleted customer with Monday.com ID ${itemId}`);
      }
    } else {
      console.log(`Ignoring delete event for untracked board: ${boardId}`);
    }
  } catch (error) {
    console.error(`❌ Error handling delete event for item ${itemId}:`, error);
    throw error;
  }
}

// Export for testing
export { handleItemEvent, handleColumnValueEvent, handleDeleteItemEvent };
