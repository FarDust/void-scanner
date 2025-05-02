// filepath: /home/atelo/projects/void_scanner/src/pages/api/anomalies/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid anomaly ID' });
  }

  // GET method for fetching anomaly details
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 404) {
        return res.status(404).json({ error: 'Anomaly not found' });
      }

      if (!response.ok) {
        throw new Error(`Error fetching anomaly: ${response.statusText}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error(`Error in API route /api/anomalies/${id}:`, error);
      res.status(500).json({ error: 'Failed to fetch anomaly details' });
    }
  } 
  // POST method for submitting feedback/classification
  else if (req.method === 'POST') {
    try {
      const { is_anomaly, comments } = req.body;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images/${id}/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_anomaly: is_anomaly,
          comment: comments || ''
        }),
      });

      if (!response.ok) {
        throw new Error(`Error submitting feedback: ${response.statusText}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error(`Error in API route /api/anomalies/${id} (POST):`, error);
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}