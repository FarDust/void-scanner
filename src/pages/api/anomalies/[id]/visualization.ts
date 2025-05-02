// filepath: /home/atelo/projects/void_scanner/src/pages/api/anomalies/[id]/visualization.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid anomaly ID' });
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images/${id}/visualization`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 404) {
      return res.status(404).json({ error: 'Anomaly not found' });
    }

    if (!response.ok) {
      throw new Error(`Error fetching image visualizations: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error(`Error in API route /api/anomalies/${id}/visualization:`, error);
    res.status(500).json({ error: 'Failed to fetch image visualizations' });
  }
}