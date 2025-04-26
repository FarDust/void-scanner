'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnomalyObject, getAnomalies } from '../services/anomalyService';
import AnomalyCard from './AnomalyCard';
import SyncDataPanel from './SyncDataPanel';
import { useImageCache } from '../services/imageCache';

// Demo data for when API is unavailable
const demoAnomalies: AnomalyObject[] = [
  {
    id: 'demo-001',
    file_path: '',
    is_anomaly: true,
    confidence: 0.87,
    type: 'Training Example',
    imageUrl: 'https://science.nasa.gov/wp-content/uploads/2023/04/opo0019b-jpg.webp?w=700g',
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
    confidence: 0.92,
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
    confidence: 0.78,
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

export default function AnomalyDashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  // Use our custom image cache hook
  const { preloadImage, preloadImages, isImageCached, cacheStats } = useImageCache();
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Filtering state
  const [activeFilters, setActiveFilters] = useState<{
    confidenceThreshold: number; 
    showOnlyUnclassified: boolean;
  }>({
    confidenceThreshold: 0,
    showOnlyUnclassified: false
  });
  
  // Loading state for infinite scroll
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Refs for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);

  // Define fetchAnomalies as a useCallback with proper dependencies
  const fetchAnomalies = useCallback(async (isRefresh = false, pageNum = 1) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        // Reset pagination when refreshing
        pageNum = 1;
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Use the paginated API
      const response = await getAnomalies(pageNum, 9);
      
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
        .filter(a => a.imageUrl && !isImageCached(a.imageUrl))
        .map(a => a.imageUrl as string);
        
      if (imagesToPreload.length > 0) {
        // Don't await this to avoid blocking UI
        preloadImages(imagesToPreload, true).catch(err => {
          console.error("Error preloading new batch of images:", err);
        });
      }
      
      setError(null);
      setIsDemoMode(false);
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      setError('Failed to load data from the API. Showing demo data instead.');
      
      // Only replace with demo data if this is the first page
      if (pageNum === 1) {
        setAnomalies(demoAnomalies);
        setIsDemoMode(true);
        
        // Preload demo images
        const demoImagesToPreload = demoAnomalies
          .filter(a => a.imageUrl && !isImageCached(a.imageUrl))
          .map(a => a.imageUrl as string);
          
        if (demoImagesToPreload.length > 0) {
          preloadImages(demoImagesToPreload, true).catch(err => {
            console.error("Error preloading demo images:", err);
          });
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [isImageCached, preloadImages]); // Add cache dependencies

  // Initial data load
  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);
  
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
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore && !refreshing) {
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

  // Calculate statistics
  const highConfidenceCount = anomalies.filter(a => a.confidence && a.confidence > 0.9).length;
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
      
      {/* Fixed height for SyncDataPanel section */}
      <div className="mb-8 mt-8" style={{ height: '220px' }}>
        <SyncDataPanel onDataRefreshed={handleDataRefresh} />
      </div>
      
      {/* Fixed height for demo mode notice */}
      <div style={{ height: isDemoMode ? '60px' : '0px', overflow: 'hidden' }}>
        {isDemoMode && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
            <p className="flex items-center">
              <svg className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Demo Mode: Using example data because the API is unavailable
            </p>
          </div>
        )}
      </div>
      
      {/* Stats summary with fixed height */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8" style={{ height: '120px' }}>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col justify-center">
          <h3 className="text-lg font-semibold mb-1">Total Objects</h3>
          <p className="text-3xl font-bold">
            {loading && page === 1 ? (
              <span className="inline-block w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
            ) : (
              isDemoMode ? demoAnomalies.length : totalCount
            )}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col justify-center">
          <h3 className="text-lg font-semibold mb-1">High Confidence</h3>
          <p className="text-3xl font-bold">
            {loading && page === 1 ? (
              <span className="inline-block w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></span>
            ) : (
              highConfidenceCount
            )}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col justify-center">
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

      {/* Fixed height error section */}
      <div style={{ height: error && !isDemoMode ? 'auto' : '0px', minHeight: '40px', overflow: 'hidden' }}>
        {error && !isDemoMode && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        )}
      </div>
      
      {/* Main content grid with minimum height */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[400px]">
        {loading && page === 1 ? (
          // Initial loading skeletons
          renderSkeletonCards(9)
        ) : anomalies.length > 0 ? (
          // Normal display of anomaly cards
          anomalies.map((anomaly) => (
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
              No anomalies found. Try syncing data first.
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
      {anomalies.length > 0 && !isDemoMode && (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-4 mb-8">
          Showing {anomalies.length} of {totalCount} anomalies
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