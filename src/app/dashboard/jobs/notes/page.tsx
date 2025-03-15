'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Calendar, User, ChevronLeft, Loader2, Trash2, Edit, Clock, Check, ChevronsUpDown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Define a simple theme hook since next-themes might not be available
const useTheme = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  useEffect(() => {
    // Check if user prefers dark mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
    
    // Listen for changes in color scheme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return { theme, setTheme };
};

// Add global styles for animations
const globalStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out forwards;
}

.animate-slideIn {
  animation: slideIn 0.3s ease-out forwards;
}

.animate-pulse {
  animation: pulse 1.5s infinite;
}
`;

// Types
interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  monday_id: string;
  job: {
    id: string;
    name: string;
    monday_id: string;
    details?: Record<string, any>;
  };
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

interface Job {
  id: string;
  name: string;
  monday_id: string;
  details?: Record<string, any>;
}

// Custom Combobox component
const Combobox = ({ 
  options, 
  value, 
  onChange, 
  placeholder 
}: { 
  options: Job[], 
  value: string, 
  onChange: (value: string) => void, 
  placeholder: string 
}) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format job name like in JobCard.tsx
  const formatJobName = (job: Job) => {
    if (!job.details) return job.name;
    
    const customerFirstName = job.details['text0__1'] || '';
    const customerLastName = job.details['text1__1'] || '';
    const hasCustomerName = customerFirstName.trim() || customerLastName.trim();
    const customerName = hasCustomerName 
      ? [customerFirstName, customerLastName].filter(Boolean).join(' ')
      : 'No Customer';
    
    const address = job.details['job_address___text__1']?.trim() || 'No Address';
    const jobName = job.details['text65__1']?.trim() || job.name?.trim() || 'Unnamed Job';

    return `${customerName} - ${address} - ${jobName}`;
  };

  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Format job name for searching
    const formattedName = formatJobName(option).toLowerCase();
    if (formattedName.includes(searchLower)) {
      return true;
    }
    
    // Search in details if available
    if (option.details) {
      // Convert details to string for searching
      const detailsString = JSON.stringify(option.details).toLowerCase();
      if (detailsString.includes(searchLower)) {
        return true;
      }
      
      // Search in specific fields if they exist
      const details = option.details as Record<string, any>;
      for (const key in details) {
        const value = details[key];
        if (typeof value === 'string' && value.toLowerCase().includes(searchLower)) {
          return true;
        }
        if (typeof value === 'object' && value !== null) {
          const nestedString = JSON.stringify(value).toLowerCase();
          if (nestedString.includes(searchLower)) {
            return true;
          }
        }
      }
    }
    
    return false;
  });

  const selectedOption = options.find(option => option.id === value);

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white cursor-pointer transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-400"
        onClick={() => setOpen(!open)}
      >
        <span className={`${!selectedOption && 'text-gray-500 dark:text-gray-400'} truncate`}>
          {selectedOption ? formatJobName(selectedOption) : placeholder}
        </span>
        <ChevronsUpDown className="h-4 w-4 text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-300 dark:border-gray-600 max-h-60 overflow-auto">
          <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                className="w-full pl-8 pr-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          
          <ul className="py-1">
            <li
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                value === '' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-200'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setOpen(false);
                setSearchTerm('');
              }}
            >
              <span>All Jobs</span>
              {value === '' && <Check className="h-4 w-4" />}
            </li>
            {filteredOptions.map(option => (
              <li
                key={option.id}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                  value === option.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-200'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(option.id);
                  setOpen(false);
                  setSearchTerm('');
                }}
              >
                <span className="truncate pr-2">{formatJobName(option)}</span>
                {value === option.id && <Check className="h-4 w-4 flex-shrink-0" />}
              </li>
            ))}
            {filteredOptions.length === 0 && (
              <li className="px-3 py-2 text-gray-500 dark:text-gray-400">
                No jobs found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

const NotesPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  
  // State
  const [notes, setNotes] = useState<Note[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState<string>('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Check for job parameter in URL
  useEffect(() => {
    // Get the job ID from the URL if it exists
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job');
    
    if (jobId) {
      // Set the selected job if it's in the URL
      setSelectedJob(jobId);
      
      // Update the URL without the parameter to avoid issues on refresh
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  // Check if mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Format job name like in JobCard.tsx
  const formatJobName = (job: Job | Note['job']) => {
    if (!job.details) return job.name;
    
    const customerFirstName = job.details['text0__1'] || '';
    const customerLastName = job.details['text1__1'] || '';
    const hasCustomerName = customerFirstName.trim() || customerLastName.trim();
    const customerName = hasCustomerName 
      ? [customerFirstName, customerLastName].filter(Boolean).join(' ')
      : 'No Customer';
    
    const address = job.details['job_address___text__1']?.trim() || 'No Address';
    const jobName = job.details['text65__1']?.trim() || job.name?.trim() || 'Unnamed Job';

    return `${customerName} - ${address} - ${jobName}`;
  };

  // Fetch notes and jobs
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch notes
        const notesRes = await fetch('/api/notes');
        const notesData = await notesRes.json();
        
        // Fetch jobs
        const jobsRes = await fetch('/api/jobs');
        const jobsData = await jobsRes.json();
        
        // Ensure jobs have details field
        const jobsWithDetails = jobsData.map((job: Job) => ({
          ...job,
          details: job.details || {}
        }));
        
        // Ensure notes have job details
        const notesWithJobDetails = notesData.map((note: Note) => {
          // Find the corresponding job
          const job = jobsWithDetails.find((j: Job) => j.id === note.job.id);
          if (job) {
            return {
              ...note,
              job: {
                ...note.job,
                details: job.details
              }
            };
          }
          return note;
        });
        
        setNotes(notesWithJobDetails);
        setJobs(jobsWithDetails);
        
        if (notesWithJobDetails.length > 0) {
          setSelectedNote(notesWithJobDetails[0]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load notes. Please try again.');
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };
    
    fetchData();
  }, [session, status, router]);

  // Filter notes based on search term and selected job
  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchTerm ? 
      note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formatJobName(note.job).toLowerCase().includes(searchTerm.toLowerCase()) : 
      true;
    const matchesJob = selectedJob ? note.job.id === selectedJob : true;
    
    return matchesSearch && matchesJob;
  });

  // Add new note
  const handleAddNote = async () => {
    if (!newNote || !selectedJob) {
      toast.error('Please enter note content and select a job.');
      return;
    }
    
    setIsAddingNote(true);
    
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newNote,
          job_id: selectedJob,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to add note');
      
      const newNoteData = await response.json();
      
      // Update notes list
      const updatedNotes = [newNoteData, ...notes];
      setNotes(updatedNotes);
      
      // Select the new note
      setSelectedNote(newNoteData);
      
      // Reset form
      setNewNote('');
      setShowAddNoteModal(false);
      
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note. Please try again.');
    } finally {
      setIsAddingNote(false);
    }
  };

  // Edit note
  const handleEditNote = async () => {
    if (!selectedNote || !selectedNote.content) {
      toast.error('Please enter note content.');
      return;
    }
    
    try {
      const response = await fetch(`/api/notes/${selectedNote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: selectedNote.content,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to update note');
      
      const updatedNote = await response.json();
      
      // Update notes list
      setNotes(prev => prev.map(note => 
        note.id === updatedNote.id ? updatedNote : note
      ));
      
      // Reset form
      setShowEditNoteModal(false);
      
      toast.success('Note updated successfully');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note. Please try again.');
    }
  };

  // Delete note
  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/notes/${selectedNote.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete note');
      
      // Update notes list
      const updatedNotes = notes.filter(note => note.id !== selectedNote.id);
      setNotes(updatedNotes);
      
      // Select the next note if available
      if (updatedNotes.length > 0) {
        const currentIndex = notes.findIndex(note => note.id === selectedNote.id);
        const nextIndex = currentIndex === notes.length - 1 ? currentIndex - 1 : currentIndex;
        setSelectedNote(updatedNotes[nextIndex === -1 ? 0 : nextIndex]);
      } else {
        setSelectedNote(null);
      }
      
      // If on mobile, go back to list view if there are no more notes
      if (isMobile && updatedNotes.length === 0) {
        setShowMobileDetail(false);
      }
      
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Format user name
  const formatUserName = (user: Note['user']) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  const isDarkMode = theme === 'dark';
  const accentColor = isDarkMode ? 'bg-blue-600' : 'bg-blue-600';
  const hoverAccentColor = isDarkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-700';

  // Add global styles
  useEffect(() => {
    // Add the styles to the document
    const styleElement = document.createElement('style');
    styleElement.innerHTML = globalStyles;
    document.head.appendChild(styleElement);
    
    // Clean up
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Add Note Modal
  const AddNoteModal = () => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    
    // Focus the textarea when the modal opens
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, []);
    
    // Close modal when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
          setShowAddNoteModal(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
    
    // Create a local state for the content to prevent glitching
    const [localNote, setLocalNote] = useState('');
    const [localSelectedJob, setLocalSelectedJob] = useState(selectedJob);
    
    // Update local job selection when global selection changes
    useEffect(() => {
      setLocalSelectedJob(selectedJob);
    }, [selectedJob]);
    
    // Update the note content when submitting
    const handleSubmit = async () => {
      if (!localNote || !localSelectedJob) {
        toast.error('Please enter note content and select a job.');
        return;
      }
      
      setIsAddingNote(true);
      
      try {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: localNote,
            job_id: localSelectedJob,
          }),
        });
        
        if (!response.ok) throw new Error('Failed to add note');
        
        const newNoteData = await response.json();
        
        // Update notes list
        const updatedNotes = [newNoteData, ...notes];
        setNotes(updatedNotes);
        
        // Select the new note
        setSelectedNote(newNoteData);
        
        // Reset form
        setLocalNote('');
        setShowAddNoteModal(false);
        
        // Update the global selected job after the note is added
        setSelectedJob(localSelectedJob);
        
        toast.success('Note added successfully');
      } catch (error) {
        console.error('Error adding note:', error);
        toast.error('Failed to add note. Please try again.');
      } finally {
        setIsAddingNote(false);
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-auto animate-fadeIn">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Note</h3>
            
            <div className="mb-4">
              <label htmlFor="job" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Job
              </label>
              <Combobox
                options={jobs}
                value={localSelectedJob}
                onChange={setLocalSelectedJob}
                placeholder="Search job"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note Content
              </label>
              <textarea
                id="note"
                ref={textareaRef}
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                placeholder="Enter your note here..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-400"
                style={{ direction: 'ltr', textAlign: 'left' }}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                disabled={isAddingNote}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isAddingNote}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${accentColor} ${hoverAccentColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 flex items-center justify-center min-w-[100px]`}
              >
                {isAddingNote ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Save Note
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Edit Note Modal
  const EditNoteModal = () => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    
    // Focus the textarea when the modal opens
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, []);
    
    // Close modal when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
          setShowEditNoteModal(false);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
    
    // Create a local state for the content to prevent glitching
    const [localContent, setLocalContent] = useState(selectedNote?.content || '');
    
    // Update the note content when submitting
    const handleSubmit = () => {
      if (selectedNote) {
        setSelectedNote(prev => prev ? {...prev, content: localContent} : null);
        handleEditNote();
      }
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-auto animate-fadeIn">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Edit Note</h3>
            
            <div className="mb-6">
              <label htmlFor="editNote" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Note Content
              </label>
              <textarea
                id="editNote"
                ref={textareaRef}
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                placeholder="Enter your note here..."
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-400"
                style={{ direction: 'ltr', textAlign: 'left' }}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEditNoteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${accentColor} ${hoverAccentColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200`}
              >
                Update Note
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="flex-1 p-4">
      <div className="flex flex-col md:flex-row gap-4 animate-pulse">
        <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-sm h-[500px]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
          </div>
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full md:w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow-sm h-[500px]">
          <div className="p-6 space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mt-8"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 shadow-sm sticky top-0 z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center">
            {isMobile && showMobileDetail && (
              <button 
                onClick={() => setShowMobileDetail(false)}
                className="mr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Go back to notes list"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Job Notes
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                View and manage notes for all jobs
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddNoteModal(true)}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${accentColor} ${hoverAccentColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </button>
        </div>
      </div>

      {/* Search and Filter - Hide on mobile when detail is shown */}
      {(!isMobile || !showMobileDetail) && (
        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[73px] z-10">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search notes by content or job name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Combobox
                options={jobs}
                value={selectedJob}
                onChange={setSelectedJob}
                placeholder="Search job"
              />
            </div>
          </div>
        </div>
      )}

      {initialLoading ? (
        <LoadingSkeleton />
      ) : filteredNotes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 m-4 rounded-lg shadow-sm animate-fadeIn">
          <div className="text-center max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No notes found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchTerm || selectedJob ? 
                'Try adjusting your search or filter criteria.' : 
                'Start by adding your first note. Notes help you keep track of important information and updates.'}
            </p>
            <button
              onClick={() => setShowAddNoteModal(true)}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${accentColor} ${hoverAccentColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
          {/* Notes List - Hide on mobile when detail is shown */}
          {(!isMobile || !showMobileDetail) && (
            <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col animate-fadeIn">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Notes</h2>
              </div>
              <div className="overflow-y-auto flex-1">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredNotes.map((note, index) => (
                    <li 
                      key={note.id}
                      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors animate-fadeIn ${
                        selectedNote?.id === note.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400' : ''
                      }`}
                      style={{ 
                        animationDelay: `${index * 0.05}s`
                      }}
                      onClick={() => {
                        setSelectedNote(note);
                        if (isMobile) {
                          setShowMobileDetail(true);
                        }
                      }}
                    >
                      <div className="px-4 py-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center max-w-[70%]">
                            <p className="text-sm text-bold font-medium text-gray-900 dark:text-white truncate">
                              {formatJobName(note.job)}
                            </p>
                          </div>
                          <div className="flex items-center flex-shrink-0">
                            <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400 mr-1" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(note.created_at)}
                            </p>
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                          {note.content}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Note Content - Show on mobile only when detail is selected */}
          {(!isMobile || showMobileDetail) && (
            <div className={`w-full md:w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-y-auto ${isMobile && showMobileDetail ? 'animate-slideIn fixed inset-0 z-20 mt-[73px]' : 'animate-fadeIn'}`}>
              {selectedNote ? (
                <div className="p-6">
                  {isMobile && (
                    <button 
                      onClick={() => setShowMobileDetail(false)}
                      className="mb-4 flex items-center text-blue-600 dark:text-blue-400 hover:underline"
                      aria-label="Back to notes list"
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      <span>Back to notes</span>
                    </button>
                  )}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex items-center mb-1">
                      <h2 className="text-lg text-bold font-medium text-gray-900 dark:text-white">
                          {formatJobName(selectedNote.job)}
                        </h2>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="h-4 w-4 mr-2" />
                        {formatDate(selectedNote.created_at)}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {selectedNote.user.id === session?.user?.id && (
                        <>
                          <button
                            onClick={() => setShowEditNoteModal(true)}
                            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Edit note"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={handleDeleteNote}
                            disabled={isDeleting}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                            aria-label="Delete note"
                          >
                            {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{selectedNote.content}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-6">
                  <p className="text-gray-500 dark:text-gray-400">Select a note to view</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && <AddNoteModal />}

      {/* Edit Note Modal */}
      {showEditNoteModal && selectedNote && <EditNoteModal />}
    </div>
  );
};

export default NotesPage; 