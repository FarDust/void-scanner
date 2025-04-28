// A lightweight LRU (Least Recently Used) image cache implementation with localStorage persistence
// This provides client-side caching without excessive memory usage and persists between sessions

import { useEffect, useState, useRef, useCallback } from 'react';

// Define a small fixed cache size to prevent excessive memory usage
const MAX_CACHE_SIZE = 25; // Limit to 25 images in cache
const LOCAL_STORAGE_KEY = 'void_scanner_image_cache';
const CACHE_VERSION = '1.0';

// Track last access time for each image to implement LRU strategy
interface CacheEntry {
  data: HTMLImageElement;
  lastAccessed: number;
  url: string; // Store URL to rebuild cache from localStorage
}

interface StorableCacheEntry {
  url: string;
  lastAccessed: number;
  timestamp: number; // When this entry was stored
}

interface LocalStorageCacheData {
  version: string;
  entries: Record<string, StorableCacheEntry>;
  lastCleanup: number;
}

// Create a global cache that persists between component renders
// but doesn't consume memory after the application is closed
const globalImageCache = new Map<string, CacheEntry>();
let lastStorageUpdateTime = 0;

// Initialize cache from localStorage when module loads
const initCacheFromLocalStorage = () => {
  if (typeof window === 'undefined') return; // Skip during SSR

  try {
    const storedCache = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!storedCache) return;
    
    const parsedCache = JSON.parse(storedCache) as LocalStorageCacheData;
    
    // Skip if version mismatch, which would happen if we change the cache structure
    if (parsedCache.version !== CACHE_VERSION) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }
    
    // Load images from localStorage keys
    const entries = parsedCache.entries;
    const urls = Object.keys(entries);
    
    // Only load a limited number of the most recently used entries
    urls
      .sort((a, b) => entries[b].lastAccessed - entries[a].lastAccessed)
      .slice(0, MAX_CACHE_SIZE)
      .forEach(url => {
        const entry = entries[url];
        // Preload image
        const img = new Image();
        img.src = url;
        // Once loaded, add to runtime cache
        img.onload = () => {
          globalImageCache.set(url, {
            data: img,
            lastAccessed: entry.lastAccessed,
            url: url
          });
        };
      });
    
    console.log(`Restored ${urls.length} images from localStorage cache`);
  } catch (error) {
    console.error('Failed to restore image cache from localStorage:', error);
    // Clear potentially corrupted cache
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
};

// Try to restore cache when module loads (only client-side)
if (typeof window !== 'undefined') {
  initCacheFromLocalStorage();
}

/**
 * Custom hook for efficiently caching and loading images
 * Uses an LRU (Least Recently Used) strategy to limit memory usage
 * Persists cache to localStorage between sessions
 */
export function useImageCache() {
  // Track cache statistics for monitoring
  const [stats, setStats] = useState({
    hits: 0,
    misses: 0,
    size: 0,
    localStorageSize: 0,
  });
  
  // Use ref for tracking if localStorage needs update
  const needsUpdate = useRef(false);
  
  // Track if this is the first render
  const firstRenderRef = useRef(true);

  // Update localStorage when cache changes, but avoid state updates here
  const updateLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return; // Skip during SSR
    
    // Throttle updates - only allow once every 10 seconds
    const now = Date.now();
    if (now - lastStorageUpdateTime < 10000) {
      // Schedule an update for later and return
      needsUpdate.current = true;
      return;
    }
    
    try {
      // Create a smaller representation of the cache for localStorage
      const storableEntries: Record<string, StorableCacheEntry> = {};
      
      globalImageCache.forEach((entry, url) => {
        storableEntries[url] = {
          url,
          lastAccessed: entry.lastAccessed,
          timestamp: now
        };
      });
      
      const cacheData: LocalStorageCacheData = {
        version: CACHE_VERSION,
        entries: storableEntries,
        lastCleanup: now
      };
      
      // Store in localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cacheData));
      lastStorageUpdateTime = now;
      needsUpdate.current = false;
      
      // Get localStorage size for stats - but don't update state here
      // as that would trigger a render and potentially another useEffect call
      const localStorageSize = localStorage.getItem(LOCAL_STORAGE_KEY)?.length || 0;
      
      // We'll update stats in a separate effect, to avoid the infinite loop
    } catch (error) {
      console.error('Failed to update localStorage cache:', error);
    }
  }, []);

  // Update stats from global cache periodically, not on every cache change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initial stats update
    if (firstRenderRef.current) {
      setStats(prev => ({ 
        ...prev, 
        size: globalImageCache.size,
        localStorageSize: localStorage.getItem(LOCAL_STORAGE_KEY)?.length || 0
      }));
      firstRenderRef.current = false;
    }
    
    // Periodically update stats
    const statsInterval = setInterval(() => {
      setStats(prev => ({ 
        ...prev, 
        size: globalImageCache.size,
        localStorageSize: localStorage.getItem(LOCAL_STORAGE_KEY)?.length || 0
      }));
    }, 5000);
    
    return () => clearInterval(statsInterval);
  }, []);

  // Periodically update localStorage with current cache state
  useEffect(() => {
    // Don't run during SSR
    if (typeof window === 'undefined') return;
    
    // Update localStorage every 30 seconds to avoid excessive writes
    const interval = setInterval(() => {
      if (globalImageCache.size > 0 || needsUpdate.current) {
        updateLocalStorage();
      }
    }, 30000);
    
    // Update on unmount
    return () => {
      clearInterval(interval);
      if (needsUpdate.current) {
        updateLocalStorage();
      }
    };
  }, [updateLocalStorage]);

  /**
   * Preload and cache an image
   * @param url The URL of the image to preload
   * @returns Promise that resolves when image is loaded and cached
   */
  const preloadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // Skip undefined or null URLs
      if (!url) {
        reject(new Error('Invalid image URL: undefined or null'));
        return;
      }

      // Normalize URL to ensure consistent cache keys
      let normalizedUrl = url;
      try {
        // For URLs with http/https, ensure they're properly formatted
        if (url.startsWith('http')) {
          const urlObj = new URL(url);
          normalizedUrl = urlObj.toString();
        }
      } catch (e) {
        console.warn(`Failed to normalize URL: ${url}`, e);
      }

      // Check if the image is already in the cache
      if (globalImageCache.has(normalizedUrl)) {
        // Update the last accessed time for this entry
        const entry = globalImageCache.get(normalizedUrl)!;
        entry.lastAccessed = Date.now();
        globalImageCache.set(normalizedUrl, entry);
        
        // Increment hit count
        setStats(prev => ({ ...prev, hits: prev.hits + 1 }));
        
        // Resolve with cached image
        resolve(entry.data);
        return;
      }
      
      // If not in cache, increment miss count
      setStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      
      // If not in cache, load the image
      const img = new Image();
      
      img.onload = () => {
        // Check if we need to evict items from the cache
        if (globalImageCache.size >= MAX_CACHE_SIZE) {
          // Find the least recently accessed entry
          let oldestUrl: string | null = null;
          let oldestTime = Infinity;
          
          globalImageCache.forEach((entry, entryUrl) => {
            if (entry.lastAccessed < oldestTime) {
              oldestTime = entry.lastAccessed;
              oldestUrl = entryUrl;
            }
          });
          
          // Remove the oldest entry
          if (oldestUrl) {
            globalImageCache.delete(oldestUrl);
          }
        }
        
        // Add new image to cache with current timestamp
        globalImageCache.set(normalizedUrl, {
          data: img,
          lastAccessed: Date.now(),
          url: normalizedUrl
        });
        
        // Mark that cache has changed and needs to be saved
        needsUpdate.current = true;
        
        // Update stats in next tick to avoid triggering renders during render
        setTimeout(() => {
          setStats(prev => ({ ...prev, size: globalImageCache.size }));
        }, 0);
        
        resolve(img);
      };
      
      img.onerror = (e) => {
        console.error(`Failed to load image: ${normalizedUrl}`, e);
        reject(new Error(`Failed to load image: ${normalizedUrl}`));
      };
      
      // Start loading the image
      img.crossOrigin = "anonymous"; // Enable CORS for images from other domains
      img.src = normalizedUrl;
    });
  }, []);

  /**
   * Check if an image is already in the cache
   * @param url The image URL to check
   * @returns True if image is cached, false otherwise
   */
  const isImageCached = useCallback((url: string): boolean => {
    if (!url) return false;
    
    // Normalize URL to match how it's stored
    let normalizedUrl = url;
    try {
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        normalizedUrl = urlObj.toString();
      }
    } catch (e) {
      console.warn(`Failed to normalize URL in isImageCached: ${url}`, e);
    }
    
    const isCached = globalImageCache.has(normalizedUrl);
    
    // If it's cached, update last accessed time but don't trigger state update
    if (isCached) {
      const entry = globalImageCache.get(normalizedUrl)!;
      entry.lastAccessed = Date.now();
      globalImageCache.set(normalizedUrl, entry);
    }
    
    return isCached;
  }, []);

  /**
   * Clear the entire image cache (both memory and localStorage)
   */
  const clearCache = useCallback(() => {
    globalImageCache.clear();
    
    // Clear localStorage cache as well
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
    
    setStats({ hits: 0, misses: 0, size: 0, localStorageSize: 0 });
  }, []);

  /**
   * Remove specific images from cache
   * @param urls Array of image URLs to remove from cache
   */
  const removeFromCache = useCallback((urls: string[]) => {
    urls.forEach(url => {
      globalImageCache.delete(url);
    });
    needsUpdate.current = true;
  }, []);

  /**
   * Preload multiple images in sequence or parallel
   * @param urls Array of image URLs to preload
   * @param parallel Whether to load images in parallel (true) or sequence (false)
   */
  const preloadImages = useCallback(async (urls: string[], parallel = true) => {
    if (!urls || !Array.isArray(urls)) {
      console.warn('Invalid URLs provided to preloadImages:', urls);
      return;
    }
    
    // Filter out empty or invalid URLs
    const validUrls = urls.filter(url => url && typeof url === 'string');
    
    if (validUrls.length === 0) {
      return; // Nothing to preload
    }

    if (parallel) {
      // Load all images in parallel
      await Promise.allSettled(validUrls.map(url => preloadImage(url)));
    } else {
      // Load images in sequence (reduces network contention)
      for (const url of validUrls) {
        try {
          await preloadImage(url);
        } catch (error) {
          console.error(`Failed to preload image: ${url}`, error);
        }
      }
    }
  }, [preloadImage]);

  return {
    preloadImage,
    preloadImages,
    isImageCached,
    clearCache,
    removeFromCache,
    cacheStats: stats,
  };
}