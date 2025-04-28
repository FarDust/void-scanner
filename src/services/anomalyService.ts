// Real service for anomaly detection connected to the backend API

// Types matching the API schema
export interface AnomalyObject {
  id: string;
  file_path?: string;
  filename?: string;
  timestamp?: string;
  reconstruction_error?: number;
  is_anomaly: boolean;
  anomaly_score?: number;
  path?: string;
  
  // Additional fields for our frontend
  classification?: string;
  comment?: string;
  type?: string;
  coordinates?: {
    ra: number; // Right ascension
    dec: number; // Declination
  };
  metadata?: Record<string, any>;
  processing_time?: number;
  imageUrl?: string;
  userFeedback?: {
    classification?: string;
    comments?: string;
    rating?: number;
  };
}

// API endpoint paths from OpenAPI spec
const API_ENDPOINTS = {
  HEALTH: '/health',
  PROCESS: '/process',
  PROCESS_DIRECTORY: '/process/',
  GET_IMAGES: '/images/',
  GET_IMAGE_DETAILS: (id: string) => `/images/${id}`,
  GET_IMAGE_FILE: (id: string) => `/images/${id}/file`,
  CLASSIFY_IMAGE: (id: string) => `/images/${id}/classify`,
  STATISTICS: '/statistics',
  SYNC_ANOMALY_DATA: '/sync-anomaly-data'
};

// Base API URL - can be configured in .env.local with NEXT_PUBLIC_API_URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Helper function to handle API errors
 */
const handleApiError = (err: any): never => {
  console.error('API Error:', err);
  throw new Error(err?.message || 'An error occurred while fetching data');
};

/**
 * Parse information from TESS image filenames
 * Example: hlsp_tica_tess_ffi_s0027-o1-00117223-cam1-ccd1_tess_v01_img_1505.9586181640625_1578.3509521484375.png
 */
export const parseFilenameInfo = (filename: string): { 
  coordinates: {x: number, y: number},
  instrument: string, 
  sector?: string,
  camera?: string,
  ccd?: string
} => {
  // Default return object
  const result = {
    coordinates: { x: 0, y: 0 },
    instrument: 'Unknown'
  };
  
  try {
    // Extract coordinates from the end of the filename
    const coordsMatch = filename.match(/_(\d+\.\d+)_(\d+\.\d+)\.(?:png|jpg|jpeg|gif)$/i);
    if (coordsMatch && coordsMatch.length >= 3) {
      result.coordinates = {
        x: parseFloat(coordsMatch[1]),
        y: parseFloat(coordsMatch[2])
      };
    }
    
    // Extract TESS specific information
    if (filename.includes('tess')) {
      result.instrument = 'TESS';
      
      // Try to extract sector
      const sectorMatch = filename.match(/s(\d+)/i);
      if (sectorMatch) {
        result.sector = sectorMatch[1];
      }
      
      // Try to extract camera and CCD info
      const camMatch = filename.match(/cam(\d+)-ccd(\d+)/i);
      if (camMatch && camMatch.length >= 3) {
        result.camera = camMatch[1];
        result.ccd = camMatch[2];
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing filename:', error);
    return result;
  }
};

/**
 * Enhance anomaly data with information extracted from filename
 */
const enhanceAnomalyData = (anomaly: AnomalyObject): AnomalyObject => {
  if (!anomaly.filename && !anomaly.file_path) {
    return anomaly;
  }
  
  // Use filename from either the filename field or extract from file_path
  const filename = anomaly.filename || anomaly.file_path.split('/').pop() || '';
  
  // Parse the filename for additional data
  const fileInfo = parseFilenameInfo(filename);
  
  // Convert pixel coordinates to approximate sky coordinates (simplified conversion)
  // Note: This is a very naive conversion just for display purposes
  // Real astronomical coordinates would require proper astrometric solutions
  const ra = fileInfo.coordinates.x / 100; // Simplified conversion for display
  const dec = fileInfo.coordinates.y / 100; // Simplified conversion for display
  
  // Add image URL if not already present
  const imageUrl = anomaly.imageUrl || `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(anomaly.id)}`;
  
  // Enhance metadata
  const metadata = anomaly.metadata || {};
  metadata.objectName = metadata.objectName || `TESS Object ${anomaly.id.substring(0, 8)}`;
  metadata.instrument = fileInfo.instrument;
  metadata.discoveryDate = anomaly.timestamp?.split('T')[0] || new Date().toISOString().split('T')[0];
  
  if (fileInfo.sector) metadata.sector = fileInfo.sector;
  if (fileInfo.camera) metadata.camera = fileInfo.camera;
  if (fileInfo.ccd) metadata.ccd = fileInfo.ccd;
  
  // Return enhanced anomaly object
  return {
    ...anomaly,
    coordinates: anomaly.coordinates || { ra, dec },
    metadata,
    type: anomaly.type || (anomaly.is_anomaly ? 'Anomalous Region' : 'Normal Region'),
    classification: anomaly.classification || (anomaly.is_anomaly ? 'Unclassified Anomaly' : 'Normal'),
    imageUrl,
    filename
  };
};

/**
 * Sync anomaly data from external source
 */
export const syncAnomalyData = async (): Promise<{
  success: boolean;
  message: string;
  source?: string;
  imported_count: number;
  anomaly_count?: number;
  skipped_count?: number;
  error_count?: number;
  total_records?: number;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYNC_ANOMALY_DATA}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error syncing data: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Add a success flag for frontend use
    return {
      success: true,
      message: data.message,
      imported_count: data.imported_count,
      anomaly_count: data.anomaly_count,
      skipped_count: data.skipped_count,
      error_count: data.error_count,
      total_records: data.total_records,
      source: data.source
    };
  } catch (err) {
    return {
      success: false,
      message: err?.message || 'An error occurred while syncing data',
      imported_count: 0
    };
  }
};

/**
 * Get all anomalies from the backend with pagination support
 */
export const getAnomalies = async (
  page: number = 1,
  pageSize: number = 12,
  anomaliesOnly: boolean = true
): Promise<{
  data: AnomalyObject[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}> => {
  try {
    // Add pagination parameters to the query
    const queryParams = new URLSearchParams({
      anomalies_only: anomaliesOnly.toString(),
      page: page.toString(),
      limit: pageSize.toString()
    });
    
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.GET_IMAGES}?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching anomalies: ${response.statusText}`);
    }
    
    // Get total count from headers if available
    const totalCount = parseInt(response.headers.get('X-Total-Count') || '0', 10);
    
    const data = await response.json();
    
    // Enhance each anomaly with additional data
    const enhancedData = data.map((item: any) => enhanceAnomalyData({
      ...item,
      imageUrl: `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(item.id)}`
    }));
    
    // If API doesn't provide total count, use the data length (for demo purposes)
    const actualTotalCount = totalCount || enhancedData.length;
    const totalPages = Math.ceil(actualTotalCount / pageSize);
    
    return {
      data: enhancedData,
      totalCount: actualTotalCount,
      currentPage: page,
      totalPages: totalPages
    };
  } catch (err) {
    console.error('Error fetching anomalies:', err);
    throw new Error(err?.message || 'An error occurred while fetching anomalies');
  }
};

/**
 * Get a sample of normal (non-anomaly) images
 */
export const getNormalImages = async (limit: number = 5): Promise<AnomalyObject[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.GET_IMAGES}?anomalies_only=false`);
    
    if (!response.ok) {
      throw new Error(`Error fetching normal images: ${response.statusText}`);
    }
    
    const data = await response.json();
    const normalImages = data.filter((item: any) => !item.is_anomaly);
    
    // Select a random subset if we have more than the limit
    let selected = normalImages;
    if (normalImages.length > limit) {
      selected = [];
      const indices = new Set<number>();
      while (indices.size < limit && indices.size < normalImages.length) {
        indices.add(Math.floor(Math.random() * normalImages.length));
      }
      
      selected = Array.from(indices).map(i => normalImages[i]);
    }
    
    return selected.map((item: any) => enhanceAnomalyData({
      ...item,
      imageUrl: `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(item.id)}`
    }));
  } catch (err) {
    return handleApiError(err);
  }
};

/**
 * Get a specific anomaly by ID
 */
export const getAnomalyById = async (id: string): Promise<AnomalyObject | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_DETAILS(id)}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error fetching anomaly details: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      ...data,
      // Generate an image URL using the image file endpoint
      imageUrl: `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(data.id)}`
    };
  } catch (err) {
    return handleApiError(err);
  }
};

/**
 * Submit user feedback for an anomaly
 */
export const submitAnomalyFeedback = async (id: string, feedback: {
  classification?: string;
  is_anomaly?: boolean;
  comments?: string;
  rating?: number;
}): Promise<AnomalyObject | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CLASSIFY_IMAGE(id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_anomaly: feedback.is_anomaly !== undefined 
          ? feedback.is_anomaly 
          : feedback.classification !== 'Not Interesting',
        comment: feedback.comments || ''
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Error submitting feedback: ${response.statusText}`);
    }
    
    const data = await response.json();
    return enhanceAnomalyData({
      ...data,
      // Add the original feedback to our frontend model for UI display
      userFeedback: {
        classification: feedback.classification,
        comments: feedback.comments,
        rating: feedback.rating
      },
      // Generate an image URL using the image file endpoint
      imageUrl: `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(data.id)}`
    });
  } catch (err) {
    return handleApiError(err);
  }
};

/**
 * Get statistics about processed images
 */
export const getStatistics = async (): Promise<{
  total_images: number;
  anomaly_count: number;
  normal_count: number;
  processing_time_avg: number;
  storage_type?: string;
  storage_location?: string;
  anomalies_detected?: number;
  classified_images?: number;
  average_anomaly_score?: number;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.STATISTICS}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching statistics: ${response.statusText}`);
    }
    
    const data = await response.json();

    // Return both the original API fields and our frontend-specific field names 
    return {
      total_images: data.total_images,
      anomaly_count: data.anomalies_detected || 0,
      normal_count: data.total_images - (data.anomalies_detected || 0),
      processing_time_avg: data.average_processing_time || data.average_anomaly_score || 0,
      // Include the original API fields too
      ...data
    };
  } catch (err) {
    return handleApiError(err);
  }
};

/**
 * Process a single image for anomaly detection
 */
export const processImage = async (imageFile: File): Promise<{
  id: string;
  filename: string;
  timestamp: string;
  reconstruction_error: number;
  is_anomaly: boolean;
  anomaly_score: number;
  path: string;
}> => {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PROCESS}`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Error processing image: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (err) {
    return handleApiError(err);
  }
};