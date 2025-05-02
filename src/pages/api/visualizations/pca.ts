// filepath: /home/atelo/projects/void_scanner/src/pages/api/visualizations/pca.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward the request body to the backend API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/visualizations/pca`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body || {}),
    });

    if (!response.ok) {
      throw new Error(`Error creating PCA visualization: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in API route /api/visualizations/pca:', error);
    res.status(500).json({ error: 'Failed to create PCA visualization' });
  }
}