import { useState, useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

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

interface EditNoteModalProps {
  note: Note;
  onClose: () => void;
  onNoteUpdated: () => void;
}

export const EditNoteModal = ({ note, onClose, onNoteUpdated }: EditNoteModalProps) => {
  const { data: session } = useSession();
  const [content, setContent] = useState(note.content);
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
      
      // Use the main notes API endpoint
      const response = await fetch(`/api/notes/${note.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
        }),
      });
      
      if (!response.ok) {
        let errorMessage = 'Failed to update note';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (jsonError) {
          console.error('Error parsing error response:', jsonError);
        }
        throw new Error(errorMessage);
      }
      
      toast.success('Note updated successfully');
      onNoteUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update note');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-auto animate-fadeIn shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Note</h2>
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
                'Update Note'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 