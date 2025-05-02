// filepath: /home/atelo/projects/void_scanner/__tests__/api/pcaVisualization.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/visualizations/pca';

describe('/api/visualizations/pca API Route', () => {
  it('should return 405 for non-POST requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(405);
    expect(res._getJSONData()).toEqual({ error: 'Method not allowed' });
  });

  it('should return 500 if the backend API fails', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        highlight_anomalies: true,
        use_interactive: true
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
    expect(res._getJSONData()).toEqual({ error: 'Failed to create PCA visualization' });
  });

  it('should return 200 and data if the backend API succeeds', async () => {
    const requestBody = {
      filter: {
        is_anomaly: true,
        date_range: {
          start_date: '2025-01-01',
          end_date: '2025-05-01'
        },
        anomaly_score: {
          min_score: 0.7
        }
      },
      highlight_anomalies: true,
      use_interactive: true
    };

    const { req, res } = createMocks({
      method: 'POST',
      body: requestBody
    });

    const mockData = {
      visualization: 'base64string',
      projection_data: {
        points: [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]],
        labels: [1, 0, 1]
      },
      anomaly_threshold: 0.75,
      total_points: 3,
      anomaly_count: 2,
      is_interactive: true
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
    
    // Verify that fetch was called with the correct URL and body
    const expectedUrl = `${process.env.NEXT_PUBLIC_API_URL}/visualizations/pca`;
    expect(global.fetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify(requestBody)
      })
    );
  });

  it('should handle empty request body correctly', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {} // Empty body
    });

    const mockData = {
      visualization: 'base64string',
      anomaly_threshold: 0.5,
      total_points: 100,
      anomaly_count: 10
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
    
    // Verify that fetch was called with empty JSON object
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: '{}'
      })
    );
  });
});