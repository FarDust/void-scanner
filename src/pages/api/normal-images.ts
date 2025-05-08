// filepath: /home/atelo/projects/void_scanner/src/pages/api/normal-images.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      limit = '5',
      start_date,
      end_date,
      min_score,
      max_score,
      is_classified,
      user_classification,
      sort_by = 'processed_at',
      sort_order = 'desc'
    } = req.query;
    
    const actualLimit = parseInt(limit.toString(), 10);
    
    // Request more than needed to have a good selection for randomization
    const queryParams = new URLSearchParams({
      is_anomaly: 'false',
      page: '1',
      page_size: (actualLimit * 2).toString(),
      sort_by: sort_by.toString(),
      sort_order: sort_order.toString()
    });

    // Add optional parameters if specified
    if (start_date) queryParams.append('start_date', start_date.toString());
    if (end_date) queryParams.append('end_date', end_date.toString());
    if (min_score) queryParams.append('min_score', min_score.toString());
    if (max_score) queryParams.append('max_score', max_score.toString());
    if (is_classified !== undefined) queryParams.append('is_classified', is_classified.toString());
    if (user_classification !== undefined) queryParams.append('user_classification', user_classification.toString());

    const response = await fetch(`${process.env.API_URL}/images/search?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching normal images: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Get the results array
    interface NormalImage {
      id: string;
      url: string;
      [key: string]: string | number | boolean | null | undefined; // Adjust this based on the actual structure of the API response
    }

    let normalImages: NormalImage[] = [];
    
    if (data && data.results && Array.isArray(data.results)) {
      normalImages = data.results;
    } else {
      console.warn('Unexpected API response format:', data);
      return res.status(500).json({ error: 'Invalid response format from backend API' });
    }
    
    // Select a random subset if we have more than the limit
    let selected = normalImages;
    if (normalImages.length > actualLimit) {
      selected = [];
      const indices = new Set<number>();
      while (indices.size < actualLimit && indices.size < normalImages.length) {
        indices.add(Math.floor(Math.random() * normalImages.length));
      }
      
      selected = Array.from(indices).map(i => normalImages[i]);
    }

    res.status(200).json(selected);
  } catch (error) {
    console.error('Error in API route /api/normal-images:', error);
    res.status(500).json({ error: 'Failed to fetch normal images' });
  }
}