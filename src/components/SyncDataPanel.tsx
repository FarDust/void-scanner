'use client';

import { useState } from 'react';
import { syncAnomalyData } from '../services/anomalyService';
import { useImageCache } from '../services/imageCache';
import { toast } from 'react-hot-toast'; // Add toast import

interface SyncDataPanelProps {
  onDataRefreshed?: () => void;
}

export default function SyncDataPanel({ onDataRefreshed }: SyncDataPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    imported_count: number;
    anomaly_count?: number;
    skipped_count?: number;
    error_count?: number;
    total_records?: number;
    source?: string;
  } | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // Add image cache hook to access cache statistics
  const { cacheStats, clearCache } = useImageCache();

  const handleSync = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await syncAnomalyData();
      setResult(data);
      
      if (!data.success) {
        setError(data.message);
      } else if (data.success && onDataRefreshed) {
        // Notify parent component to refresh data without flickering
        onDataRefreshed();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during synchronization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Data Synchronization</h2>
          
          {/* Add cache status indicator */}
          <div className="flex items-center text-sm">
            <div className="mr-2 flex items-center">
              <div className={`h-2 w-2 rounded-full mr-1 ${cacheStats.size > 0 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-gray-600 dark:text-gray-300">
                Local Cache: {cacheStats.size > 0 ? 
                  `${cacheStats.size} image${cacheStats.size !== 1 ? 's' : ''}` : 
                  'Empty'}
              </span>
            </div>
            {cacheStats.size > 0 && (
              <button 
                onClick={() => {
                  clearCache();
                  toast.success('Image cache cleared');
                }}
                className="text-xs text-red-500 hover:text-red-700"
                title="Clear cached images"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Synchronize anomaly detection data from external sources into the local database.
        </p>
        
        <button
          onClick={handleSync}
          disabled={loading}
          className={`w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
            ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
              Synchronizing...
            </>
          ) : (
            'Synchronize Anomaly Data'
          )}
        </button>
        
        {error && (
          <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p>{error}</p>
          </div>
        )}
        
        {result && result.success && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
              Synchronization Complete
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-3">{result.message}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white dark:bg-gray-700 p-2 rounded">
                <span className="block text-gray-500 dark:text-gray-400">Imported</span>
                <span className="font-bold">{result.imported_count}</span>
              </div>
              
              <div className="bg-white dark:bg-gray-700 p-2 rounded">
                <span className="block text-gray-500 dark:text-gray-400">Anomalies</span>
                <span className="font-bold">{result.anomaly_count || 0}</span>
              </div>
              
              <div className="bg-white dark:bg-gray-700 p-2 rounded">
                <span className="block text-gray-500 dark:text-gray-400">Skipped</span>
                <span className="font-bold">{result.skipped_count || 0}</span>
              </div>
              
              <div className="bg-white dark:bg-gray-700 p-2 rounded">
                <span className="block text-gray-500 dark:text-gray-400">Errors</span>
                <span className="font-bold">{result.error_count || 0}</span>
              </div>
              
              <div className="bg-white dark:bg-gray-700 p-2 rounded col-span-2 md:col-span-2">
                <span className="block text-gray-500 dark:text-gray-400">Total Records</span>
                <span className="font-bold">{result.total_records || 0}</span>
              </div>
            </div>
            
            {result.source && (
              <div className="mt-3 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Source:</span>
                <span className="ml-1 font-mono text-xs break-all">{result.source}</span>
              </div>
            )}
          </div>
        )}

        {/* Add cache performance details */}
        {cacheStats.hits > 0 && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <p>Cache performance: {cacheStats.hits} hits, {cacheStats.misses} misses</p>
            <p className="text-xs opacity-70 mt-1">
              Images are cached locally in your browser for faster loading
            </p>
          </div>
        )}
      </div>
    </div>
  );
}