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
  PROCESS: '/images', // POST images endpoint for image upload
  GET_IMAGES: '/images/', 
  GET_IMAGE_DETAILS: (id: string) => `/images/${id}`,
  GET_IMAGE_FILE: (id: string) => `/images/${id}/file`,
  CLASSIFY_IMAGE: (id: string) => `/images/${id}/classify`,
  STATISTICS: '/statistics',
  DASHBOARD_STATISTICS: '/statistics/dashboard',
  SYNC_ANOMALY_DATA: '/sync-anomaly-data',
  SEARCH_IMAGES: '/images/search', 
  BATCH_CLASSIFY: '/images/classifications', // Updated to match OpenAPI spec - PATCH endpoint
  CLASSIFICATION_HISTORY: (id: string) => `/images/${id}/classifications`,
  EXPORT_IMAGES: '/images/export',
  SIMILAR_IMAGES: (id: string) => `/images/${id}/similarities`,
  VISUALIZATION: (id: string) => `/images/${id}/visualization`,
  PCA_VISUALIZATION: '/visualizations/pca'
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
    // Use the new Next.js API route
    const response = await fetch('/api/syncAnomalyData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error syncing data: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message,
      imported_count: data.imported_count,
      anomaly_count: data.anomaly_count,
      skipped_count: data.skipped_count,
      error_count: data.error_count,
      total_records: data.total_records,
      source: data.source,
    };
  } catch (err) {
    return {
      success: false,
      message: err?.message || 'An error occurred while syncing data',
      imported_count: 0,
    };
  }

  // Old implementation (commented out for reference)
  /*
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYNC_ANOMALY_DATA}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error syncing data: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      message: data.message,
      imported_count: data.imported_count,
      anomaly_count: data.anomaly_count,
      skipped_count: data.skipped_count,
      error_count: data.error_count,
      total_records: data.total_records,
      source: data.source,
    };
  } catch (err) {
    return {
      success: false,
      message: err?.message || 'An error occurred while syncing data',
      imported_count: 0,
    };
  }
  */
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
      page: page.toString(),
      page_size: pageSize.toString() // Updated to match new API parameter name
    });
    
    // Add anomalies filter if specified
    if (anomaliesOnly) {
      queryParams.append('is_anomaly', 'true');
    }
    
    // Use Next.js API route instead of calling backend directly
    const response = await fetch(`/api/anomalies?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching anomalies: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    // The API returns a structured response with results, total_count, etc.
    if (!responseData || typeof responseData !== 'object') {
      throw new Error('Invalid response from API');
    }
    
    // Extract the results array
    const results = responseData.results || [];
    const totalCount = responseData.total_count || 0;
    const totalPages = responseData.total_pages || 1;
    const currentPage = responseData.page || page;
    
    // Enhance each anomaly with additional data for UI display
    const enhancedData = results.map((item: any) => enhanceAnomalyData({
      ...item,
      imageUrl: `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(item.id)}`
    }));
    
    return {
      data: enhancedData,
      totalCount: totalCount,
      currentPage: currentPage,
      totalPages: totalPages
    };
  } catch (err) {
    console.error('Error fetching anomalies:', err);
    throw new Error(err?.message || 'An error occurred while fetching anomalies');
  }

  // Old implementation (commented out for reference)
  /*
  try {
    // Add pagination parameters to the query
    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString() // Updated to match new API parameter name
    });
    
    // Add anomalies filter if specified
    if (anomaliesOnly) {
      queryParams.append('is_anomaly', 'true');
    }
    
    // Use the new search endpoint which supports more advanced filtering
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SEARCH_IMAGES}?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching anomalies: ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    // The new API returns a structured response with results, total_count, etc.
    if (!responseData || typeof responseData !== 'object') {
      throw new Error('Invalid response from API');
    }
    
    // Extract the results array
    const results = responseData.results || [];
    const totalCount = responseData.total_count || 0;
    const totalPages = responseData.total_pages || 1;
    const currentPage = responseData.page || page;
    
    // Enhance each anomaly with additional data for UI display
    const enhancedData = results.map((item: any) => enhanceAnomalyData({
      ...item,
      imageUrl: `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(item.id)}`
    }));
    
    return {
      data: enhancedData,
      totalCount: totalCount,
      currentPage: currentPage,
      totalPages: totalPages
    };
  } catch (err) {
    console.error('Error fetching anomalies:', err);
    throw new Error(err?.message || 'An error occurred while fetching anomalies');
  }
  */
};

/**
 * Get a sample of normal (non-anomaly) images
 */
export const getNormalImages = async (limit: number = 5): Promise<AnomalyObject[]> => {
  try {
    // Use Next.js API route instead of calling backend directly
    const queryParams = new URLSearchParams({
      limit: limit.toString()
    });
    
    const response = await fetch(`/api/normal-images?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching normal images: ${response.statusText}`);
    }
    
    const normalImages = await response.json();
    
    // Enhance each normal image with additional data for UI display
    return normalImages.map((item: any) => enhanceAnomalyData({
      ...item,
      imageUrl: `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(item.id)}`
    }));
  } catch (err) {
    console.error('Error fetching normal images:', err);
    throw new Error(err?.message || 'An error occurred while fetching normal images');
  }
};

/**
 * Get a specific anomaly by ID
 */
export const getAnomalyById = async (id: string): Promise<AnomalyObject | null> => {
  try {
    // Use Next.js API route instead of calling backend directly
    const response = await fetch(`/api/anomalies/${id}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Error fetching anomaly details: ${response.statusText}`);
    }
    
    const data = await response.json();
    // Enhance the anomaly data with additional metadata
    return enhanceAnomalyData({
      ...data,
      // Generate an image URL using the image file endpoint
      imageUrl: `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(data.id)}`
    });
  } catch (err) {
    console.error('Error fetching anomaly details:', err);
    throw new Error(err?.message || 'An error occurred while fetching anomaly details');
  }

  // Old implementation (commented out for reference)
  /*
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
  */
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
    // Use Next.js API route instead of calling backend directly
    const response = await fetch(`/api/anomalies/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_anomaly: feedback.is_anomaly !== undefined 
          ? feedback.is_anomaly 
          : feedback.classification !== 'Not Interesting',
        comments: feedback.comments || ''
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
    console.error('Error submitting anomaly feedback:', err);
    throw new Error(err?.message || 'An error occurred while submitting feedback');
  }

  // Old implementation (commented out for reference)
  /*
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
  */
};

/**
 * Get statistics about processed images
 */
export const getStatistics = async (useDashboard = false): Promise<{
  total_images: number;
  anomaly_count: number;
  normal_count: number;
  storage_type?: string;
  storage_location?: string;
  anomalies_detected?: number;
  classified_images?: number;
  average_anomaly_score?: number;
  user_confirmed_anomalies?: number;
  unclassified_anomalies?: number;
  false_positives?: number;
  false_negatives?: number;
  recent_activity?: any[];
}> => {
  try {
    // Add query parameter for dashboard stats if requested
    const queryParams = new URLSearchParams();
    if (useDashboard) {
      queryParams.append('useDashboard', 'true');
    }
    
    // Use Next.js API route instead of calling backend directly
    const response = await fetch(`/api/statistics?${queryParams.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching statistics: ${response.statusText}`);
    }
    
    const data = await response.json();

    // Return both the original API fields and our frontend-specific field names
    return {
      total_images: data.total_images,
      anomaly_count: data.anomalies_detected || data.total_anomalies || 0,
      normal_count: data.total_images - (data.anomalies_detected || data.total_anomalies || 0),
      // Include the original API fields too
      ...data
    };
  } catch (err) {
    console.error('Error fetching statistics:', err);
    throw new Error(err?.message || 'An error occurred while fetching statistics');
  }

  // Old implementation (commented out for reference)
  /*
  try {
    // Use the dashboard statistics endpoint if requested (more comprehensive stats)
    const endpoint = useDashboard ? API_ENDPOINTS.DASHBOARD_STATISTICS : API_ENDPOINTS.STATISTICS;
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching statistics: ${response.statusText}`);
    }
    
    const data = await response.json();

    // Return both the original API fields and our frontend-specific field names
    return {
      total_images: data.total_images,
      anomaly_count: data.anomalies_detected || data.total_anomalies || 0,
      normal_count: data.total_images - (data.anomalies_detected || data.total_anomalies || 0),
      // Include the original API fields too
      ...data
    };
  } catch (err) {
    return handleApiError(err);
  }
  */
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
    
    // Use Next.js API route instead of calling backend directly
    const response = await fetch('/api/process-image', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Error processing image: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('Error processing image:', err);
    throw new Error(err?.message || 'An error occurred while processing the image');
  }
};

/**
 * Submit batch classification for multiple images at once
 */
export const submitBatchClassification = async (request: {
  image_ids: string[];
  is_anomaly: boolean;
  comment?: string;
}): Promise<{
  total: number;
  successful: number;
  failed: number;
  failed_ids: string[];
}> => {
  try {
    // Use Next.js API route instead of calling backend directly
    const response = await fetch('/api/batch-classify', {
      method: 'PATCH', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Error submitting batch classification: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      total: data.total || 0,
      successful: data.successful || 0,
      failed: data.failed || 0,
      failed_ids: data.failed_ids || []
    };
  } catch (err) {
    console.error('Error in batch classification:', err);
    throw new Error(err?.message || 'An error occurred while submitting batch classification');
  }

  // Old implementation (commented out for reference)
  /*
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.BATCH_CLASSIFY}`, {
      method: 'PATCH', // Using PATCH as specified in the OpenAPI spec
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Error submitting batch classification: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      total: data.total || 0,
      successful: data.successful || 0,
      failed: data.failed || 0,
      failed_ids: data.failed_ids || []
    };
  } catch (err) {
    console.error('Error in batch classification:', err);
    throw new Error(err?.message || 'An error occurred while submitting batch classification');
  }
  */
};

/**
 * Get classification history for an image
 */
export const getClassificationHistory = async (imageId: string): Promise<{
  image_id: string;
  classifications: Array<{
    id: string;
    image_id: string;
    user_classification: boolean;
    comment: string | null;
    timestamp: string;
  }>;
}> => {
  try {
    // Use Next.js API route instead of calling backend directly
    const response = await fetch(`/api/anomalies/${imageId}/classifications`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          image_id: imageId,
          classifications: []
        };
      }
      throw new Error(`Error fetching classification history: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching classification history:', err);
    return {
      image_id: imageId,
      classifications: []
    };
  }

  // Old implementation (commented out for reference)
  /*
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.CLASSIFICATION_HISTORY(imageId)}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching classification history: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching classification history:', err);
    return {
      image_id: imageId,
      classifications: []
    };
  }
  */
};

/**
 * Get similar images for a specific image
 */
export const getSimilarImages = async (
  imageId: string, 
  limit: number = 10, 
  minScore: number = 0.5
): Promise<{
  reference_image_id: string;
  similar_images: Array<{
    image: AnomalyObject;
    similarity_score: number;
  }>;
}> => {
  try {
    // Use Next.js API route instead of calling backend directly
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      min_score: minScore.toString()
    });
    
    const response = await fetch(`/api/anomalies/${imageId}/similarities?${queryParams}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          reference_image_id: imageId,
          similar_images: []
        };
      }
      throw new Error(`Error fetching similar images: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Enhance the returned data for UI display
    const enhancedData = {
      reference_image_id: data.reference_image_id,
      similar_images: data.similar_images.map((item: any) => ({
        ...item,
        image: enhanceAnomalyData({
          ...item.image,
          imageUrl: `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(item.image.id)}`
        })
      }))
    };
    
    return enhancedData;
  } catch (err) {
    console.error('Error fetching similar images:', err);
    return {
      reference_image_id: imageId,
      similar_images: []
    };
  }

  // Old implementation (commented out for reference)
  /*
  try {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      min_score: minScore.toString()
    });
    
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SIMILAR_IMAGES(imageId)}?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching similar images: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Enhance the returned data for UI display
    const enhancedData = {
      reference_image_id: data.reference_image_id,
      similar_images: data.similar_images.map((item: any) => ({
        ...item,
        image: enhanceAnomalyData({
          ...item.image,
          imageUrl: `${API_BASE_URL}${API_ENDPOINTS.GET_IMAGE_FILE(item.image.id)}`
        })
      }))
    };
    
    return enhancedData;
  } catch (err) {
    console.error('Error fetching similar images:', err);
    return {
      reference_image_id: imageId,
      similar_images: []
    };
  }
  */
};

/**
 * Get visualizations for a specific image
 */
export const getImageVisualizations = async (imageId: string): Promise<{
  image_id: string;
  visualizations: Array<{
    image_id: string;
    visualization_type: 'original' | 'processed' | 'anomaly_heatmap' | 'bounding_box';
    image_data: string;
  }>;
  reconstruction_error: number;
  is_anomaly: boolean;
  anomaly_score: number;
}> => {
  try {
    // Use Next.js API route instead of calling backend directly
    const response = await fetch(`/api/anomalies/${imageId}/visualization`);
    
    if (!response.ok) {
      throw new Error(`Error fetching image visualizations: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('Error fetching visualizations:', err);
    return {
      image_id: imageId,
      visualizations: [],
      reconstruction_error: 0,
      is_anomaly: false,
      anomaly_score: 0
    };
  }

  // Old implementation (commented out for reference)
  /*
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VISUALIZATION(imageId)}`);
    
    if (!response.ok) {
      throw new Error(`Error fetching image visualizations: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('Error fetching visualizations:', err);
    return {
      image_id: imageId,
      visualizations: [],
      reconstruction_error: 0,
      is_anomaly: false,
      anomaly_score: 0
    };
  }
  */
};

/**
 * Create a PCA visualization of images
 */
export const createPcaVisualization = async (options?: {
  filter?: {
    is_anomaly?: boolean;
    date_range?: {
      start_date?: string;
      end_date?: string;
    };
    anomaly_score?: {
      min_score?: number;
      max_score?: number;
    };
    classification?: {
      is_classified?: boolean;
      user_classification?: boolean;
    };
  };
  highlight_anomalies?: boolean;
  use_interactive?: boolean;
  include_image_paths?: boolean;
}): Promise<{
  visualization: string;
  projection_data?: any;
  anomaly_threshold: number;
  total_points: number;
  anomaly_count: number;
  is_interactive?: boolean;
}> => {
  try {
    // Use Next.js API route instead of calling backend directly
    const response = await fetch('/api/visualizations/pca', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options || {}),
    });
    
    if (!response.ok) {
      throw new Error(`Error creating PCA visualization: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('Error creating PCA visualization:', err);
    return {
      visualization: '',
      anomaly_threshold: 0,
      total_points: 0,
      anomaly_count: 0
    };
  }

  // Old implementation (commented out for reference)
  /*
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PCA_VISUALIZATION}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options || {}),
    });
    
    if (!response.ok) {
      throw new Error(`Error creating PCA visualization: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error('Error creating PCA visualization:', err);
    return {
      visualization: '',
      anomaly_threshold: 0,
      total_points: 0,
      anomaly_count: 0
    };
  }
  */
};

/**
 * Export images data with optional filtering
 */
export const exportImages = async (
  format: 'json' | 'csv' = 'json',
  filters?: {
    is_anomaly?: boolean;
    start_date?: string;
    end_date?: string;
    min_score?: number;
    max_score?: number;
    is_classified?: boolean;
    user_classification?: boolean;
  },
  include_classifications: boolean = true,
  sort_by?: string,
  sort_order: string = 'desc'
): Promise<Blob> => {
  try {
    // Build query parameters
    const queryParams = new URLSearchParams({
      format,
      include_classifications: include_classifications.toString(),
      sort_order
    });
    
    // Add optional parameters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    if (sort_by) {
      queryParams.append('sort_by', sort_by);
    }
    
    // Use Next.js API route instead of calling backend directly
    const response = await fetch(`/api/images/export?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Error exporting images: ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (err) {
    console.error('Error exporting images:', err);
    throw err;
  }
};