import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/syncAnomalyData'; // Update to use alias

describe('/api/syncAnomalyData API Route', () => {
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
    expect(res._getJSONData()).toEqual({ error: 'Failed to sync anomaly data' });
  });

  it('should return 200 and data if the backend API succeeds', async () => {
    const { req, res } = createMocks({
      method: 'POST',
    });

    // Mock fetch to simulate a successful backend response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            message: 'Sync successful',
            imported_count: 10,
          }),
      })
    ); // Correctly add the missing semicolon

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({
      message: 'Sync successful',
      imported_count: 10,
    });
  });
});