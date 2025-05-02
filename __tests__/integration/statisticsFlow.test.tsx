import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatisticsPanel from '@/components/StatisticsPanel';
import * as anomalyService from '@/services/anomalyService';

// Mock del servicio de anomalías
jest.mock('@/services/anomalyService', () => ({
  getStatistics: jest.fn(),
}));

describe('Statistics Panel Integration Flow', () => {
  const mockStatistics = {
    total_images: 2500,
    anomalies_detected: 150,
    anomaly_count: 150,
    classified_images: 120,
    average_anomaly_score: 12.45,
    normal_count: 2350,
    user_confirmed_anomalies: 75,
    unclassified_anomalies: 30,
    false_positives: 15,
    false_negatives: 5,
    storage_type: 'Cloud Storage',
    storage_location: '/data/images',
    recent_activity: [
      { event: 'image_processed', timestamp: '2025-04-30T14:55:00Z', image_id: 'img-1' },
      { event: 'anomaly_detected', timestamp: '2025-04-30T14:52:00Z', image_id: 'img-2' },
      { event: 'user_classification', timestamp: '2025-04-30T14:45:00Z', image_id: 'img-3' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configure mocks
    (anomalyService.getStatistics as jest.Mock).mockResolvedValue(mockStatistics);
  });

  it('should fetch and display statistics on load', async () => {
    render(<StatisticsPanel userMode={true} />);
    
    // Verificar que el servicio se llamó
    expect(anomalyService.getStatistics).toHaveBeenCalledWith(true);
    
    // Esperar a que los datos se carguen y verificar que se muestren correctamente
    await waitFor(() => {
      // Verificar métricas principales
      expect(screen.getByText('2,500')).toBeInTheDocument(); // Total images
      expect(screen.getByText('150')).toBeInTheDocument(); // Anomaly count
      expect(screen.getByText('(6.0%)')).toBeInTheDocument(); // Anomaly percentage
      
      // Verificar la sección de estadísticas del sistema
      expect(screen.getByText('System Statistics')).toBeInTheDocument();
      // Verificar las acciones recomendadas
      expect(screen.getByText('Recommended Actions')).toBeInTheDocument();
    });
  });

  it('should handle loading state', async () => {
    // Configurar el mock para simular una carga lenta
    (anomalyService.getStatistics as jest.Mock).mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve(mockStatistics), 100);
      });
    });
    
    const { container } = render(<StatisticsPanel userMode={false} />);
    
    // En el estado de carga, el panel debería tener una clase animate-pulse
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    
    // Esperar a que los datos se carguen
    await waitFor(() => {
      expect(screen.getByText('System Statistics')).toBeInTheDocument();
      expect(screen.getByText('2,500')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('should handle error state', async () => {
    // Configurar el mock para simular un error
    (anomalyService.getStatistics as jest.Mock).mockRejectedValue(new Error('Failed to fetch statistics'));
    
    render(<StatisticsPanel userMode={true} />);
    
    // Esperar a que se procese el error
    await waitFor(() => {
      expect(screen.getByText('Failed to load statistics. Please try again later.')).toBeInTheDocument();
    });
  });

  it('should render basic statistics view when userMode is false', async () => {
    render(<StatisticsPanel userMode={false} />);
    
    // Verificar que el servicio se llamó
    expect(anomalyService.getStatistics).toHaveBeenCalledWith(true);
    
    await waitFor(() => {
      // Verificar métricas principales siguen presentes
      expect(screen.getByText('2,500')).toBeInTheDocument(); // Total images
      expect(screen.getByText('150')).toBeInTheDocument(); // Anomaly count
      expect(screen.getByText('(6.0%)')).toBeInTheDocument(); // Anomaly percentage
    });
  });

  it('should display user agreement data', async () => {
    // Mock de estadísticas con datos de acuerdo de usuario
    const statsWithUserAgreement = {
      ...mockStatistics,
      user_agreement: 85 // El componente calcula esto pero podemos verificar el resultado
    };
    
    (anomalyService.getStatistics as jest.Mock).mockResolvedValue(statsWithUserAgreement);
    
    render(<StatisticsPanel userMode={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('85%')).toBeInTheDocument(); // User agreement
      expect(screen.getByText('AI vs. human classification')).toBeInTheDocument();
    });
  });

  it('should display recommended actions based on data', async () => {
    render(<StatisticsPanel userMode={true} />);
    
    await waitFor(() => {
      // Verificar que se muestran las acciones recomendadas según los datos
      expect(screen.getByText(/30 anomalies need expert review/)).toBeInTheDocument();
      expect(screen.getByText(/15 potential false positives detected/)).toBeInTheDocument();
    });
  });
});