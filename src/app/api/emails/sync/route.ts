import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import * as emailDbService from '@/lib/email-db-service';
import { WorkMailFolderName } from '@/lib/ews';

export async function GET(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse URL to check for query parameters
    const url = new URL(request.url);
    const forceFull = url.searchParams.get('forceFull') === 'true';
    const background = url.searchParams.get('background') === 'true';
    
    // For background processing, start the sync in the background and return immediately
    if (background) {
      // Start sync in the background (will continue after response is sent)
      setTimeout(async () => {
        try {
          console.log('Starting background sync of all folders...');
          const results = await emailDbService.syncAllFolders(forceFull);
          console.log('Background sync completed:', results);
        } catch (error) {
          console.error('Background sync error:', error);
        }
      }, 100);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Sync started in background',
        background: true
      });
    }
    
    // Otherwise, sync in the foreground and wait for results
    // Sync all folders
    const results = await emailDbService.syncAllFolders(forceFull);
    
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in email sync API:', error);
    return NextResponse.json(
      { error: 'Failed to sync emails', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Also allow POST for triggered syncs with specific folders
export async function POST(request: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { 
      folder, 
      pageSize = 1000, 
      offset = 0, 
      forceFull = false,
      background = false 
    } = body;
    
    // For background processing, start the sync in the background and return immediately
    if (background) {
      setTimeout(async () => {
        try {
          let results: any = {};
          
          // If specific folder is provided, sync just that folder
          if (folder && Object.values(WorkMailFolderName).includes(folder as WorkMailFolderName)) {
            console.log(`Starting background sync of folder ${folder}...`);
            const count = await emailDbService.syncEmailsFromEws(
              folder as WorkMailFolderName,
              pageSize,
              offset,
              forceFull
            );
            results[folder] = count;
          } else {
            // Otherwise sync all folders
            console.log('Starting background sync of all folders...');
            results = await emailDbService.syncAllFolders(forceFull);
          }
          
          console.log('Background sync completed:', results);
        } catch (error) {
          console.error('Background sync error:', error);
        }
      }, 100);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Sync started in background',
        background: true
      });
    }
    
    let results: any = {};
    
    // If specific folder is provided, sync just that folder
    if (folder && Object.values(WorkMailFolderName).includes(folder as WorkMailFolderName)) {
      const count = await emailDbService.syncEmailsFromEws(
        folder as WorkMailFolderName,
        pageSize,
        offset,
        forceFull
      );
      results[folder] = count;
    } else {
      // Otherwise sync all folders
      results = await emailDbService.syncAllFolders(forceFull);
    }
    
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in email sync API:', error);
    return NextResponse.json(
      { error: 'Failed to sync emails', details: (error as Error).message },
      { status: 500 }
    );
  }
} 