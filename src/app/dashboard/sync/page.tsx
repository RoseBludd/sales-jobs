import { Metadata } from 'next';
import MondaySyncStatus from '@/components/MondaySyncStatus';

export const metadata: Metadata = {
  title: 'Monday.com Sync | Dashboard',
  description: 'Sync your Monday.com data with the database',
};

export default function SyncPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Monday.com Data Sync</h1>
      <p className="text-gray-600 mb-8 text-center max-w-2xl mx-auto">
        Sync your Monday.com jobs data with the database. Choose between incremental sync (only new or updated jobs) 
        or full refresh (all jobs). For large datasets, use the background sync option.
      </p>
      
      <MondaySyncStatus />
      
      <div className="mt-12 bg-gray-50 p-6 rounded-lg max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Sync Options Explained</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-blue-600">Incremental Sync</h3>
            <p>Only fetches jobs that have been updated since the last sync. This is the most efficient option for regular updates.</p>
          </div>
          
          <div>
            <h3 className="font-bold text-purple-600">Full Refresh</h3>
            <p>Fetches all jobs regardless of when they were last updated. Use this if you suspect data inconsistencies or for initial setup.</p>
          </div>
          
          <div>
            <h3 className="font-bold text-gray-600">Quick Sync</h3>
            <p>Performs a sync without background processing. Only suitable for small datasets (less than 100 jobs).</p>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> For large datasets (1000+ jobs), the background sync process will process jobs in chunks to prevent timeouts.
            You can continue using the application while the sync runs in the background.
          </p>
        </div>
      </div>
    </div>
  );
} 