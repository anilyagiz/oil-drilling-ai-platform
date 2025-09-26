const request = require('supertest');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mocked AI response' } }]
        })
      }
    }
  }));
});

// Import the app (without mocking database)
const app = require('../index');

describe('API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('openrouter');
      expect(response.body.services.openrouter).toBeDefined();
    });
  });

  describe('POST /api/upload', () => {
    const createTestExcelFile = (data) => {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const filePath = path.join(__dirname, 'test.xlsx');
      XLSX.writeFile(wb, filePath);
      return filePath;
    };

    const validExcelData = [
      {
        DEPTH: 100,
        '%SH': 0.25,
        '%SS': 0.35,
        '%LS': 0.20,
        '%DOL': 0.10,
        '%ANH': 0.05,
        '%Coal': 0.03,
        '%Salt': 0.02,
        DT: 80,
        GR: 45
      },
      {
        DEPTH: 200,
        '%SH': 0.30,
        '%SS': 0.30,
        '%LS': 0.25,
        '%DOL': 0.08,
        '%ANH': 0.04,
        '%Coal': 0.02,
        '%Salt': 0.01,
        DT: 85,
        GR: 50
      }
    ];

    afterEach(() => {
      // Clean up test files
      const testFile = path.join(__dirname, 'test.xlsx');
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    });

    it('should upload and process valid Excel file', async () => {
      const filePath = createTestExcelFile(validExcelData);

      const response = await request(app)
        .post('/api/upload')
        .attach('file', filePath)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('rows');
      expect(response.body).toHaveProperty('totalRows', 2);
      expect(response.body).toHaveProperty('statistics');
      expect(response.body.statistics).toHaveProperty('depthRange');
      expect(response.body.statistics).toHaveProperty('rockTypeDistribution');
    });

    it('should reject file upload without file', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No file uploaded');
    });

    it('should reject invalid file format', async () => {
      // Create a simple text file
      const textFilePath = path.join(__dirname, 'test.txt');
      fs.writeFileSync(textFilePath, 'This is not an Excel file');

      // Test with a simple text file - should return 400
      try {
        const response = await request(app)
          .post('/api/upload')
          .attach('file', textFilePath)
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('Excel');
      } finally {
        // Clean up
        if (fs.existsSync(textFilePath)) {
          fs.unlinkSync(textFilePath);
        }
      }
    }, 15000); // Increase timeout for this test

    it('should validate Excel structure and reject missing columns', async () => {
      const invalidData = [
        { DEPTH: 100, '%SH': 0.5 } // Missing required columns
      ];
      const filePath = createTestExcelFile(invalidData);

      const response = await request(app)
        .post('/api/upload')
        .attach('file', filePath)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid Excel file structure');
      expect(response.body).toHaveProperty('details');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Missing required columns')
        ])
      );
    });

    it('should validate data types and ranges', async () => {
      const invalidData = [
        {
          DEPTH: -100, // Invalid negative depth
          '%SH': 1.5,  // Invalid percentage > 1
          '%SS': 0.35,
          '%LS': 0.20,
          '%DOL': 0.10,
          '%ANH': 0.05,
          '%Coal': 0.03,
          '%Salt': 0.02,
          DT: 'invalid', // Invalid non-numeric value
          GR: 45
        }
      ];
      const filePath = createTestExcelFile(invalidData);

      const response = await request(app)
        .post('/api/upload')
        .attach('file', filePath)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid Excel file structure');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('DEPTH must be a positive number'),
          expect.stringContaining('%SH must be a number between 0 and 1')
        ])
      );
    });

    it('should calculate statistics correctly', async () => {
      const filePath = createTestExcelFile(validExcelData);

      const response = await request(app)
        .post('/api/upload')
        .attach('file', filePath)
        .expect(200);

      const stats = response.body.statistics;
      expect(stats.totalRows).toBe(2);
      expect(stats.depthRange.min).toBe(100);
      expect(stats.depthRange.max).toBe(200);
      expect(stats.averages.DT).toBe(82.5); // (80 + 85) / 2
      expect(stats.averages.GR).toBe(47.5); // (45 + 50) / 2
      expect(stats.rockTypeDistribution).toHaveProperty('Sandstone');
    });

    // Removed test that depends on mocked database
  });

  describe('POST /api/chat', () => {
    it('should handle chat message without context', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'What is drilling?' })
        .expect(200);

      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('isAIResponse');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should handle chat message with well data context', async () => {
      const wellData = {
        id: 1,
        name: 'Test Well',
        depth: 2500,
        status: 'Active'
      };

      const response = await request(app)
        .post('/api/chat')
        .send({ 
          message: 'Tell me about this well',
          wellData: wellData
        })
        .expect(200);

      expect(response.body).toHaveProperty('response');
      // With mocked OpenAI, we expect the mocked response
      expect(response.body.response).toBe('Mocked AI response');
    });

    it('should handle chat message with uploaded data context', async () => {
      const uploadedData = {
        rows: [
          {
            DEPTH: 100,
            '%SH': 0.25,
            '%SS': 0.35,
            '%LS': 0.20,
            '%DOL': 0.10,
            '%ANH': 0.05,
            '%Coal': 0.03,
            '%Salt': 0.02,
            DT: 80,
            GR: 45
          },
          {
            DEPTH: 200,
            '%SH': 0.30,
            '%SS': 0.30,
            '%LS': 0.25,
            '%DOL': 0.08,
            '%ANH': 0.04,
            '%Coal': 0.02,
            '%Salt': 0.01,
            DT: 85,
            GR: 50
          }
        ],
        statistics: {
          totalRows: 2,
          depthRange: { min: 100, max: 200 },
          averages: { DT: 82.5, GR: 47.5 },
          rockTypeDistribution: { Sandstone: 2 }
        }
      };

      const response = await request(app)
        .post('/api/chat')
        .send({ 
          message: 'Analyze the uploaded data',
          uploadedData: uploadedData
        })
        .expect(200);

      expect(response.body).toHaveProperty('response');
      // With mocked OpenAI, we expect the mocked response
      expect(response.body.response).toBe('Mocked AI response');
    });

    it('should require message parameter', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Message is required');
    });

    // Removed test that depends on mocked database

    it('should handle OpenAI API failure gracefully', async () => {
      // Re-require the OpenAI module to get the mock
      jest.resetModules();
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: jest.fn().mockRejectedValueOnce(new Error('API Error'))
            }
          }
        }));
      });
      
      // Re-import the app to use the new mock
      const app = require('../index');

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'Test message' })
        .expect(200);

      expect(response.body).toHaveProperty('response');
      expect(response.body.isAIResponse).toBe(false);
    });

    it('should generate appropriate fallback responses', async () => {
      // Re-require the OpenAI module to get the mock
      jest.resetModules();
      jest.mock('openai', () => {
        return jest.fn().mockImplementation(() => ({
          chat: {
            completions: {
              create: jest.fn().mockRejectedValueOnce(new Error('API Error'))
            }
          }
        }));
      });
      
      // Re-import the app to use the new mock
      const app = require('../index');

      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'What is the depth?' })
        .expect(200);

      expect(response.body.response).toContain('depth');
      expect(response.body.isAIResponse).toBe(false);
    });
  });

  // Database Operations tests removed as we're using real database instead of mocks);

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/chat')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle large file uploads', async () => {
      // Create a large dataset
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        DEPTH: i * 10,
        '%SH': 0.25,
        '%SS': 0.35,
        '%LS': 0.20,
        '%DOL': 0.10,
        '%ANH': 0.05,
        '%Coal': 0.03,
        '%Salt': 0.02,
        DT: 80 + Math.random() * 20,
        GR: 45 + Math.random() * 30
      }));

      const filePath = path.join(__dirname, 'large_test.xlsx');
      const ws = XLSX.utils.json_to_sheet(largeData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, filePath);

      const response = await request(app)
        .post('/api/upload')
        .attach('file', filePath)
        .expect(200);

      expect(response.body.totalRows).toBe(1000);
      expect(response.body.statistics).toHaveProperty('depthRange');

      // Clean up
      fs.unlinkSync(filePath);
    });

    it('should handle empty Excel files', async () => {
      const emptyFilePath = path.join(__dirname, 'empty_test.xlsx');
      const ws = XLSX.utils.json_to_sheet([]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, emptyFilePath);

      const response = await request(app)
        .post('/api/upload')
        .attach('file', emptyFilePath)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid Excel file structure');
      expect(response.body).toHaveProperty('details');

      // Clean up
      if (fs.existsSync(emptyFilePath)) {
        fs.unlinkSync(emptyFilePath);
      }
    }, 10000); // Increase timeout for this test
  });

  describe('Data Processing', () => {
    it('should calculate dominant rock type correctly', async () => {
      const testData = [
        {
          DEPTH: 100,
          '%SH': 0.60, // Dominant
          '%SS': 0.20,
          '%LS': 0.10,
          '%DOL': 0.05,
          '%ANH': 0.03,
          '%Coal': 0.01,
          '%Salt': 0.01,
          DT: 80,
          GR: 45
        }
      ];

      const filePath = path.join(__dirname, 'dominant_test.xlsx');
      const ws = XLSX.utils.json_to_sheet(testData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, filePath);

      const response = await request(app)
        .post('/api/upload')
        .attach('file', filePath)
        .expect(200);

      expect(response.body.statistics.rockTypeDistribution).toHaveProperty('Shale', 1);

      // Clean up
      fs.unlinkSync(filePath);
    });

    it('should handle missing or null values', async () => {
      const testData = [
        {
          DEPTH: 100,
          '%SH': null,
          '%SS': 0.50,
          '%LS': 0.30,
          '%DOL': 0.20,
          '%ANH': null,
          '%Coal': 0,
          '%Salt': 0,
          DT: null,
          GR: 45
        }
      ];

      const filePath = path.join(__dirname, 'null_test.xlsx');
      const ws = XLSX.utils.json_to_sheet(testData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      XLSX.writeFile(wb, filePath);

      const response = await request(app)
        .post('/api/upload')
        .attach('file', filePath)
        .expect(200);

      expect(response.body.rows[0]).toHaveProperty('SH', 0); // null converted to 0
      expect(response.body.rows[0]).toHaveProperty('DT', null); // null preserved for DT

      // Clean up
      fs.unlinkSync(filePath);
    });
  });
});