'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface SyncStatus {
  status: string;
  progress: number;
  totalJobs: number;
  processedJobs: number;
  createdJobs: number;
  updatedJobs: number;
  startedAt: string | null;
  completedAt: string | null;
  lastSyncTimestamp: string | null;
  error: string | null;
  syncId?: string;
}

export default function MondaySyncStatus() {
  const { data: session } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncId, setSyncId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch initial sync status
  useEffect(() => {
    if (session?.user?.email) {
      fetchSyncStatus();
    }
  }, [session?.user?.email]);

  // Poll for updates when sync is in progress
  useEffect(() => {
    if (syncStatus?.status === 'in_progress' && syncId) {
      // Start polling for updates
      const interval = setInterval(() => {
        fetchSyncStatus(syncId);
      }, 2000); // Poll every 2 seconds
      
      setPollingInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (pollingInterval) {
      // Stop polling when sync is complete
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [syncStatus?.status, syncId]);

  const fetchSyncStatus = async (id?: string) => {
    try {
      const url = id 
        ? `/api/monday/sync?syncId=${id}` 
        : '/api/monday/sync';
      
      const response = await fetch(url);
      
      if (response.status === 404) {
        // Handle case when no sync has been performed yet
        setSyncStatus({
          status: 'not_started',
          progress: 0,
          totalJobs: 0,
          processedJobs: 0,
          createdJobs: 0,
          updatedJobs: 0,
          startedAt: null,
          completedAt: null,
          lastSyncTimestamp: null,
          error: null
        });
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch sync status');
      }
      
      const data = await response.json();
      setSyncStatus(data);
      
      if (data.syncId) {
        setSyncId(data.syncId);
      }
    } catch (err) {
      console.error('Error fetching sync status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const startSync = async (background: boolean = true, forceFullSync: boolean = false) => {
    if (!session?.user?.email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Add retry logic for better reliability
      const maxRetries = 3;
      let retryCount = 0;
      let success = false;
      let responseData;
      
      while (!success && retryCount < maxRetries) {
        try {
          const response = await fetch('/api/monday/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: session.user.email,
              background,
              forceFullSync,
              chunkSize: forceFullSync ? 250 : 50, // Use smaller chunks for incremental sync
            }),
          });
          
          // Check if response is ok
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || errorData.message || 'Failed to sync jobs');
          }
          
          responseData = await response.json();
          success = true;
        } catch (err) {
          retryCount++;
          console.error(`Sync attempt ${retryCount} failed:`, err);
          
          // Check for specific error messages that indicate server-side only operations
          const errorMessage = err instanceof Error ? err.message : String(err);
          if (errorMessage.includes('server side') || 
              errorMessage.includes('Database') || 
              errorMessage.includes('Prisma')) {
            // This is a server-side only error, no need to retry
            throw err;
          }
          
          if (retryCount >= maxRetries) {
            throw err;
          }
          
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
      
      const data = responseData;
      
      if (data.syncId) {
        setSyncId(data.syncId);
        // Immediately fetch status to update UI
        await fetchSyncStatus(data.syncId);
      } else {
        // For non-background sync, update with the result
        setSyncStatus({
          status: data.status || 'completed',
          progress: 100,
          totalJobs: data.total || 0,
          processedJobs: data.total || 0,
          createdJobs: data.created || 0,
          updatedJobs: data.updated || 0,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          lastSyncTimestamp: new Date().toISOString(),
          error: data.error || null,
        });
      }
    } catch (err) {
      console.error('Error starting sync:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      case 'not_started':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!session) {
    return <div className="p-4 text-center">Please sign in to view sync status</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Monday.com Sync Status</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => startSync(true, false)}
          disabled={loading || syncStatus?.status === 'in_progress'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Sync (Incremental)'}
        </button>
        
        <button
          onClick={() => startSync(true, true)}
          disabled={loading || syncStatus?.status === 'in_progress'}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Sync (Full Refresh)'}
        </button>
        
        <button
          onClick={() => startSync(false, false)}
          disabled={loading || syncStatus?.status === 'in_progress'}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Starting...' : 'Quick Sync (Small Datasets)'}
        </button>
      </div>
      
      {syncStatus ? (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-600">Status:</p>
              <p className={`font-bold ${getStatusColor(syncStatus.status)}`}>
                {syncStatus.status === 'not_started' 
                  ? 'Not Started' 
                  : syncStatus.status.charAt(0).toUpperCase() + syncStatus.status.slice(1)}
              </p>
            </div>
            
            <div>
              <p className="text-gray-600">Last Sync:</p>
              <p className="font-bold">
                {syncStatus.status === 'not_started' 
                  ? 'Never' 
                  : formatDate(syncStatus.lastSyncTimestamp)}
              </p>
            </div>
            
            {syncStatus.status === 'not_started' && (
              <div className="col-span-2 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800">
                  No sync has been performed yet. Click one of the sync buttons above to import your Monday.com jobs.
                </p>
              </div>
            )}
            
            {syncStatus.status === 'in_progress' && (
              <div className="col-span-2">
                <p className="text-gray-600 mb-1">Progress:</p>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-in-out" 
                    style={{ width: `${syncStatus.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-right mt-1">{syncStatus.progress}%</p>
              </div>
            )}
            
            <div>
              <p className="text-gray-600">Total Jobs in Database:</p>
              <p className="font-bold">{syncStatus.totalJobs}</p>
            </div>
            
            <div>
              <p className="text-gray-600">Processed in Last Sync:</p>
              <p className="font-bold">{syncStatus.processedJobs || 0}</p>
            </div>
            
            <div>
              <p className="text-gray-600">Created in Last Sync:</p>
              <p className="font-bold">{syncStatus.createdJobs || 0}</p>
            </div>
            
            <div>
              <p className="text-gray-600">Updated in Last Sync:</p>
              <p className="font-bold">{syncStatus.updatedJobs || 0}</p>
            </div>
            
            <div>
              <p className="text-gray-600">Skipped (No Changes):</p>
              <p className="font-bold">{Math.max(0, (syncStatus.processedJobs || 0) - (syncStatus.createdJobs || 0) - (syncStatus.updatedJobs || 0))}</p>
            </div>
            
            {syncStatus.startedAt && (
              <div>
                <p className="text-gray-600">Started At:</p>
                <p className="font-bold">{formatDate(syncStatus.startedAt)}</p>
              </div>
            )}
            
            {syncStatus.completedAt && (
              <div>
                <p className="text-gray-600">Completed At:</p>
                <p className="font-bold">{formatDate(syncStatus.completedAt)}</p>
              </div>
            )}
          </div>
          
          {syncStatus.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
              <p className="font-bold">Error:</p>
              <p>{syncStatus.error}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No sync information available</p>
        </div>
      )}
    </div>
  );
} 