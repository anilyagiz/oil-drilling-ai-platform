const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

test.describe('File Upload E2E Tests', () => {
  const testFilesDir = path.join(__dirname, 'test-files');
  
  test.beforeAll(async () => {
    // Create test files directory
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
    
    // Create valid test Excel file
    const validData = [
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
    
    const ws = XLSX.utils.json_to_sheet(validData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, path.join(testFilesDir, 'valid-well-data.xlsx'));
    
    // Create invalid test file (text file)
    fs.writeFileSync(path.join(testFilesDir, 'invalid-file.txt'), 'This is not an Excel file');
    
    // Create invalid Excel file (missing columns)
    const invalidData = [{ DEPTH: 100, '%SH': 0.25 }];
    const invalidWs = XLSX.utils.json_to_sheet(invalidData);
    const invalidWb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(invalidWb, invalidWs, 'Sheet1');
    XLSX.writeFile(invalidWb, path.join(testFilesDir, 'invalid-structure.xlsx'));
  });

  test.afterAll(async () => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ensure we're on the upload tab
    await page.getByText('Upload Data').click();
  });

  test('should display upload interface correctly', async ({ page }) => {
    await expect(page.getByText('Upload Well Data')).toBeVisible();
    await expect(page.getByText('Upload your Excel file containing well drilling data for analysis')).toBeVisible();
    await expect(page.getByText('Drag and drop your Excel file here')).toBeVisible();
    await expect(page.getByText('Choose File')).toBeVisible();
    await expect(page.getByText('Expected Data Format')).toBeVisible();
    
    // Check expected format details
    await expect(page.getByText('DEPTH:')).toBeVisible();
    await expect(page.getByText('%SH:')).toBeVisible();
    await expect(page.getByText('DT:')).toBeVisible();
    await expect(page.getByText('GR:')).toBeVisible();
  });

  test('should upload valid Excel file successfully', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded and processed successfully',
          rows: [
            { DEPTH: 100, SH: 0.25, SS: 0.35, DT: 80, GR: 45 },
            { DEPTH: 200, SH: 0.30, SS: 0.30, DT: 85, GR: 50 }
          ],
          totalRows: 2,
          statistics: {
            depthRange: { min: 100, max: 200 },
            averages: { DT: 82.5, GR: 47.5 },
            rockTypeDistribution: { Sandstone: 2 }
          }
        })
      });
    });

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'valid-well-data.xlsx'));

    // Wait for upload to complete
    await expect(page.getByText('File uploaded and processed successfully!')).toBeVisible();
    
    // Should show file info
    await expect(page.getByText('valid-well-data.xlsx')).toBeVisible();
    
    // Should automatically switch to visualization tab
    await expect(page.getByText('Well Data Analysis')).toBeVisible();
  });

  test('should reject invalid file types', async ({ page }) => {
    // Upload invalid file type
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'invalid-file.txt'));

    // Should show error message
    await expect(page.getByText('Please upload an Excel file (.xlsx or .xls)')).toBeVisible();
    
    // Should not make API call
    let apiCalled = false;
    await page.route('**/api/upload', async route => {
      apiCalled = true;
      await route.continue();
    });
    
    await page.waitForTimeout(1000);
    expect(apiCalled).toBe(false);
  });

  test('should handle server validation errors', async ({ page }) => {
    // Mock server validation error
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Invalid Excel file structure',
          details: ['Missing required columns: %SS, %LS, DT, GR'],
          suggestions: ['Ensure your Excel file contains all required columns']
        })
      });
    });

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'invalid-structure.xlsx'));

    // Should show validation error
    await expect(page.getByText('Missing required columns: %SS, %LS, DT, GR')).toBeVisible();
  });

  test('should show loading state during upload', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/upload', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded and processed successfully',
          rows: [],
          totalRows: 0,
          statistics: {}
        })
      });
    });

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'valid-well-data.xlsx'));

    // Should show loading state
    await expect(page.getByText('Processing file...')).toBeVisible();
    
    // Wait for completion
    await expect(page.getByText('File uploaded and processed successfully!')).toBeVisible();
  });

  test('should handle drag and drop upload', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded and processed successfully',
          rows: [],
          totalRows: 0,
          statistics: {}
        })
      });
    });

    // Get the drop zone
    const dropZone = page.getByText('Drag and drop your Excel file here').locator('..');

    // Create a file for drag and drop
    const buffer = fs.readFileSync(path.join(testFilesDir, 'valid-well-data.xlsx'));
    const dataTransfer = await page.evaluateHandle((buffer) => {
      const dt = new DataTransfer();
      const file = new File([new Uint8Array(buffer)], 'valid-well-data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      dt.items.add(file);
      return dt;
    }, Array.from(buffer));

    // Simulate drag and drop
    await dropZone.dispatchEvent('dragenter', { dataTransfer });
    await dropZone.dispatchEvent('dragover', { dataTransfer });
    await dropZone.dispatchEvent('drop', { dataTransfer });

    // Should show success message
    await expect(page.getByText('File uploaded and processed successfully!')).toBeVisible();
  });

  test('should clear uploaded file', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded and processed successfully',
          rows: [],
          totalRows: 0,
          statistics: {}
        })
      });
    });

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'valid-well-data.xlsx'));

    // Wait for upload
    await expect(page.getByText('valid-well-data.xlsx')).toBeVisible();

    // Click clear button (X)
    const clearButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await clearButton.click();

    // Should return to initial state
    await expect(page.getByText('Drag and drop your Excel file here')).toBeVisible();
    await expect(page.getByText('valid-well-data.xlsx')).not.toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/upload', async route => {
      await route.abort('failed');
    });

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'valid-well-data.xlsx'));

    // Should show error message
    await expect(page.getByText(/Failed to upload file/)).toBeVisible();
  });

  test('should display file size correctly', async ({ page }) => {
    // Mock successful API response
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded and processed successfully',
          rows: [],
          totalRows: 0,
          statistics: {}
        })
      });
    });

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'valid-well-data.xlsx'));

    // Should show file size
    await expect(page.locator('text=/\\d+\\.\\d+ MB/')).toBeVisible();
  });

  test('should integrate with data visualization', async ({ page }) => {
    // Mock successful API response with data
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded and processed successfully',
          rows: [
            { DEPTH: 100, SH: 0.25, SS: 0.35, DT: 80, GR: 45 },
            { DEPTH: 200, SH: 0.30, SS: 0.30, DT: 85, GR: 50 }
          ],
          totalRows: 2,
          statistics: {
            depthRange: { min: 100, max: 200 },
            averages: { DT: 82.5, GR: 47.5 },
            rockTypeDistribution: { Sandstone: 2 }
          }
        })
      });
    });

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'valid-well-data.xlsx'));

    // Wait for upload and automatic tab switch
    await expect(page.getByText('Well Data Analysis')).toBeVisible();
    
    // Should show data summary
    await expect(page.getByText('Data Summary')).toBeVisible();
    await expect(page.getByText('Total Samples')).toBeVisible();
    await expect(page.getByText('2')).toBeVisible();
    
    // Should show depth range
    await expect(page.getByText('Depth Range')).toBeVisible();
    await expect(page.getByText('100 - 200m')).toBeVisible();
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    // Tab to file input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to focus on Choose File button
    const chooseFileButton = page.getByText('Choose File');
    await expect(chooseFileButton).toBeFocused();
    
    // Should be able to activate with Enter or Space
    await page.keyboard.press('Enter');
    // File dialog would open (can't test file dialog interaction in E2E)
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Upload interface should be responsive
    await expect(page.getByText('Upload Well Data')).toBeVisible();
    await expect(page.getByText('Choose File')).toBeVisible();
    
    // Expected format section should be visible
    await expect(page.getByText('Expected Data Format')).toBeVisible();
    
    // Upload should work on mobile
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded and processed successfully',
          rows: [],
          totalRows: 0,
          statistics: {}
        })
      });
    });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'valid-well-data.xlsx'));
    
    await expect(page.getByText('File uploaded and processed successfully!')).toBeVisible();
  });
});