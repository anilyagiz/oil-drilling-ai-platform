import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataVisualization from '../DataVisualization';

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
}));

const mockWell = {
  id: 1,
  name: 'Test Well',
  depth: 2500,
  status: 'Active'
};

const mockUploadedData = {
  wells: [mockWell],
  data: [
    {
      depth: 100,
      shale_percent: 25,
      sandstone_percent: 35,
      limestone_percent: 20,
      dolomite_percent: 10,
      anhydrite_percent: 5,
      coal_percent: 3,
      salt_percent: 2,
      dt: 80,
      gr: 45
    },
    {
      depth: 200,
      shale_percent: 30,
      sandstone_percent: 30,
      limestone_percent: 25,
      dolomite_percent: 8,
      anhydrite_percent: 4,
      coal_percent: 2,
      salt_percent: 1,
      dt: 85,
      gr: 50
    }
  ]
};

describe('DataVisualization', () => {
  it('should render no data message when no well or data is provided', () => {
    render(<DataVisualization selectedWell={null} uploadedData={null} />);
    
    expect(screen.getByText('No Data Available')).toBeInTheDocument();
    expect(screen.getByText('Please select a well or upload data to view visualizations')).toBeInTheDocument();
  });

  it('should render data visualization when uploaded data is provided', () => {
    render(<DataVisualization selectedWell={null} uploadedData={mockUploadedData} />);
    
    expect(screen.getByText('Well Data Analysis')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should render data visualization when selected well is provided', () => {
    render(<DataVisualization selectedWell={mockWell} uploadedData={null} />);
    
    expect(screen.getByText('Well Data Analysis')).toBeInTheDocument();
  });

  it('should display chart type selector buttons', () => {
    render(<DataVisualization selectedWell={null} uploadedData={mockUploadedData} />);
    
    expect(screen.getByText('Rock Composition')).toBeInTheDocument();
    expect(screen.getByText('Well Logs')).toBeInTheDocument();
  });

  it('should switch between chart types when buttons are clicked', async () => {
    const user = userEvent.setup();
    render(<DataVisualization selectedWell={null} uploadedData={mockUploadedData} />);
    
    // Initially should show rock composition
    expect(screen.getByText('Rock Composition')).toHaveClass('bg-primary-500');
    
    // Click on Well Logs
    await user.click(screen.getByText('Well Logs'));
    
    expect(screen.getByText('Well Logs')).toHaveClass('bg-primary-500');
    expect(screen.getByText('Rock Composition')).not.toHaveClass('bg-primary-500');
  });

  it('should display data summary statistics', () => {
    render(<DataVisualization selectedWell={null} uploadedData={mockUploadedData} />);
    
    expect(screen.getByText('Data Summary')).toBeInTheDocument();
    expect(screen.getByText('Total Samples')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Number of data points
  });

  it('should display depth range in summary', () => {
    render(<DataVisualization selectedWell={null} uploadedData={mockUploadedData} />);
    
    expect(screen.getByText('Depth Range')).toBeInTheDocument();
    expect(screen.getByText('100 - 200m')).toBeInTheDocument();
  });

  it('should display average values in summary', () => {
    render(<DataVisualization selectedWell={null} uploadedData={mockUploadedData} />);
    
    expect(screen.getByText('Avg Shale')).toBeInTheDocument();
    expect(screen.getByText('27.5%')).toBeInTheDocument(); // Average of 25 and 30
  });

  it('should render line chart for rock composition view', () => {
    render(<DataVisualization selectedWell={null} uploadedData={mockUploadedData} />);
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getAllByTestId('line')).toHaveLength(7); // 7 rock composition types
  });

  it('should render bar chart for well logs view', async () => {
    const user = userEvent.setup();
    render(<DataVisualization selectedWell={null} uploadedData={mockUploadedData} />);
    
    await user.click(screen.getByText('Well Logs'));
    
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getAllByTestId('bar')).toHaveLength(2); // DT and GR
  });

  it('should handle empty data gracefully', () => {
    const emptyData = { wells: [], data: [] };
    render(<DataVisualization selectedWell={null} uploadedData={emptyData} />);
    
    expect(screen.getByText('No Data Available')).toBeInTheDocument();
  });

  it('should display chart legend and axes', () => {
    render(<DataVisualization selectedWell={null} uploadedData={mockUploadedData} />);
    
    expect(screen.getByTestId('legend')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
  });

  it('should prioritize uploaded data over selected well', () => {
    render(<DataVisualization selectedWell={mockWell} uploadedData={mockUploadedData} />);
    
    // Should show uploaded data visualization, not just selected well
    expect(screen.getByText('Well Data Analysis')).toBeInTheDocument();
    expect(screen.getByText('Total Samples')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display responsive design elements', () => {
    render(<DataVisualization selectedWell={null} uploadedData={mockUploadedData} />);
    
    // Check for responsive container
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    
    // Check for mobile-friendly button layout
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});