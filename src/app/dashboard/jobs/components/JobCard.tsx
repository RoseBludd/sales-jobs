import { ChevronDown, Pencil, FileText } from 'lucide-react';
import { Job } from '../types';
import { STATUS_CLASSIFICATIONS } from '../constants';
import { COLUMN_MAP } from '@/lib/monday';
import { useState, useEffect, useRef } from 'react';
import { AddNoteModal } from './AddNoteModal';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface JobCardProps {
  job: Job;
  isExpanded: boolean;
  onToggle: () => void;
  isGridView?: boolean;
}

export const JobCard = ({ job, isExpanded, onToggle, isGridView = true }: JobCardProps) => {
  const router = useRouter();
  const status = job.details['text95__1'] || '';
  const classification = STATUS_CLASSIFICATIONS[status] || 'Unclassified';
  const amount = Number(job.details['jp_total__1'] || 0);
  const customerFirstName = job.details['text0__1'] || '';
  const customerLastName = job.details['text1__1'] || '';
  
  // Add refs and state for smooth height transition
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  
  // Use the notes_count field from the job data
  const hasNotes = job.notes_count > 0;
  
  // Measure content height when expanded changes
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded]);

  // Ensure content height is recalculated if content changes
  useEffect(() => {
    if (isExpanded && contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [job, isExpanded]);

  // Format address with proper error handling for empty values
  const formatAddress = (address: string | undefined) => {
    if (!address) return null;
    return address.trim() ? <span className="ml-2">• {address}</span> : null;
  };

  // Helper function to format and display values with proper error handling
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'string' && !value.trim()) return '-';
    if (typeof value === 'number' && isNaN(value)) return '-';
    
    // Handle specific types of data
    if (typeof value === 'string') {
      return value;
    } else if (typeof value === 'number') {
      return value.toString();
    } else if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    } else {
      return String(value);
    }
  };

  // Format customer name with job name
  const formatTitle = () => {
    const hasCustomerName = customerFirstName.trim() || customerLastName.trim();
    const customerName = hasCustomerName 
      ? [customerFirstName, customerLastName].filter(Boolean).join(' ')
      : 'No Customer';
    const address = job.details['job_address___text__1']?.trim() || 'No Address';
    const jobName = job.details['text65__1']?.trim() || job.name?.trim() || 'Unnamed Job';

    // For grid view, return simple format
    if (isGridView) {
      return (
        <>
          <span className="font-semibold">{customerName}</span>
          <span className="mx-2">-</span>
          <span>{address}</span>
          <span className="mx-2">-</span>
          <span>{jobName}</span>
        </>
      );
    }

    // For list view, return inline format with badges
    return (
      <div className="flex flex-col md:flex-row md:items-center flex-wrap gap-1">
        <div className="flex items-center flex-wrap gap-1">
          <span className="font-semibold">{customerName}</span>
          <span className="hidden md:inline mx-1">-</span>
          <span>{address}</span>
          <span className="hidden md:inline mx-1">-</span>
          <span>{jobName}</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1 md:mt-0 md:ml-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
            {classification}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
            {status || 'No Stage'}
          </span>
          {hasNotes && (
            <span 
              onClick={(e) => {
                e.stopPropagation();
                handleViewNotes();
              }}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 cursor-pointer"
            >
              <FileText className="h-3 w-3 mr-1" />
              {job.notes_count > 1 ? `${job.notes_count} Notes` : '1 Note'}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Handle navigation to notes view
  const handleViewNotes = async () => {
    try {
      // First, get the actual job UUID from the database using the monday_id
      const jobResponse = await fetch(`/api/jobs/find?monday_id=${job.id}`);
      
      if (!jobResponse.ok) {
        console.error('Error finding job:', jobResponse.status);
        throw new Error('Failed to find job');
      }
      
      const jobData = await jobResponse.json();
      console.log('Found job for notes:', jobData);
      
      if (!jobData || !jobData.id) {
        throw new Error('Job not found');
      }
      
      // Navigate to the main notes page with the job filter pre-selected using the database UUID
      router.push(`/dashboard/jobs/notes?job=${jobData.id}`);
    } catch (error) {
      console.error('Error navigating to notes:', error);
      toast.error('Failed to view notes. Please try again.');
      
      // Fallback to using the monday_id directly if there's an error
      router.push(`/dashboard/jobs/notes?job=${job.id}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col h-full">
      <button
        onClick={onToggle}
        className={`w-full text-left ${isGridView ? 'px-6 py-4' : 'px-4 py-3'} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
      >
        <div className="flex items-start justify-between">
          <div className={`${isGridView ? 'space-y-2' : 'space-y-1'} w-full`}>
            <h3 className={`${isGridView ? 'text-lg' : 'text-base'} font-semibold text-gray-900 dark:text-white`}>
              {formatTitle()}
            </h3>
            {/* Only show badges separately in grid view */}
            {isGridView && (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  {classification}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
                  {status || 'No Stage'}
                </span>
                {hasNotes && (
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewNotes();
                    }}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 cursor-pointer"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {job.notes_count > 1 ? `${job.notes_count} Notes` : '1 Note'}
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 dark:text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Collapsible content with smooth height transition */}
      <div 
        className="overflow-hidden transition-all duration-300 ease-in-out border-t border-transparent"
        style={{ 
          height: contentHeight ? `${contentHeight}px` : '0px',
          borderColor: isExpanded ? 'rgb(209 213 219)' : 'transparent',
          opacity: isExpanded ? 1 : 0
        }}
      >
        <div ref={contentRef} className={`${isGridView ? 'px-6 py-4' : 'px-4 py-3'} bg-gray-50 dark:bg-gray-700 dark:border-gray-600`}>
          <div className="space-y-3">
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowAddNoteModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Add Note
              </button>
              {hasNotes && (
                <button
                  onClick={handleViewNotes}
                  className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  View Notes
                </button>
              )}
            </div>
            
            {/* Display original item name if different from job name or if text65__1 is not available */}
            {(job.name && (!job.details['text65__1'] || job.details['text65__1']?.trim() !== job.name?.trim())) && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-300">
                  Item Name
                </div>
                <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100 break-words">
                  {job.name || '-'}
                </div>
              </div>
            )}
            
            {Object.entries(job.details)
              .filter(([key]) => COLUMN_MAP && typeof COLUMN_MAP === 'object' && key in COLUMN_MAP)
              .map(([key, value]) => {
                // Special handling for address-related fields
                const isAddressField = key.toLowerCase().includes('address') || 
                                      key.toLowerCase().includes('city') || 
                                      key.toLowerCase().includes('state') || 
                                      key.toLowerCase().includes('zip') || 
                                      key.toLowerCase().includes('country');
                
                return (
                  <div key={key} className="grid grid-cols-3 gap-2">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-300">
                      {COLUMN_MAP[key as keyof typeof COLUMN_MAP] || key}
                    </div>
                    <div className={`col-span-2 text-sm text-gray-900 dark:text-gray-100 break-words ${
                      isAddressField && (!value || value.trim() === '') ? 'italic text-gray-500 dark:text-gray-400' : ''
                    }`}>
                      {formatValue(value)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
      
      {/* Add Note Modal */}
      {showAddNoteModal && (
        <AddNoteModal
          jobId={job.id}
          onClose={() => setShowAddNoteModal(false)}
          onNoteAdded={() => {
            // Refresh the job data to update the notes count
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}; 