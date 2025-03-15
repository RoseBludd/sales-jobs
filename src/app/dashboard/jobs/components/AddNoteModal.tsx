import { useState, useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface AddNoteModalProps {
  jobId: string;
  onClose: () => void;
  onNoteAdded: () => void;
}

export const AddNoteModal = ({ jobId, onClose, onNoteAdded }: AddNoteModalProps) => {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Please enter a note');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // First, we need to get the actual job UUID from the database using the monday_id
      const jobResponse = await fetch(`/api/jobs/find?monday_id=${jobId}`);
      
      if (!jobResponse.ok) {
        console.error('Error finding job:', jobResponse.status);
        throw new Error('Failed to find job');
      }
      
      const jobData = await jobResponse.json();
      console.log('Found job:', jobData);
      
      if (!jobData || !jobData.id) {
        throw new Error('Job not found');
      }
      
      // Now use the actual UUID for the job_id
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          job_id: jobData.id,
        }),
      });
      
      // Log the response status for debugging
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        // Try to get the error message from the response
        let errorMessage = 'Failed to add note';
        const responseText = await response.text();
        console.log('Error response text:', responseText);
        
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            if (errorData && errorData.error) {
              errorMessage = errorData.error;
            }
          } catch (jsonError) {
            console.error('Error parsing error response:', jsonError);
          }
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Note added successfully:', data);
      
      toast.success('Note added successfully');
      onNoteAdded();
      onClose();
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-auto animate-fadeIn shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Job Note</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="note-content" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Note
            </label>
            <textarea
              id="note-content"
              ref={textareaRef}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-400"
              placeholder="Enter your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ direction: 'ltr', textAlign: 'left' }}
              required
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px] transition-all duration-200"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Add Note'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 