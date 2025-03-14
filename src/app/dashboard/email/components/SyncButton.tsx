'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SyncButtonProps {
  onClick: () => void;
  isSyncing: boolean;
}

const SyncButton: React.FC<SyncButtonProps> = ({ onClick, isSyncing }) => {
  return (
    <button
      onClick={onClick}
      disabled={isSyncing}
      className={`p-2 rounded-full ${
        isSyncing
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
      }`}
      title="Sync emails"
    >
      <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
    </button>
  );
};

export default SyncButton; 