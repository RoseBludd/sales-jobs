import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { Job } from '../types';
import { STATUS_CLASSIFICATIONS } from '../constants';
import { COLUMN_MAP } from '@/lib/monday';

interface JobCardProps {
  job: Job;
  isExpanded: boolean;
  onToggle: () => void;
}

export const JobCard = ({ job, isExpanded, onToggle }: JobCardProps) => {
  const status = job.details['text95__1'] || '';
  const classification = STATUS_CLASSIFICATIONS[status] || 'Unclassified';
  const amount = Number(job.details['jp_total__1'] || 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden transition-all duration-200 hover:shadow-md">
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.name}</h3>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                {classification}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                {status || 'No Stage'}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              {job.details['job_address___text__1'] && (
                <span className="ml-2">• {job.details['job_address___text__1']}</span>
              )}
            </div>
          </div>
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isExpanded && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-t dark:border-gray-700">
          <div className="space-y-3">
            {Object.entries(job.details)
              .filter(([key]) => COLUMN_MAP && typeof COLUMN_MAP === 'object' && key in COLUMN_MAP)
              .map(([key, value]) => (
                <div key={key} className="grid grid-cols-3 gap-2">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {COLUMN_MAP[key as keyof typeof COLUMN_MAP] || key}
                  </div>
                  <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100 break-words">
                    {value || '-'}
                  </div>
                </div>
              ))}
          </div>
          
          <div className="mt-4 pt-4 border-t dark:border-gray-700">
            <Link
              href={`/dashboard/jobs/fillout/${job.id}`}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent 
                        text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Details
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}; 