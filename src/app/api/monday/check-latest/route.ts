import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getApiClient, COLUMN_MAP } from '@/lib/monday';

// Constants
const BOARD_ID_DATA = process.env.MONDAY_BOARD_ID || '6727219152';
const EMAIL_COLUMN_ID_DATA = process.env.MONDAY_EMAIL_COLUMN_ID || 'email5__1';

// Helper function for safe error handling
const safeErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else {
    return 'Unknown error';
  }
};

/**
 * POST handler for checking if the latest job from Monday.com is different from what's in the database
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await req.json();
    const { email } = body;
    
    // Use authenticated user's email if none provided
    const userEmail = email || session.user.email;
    
    // Validate email
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Check if user is allowed to check this email
    // Only allow users to check their own email unless they're an admin
    const isAdmin = (session.user as any).role === 'admin';
    if (userEmail !== session.user.email && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to check this user' },
        { status: 403 }
      );
    }
    
    // Get the user from the database
    const user = await prisma.monday_users.findUnique({
      where: { email: userEmail }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }
    
    // Get the most recent job from the database
    const mostRecentDbJob = await prisma.monday_jobs.findFirst({
      where: { user_id: user.id },
      orderBy: { updated_at: 'desc' }
    });
    
    // If no jobs in database, we definitely need to sync
    if (!mostRecentDbJob) {
      return NextResponse.json({
        isUpToDate: false,
        message: 'No jobs found in database'
      });
    }
    
    // Get the most recent job from Monday.com
    try {
      const query = `query {
        boards(ids: [${BOARD_ID_DATA}]) {
          items_page(
            limit: 1
            query_params: {
              rules: [{column_id: "${EMAIL_COLUMN_ID_DATA}", compare_value: ["${userEmail}"]}], 
              order_by: [{ column_id: "__last_updated__", direction: desc }]
            }
          ) {
            items {
              id
              name
              updated_at
              column_values(ids: ${JSON.stringify(Object.keys(COLUMN_MAP))}) {
                id
                text
                value
              }
            }
          }
        }
      }`;
      
      const currentApi = getApiClient();
      const response = await currentApi(query);
      
      if (!response.data?.boards?.[0]?.items_page?.items) {
        throw new Error('Invalid response structure from Monday.com API');
      }
      
      const items = response.data.boards[0].items_page.items;
      
      // If no items returned from Monday, something is wrong
      if (items.length === 0) {
        return NextResponse.json({
          isUpToDate: false,
          message: 'No jobs found in Monday.com'
        });
      }
      
      const mostRecentMondayJob = items[0];
      
      // Format the Monday job details to match our database format
      const mondayJobDetails = mostRecentMondayJob.column_values.reduce((acc: Record<string, string>, col: {id: string, text: string}) => {
        acc[col.id] = col.text;
        return acc;
      }, {} as Record<string, string>);
      
      // First, check if this specific Monday job exists in our database
      const mondayJobInDb = await prisma.monday_jobs.findFirst({
        where: { 
          monday_id: mostRecentMondayJob.id,
          user_id: user.id
        }
      });
      
      // If the job doesn't exist in our database, we need to sync
      if (!mondayJobInDb) {
        return NextResponse.json({
          isUpToDate: false,
          message: 'Most recent Monday job not found in database',
          mondayJob: {
            id: mostRecentMondayJob.id,
            name: mostRecentMondayJob.name,
            updatedAt: mostRecentMondayJob.updated_at,
            details: mondayJobDetails
          }
        });
      }
      
      // If we found the job, compare the details
      const dbDetails = mondayJobInDb.details as Record<string, string>;
      
      // Check if name has changed
      const isSameName = mostRecentMondayJob.name === mondayJobInDb.name;
      
      // Check if any important fields have changed
      let detailsChanged = false;
      const importantFields = ['text95__1', 'job_address___text__1', 'jp_total__1']; // Stage, Address, Total
      
      for (const field of importantFields) {
        if (mondayJobDetails[field] !== dbDetails[field]) {
          detailsChanged = true;
          break;
        }
      }
      
      // If the job exists and has the same name and important details, we're up to date
      const isUpToDate = isSameName && !detailsChanged;
      
      return NextResponse.json({
        isUpToDate,
        message: isUpToDate 
          ? 'Database is up to date with Monday.com' 
          : 'Database needs updating',
        dbJob: {
          id: mondayJobInDb.monday_id,
          name: mondayJobInDb.name,
          updatedAt: mondayJobInDb.updated_at,
          details: dbDetails
        },
        mondayJob: {
          id: mostRecentMondayJob.id,
          name: mostRecentMondayJob.name,
          updatedAt: mostRecentMondayJob.updated_at,
          details: mondayJobDetails
        },
        changedFields: detailsChanged ? importantFields.filter(field => 
          mondayJobDetails[field] !== dbDetails[field]
        ) : []
      });
    } catch (error) {
      console.error('Error fetching most recent job from Monday.com:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch most recent job from Monday.com',
          message: safeErrorMessage(error),
          isUpToDate: false
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in check-latest API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check if database is up to date',
        message: safeErrorMessage(error),
        isUpToDate: false
      },
      { status: 500 }
    );
  }
} 