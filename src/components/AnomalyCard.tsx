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

  // Asegurarse de que imageUrl sea siempre una cadena, no un objeto HTMLImageElement
  const getImageSrc = (): string => {
    try {
      if (!anomaly.imageUrl) return '';
      
      // Si es una cadena, devolver directamente
      if (typeof anomaly.imageUrl === 'string') {
        return anomaly.imageUrl;
      }
      
      // Si es un objeto HTMLImageElement, devolver su src
      if (anomaly.imageUrl instanceof HTMLImageElement) {
        return anomaly.imageUrl.src || '';
      }
      
      // Si es un objeto con propiedad 'src'
      if (typeof anomaly.imageUrl === 'object' && 'src' in anomaly.imageUrl) {
        return (anomaly.imageUrl as any).src || '';
      }
      
      // Si llegamos aquí y anomaly.imageUrl es un objeto, convertir a string para evitar errores de renderizado
      if (typeof anomaly.imageUrl === 'object') {
        return PLACEHOLDER_IMAGE_URL;
      }
      
      return String(anomaly.imageUrl);
    } catch (error) {
      console.error('Error processing image URL:', error);
      return '';
    }
  };

  const imageUrl = getImageSrc();

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const feedback = {
        classification: classification || undefined,
        is_anomaly: classification !== 'Not Interesting',
        comments: comments || undefined,
        rating,
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
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={anomaly.metadata?.objectName || 'Astronomical anomaly'}
            fill
            sizes="(max-width: 768px) 100vw, 500px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            quality={70}
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QOQvuQAAAABJRU5ErkJggg=="
          />
        )}
        {!imageUrl && (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <p className="text-gray-500 dark:text-gray-400">No image available</p>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-bold text-xl mb-1 text-gray-900 dark:text-white">
          {anomaly.metadata?.objectName || 'Unknown Object'}
        </h3>

        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-4">
          {anomaly.coordinates && (
            <p>RA: {anomaly.coordinates.ra.toFixed(5)}, Dec: {anomaly.coordinates.dec.toFixed(5)}</p>
          )}
          <p>Discovery: {anomaly.metadata?.discoveryDate || 'Unknown'}</p>
          <p>Instrument: {anomaly.metadata?.instrument || 'Unknown'}</p>
        </div>

        {!showFeedback && !feedbackSubmitted && (
          <button
            onClick={() => setShowFeedback(true)}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors shadow-sm hover:shadow flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Provide Feedback
          </button>
        )}

        {showFeedback && !feedbackSubmitted && (
          <form onSubmit={handleFeedbackSubmit} className="mt-3 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Classification:
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a classification</option>
                <option value="Star">Star</option>
                <option value="Galaxy">Galaxy</option>
                <option value="Nebula">Nebula</option>
                <option value="Quasar">Quasar</option>
                <option value="Supernova">Supernova</option>
                <option value="Black Hole">Black Hole</option>
                <option value="Not Interesting">Not Interesting</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Comments:
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Add any additional observations..."
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !classification}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors disabled:bg-green-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
              <button
                type="button"
                onClick={() => setShowFeedback(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {feedbackSubmitted && (
          <div className="mt-3 bg-green-100 dark:bg-green-900/30 p-4 rounded-lg text-center border border-green-200 dark:border-green-800">
            <p className="font-medium text-green-800 dark:text-green-200">Thank you for your feedback!</p>
          </div>
        )}
      </div>
    </div>
  );
}