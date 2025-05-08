// filepath: /home/atelo/projects/void_scanner/src/pages/api/batch-classify.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image_ids, is_anomaly, comment } = req.body;

    // Validate request body
    if (!image_ids || !Array.isArray(image_ids) || image_ids.length === 0) {
      return res.status(400).json({ error: 'image_ids array is required' });
    }

    if (typeof is_anomaly !== 'boolean') {
      return res.status(400).json({ error: 'is_anomaly field must be a boolean' });
    }

    const response = await fetch(`${process.env.API_URL}/images/classifications`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_ids,
        is_anomaly,
        comment: comment || ''
      }),
    });

    if (!response.ok) {
      throw new Error(`Error submitting batch classification: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in API route /api/batch-classify:', error);
    res.status(500).json({ error: 'Failed to submit batch classification' });
  }
}