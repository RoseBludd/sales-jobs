'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, UploadCloud, Loader2, Check } from 'lucide-react';
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
      toast.success('Job saved successfully!');
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
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error('Failed to save job');
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
      toast.success('Job updated successfully!');
      setEditingJob(null);
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this temporary job?')) {
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
        }
        toast.success('Job deleted successfully');
      } catch (error) {
        console.error('Error deleting job:', error);
        toast.error('Failed to delete job');
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
      toast.error('Please select at least one job to submit');
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

      toast.success('Jobs submitted successfully!');
      
      // If keeping jobs, update them as submitted in the local state
      setTempJobs(prevJobs => 
        prevJobs.map(job => 
          selectedJobs.includes(job.id) 
            ? { ...job, isSubmitted: true } 
            : job
        )
      );
      
      // Optionally remove submitted jobs from temp jobs
      if (window.confirm('Would you like to remove the submitted jobs from your list?')) {
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
          toast.success('Submitted jobs removed from list');
        }
      } else {
        // Clear selection
        setSelectedJobs([]);
      }
    } catch (error) {
      console.error('Error submitting jobs:', error);
      toast.error('Failed to submit jobs. Please try again.');
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
      <main className="p-6">
        <div className="w-full">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
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
                Potential Customers
              </h1>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md
                           shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500
                           dark:bg-gray-700 dark:text-white text-sm"
                />
                <span className="absolute right-3 top-2.5 text-gray-400">
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      ✕
                    </button>
                  )}
                </span>
              </div>

              <div className="flex items-center">
                <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={showSubmitted}
                    onChange={(e) => setShowSubmitted(e.target.checked)}
                    className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Show Submitted Jobs
                </label>
              </div>
              
              <div className="flex">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm font-medium rounded-l-md
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                            ${viewMode === 'list' 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'
                            }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-sm font-medium rounded-r-md
                            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                            ${viewMode === 'grid' 
                              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-y border-r border-gray-300 dark:border-gray-600'
                            }`}
                >
                  Grid
                </button>
              </div>
              
              <button
                onClick={handleSubmitToMakeWebhook}
                disabled={selectedJobs.length === 0 || isSubmitting}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md
                           focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
                           transition-colors duration-200
                           ${selectedJobs.length > 0 && !isSubmitting
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                           }`}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4 mr-2" />
                )}
                {isSubmitting ? 'Submitting...' : 'Submit Selected'}
                {selectedJobs.length > 0 && !isSubmitting && ` (${selectedJobs.length})`}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content area - 2/3 width on large screens */}
            <div className="lg:col-span-2 space-y-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                  <span className="ml-2 text-gray-600 dark:text-gray-300">Loading jobs...</span>
                </div>
              ) : (
                <TempJobList
                  jobs={filteredJobs}
                  selectedJobs={selectedJobs}
                  onToggleSelect={handleToggleSelect}
                  onSelectAll={handleSelectAll}
                  onEdit={setEditingJob}
                  onDelete={handleDeleteJob}
                  formatDate={formatDate}
                  viewMode={viewMode}
                  searchQuery={searchQuery}
                />
              )}
            </div>
            
            {/* Form area - 1/3 width on large screens */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
                <TempJobForm
                  editingJob={editingJob}
                  newJob={newJob}
                  onInputChange={handleInputChange}
                  onBooleanChange={handleBooleanChange}
                  onSave={editingJob ? handleUpdateJob : handleSaveNewJob}
                  onCancel={() => setEditingJob(null)}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 