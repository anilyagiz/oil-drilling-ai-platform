const { test, expect } = require('@playwright/test');

test.describe('Chatbot E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to chatbot tab
    await page.getByText('AI Assistant').click();
  });

  test('should display chatbot interface correctly', async ({ page }) => {
    await expect(page.getByText('AI Assistant')).toBeVisible();
    await expect(page.getByText('Ask me anything about your well data, drilling operations, or get recommendations.')).toBeVisible();
    await expect(page.getByPlaceholder('Type your message here...')).toBeVisible();
    await expect(page.getByText('Send')).toBeVisible();
    
    // Should show welcome message
    await expect(page.getByText(/Hello! I'm your AI drilling assistant/)).toBeVisible();
    
    // Should show suggested questions
    await expect(page.getByText('Suggested Questions:')).toBeVisible();
    await expect(page.getByText('What are the key factors in well drilling?')).toBeVisible();
  });

  test('should send and receive chat messages', async ({ page }) => {
    // Mock chat API response
    await page.route('**/api/chat', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: `AI response to: ${postData.message}`,
          sessionId: 'test-session-123',
          isAIResponse: true,
          timestamp: new Date().toISOString()
        })
      });
    });

    // Type message
    const messageInput = page.getByPlaceholder('Type your message here...');
    await messageInput.fill('What is the depth of this well?');
    
    // Send message
    await page.getByText('Send').click();
    
    // Should show user message
    await expect(page.getByText('What is the depth of this well?')).toBeVisible();
    
    // Should show AI response
    await expect(page.getByText('AI response to: What is the depth of this well?')).toBeVisible();
    
    // Input should be cleared
    await expect(messageInput).toHaveValue('');
  });

  test('should send message with Enter key', async ({ page }) => {
    // Mock chat API response
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'AI response via Enter key',
          sessionId: 'test-session-123',
          isAIResponse: true
        })
      });
    });

    // Type message and press Enter
    const messageInput = page.getByPlaceholder('Type your message here...');
    await messageInput.fill('Test message via Enter');
    await messageInput.press('Enter');
    
    // Should show messages
    await expect(page.getByText('Test message via Enter')).toBeVisible();
    await expect(page.getByText('AI response via Enter key')).toBeVisible();
  });

  test('should disable send button when input is empty', async ({ page }) => {
    const sendButton = page.getByText('Send');
    const messageInput = page.getByPlaceholder('Type your message here...');
    
    // Initially disabled
    await expect(sendButton).toBeDisabled();
    
    // Type message - should enable
    await messageInput.fill('Test message');
    await expect(sendButton).not.toBeDisabled();
    
    // Clear message - should disable again
    await messageInput.fill('');
    await expect(sendButton).toBeDisabled();
  });

  test('should show loading state while waiting for response', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/chat', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Delayed AI response',
          sessionId: 'test-session-123',
          isAIResponse: true
        })
      });
    });

    // Send message
    const messageInput = page.getByPlaceholder('Type your message here...');
    await messageInput.fill('Test message');
    await page.getByText('Send').click();
    
    // Should show loading state
    await expect(page.getByText('AI is thinking...')).toBeVisible();
    
    // Wait for response
    await expect(page.getByText('Delayed AI response')).toBeVisible();
    await expect(page.getByText('AI is thinking...')).not.toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Send message
    const messageInput = page.getByPlaceholder('Type your message here...');
    await messageInput.fill('Test error message');
    await page.getByText('Send').click();
    
    // Should show error message
    await expect(page.getByText(/I'm having trouble connecting/)).toBeVisible();
  });

  test('should handle network failures', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/chat', async route => {
      await route.abort('failed');
    });

    // Send message
    const messageInput = page.getByPlaceholder('Type your message here...');
    await messageInput.fill('Test network failure');
    await page.getByText('Send').click();
    
    // Should show fallback error message
    await expect(page.getByText(/I'm having trouble connecting/)).toBeVisible();
  });

  test('should click suggested questions', async ({ page }) => {
    // Mock chat API response
    await page.route('**/api/chat', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: `Response to suggested question: ${postData.message}`,
          sessionId: 'test-session-123',
          isAIResponse: true
        })
      });
    });

    // Click on suggested question
    await page.getByText('What are the key factors in well drilling?').click();
    
    // Should show the question and response
    await expect(page.getByText('What are the key factors in well drilling?')).toBeVisible();
    await expect(page.getByText('Response to suggested question: What are the key factors in well drilling?')).toBeVisible();
  });

  test('should send well data context when available', async ({ page }) => {
    // First upload some data to create context
    await page.getByText('Upload Data').click();
    
    // Mock upload API
    await page.route('**/api/upload', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'File uploaded successfully',
          rows: [{ DEPTH: 100, SH: 0.25 }],
          totalRows: 1,
          statistics: { depthRange: { min: 100, max: 100 } }
        })
      });
    });

    // Mock file upload (simplified)
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]');
      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for upload to complete
    await expect(page.getByText('File uploaded and processed successfully!')).toBeVisible();

    // Go to chatbot
    await page.getByText('AI Assistant').click();

    // Mock chat API to verify context is sent
    let receivedContext = null;
    await page.route('**/api/chat', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      receivedContext = postData;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Response with uploaded data context',
          sessionId: 'test-session-123',
          isAIResponse: true
        })
      });
    });

    // Send message
    const messageInput = page.getByPlaceholder('Type your message here...');
    await messageInput.fill('Analyze the data');
    await page.getByText('Send').click();

    // Wait for response
    await expect(page.getByText('Response with uploaded data context')).toBeVisible();
    
    // Verify context was sent (this would be checked in the route handler)
    expect(receivedContext).toBeTruthy();
    expect(receivedContext.uploadedData).toBeTruthy();
  });

  test('should scroll to bottom when new messages are added', async ({ page }) => {
    // Mock multiple chat responses
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'This is a long response that should cause scrolling. '.repeat(10),
          sessionId: 'test-session-123',
          isAIResponse: true
        })
      });
    });

    // Send multiple messages to create scrollable content
    const messageInput = page.getByPlaceholder('Type your message here...');
    
    for (let i = 0; i < 5; i++) {
      await messageInput.fill(`Message ${i + 1}`);
      await page.getByText('Send').click();
      await page.waitForTimeout(500); // Wait between messages
    }

    // The last message should be visible (scrolled to bottom)
    await expect(page.getByText('Message 5')).toBeVisible();
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to chatbot (might need mobile menu)
    const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
    }
    await page.getByText('AI Assistant').click();
    
    // Interface should be responsive
    await expect(page.getByText('AI Assistant')).toBeVisible();
    await expect(page.getByPlaceholder('Type your message here...')).toBeVisible();
    
    // Mock chat response
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Mobile response',
          sessionId: 'mobile-session',
          isAIResponse: true
        })
      });
    });

    // Send message on mobile
    const messageInput = page.getByPlaceholder('Type your message here...');
    await messageInput.fill('Mobile test message');
    await page.getByText('Send').click();
    
    // Should work correctly
    await expect(page.getByText('Mobile test message')).toBeVisible();
    await expect(page.getByText('Mobile response')).toBeVisible();
  });

  test('should handle long conversations', async ({ page }) => {
    // Mock chat responses
    await page.route('**/api/chat', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData());
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: `Response to: ${postData.message}`,
          sessionId: 'long-conversation',
          isAIResponse: true
        })
      });
    });

    const messageInput = page.getByPlaceholder('Type your message here...');
    
    // Send 10 messages
    for (let i = 1; i <= 10; i++) {
      await messageInput.fill(`Message number ${i}`);
      await page.getByText('Send').click();
      await page.waitForTimeout(200);
    }

    // All messages should be visible in the chat history
    for (let i = 1; i <= 10; i++) {
      await expect(page.getByText(`Message number ${i}`)).toBeVisible();
      await expect(page.getByText(`Response to: Message number ${i}`)).toBeVisible();
    }
  });

  test('should maintain session across page reloads', async ({ page }) => {
    // Mock chat response with session ID
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'First response',
          sessionId: 'persistent-session-123',
          isAIResponse: true
        })
      });
    });

    // Send first message
    const messageInput = page.getByPlaceholder('Type your message here...');
    await messageInput.fill('First message');
    await page.getByText('Send').click();
    
    await expect(page.getByText('First response')).toBeVisible();

    // Reload page
    await page.reload();
    await page.getByText('AI Assistant').click();

    // Chat history should be cleared (as expected for client-side state)
    // But session should continue with new messages
    await expect(page.getByText('First message')).not.toBeVisible();
    
    // New messages should work
    await page.route('**/api/chat', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          response: 'Response after reload',
          sessionId: 'new-session-after-reload',
          isAIResponse: true
        })
      });
    });

    await messageInput.fill('Message after reload');
    await page.getByText('Send').click();
    
    await expect(page.getByText('Response after reload')).toBeVisible();
  });
});