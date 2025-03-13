import { ChevronDown } from 'lucide-react';
import { Job } from '../types';
import { STATUS_CLASSIFICATIONS } from '../constants';
import { COLUMN_MAP } from '@/lib/monday';
import { useState, useEffect, useRef } from 'react';

interface JobCardProps {
  job: Job;
  isExpanded: boolean;
  onToggle: () => void;
}

export const JobCard = ({ job, isExpanded, onToggle }: JobCardProps) => {
  const status = job.details['text95__1'] || '';
  const classification = STATUS_CLASSIFICATIONS[status] || 'Unclassified';
  const amount = Number(job.details['jp_total__1'] || 0);
  const customerFirstName = job.details['text0__1'] || '';
  const customerLastName = job.details['text1__1'] || '';
  
  // Add refs and state for smooth height transition
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  
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
    
    if (hasCustomerName) {
      const customerName = [customerFirstName, customerLastName].filter(Boolean).join(' ');
      return (
        <>
          <span className="font-semibold">{customerName}</span>
          {job.name && job.name !== customerName && (
            <span className="ml-2">- {job.name}</span>
          )}
        </>
      );
    }
    
    return job.name || 'Unnamed Job';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col h-full">
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatTitle()}
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                {classification}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100">
                {status || 'No Stage'}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-300">
              ${isNaN(amount) ? '0.00' : amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              {formatAddress(job.details['job_address___text__1'])}
            </div>
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
        <div ref={contentRef} className="px-6 py-4 bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
          <div className="space-y-3">
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
    </div>
  );
}; 