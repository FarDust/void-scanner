// filepath: /home/atelo/projects/void_scanner/__tests__/api/exportImages.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/images/export';

describe('/api/images/export API Route', () => {
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
        format: 'json',
        is_anomaly: 'true'
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
    expect(res._getJSONData()).toEqual({ error: 'Failed to export images' });
  });

  it('should export json data with correct headers', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        format: 'json',
        is_anomaly: 'true',
        min_score: '0.7',
        include_classifications: 'true',
        sort_by: 'anomaly_score',
        sort_order: 'desc'
      }
    });

    // Mock ArrayBuffer and Buffer for blob handling
    const mockArrayBuffer = new ArrayBuffer(8);
    const mockBuffer = Buffer.from(mockArrayBuffer);
    
    // Create a mock blob with text
    const mockBlob = {
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
    };

    // Mock headers object
    const headers = new Map();
    headers.set('content-type', 'application/json');

    // Mock fetch to simulate a successful backend response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        headers: headers,
        blob: () => Promise.resolve(mockBlob),
      })
    ) as jest.Mock;

    // Mock Buffer.from
    jest.spyOn(Buffer, 'from').mockReturnValue(mockBuffer);

    await handler(req, res);

    // Check headers are set correctly
    expect(res.getHeader('Content-Type')).toBe('application/json');
    expect(res.getHeader('Content-Disposition')).toBe('attachment; filename="anomaly_export.json');
    
    // Verify that fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`${process.env.API_URL}/images/export?`),
      expect.objectContaining({
        method: 'GET'
      })
    );
    
    // Verify query parameters were included
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('format=json');
    expect(fetchCall).toContain('is_anomaly=true');
    expect(fetchCall).toContain('min_score=0.7');
    expect(fetchCall).toContain('include_classifications=true');
    expect(fetchCall).toContain('sort_by=anomaly_score');
    expect(fetchCall).toContain('sort_order=desc');
  });

  it('should export csv data with correct headers', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        format: 'csv'
      }
    });

    // Mock ArrayBuffer and Buffer for blob handling
    const mockArrayBuffer = new ArrayBuffer(8);
    const mockBuffer = Buffer.from(mockArrayBuffer);
    
    // Create a mock blob with text
    const mockBlob = {
      arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer)
    };

    // Mock headers object
    const headers = new Map();
    headers.set('content-type', 'text/csv');

    // Mock fetch to simulate a successful backend response
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        headers: headers,
        blob: () => Promise.resolve(mockBlob),
      })
    ) as jest.Mock;

    // Mock Buffer.from
    jest.spyOn(Buffer, 'from').mockReturnValue(mockBuffer);

    await handler(req, res);

    // Check headers are set correctly
    expect(res.getHeader('Content-Type')).toBe('text/csv');
    expect(res.getHeader('Content-Disposition')).toBe('attachment; filename="anomaly_export.csv');
  });

  it('should handle filter parameters correctly', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        format: 'json',
        is_anomaly: 'true',
        start_date: '2025-01-01',
        end_date: '2025-05-01',
        min_score: '0.5',
        max_score: '0.9',
        is_classified: 'true',
        user_classification: 'false'
      }
    });

    // Create minimal mocks necessary for test
    const mockBlob = {
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8))
    };

    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        headers: new Map([['content-type', 'application/json']]),
        blob: () => Promise.resolve(mockBlob),
      })
    ) as jest.Mock;

    await handler(req, res);

    // Verify all filter parameters were included in the request
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0];
    expect(fetchCall).toContain('is_anomaly=true');
    expect(fetchCall).toContain('start_date=2025-01-01');
    expect(fetchCall).toContain('end_date=2025-05-01');
    expect(fetchCall).toContain('min_score=0.5');
    expect(fetchCall).toContain('max_score=0.9');
    expect(fetchCall).toContain('is_classified=true');
    expect(fetchCall).toContain('user_classification=false');
  });
});