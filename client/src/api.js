// Centralized API base URL configuration
// In development, you can rely on a CRA proxy (setup in package.json) or set REACT_APP_API_BASE.
// In production (GitHub Pages), set REACT_APP_API_BASE to your deployed backend URL.

const DEFAULT_DEV_BASE = 'http://localhost:5000';

export const API_BASE_URL =
  process.env.REACT_APP_API_BASE && process.env.REACT_APP_API_BASE.trim() !== ''
    ? process.env.REACT_APP_API_BASE
    : (process.env.NODE_ENV === 'development' ? DEFAULT_DEV_BASE : '');

export function apiUrl(path) {
  // If API_BASE_URL is empty in production, requests will go relative and will likely fail on Pages.
  // Components should handle errors gracefully and inform the user to configure a backend URL.
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}
