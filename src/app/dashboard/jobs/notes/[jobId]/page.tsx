'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ChevronLeft, Loader2, Trash2, Plus, Edit, Clock, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AddNoteModal } from '../../components/AddNoteModal';
import { EditNoteModal } from '../../components/EditNoteModal';

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

interface Note {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

interface Job {
  id: string;
  name: string;
  details: Record<string, string>;
}

export default function JobNotesPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { theme } = useTheme();
  const jobId = params?.jobId as string;
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);

  // If no jobId is found, redirect to jobs page
  useEffect(() => {
    if (!jobId && status !== 'loading') {
      router.push('/dashboard/jobs');
    }
  }, [jobId, router, status]);

  // Fetch job details and notes
  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    const fetchJobAndNotes = async () => {
      setIsLoading(true);
      try {
        // Ensure jobId is properly formatted (remove any trailing colons or numbers)
        const cleanJobId = jobId.split(':')[0];
        
        // Fetch notes
        const notesResponse = await fetch(`/api/jobs/notes?jobId=${cleanJobId}`);
        if (!notesResponse.ok) {
          const errorData = await notesResponse.json().catch(() => ({ error: 'Failed to fetch notes' }));
          throw new Error(errorData.error || 'Failed to fetch notes');
        }
        
        const notesData = await notesResponse.json();
        setNotes(notesData.notes);
        
        if (notesData.notes.length > 0) {
          setSelectedNote(notesData.notes[0]);
        }
        
        // Fetch job details from local storage or API
        // This is a simplified approach - you might need to adjust based on how you store job data
        const cachedJobs = localStorage.getItem(`monday_jobs_cache_${session?.user?.email?.toLowerCase()}`);
        if (cachedJobs) {
          try {
            const jobsData = JSON.parse(cachedJobs);
            // Look for the job with the clean ID
            const foundJob = jobsData.jobs.find((j: any) => 
              j.id === cleanJobId || 
              j.id.startsWith(cleanJobId + ':') ||
              j.monday_id === cleanJobId
            );
            if (foundJob) {
              setJob(foundJob);
            }
          } catch (parseError) {
            console.error('Error parsing cached jobs:', parseError);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load notes');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJobAndNotes();
  }, [jobId, router, session, status]);

  // Handle note deletion
  const handleDeleteNote = async () => {
    if (!selectedNote) return;
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/jobs/notes?id=${selectedNote.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete note');
      }
      
      // Remove the note from the list
      setNotes(prev => prev.filter(note => note.id !== selectedNote.id));
      
      // Select the next note if available
      if (notes.length > 1) {
        const currentIndex = notes.findIndex(note => note.id === selectedNote.id);
        const nextIndex = currentIndex === notes.length - 1 ? currentIndex - 1 : currentIndex;
        setSelectedNote(notes[nextIndex === -1 ? 0 : nextIndex]);
      } else {
        setSelectedNote(null);
      }
      
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete note');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format date for display
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

  // Handle adding a new note
  const handleNoteAdded = async () => {
    try {
      // Ensure jobId is properly formatted
      const cleanJobId = jobId.split(':')[0];
      
      const response = await fetch(`/api/jobs/notes?jobId=${cleanJobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch updated notes');
      }
      
      const data = await response.json();
      setNotes(data.notes);
      
      if (data.notes.length > 0 && (!selectedNote || data.notes[0].id !== selectedNote.id)) {
        setSelectedNote(data.notes[0]);
      }
    } catch (error) {
      console.error('Error refreshing notes:', error);
    }
  };

  // Handle updating a note
  const handleNoteUpdated = async () => {
    try {
      // Ensure jobId is properly formatted
      const cleanJobId = jobId.split(':')[0];
      
      const response = await fetch(`/api/jobs/notes?jobId=${cleanJobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch updated notes');
      }
      
      const data = await response.json();
      setNotes(data.notes);
      
      // Find and select the previously selected note with updated content
      if (selectedNote) {
        const updatedSelectedNote = data.notes.find((note: Note) => note.id === selectedNote.id);
        if (updatedSelectedNote) {
          setSelectedNote(updatedSelectedNote);
        }
      }
    } catch (error) {
      console.error('Error refreshing notes:', error);
    }
  };

  // Handle back button
  const handleBack = () => {
    router.back();
  };

  // Handle edit button
  const handleEditNote = () => {
    if (selectedNote && selectedNote.user.id === session?.user?.id) {
      setShowEditNoteModal(true);
    }
  };

  const isDarkMode = theme === 'dark';
  const accentColor = isDarkMode ? 'bg-blue-600' : 'bg-blue-600';
  const hoverAccentColor = isDarkMode ? 'hover:bg-blue-700' : 'hover:bg-blue-700';

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header with Job Title */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center">
            <button
              onClick={handleBack}
              className="mr-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {job ? job.name : 'Job Notes'}
              </h1>
              {job && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Notes and updates for this job
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowAddNoteModal(true)}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${accentColor} ${hoverAccentColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors`}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 m-4 rounded-lg shadow-sm">
          <div className="text-center max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No notes yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Start by adding your first note for this job. Notes help you keep track of important information and updates.
            </p>
            <button
              onClick={() => setShowAddNoteModal(true)}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${accentColor} ${hoverAccentColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Note
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 gap-4">
          {/* Notes List */}
          <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Notes</h2>
            </div>
            <div className="overflow-y-auto flex-1">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {notes.map(note => (
                  <li 
                    key={note.id}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedNote?.id === note.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400' : ''
                    }`}
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className="px-4 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {formatUserName(note.user)}
                          </p>
                        </div>
                        <div className="flex items-center">
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

          {/* Note Content */}
          <div className="w-full md:w-2/3 bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-y-auto">
            {selectedNote ? (
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center mb-1">
                      <User className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                        {formatUserName(selectedNote.user)}
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
                          onClick={handleEditNote}
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
                          <Trash2 className="h-5 w-5" />
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
        </div>
      )}

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <AddNoteModal
          jobId={jobId}
          onClose={() => setShowAddNoteModal(false)}
          onNoteAdded={handleNoteAdded}
        />
      )}

      {/* Edit Note Modal */}
      {showEditNoteModal && selectedNote && (
        <EditNoteModal
          note={selectedNote}
          onClose={() => setShowEditNoteModal(false)}
          onNoteUpdated={handleNoteUpdated}
        />
      )}
    </div>
  );
} 