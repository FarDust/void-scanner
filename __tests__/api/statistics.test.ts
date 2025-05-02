// filepath: /home/atelo/projects/void_scanner/__tests__/api/statistics.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/statistics';

describe('/api/statistics API Route', () => {
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
    expect(res._getJSONData()).toEqual({ error: 'Failed to fetch statistics' });
  });

  it('should fetch regular statistics if useDashboard is not specified', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    const mockData = {
      total_images: 100,
      total_anomalies: 25,
      classified_images: 50
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
    const expectedUrl = `${process.env.NEXT_PUBLIC_API_URL}/statistics`;
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

  it('should fetch dashboard statistics if useDashboard is true', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        useDashboard: 'true'
      }
    });

    const mockData = {
      total_images: 100,
      anomalies_detected: 25,
      classified_images: 50,
      user_confirmed_anomalies: 20,
      false_positives: 5,
      average_anomaly_score: 0.75,
      recent_activity: [
        { id: 'activity-1', type: 'classification', timestamp: '2025-04-28T10:00:00Z' }
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
    const expectedUrl = `${process.env.NEXT_PUBLIC_API_URL}/statistics/dashboard`;
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