'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UploadCloud, Loader2, Check, Plus, Search, X, Filter } from 'lucide-react';
import { TempJob } from './types';
import { TempJobForm } from './components/TempJobForm';
import { TempJobList } from './components/TempJobList';
import { toast, Toaster } from 'react-hot-toast';

export default function TempJobsPage() {
  const router = useRouter();
  const [tempJobs, setTempJobs] = useState<TempJob[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newJob, setNewJob] = useState<Omit<TempJob, 'id' | 'createdAt'>>({
    name: '',
    customerId: '',
    salesRepId: '',
    mainRepEmail: '',
    isNewCustomer: false,
    customerFullName: '',
    customerFirstName: '',
    customerLastName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    referredBy: '',
    customerNotes: '',
    isCustomerAddressMatchingJob: false,
    projectAddress: '',
    roofType: '',
    isSplitJob: false,
    splitPercentage: 0,
    projectNotes: '',
    businessName: '',
    companyName: '',
    isSubmitted: false
  });
  const [editingJob, setEditingJob] = useState<TempJob | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showSubmitted, setShowSubmitted] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Load temp jobs from API on component mount
  useEffect(() => {
    const fetchTempJobs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/temp-jobs');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        // Convert ISO date strings to Date objects
        const jobsWithDates = data.map((job: any) => ({
          ...job,
          createdAt: new Date(job.createdAt),
          updatedAt: job.updatedAt ? new Date(job.updatedAt) : undefined
        }));
        
        setTempJobs(jobsWithDates);
      } catch (error) {
        console.error('Failed to fetch temp jobs:', error);
        toast.error('Failed to load temporary jobs');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTempJobs();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (editingJob) {
      // Update the field directly
      const updatedJob = { ...editingJob, [name]: value };
      
      // Special handling for customer name fields
      if (name === 'customerFirstName' || name === 'customerLastName') {
        // Update the full name whenever first or last name changes
        const firstName = name === 'customerFirstName' ? value : updatedJob.customerFirstName;
        const lastName = name === 'customerLastName' ? value : updatedJob.customerLastName;
        updatedJob.customerFullName = `${firstName} ${lastName}`.trim();
      }
      
      setEditingJob(updatedJob);
    } else {
      // Update the field directly
      const updatedJob = { ...newJob, [name]: value };
      
      // Special handling for customer name fields
      if (name === 'customerFirstName' || name === 'customerLastName') {
        // Update the full name whenever first or last name changes
        const firstName = name === 'customerFirstName' ? value : updatedJob.customerFirstName;
        const lastName = name === 'customerLastName' ? value : updatedJob.customerLastName;
        updatedJob.customerFullName = `${firstName} ${lastName}`.trim();
      }
      
      setNewJob(updatedJob);
    }
  };

  const handleBooleanChange = (name: string, value: boolean) => {
    if (editingJob) {
      setEditingJob({ ...editingJob, [name]: value });
    } else {
      setNewJob({ ...newJob, [name]: value });
    }
  };

  const handleOpenAddForm = () => {
    setEditingJob(null);
    setIsFormOpen(true);
  };
  
  const handleEditJob = (job: TempJob) => {
    setEditingJob(job);
    setIsFormOpen(true);
  };
  
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingJob(null);
    // Reset new job form
    setNewJob({
      name: '',
      customerId: '',
      salesRepId: '',
      mainRepEmail: '',
      isNewCustomer: false,
      customerFullName: '',
      customerFirstName: '',
      customerLastName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      referredBy: '',
      customerNotes: '',
      isCustomerAddressMatchingJob: false,
      projectAddress: '',
      roofType: '',
      isSplitJob: false,
      splitPercentage: 0,
      projectNotes: '',
      businessName: '',
      companyName: '',
      isSubmitted: false
    });
  };

  const handleSaveNewJob = async () => {
    if (!newJob.name.trim()) {
      toast.error('Job Name is required');
      return;
    }

    if (!newJob.customerFullName.trim()) {
      toast.error('Customer Full Name is required');
      return;
    }

    if (!newJob.customerFirstName.trim()) {
      toast.error('Customer First Name is required');
      return;
    }

    if (!newJob.customerLastName.trim()) {
      toast.error('Customer Last Name is required');
      return;
    }

    try {
      const response = await fetch('/api/temp-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newJob),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const savedJob = await response.json();
      
      // Convert ISO date strings to Date objects
      savedJob.createdAt = new Date(savedJob.createdAt);
      if (savedJob.updatedAt) {
        savedJob.updatedAt = new Date(savedJob.updatedAt);
      }
      
      setTempJobs([savedJob, ...tempJobs]);
      toast.success('Potential customer added successfully!');
      handleCloseForm();
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('Failed to save potential customer');
    }
  };

  const handleUpdateJob = async () => {
    if (!editingJob) return;
    
    if (!editingJob.name.trim()) {
      toast.error('Job Name is required');
      return;
    }

    if (!editingJob.customerFullName.trim()) {
      toast.error('Customer Full Name is required');
      return;
    }

    if (!editingJob.customerFirstName.trim()) {
      toast.error('Customer First Name is required');
      return;
    }

    if (!editingJob.customerLastName.trim()) {
      toast.error('Customer Last Name is required');
      return;
    }

    try {
      const response = await fetch(`/api/temp-jobs/${editingJob.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingJob),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      const updatedJob = await response.json();
      
      // Convert ISO date strings to Date objects
      updatedJob.createdAt = new Date(updatedJob.createdAt);
      if (updatedJob.updatedAt) {
        updatedJob.updatedAt = new Date(updatedJob.updatedAt);
      }
      
      setTempJobs(tempJobs.map(job => job.id === updatedJob.id ? updatedJob : job));
      toast.success('Potential customer updated successfully!');
      handleCloseForm();
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to update potential customer');
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this potential customer?')) {
      try {
        const response = await fetch(`/api/temp-jobs/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error: ${response.status}`);
        }

        setTempJobs(tempJobs.filter(job => job.id !== id));
        setSelectedJobs(selectedJobs.filter(jobId => jobId !== id));
        if (editingJob?.id === id) {
          setEditingJob(null);
          setIsFormOpen(false);
        }
        toast.success('Potential customer deleted successfully');
      } catch (error) {
        console.error('Error deleting job:', error);
        toast.error('Failed to delete potential customer');
      }
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedJobs(prev => 
      prev.includes(id) 
        ? prev.filter(jobId => jobId !== id) 
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedJobs.length === filteredJobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(filteredJobs.map(job => job.id));
    }
  };

  const handleSubmitToMakeWebhook = async () => {
    if (selectedJobs.length === 0) {
      toast.error('Please select at least one potential customer to submit');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/temp-jobs/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobIds: selectedJobs 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      toast.success('Potential customers submitted successfully!');
      
      // If keeping jobs, update them as submitted in the local state
      setTempJobs(prevJobs => 
        prevJobs.map(job => 
          selectedJobs.includes(job.id) 
            ? { ...job, isSubmitted: true } 
            : job
        )
      );
      
      // Optionally remove submitted jobs from temp jobs
      if (window.confirm('Would you like to remove the submitted potential customers from your list?')) {
        // Delete jobs from database
        const deleteResponse = await fetch('/api/temp-jobs/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            jobIds: selectedJobs,
            shouldDelete: true
          }),
        });

        if (deleteResponse.ok) {
          // Update local state
          setTempJobs(tempJobs.filter(job => !selectedJobs.includes(job.id)));
          setSelectedJobs([]);
          toast.success('Submitted potential customers removed from list');
        }
      } else {
        // Clear selection
        setSelectedJobs([]);
      }
    } catch (error) {
      console.error('Error submitting jobs:', error);
      toast.error('Failed to submit potential customers. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  // Filter jobs based on search query and submission status
  const filteredJobs = tempJobs
    .filter(job => showSubmitted || !job.isSubmitted)
    .filter(job => 
      job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerFullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerPhone?.includes(searchQuery)
    );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: 'white',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white',
            },
          },
        }}
      />

      {/* Modal for adding/editing jobs */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 text-center sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-opacity-90"
              onClick={handleCloseForm}
              aria-hidden="true"
            ></div>

            <div className="relative inline-block w-full max-w-3xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white dark:bg-gray-800 rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="text-gray-400 bg-white dark:bg-gray-800 rounded-md hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                  onClick={handleCloseForm}
                >
                  <span className="sr-only">Close</span>
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mt-4 sm:mt-0">
                <TempJobForm
                  editingJob={editingJob}
                  newJob={newJob}
                  onInputChange={handleInputChange}
                  onBooleanChange={handleBooleanChange}
                  onSave={editingJob ? handleUpdateJob : handleSaveNewJob}
                  onCancel={handleCloseForm}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="p-4 sm:p-6">
        <div className="w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3">
            <div className="flex flex-wrap items-center gap-3">
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Potential Leads
              </h1>
            </div>
            
            <button
              onClick={handleOpenAddForm}
              className="inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-md
                        text-white bg-blue-600 hover:bg-blue-700
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                        dark:focus:ring-offset-gray-900 transition-colors duration-200"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Potential Lead
            </button>
          </div>

          {/* Filters and controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500
                           dark:bg-gray-700 dark:text-white text-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="flex items-center">
                  <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={showSubmitted}
                      onChange={(e) => setShowSubmitted(e.target.checked)}
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Show Submitted
                  </label>
                </div>
                
                <div className="flex h-9">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-l-md
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                            border ${viewMode === 'list' 
                              ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white' 
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                            }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-r-md
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                            border ${viewMode === 'grid' 
                              ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white' 
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-y border-r border-gray-300 dark:border-gray-600'
                            }`}
                  >
                    Grid
                  </button>
                </div>
                
                <button
                  onClick={handleSubmitToMakeWebhook}
                  disabled={selectedJobs.length === 0 || isSubmitting}
                  className={`inline-flex items-center px-3 sm:px-4 py-2 text-sm font-medium rounded-md
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                           transition-colors duration-200 whitespace-nowrap ml-auto
                           ${selectedJobs.length > 0 && !isSubmitting
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                           }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4 mr-1 sm:mr-2" />
                  )}
                  {isSubmitting ? 'Submitting...' : 'Submit Selected'}
                  {selectedJobs.length > 0 && !isSubmitting && ` (${selectedJobs.length})`}
                </button>
              </div>
            </div>
          </div>

          {/* Main content area - full width */}
          <div className="space-y-4 sm:space-y-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600 dark:text-gray-300">Loading potential leads...</span>
              </div>
            ) : (
              <>
                {filteredJobs.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-8">
                    <div className="text-center py-8 sm:py-12">
                      {searchQuery ? (
                        <div className="flex flex-col items-center">
                          <Search className="h-12 sm:h-16 w-12 sm:w-16 mb-3 sm:mb-4 text-gray-400" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No results found</h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            No matches found for "<span className="font-medium">{searchQuery}</span>"
                          </p>
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="mt-4 px-4 py-2 text-sm font-medium rounded-md bg-gray-100 dark:bg-gray-700 
                                    text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                    transition-colors duration-200"
                          >
                            Clear search
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 mb-4">
                            <Plus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No potential customers yet</h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-6">
                            Get started by adding your first potential lead
                          </p>
                          <button
                            onClick={handleOpenAddForm}
                            className="px-4 py-2 text-sm font-medium rounded-md
                                    text-white bg-blue-600 hover:bg-blue-700
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                    transition-colors duration-200"
                          >
                            <Plus className="h-5 w-5 inline mr-1" />
                            Add Potential Lead
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <TempJobList
                    jobs={filteredJobs}
                    selectedJobs={selectedJobs}
                    onToggleSelect={handleToggleSelect}
                    onSelectAll={handleSelectAll}
                    onEdit={handleEditJob}
                    onDelete={handleDeleteJob}
                    formatDate={formatDate}
                    viewMode={viewMode}
                    searchQuery={searchQuery}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 