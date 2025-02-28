import mondayApi, { MASTER_PROJECT_COLUMN_MAP, SALES_STAFF_COLUMN_MAP } from '../utils/monday-api';
import db from '../utils/db';
import projectModel from '../models/project';
import customerModel from '../models/customer';
import userModel from '../models/user';

// Constants
const BOARD_ID_USERS = process.env.MONDAY_BOARD_ID_USERS || "5764059860";
const BOARD_ID_DATA = process.env.MONDAY_BOARD_ID_DATA || "6727219152";

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

// Function to sync users from PostgreSQL to Monday.com
export async function syncUsersToMonday() {
  console.log('🔄 Syncing Users from PostgreSQL to Monday.com...');
  
  try {
    // Get all users from the database
    const users = await userModel.getAllUsers();
    console.log(`Found ${users.length} users to sync to Monday.com`);
    
    // Create a reverse mapping of field names to column IDs
    const reverseColumnMap: Record<string, string> = {};
    for (const [columnId, fieldName] of Object.entries(SALES_STAFF_COLUMN_MAP)) {
      reverseColumnMap[fieldName] = columnId;
    }
    
    // Process each user
    for (const user of users) {
      if (!user.monday_id) {
        console.warn(`Skipping user ${user.id} - no Monday.com ID`);
        continue;
      }
      
      // Prepare column values for Monday.com
      const columnValues: Record<string, string> = {};
      
      // Map user fields to Monday.com columns
      if (user.first_name && reverseColumnMap['first_name']) {
        columnValues[reverseColumnMap['first_name']] = user.first_name;
      }
      
      if (user.last_name && reverseColumnMap['last_name']) {
        columnValues[reverseColumnMap['last_name']] = user.last_name;
      }
      
      if (user.email && reverseColumnMap['email']) {
        columnValues[reverseColumnMap['email']] = user.email;
      }
      
      if (user.phone && reverseColumnMap['phone']) {
        columnValues[reverseColumnMap['phone']] = user.phone;
      }
      
      // Combine address fields for Monday.com
      if (user.address && reverseColumnMap['address']) {
        let fullAddress = user.address;
        if (user.city) fullAddress += `, ${user.city}`;
        if (user.state) fullAddress += `, ${user.state}`;
        if (user.zip) fullAddress += ` ${user.zip}`;
        
        columnValues[reverseColumnMap['address']] = fullAddress;
      }
      
      if (user.shirt_size && reverseColumnMap['shirt_size']) {
        columnValues[reverseColumnMap['shirt_size']] = user.shirt_size;
      }
      
      // Update the user in Monday.com
      try {
        // Update each column individually
        for (const [columnId, value] of Object.entries(columnValues)) {
          await mondayApi.updateMondayItem(BOARD_ID_USERS, user.monday_id, columnId, value);
        }
        
        await logSyncOperation('user', user.monday_id, 'update', 'success');
      } catch (error) {
        console.error(`Error syncing user ${user.id} to Monday.com:`, error);
        await logSyncOperation('user', user.monday_id, 'update', 'failed', (error as Error).message);
      }
    }
    
    console.log('✅ Users sync to Monday.com completed successfully');
    return { success: true, message: 'Users sync to Monday.com completed successfully' };
  } catch (error) {
    console.error('❌ Error syncing Users to Monday.com:', error);
    return { success: false, message: (error as Error).message };
  }
}

// Function to sync projects from PostgreSQL to Monday.com
export async function syncProjectsToMonday() {
  console.log('🔄 Syncing Projects from PostgreSQL to Monday.com...');
  
  try {
    // Get all projects from the database
    const projects = await projectModel.getAllProjects();
    console.log(`Found ${projects.length} projects to sync to Monday.com`);
    
    // Create a reverse mapping of field names to column IDs
    const reverseColumnMap: Record<string, string> = {};
    for (const [columnId, fieldName] of Object.entries(MASTER_PROJECT_COLUMN_MAP)) {
      reverseColumnMap[fieldName] = columnId;
    }
    
    // Process each project
    for (const project of projects) {
      if (!project.monday_id) {
        console.warn(`Skipping project ${project.id} - no Monday.com ID`);
        continue;
      }
      
      // Prepare column values for Monday.com
      const columnValues: Record<string, string> = {};
      
      // Map project fields to Monday.com columns
      if (project.job_progress_link && reverseColumnMap['job_progress_link']) {
        columnValues[reverseColumnMap['job_progress_link']] = project.job_progress_link;
      }
      
      if (project.job_progress_name && reverseColumnMap['job_progress_name']) {
        columnValues[reverseColumnMap['job_progress_name']] = project.job_progress_name;
      }
      
      if (project.job_progress_description && reverseColumnMap['job_progress_description']) {
        columnValues[reverseColumnMap['job_progress_description']] = project.job_progress_description;
      }
      
      if (project.company_cam_link && reverseColumnMap['company_cam_link']) {
        columnValues[reverseColumnMap['company_cam_link']] = project.company_cam_link;
      }
      
      if (project.total_price !== null && reverseColumnMap['total_price']) {
        columnValues[reverseColumnMap['total_price']] = project.total_price.toString();
      }
      
      if (project.total_payment !== null && reverseColumnMap['total_payment']) {
        columnValues[reverseColumnMap['total_payment']] = project.total_payment.toString();
      }
      
      // Get the customer for this project
      const customer = await customerModel.getCustomerByMondayId(project.monday_id);
      
      if (customer) {
        // Map customer fields to Monday.com columns
        if (customer.full_name && reverseColumnMap['full_name']) {
          columnValues[reverseColumnMap['full_name']] = customer.full_name;
        }
        
        if (customer.email && reverseColumnMap['email']) {
          columnValues[reverseColumnMap['email']] = customer.email;
        }
        
        if (customer.phone && reverseColumnMap['phone']) {
          columnValues[reverseColumnMap['phone']] = customer.phone;
        }
        
        // Combine address fields for Monday.com
        if (customer.address && reverseColumnMap['address']) {
          let fullAddress = customer.address;
          if (customer.city) fullAddress += `, ${customer.city}`;
          if (customer.state) fullAddress += `, ${customer.state}`;
          if (customer.zip) fullAddress += ` ${customer.zip}`;
          
          columnValues[reverseColumnMap['address']] = fullAddress;
        }
      }
      
      // Update the project in Monday.com
      try {
        // Update each column individually
        for (const [columnId, value] of Object.entries(columnValues)) {
          await mondayApi.updateMondayItem(BOARD_ID_DATA, project.monday_id, columnId, value);
        }
        
        await logSyncOperation('project', project.monday_id, 'update', 'success');
      } catch (error) {
        console.error(`Error syncing project ${project.id} to Monday.com:`, error);
        await logSyncOperation('project', project.monday_id, 'update', 'failed', (error as Error).message);
      }
    }
    
    console.log('✅ Projects sync to Monday.com completed successfully');
    return { success: true, message: 'Projects sync to Monday.com completed successfully' };
  } catch (error) {
    console.error('❌ Error syncing Projects to Monday.com:', error);
    return { success: false, message: (error as Error).message };
  }
}

// Main sync function
export async function syncPostgresToMonday() {
  console.log('🚀 Starting PostgreSQL to Monday.com sync...');
  
  try {
    // Sync users
    const usersResult = await syncUsersToMonday();
    
    // Sync projects
    const projectsResult = await syncProjectsToMonday();
    
    return {
      success: usersResult.success && projectsResult.success,
      users: usersResult,
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
  syncPostgresToMonday()
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
  syncPostgresToMonday,
  syncUsersToMonday,
  syncProjectsToMonday
};
