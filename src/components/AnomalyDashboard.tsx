'use client';

import { useState, useEffect } from 'react';
import { AnomalyObject, getAnomalies } from '../services/anomalyService';
import AnomalyCard from './AnomalyCard';

export default function AnomalyDashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        setLoading(true);
        const data = await getAnomalies();
        setAnomalies(data);
      } catch (err) {
        console.error('Error fetching anomalies:', err);
        setError('Failed to load anomalous objects. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnomalies();
  }, []);

  // Update the local state when feedback is submitted
  const handleFeedbackSubmit = (updatedAnomaly: AnomalyObject) => {
    setAnomalies(currentAnomalies => 
      currentAnomalies.map(anomaly => 
        anomaly.id === updatedAnomaly.id ? updatedAnomaly : anomaly
      )
    );
    setFeedbackCount(prev => prev + 1);
  };

  // Calculate statistics
  const totalAnomalies = anomalies.length;
  const highConfidenceCount = anomalies.filter(a => a.confidence > 0.9).length;
  const feedbackSubmitted = anomalies.filter(a => a.userFeedback).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Anomalous Objects Dashboard</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8">
        Help us analyze potential anomalies detected in astronomical data
      </p>
      
      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-1">Total Objects</h3>
          <p className="text-3xl font-bold">{totalAnomalies}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-1">High Confidence</h3>
          <p className="text-3xl font-bold">{highConfidenceCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-1">Feedback Received</h3>
          <p className="text-3xl font-bold">{feedbackSubmitted}</p>
        </div>
      </div>

      {/* Real-time feedback notification */}
      {feedbackCount > 0 && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 animate-pulse">
          Thank you! {feedbackCount} contribution{feedbackCount > 1 ? 's' : ''} submitted
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {anomalies.map(anomaly => (
            <AnomalyCard 
              key={anomaly.id} 
              anomaly={anomaly} 
              onFeedbackSubmit={handleFeedbackSubmit}
            />
          ))}
        </div>
      )}
    </div>
  );
}