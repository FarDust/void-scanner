'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnomalyObject, getAnomalies, getStatistics } from '../services/anomalyService';
import AnomalyCard from './AnomalyCard';
import { useImageCache } from '../services/imageCache';

// Custom hook for debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Type for statistics from backend
interface AnomalyStats {
  total_images: number;
  anomaly_count: number;
  normal_count: number;
  processing_time_avg: number;
  storage_type?: string;
  storage_location?: string;
  anomalies_detected?: number;
  classified_images?: number;
  average_anomaly_score?: number;
}

export default function AnomalyDashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Use our custom image cache hook
  const { preloadImages, isImageCached, cacheStats } = useImageCache();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Dashboard filter states
  const [showAnomaliesOnly, setShowAnomaliesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'score'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use ref for lastFetchTime instead of state to avoid render loops
  const lastFetchTimeRef = useRef(0);

  // Debounce filters to prevent excessive API calls
  const debouncedAnomaliesOnly = useDebounce(showAnomaliesOnly, 500);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  
  // Keep track of mounted state to prevent updates on unmounted component
  const isMounted = useRef(true);
  
  // Track API availability status and consecutive failures
  const apiAvailabilityRef = useRef({
    available: true,
    consecutiveFailures: 0,
    lastAttempt: 0,
    backoffTime: 2000, // Initial backoff time in ms (2 seconds)
    maxBackoff: 60000, // Maximum backoff time (1 minute)
  });
  
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Refs for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  // Define fetchAnomalies as a useCallback with proper dependencies
  const fetchAnomalies = useCallback(async (isRefresh = false, pageNum = 1) => {
    // Check API availability status
    const now = Date.now();
    const apiStatus = apiAvailabilityRef.current;
    
    // If we're in demo mode and API was unavailable, implement exponential backoff
    if (isDemoMode && !apiStatus.available) {
      // Calculate if enough time has passed since last attempt based on backoff time
      const timeElapsed = now - apiStatus.lastAttempt;
      if (timeElapsed < apiStatus.backoffTime && !isRefresh) {
        console.log(`Skipping API call, in backoff period. Next attempt in ${Math.ceil((apiStatus.backoffTime - timeElapsed)/1000)}s`);
        return;
      }
    }
    
    // Standard rate limiting for normal operation - prevent fetching more than once every 5 seconds
    if (now - lastFetchTimeRef.current < 5000 && !isRefresh && pageNum > 1) {
      console.log('Rate limited API call, skipping fetch');
      return;
    }
    
    try {
      // Update last attempt time for backoff calculations
      apiStatus.lastAttempt = now;
      
      if (isRefresh) {
        setRefreshing(true);
        // Reset pagination when refreshing
        pageNum = 1;
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Update last fetch time using ref instead of state
      lastFetchTimeRef.current = now;
      
      // Use the paginated API with the correct parameters
      const pageSize = 9; // Keep this consistent with the OpenAPI spec
      const response = await getAnomalies(pageNum, pageSize, debouncedAnomaliesOnly);
      
      // The getAnomalies function now returns a different structure that matches the OpenAPI spec
      const newAnomalies = response.data;
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
      setHasMore(pageNum < response.totalPages);
      
      // If refreshing or first page, replace the array
      // If loading more, append to the existing array but prevent duplicates
      if (isRefresh || pageNum === 1) {
        setAnomalies(newAnomalies);
        setPage(1);
      } else {
        // Use a Map to track unique anomalies by ID
        setAnomalies(prev => {
          // Create a Map of existing anomalies
          const existingAnomaliesMap = new Map(
            prev.map(anomaly => [anomaly.id, anomaly])
          );
          
          // Add only new, non-duplicate anomalies
          newAnomalies.forEach(anomaly => {
            if (!existingAnomaliesMap.has(anomaly.id)) {
              existingAnomaliesMap.set(anomaly.id, anomaly);
            }
          });
          
          // Convert Map back to array
          return Array.from(existingAnomaliesMap.values());
        });
      }
      
      // Preload images from this batch
      const imagesToPreload = newAnomalies
        .filter(a => a.id && (!a.imageUrl || !isImageCached(a.imageUrl)))
        .map(a => a.imageUrl || `/images/${a.id}/file`);
        
      if (imagesToPreload.length > 0) {
        // Don't await this to avoid blocking UI
        preloadImages(imagesToPreload, true).catch(err => {
          console.error("Error preloading new batch of images:", err);
        });
      }
      
      setError(null);
      setIsDemoMode(false);
      
      // Reset API availability status after successful call
      apiStatus.available = true;
      apiStatus.consecutiveFailures = 0;
      apiStatus.backoffTime = 2000; // Reset backoff time
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      
      // Update API availability status
      apiStatus.available = false;
      apiStatus.consecutiveFailures += 1;
      
      // Implement exponential backoff with jitter
      // Double the backoff time with each consecutive failure, add small random jitter, cap at maximum
      const jitter = Math.random() * 1000; // Random value between 0-1000ms
      apiStatus.backoffTime = Math.min(apiStatus.backoffTime * 2 + jitter, apiStatus.maxBackoff);
      
      console.log(`API unavailable. Consecutive failures: ${apiStatus.consecutiveFailures}. Next attempt in ${Math.ceil(apiStatus.backoffTime/1000)}s`);
      
      setError(`Failed to load data from the API. Will retry in ${Math.ceil(apiStatus.backoffTime/1000)} seconds.`);
      setIsDemoMode(false);
      
      // Instead of using hardcoded demo data, display an empty state
      if (pageNum === 1) {
        setAnomalies([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [isImageCached, preloadImages, debouncedAnomaliesOnly, isDemoMode]);

  // Initial data load - Fetch when anomaliesOnly filter changes (debounced)
  useEffect(() => {
    // Reset to page 1 when filter changes
    setPage(1);
    fetchAnomalies(false, 1);
  }, [debouncedAnomaliesOnly, fetchAnomalies]);
  
  // Setup intersection observer for infinite scroll
  useEffect(() => {
    // Disconnect previous observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    // Create a new observer for the loading element
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // If the loading element is visible and we're not already loading
        // Also check API availability to prevent excessive requests when API is down
        if (entries[0].isIntersecting && 
            hasMore && 
            !loading && 
            !loadingMore && 
            !refreshing && 
            (apiAvailabilityRef.current.available || 
             Date.now() - apiAvailabilityRef.current.lastAttempt >= apiAvailabilityRef.current.backoffTime)) {
          // Load the next page
          setPage(prevPage => {
            const nextPage = prevPage + 1;
            fetchAnomalies(false, nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 0.1 }
    );
    
    // Observe the loading element if it exists
    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }
    
    // Cleanup observer on unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchAnomalies, hasMore, loading, loadingMore, refreshing]);

  // Periodically check API availability if in error state
  useEffect(() => {
    let retryTimer: NodeJS.Timeout | null = null;
    
    if (apiAvailabilityRef.current.consecutiveFailures > 0) {
      retryTimer = setTimeout(() => {
        console.log("Attempting to reconnect to the API...");
        fetchAnomalies(true); // Force refresh to try reconnecting
      }, apiAvailabilityRef.current.backoffTime);
    }
    
    return () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [error, fetchAnomalies]);

  // Filter and sort anomalies based on user selection
  const filteredAnomalies = useMemo(() => {
    let result = [...anomalies];
    
    // Apply search filter if query exists
    if (debouncedSearchQuery) {
      const lowerQuery = debouncedSearchQuery.toLowerCase();
      result = result.filter(anomaly => 
        anomaly.id?.toLowerCase().includes(lowerQuery) || 
        anomaly.type?.toLowerCase().includes(lowerQuery) ||
        anomaly.metadata?.objectName?.toLowerCase().includes(lowerQuery) ||
        anomaly.metadata?.instrument?.toLowerCase().includes(lowerQuery) ||
        anomaly.filename?.toLowerCase().includes(lowerQuery) ||
        anomaly.file_path?.toLowerCase().includes(lowerQuery)
      );
    }
    
    // Sort based on selection
    if (sortBy === 'recent') {
      result.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA; // Most recent first
      });
    } else if (sortBy === 'score') {
      result.sort((a, b) => {
        const scoreA = a.anomaly_score || 0;
        const scoreB = b.anomaly_score || 0;
        return scoreB - scoreA; // Highest score first
      });
    }
    
    return result;
  }, [anomalies, sortBy, debouncedSearchQuery]);

  // Function to trigger a refresh from child components
  const handleDataRefresh = () => {
    fetchAnomalies(true);
  };

  // Update the local state when feedback is submitted
  const handleFeedbackSubmit = (updatedAnomaly: AnomalyObject) => {
    setAnomalies(currentAnomalies => 
      currentAnomalies.map(anomaly => 
        anomaly.id === updatedAnomaly.id ? updatedAnomaly : anomaly
      )
    );
    setFeedbackCount(prev => prev + 1);
  };

  // Toggle anomalies filter
  const toggleAnomaliesFilter = () => {
    setShowAnomaliesOnly(prev => !prev);
    // Actual data fetch will be triggered by the useEffect with debouncedAnomaliesOnly dependency
  };

  // Toggle sort method
  const toggleSortMethod = () => {
    setSortBy(prev => prev === 'recent' ? 'score' : 'recent');
  };

  // Calculate statistics
  const feedbackSubmitted = anomalies.filter(a => a.userFeedback).length;

  // Render skeleton cards during loading
  const renderSkeletonCards = (count = 3) => {
    return Array(count).fill(0).map((_, index) => (
      <div key={`skeleton-${index}`} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-64 bg-gray-200 dark:bg-gray-700"></div>
          <div className="p-5">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mt-4"></div>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Fixed height header section */}
      <div className="min-h-[60px]">
        <h1 className="text-3xl font-bold mb-2">Anomalous Objects Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">
          Help us analyze potential anomalies detected in astronomical data
        </p>
      </div>
      
      {/* Search and filter controls */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <button
            onClick={toggleAnomaliesFilter}
            className={`px-4 py-2 rounded ${showAnomaliesOnly ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
          >
            {showAnomaliesOnly ? 'Showing Anomalies Only' : 'Show All Images'}
          </button>
        </div>
        
        <div className="flex flex-wrap items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search anomalies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
          
          <button
            onClick={toggleSortMethod}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
          >
            Sort: {sortBy === 'recent' ? 'Most Recent' : 'Highest Score'}
          </button>
        </div>
      </div>
      
      {/* Error message container with flexible height */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p className="flex items-center">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
            {apiAvailabilityRef.current.consecutiveFailures > 0 && (
              <span className="ml-2">
                (Retry in {Math.ceil((apiAvailabilityRef.current.backoffTime - (Date.now() - apiAvailabilityRef.current.lastAttempt))/1000)}s)
              </span>
            )}
          </p>
        </div>
      )}
      
      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-1">Total Objects</h3>
          <p className="text-3xl font-bold">
            {loading && page === 1 ? (
              <span className="inline-block w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
            ) : (
              totalCount
            )}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-1">Feedback Received</h3>
          <p className="text-3xl font-bold">
            {loading && page === 1 ? (
              <span className="inline-block w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
            ) : (
              feedbackSubmitted
            )}
          </p>
        </div>
      </div>
      
      {/* Main content - grid view only */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
        {loading && page === 1 ? (
          // Initial loading skeletons
          renderSkeletonCards(9)
        ) : filteredAnomalies.length > 0 ? (
          // Render anomalies
          filteredAnomalies.map(anomaly => (
            <AnomalyCard
              key={anomaly.id}
              anomaly={anomaly}
              onFeedbackSubmit={handleFeedbackSubmit}
            />
          ))
        ) : (
          // Empty state
          <div className="col-span-full flex items-center justify-center h-80">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {searchQuery ? 'No results matching your search query.' : 'No anomalies found. Try syncing data first.'}
            </p>
          </div>
        )}
      </div>
      
      {/* Loading indicator for infinite scroll */}
      {(hasMore && !loading && anomalies.length > 0) && (
        <div 
          ref={loadingRef} 
          className="flex justify-center items-center py-8 col-span-full"
        >
          {loadingMore ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          ) : (
            <div className="h-8 w-full"></div> // Invisible element for the observer
          )}
        </div>
      )}
      
      {/* Pagination info */}
      {filteredAnomalies.length > 0 && !isDemoMode && (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-4 mb-8">
          {searchQuery ? `Showing ${filteredAnomalies.length} results` : `Showing ${anomalies.length} of ${totalCount} anomalies`}
        </div>
      )}

      {/* Real-time feedback notification */}
      {feedbackCount > 0 && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 animate-pulse">
          Thank you! {feedbackCount} contribution{feedbackCount > 1 ? 's' : ''} submitted
        </div>
      )}
    </div>
  );
}