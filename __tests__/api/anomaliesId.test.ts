// filepath: /home/atelo/projects/void_scanner/__tests__/api/anomaliesId.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/anomalies/[id]';

describe('/api/anomalies/[id] API Route', () => {
  // Test GET request for anomaly details
  describe('GET requests', () => {
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
      expect(res._getJSONData()).toEqual({ error: 'Failed to fetch anomaly details' });
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
        id: anomalyId,
        file_path: '/path/to/image.png',
        is_anomaly: true,
        anomaly_score: 0.92
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
      const expectedUrl = `${process.env.NEXT_PUBLIC_API_URL}/images/${anomalyId}`;
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

  // Test POST request for submitting feedback
  describe('POST requests', () => {
    it('should return 400 for invalid ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: {
          id: [] // Array instead of string to simulate invalid ID
        },
        body: {
          is_anomaly: true,
          comments: 'Test comment'
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      expect(res._getJSONData()).toEqual({ error: 'Invalid anomaly ID' });
    });

    it('should return 500 if the backend API fails', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: {
          id: 'anomaly-123'
        },
        body: {
          is_anomaly: true,
          comments: 'Test comment'
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
      expect(res._getJSONData()).toEqual({ error: 'Failed to submit feedback' });
    });

    it('should return 200 and data if the backend API succeeds', async () => {
      const anomalyId = 'anomaly-123';
      const { req, res } = createMocks({
        method: 'POST',
        query: {
          id: anomalyId
        },
        body: {
          is_anomaly: true,
          comments: 'Test comment'
        }
      });

      const mockResponseData = {
        id: anomalyId,
        is_anomaly: true,
        comment: 'Test comment',
        updated_at: '2025-04-29T12:00:00Z'
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
      
      // Verify that fetch was called with the correct URL and request body
      const expectedUrl = `${process.env.NEXT_PUBLIC_API_URL}/images/${anomalyId}/classify`;
      expect(global.fetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            is_anomaly: true,
            comment: 'Test comment'
          })
        })
      );
    });
  });

  it('should return 405 for unsupported methods', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      query: {
        id: 'anomaly-123'
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ error: 'Method not allowed' });
  });
});