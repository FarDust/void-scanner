'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnomalyObject, submitAnomalyFeedback } from '../services/anomalyService';

interface AnomalyCardProps {
  anomaly: AnomalyObject;
  onFeedbackSubmit?: (updatedAnomaly: AnomalyObject) => void;
}

export default function AnomalyCard({ anomaly, onFeedbackSubmit }: AnomalyCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [classification, setClassification] = useState('');
  const [rating, setRating] = useState<number | undefined>(undefined);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Generate a classification badge color based on the type
  const getClassificationColor = (type: string | undefined) => {
    switch (type?.toLowerCase()) {
      case 'star':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'galaxy': 
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200';
      case 'nebula':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      case 'quasar':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'supernova':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'black hole':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'anomalous region':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
      default:
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const feedback = {
        classification: classification || undefined,
        is_anomaly: classification !== 'Not Interesting', // Add is_anomaly property to match service
        comments: comments || undefined,
        rating
      };
      
      const updatedAnomaly = await submitAnomalyFeedback(anomaly.id, feedback);
      
      if (updatedAnomaly && onFeedbackSubmit) {
        onFeedbackSubmit(updatedAnomaly);
      }
      
      setFeedbackSubmitted(true);
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackSubmitted(false);
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden w-full max-w-md border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700">
      <div className="relative h-64 w-full overflow-hidden">
        {anomaly.imageUrl ? (
          <Image 
            src={anomaly.imageUrl} 
            alt={anomaly.metadata?.objectName || 'Astronomical anomaly'} 
            fill
            sizes="(max-width: 768px) 100vw, 500px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            quality={70}
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QOQvuQAAAABJRU5ErkJggg=="
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No image available</p>
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start">
          <div className={`${getClassificationColor(anomaly.type)} text-xs px-2 py-1 rounded-full font-medium`}>
            {anomaly.type || 'Unknown'}
          </div>
          
          <div className="flex flex-col items-end gap-2">
            
            {anomaly.is_anomaly && (
              <div className="bg-amber-500/90 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-medium animate-pulse">
                Anomaly Detected
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-5">
        <h3 className="font-bold text-xl mb-1 text-gray-900 dark:text-white">{anomaly.metadata?.objectName || 'Unknown Object'}</h3>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-4">
          {anomaly.coordinates && (
            <p className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              RA: {anomaly.coordinates.ra.toFixed(5)}, Dec: {anomaly.coordinates.dec.toFixed(5)}
            </p>
          )}
          <p className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Discovery: {anomaly.metadata?.discoveryDate || 'Unknown'}
          </p>
          <p className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
            Instrument: {anomaly.metadata?.instrument || 'Unknown'}
          </p>
        </div>
        
        {/* User feedback section */}
        {anomaly.userFeedback && (
          <div className="mt-3 mb-3 bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800 text-sm">
            <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">Your Feedback:</p>
            {anomaly.userFeedback.classification && (
              <p className="text-gray-700 dark:text-gray-300">Classification: <span className="font-medium">{anomaly.userFeedback.classification}</span></p>
            )}
            {anomaly.userFeedback.rating !== undefined && (
              <div className="flex items-center">
                <span className="text-gray-700 dark:text-gray-300 mr-1">Rating:</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={star <= (anomaly.userFeedback?.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}>★</span>
                  ))}
                </div>
              </div>
            )}
            {anomaly.userFeedback.comments && (
              <p className="text-gray-600 dark:text-gray-400 italic mt-1 border-t border-blue-100 dark:border-blue-800 pt-1">"{anomaly.userFeedback.comments}"</p>
            )}
          </div>
        )}
        
        {!showFeedback && !anomaly.userFeedback && (
          <button 
            onClick={() => setShowFeedback(true)}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors shadow-sm hover:shadow flex items-center justify-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Provide Feedback</span>
          </button>
        )}
        
        {/* Feedback form */}
        {showFeedback && !feedbackSubmitted && (
          <form onSubmit={handleFeedbackSubmit} className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Classification:
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-500"
                required
              >
                <option value="">Select a classification</option>
                <option value="Star">Star</option>
                <option value="Galaxy">Galaxy</option>
                <option value="Nebula">Nebula</option>
                <option value="Quasar">Quasar</option>
                <option value="Supernova">Supernova</option>
                <option value="Black Hole">Black Hole</option>
                <option value="Other">Other</option>
                <option value="Not Interesting">Not Interesting</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quality Rating:
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-8 h-8 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors 
                      ${rating && rating >= star ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'} 
                      hover:text-yellow-400`}
                  >
                    <span className="text-lg">★</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comments:
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-500"
                placeholder="Add any additional observations..."
              />
            </div>
            
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !classification}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors disabled:bg-green-400 disabled:cursor-not-allowed shadow-sm hover:shadow"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-1">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Submitting...</span>
                  </span>
                ) : 'Submit Feedback'}
              </button>
              <button
                type="button"
                onClick={() => setShowFeedback(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors shadow-sm hover:shadow"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        
        {feedbackSubmitted && (
          <div className="mt-3 bg-green-100 dark:bg-green-900/30 p-4 rounded-lg text-center border border-green-200 dark:border-green-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-auto text-green-600 dark:text-green-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="font-medium text-green-800 dark:text-green-200">Thank you for your feedback!</p>
          </div>
        )}
      </div>
    </div>
  );
}