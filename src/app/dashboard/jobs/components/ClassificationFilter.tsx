import { ChevronDown, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { STATUS_CLASSIFICATIONS } from '../constants';
import { Classification } from '../types';
import { Job } from '../types';

interface ClassificationFilterProps {
  value: string;
  onChange: (value: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  jobs?: Job[]; // All jobs for initial counts
  filteredJobs?: Job[]; // Filtered jobs from search
}

export const ClassificationFilter = ({ 
  value, 
  onChange, 
  statusFilter = '', 
  onStatusChange = () => {},
  jobs = [],
  filteredJobs
}: ClassificationFilterProps) => {
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([]);
  const [classificationCounts, setClassificationCounts] = useState<Record<string, number>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [unclassifiedStatuses, setUnclassifiedStatuses] = useState<string[]>([]);
  
  // Use filtered jobs if provided (even if empty array), otherwise use all jobs
  const jobsToCount = filteredJobs !== undefined ? filteredJobs : jobs;
  
  // Flag to check if we're using filtered jobs that returned zero results
  const isEmptyFilteredJobs = filteredJobs !== undefined && filteredJobs.length === 0;

  // Calculate job counts for classifications and statuses
  useEffect(() => {
    // Initialize with zero counts for all classifications
    const classCounts: Record<string, number> = {
      'Prospects': 0,
      'Sold': 0,
      'Estimating': 0,
      'Production': 0,
      'Accounting': 0,
      'Completed': 0,
      'Unclassified': 0
    };
    
    // Initialize with empty status counts
    const statCounts: Record<string, number> = {};
    
    // Track statuses without classification mappings
    const uncategorizedStatuses = new Set<string>();
    
    // If we have jobs to count, process them
    if (jobsToCount.length > 0) {
      // Process all jobs
      jobsToCount.forEach(job => {
        const status = job.details['text95__1'] || '';
        const classification = STATUS_CLASSIFICATIONS[status] || 'Unclassified';
        
        // Increment classification count
        classCounts[classification] = (classCounts[classification] || 0) + 1;
        
        // Increment status count
        statCounts[status] = (statCounts[status] || 0) + 1;
        
        // If status has no classification mapping and is not empty, add to unclassified set
        if (!STATUS_CLASSIFICATIONS[status] && status.trim()) {
          uncategorizedStatuses.add(status);
        }
      });
    }
    
    setClassificationCounts(classCounts);
    setStatusCounts(statCounts);
    
    // For unclassified statuses, we still want to collect them from all jobs
    // even if filtered jobs are empty, so we can show them in the dropdown
    if (isEmptyFilteredJobs) {
      // If filtered jobs are empty, we still want to collect unclassified statuses
      // from all jobs, but keep their counts at zero
      const allUnclassifiedStatuses = new Set<string>();
      jobs.forEach(job => {
        const status = job.details['text95__1'] || '';
        if (!STATUS_CLASSIFICATIONS[status] && status.trim()) {
          allUnclassifiedStatuses.add(status);
        }
      });
      setUnclassifiedStatuses(Array.from(allUnclassifiedStatuses));
    } else {
      setUnclassifiedStatuses(Array.from(uncategorizedStatuses));
    }
  }, [jobsToCount, isEmptyFilteredJobs, jobs]);

  // Get all possible statuses for a classification (from all jobs, not just filtered)
  const getAllStatusesForClassification = (classification: string): string[] => {
    if (classification === 'Unclassified') {
      // For unclassified, we need to find all statuses without a classification mapping
      const allUnclassifiedStatuses = new Set<string>();
      jobs.forEach(job => {
        const status = job.details['text95__1'] || '';
        if (!STATUS_CLASSIFICATIONS[status] && status.trim()) {
          allUnclassifiedStatuses.add(status);
        }
      });
      return Array.from(allUnclassifiedStatuses);
    } else {
      // For other classifications, use the STATUS_CLASSIFICATIONS mapping
      return Object.entries(STATUS_CLASSIFICATIONS)
        .filter(([_, cls]) => cls === classification)
        .map(([status]) => status);
    }
  };

  // Update available statuses when classification changes
  useEffect(() => {
    if (!value || value === '') {
      setAvailableStatuses([]);
      return;
    }

    // Get all possible statuses for this classification
    const allPossibleStatuses = getAllStatusesForClassification(value);
    
    // Filter to only include statuses that have jobs in the filtered results
    let newStatuses = allPossibleStatuses;
    
    // If we're filtering and not empty results, only show statuses that have jobs
    if (filteredJobs && filteredJobs.length > 0) {
      newStatuses = allPossibleStatuses.filter(status => statusCounts[status] > 0);
    } else if (isEmptyFilteredJobs) {
      // If filtered jobs are empty, show all possible statuses but with zero counts
      newStatuses = allPossibleStatuses;
    }

    // Sort statuses by count (descending)
    newStatuses.sort((a, b) => (statusCounts[b] || 0) - (statusCounts[a] || 0));

    setAvailableStatuses(newStatuses);
    
    // Reset status filter if current status is not in the new list of available statuses
    if (statusFilter && !newStatuses.includes(statusFilter)) {
      onStatusChange('');
    }
  }, [value, statusFilter, onStatusChange, statusCounts, filteredJobs, jobs, isEmptyFilteredJobs]);

  // Calculate total job count
  const totalJobCount = jobsToCount.length;

  return (
    <div className="flex flex-col md:flex-row gap-3">
      <div className="relative group w-72">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none block w-full bg-white dark:bg-gray-800 rounded-xl pl-11 pr-10 py-3
                    text-sm text-gray-900 dark:text-gray-100
                    border border-gray-200 dark:border-gray-700 shadow-sm
                    transition-all duration-200
                    hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md
                    focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10 focus:shadow-md
                    focus:outline-none cursor-pointer font-medium"
        >
          <option value="">All Classifications ({totalJobCount})</option>
          <option value="Prospects">Prospects ({classificationCounts['Prospects'] || 0})</option>
          <option value="Sold">Sold ({classificationCounts['Sold'] || 0})</option>
          <option value="Estimating">Estimating ({classificationCounts['Estimating'] || 0})</option>
          <option value="Production">Production ({classificationCounts['Production'] || 0})</option>
          <option value="Accounting">Accounting ({classificationCounts['Accounting'] || 0})</option>
          <option value="Completed">Completed ({classificationCounts['Completed'] || 0})</option>
          <option value="Unclassified">Unclassified ({classificationCounts['Unclassified'] || 0})</option>
        </select>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      {/* Status subcategory filter - only shown when a classification is selected */}
      {value && value !== '' && availableStatuses.length > 0 && (
        <div className="relative group w-72">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="appearance-none block w-full bg-white dark:bg-gray-800 rounded-xl pl-11 pr-10 py-3
                      text-sm text-gray-900 dark:text-gray-100
                      border border-gray-200 dark:border-gray-700 shadow-sm
                      transition-all duration-200
                      hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md
                      focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10 focus:shadow-md
                      focus:outline-none cursor-pointer font-medium"
          >
            <option value="">All {value} Statuses ({classificationCounts[value] || 0})</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status} ({statusCounts[status] || 0})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      )}
    </div>
  );
}; 