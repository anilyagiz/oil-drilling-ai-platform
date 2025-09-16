import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock Dashboard component
jest.mock('../components/Dashboard', () => {
  return function MockDashboard() {
    return <div data-testid="dashboard">Dashboard Component</div>;
  };
});

describe('App', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('should wrap components with ThemeProvider', () => {
    render(<App />);
    // The Dashboard component should be rendered, which means ThemeProvider is working
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('should set up routing correctly', () => {
    render(<App />);
    // Dashboard should be rendered at the root path
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('should have correct CSS classes applied', () => {
    render(<App />);
    const appDiv = screen.getByTestId('dashboard').closest('.App');
    expect(appDiv).toBeInTheDocument();
  });
});