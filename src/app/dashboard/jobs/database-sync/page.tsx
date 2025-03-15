'use client';

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import JobsList from './jobs-list';

export default function DatabaseSyncPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    lastSynced: string | null;
    totalJobs: number;
  }>({
    lastSynced: null,
    totalJobs: 0
  });
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    created: number;
    updated: number;
    total: number;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch sync status on page load
  useEffect(() => {
    fetchSyncStatus();
  }, []);

  // Function to fetch sync status
  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/jobs/sync');
      
      if (!response.ok) {
        throw new Error('Failed to fetch sync status');
      }
      
      const data = await response.json();
      setSyncStatus({
        lastSynced: data.lastSynced,
        totalJobs: data.totalJobs
      });
    } catch (error) {
      console.error('Error fetching sync status:', error);
      setError('Failed to fetch sync status');
    }
  };

  // Function to trigger sync
  const handleSync = async (background: boolean = false) => {
    setIsLoading(true);
    setSyncResult(null);
    setError(null);
    
    try {
      const response = await fetch('/api/jobs/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ background })
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync jobs');
      }
      
      const data = await response.json();
      
      if (background) {
        // If background sync, just show a message
        setSyncResult({
          success: true,
          created: 0,
          updated: 0,
          total: 0,
          error: 'Sync started in background'
        });
      } else {
        // If foreground sync, show the results
        setSyncResult({
          success: data.success,
          created: data.created,
          updated: data.updated,
          total: data.total,
          error: data.error
        });
      }
      
      // Refresh sync status after sync
      fetchSyncStatus();
    } catch (error) {
      console.error('Error syncing jobs:', error);
      setError('Failed to sync jobs');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Monday.com Jobs Database Sync</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sync Status Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sync Status</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current status of your Monday.com jobs sync</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Synced</p>
                <p className="text-lg text-gray-900 dark:text-white">
                  {syncStatus.lastSynced 
                    ? `${formatDistanceToNow(new Date(syncStatus.lastSynced))} ago` 
                    : 'Never synced'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Jobs in Database</p>
                <p className="text-lg text-gray-900 dark:text-white">{syncStatus.totalJobs}</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button 
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
              onClick={fetchSyncStatus}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </button>
          </div>
        </div>
        
        {/* Sync Actions Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sync Actions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sync your Monday.com jobs to the database</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Sync your Monday.com jobs to the local database for faster access and offline capabilities.
                You can choose to sync in the foreground (wait for completion) or background (continue in the background).
              </p>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <button 
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full sm:w-auto"
              onClick={() => handleSync(false)} 
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sync Now (Foreground)
            </button>
            <button 
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 w-full sm:w-auto"
              onClick={() => handleSync(true)} 
              disabled={isLoading}
            >
              Sync in Background
            </button>
          </div>
        </div>
      </div>
      
      {/* Results Section */}
      {syncResult && (
        <div className="mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sync Results</h3>
            </div>
            <div className="p-6">
              {syncResult.success ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Sync Completed Successfully</h3>
                      <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                        {syncResult.error === 'Sync started in background' ? (
                          <p>Sync has been started in the background and will continue running.</p>
                        ) : (
                          <p>
                            Created {syncResult.created} new jobs, updated {syncResult.updated} existing jobs.
                            Total: {syncResult.total} jobs.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Sync Failed</h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                        {syncResult.error || 'An unknown error occurred during sync.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Error Alert */}
      {error && (
        <div className="mt-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Jobs List */}
      <div className="mt-8">
        <JobsList />
      </div>
    </div>
  );
} 