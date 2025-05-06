import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import ImageUploader from '@/components/ImageUploader';
import * as anomalyService from '@/services/anomalyService';

// Mock del servicio de anomalías
jest.mock('@/services/anomalyService', () => ({
  processImage: jest.fn(),
}));

// Mock para Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    return <img {...props} />;
  },
}));

// Función auxiliar para crear un archivo
function createMockFile(name = 'test.png', size = 1024, type = 'image/png') {
  const file = new File([], name, { type });
  Object.defineProperty(file, 'size', {
    get() {
      return size;
    }
  });
  return file;
}

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');

describe('Image Processing Integration Flow', () => {
  beforeEach(() => {
    // Limpiar mocks antes de cada prueba
    jest.clearAllMocks();
  });

  it('should process an image and display results when upload is successful', async () => {
    // Mock de la respuesta del servicio
    const mockResult = {
      id: 'test-id-123',
      filename: 'test.png',
      timestamp: new Date().toISOString(),
      reconstruction_error: 0.1234,
      is_anomaly: false,
      anomaly_score: 0.3456,
      path: '/path/to/image',
      processing_time: 0.5
    };
    
    (anomalyService.processImage as jest.Mock).mockResolvedValue(mockResult);

    // Renderizar el componente
    render(<ImageUploader />);

    // Verificar que el componente se renderiza correctamente
    expect(screen.getByText(/Upload Image for Analysis/i)).toBeInTheDocument();
    
    // Simular la carga de un archivo
    const file = createMockFile();
    const inputElement = screen.getByTestId('file-input');
    
    await act(async () => {
      fireEvent.change(inputElement, { target: { files: [file] } });
    });
    
    // Verificar que se llamó al servicio con el archivo correcto
    expect(anomalyService.processImage).toHaveBeenCalledWith(file);
    
    // Esperar a que aparezcan los resultados
    await waitFor(() => {
      expect(screen.getByText(/Analysis Results/i)).toBeInTheDocument();
      expect(screen.getByText(mockResult.id)).toBeInTheDocument();
      // Verificar la clasificación
      expect(screen.getByText(/Normal/i)).toBeInTheDocument();
      // Verificar que se muestra el score correctamente
      expect(screen.getByText('0.346')).toBeInTheDocument(); // Formato esperado para el score
    });
  });

  it('should display an error message when image processing fails', async () => {
    // Mock del error
    const errorMessage = 'Error processing image';
    (anomalyService.processImage as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
    // Renderizar el componente
    render(<ImageUploader />);
    
    // Simular la carga de un archivo
    const file = createMockFile();
    const inputElement = screen.getByTestId('file-input');
    
    await act(async () => {
      fireEvent.change(inputElement, { target: { files: [file] } });
    });
    
    // Verificar que se muestra el mensaje de error
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should show a potential anomaly when anomaly score is high', async () => {
    // Mock de la respuesta con una anomalía
    const mockAnomalyResult = {
      id: 'anomaly-id-123',
      filename: 'anomaly.png',
      timestamp: new Date().toISOString(),
      reconstruction_error: 1.234,
      is_anomaly: true,
      anomaly_score: 15.678,
      path: '/path/to/anomaly',
      processing_time: 0.5
    };
    
    (anomalyService.processImage as jest.Mock).mockResolvedValue(mockAnomalyResult);

    // Renderizar el componente
    render(<ImageUploader />);
    
    // Simular la carga de un archivo
    const file = createMockFile('anomaly.png');
    const inputElement = screen.getByTestId('file-input');
    
    await act(async () => {
      fireEvent.change(inputElement, { target: { files: [file] } });
    });
    
    // Verificar que se muestran los resultados de anomalía
    await waitFor(() => {
      expect(screen.getByText(/Analysis Results/i)).toBeInTheDocument();
      expect(screen.getByText(/Potential Anomaly/i)).toBeInTheDocument();
      expect(screen.getByText('15.7')).toBeInTheDocument(); // Anomaly score formateado
    });
  });

  it('should handle extreme outlier scores correctly', async () => {
    // Mock de la respuesta con un score extremadamente alto
    const mockExtremeResult = {
      id: 'extreme-id-123',
      filename: 'extreme.png',
      timestamp: new Date().toISOString(),
      reconstruction_error: 5.432,
      is_anomaly: true,
      anomaly_score: 1500.5,
      path: '/path/to/extreme',
      processing_time: 0.8
    };
    
    (anomalyService.processImage as jest.Mock).mockResolvedValue(mockExtremeResult);

    // Renderizar el componente
    render(<ImageUploader />);
    
    // Simular la carga de un archivo
    const file = createMockFile('extreme.png');
    const inputElement = screen.getByTestId('file-input');
    
    await act(async () => {
      fireEvent.change(inputElement, { target: { files: [file] } });
    });
    
    // Verificar que se muestra correctamente el outlier
    await waitFor(() => {
      expect(screen.getByText(/Potential Anomaly/i)).toBeInTheDocument();
      expect(screen.getByText('1501 ⚠️')).toBeInTheDocument(); // Score con advertencia
      expect(screen.getByText('UNPROCESSABLE ENTITY')).toBeInTheDocument();
    });
  });
});