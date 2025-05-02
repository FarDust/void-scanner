import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/normal-images'; 

describe('/api/normal-images API Route', () => {
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
        limit: '5'
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
    expect(res._getJSONData()).toEqual({ error: 'Failed to fetch normal images' });
  });

  it('should return 500 if API returns invalid response format', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        limit: '5'
      }
    });

    // Mock fetch to simulate a valid response but with invalid format
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ invalid: 'format' }),
      })
    ) as jest.Mock;

    await handler(req, res);

    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Invalid response format from backend API' });
  });

  it('should return 200 and data if the backend API succeeds', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        limit: '3'
      }
    });

    const mockData = {
      results: [
        {
          id: 'normal-1',
          file_path: '/path/to/image1.png',
          is_anomaly: false,
          anomaly_score: 0.1
        },
        {
          id: 'normal-2',
          file_path: '/path/to/image2.png',
          is_anomaly: false,
          anomaly_score: 0.2
        },
        {
          id: 'normal-3',
          file_path: '/path/to/image3.png',
          is_anomaly: false,
          anomaly_score: 0.15
        },
        {
          id: 'normal-4',
          file_path: '/path/to/image4.png',
          is_anomaly: false,
          anomaly_score: 0.18
        }
      ],
      total_count: 4,
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
    expect(res._getJSONData()).toHaveLength(3); // Should only return 3 as requested by limit
    
    // Verify that fetch was called with the correct URL and parameters
    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const fetchUrl = fetchCall[0];
    
    // Verify URL contains the expected parameters
    expect(fetchUrl).toContain('is_anomaly=false');
    expect(fetchUrl).toContain('page=1');
    expect(fetchUrl).toContain('page_size=6'); // Double the requested limit
    
    // Also verify request method and headers
    const fetchOptions = fetchCall[1];
    expect(fetchOptions.method).toBe('GET');
    expect(fetchOptions.headers['Content-Type']).toBe('application/json');
  });
});