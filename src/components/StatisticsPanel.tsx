'use client';

import { useState, useEffect } from 'react';
import { getStatistics } from '../services/anomalyService';

export default function StatisticsPanel() {
  const [stats, setStats] = useState<{
    total_images: number;
    anomalies_detected: number;
    classified_images: number;
    average_anomaly_score: number;
    storage_type: string;
    storage_location: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const data = await getStatistics();
        setStats({
          total_images: data.total_images,
          anomalies_detected: data.anomalies_detected || data.anomaly_count || 0,
          classified_images: data.classified_images || 0,
          average_anomaly_score: data.average_anomaly_score || 0,
          storage_type: data.storage_type || 'Unknown',
          storage_location: data.storage_location || 'Unknown'
        });
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">System Statistics</h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Images</p>
          <p className="text-2xl font-bold">{stats?.total_images.toLocaleString()}</p>
        </div>
        
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Anomalies Detected</p>
          <p className="text-2xl font-bold">{stats?.anomalies_detected.toLocaleString()}</p>
          <p className="text-xs text-gray-500">
            ({((stats?.anomalies_detected / stats?.total_images) * 100 || 0).toFixed(1)}%)
          </p>
        </div>
        
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Classified</p>
          <p className="text-2xl font-bold">{stats?.classified_images.toLocaleString()}</p>
          <p className="text-xs text-gray-500">
            ({((stats?.classified_images / stats?.total_images) * 100 || 0).toFixed(1)}%)
          </p>
        </div>
        
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Anomaly Score</p>
          <p className="text-2xl font-bold">{stats?.average_anomaly_score.toFixed(3)}</p>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg col-span-2 sm:col-span-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Storage</p>
          <p className="font-medium">{stats?.storage_type}</p>
          <p className="text-sm truncate" title={stats?.storage_location}>
            {stats?.storage_location}
          </p>
        </div>
      </div>
    </div>
  );
}