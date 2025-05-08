// filepath: /home/atelo/projects/void_scanner/src/pages/api/process-image.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { formidable } from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({ multiples: false });
    const [ , files ] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
    }

    const formData = new FormData();
    const fileStream = fs.createReadStream(file.filepath);
    formData.append('file', fileStream, {
      filename: file.originalFilename || 'upload.png',
      contentType: file.mimetype || 'image/png',
    });

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/images`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    if (!response.ok && response.status !== 422) {
      throw new Error(`Error processing image: ${response.statusText}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in API route /api/process-image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
}
