import mondayApi, { MASTER_PROJECT_COLUMN_MAP, SALES_STAFF_COLUMN_MAP } from '../utils/monday-api';
import db from '../utils/db';
import projectModel from '../models/project';
import customerModel from '../models/customer';
import userModel from '../models/user';

// Constants
const BOARD_ID_USERS = process.env.MONDAY_BOARD_ID_USERS || "5764059860";
const BOARD_ID_DATA = process.env.MONDAY_BOARD_ID_DATA || "6727219152";

// Helper function to parse address into components
function parseAddress(address: string) {
  // This is a simple implementation - in production, consider using a proper address parser library
  const parts = {
    address: address,
    city: '',
    state: '',
    zip: ''
  };
  
  // Try to extract city, state, zip from the address
  const cityStateZipMatch = address.match(/([^,]+),\s*([A-Z]{2})\s*(\d{5}(?:-\d{4})?)?$/);
  
  if (cityStateZipMatch) {
    parts.city = cityStateZipMatch[1]?.trim() || '';
    parts.state = cityStateZipMatch[2]?.trim() || '';
    parts.zip = cityStateZipMatch[3]?.trim() || '';
    
    // Remove the city, state, zip from the address
    parts.address = address.replace(/,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?$/, '').trim();
  }
  
  return parts;
}

// Helper function to log sync operations
async function logSyncOperation(entityType: string, mondayId: string, operation: string, status: string, errorMessage?: string) {
  const query = `
    INSERT INTO sync_logs (entity_type, monday_id, operation, status, error_message)
    VALUES ($1, $2, $3, $4, $5)
  `;
  
  try {
    await db.query(query, [entityType, mondayId, operation, status, errorMessage || null]);
  } catch (error) {
    console.error('Error logging sync operation:', error);
  }
}

// Function to sync sales staff (users) from Monday.com to PostgreSQL
export async function syncSalesStaff() {
  console.log('🔄 Syncing Sales Staff from Monday.com to PostgreSQL...');
  
  try {
    // Fetch all items from the Sales Staff Board
    const salesStaffItems = await mondayApi.fetchAllBoardItems(BOARD_ID_USERS);
    console.log(`Found ${salesStaffItems.length} sales staff items to sync`);
    
    // Create a transaction for the sync
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Process each sales staff item
      for (const item of salesStaffItems) {
        const mondayId = item.id;
        const userData: any = {
          monday_id: mondayId,
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip: '',
          shirt_size: '',
          role: 'sales_staff'
        };
        
        // Extract column values
        for (const column of item.column_values) {
          const columnId = column.id;
          const columnValue = column.text;
          
          // Map column values to user data
          if (columnId in SALES_STAFF_COLUMN_MAP) {
            const fieldName = SALES_STAFF_COLUMN_MAP[columnId as keyof typeof SALES_STAFF_COLUMN_MAP];
            
            if (fieldName === 'address' && columnValue) {
              // Parse address into components
              const addressParts = parseAddress(columnValue);
              userData.address = addressParts.address;
              userData.city = addressParts.city;
              userData.state = addressParts.state;
              userData.zip = addressParts.zip;
            } else {
              userData[fieldName] = columnValue;
            }
          }
        }
        
        // Save user to database
        try {
          await userModel.createUser(userData);
          await logSyncOperation('user', mondayId, 'create/update', 'success');
        } catch (error) {
          console.error(`Error syncing user ${mondayId}:`, error);
          await logSyncOperation('user', mondayId, 'create/update', 'failed', (error as Error).message);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Sales Staff sync completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error during Sales Staff sync transaction:', error);
      throw error;
    } finally {
      client.release();
    }
    
    return { success: true, message: 'Sales Staff sync completed successfully' };
  } catch (error) {
    console.error('❌ Error syncing Sales Staff:', error);
    return { success: false, message: (error as Error).message };
  }
}

// Function to sync projects from Monday.com to PostgreSQL
export async function syncProjects() {
  console.log('🔄 Syncing Projects from Monday.com to PostgreSQL...');
  
  try {
    // Fetch all items from the Master Project Board
    const projectItems = await mondayApi.fetchAllBoardItems(BOARD_ID_DATA);
    console.log(`Found ${projectItems.length} project items to sync`);
    
    // Create a transaction for the sync
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      // Process each project item
      for (const item of projectItems) {
        const mondayId = item.id;
        const projectData: any = {
          monday_id: mondayId,
          job_progress_link: '',
          job_progress_name: '',
          job_progress_description: '',
          company_cam_link: '',
          total_price: null,
          total_payment: null
        };
        
        const customerData: any = {
          monday_id: mondayId,
          full_name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip: ''
        };
        
        // Extract column values
        for (const column of item.column_values) {
          const columnId = column.id;
          const columnValue = column.text;
          
          // Map column values to project and customer data
          if (columnId in MASTER_PROJECT_COLUMN_MAP) {
            const fieldName = MASTER_PROJECT_COLUMN_MAP[columnId as keyof typeof MASTER_PROJECT_COLUMN_MAP];
            
            // Handle project fields
            if (['job_progress_link', 'job_progress_name', 'job_progress_description', 'company_cam_link'].includes(fieldName)) {
              projectData[fieldName] = columnValue;
            } 
            // Handle numeric fields
            else if (['total_price', 'total_payment'].includes(fieldName)) {
              projectData[fieldName] = columnValue ? parseFloat(columnValue.replace(/[^0-9.]/g, '')) : null;
            }
            // Handle customer fields
            else if (['full_name', 'email', 'phone'].includes(fieldName)) {
              customerData[fieldName] = columnValue;
            }
            // Handle address fields
            else if (fieldName === 'address' && columnValue) {
              // Parse address into components
              const addressParts = parseAddress(columnValue);
              customerData.address = addressParts.address;
              customerData.city = addressParts.city;
              customerData.state = addressParts.state;
              customerData.zip = addressParts.zip;
            }
          }
        }
        
        // Save project to database
        try {
          const savedProject = await projectModel.createProject(projectData);
          await logSyncOperation('project', mondayId, 'create/update', 'success');
          
          // Save customer to database if we have enough data
          if (customerData.full_name || customerData.email || customerData.phone) {
            const savedCustomer = await customerModel.createCustomer(customerData);
            await logSyncOperation('customer', mondayId, 'create/update', 'success');
          }
        } catch (error) {
          console.error(`Error syncing project ${mondayId}:`, error);
          await logSyncOperation('project', mondayId, 'create/update', 'failed', (error as Error).message);
        }
      }
      
      await client.query('COMMIT');
      console.log('✅ Projects sync completed successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error during Projects sync transaction:', error);
      throw error;
    } finally {
      client.release();
    }
    
    return { success: true, message: 'Projects sync completed successfully' };
  } catch (error) {
    console.error('❌ Error syncing Projects:', error);
    return { success: false, message: (error as Error).message };
  }
}

// Main sync function
export async function syncMondayToPostgres() {
  console.log('🚀 Starting Monday.com to PostgreSQL sync...');
  
  try {
    // Initialize the database
    await db.initializeDatabase();
    
    // Sync sales staff
    const salesStaffResult = await syncSalesStaff();
    
    // Sync projects
    const projectsResult = await syncProjects();
    
    return {
      success: salesStaffResult.success && projectsResult.success,
      salesStaff: salesStaffResult,
      projects: projectsResult
    };
  } catch (error) {
    console.error('❌ Error during sync:', error);
    return {
      success: false,
      message: (error as Error).message
    };
  }
}

// If this script is run directly
if (require.main === module) {
  syncMondayToPostgres()
    .then(result => {
      console.log('Sync result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error during sync:', error);
      process.exit(1);
    });
}

export default {
  syncMondayToPostgres,
  syncSalesStaff,
  syncProjects
};
