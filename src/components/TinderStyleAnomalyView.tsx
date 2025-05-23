'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { 
  AnomalyObject, 
  getAnomalies, 
  getNormalImages, 
  submitAnomalyFeedback,
  submitBatchClassification, // Import the new batch classification function
  getStatistics,
  syncAnomalyData,
  getSimilarImages // Import the new getSimilarImages function
} from '../services/anomalyService';
import { useImageCache } from '../services/imageCache';

// Mock examples for when no real anomalies are found
const demoAnomalies: AnomalyObject[] = [
  {
    id: 'demo-001',
    file_path: '',
    is_anomaly: true,
    type: 'Training Example',
    imageUrl: 'https://cdn.esahubble.org/archives/images/screen/heic0601a.jpg',
    coordinates: { ra: 83.82208, dec: -5.39111 },
    metadata: {
      objectName: 'Orion Nebula Example',
      discoveryDate: '2025-04-25',
      instrument: 'TESS Demo'
    },
    timestamp: '2025-04-25',
    processing_time: 1.2,
  },
  {
    id: 'demo-002',
    file_path: '',
    is_anomaly: true,
    type: 'Practice Object',
    imageUrl: 'https://esahubble.org/media/archives/images/large/potw1150a.jpg',
    coordinates: { ra: 114.82542, dec: 21.12889 },
    metadata: {
      objectName: 'Whirlpool Galaxy Example',
      discoveryDate: '2025-04-25',
      instrument: 'TESS Demo'
    },
    timestamp: '2025-04-25',
    processing_time: 1.5,
  },
  {
    id: 'demo-003',
    file_path: '',
    is_anomaly: true,
    type: 'Practice Anomaly',
    imageUrl: 'https://cdn.eso.org/images/thumb700x/eso-6302.jpg',
    coordinates: { ra: 299.86542, dec: 40.73389 },
    metadata: {
      objectName: 'Butterfly Nebula Example',
      discoveryDate: '2025-04-25',
      instrument: 'TESS Demo'
    },
    timestamp: '2025-04-25',
    processing_time: 0.9,
  }
];

// Define props interface for the component
interface TinderStyleAnomalyViewProps {
  demoControlsVisible?: boolean;
}

export default function TinderStyleAnomalyView({ demoControlsVisible = false }: TinderStyleAnomalyViewProps) {
  const [anomalies, setAnomalies] = useState<AnomalyObject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [backendConnectionFailed, setBackendConnectionFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  interface ApiStats {
    total_images: number;
    anomaly_count: number;
    normal_count: number;
    storage_type: string;
    classified_images: number;
    average_anomaly_score: number;
  }

  const [apiStats, setApiStats] = useState<ApiStats | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showDetailedForm, setShowDetailedForm] = useState(false);
  const [showBatchClassifyForm, setShowBatchClassifyForm] = useState(false); // New state for batch classify form
  const [selectedAnomalies, setSelectedAnomalies] = useState<string[]>([]); // New state to track selected anomalies
  const [batchClassifyComment, setBatchClassifyComment] = useState(''); // New state for batch comment
  const [batchClassifyType, setBatchClassifyType] = useState<'interesting' | 'not_interesting'>('interesting'); // New state for batch type
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [animateDirection, setAnimateDirection] = useState<'left' | 'right' | null>(null);
  const [classification, setClassification] = useState('');
  const [comments, setComments] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [stats, setStats] = useState({
    interesting: 0,
    notInteresting: 0,
    detailed: 0
  });
  
  // Use our custom image cache hook
  const { preloadImages, isImageCached, cacheStats } = useImageCache();
  
  // New state for preloaded images
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Add a useEffect to preload images when anomalies change
  useEffect(() => {
    if (!anomalies.length) return;
    
    // Collect all image URLs that need preloading
    const imageUrls = anomalies
      .filter(anomaly => anomaly.imageUrl && !preloadedImages.has(anomaly.imageUrl))
      .map(anomaly => anomaly.imageUrl);
    
    if (imageUrls.length === 0) return;
    
    // Preload the images with priority to the next few images
    const preloadWithPriority = async () => {
      // First preload the next 3 images in sequence for quick access
      const priorityUrls = imageUrls.slice(currentIndex, currentIndex + 3);
      if (priorityUrls.length > 0) {
        const urls = priorityUrls.filter((url): url is string => !!url)
        await preloadImages(urls, false); // false = sequential loading
        
        // Update preloaded images record
        const newPreloadedSet = new Set(preloadedImages);
        priorityUrls.filter((url): url is string => !!url).forEach(url => newPreloadedSet.add(url));
        setPreloadedImages(newPreloadedSet);
      }
      
      // Then preload the rest in parallel
      const remainingUrls = imageUrls.slice(currentIndex + 3);
      if (remainingUrls.length > 0) {
        preloadImages(remainingUrls.filter((url): url is string => !!url), true); // true = parallel loading
        
        // Update preloaded images record
        const newPreloadedSet = new Set(preloadedImages);
        remainingUrls.filter((url): url is string => !!url).forEach(url => newPreloadedSet.add(url));
        setPreloadedImages(newPreloadedSet);
      }
    };
    
    preloadWithPriority();
  }, [anomalies, currentIndex, preloadImages, preloadedImages]);

  // Cache statistics monitor (optional but useful for debugging)
  useEffect(() => {
    if (cacheStats.hits > 0 || cacheStats.misses > 0) {
      console.log('Image Cache Stats:', cacheStats);
    }
  }, [cacheStats]);

  const [syncStatus, setSyncStatus] = useState<{
    syncing: boolean;
    message: string | null;
    success: boolean | null;
  }>({
    syncing: false,
    message: null,
    success: null
  });

  // Add this new state for similar images modal
  const [showSimilarImages, setShowSimilarImages] = useState(false);
  const [similarImages, setSimilarImages] = useState<Array<{
    image: AnomalyObject;
    similarity_score: number;
  }>>([]);
  const [fetchingSimilar, setFetchingSimilar] = useState(false);
  
  const startDemoMode = () => {
    setAnomalies([...demoAnomalies]);
    setCurrentIndex(0);
    setDemoMode(true);
    
    // Initialize default stats for demo mode
    setApiStats({
      total_images: demoAnomalies.length,
      anomaly_count: demoAnomalies.length,
      normal_count: 0,
      storage_type: 'Demo Storage',
      classified_images: 0,
      average_anomaly_score: 0.85
    });
  };

  const exitDemoMode = useCallback(() => {
    setDemoMode(false);
    setCurrentIndex(0);
  }, []);

  // Define moveToNext function first since it's used by both handleInteresting and handleNotInteresting
  const moveToNext = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleInteresting = async () => {
    if (currentIndex >= anomalies.length) return;

    setAnimateDirection('right');
    
    try {
      // Handle demo mode locally, don't call API
      if (demoMode) {
        // Just update local state for demo mode
        setStats(prev => ({
          ...prev,
          interesting: prev.interesting + 1
        }));
        
        // Wait for animation to complete
        setTimeout(() => {
          moveToNext();
          setAnimateDirection(null);
        }, 500);
      } else {
        // Real mode - call the API
        await submitAnomalyFeedback(anomalies[currentIndex].id, {
          classification: 'Interesting',
        });
        
        setStats(prev => ({
          ...prev,
          interesting: prev.interesting + 1
        }));
        
        // Wait for animation to complete
        setTimeout(() => {
          moveToNext();
          setAnimateDirection(null);
        }, 500);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      // Show error in UI but still proceed to next card to prevent getting stuck
      setTimeout(() => {
        moveToNext();
        setAnimateDirection(null);
      }, 500);
    }
  };

  const handleNotInteresting = async () => {
    if (currentIndex >= anomalies.length) return;
    
    setAnimateDirection('left');
    
    try {
      // Handle demo mode locally, don't call API
      if (demoMode) {
        // Just update local state for demo mode
        setStats(prev => ({
          ...prev,
          notInteresting: prev.notInteresting + 1
        }));
        
        // Wait for animation to complete
        setTimeout(() => {
          moveToNext();
          setAnimateDirection(null);
        }, 500);
      } else {
        // Real mode - call the API
        await submitAnomalyFeedback(anomalies[currentIndex].id, {
          classification: 'Not Interesting',
          is_anomaly: false,
          comments: ''
        });
        
        setStats(prev => ({
          ...prev,
          notInteresting: prev.notInteresting + 1
        }));
        
        // Wait for animation to complete
        setTimeout(() => {
          moveToNext();
          setAnimateDirection(null);
        }, 500);
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      // Show error in UI but still proceed to next card to prevent getting stuck
      setTimeout(() => {
        moveToNext();
        setAnimateDirection(null);
      }, 500);
    }
  };

  // Add this function to fetch similar images - moved above handleKeyNavigation
  const handleFindSimilar = async () => {
    if (!currentAnomaly?.id || fetchingSimilar) return;
    
    setFetchingSimilar(true);
    try {
      if (demoMode) {
        // In demo mode, just show a few of the other demo images
        setTimeout(() => {
          setSimilarImages(
            demoAnomalies
              .filter(a => a.id !== currentAnomaly.id)
              .map(image => ({ 
                image, 
                similarity_score: Math.random() * 0.5 + 0.5 // Random score between 0.5-1.0
              }))
          );
          setShowSimilarImages(true);
          setFetchingSimilar(false);
        }, 1000);
      } else {
        // In real mode, call the API
        const result = await getSimilarImages(currentAnomaly.id, 6, 0.3);
        setSimilarImages(result.similar_images || []);
        setShowSimilarImages(true);
        setFetchingSimilar(false);
      }
    } catch (err) {
      console.error('Error fetching similar images:', err);
      setFetchingSimilar(false);
      alert('Failed to find similar images.');
    }
  };

  // Improved keyboard navigation handler with support for all actions
  const handleKeyNavigation = useCallback((e: KeyboardEvent) => {
    // Don't handle keyboard shortcuts when any modal is open
    if (showDetailedForm || showBatchClassifyForm || showSimilarImages || showKeyboardShortcuts) {
      if (e.key === 'Escape') {
        // Allow Escape to close modals
        if (showKeyboardShortcuts) setShowKeyboardShortcuts(false);
        if (showSimilarImages) setShowSimilarImages(false);
        if (showBatchClassifyForm) setShowBatchClassifyForm(false);
        if (showDetailedForm) setShowDetailedForm(false);
      }
      return;
    }
    
    // Main keyboard navigation when no modals are open
    if (loading || anomalies.length === 0) return;
    
    switch (e.key) {
      case 'ArrowLeft':
        handleNotInteresting();
        break;
      case 'ArrowRight':
        handleInteresting();
        break;
      case 'ArrowDown':
      case 'd': 
        setShowDetailedForm(true);
        break;
      case 'b': 
        setShowBatchClassifyForm(true);
        break;
      case 's': 
        handleFindSimilar();
        break;
      case 'k': 
        setShowKeyboardShortcuts(true);
        break;
      case 'Escape':
        if (demoMode) exitDemoMode();
        break;
      default:
        break;
    }
  }, [
    loading, anomalies.length, demoMode, exitDemoMode,
    handleNotInteresting, handleInteresting, handleFindSimilar,
    showDetailedForm, showBatchClassifyForm, showSimilarImages, showKeyboardShortcuts
  ]);
  
  // Set up automatic sync every 120 minutes
  useEffect(() => {
    // Initial sync when component mounts
    const initialSync = async () => {
      // Don't sync immediately on load, wait a few seconds
      // to allow the UI to render and avoid blocking the main thread
      setTimeout(() => {
        if (!backendConnectionFailed && !demoMode) {
          handleSyncData(true); // silent sync on startup
        }
      }, 5000);
    };

    initialSync();
    
    // Schedule periodic sync every 120 minutes (7,200,000 ms)
    const syncInterval = 120 * 60 * 1000;
    
    syncTimerRef.current = setInterval(() => {
      if (!backendConnectionFailed && !demoMode) {
        console.log('Performing scheduled sync...');
        handleSyncData(true); // silent sync
      }
    }, syncInterval);
    
    // Clean up interval on unmount
    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, [backendConnectionFailed, demoMode]);
  
  // Use separate useEffect for fetching data to control API access
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Only fetch from API when not in demo mode
        if (!demoMode) {
          try {
            // Fetch anomalies, normal images, and statistics in parallel
            const [anomaliesResponse, normalImagesData, statsData] = await Promise.all([
              getAnomalies(),
              getNormalImages(5), // Get up to 5 normal images to mix in
              getStatistics()
            ]);
            
            // Extract anomalies data from the response and ensure it's an array
            const anomaliesData = Array.isArray(anomaliesResponse.data) 
              ? anomaliesResponse.data 
              : anomaliesResponse.data 
                ? [anomaliesResponse.data] 
                : [];
            
            // If we reach here, the backend connection is successful
            setBackendConnectionFailed(false);
            
            // Mix in some normal images with the anomalous ones for better training
            const mixedData = [...anomaliesData];
            
            if (normalImagesData && normalImagesData.length > 0) {
              // Add a normal image every few anomalies
              const normalInterval = Math.max(3, Math.floor(anomaliesData.length / normalImagesData.length));
              
              normalImagesData.forEach((normalImg, index) => {
                const insertPosition = Math.min(
                  (index + 1) * normalInterval, 
                  mixedData.length
                );
                mixedData.splice(insertPosition, 0, normalImg);
              });
            }
            
            // Shuffle the array slightly to make it less predictable
            for (let i = 0; i < mixedData.length; i++) {
              const j = Math.floor(Math.random() * (mixedData.length - i)) + i;
              [mixedData[i], mixedData[j]] = [mixedData[j], mixedData[i]];
            }
            
            setAnomalies(mixedData);
            setApiStats({
              ...statsData,
              storage_type: statsData.storage_type || 'Unknown', // Ensure storage_type is always defined
              classified_images: statsData.classified_images ?? 0, // Provide a default value for classified_images
              average_anomaly_score: statsData.average_anomaly_score ?? 0, // Provide a default value for average_anomaly_score
            });
            
          } catch (err: unknown) {
            console.error('Error connecting to backend:', err);
            setBackendConnectionFailed(true);
            
            // Auto-activate demo mode with warning when backend can't be reached
            startDemoMode();
            
            // Since we're auto-activating demo mode, don't set an error message
            // as that would display the error UI and block the demo mode
            setError(null);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [demoMode]); // Re-run when demo mode changes

  // This useEffect handles demo controls becoming visible
  useEffect(() => {
    if (demoControlsVisible) {
      // Render demo controls into the container provided by the parent
      const demoControlsContainer = document.getElementById('demo-controls-container');
      if (demoControlsContainer) {
        // Add demo mode buttons and controls
        const renderDemoControls = () => {
          if (demoControlsContainer) {
            demoControlsContainer.innerHTML = '';
            
            // Create control buttons
            const startDemoButton = document.createElement('button');
            startDemoButton.className = 'bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors shadow-md mr-3';
            startDemoButton.textContent = 'Start Demo Mode';
            startDemoButton.onclick = () => startDemoMode();
            
            const exitDemoButton = document.createElement('button');
            exitDemoButton.className = 'bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors shadow-md';
            exitDemoButton.textContent = 'Exit Demo Mode';
            exitDemoButton.onclick = () => exitDemoMode();
            
            const statusText = document.createElement('p');
            statusText.className = 'text-sm text-gray-600 dark:text-gray-300 mt-3';
            statusText.textContent = demoMode ? 
              'Demo mode is active: Using example anomalies' : 
              'Demo mode is not active: Using real data';
            
            // Add buttons to container
            demoControlsContainer.appendChild(startDemoButton);
            demoControlsContainer.appendChild(exitDemoButton);
            demoControlsContainer.appendChild(statusText);
          }
        };
        
        renderDemoControls();
      }
      
      // Clean up function
      return () => {
        const demoControlsContainer = document.getElementById('demo-controls-container');
        if (demoControlsContainer) {
          demoControlsContainer.innerHTML = '';
        }
      };
    }
  }, [demoControlsVisible, demoMode, exitDemoMode]);

  useEffect(() => {
    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyNavigation);
    
    return () => {
      window.removeEventListener('keydown', handleKeyNavigation);
    };
  }, [handleKeyNavigation]);
  
  // Function to synchronize anomaly data from external source
  const handleSyncData = async (silent = false) => {
    if (!silent) {
      setSyncStatus({
        syncing: true,
        message: "Synchronizing data from external source...",
        success: null
      });
    }
    
    try {
      const result = await syncAnomalyData();
      
      // Update last sync time
      setLastSyncTime(new Date());
      
      if (!silent) {
        setSyncStatus({
          syncing: false,
          message: result.message,
          success: result.success
        });
      }
      
      // If sync was successful, refresh the data after a short delay
      if (result.success) {
        setTimeout(() => {
          setCurrentIndex(0);
          setBackendConnectionFailed(false);
          
          // Instead of toggling demoMode, trigger a re-fetch directly
          setLoading(true);
          // Use a separate timeout to give React time to update the UI
          setTimeout(() => {
            // Only fetch if we're not in demo mode
            if (!demoMode) {
              const refreshData = async () => {
                try {
                  // Fetch anomalies, normal images, and statistics in parallel
                  const [anomaliesResponse, normalImagesData, statsData] = await Promise.all([
                    getAnomalies(),
                    getNormalImages(5),
                    getStatistics()
                  ]);
                  
                  // Extract anomalies data from the response and ensure it's an array
                  const anomaliesData = Array.isArray(anomaliesResponse.data) 
                    ? anomaliesResponse.data 
                    : anomaliesResponse.data 
                      ? [anomaliesResponse.data] 
                      : [];
                  
                  // Mix in some normal images with the anomalous ones
                  const mixedData = [...anomaliesData];
                  
                  if (normalImagesData && normalImagesData.length > 0) {
                    const normalInterval = Math.max(3, Math.floor(anomaliesData.length / normalImagesData.length));
                    
                    normalImagesData.forEach((normalImg, index) => {
                      const insertPosition = Math.min(
                        (index + 1) * normalInterval, 
                        mixedData.length
                      );
                      mixedData.splice(insertPosition, 0, normalImg);
                    });
                  }
                  
                  setAnomalies(mixedData);
                  setApiStats({
                    ...statsData,
                    storage_type: statsData.storage_type || 'Unknown', // Ensure storage_type is always defined
                    classified_images: statsData.classified_images ?? 0, // Provide a default value for classified_images
                    average_anomaly_score: statsData.average_anomaly_score ?? 0, // Provide a default value for average_anomaly_score
                  });
                } catch (err) {
                  console.error('Error refreshing data:', err);
                  setError('Failed to refresh data after sync.');
                } finally {
                  setLoading(false);
                }
              };
              
              refreshData();
            } else {
              // If in demo mode, just reset loading state
              setLoading(false);
            }
          }, 100);
        }, silent ? 100 : 1000); // Shorter delay for silent sync
      } else {
        // Make sure loading is reset if sync wasn't successful
        setLoading(false);
      }
      
      return result;
    } catch (err: unknown) {
      console.error('Error syncing data:', err);
      
      // Always reset loading state on error
      setLoading(false);
      
      // If this was a silent sync, don't show error UI
      if (err instanceof Error && !silent) {
        setSyncStatus({
          syncing: false,
          message: err instanceof Error ? err.message : 'Failed to sync anomaly data',
          success: false
        });
      }
      
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to sync anomaly data',
        imported_count: 0
      };
    }
  };

  // The main render method
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
        <p>{error}</p>
      </div>
    );
  }

  // If no anomalies found, show empty state with sync button
  if (!anomalies.length && !demoMode) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">No Anomalies Found</h2>
          <p className="text-gray-600 dark:text-gray-300">
            The system hasn&apos;t detected any anomalies yet. You can sync data from external sources or try the demo mode.
          </p>
        </div>

        {/* Connection Error Warning */}
        {backendConnectionFailed && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200 p-4 mb-6 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm">
                  Could not connect to the anomaly detection backend server. Demo mode has been activated automatically.
                  Real anomaly data will not be available until the connection is restored.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sync Data Button */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-10 text-center">
          <h3 className="text-xl font-bold mb-4">Synchronize Anomaly Data</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Import pre-calculated anomaly detection data from external sources.
          </p>
          
          <button
            onClick={() => handleSyncData(false)}
            disabled={syncStatus.syncing}
            className={`${
              syncStatus.syncing 
                ? 'bg-blue-400 cursor-wait' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white py-3 px-8 rounded-lg transition-colors shadow-md flex items-center justify-center mx-auto`}
          >
            {syncStatus.syncing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Synchronizing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Anomaly Data
              </>
            )}
          </button>
          
          {syncStatus.message && (
            <div className={`mt-4 p-3 rounded ${
              syncStatus.success === true 
                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                : syncStatus.success === false
                  ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
              {syncStatus.message}
            </div>
          )}
          
          {lastSyncTime && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Last synced: {lastSyncTime.toLocaleString()}
            </p>
          )}
        </div>

        {/* Demo Mode Button */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-10 text-center">
          <h3 className="text-xl font-bold mb-4">Try Demo Mode</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Want to try out the interface with some example anomalies? Click below to start demo mode.
          </p>
          <button
            onClick={startDemoMode}
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-8 rounded-lg transition-colors shadow-md"
          >
            Start Demo Mode
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic">
            Demo mode uses example images for practice
          </p>
        </div>

        {/* Tutorial Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-10">
          <div className="relative h-72 w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">Astronomical image will appear here</p>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold">Example Anomaly</h3>
                <p className="text-gray-600 dark:text-gray-300">Type: Unknown</p>
              </div>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1 mb-6">
              <p>RA: 210.80225, Dec: 54.34917</p>
              <p>Discovery: 2025-04-25</p>
              <p>Instrument: TESS</p>
            </div>

            {/* Action buttons explanation */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-center">
                <button className="bg-red-500 text-white p-4 rounded-full shadow-md mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <p className="text-sm">Not Interesting</p>
              </div>
              
              <div className="text-center">
                <button className="bg-yellow-500 text-white p-4 rounded-full shadow-md mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <p className="text-sm">Detailed Feedback</p>
              </div>
              
              <div className="text-center">
                <button className="bg-green-500 text-white p-4 rounded-full shadow-md mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <p className="text-sm">Interesting</p>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Mode Button */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-10 text-center">
          <h3 className="text-xl font-bold mb-4">Try Demo Mode</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Want to try out the interface with some example anomalies? Click below to start demo mode.
          </p>
          <button
            onClick={startDemoMode}
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-8 rounded-lg transition-colors shadow-md"
          >
            Start Demo Mode
          </button>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic">
            Demo mode uses example images for practice
          </p>
        </div>

        {/* Keyboard Navigation Tutorial */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-10">
          <h3 className="text-xl font-bold mb-4">Keyboard Navigation</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            You can quickly evaluate anomalies using your keyboard:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="border-2 border-gray-300 dark:border-gray-500 rounded w-12 h-12 flex items-center justify-center mb-3 text-xl">
                ←
              </div>
              <h4 className="font-semibold mb-1">Left Arrow</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Mark as &quot;Not Interesting&quot;</p>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="border-2 border-gray-300 dark:border-gray-500 rounded w-12 h-12 flex items-center justify-center mb-3 text-xl">
                →
              </div>
              <h4 className="font-semibold mb-1">Right Arrow</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Mark as &quot;Interesting&quot;</p>
            </div>
            
            <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="border-2 border-gray-300 dark:border-gray-500 rounded w-12 h-12 flex items-center justify-center mb-3 text-xl">
                ↓
              </div>
              <h4 className="font-semibold mb-1">Down Arrow</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Provide detailed feedback</p>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-gray-500 italic">
              Check back later when anomalies have been detected by the system.
            </p>
          </div>
        </div>

        {/* System information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">System Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xl font-semibold">{apiStats ? apiStats.total_images : 'N/A'}</div>
              <div>Total Images</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xl font-semibold text-amber-500">{apiStats?.anomaly_count ?? 'N/A'}</div>
              <div>Anomalies</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded">
              <div className="text-xl font-semibold text-blue-500">{apiStats?.normal_count ?? 'N/A'}</div>
              <div>Normal</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main view for displaying anomalies

  // Get current anomaly from the array
  const currentAnomaly = anomalies[currentIndex] || {};
  
  // Extract metadata for easier access in the template
  const objectName = currentAnomaly.metadata?.objectName || 'Unknown Object';
  const coordinates = currentAnomaly.coordinates;
  const discoveryDate = currentAnomaly.metadata?.discoveryDate || 'Unknown';
  const instrument = currentAnomaly.metadata?.instrument || 'Unknown';

  // We already have handleFindSimilar defined above, no need for a duplicate

  // Add the missing handleBatchClassify function
  const handleBatchClassify = async () => {
    if (selectedAnomalies.length === 0) return;
    
    setFeedbackSubmitting(true);
    
    try {
      if (demoMode) {
        // In demo mode, just simulate the classification
        setTimeout(() => {
          // Update stats based on classification type
          if (batchClassifyType === 'interesting') {
            setStats(prev => ({
              ...prev,
              interesting: prev.interesting + selectedAnomalies.length
            }));
          } else {
            setStats(prev => ({
              ...prev,
              notInteresting: prev.notInteresting + selectedAnomalies.length
            }));
          }
          
          setFeedbackSubmitting(false);
          setShowBatchClassifyForm(false);
          setSelectedAnomalies([]);
          setBatchClassifyComment('');
          
          // Show success message
          alert(`${selectedAnomalies.length} anomalies have been classified successfully in demo mode.`);
        }, 1000);
      } else {
        // In real mode, call the API
        const result = await submitBatchClassification({
          image_ids: selectedAnomalies,
          is_anomaly: batchClassifyType === 'interesting',
          comment: batchClassifyComment
        });
        
        // Update stats based on classification type
        if (batchClassifyType === 'interesting') {
          setStats(prev => ({
            ...prev,
            interesting: prev.interesting + (result.successful || 0)
          }));
        } else {
          setStats(prev => ({
            ...prev,
            notInteresting: prev.notInteresting + (result.successful || 0)
          }));
        }
        
        setFeedbackSubmitting(false);
        setShowBatchClassifyForm(false);
        setSelectedAnomalies([]);
        setBatchClassifyComment('');
        
        // Show success or partial success message
        if (result.failed > 0) {
          alert(`${result.successful} anomalies classified successfully, but ${result.failed} failed.`);
        } else {
          alert(`${result.successful} anomalies classified successfully!`);
        }
      }
    } catch (err) {
      console.error('Error in batch classification:', err);
      setFeedbackSubmitting(false);
      alert('Failed to classify anomalies. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      
      
      {/* Anomaly card */}
      <div
        ref={containerRef}
        className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-transform duration-500 transform 
          ${animateDirection === 'left' ? '-translate-x-full opacity-0' : animateDirection === 'right' ? 'translate-x-full opacity-0' : ''}`}
      >
        <div className="relative h-56 sm:h-64 md:h-72 w-full">
          {currentAnomaly.imageUrl ? (
            <Image
              src={currentAnomaly.imageUrl}
              alt={String(objectName)}
              fill
              priority={!isImageCached(currentAnomaly.imageUrl)} // Only use priority if not cached
              quality={75}
              style={{ objectFit: 'contain' }}
              className={`bg-black transition-opacity duration-300 ${isImageCached(currentAnomaly.imageUrl) ? 'opacity-100' : 'opacity-0'}`}
              sizes="(max-width: 768px) 100vw, 700px"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QOQvuQAAAABJRU5ErkJggg=="
              onLoad={() => {
                // Ensure this URL is marked as preloaded
                if (currentAnomaly.imageUrl && !preloadedImages.has(currentAnomaly.imageUrl)) {
                  setPreloadedImages(prev => {
                    const set = new Set(prev)
                    if (currentAnomaly.imageUrl) {
                      set.add(currentAnomaly.imageUrl);
                    }
                    return set;
                  })};
                }
              }
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              <p>Image not available</p>
            </div>
          )}
          <div className="absolute top-0 right-0 bg-black/70 text-white px-2 py-1 m-2 rounded text-xs">
            {currentAnomaly.anomaly_score !== undefined ? (
              <>Anomaly Score: {currentAnomaly.anomaly_score.toFixed(2)}</>
            ) : (
              <>Anomaly Score: N/A</>
            )}
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-lg font-bold mb-1">{objectName}</h3>
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5 mb-3">
            {coordinates && (
              <p>RA: {coordinates.ra.toFixed(5)}, Dec: {coordinates.dec.toFixed(5)}</p>
            )}
            <p>Discovery: {discoveryDate}</p>
            <p>Instrument: {instrument}</p>
            
            {/* Find Similar button */}
            <button
              onClick={handleFindSimilar}
              disabled={fetchingSimilar}
              className="mt-1 flex items-center space-x-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm transition-colors"
            >
              {fetchingSimilar ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Finding similar...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Find similar anomalies</span>
                </>
              )}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={handleNotInteresting}
              className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-md transition-colors"
              aria-label="Not interesting"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <button
              onClick={() => setShowDetailedForm(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white p-4 rounded-full shadow-md transition-colors"
              aria-label="Add detailed feedback"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <button
              onClick={handleInteresting}
              className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-md transition-colors"
              aria-label="Interesting"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24  " stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 dark:bg-gray-700">
        <div 
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
          style={{ width: `${((currentIndex) / anomalies.length) * 100}%` }}
        ></div>
      </div>
      
      {/* Keyboard shortcuts reminder */}
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <div className="flex justify-center gap-6">
          <div className="flex flex-col items-center">
            <span className="border border-gray-300 dark:border-gray-600 px-2 py-1 rounded mb-1">←</span>
            <span>Not Interesting</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="border border-gray-300 dark:border-gray-600 px-2 py-1 rounded mb-1">↓</span>
            <span>Detailed Review</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="border border-gray-300 dark:border-gray-600 px-2 py-1 rounded mb-1">→</span>
            <span>Interesting</span>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="mt-8 flex justify-center gap-6 text-sm">
        <div className="text-center">
          <div className="font-bold text-red-500 text-xl">{stats.notInteresting}</div>
          <div className="text-gray-500 dark:text-gray-400">Not Interesting</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-yellow-500 text-xl">{stats.detailed}</div>
          <div className="text-gray-500 dark:text-gray-400">Detailed</div>
        </div>
        <div className="text-center">
          <div className="font-bold text-green-500 text-xl">{stats.interesting}</div>
          <div className="text-gray-500 dark:text-gray-400">Interesting</div>
        </div>
      </div>

      <div className="text-center mb-8">
        {backendConnectionFailed && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200 p-2 mb-3 rounded-md text-sm text-left">
            <p className="flex items-center">
              <svg className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Using demo mode: Backend connection failed
            </p>
          </div>
        )}
        
        {/* Exit Demo Mode Button or Sync Button */}
        <div className="flex justify-center gap-2 mt-3">
          {demoMode ? (
            <button
              onClick={exitDemoMode}
              className="inline-flex items-center text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-1 px-3 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L13.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Exit Demo Mode
            </button>
          ) : (
            <button
              onClick={() => handleSyncData(false)}
              disabled={syncStatus.syncing}
              className="inline-flex items-center text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 py-1 px-3 rounded-full transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${syncStatus.syncing ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 011.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {syncStatus.syncing ? 'Syncing...' : 'Sync Data'}
            </button>
          )}
          
          {lastSyncTime && !demoMode && (
            <span className="text-xs text-gray-500 dark:text-gray-400 self-center ml-1">
              Last sync: {lastSyncTime.toLocaleString()}
            </span>
          )}
        </div>
      </div>
      
      {/* System statistics */}
      <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <h3 className="font-bold text-lg mb-2">System Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-xl font-semibold">{apiStats ? apiStats.total_images : 'N/A'}</div>
            <div>Total Images</div>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-xl font-semibold text-amber-500">{apiStats?.anomaly_count ?? 'N/A'}</div>
            <div>Anomalies</div>
          </div>
          <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="text-xl font-semibold text-blue-500">{apiStats?.normal_count ?? 'N/A'}</div>
            <div>Normal</div>
          </div>
        </div>
        
        {/* Batch Classification Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowBatchClassifyForm(true)}
            className="flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded transition-colors shadow-sm text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span>Batch Classify Similar Images</span>
          </button>
        </div>
      </div>

      {/* Add the batch classification modal */}
      {showBatchClassifyForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Batch Classification</h3>
              <button 
                onClick={() => setShowBatchClassifyForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Select multiple similar anomalies to classify them all at once.
                This is useful for processing groups of similar objects efficiently.
              </p>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Classification Type:</label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-5 w-5 text-blue-600"
                    value="interesting"
                    checked={batchClassifyType === 'interesting'}
                    onChange={() => setBatchClassifyType('interesting')}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Interesting</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio h-5 w-5 text-red-600"
                    value="not_interesting"
                    checked={batchClassifyType === 'not_interesting'}
                    onChange={() => setBatchClassifyType('not_interesting')}
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">Not Interesting</span>
                </label>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Select Similar Images:</label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded">
                {/* Render thumbnails of the anomalies for selection */}
                {anomalies.map((anomaly, index) => (
                  <div 
                    key={anomaly.id} 
                    className={`relative cursor-pointer rounded overflow-hidden border-2 ${
                      selectedAnomalies.includes(anomaly.id) 
                        ? 'border-blue-500 dark:border-blue-400' 
                        : 'border-transparent'
                    }`}
                    onClick={() => {
                      setSelectedAnomalies(prev => 
                        prev.includes(anomaly.id) 
                          ? prev.filter(id => id !== anomaly.id)
                          : [...prev, anomaly.id]
                      );
                    }}
                  >
                    {/* Show a checkmark icon if selected */}
                    {selectedAnomalies.includes(anomaly.id) && (
                      <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Show thumbnail or placeholder */}
                    {anomaly.imageUrl ? (
                      <div className="h-16 w-full relative bg-black">
                        <Image
                          src={anomaly.imageUrl}
                          alt={`Anomaly ${index + 1}`}
                          fill
                          style={{ objectFit: 'cover' }}
                          className="opacity-80 hover:opacity-100 transition-opacity"
                          sizes="(max-width: 768px) 33vw, 100px"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">
                        No Image
                      </div>
                    )}
                    
                    <div className="text-xs text-center p-1">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-1 text-sm">
                {selectedAnomalies.length} anomalies selected
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Comment (optional):
              </label>
              <textarea
                value={batchClassifyComment}
                onChange={(e) => setBatchClassifyComment(e.target.value)}
                rows={3}
                className="w-full p-2 border rounded bg-white dark:bg-gray-700"
                placeholder="Add a comment about these anomalies..."
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleBatchClassify}
                disabled={feedbackSubmitting || selectedAnomalies.length === 0}
                className={`flex-1 ${
                  batchClassifyType === 'interesting' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white py-2 px-4 rounded transition-colors disabled:opacity-50`}
              >
                {feedbackSubmitting ? 'Processing...' : `Classify ${selectedAnomalies.length} Anomalies`}
              </button>
              <button
                type="button"
                onClick={() => setShowBatchClassifyForm(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed feedback form modal with improved accessibility */}
      {showDetailedForm && currentAnomaly && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-fade-in"
            tabIndex={-1} // Make div focusable
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowDetailedForm(false);
              // Tab trap inside modal
              if (e.key === 'Tab') {
                const focusableElements = e.currentTarget.querySelectorAll(
                  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
                
                if (e.shiftKey && document.activeElement === firstElement) {
                  e.preventDefault();
                  lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                  e.preventDefault();
                  firstElement.focus();
                }
              }
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Detailed Feedback</h3>
              <button 
                onClick={() => setShowDetailedForm(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-start">
                {currentAnomaly.imageUrl && (
                  <div className="flex-shrink-0 w-20 h-20 relative mr-4 overflow-hidden rounded bg-black">
                    <Image
                      src={currentAnomaly.imageUrl}
                      alt={String(objectName)}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="opacity-90"
                      sizes="80px"
                    />
                  </div>
                )}
                <div>
                  <h4 className="font-medium text-lg">{objectName}</h4>
                  {coordinates && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      RA {coordinates.ra.toFixed(5)}, Dec {coordinates.dec.toFixed(5)}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-300">Discovered: {discoveryDate}</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              setFeedbackSubmitting(true);
              
              // Handle form submission with delay to simulate API call
              setTimeout(() => {
                // In demo mode, just update local state
                if (demoMode) {
                  setStats(prev => ({
                    ...prev,
                    detailed: prev.detailed + 1
                  }));
                  
                  // Update the current anomaly with the feedback
                  const updatedAnomalies = [...anomalies];
                  if (updatedAnomalies[currentIndex]) {
                    updatedAnomalies[currentIndex] = {
                      ...updatedAnomalies[currentIndex],
                      userFeedback: {
                        classification,
                        comments
                      }
                    };
                    setAnomalies(updatedAnomalies);
                  }
                } else {
                  // Real mode - call API
                  submitAnomalyFeedback(currentAnomaly.id, {
                    classification,
                    comments,
                    is_anomaly: classification !== 'Not Interesting'
                  }).then(updatedAnomaly => {
                    if (updatedAnomaly) {
                      // Update the anomalies array with the updated anomaly
                      const updatedAnomalies = [...anomalies];
                      updatedAnomalies[currentIndex] = updatedAnomaly;
                      setAnomalies(updatedAnomalies);
                    }
                    
                    setStats(prev => ({
                      ...prev,
                      detailed: prev.detailed + 1
                    }));
                  }).catch(err => {
                    console.error('Error submitting detailed feedback:', err);
                  });
                }
                
                // Reset form state
                setFeedbackSubmitting(false);
                setShowDetailedForm(false);
                setClassification('');
                setComments('');
                
                // Move to the next anomaly after submission
                setTimeout(() => {
                  moveToNext();
                }, 300);
              }, 800);
            }} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="classification">
                  Classification:
                </label>
                <select
                  id="classification"
                  value={classification}
                  onChange={(e) => setClassification(e.target.value)}
                  className="w-full p-3 border rounded-lg shadow-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                  required
                  aria-required="true"
                  autoFocus
                >
                  <option value="">Select a classification</option>
                  <optgroup label="Astronomical Objects">
                    <option value="Star">Star</option>
                    <option value="Galaxy">Galaxy</option>
                    <option value="Nebula">Nebula</option>
                    <option value="Quasar">Quasar</option>
                    <option value="Supernova">Supernova</option>
                    <option value="Planet">Planet</option>
                    <option value="Asteroid">Asteroid</option>
                    <option value="Comet">Comet</option>
                    <option value="Black Hole">Black Hole</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="Cosmic Ray">Cosmic Ray</option>
                    <option value="Sensor Artifact">Sensor Artifact</option>
                    <option value="Not Interesting">Not Interesting</option>
                    <option value="Other">Other Classification</option>
                  </optgroup>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300" htmlFor="comments">
                  Comments:
                </label>
                <textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={4}
                  className="w-full p-3 border rounded-lg shadow-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Add any additional observations or notes about this anomaly..."
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={feedbackSubmitting || !classification}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors shadow-md disabled:bg-blue-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {feedbackSubmitting ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </div>
                  ) : 'Submit Feedback'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDetailedForm(false)}
                  className="sm:flex-none sm:w-auto w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </form>
            
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Keyboard shortcuts</h4>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                <div>
                  <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded mr-1">Tab</span>
                  Navigate inputs
                </div>
                <div>
                  <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded mr-1">Enter</span>
                  Submit form
                </div>
                <div>
                  <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded mr-1">Esc</span>
                  Close dialog
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Similar Images Modal - Improved UI and keyboard navigation */}
      {showSimilarImages && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-fade-in"
            tabIndex={-1} // Make div focusable
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowSimilarImages(false);
              // Tab trap inside modal
              if (e.key === 'Tab') {
                const focusableElements = e.currentTarget.querySelectorAll(
                  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
                
                if (e.shiftKey && document.activeElement === firstElement) {
                  e.preventDefault();
                  lastElement.focus();
                } else if (!e.shiftKey && document.activeElement === lastElement) {
                  e.preventDefault();
                  firstElement.focus();
                }
              }
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Similar Images</h3>
              <button 
                onClick={() => setShowSimilarImages(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1"
                aria-label="Close modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {fetchingSimilar ? (
              <div className="flex flex-col items-center justify-center p-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Finding similar anomalies...</p>
              </div>
            ) : similarImages.length === 0 ? (
              <div className="text-center py-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="text-gray-600 dark:text-gray-300">No similar images found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {similarImages.map((img, index) => (
                  <div key={index} className="relative h-32 w-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden rounded">
                    <Image
                      src={img.image.imageUrl || '/fallback-image.jpg'}
                      alt={`Similar image ${index + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                      className="transition-opacity duration-300 opacity-100"
                      sizes="(max-width: 768px) 50vw, 150px"
                    />
                    <div className="absolute bottom-0 left-0 bg-black/70 text-white text-xs px-2 py-1">
                      Similarity: {(img.similarity_score * 100).toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
