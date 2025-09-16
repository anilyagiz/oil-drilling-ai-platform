const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

test.describe('Data Visualization E2E Tests', () => {
  const testFilesDir = path.join(__dirname, 'test-files');
  
  test.beforeAll(async () => {
    // Create test files directory if it doesn't exist
    if (!fs.existsSync(testFilesDir)) {
      fs.mkdirSync(testFilesDir, { recursive: true });
    }
    
    // Create test Excel file with visualization data
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
      },
      {
        DEPTH: 300,
        '%SH': 0.35,
        '%SS': 0.25,
        '%LS': 0.30,
        '%DOL': 0.06,
        '%ANH': 0.03,
        '%Coal': 0.01,
        '%Salt': 0.00,
        DT: 90,
        GR: 55
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(testData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, path.join(testFilesDir, 'visualization-test-data.xlsx'));
  });

  test.afterAll(async () => {
    // Clean up test files
    if (fs.existsSync(testFilesDir)) {
      fs.rmSync(testFilesDir, { recursive: true, force: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show no data message initially', async ({ page }) => {
    // Navigate to data analysis tab
    await page.getByText('Data Analysis').click();
    
    // Should show no data message
    await expect(page.getByText('No Data Available')).toBeVisible();
    await expect(page.getByText('Please select a well or upload data to view visualizations')).toBeVisible();
  });

  test('should display data visualization after file upload', async ({ page }) => {
    // Mock successful upload with visualization data
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded and processed successfully',
          rows: [
            { DEPTH: 100, SH: 0.25, SS: 0.35, LS: 0.20, DOL: 0.10, ANH: 0.05, Coal: 0.03, Salt: 0.02, DT: 80, GR: 45 },
            { DEPTH: 200, SH: 0.30, SS: 0.30, LS: 0.25, DOL: 0.08, ANH: 0.04, Coal: 0.02, Salt: 0.01, DT: 85, GR: 50 },
            { DEPTH: 300, SH: 0.35, SS: 0.25, LS: 0.30, DOL: 0.06, ANH: 0.03, Coal: 0.01, Salt: 0.00, DT: 90, GR: 55 }
          ],
          totalRows: 3,
          statistics: {
            depthRange: { min: 100, max: 300 },
            averages: { DT: 85, GR: 50 },
            rockTypeDistribution: { Shale: 1, Sandstone: 1, Limestone: 1 }
          }
        })
      });
    });

    // Upload file
    await page.getByText('Upload Data').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'visualization-test-data.xlsx'));

    // Should automatically switch to visualization tab
    await expect(page.getByText('Well Data Analysis')).toBeVisible();
    
    // Should show data summary
    await expect(page.getByText('Data Summary')).toBeVisible();
    await expect(page.getByText('Total Samples')).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
    
    // Should show depth range
    await expect(page.getByText('Depth Range')).toBeVisible();
    await expect(page.getByText('100 - 300m')).toBeVisible();
    
    // Should show average values
    await expect(page.getByText('Avg Shale')).toBeVisible();
    await expect(page.getByText('30.0%')).toBeVisible(); // (25+30+35)/3 = 30
  });

  test('should switch between chart types', async ({ page }) => {
    // First upload data
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded successfully',
          rows: [
            { DEPTH: 100, SH: 0.25, SS: 0.35, DT: 80, GR: 45 },
            { DEPTH: 200, SH: 0.30, SS: 0.30, DT: 85, GR: 50 }
          ],
          totalRows: 2,
          statistics: {
            depthRange: { min: 100, max: 200 },
            averages: { DT: 82.5, GR: 47.5 }
          }
        })
      });
    });

    await page.getByText('Upload Data').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'visualization-test-data.xlsx'));

    // Wait for visualization to load
    await expect(page.getByText('Well Data Analysis')).toBeVisible();
    
    // Should show chart type buttons
    await expect(page.getByText('Rock Composition')).toBeVisible();
    await expect(page.getByText('Well Logs')).toBeVisible();
    
    // Initially should show rock composition (default)
    const rockCompositionBtn = page.getByText('Rock Composition');
    await expect(rockCompositionBtn).toHaveClass(/bg-primary-500/);
    
    // Click on Well Logs
    await page.getByText('Well Logs').click();
    
    // Should switch to well logs view
    const wellLogsBtn = page.getByText('Well Logs');
    await expect(wellLogsBtn).toHaveClass(/bg-primary-500/);
    await expect(rockCompositionBtn).not.toHaveClass(/bg-primary-500/);
  });

  test('should display charts correctly', async ({ page }) => {
    // Upload data first
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded successfully',
          rows: [
            { DEPTH: 100, SH: 0.25, SS: 0.35, LS: 0.20, DT: 80, GR: 45 },
            { DEPTH: 200, SH: 0.30, SS: 0.30, LS: 0.25, DT: 85, GR: 50 }
          ],
          totalRows: 2,
          statistics: {
            depthRange: { min: 100, max: 200 },
            averages: { DT: 82.5, GR: 47.5 }
          }
        })
      });
    });

    await page.getByText('Upload Data').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'visualization-test-data.xlsx'));

    await expect(page.getByText('Well Data Analysis')).toBeVisible();
    
    // Check for chart container (Recharts components)
    const chartContainer = page.locator('.recharts-wrapper');
    await expect(chartContainer).toBeVisible();
    
    // Switch to Well Logs view
    await page.getByText('Well Logs').click();
    
    // Should still show chart
    await expect(chartContainer).toBeVisible();
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Upload data first
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded successfully',
          rows: [{ DEPTH: 100, SH: 0.25, SS: 0.35, DT: 80, GR: 45 }],
          totalRows: 1,
          statistics: { depthRange: { min: 100, max: 100 }, averages: { DT: 80, GR: 45 } }
        })
      });
    });

    await page.getByText('Upload Data').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'visualization-test-data.xlsx'));

    await expect(page.getByText('Well Data Analysis')).toBeVisible();

    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByText('Data Summary')).toBeVisible();
    await expect(page.getByText('Rock Composition')).toBeVisible();

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText('Data Summary')).toBeVisible();
    await expect(page.getByText('Rock Composition')).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // May need to open mobile menu first
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }
    
    // Navigate to data analysis on mobile
    await page.getByText('Data Analysis').click();
    await expect(page.getByText('Data Summary')).toBeVisible();
    
    // Chart type buttons should be responsive
    await expect(page.getByText('Rock Composition')).toBeVisible();
    await expect(page.getByText('Well Logs')).toBeVisible();
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Mock upload with empty data
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded successfully',
          rows: [],
          totalRows: 0,
          statistics: {}
        })
      });
    });

    await page.getByText('Upload Data').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'visualization-test-data.xlsx'));

    // Should show no data message even after upload
    await expect(page.getByText('No Data Available')).toBeVisible();
  });

  test('should display correct statistics calculations', async ({ page }) => {
    // Mock upload with specific data for testing calculations
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded successfully',
          rows: [
            { DEPTH: 100, SH: 0.20, SS: 0.40, LS: 0.30, DT: 80, GR: 40 },
            { DEPTH: 200, SH: 0.30, SS: 0.30, LS: 0.20, DT: 90, GR: 60 }
          ],
          totalRows: 2,
          statistics: {
            depthRange: { min: 100, max: 200 },
            averages: { DT: 85, GR: 50 },
            rockTypeDistribution: { Sandstone: 1, Shale: 1 }
          }
        })
      });
    });

    await page.getByText('Upload Data').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'visualization-test-data.xlsx'));

    await expect(page.getByText('Well Data Analysis')).toBeVisible();
    
    // Check statistics display
    await expect(page.getByText('Total Samples')).toBeVisible();
    await expect(page.getByText('2')).toBeVisible();
    
    await expect(page.getByText('Depth Range')).toBeVisible();
    await expect(page.getByText('100 - 200m')).toBeVisible();
    
    // Check average calculations
    await expect(page.getByText('Avg Shale')).toBeVisible();
    await expect(page.getByText('25.0%')).toBeVisible(); // (20+30)/2 = 25
  });

  test('should handle chart interactions', async ({ page }) => {
    // Upload data
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded successfully',
          rows: [
            { DEPTH: 100, SH: 0.25, SS: 0.35, LS: 0.20, DT: 80, GR: 45 },
            { DEPTH: 200, SH: 0.30, SS: 0.30, LS: 0.25, DT: 85, GR: 50 }
          ],
          totalRows: 2,
          statistics: {
            depthRange: { min: 100, max: 200 },
            averages: { DT: 82.5, GR: 47.5 }
          }
        })
      });
    });

    await page.getByText('Upload Data').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'visualization-test-data.xlsx'));

    await expect(page.getByText('Well Data Analysis')).toBeVisible();
    
    // Chart should be interactive (hover, tooltips, etc.)
    const chartArea = page.locator('.recharts-wrapper');
    await expect(chartArea).toBeVisible();
    
    // Hover over chart area (tooltips would appear in real usage)
    await chartArea.hover();
    
    // Legend should be visible and interactive
    const legend = page.locator('.recharts-legend-wrapper');
    if (await legend.isVisible()) {
      await legend.hover();
    }
  });

  test('should maintain chart state when switching tabs', async ({ page }) => {
    // Upload data
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded successfully',
          rows: [{ DEPTH: 100, SH: 0.25, SS: 0.35, DT: 80, GR: 45 }],
          totalRows: 1,
          statistics: { depthRange: { min: 100, max: 100 }, averages: { DT: 80, GR: 45 } }
        })
      });
    });

    await page.getByText('Upload Data').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'visualization-test-data.xlsx'));

    await expect(page.getByText('Well Data Analysis')).toBeVisible();
    
    // Switch to Well Logs view
    await page.getByText('Well Logs').click();
    await expect(page.getByText('Well Logs')).toHaveClass(/bg-primary-500/);
    
    // Switch to another tab and back
    await page.getByText('AI Assistant').click();
    await expect(page.getByText('AI Assistant')).toBeVisible();
    
    await page.getByText('Data Analysis').click();
    
    // Should maintain the Well Logs selection
    await expect(page.getByText('Well Logs')).toHaveClass(/bg-primary-500/);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock upload with large dataset
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      DEPTH: i * 10,
      SH: 0.20 + Math.random() * 0.30,
      SS: 0.20 + Math.random() * 0.30,
      LS: 0.10 + Math.random() * 0.20,
      DT: 70 + Math.random() * 40,
      GR: 30 + Math.random() * 50
    }));

    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded successfully',
          rows: largeDataset,
          totalRows: 1000,
          statistics: {
            depthRange: { min: 0, max: 9990 },
            averages: { DT: 90, GR: 55 }
          }
        })
      });
    });

    await page.getByText('Upload Data').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'visualization-test-data.xlsx'));

    // Should handle large dataset without performance issues
    await expect(page.getByText('Well Data Analysis')).toBeVisible();
    await expect(page.getByText('1,000')).toBeVisible(); // Total samples
    
    // Chart should still render
    const chartContainer = page.locator('.recharts-wrapper');
    await expect(chartContainer).toBeVisible();
    
    // Switching chart types should be responsive
    const startTime = Date.now();
    await page.getByText('Well Logs').click();
    const endTime = Date.now();
    
    // Should switch quickly (less than 2 seconds)
    expect(endTime - startTime).toBeLessThan(2000);
    await expect(page.getByText('Well Logs')).toHaveClass(/bg-primary-500/);
  });

  test('should display error states appropriately', async ({ page }) => {
    // Mock upload that succeeds but with malformed data
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded successfully',
          rows: null, // Malformed response
          totalRows: 0,
          statistics: null
        })
      });
    });

    await page.getByText('Upload Data').click();
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(testFilesDir, 'visualization-test-data.xlsx'));

    // Should handle malformed data gracefully
    await expect(page.getByText('No Data Available')).toBeVisible();
  });
});