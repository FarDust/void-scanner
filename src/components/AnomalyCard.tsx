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

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const feedback = {
        classification: classification || undefined,
        rating: rating,
        comments: comments || undefined
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden w-full max-w-md">
      <div className="relative h-64 w-full">
        <Image 
          src={anomaly.imageUrl} 
          alt={anomaly.metadata.objectName || 'Astronomical anomaly'} 
          fill
          style={{ objectFit: 'cover' }}
        />
        <div className="absolute top-0 right-0 bg-black/70 text-white px-2 py-1 m-2 rounded text-xs">
          Confidence: {Math.round(anomaly.confidence * 100)}%
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-lg mb-1">{anomaly.metadata.objectName || 'Unknown Object'}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Type: {anomaly.type}</p>
        
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-3">
          <p>RA: {anomaly.coordinates.ra.toFixed(5)}, Dec: {anomaly.coordinates.dec.toFixed(5)}</p>
          <p>Discovery: {anomaly.metadata.discoveryDate}</p>
          <p>Instrument: {anomaly.metadata.instrument}</p>
        </div>
        
        {anomaly.userFeedback && (
          <div className="mt-2 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md text-sm">
            <p className="font-semibold">Your Feedback:</p>
            {anomaly.userFeedback.classification && (
              <p>Classification: {anomaly.userFeedback.classification}</p>
            )}
            {anomaly.userFeedback.rating !== undefined && (
              <p>Rating: {anomaly.userFeedback.rating}/5</p>
            )}
            {anomaly.userFeedback.comments && (
              <p className="italic">"{anomaly.userFeedback.comments}"</p>
            )}
          </div>
        )}
        
        {!showFeedback && !anomaly.userFeedback && (
          <button 
            onClick={() => setShowFeedback(true)}
            className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
          >
            Provide Feedback
          </button>
        )}
        
        {showFeedback && !feedbackSubmitted && (
          <form onSubmit={handleFeedbackSubmit} className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Classification:
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-sm"
              >
                <option value="">Select a classification</option>
                <option value="Star">Star</option>
                <option value="Galaxy">Galaxy</option>
                <option value="Nebula">Nebula</option>
                <option value="Quasar">Quasar</option>
                <option value="Supernova">Supernova</option>
                <option value="Black Hole">Black Hole</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Quality Rating:
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-8 h-8 ${rating === star ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                Comments:
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700 text-sm"
                placeholder="Add any additional observations..."
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded transition-colors disabled:bg-green-400"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
              <button
                type="button"
                onClick={() => setShowFeedback(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        
        {feedbackSubmitted && (
          <div className="mt-3 bg-green-100 dark:bg-green-900/30 p-3 rounded-md text-center text-green-800 dark:text-green-200">
            Thank you for your feedback!
          </div>
        )}
      </div>
    </div>
  );
}