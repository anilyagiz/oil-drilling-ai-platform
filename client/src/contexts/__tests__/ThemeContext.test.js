import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../ThemeContext';

// Test component to use the theme context
const TestComponent = () => {
  const { isDark, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-status">{isDark ? 'dark' : 'light'}</span>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('should provide default light theme when no localStorage value exists', () => {
    localStorage.getItem.mockReturnValue(null);
    window.matchMedia.mockReturnValue({ matches: false });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-status')).toHaveTextContent('light');
  });

  it('should use dark theme from localStorage when available', () => {
    localStorage.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-status')).toHaveTextContent('dark');
  });

  it('should use system preference when no localStorage value exists', () => {
    localStorage.getItem.mockReturnValue(null);
    window.matchMedia.mockReturnValue({ matches: true });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-status')).toHaveTextContent('dark');
  });

  it('should toggle theme when toggleTheme is called', async () => {
    const user = userEvent.setup();
    localStorage.getItem.mockReturnValue(null);
    window.matchMedia.mockReturnValue({ matches: false });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-status')).toHaveTextContent('light');

    await user.click(screen.getByTestId('toggle-theme'));

    expect(screen.getByTestId('theme-status')).toHaveTextContent('dark');
  });

  it('should update localStorage when theme changes', async () => {
    const user = userEvent.setup();
    localStorage.getItem.mockReturnValue(null);
    window.matchMedia.mockReturnValue({ matches: false });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await user.click(screen.getByTestId('toggle-theme'));

    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should add dark class to document when dark theme is active', () => {
    localStorage.getItem.mockReturnValue('dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should throw error when useTheme is used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useTheme must be used within a ThemeProvider');

    consoleSpy.mockRestore();
  });
});