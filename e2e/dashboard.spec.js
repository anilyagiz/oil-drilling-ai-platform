const { test, expect } = require('@playwright/test');

test.describe('Dashboard E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load dashboard with correct title and layout', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Oil Drilling AI/);
    
    // Check main heading
    await expect(page.getByText('Oil Drilling AI')).toBeVisible();
    
    // Check navigation tabs
    await expect(page.getByText('Upload Data')).toBeVisible();
    await expect(page.getByText('Data Analysis')).toBeVisible();
    await expect(page.getByText('AI Assistant')).toBeVisible();
    
    // Check well inventory section
    await expect(page.getByText('Well Inventory')).toBeVisible();
    await expect(page.getByText('Summary')).toBeVisible();
  });

  test('should switch between tabs correctly', async ({ page }) => {
    // Initially should show upload tab
    await expect(page.getByText('Upload Well Data')).toBeVisible();
    
    // Switch to Data Analysis tab
    await page.getByText('Data Analysis').click();
    await expect(page.getByText('No Data Available')).toBeVisible();
    
    // Switch to AI Assistant tab
    await page.getByText('AI Assistant').click();
    await expect(page.getByText('AI Assistant')).toBeVisible();
    await expect(page.getByPlaceholder('Type your message here...')).toBeVisible();
    
    // Switch back to Upload tab
    await page.getByText('Upload Data').click();
    await expect(page.getByText('Upload Well Data')).toBeVisible();
  });

  test('should display theme toggle and work correctly', async ({ page }) => {
    // Find theme toggle button (sun/moon icon)
    const themeToggle = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(themeToggle).toBeVisible();
    
    // Click theme toggle
    await themeToggle.click();
    
    // Check if dark mode is applied (body should have dark class)
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
    
    // Toggle back to light mode
    await themeToggle.click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that mobile menu button is visible
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(menuButton).toBeVisible();
    
    // Check that sidebar is hidden on mobile
    const sidebar = page.getByText('Well Inventory');
    await expect(sidebar).not.toBeVisible();
    
    // Click menu button to open sidebar
    await menuButton.click();
    
    // Now sidebar should be visible
    await expect(sidebar).toBeVisible();
  });

  test('should handle empty state correctly', async ({ page }) => {
    // Switch to Data Analysis tab
    await page.getByText('Data Analysis').click();
    
    // Should show no data message
    await expect(page.getByText('No Data Available')).toBeVisible();
    await expect(page.getByText('Please select a well or upload data to view visualizations')).toBeVisible();
  });

  test('should display well summary statistics', async ({ page }) => {
    // Check summary section
    await expect(page.getByText('Total Wells')).toBeVisible();
    await expect(page.getByText('Active')).toBeVisible();
    
    // Should show 0 wells initially (assuming no test data)
    const totalWells = page.locator('text=Total Wells').locator('..').getByText('0');
    await expect(totalWells).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab through navigation elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate to upload tab with Enter
    await page.keyboard.press('Enter');
    await expect(page.getByText('Upload Well Data')).toBeVisible();
    
    // Navigate to next tab with Tab and Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.getByText('No Data Available')).toBeVisible();
  });

  test('should persist theme preference', async ({ page, context }) => {
    // Toggle to dark mode
    const themeToggle = page.locator('button').filter({ has: page.locator('svg') }).first();
    await themeToggle.click();
    
    // Reload page
    await page.reload();
    
    // Should still be in dark mode
    const html = page.locator('html');
    await expect(html).toHaveClass(/dark/);
  });

  test('should handle window resize correctly', async ({ page }) => {
    // Start with desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.getByText('Well Inventory')).toBeVisible();
    
    // Resize to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByText('Well Inventory')).toBeVisible();
    
    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile menu should be visible, sidebar hidden
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(menuButton).toBeVisible();
  });

  test('should show loading states appropriately', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/wells', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    await page.goto('/');
    
    // Should show loading or empty state while API loads
    await expect(page.getByText('Well Inventory')).toBeVisible();
  });
});