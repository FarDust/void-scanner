import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dashboard } = req.query;
    
    // Determine which endpoint to use based on whether the dashboard parameter is present
    // This aligns with the OpenAPI spec which defines two separate endpoints
    const endpoint = dashboard === 'true' ? '/statistics/dashboard' : '/statistics';

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching statistics: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in API route /api/statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}