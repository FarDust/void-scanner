import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import AnomalyCard from '@/components/AnomalyCard';
import * as anomalyService from '@/services/anomalyService';

// Mock del servicio de anomalías
jest.mock('@/services/anomalyService', () => ({
  getAnomalyById: jest.fn(),
  submitAnomalyFeedback: jest.fn(),
  getSimilarImages: jest.fn(),
  getClassificationHistory: jest.fn(),
}));

// Mock para Next/Image para evitar problemas con las imágenes en pruebas
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('Anomaly Viewing and Management Integration Flow', () => {
  const mockAnomaly = {
    id: 'anomaly-123',
    filename: 'anomaly.png',
    timestamp: '2025-04-28T12:00:00Z',
    reconstruction_error: 1.234,
    is_anomaly: true,
    anomaly_score: 15.678,
    path: '/path/to/anomaly',
    processing_time: 0.5,
    imageUrl: 'https://example.com/anomaly.png',
    metadata: {
      objectName: 'TESS Object anomaly-123',
      discoveryDate: '2025-04-28',
      instrument: 'TESS'
    },
    coordinates: {
      ra: 120.5,
      dec: 45.3
    },
    type: 'Anomalous Region',
    classification: 'Unclassified Anomaly'
  };

  const updatedMockAnomaly = {
    ...mockAnomaly,
    classification: 'Supernova',
    userFeedback: {
      classification: 'Supernova',
      comments: 'Test comment for anomaly',
      rating: 5
    }
  };

  const mockSimilarImages = {
    reference_image_id: 'anomaly-123',
    similar_images: [
      {
        image: {
          id: 'similar-1',
          filename: 'similar1.png',
          timestamp: '2025-04-25T12:00:00Z',
          reconstruction_error: 1.1,
          is_anomaly: true,
          anomaly_score: 14.5,
          path: '/path/to/similar1',
          imageUrl: 'https://example.com/similar1.png',
          metadata: {
            objectName: 'TESS Object similar-1',
            discoveryDate: '2025-04-25',
            instrument: 'TESS'
          }
        },
        similarity_score: 0.95
      },
      {
        image: {
          id: 'similar-2',
          filename: 'similar2.png',
          timestamp: '2025-04-26T12:00:00Z',
          reconstruction_error: 0.9,
          is_anomaly: true,
          anomaly_score: 12.3,
          path: '/path/to/similar2',
          imageUrl: 'https://example.com/similar2.png',
          metadata: {
            objectName: 'TESS Object similar-2',
            discoveryDate: '2025-04-26',
            instrument: 'TESS'
          }
        },
        similarity_score: 0.87
      }
    ]
  };

  const mockClassificationHistory = {
    image_id: 'anomaly-123',
    classifications: [
      {
        id: 'class-1',
        image_id: 'anomaly-123',
        user_classification: true,
        comment: 'This is definitely an anomaly',
        timestamp: '2025-04-29T10:00:00Z'
      },
      {
        id: 'class-2',
        image_id: 'anomaly-123',
        user_classification: false,
        comment: 'On second thought, this is normal',
        timestamp: '2025-04-30T14:00:00Z'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configure mocks
    (anomalyService.getAnomalyById as jest.Mock).mockResolvedValue(mockAnomaly);
    (anomalyService.submitAnomalyFeedback as jest.Mock).mockResolvedValue(updatedMockAnomaly);
    (anomalyService.getSimilarImages as jest.Mock).mockResolvedValue(mockSimilarImages);
    (anomalyService.getClassificationHistory as jest.Mock).mockResolvedValue(mockClassificationHistory);
  });

  it('should display anomaly details', async () => {
    render(<AnomalyCard anomaly={mockAnomaly} />);
    
    // Verificar que se cargue la tarjeta con los datos correctos
    await waitFor(() => {
      expect(screen.getByText('TESS Object anomaly-123')).toBeInTheDocument();
      expect(screen.getByText(/RA: 120.50000, Dec: 45.30000/)).toBeInTheDocument();
      expect(screen.getByText(/Discovery: 2025-04-28/)).toBeInTheDocument();
      expect(screen.getByText(/Instrument: TESS/)).toBeInTheDocument();
    });
  });

  it('should submit feedback for an anomaly', async () => {
    const onFeedbackSubmitMock = jest.fn();
    render(<AnomalyCard anomaly={mockAnomaly} onFeedbackSubmit={onFeedbackSubmitMock} />);
    
    // Abrir el formulario de feedback
    const feedbackButton = screen.getByRole('button', { name: /Provide Feedback/i });
    fireEvent.click(feedbackButton);
    
    // Completar y enviar el formulario
    await waitFor(() => {
      // Seleccionar la clasificación desde el dropdown
      const selectElement = screen.getByRole('combobox');
      fireEvent.change(selectElement, { target: { value: 'Supernova' } });
      
      // Añadir comentario
      const commentField = screen.getByPlaceholderText(/Add any additional observations/i);
      fireEvent.change(commentField, { target: { value: 'Test comment for anomaly' } });
      
      // Enviar el formulario
      const submitButton = screen.getByRole('button', { name: /Submit/i });
      fireEvent.click(submitButton);
    });
    
    // Verificar que se llamó al servicio con los datos correctos
    await waitFor(() => {
      expect(anomalyService.submitAnomalyFeedback).toHaveBeenCalledWith(
        'anomaly-123',
        expect.objectContaining({
          classification: 'Supernova',
          comments: 'Test comment for anomaly',
        })
      );
      expect(onFeedbackSubmitMock).toHaveBeenCalledWith(updatedMockAnomaly);
    });
  });
});