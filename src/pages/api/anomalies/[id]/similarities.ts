// filepath: /home/atelo/projects/void_scanner/src/pages/api/anomalies/[id]/similarities.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { limit = '10', min_score = '0.5' } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid anomaly ID' });
  }

  try {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      min_score: min_score.toString()
    });

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images/${id}/similarities?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    if (!response.ok) {
      throw new Error(`Error fetching similar images: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error(`Error in API route /api/anomalies/${id}/similarities:`, error);
    res.status(500).json({ error: 'Failed to fetch similar images' });
  }
}