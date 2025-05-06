// filepath: /home/atelo/projects/void_scanner/src/pages/api/anomalies.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      page = '1', 
      page_size = '12', 
      is_anomaly,
      start_date,
      end_date,
      min_score,
      max_score,
      is_classified,
      user_classification,
      sort_by = 'processed_at',
      sort_order = 'desc'
    } = req.query;

    // Build query parameters
    const queryParams = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString(),
      sort_by: sort_by.toString(),
      sort_order: sort_order.toString()
    });
    
    // Add optional filter parameters if specified
    if (is_anomaly !== undefined) queryParams.append('is_anomaly', is_anomaly.toString());
    if (start_date) queryParams.append('start_date', start_date.toString());
    if (end_date) queryParams.append('end_date', end_date.toString());
    if (min_score) queryParams.append('min_score', min_score.toString());
    if (max_score) queryParams.append('max_score', max_score.toString());
    if (is_classified !== undefined) queryParams.append('is_classified', is_classified.toString());
    if (user_classification !== undefined) queryParams.append('user_classification', user_classification.toString());

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