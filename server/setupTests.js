// Test setup for server-side tests
const fs = require('fs');
const path = require('path');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-api-key';

// Clean up test database after each test
afterEach(() => {
  const testDbPath = path.join(__dirname, 'test_well_data.db');
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }
});

// Mock console.log to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};