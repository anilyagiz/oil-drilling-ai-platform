const { test, expect, devices } = require('@playwright/test');

test.describe('Cross-Browser Compatibility Tests', () => {
  // Test basic functionality across different browsers
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test.describe(`${browserName} browser tests`, () => {
      test(`should load dashboard correctly in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
        
        await page.goto('/');
        
        // Basic functionality should work across all browsers
        await expect(page.getByText('Oil Drilling AI')).toBeVisible();
        await expect(page.getByText('Upload Data')).toBeVisible();
        await expect(page.getByText('Data Analysis')).toBeVisible();
        await expect(page.getByText('AI Assistant')).toBeVisible();
      });

      test(`should handle file upload in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
        
        await page.goto('/');
        
        // Mock successful upload
        await page.route('**/api/upload', async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              message: 'File uploaded successfully',
              rows: [{ DEPTH: 100, SH: 0.25 }],
              totalRows: 1,
              statistics: {}
            })
          });
        });

        await page.getByText('Upload Data').click();
        
        // File input should work in all browsers
        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeVisible();
        
        // Create a simple test file
        const testFile = Buffer.from('test content');
        await page.setInputFiles('input[type="file"]', {
          name: 'test.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: testFile
        });

        await expect(page.getByText('File uploaded and processed successfully!')).toBeVisible();
      });

      test(`should handle theme switching in ${browserName}`, async ({ page, browserName: currentBrowser }) => {
        test.skip(currentBrowser !== browserName, `Skipping ${browserName} test in ${currentBrowser}`);
        
        await page.goto('/');
        
        // Theme toggle should work across browsers
        const themeToggle = page.locator('button').filter({ has: page.locator('svg') }).first();
        await themeToggle.click();
        
        // Check dark mode is applied
        const html = page.locator('html');
        await expect(html).toHaveClass(/dark/);
      });
    });
  });

  // Test mobile responsiveness across different devices
  test.describe('Mobile Device Tests', () => {
    const mobileDevices = [
      { name: 'iPhone 12', device: devices['iPhone 12'] },
      { name: 'Pixel 5', device: devices['Pixel 5'] },
      { name: 'iPad', device: devices['iPad'] }
    ];

    mobileDevices.forEach(({ name, device }) => {
      test(`should work on ${name}`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device
        });
        const page = await context.newPage();
        
        await page.goto('/');
        
        // Basic functionality should work on mobile
        await expect(page.getByText('Oil Drilling AI')).toBeVisible();
        
        // Check if mobile menu is present for smaller screens
        if (device.viewport.width < 768) {
          const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first();
          await expect(menuButton).toBeVisible();
          
          // Test mobile menu functionality
          await menuButton.click();
          await expect(page.getByText('Well Inventory')).toBeVisible();
        }
        
        // Tab navigation should work
        await page.getByText('Upload Data').click();
        await expect(page.getByText('Upload Well Data')).toBeVisible();
        
        await page.getByText('AI Assistant').click();
        await expect(page.getByText('AI Assistant')).toBeVisible();
        
        await context.close();
      });
    });
  });

  test.describe('Feature Support Tests', () => {
    test('should handle CSS Grid and Flexbox', async ({ page }) => {
      await page.goto('/');
      
      // Check that modern CSS features are working
      const dashboard = page.locator('.flex');
      await expect(dashboard).toBeVisible();
      
      // Grid layouts should work
      const gridElements = page.locator('.grid');
      if (await gridElements.count() > 0) {
        await expect(gridElements.first()).toBeVisible();
      }
    });

    test('should handle modern JavaScript features', async ({ page }) => {
      await page.goto('/');
      
      // Test that modern JS features work (async/await, arrow functions, etc.)
      const result = await page.evaluate(() => {
        // Test arrow functions
        const testArrow = () => 'arrow function works';
        
        // Test template literals
        const testTemplate = `template literal works`;
        
        // Test destructuring
        const { location } = window;
        
        return {
          arrow: testArrow(),
          template: testTemplate,
          destructuring: !!location
        };
      });
      
      expect(result.arrow).toBe('arrow function works');
      expect(result.template).toBe('template literal works');
      expect(result.destructuring).toBe(true);
    });

    test('should handle localStorage', async ({ page }) => {
      await page.goto('/');
      
      // Test localStorage functionality (used for theme persistence)
      const localStorageWorks = await page.evaluate(() => {
        try {
          localStorage.setItem('test', 'value');
          const value = localStorage.getItem('test');
          localStorage.removeItem('test');
          return value === 'value';
        } catch (e) {
          return false;
        }
      });
      
      expect(localStorageWorks).toBe(true);
    });

    test('should handle fetch API', async ({ page }) => {
      await page.goto('/');
      
      // Test that fetch API is available
      const fetchAvailable = await page.evaluate(() => {
        return typeof fetch === 'function';
      });
      
      expect(fetchAvailable).toBe(true);
    });
  });

  test.describe('Performance Tests', () => {
    test('should load within acceptable time limits', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await expect(page.getByText('Oil Drilling AI')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large DOM efficiently', async ({ page }) => {
      await page.goto('/');
      
      // Mock large dataset
      await page.route('**/api/upload', async route => {
        const largeDataset = Array.from({ length: 100 }, (_, i) => ({
          DEPTH: i * 10,
          SH: 0.25,
          SS: 0.35,
          DT: 80,
          GR: 45
        }));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'File uploaded successfully',
            rows: largeDataset,
            totalRows: 100,
            statistics: {
              depthRange: { min: 0, max: 990 },
              averages: { DT: 80, GR: 45 }
            }
          })
        });
      });

      await page.getByText('Upload Data').click();
      
      // Simulate file upload
      await page.setInputFiles('input[type="file"]', {
        name: 'large-test.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('large test content')
      });

      // Should handle large dataset without significant performance degradation
      const startTime = Date.now();
      await expect(page.getByText('Well Data Analysis')).toBeVisible();
      const renderTime = Date.now() - startTime;
      
      // Should render within 3 seconds
      expect(renderTime).toBeLessThan(3000);
    });
  });

  test.describe('Accessibility Tests', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/');
      
      // Check for proper button labels
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const hasAccessibleName = await button.evaluate(el => {
          return el.getAttribute('aria-label') || 
                 el.textContent?.trim() || 
                 el.getAttribute('title');
        });
        
        if (await button.isVisible()) {
          expect(hasAccessibleName).toBeTruthy();
        }
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      
      // Should be able to navigate through interactive elements
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      
      // Should activate the focused element (exact behavior depends on element)
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto('/');
      
      // Test both light and dark themes
      const themes = ['light', 'dark'];
      
      for (const theme of themes) {
        if (theme === 'dark') {
          const themeToggle = page.locator('button').filter({ has: page.locator('svg') }).first();
          await themeToggle.click();
        }
        
        // Check that text is visible (basic contrast check)
        await expect(page.getByText('Oil Drilling AI')).toBeVisible();
        await expect(page.getByText('Upload Data')).toBeVisible();
        await expect(page.getByText('Data Analysis')).toBeVisible();
        await expect(page.getByText('AI Assistant')).toBeVisible();
      }
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const errors = [];
      page.on('pageerror', error => errors.push(error));
      
      await page.goto('/');
      
      // Trigger potential error scenarios
      await page.getByText('Upload Data').click();
      await page.getByText('Data Analysis').click();
      await page.getByText('AI Assistant').click();
      
      // Should not have any uncaught JavaScript errors
      expect(errors).toHaveLength(0);
    });

    test('should handle network failures', async ({ page }) => {
      await page.goto('/');
      
      // Mock network failure for API calls
      await page.route('**/api/**', async route => {
        await route.abort('failed');
      });
      
      // App should still function despite API failures
      await expect(page.getByText('Oil Drilling AI')).toBeVisible();
      await expect(page.getByText('Upload Data')).toBeVisible();
      
      // Try to upload a file (should handle gracefully)
      await page.getByText('Upload Data').click();
      await page.setInputFiles('input[type="file"]', {
        name: 'test.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: Buffer.from('test')
      });
      
      // Should show error message instead of crashing
      await expect(page.getByText(/Failed to upload file/)).toBeVisible();
    });
  });
});