// filepath: /home/atelo/projects/void_scanner/__tests__/api/batchClassify.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/batch-classify';

describe('/api/batch-classify API Route', () => {
  it('should return 405 for non-PATCH requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ error: 'Method not allowed' });
  });

  it('should return 400 if image_ids is missing', async () => {
    const { req, res } = createMocks({
      method: 'PATCH',
      body: {
        is_anomaly: true,
        comment: 'Test comment'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'image_ids array is required' });
  });

  it('should return 400 if image_ids is empty', async () => {
    const { req, res } = createMocks({
      method: 'PATCH',
      body: {
        image_ids: [],
        is_anomaly: true,
        comment: 'Test comment'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'image_ids array is required' });
  });

  it('should return 400 if is_anomaly is not boolean', async () => {
    const { req, res } = createMocks({
      method: 'PATCH',
      body: {
        image_ids: ['id1', 'id2'],
        is_anomaly: 'true', // String instead of boolean
        comment: 'Test comment'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'is_anomaly field must be a boolean' });
  });

  it('should return 500 if the backend API fails', async () => {
    const { req, res } = createMocks({
      method: 'PATCH',
      body: {
        image_ids: ['id1', 'id2'],
        is_anomaly: true,
        comment: 'Test comment'
      }
    });

    // Mock fetch to simulate a backend failure
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
      })
    ) as jest.Mock;

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Failed to submit batch classification' });
  });

  it('should return 200 and data if the backend API succeeds', async () => {
    const { req, res } = createMocks({
      method: 'PATCH',
      body: {
        image_ids: ['id1', 'id2', 'id3'],
        is_anomaly: true,
        comment: 'Test batch classification'
      }
    });

    const mockResponseData = {
      total: 3,
      successful: 2,
      failed: 1,
      failed_ids: ['id3']
    };

    // Mock fetch to simulate a successful backend response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponseData),
      })
    ) as jest.Mock;

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(mockResponseData);
    
    // Verify that fetch was called with the correct URL and body
    const expectedUrl = `${process.env.NEXT_PUBLIC_API_URL}/images/classifications`;
    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          image_ids: ['id1', 'id2', 'id3'],
          is_anomaly: true,
          comment: 'Test batch classification'
        })
      })
    );
  });
});