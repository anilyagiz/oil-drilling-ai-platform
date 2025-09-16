const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Mock the database and OpenAI for isolated testing
jest.mock('sqlite3', () => ({
  verbose: () => ({
    Database: jest.fn().mockImplementation(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    }))
  })
}));

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({}));
});

describe('Excel Processing Integration', () => {
  const createTestExcelFile = (data, filename = 'test.xlsx') => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const filePath = path.join(__dirname, filename);
    XLSX.writeFile(wb, filePath);
    return filePath;
  };

  const cleanupFile = (filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  };

  describe('Excel File Reading', () => {
    it('should read Excel file with correct structure', () => {
      const testData = [
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
        }
      ];

      const filePath = createTestExcelFile(testData);
      
      // Read the file back
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      expect(data).toHaveLength(1);
      expect(data[0]).toHaveProperty('DEPTH', 100);
      expect(data[0]).toHaveProperty('%SH', 0.25);
      expect(data[0]).toHaveProperty('DT', 80);
      expect(data[0]).toHaveProperty('GR', 45);

      cleanupFile(filePath);
    });

    it('should handle Excel files with multiple sheets', () => {
      const testData = [
        { DEPTH: 100, '%SH': 0.25, '%SS': 0.35, '%LS': 0.20, '%DOL': 0.10, '%ANH': 0.05, '%Coal': 0.03, '%Salt': 0.02, DT: 80, GR: 45 }
      ];

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(testData);
      const ws2 = XLSX.utils.json_to_sheet([{ OTHER: 'data' }]);
      
      XLSX.utils.book_append_sheet(wb, ws1, 'WellData');
      XLSX.utils.book_append_sheet(wb, ws2, 'OtherData');
      
      const filePath = path.join(__dirname, 'multi_sheet_test.xlsx');
      XLSX.writeFile(wb, filePath);

      // Read the file - should use first sheet
      const workbook = XLSX.readFile(filePath);
      expect(workbook.SheetNames).toHaveLength(2);
      expect(workbook.SheetNames[0]).toBe('WellData');

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      expect(data[0]).toHaveProperty('DEPTH', 100);

      cleanupFile(filePath);
    });

    it('should handle Excel files with empty rows', () => {
      const testData = [
        { DEPTH: 100, '%SH': 0.25, '%SS': 0.35, '%LS': 0.20, '%DOL': 0.10, '%ANH': 0.05, '%Coal': 0.03, '%Salt': 0.02, DT: 80, GR: 45 },
        {}, // Empty row
        { DEPTH: 200, '%SH': 0.30, '%SS': 0.30, '%LS': 0.25, '%DOL': 0.08, '%ANH': 0.04, '%Coal': 0.02, '%Salt': 0.01, DT: 85, GR: 50 }
      ];

      const filePath = createTestExcelFile(testData);
      
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { blankrows: false });

      // Should filter out empty rows
      expect(data).toHaveLength(2);
      expect(data[0]).toHaveProperty('DEPTH', 100);
      expect(data[1]).toHaveProperty('DEPTH', 200);

      cleanupFile(filePath);
    });
  });

  describe('Data Validation', () => {
    it('should validate required columns', () => {
      const requiredColumns = ['DEPTH', '%SH', '%SS', '%LS', '%DOL', '%ANH', '%Coal', '%Salt', 'DT', 'GR'];
      
      const incompleteData = [
        { DEPTH: 100, '%SH': 0.25 } // Missing most columns
      ];

      const filePath = createTestExcelFile(incompleteData);
      
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const headers = Object.keys(data[0]);
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      expect(missingColumns.length).toBeGreaterThan(0);
      expect(missingColumns).toContain('%SS');
      expect(missingColumns).toContain('DT');
      expect(missingColumns).toContain('GR');

      cleanupFile(filePath);
    });

    it('should validate data types', () => {
      const invalidData = [
        {
          DEPTH: 'invalid', // Should be number
          '%SH': 1.5,       // Should be between 0-1
          '%SS': 0.35,
          '%LS': 0.20,
          '%DOL': 0.10,
          '%ANH': 0.05,
          '%Coal': 0.03,
          '%Salt': 0.02,
          DT: 'also invalid', // Should be number
          GR: 45
        }
      ];

      const filePath = createTestExcelFile(invalidData);
      
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const row = data[0];
      
      // Check data type validation
      expect(typeof row.DEPTH).toBe('string'); // Invalid
      expect(typeof row['%SH']).toBe('number');
      expect(row['%SH']).toBeGreaterThan(1); // Invalid range
      expect(typeof row.DT).toBe('string'); // Invalid

      cleanupFile(filePath);
    });

    it('should validate percentage sum', () => {
      const testData = [
        {
          DEPTH: 100,
          '%SH': 0.25,
          '%SS': 0.35,
          '%LS': 0.20,
          '%DOL': 0.10,
          '%ANH': 0.05,
          '%Coal': 0.03,
          '%Salt': 0.02, // Sum = 1.00 (valid)
          DT: 80,
          GR: 45
        },
        {
          DEPTH: 200,
          '%SH': 0.50,
          '%SS': 0.30,
          '%LS': 0.10,
          '%DOL': 0.05,
          '%ANH': 0.02,
          '%Coal': 0.01,
          '%Salt': 0.01, // Sum = 0.99 (valid, within tolerance)
          DT: 85,
          GR: 50
        },
        {
          DEPTH: 300,
          '%SH': 0.60,
          '%SS': 0.30,
          '%LS': 0.20,
          '%DOL': 0.10,
          '%ANH': 0.05,
          '%Coal': 0.03,
          '%Salt': 0.02, // Sum = 1.30 (invalid)
          DT: 90,
          GR: 55
        }
      ];

      const filePath = createTestExcelFile(testData);
      
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Validate percentage sums
      data.forEach((row, index) => {
        const sum = (row['%SH'] || 0) + (row['%SS'] || 0) + (row['%LS'] || 0) + 
                   (row['%DOL'] || 0) + (row['%ANH'] || 0) + (row['%Coal'] || 0) + (row['%Salt'] || 0);
        
        if (index < 2) {
          expect(Math.abs(sum - 1)).toBeLessThanOrEqual(0.01); // Valid
        } else {
          expect(Math.abs(sum - 1)).toBeGreaterThan(0.01); // Invalid
        }
      });

      cleanupFile(filePath);
    });
  });

  describe('Data Processing', () => {
    it('should calculate dominant rock type correctly', () => {
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
        },
        {
          DEPTH: 200,
          '%SH': 0.10,
          '%SS': 0.70, // Dominant
          '%LS': 0.10,
          '%DOL': 0.05,
          '%ANH': 0.03,
          '%Coal': 0.01,
          '%Salt': 0.01,
          DT: 85,
          GR: 50
        }
      ];

      const filePath = createTestExcelFile(testData);
      
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Process data to find dominant rock types
      const processedData = data.map(row => {
        const rockTypes = {
          'Shale': row['%SH'] || 0,
          'Sandstone': row['%SS'] || 0,
          'Limestone': row['%LS'] || 0,
          'Dolomite': row['%DOL'] || 0,
          'Anhydrite': row['%ANH'] || 0,
          'Coal': row['%Coal'] || 0,
          'Salt': row['%Salt'] || 0
        };

        const dominantRockType = Object.keys(rockTypes).reduce((a, b) => 
          rockTypes[a] > rockTypes[b] ? a : b
        );

        return { ...row, dominantRockType };
      });

      expect(processedData[0].dominantRockType).toBe('Shale');
      expect(processedData[1].dominantRockType).toBe('Sandstone');

      cleanupFile(filePath);
    });

    it('should calculate statistics correctly', () => {
      const testData = [
        { DEPTH: 100, '%SH': 0.25, '%SS': 0.35, '%LS': 0.20, '%DOL': 0.10, '%ANH': 0.05, '%Coal': 0.03, '%Salt': 0.02, DT: 80, GR: 45 },
        { DEPTH: 200, '%SH': 0.30, '%SS': 0.30, '%LS': 0.25, '%DOL': 0.08, '%ANH': 0.04, '%Coal': 0.02, '%Salt': 0.01, DT: 85, GR: 50 },
        { DEPTH: 300, '%SH': 0.35, '%SS': 0.25, '%LS': 0.30, '%DOL': 0.06, '%ANH': 0.03, '%Coal': 0.01, '%Salt': 0.00, DT: 90, GR: 55 }
      ];

      const filePath = createTestExcelFile(testData);
      
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      // Calculate statistics
      const depths = data.map(row => row.DEPTH);
      const dtValues = data.map(row => row.DT);
      const grValues = data.map(row => row.GR);
      
      const stats = {
        totalRows: data.length,
        depthRange: {
          min: Math.min(...depths),
          max: Math.max(...depths)
        },
        averages: {
          DT: dtValues.reduce((sum, val) => sum + val, 0) / dtValues.length,
          GR: grValues.reduce((sum, val) => sum + val, 0) / grValues.length
        }
      };

      expect(stats.totalRows).toBe(3);
      expect(stats.depthRange.min).toBe(100);
      expect(stats.depthRange.max).toBe(300);
      expect(stats.averages.DT).toBe(85); // (80 + 85 + 90) / 3
      expect(stats.averages.GR).toBe(50); // (45 + 50 + 55) / 3

      cleanupFile(filePath);
    });

    it('should handle null and undefined values', () => {
      const testData = [
        {
          DEPTH: 100,
          '%SH': null,
          '%SS': 0.50,
          '%LS': undefined,
          '%DOL': 0.30,
          '%ANH': 0.20,
          '%Coal': 0,
          '%Salt': 0,
          DT: null,
          GR: 45
        }
      ];

      const filePath = createTestExcelFile(testData);
      
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const row = data[0];
      
      // Process null/undefined values
      const processedRow = {
        DEPTH: parseFloat(row.DEPTH) || null,
        SH: parseFloat(row['%SH']) || 0,
        SS: parseFloat(row['%SS']) || 0,
        LS: parseFloat(row['%LS']) || 0,
        DOL: parseFloat(row['%DOL']) || 0,
        ANH: parseFloat(row['%ANH']) || 0,
        Coal: parseFloat(row['%Coal']) || 0,
        Salt: parseFloat(row['%Salt']) || 0,
        DT: parseFloat(row.DT) || null,
        GR: parseFloat(row.GR) || null
      };

      expect(processedRow.DEPTH).toBe(100);
      expect(processedRow.SH).toBe(0); // null converted to 0
      expect(processedRow.SS).toBe(0.50);
      expect(processedRow.LS).toBe(0); // undefined converted to 0
      expect(processedRow.DT).toBe(null); // null preserved for DT
      expect(processedRow.GR).toBe(45);

      cleanupFile(filePath);
    });
  });

  describe('Large File Processing', () => {
    it('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        DEPTH: i * 10,
        '%SH': 0.20 + Math.random() * 0.30,
        '%SS': 0.20 + Math.random() * 0.30,
        '%LS': 0.10 + Math.random() * 0.20,
        '%DOL': 0.05 + Math.random() * 0.15,
        '%ANH': 0.02 + Math.random() * 0.08,
        '%Coal': 0.01 + Math.random() * 0.04,
        '%Salt': 0.00 + Math.random() * 0.03,
        DT: 70 + Math.random() * 40,
        GR: 30 + Math.random() * 50
      }));

      const filePath = createTestExcelFile(largeData, 'large_test.xlsx');
      
      const startTime = Date.now();
      
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(data).toHaveLength(1000);
      expect(processingTime).toBeLessThan(5000); // Should process within 5 seconds
      
      // Verify data integrity
      expect(data[0]).toHaveProperty('DEPTH', 0);
      expect(data[999]).toHaveProperty('DEPTH', 9990);

      cleanupFile(filePath);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent Excel files', () => {
      const nonExistentFilePath = path.join(__dirname, 'non-existent.xlsx');
      
      expect(() => {
        XLSX.readFile(nonExistentFilePath);
      }).toThrow();
    });

    it('should handle Excel files with no data', () => {
      const emptyData = [];
      const filePath = createTestExcelFile(emptyData);
      
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      expect(data).toHaveLength(0);

      cleanupFile(filePath);
    });

    it('should handle Excel files with only headers', () => {
      // Create file with headers but no data
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        ['DEPTH', '%SH', '%SS', '%LS', '%DOL', '%ANH', '%Coal', '%Salt', 'DT', 'GR']
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      
      const filePath = path.join(__dirname, 'headers_only.xlsx');
      XLSX.writeFile(wb, filePath);
      
      const workbook = XLSX.readFile(filePath);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      expect(data).toHaveLength(0); // No data rows

      cleanupFile(filePath);
    });
  });
});