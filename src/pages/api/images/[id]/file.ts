import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid image ID' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch the image from the backend API
    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw new Error('NEXT_PUBLIC_API_URL environment variable is not defined');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images/${id}/file`);

    if (response.status === 404) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (!response.ok) {
      throw new Error(`Error fetching image: ${response.statusText}`);
    }

    // Get content type and image data as buffer
    const contentType = response.headers.get('content-type') || 'image/png';
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    // Set the appropriate content type and send the image data
    res.setHeader('Content-Type', contentType);
    res.send(imageBuffer);
  } catch (error) {
    console.error(`Error in API route /api/images/${id}/file:`, error);
    res.status(500).json({ error: 'Failed to fetch image file' });
  }
}