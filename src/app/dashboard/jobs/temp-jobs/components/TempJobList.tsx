import { Trash2, Edit, CheckSquare, Square, Search, CheckCircle2 } from 'lucide-react';
import { TempJob } from '../types';

interface TempJobListProps {
  jobs: TempJob[];
  selectedJobs: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onEdit: (job: TempJob) => void;
  onDelete: (id: string) => void;
  formatDate: (date: Date) => string;
  viewMode: 'list' | 'grid';
  searchQuery: string;
}

export function TempJobList({
  jobs,
  selectedJobs,
  onToggleSelect,
  onSelectAll,
  onEdit,
  onDelete,
  formatDate,
  viewMode,
  searchQuery
}: TempJobListProps) {
  if (jobs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
            Potential Customers
          </h2>
          
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchQuery 
              ? <div className="flex flex-col items-center">
                  <Search className="h-12 w-12 mb-3 text-gray-400" />
                  <p>No matches found for "<span className="font-medium">{searchQuery}</span>"</p>
                  <p className="text-sm mt-2">Try a different search term or clear the search.</p>
                </div>
              : <div>
                  <p>No potential customers saved yet.</p>
                  <p className="text-sm mt-2">Create one using the form.</p>
                </div>
            }
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Potential Customers ({jobs.length})
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedJobs.length > 0 && 
              <span>{selectedJobs.length} selected</span>
            }
          </div>
        </div>
        
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left">
                    <div className="flex items-center">
                      <button
                        onClick={onSelectAll}
                        className="focus:outline-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label={selectedJobs.length === jobs.length ? "Deselect all" : "Select all"}
                      >
                        {selectedJobs.length === jobs.length && jobs.length > 0 ? (
                          <CheckSquare className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Job Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {jobs.map(job => (
                  <tr 
                    key={job.id} 
                    className={`transition-colors cursor-pointer
                                ${selectedJobs.includes(job.id) 
                                  ? 'bg-blue-50 dark:bg-blue-900/20' 
                                  : 'bg-white dark:bg-gray-800'}
                                hover:bg-gray-100 dark:hover:bg-gray-700
                                ${job.isSubmitted ? 'opacity-75' : ''}`}
                    onClick={() => onToggleSelect(job.id)}
                  >
                    <td className="px-3 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleSelect(job.id)}
                        className="focus:outline-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label={selectedJobs.includes(job.id) ? "Deselect" : "Select"}
                      >
                        {selectedJobs.includes(job.id) ? (
                          <CheckSquare className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{job.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{job.customerFullName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {job.customerEmail || job.customerPhone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">{formatDate(job.createdAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {job.isSubmitted ? (
                        <span className="flex items-center text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Submitted
                        </span>
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">Pending</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300" onClick={(e) => e.stopPropagation()}>
                      <div className="flex space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(job);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          aria-label="Edit job"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(job.id);
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                          aria-label="Delete job"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {jobs.map(job => (
              <div 
                key={job.id} 
                className={`relative border border-gray-200 dark:border-gray-700 rounded-lg p-4 
                           transition-all duration-200 cursor-pointer
                           ${selectedJobs.includes(job.id) 
                             ? 'bg-blue-50 dark:bg-blue-900/20' 
                             : 'bg-white dark:bg-gray-800'}
                           hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md
                           ${job.isSubmitted ? 'opacity-75' : ''}`}
                onClick={() => onToggleSelect(job.id)}
              >
                <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleSelect(job.id)}
                    className="focus:outline-none text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label={selectedJobs.includes(job.id) ? "Deselect" : "Select"}
                  >
                    {selectedJobs.includes(job.id) ? (
                      <CheckSquare className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                </div>
                
                <div className="ml-8">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-900 dark:text-white">{job.name}</h3>
                    {job.isSubmitted && (
                      <span className="inline-flex items-center text-xs font-medium px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Submitted
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {job.customerFullName}
                  </p>
                  
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {job.customerEmail && (
                      <p className="truncate">{job.customerEmail}</p>
                    )}
                    {job.customerPhone && (
                      <p>{job.customerPhone}</p>
                    )}
                    <p className="mt-1">Added {formatDate(job.createdAt)}</p>
                  </div>
                  
                  <div className="mt-3 flex space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(job);
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded
                                text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30
                                hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      aria-label="Edit job"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(job.id);
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded
                                text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30
                                hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      aria-label="Delete job"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 