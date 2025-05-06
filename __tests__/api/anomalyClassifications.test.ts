// filepath: /home/atelo/projects/void_scanner/__tests__/api/anomalyClassifications.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/anomalies/[id]/classifications';

describe('/api/anomalies/[id]/classifications API Route', () => {
  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      query: {
        id: 'anomaly-123'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ error: 'Method not allowed' });
  });

  it('should return 400 for invalid ID', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        id: [] // Array instead of string to simulate invalid ID
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    expect(res._getJSONData()).toEqual({ error: 'Invalid anomaly ID' });
  });

  it('should return 404 if anomaly not found', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        id: 'nonexistent-id'
      }
    });

    // Mock fetch to simulate a 404 response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })
    ) as jest.Mock;

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    expect(res._getJSONData()).toEqual({ error: 'Anomaly not found' });
  });

  it('should return 500 if the backend API fails', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        id: 'anomaly-123'
      }
    });

    // Mock fetch to simulate a backend failure
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })
    ) as jest.Mock;

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Failed to fetch classification history' });
  });

  it('should return 200 and data if the backend API succeeds', async () => {
    const anomalyId = 'anomaly-123';
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        id: anomalyId
      }
    });

    const mockData = {
      image_id: anomalyId,
      classifications: [
        {
          id: 'class-1',
          image_id: anomalyId,
          user_classification: true,
          comment: 'Test comment',
          timestamp: '2025-04-28T14:30:00Z'
        },
        {
          id: 'class-2',
          image_id: anomalyId,
          user_classification: false,
          comment: null,
          timestamp: '2025-04-29T10:15:00Z'
        }
      ]
    };

    // Mock fetch to simulate a successful backend response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      })
    ) as jest.Mock;

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual(mockData);
    
    // Verify that fetch was called with the correct URL
    const expectedUrl = `${process.env.NEXT_PUBLIC_API_URL}/images/${anomalyId}/classifications`;
    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );
  });
});