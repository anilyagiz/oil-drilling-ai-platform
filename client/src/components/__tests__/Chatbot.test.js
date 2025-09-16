import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import Chatbot from '../Chatbot';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

const mockWell = {
  id: 1,
  name: 'Test Well',
  depth: 2500,
  status: 'Active'
};

const mockUploadedData = {
  wells: [mockWell],
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
};

describe('Chatbot', () => {
  beforeEach(() => {
    mockedAxios.post.mockClear();
  });

  it('should render chatbot interface', () => {
    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText('Ask me anything about your well data, drilling operations, or get recommendations.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message here...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('should display welcome message', () => {
    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    expect(screen.getByText(/Hello! I'm your AI drilling assistant/)).toBeInTheDocument();
  });

  it('should send message when form is submitted', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({
      data: { response: 'AI response to your question' }
    });

    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByText('Send');
    
    await user.type(input, 'What is the depth of this well?');
    await user.click(sendButton);
    
    expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:5000/api/chat', {
      message: 'What is the depth of this well?',
      wellData: null,
      uploadedData: null
    });
  });

  it('should display user message in chat', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({
      data: { response: 'AI response' }
    });

    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    
    await user.type(input, 'Test message');
    await user.click(screen.getByText('Send'));
    
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should display AI response in chat', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({
      data: { response: 'This is an AI response' }
    });

    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    
    await user.type(input, 'Test question');
    await user.click(screen.getByText('Send'));
    
    await waitFor(() => {
      expect(screen.getByText('This is an AI response')).toBeInTheDocument();
    });
  });

  it('should show loading state while waiting for response', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    
    await user.type(input, 'Test message');
    await user.click(screen.getByText('Send'));
    
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockRejectedValue(new Error('API Error'));

    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    
    await user.type(input, 'Test message');
    await user.click(screen.getByText('Send'));
    
    await waitFor(() => {
      expect(screen.getByText(/I'm having trouble connecting/)).toBeInTheDocument();
    });
  });

  it('should clear input after sending message', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({
      data: { response: 'AI response' }
    });

    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    
    await user.type(input, 'Test message');
    await user.click(screen.getByText('Send'));
    
    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('should send well data context when available', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({
      data: { response: 'AI response with well context' }
    });

    render(<Chatbot selectedWell={mockWell} uploadedData={null} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    
    await user.type(input, 'Tell me about this well');
    await user.click(screen.getByText('Send'));
    
    expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:5000/api/chat', {
      message: 'Tell me about this well',
      wellData: mockWell,
      uploadedData: null
    });
  });

  it('should send uploaded data context when available', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({
      data: { response: 'AI response with uploaded data context' }
    });

    render(<Chatbot selectedWell={null} uploadedData={mockUploadedData} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    
    await user.type(input, 'Analyze the uploaded data');
    await user.click(screen.getByText('Send'));
    
    expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:5000/api/chat', {
      message: 'Analyze the uploaded data',
      wellData: null,
      uploadedData: mockUploadedData
    });
  });

  it('should handle Enter key to send message', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({
      data: { response: 'AI response' }
    });

    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    
    await user.type(input, 'Test message{enter}');
    
    expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:5000/api/chat', {
      message: 'Test message',
      wellData: null,
      uploadedData: null
    });
  });

  it('should disable send button when input is empty', () => {
    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    const sendButton = screen.getByText('Send');
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when input has text', async () => {
    const user = userEvent.setup();
    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    const sendButton = screen.getByText('Send');
    
    await user.type(input, 'Test message');
    
    expect(sendButton).not.toBeDisabled();
  });

  it('should scroll to bottom when new messages are added', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({
      data: { response: 'AI response' }
    });

    // Mock scrollIntoView
    const mockScrollIntoView = jest.fn();
    Element.prototype.scrollIntoView = mockScrollIntoView;

    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    const input = screen.getByPlaceholderText('Type your message here...');
    
    await user.type(input, 'Test message');
    await user.click(screen.getByText('Send'));
    
    await waitFor(() => {
      expect(mockScrollIntoView).toHaveBeenCalled();
    });
  });

  it('should display suggested questions when no context is available', () => {
    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    expect(screen.getByText('Suggested Questions:')).toBeInTheDocument();
    expect(screen.getByText('What are the key factors in well drilling?')).toBeInTheDocument();
    expect(screen.getByText('How do I interpret rock composition data?')).toBeInTheDocument();
  });

  it('should handle suggested question clicks', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({
      data: { response: 'AI response to suggested question' }
    });

    render(<Chatbot selectedWell={null} uploadedData={null} />);
    
    await user.click(screen.getByText('What are the key factors in well drilling?'));
    
    expect(mockedAxios.post).toHaveBeenCalledWith('http://localhost:5000/api/chat', {
      message: 'What are the key factors in well drilling?',
      wellData: null,
      uploadedData: null
    });
  });
});