// filepath: /home/atelo/projects/void_scanner/src/pages/api/images/export.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract query parameters
    const { 
      format = 'json',
      is_anomaly,
      start_date,
      end_date,
      min_score,
      max_score,
      is_classified,
      user_classification,
      include_classifications = 'true',
      sort_by,
      sort_order = 'desc'
    } = req.query;

    // Build query parameters
    const queryParams = new URLSearchParams({
      format: format.toString(),
      include_classifications: include_classifications.toString(),
      sort_order: sort_order.toString()
    });
    
    // Add optional parameters
    if (is_anomaly !== undefined) queryParams.append('is_anomaly', is_anomaly.toString());
    if (start_date) queryParams.append('start_date', start_date.toString());
    if (end_date) queryParams.append('end_date', end_date.toString());
    if (min_score) queryParams.append('min_score', min_score.toString());
    if (max_score) queryParams.append('max_score', max_score.toString());
    if (is_classified !== undefined) queryParams.append('is_classified', is_classified.toString());
    if (user_classification !== undefined) queryParams.append('user_classification', user_classification.toString());
    if (sort_by) queryParams.append('sort_by', sort_by.toString());

    // Forward the request to the backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images/export?${queryParams}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Error exporting images: ${response.statusText}`);
    }

    // Get the content type and data
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const data = await response.blob();
    
    // Set the appropriate headers for download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="anomaly_export.${format}`);
    
    // In Next.js, we need to convert the blob to a buffer
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Send the data
    res.send(buffer);
  } catch (error) {
    console.error('Error in API route /api/images/export:', error);
    res.status(500).json({ error: 'Failed to export images' });
  }
}