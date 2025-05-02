// filepath: /home/atelo/projects/void_scanner/__tests__/api/anomalies.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/anomalies'; 

describe('/api/anomalies API Route', () => {
  it('should return 405 for non-GET requests', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ error: 'Method not allowed' });
  });

  it('should return 500 if the backend API fails', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        page: '1',
        page_size: '12'
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
    expect(res._getJSONData()).toEqual({ error: 'Failed to fetch anomalies' });
  });

  it('should return 200 and data if the backend API succeeds', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        page: '1',
        page_size: '12',
        is_anomaly: 'true'
      }
    });

    const mockData = {
      results: [
        {
          id: 'anomaly-123',
          file_path: '/path/to/image.png',
          is_anomaly: true,
          anomaly_score: 0.92
        }
      ],
      total_count: 1,
      page: 1,
      total_pages: 1
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
    
    // Verify that fetch was called with the correct URL and parameters
    const expectedUrl = `${process.env.NEXT_PUBLIC_API_URL}/images/search?page=1&page_size=12&is_anomaly=true`;
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