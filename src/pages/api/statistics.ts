import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { dashboard } = req.query;
    
    // First, get basic statistics which always contain storage information
    const basicStatsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/statistics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!basicStatsResponse.ok) {
      throw new Error(`Error fetching basic statistics: ${basicStatsResponse.statusText}`);
    }

    const basicStats = await basicStatsResponse.json();
    
    // If dashboard stats were requested, get those too and merge them
    if (dashboard === 'true') {
      const dashboardStatsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/statistics/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!dashboardStatsResponse.ok) {
        throw new Error(`Error fetching dashboard statistics: ${dashboardStatsResponse.statusText}`);
      }

      const dashboardStats = await dashboardStatsResponse.json();
      
      // Merge dashboard stats with basic stats (ensuring storage fields are preserved)
      const mergedStats = {
        ...basicStats,
        ...dashboardStats,
        // Ensure storage fields from basic stats are never overwritten
        storage_type: basicStats.storage_type,
        storage_location: basicStats.storage_location
      };
      
      res.status(200).json(mergedStats);
    } else {
      // Just return basic stats
      res.status(200).json(basicStats);
    }
  } catch (error) {
    console.error('Error in API route /api/statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}