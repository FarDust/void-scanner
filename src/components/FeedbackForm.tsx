'use client';

import { useState } from 'react';

export default function FeedbackForm() {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedback) {
      setError('Please enter some feedback');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Simulating API call to submit feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form and show success message
      setFeedback('');
      setIsSubmitted(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 w-full">
      <h2 className="text-xl font-bold mb-4">Help Us Improve</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        We value your suggestions and comments about the Void Scanner project. 
        Please share your thoughts with us.
      </p>
      
      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback" className="block text-sm font-medium mb-1">
              Your Feedback
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="w-full p-3 border rounded bg-white dark:bg-gray-700 text-sm"
              placeholder="Share your ideas, suggestions, or report any issues..."
            />
          </div>
          
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md transition-colors disabled:bg-blue-400"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      ) : (
        <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-md text-center">
          <p className="text-green-800 dark:text-green-200 font-medium">
            Thank you for your feedback!
          </p>
          <p className="text-green-700 dark:text-green-300 text-sm mt-1">
            Your input helps us improve the Void Scanner project.
          </p>
        </div>
      )}
    </div>
  );
}