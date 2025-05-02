// filepath: /home/atelo/projects/void_scanner/src/pages/api/anomalies.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { page = '1', page_size = '12', is_anomaly } = req.query;

    // Build query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString()
    });
    
    // Add anomalies filter if specified
    if (is_anomaly) {
      queryParams.append('is_anomaly', is_anomaly.toString());
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images/search?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching anomalies: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in API route /api/anomalies:', error);
    res.status(500).json({ error: 'Failed to fetch anomalies' });
  }
}