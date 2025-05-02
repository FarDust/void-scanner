'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { processImage } from '../services/anomalyService';

export default function ImageUploader() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  // Update interface to match OpenAPI schema
  const [result, setResult] = useState<{
    id: string;
    filename: string;
    timestamp: string;
    reconstruction_error: number;
    is_anomaly: boolean;
    anomaly_score: number;
    path: string;
    // Frontend-specific fields can be optional
    imageUrl?: string;
    processing_time?: number;
  } | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files[0]);
    }
  };
  
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      await handleFiles(e.target.files[0]);
    }
  };
  
  const handleFiles = async (file: File) => {
    // Validate file is an image
    if (!file.type.match('image.*')) {
      setError('Please upload an image file (PNG, JPG, GIF, etc.)');
      return;
    }
    
    try {
      // Create a local object URL for immediate preview
      const objectUrl = URL.createObjectURL(file);
      setUploadedImageUrl(objectUrl);
      
      setUploading(true);
      setError(null);
      setResult(null);
      
      const result = await processImage(file);
      setResult(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred while processing the image');
    } finally {
      setUploading(false);
    }
  };
  
  const onButtonClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Upload Image for Analysis</h2>
      
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 hover:border-gray-400"}
          ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={inputRef}
          type="file"
          name="file"
          className="hidden"
          accept="image/*"
          onChange={handleChange}
          disabled={uploading}
          data-testid="file-input"
        />
        
        {uploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
            <p>Processing image...</p>
          </div>
        ) : (
          <div>
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
              <path 
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                strokeWidth={2} 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Drag and drop an image here, or <span className="text-blue-500">browse</span> to upload
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="text-xl font-semibold mb-4">Analysis Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image preview column */}
            <div className="flex flex-col items-center">
              <div className="w-full aspect-square relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md">
                {uploadedImageUrl && (
                  <Image
                    src={uploadedImageUrl}
                    alt={result.filename || 'Uploaded image'}
                    fill
                    className="object-contain"
                  />
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                {result.filename}
              </p>
            </div>
            
            {/* Analysis results column */}
            <div className="flex flex-col">
              <div className="grid grid-cols-1 gap-4">
                {
                  result.id !== "" && (
                    <>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Image ID</p>
                      <p className="font-mono text-sm truncate">{result.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Classification</p>
                      <div className={`font-medium text-lg ${result.is_anomaly ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
                        {result.is_anomaly ? 'Potential Anomaly' : 'Normal'}
                      </div>
                    </div>
                    </>
                  )
                }
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Anomaly Score</p>
                  <div className="relative pt-1">
                    <div className={`overflow-hidden h-2 mb-1 text-xs flex rounded ${
                      isExtremeOutlier(result.anomaly_score) 
                        ? 'bg-red-200 dark:bg-red-900/30' 
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}>
                      <div 
                        style={{ width: normalizeScoreForDisplay(result.anomaly_score) }}
                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                          isExtremeOutlier(result.anomaly_score)
                            ? 'bg-red-600 animate-pulse'
                            : result.anomaly_score > 100
                              ? 'bg-orange-500' 
                              : result.anomaly_score > 10
                                ? 'bg-yellow-500'
                                : 'bg-blue-500'
                        }`}
                      >
                        {isExtremeOutlier(result.anomaly_score) && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xs font-bold text-white">!</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <p className={isExtremeOutlier(result.anomaly_score) ? 'text-red-600 dark:text-red-400 font-bold' : ''}>
                        {formatAnomalyScore(result.anomaly_score)}
                      </p>
                      {isExtremeOutlier(result.anomaly_score) && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse">
                          UNPROCESSABLE ENTITY
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Reconstruction Error</p>
                  <p>{result.reconstruction_error.toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Processed</p>
                  <p>{new Date(result.timestamp).toLocaleString()}</p>
                </div>
              </div>
                
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to detect extreme outliers
function isExtremeOutlier(score: number): boolean {
  return score > 1000;
}

// Helper functions for consistent score display
function normalizeScoreForDisplay(score: number): string {
  // Handle very high anomaly scores (like 651.57 in the example payload)
  if (score <= 0) return "0%";
  
  // Identify extreme outliers (scores > 1000)
  if (isExtremeOutlier(score)) {
    return "100%"; // Max out the bar for extreme outliers
  }
  
  // Log-based scale for normal range scores
  const normalizedPercentage = Math.min(100 * (1 - 1 / (1 + Math.log10(1 + score * 9))), 100);
  return `${normalizedPercentage.toFixed(0)}%`;
}

function formatAnomalyScore(score: number): string {
  // Special handling for extreme outliers
  if (isExtremeOutlier(score)) {
    return `${Math.round(score)} ⚠️`;
  }
  
  // Format the anomaly score for display based on its magnitude
  if (score < 1) return score.toFixed(3);
  if (score < 10) return score.toFixed(2);
  if (score < 100) return score.toFixed(1);
  return Math.round(score).toString();
}