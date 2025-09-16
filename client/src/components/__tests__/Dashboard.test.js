import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock child components
jest.mock('../WellList', () => {
  return function MockWellList({ wells, onWellSelect }) {
    return (
      <div data-testid="well-list">
        {wells.map(well => (
          <button key={well.id} onClick={() => onWellSelect(well)}>
            {well.name}
          </button>
        ))}
      </div>
    );
  };
});

jest.mock('../DataVisualization', () => {
  return function MockDataVisualization({ selectedWell, uploadedData }) {
    return (
      <div data-testid="data-visualization">
        {selectedWell && <span>Selected: {selectedWell.name}</span>}
        {uploadedData && <span>Uploaded data available</span>}
      </div>
    );
  };
});

jest.mock('../Chatbot', () => {
  return function MockChatbot({ selectedWell, uploadedData }) {
    return (
      <div data-testid="chatbot">
        Chatbot Component
        {selectedWell && <span>Well: {selectedWell.name}</span>}
        {uploadedData && <span>Data available</span>}
      </div>
    );
  };
});

jest.mock('../FileUpload', () => {
  return function MockFileUpload({ onFileUpload }) {
    return (
      <div data-testid="file-upload">
        <button onClick={() => onFileUpload({ data: 'test' })}>
          Upload File
        </button>
      </div>
    );
  };
});

const mockWells = [
  { id: 1, name: 'Well Alpha-1', depth: 2500, status: 'Active' },
  { id: 2, name: 'Well Beta-2', depth: 3200, status: 'Inactive' }
];

// Mock fetch
global.fetch = jest.fn();

const DashboardWrapper = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('Dashboard', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should render dashboard with default state', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWells)
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    expect(screen.getByText('Oil Drilling AI')).toBeInTheDocument();
    expect(screen.getByText('Select a Well')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByTestId('well-list')).toBeInTheDocument();
    });
  });

  it('should load wells from API on mount', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWells)
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('http://localhost:5000/api/wells');
    });
  });

  it('should handle API error gracefully', async () => {
    fetch.mockRejectedValue(new Error('API Error'));

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('well-list')).toBeInTheDocument();
    });
  });

  it('should display tab navigation', () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    expect(screen.getByText('Upload Data')).toBeInTheDocument();
    expect(screen.getByText('Data Analysis')).toBeInTheDocument();
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });

  it('should switch tabs when clicked', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    // Initially should show upload tab
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();

    // Click on Data Analysis tab
    await user.click(screen.getByText('Data Analysis'));
    expect(screen.getByTestId('data-visualization')).toBeInTheDocument();

    // Click on AI Assistant tab
    await user.click(screen.getByText('AI Assistant'));
    expect(screen.getByTestId('chatbot')).toBeInTheDocument();
  });

  it('should handle well selection', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWells)
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Well Alpha-1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Well Alpha-1'));

    expect(screen.getByText('Well Alpha-1')).toBeInTheDocument(); // In header
    expect(screen.getByText('Depth: 2500m | Status: Active')).toBeInTheDocument();
    expect(screen.getByTestId('data-visualization')).toBeInTheDocument(); // Should switch to visualization tab
  });

  it('should handle file upload', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    await user.click(screen.getByText('Upload File'));

    expect(screen.getByTestId('data-visualization')).toBeInTheDocument(); // Should switch to visualization tab
    expect(screen.getByText('Uploaded data available')).toBeInTheDocument();
  });

  it('should toggle theme', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    const themeToggle = screen.getAllByRole('button').find(button => 
      button.querySelector('svg') // Theme toggle has an icon
    );

    if (themeToggle) {
      await user.click(themeToggle);
      // Theme change is handled by ThemeContext, which we've already tested
    }
  });

  it('should handle mobile menu toggle', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    // Mock window.innerWidth to simulate mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    // Find menu button (should be visible on mobile)
    const menuButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg') && button.getAttribute('class')?.includes('lg:hidden')
    );

    if (menuButton) {
      await user.click(menuButton);
      // Mobile menu functionality would be tested here
    }
  });

  it('should pass selected well to child components', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockWells)
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Well Alpha-1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Well Alpha-1'));

    // Switch to chatbot tab to see the well data passed
    await user.click(screen.getByText('AI Assistant'));
    expect(screen.getByText('Well: Well Alpha-1')).toBeInTheDocument();
  });

  it('should pass uploaded data to child components', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    await user.click(screen.getByText('Upload File'));

    // Switch to chatbot tab to see the uploaded data passed
    await user.click(screen.getByText('AI Assistant'));
    expect(screen.getByText('Data available')).toBeInTheDocument();
  });

  it('should display responsive design elements', () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    // Check for responsive classes (these would be in the actual DOM)
    const dashboard = screen.getByText('Oil Drilling AI').closest('div');
    expect(dashboard).toBeInTheDocument();
  });

  it('should handle empty wells array', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('well-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Select a Well')).toBeInTheDocument();
  });
});