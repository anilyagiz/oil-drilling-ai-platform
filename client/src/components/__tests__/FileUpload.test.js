import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import FileUpload from '../FileUpload';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('FileUpload', () => {
  const mockOnFileUpload = jest.fn();

  beforeEach(() => {
    mockOnFileUpload.mockClear();
    mockedAxios.post.mockClear();
  });

  it('should render upload interface', () => {
    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    expect(screen.getByText('Upload Well Data')).toBeInTheDocument();
    expect(screen.getByText('Upload your Excel file containing well drilling data for analysis')).toBeInTheDocument();
    expect(screen.getByText('Drag and drop your Excel file here')).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('should display expected data format information', () => {
    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    expect(screen.getByText('Expected Data Format')).toBeInTheDocument();
    expect(screen.getByText('DEPTH:')).toBeInTheDocument();
    expect(screen.getByText('%SH:')).toBeInTheDocument();
    expect(screen.getByText('%SS:')).toBeInTheDocument();
    expect(screen.getByText('DT:')).toBeInTheDocument();
    expect(screen.getByText('GR:')).toBeInTheDocument();
  });

  it('should handle file selection through input', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    const file = new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    });
  });

  it('should reject non-Excel files', async () => {
    const user = userEvent.setup();
    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('Please upload an Excel file (.xlsx or .xls)')).toBeInTheDocument();
    });
  });

  it('should show loading state during upload', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    const file = new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, file);
    
    expect(screen.getByText('Processing file...')).toBeInTheDocument();
  });

  it('should show success message on successful upload', async () => {
    const user = userEvent.setup();
    const mockData = { wells: [], data: [] };
    mockedAxios.post.mockResolvedValue({ data: mockData });

    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    const file = new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('File uploaded and processed successfully!')).toBeInTheDocument();
    });
    
    expect(mockOnFileUpload).toHaveBeenCalledWith(mockData);
  });

  it('should show error message on upload failure', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockRejectedValue({
      response: { data: { message: 'Upload failed' } }
    });

    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    const file = new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  it('should handle drag and drop', async () => {
    mockedAxios.post.mockResolvedValue({ data: { success: true } });
    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    const file = new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const dropZone = screen.getByText('Drag and drop your Excel file here').closest('div');
    
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: { files: [file] }
    });
    
    dropZone.dispatchEvent(dropEvent);
    
    await waitFor(() => {
      expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    });
  });

  it('should clear uploaded file when X button is clicked', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    const file = new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    });
    
    const clearButton = screen.getByRole('button', { name: '' }); // X button
    await user.click(clearButton);
    
    expect(screen.queryByText('test.xlsx')).not.toBeInTheDocument();
    expect(screen.getByText('Drag and drop your Excel file here')).toBeInTheDocument();
  });

  it('should display file size correctly', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({ data: { success: true } });

    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    const file = new File(['x'.repeat(1024 * 1024)], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const input = screen.getByLabelText(/choose file/i);
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('1.00 MB')).toBeInTheDocument();
    });
  });

  it('should activate drag state on dragenter', () => {
    render(<FileUpload onFileUpload={mockOnFileUpload} />);
    
    const dropZone = screen.getByText('Drag and drop your Excel file here').closest('div');
    const dragEnterEvent = new Event('dragenter', { bubbles: true });
    
    dropZone.dispatchEvent(dragEnterEvent);
    
    expect(dropZone).toHaveClass('border-primary-500');
  });
});