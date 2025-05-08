'use client';

import { useState, useEffect } from 'react';
import { getStatistics } from '../services/anomalyService';

// New interface to define the statistics structure
interface StatisticData {
  total_images: number;
  anomalies_detected: number;
  anomaly_count?: number;
  classified_images: number;
  average_anomaly_score: number;
  normal_count: number;
  user_confirmed_anomalies?: number;
  unclassified_anomalies?: number;
  false_positives?: number;
  false_negatives?: number;
  storage_type: string;
  storage_location: string;
  recent_activity?: { event: string; timestamp: string; image_id: string }[];
  user_agreement?: number;
}

// Demo statistics for when the API is down
const demoStatistics: StatisticData = {
  total_images: 2500,
  anomalies_detected: 150,
  anomaly_count: 150,
  classified_images: 120,
  average_anomaly_score: 12.45,
  normal_count: 2350,
  user_confirmed_anomalies: 75,
  unclassified_anomalies: 30,
  false_positives: 15,
  false_negatives: 5,
  storage_type: 'Demo',
  storage_location: 'browser',
  recent_activity: [
    { event: 'image_processed', timestamp: '2025-05-05T14:55:00Z', image_id: 'demo-1' },
    { event: 'anomaly_detected', timestamp: '2025-05-05T14:52:00Z', image_id: 'demo-2' },
    { event: 'user_classification', timestamp: '2025-05-05T14:45:00Z', image_id: 'demo-3' }
  ],
  user_agreement: 85
};

export default function StatisticsPanel({ userMode = false }: { userMode?: boolean }) {
  const [stats, setStats] = useState<StatisticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'system'>('system');
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        // Use dashboard statistics for more comprehensive data
        const data = await getStatistics(true);
        setStats({
          total_images: data.total_images,
          anomalies_detected: data.anomalies_detected || data.anomaly_count || 0,
          classified_images: data.classified_images || 0,
          average_anomaly_score: data.average_anomaly_score || 0,
          normal_count: data.normal_count || 0,
          storage_type: data.storage_type || 'Demo',
          storage_location: data.storage_location || 'tmp',
          user_confirmed_anomalies: data.user_confirmed_anomalies || 0,
          unclassified_anomalies: data.unclassified_anomalies || 0,
          false_positives: data.false_positives || 0,
          false_negatives: data.false_negatives || 0,
          // Transform recent_activity to match the expected format
          recent_activity: data.recent_activity 
            ? data.recent_activity.map(activity => ({
                event: activity.description,
                timestamp: activity.timestamp,
                image_id: activity.user || 'system'
              })) 
            : [],
          // Use user_agreement directly from the API if available
          user_agreement: data.user_agreement || 
            (data.user_confirmed_anomalies && data.total_images 
              ? (data.user_confirmed_anomalies / (data.total_images * 0.01)) 
              : 3) // Default to 3% if no data is available
        });
        setDemoMode(false);
      } catch (err) {
        console.error('Error fetching statistics:', err);
        // Instead of showing error, switch to demo mode with sample data
        setStats(demoStatistics);
        setDemoMode(true);
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

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      {/* Demo mode indicator */}
      {demoMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/20 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-300 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Showing demo statistics. API connection unavailable.
          </p>
        </div>
      )}
      
      {/* Tabs for switching between different stat views */}
      {userMode ? (
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'system'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            System Overview
          </button>
        </div>
      ) : (
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'system'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            System Overview
          </button>
        </div>
      )}

      {/* System Stats View - For Admins */}
      {activeTab === 'system' && (
        <>
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
                ({((stats?.anomalies_detected ?? 0) / (stats?.total_images ?? 1) * 100 || 0).toFixed(1)}%)
              </p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Classified</p>
              <p className="text-2xl font-bold">{stats?.classified_images.toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                ({((stats?.classified_images ?? 0) / (stats?.total_images ?? 1) * 100 || 0).toFixed(1)}%)
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Anomaly Score</p>
              <p className="text-2xl font-bold">{stats?.average_anomaly_score.toFixed(3)}</p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">User Agreement</p>
              <p className="text-2xl font-bold">
                {stats?.user_agreement 
                  ? `${stats.user_agreement.toFixed(0)}%` 
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                AI vs. human classification
              </p>
            </div>
            
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Needs Review</p>
              <p className="text-2xl font-bold">
                {stats?.unclassified_anomalies 
                  ? stats.unclassified_anomalies.toLocaleString() 
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                Unclassified anomalies
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg col-span-2 sm:col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Storage</p>
              <p className="font-medium">{stats?.storage_type}</p>
              <p className="text-sm truncate" title={stats?.storage_location}>
                {stats?.storage_location}
              </p>
            </div>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">False Positives</p>
              <p className="text-2xl font-bold">
                {stats?.false_positives !== undefined 
                  ? stats.false_positives.toLocaleString() 
                  : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">
                Needs review
              </p>
            </div>
          </div>

          {/* Action items for admins - Based on API data */}
          <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="font-medium mb-2">Recommended Actions</h3>
            <ul className="space-y-2 text-sm">
              {stats?.unclassified_anomalies && stats.unclassified_anomalies > 0 && (
                <li className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  <span>
                    {stats.unclassified_anomalies} {stats.unclassified_anomalies === 1 ? 'anomaly needs' : 'anomalies need'} expert review
                  </span>
                </li>
              )}
              {stats?.false_positives && stats.false_positives > 0 && (
                <li className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>{stats.false_positives} potential false {stats.false_positives === 1 ? 'positive' : 'positives'} detected</span>
                </li>
              )}
              {(!stats?.unclassified_anomalies && !stats?.false_positives) || 
               (stats?.unclassified_anomalies === 0 && stats?.false_positives === 0) && (
                <li className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>All anomalies have been reviewed</span>
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}