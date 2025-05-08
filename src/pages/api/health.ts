import { NextApiRequest, NextApiResponse } from 'next';

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  version: string;
}

/**
 * Health check endpoint to verify the API is running.
 * 
 * @param req - Next.js API Request
 * @param res - Next.js API Response
 * @returns HealthCheckResponse
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse | { error: string }>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // Get the API URL from environment variables
    const apiUrl = process.env.API_URL;
    
    if (!apiUrl) {
      throw new Error('API_URL environment variable is not defined');
    }

    // Make a request to the actual API's health endpoint
    const response = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    // Parse the API response
    const healthData: HealthCheckResponse = await response.json();
    
    // Return the health status from the real API
    res.status(200).json(healthData);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to check API health'
    });
  }
}