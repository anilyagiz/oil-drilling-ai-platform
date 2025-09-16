import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';
import Dashboard from '../../components/Dashboard';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock fetch for wells API
global.fetch = jest.fn();

const DashboardWrapper = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </BrowserRouter>
);

describe('File Upload Integration Flow', () => {
  beforeEach(() => {
    mockedAxios.post.mockClear();
    fetch.mockClear();
    
    // Mock wells API
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
  });

  it('should complete full file upload and visualization flow', async () => {
    const user = userEvent.setup();
    
    // Mock successful file upload
    const mockUploadResponse = {
      data: {
        wells: [{ id: 1, name: 'Uploaded Well', depth: 2000, status: 'Active' }],
        data: [
          {
            depth: 100,
            shale_percent: 25,
            sandstone_percent: 35,
            limestone_percent: 20,
            dolomite_percent: 10,
            anhydrite_percent: 5,
            coal_percent: 3,
            salt_percent: 2,
            dt: 80,
            gr: 45
          }
        ]
      }
    };
    mockedAxios.post.mockResolvedValue(mockUploadResponse);

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Upload Well Data')).toBeInTheDocument();
    });

    // Upload a file
    const file = new File(['test content'], 'test.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, file);

    // Wait for upload to complete
    await waitFor(() => {
      expect(screen.getByText('File uploaded and processed successfully!')).toBeInTheDocument();
    });

    // Should automatically switch to visualization tab
    expect(screen.getByText('Well Data Analysis')).toBeInTheDocument();

    // Should display the uploaded data
    expect(screen.getByText('Total Samples')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should handle file upload error and allow retry', async () => {
    const user = userEvent.setup();
    
    // Mock failed file upload
    mockedAxios.post.mockRejectedValue({
      response: { data: { message: 'Invalid file format' } }
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Upload Well Data')).toBeInTheDocument();
    });

    // Upload a file
    const file = new File(['test content'], 'test.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, file);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Invalid file format')).toBeInTheDocument();
    });

    // Should still be on upload tab
    expect(screen.getByText('Upload Well Data')).toBeInTheDocument();

    // Clear the error and try again
    const clearButton = screen.getByRole('button', { name: '' }); // X button
    await user.click(clearButton);

    // Should return to initial upload state
    expect(screen.getByText('Drag and drop your Excel file here')).toBeInTheDocument();
  });

  it('should integrate uploaded data with chatbot', async () => {
    const user = userEvent.setup();
    
    // Mock successful file upload
    const mockUploadResponse = {
      data: {
        wells: [{ id: 1, name: 'Test Well', depth: 2000, status: 'Active' }],
        data: [{ depth: 100, shale_percent: 25 }]
      }
    };
    mockedAxios.post.mockResolvedValueOnce(mockUploadResponse);

    // Mock chatbot response
    mockedAxios.post.mockResolvedValueOnce({
      data: { response: 'Based on your uploaded data, the well shows 25% shale content at 100m depth.' }
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    // Upload file
    const file = new File(['test content'], 'test.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const input = screen.getByLabelText(/choose file/i);
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText('File uploaded and processed successfully!')).toBeInTheDocument();
    });

    // Switch to chatbot tab
    await user.click(screen.getByText('AI Assistant'));

    // Send a message about the data
    const chatInput = screen.getByPlaceholderText('Type your message here...');
    await user.type(chatInput, 'Analyze the uploaded data');
    await user.click(screen.getByText('Send'));

    // Verify chatbot received the uploaded data context
    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenLastCalledWith('http://localhost:5000/api/chat', {
        message: 'Analyze the uploaded data',
        wellData: null,
        uploadedData: mockUploadResponse.data
      });
    });
  });

  it('should handle multiple file uploads', async () => {
    const user = userEvent.setup();
    
    // Mock first upload
    mockedAxios.post.mockResolvedValueOnce({
      data: { wells: [], data: [{ depth: 100 }] }
    });

    // Mock second upload
    mockedAxios.post.mockResolvedValueOnce({
      data: { wells: [], data: [{ depth: 200 }] }
    });

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    // First upload
    const file1 = new File(['test1'], 'test1.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const input = screen.getByLabelText(/choose file/i);
    await user.upload(input, file1);

    await waitFor(() => {
      expect(screen.getByText('File uploaded and processed successfully!')).toBeInTheDocument();
    });

    // Go back to upload tab
    await user.click(screen.getByText('Upload Data'));

    // Clear first file
    const clearButton = screen.getByRole('button', { name: '' });
    await user.click(clearButton);

    // Second upload
    const file2 = new File(['test2'], 'test2.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    await user.upload(input, file2);

    await waitFor(() => {
      expect(screen.getByText('File uploaded and processed successfully!')).toBeInTheDocument();
    });

    // Should have made two separate API calls
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('should validate file types before upload', async () => {
    const user = userEvent.setup();

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Upload Well Data')).toBeInTheDocument();
    });

    // Try to upload invalid file type
    const invalidFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, invalidFile);

    // Should show error without making API call
    expect(screen.getByText('Please upload an Excel file (.xlsx or .xls)')).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('should show loading states during upload', async () => {
    const user = userEvent.setup();
    
    // Mock slow upload
    mockedAxios.post.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: { wells: [], data: [] } }), 100))
    );

    render(
      <DashboardWrapper>
        <Dashboard />
      </DashboardWrapper>
    );

    const file = new File(['test content'], 'test.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, file);

    // Should show loading state
    expect(screen.getByText('Processing file...')).toBeInTheDocument();

    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('File uploaded and processed successfully!')).toBeInTheDocument();
    });
  });
});