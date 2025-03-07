'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function FilloutPage() {
  const [isLoading, setIsLoading] = useState(true);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="py-6">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center mb-6 gap-4">
            <Link
              href="/dashboard/jobs"
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 
                       text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 
                       bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                       shadow-sm transition-all duration-200 hover:shadow
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                       dark:focus:ring-offset-gray-900"
              aria-label="Back to Jobs"
            >
              <ArrowLeft className="h-5 w-5 mr-2 text-gray-400 dark:text-gray-500" />
              Back to Jobs
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              New Project Form
            </h1>
          </div>

          {/* Form Container */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {isLoading && (
              <div className="flex justify-center items-center h-[600px]">
                <div className="flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  <p className="text-gray-500 dark:text-gray-400">Loading form...</p>
                </div>
              </div>
            )}
            
            <iframe
              src="https://restoremasters.fillout.com/NewProject"
              style={{ 
                width: '100%', 
                height: '600px', 
                border: 'none',
                display: isLoading ? 'none' : 'block'
              }}
              title="New Project Form"
              allowFullScreen
              onLoad={handleIframeLoad}
            />
          </div>

          {/* Help Text */}
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            Having trouble with the form? Contact support at support@restoremasters.com
          </p>
        </div>
      </main>
    </div>
  );
}