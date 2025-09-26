import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../api';

const Chatbot = ({ selectedWell, uploadedData }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize with context-aware welcome message
    if (messages.length === 0) {
      let welcomeMessage = `Hello! I'm your AI drilling assistant specialized in oil drilling data analysis.`;
      
      if (uploadedData && uploadedData.rows) {
        const stats = uploadedData.statistics;
        welcomeMessage += ` I can see you've uploaded Excel data with ${uploadedData.rows.length} data points covering depths from ${stats?.depthRange?.min?.toFixed(1)}m to ${stats?.depthRange?.max?.toFixed(1)}m. I can help you analyze rock composition, interpret DT and GR measurements, and provide drilling recommendations based on your specific data.`;
      } else if (selectedWell) {
        welcomeMessage += ` I can see you've selected ${selectedWell.name} well (depth: ${selectedWell.depth}m, status: ${selectedWell.status}). I can help analyze this well's data and provide drilling insights.`;
      } else {
        welcomeMessage += ` I can help you analyze well data, interpret drilling parameters, and answer questions about your oil drilling operations. Upload your Excel data or select a well to get started with specific analysis.`;
      }
      
      welcomeMessage += ` How can I assist you today?`;
      
      setMessages([
        {
          id: 1,
          type: 'bot',
          content: welcomeMessage,
          timestamp: new Date()
        }
      ]);
    }
  }, [uploadedData, selectedWell, messages.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Enhanced context preparation for better AI responses
      const enhancedContext = prepareEnhancedContext(userMessage.content, selectedWell, uploadedData);
      
      const response = await axios.post(apiUrl('/api/chat'), {
        message: userMessage.content,
        wellData: selectedWell,
        uploadedData: uploadedData,
        enhancedContext: enhancedContext
      });
      
      // If we only have fileId, try to refresh uploaded data context
      if ((!uploadedData?.rows || uploadedData.rows.length === 0) && response.data?.uploadedFileId) {
        try {
          const persisted = await axios.get(apiUrl(`/api/uploads/${response.data.uploadedFileId}/data`));
          if (persisted.data?.rows) {
            setMessages(prev => prev.map(msg => msg.id === userMessage.id ? { ...msg, uploadedData: persisted.data } : msg));
          }
        } catch (persistError) {
          console.error('Error loading persisted upload for chatbot context:', persistError);
        }
      }

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: response.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced context preparation function
  const prepareEnhancedContext = (message, wellData, uploadedData) => {
    const context = {
      hasWellData: !!wellData,
      hasUploadedData: !!uploadedData,
      messageType: categorizeMessage(message),
      dataInsights: null
    };

    if (uploadedData && uploadedData.rows) {
      context.dataInsights = {
        totalDataPoints: uploadedData.rows.length,
        depthRange: uploadedData.statistics?.depthRange,
        rockComposition: analyzeRockComposition(uploadedData.rows),
        drillingParameters: analyzeDrillingParameters(uploadedData.rows),
        anomalies: detectAnomalies(uploadedData.rows)
      };
    }

    return context;
  };

  // Categorize user message to provide more targeted responses
  const categorizeMessage = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('depth') || lowerMessage.includes('drilling depth')) {
      return 'depth_inquiry';
    }
    if (lowerMessage.includes('rock') || lowerMessage.includes('composition') || 
        lowerMessage.includes('shale') || lowerMessage.includes('sandstone') || 
        lowerMessage.includes('limestone') || lowerMessage.includes('dolomite')) {
      return 'rock_composition';
    }
    if (lowerMessage.includes('dt') || lowerMessage.includes('delta time')) {
      return 'dt_analysis';
    }
    if (lowerMessage.includes('gr') || lowerMessage.includes('gamma ray')) {
      return 'gr_analysis';
    }
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || 
        lowerMessage.includes('advice')) {
      return 'recommendation_request';
    }
    if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis') || 
        lowerMessage.includes('interpret')) {
      return 'data_analysis';
    }
    if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || 
        lowerMessage.includes('challenge')) {
      return 'problem_solving';
    }
    
    return 'general_inquiry';
  };

  // Analyze rock composition patterns
  const analyzeRockComposition = (rows) => {
    if (!rows || rows.length === 0) return null;

    const composition = {
      dominantRockTypes: {},
      averageComposition: {},
      variability: {}
    };

    const rockTypes = ['SH', 'SS', 'LS', 'DOL', 'ANH', 'Coal', 'Salt'];
    
    // Calculate averages and dominant types
    rockTypes.forEach(type => {
      const values = rows.map(row => row[`%${type}`] || row[type] || 0).filter(v => v !== null);
      if (values.length > 0) {
        composition.averageComposition[type] = values.reduce((sum, val) => sum + val, 0) / values.length;
        composition.variability[type] = Math.sqrt(
          values.reduce((sum, val) => sum + Math.pow(val - composition.averageComposition[type], 2), 0) / values.length
        );
      }
    });

    // Find dominant rock type for each depth interval
    rows.forEach(row => {
      let maxPercent = 0;
      let dominantType = 'Unknown';
      
      rockTypes.forEach(type => {
        const percent = row[`%${type}`] || row[type] || 0;
        if (percent > maxPercent) {
          maxPercent = percent;
          dominantType = type;
        }
      });
      
      composition.dominantRockTypes[dominantType] = (composition.dominantRockTypes[dominantType] || 0) + 1;
    });

    return composition;
  };

  // Analyze drilling parameters (DT and GR)
  const analyzeDrillingParameters = (rows) => {
    if (!rows || rows.length === 0) return null;

    const dtValues = rows.map(row => row.DT).filter(v => v !== null && v !== undefined);
    const grValues = rows.map(row => row.GR).filter(v => v !== null && v !== undefined);

    return {
      dt: {
        average: dtValues.length > 0 ? dtValues.reduce((sum, val) => sum + val, 0) / dtValues.length : 0,
        min: dtValues.length > 0 ? Math.min(...dtValues) : 0,
        max: dtValues.length > 0 ? Math.max(...dtValues) : 0,
        trend: calculateTrend(dtValues)
      },
      gr: {
        average: grValues.length > 0 ? grValues.reduce((sum, val) => sum + val, 0) / grValues.length : 0,
        min: grValues.length > 0 ? Math.min(...grValues) : 0,
        max: grValues.length > 0 ? Math.max(...grValues) : 0,
        trend: calculateTrend(grValues)
      }
    };
  };

  // Detect anomalies in the data
  const detectAnomalies = (rows) => {
    if (!rows || rows.length === 0) return [];

    const anomalies = [];
    
    rows.forEach((row, index) => {
      // Check for unusual rock composition (sum should be close to 100%)
      const rockTypes = ['SH', 'SS', 'LS', 'DOL', 'ANH', 'Coal', 'Salt'];
      const totalComposition = rockTypes.reduce((sum, type) => {
        return sum + (row[`%${type}`] || row[type] || 0);
      }, 0);
      
      if (Math.abs(totalComposition - 100) > 10) {
        anomalies.push({
          depth: row.DEPTH,
          type: 'composition_anomaly',
          description: `Rock composition sum is ${totalComposition.toFixed(1)}% (expected ~100%)`
        });
      }

      // Check for extreme DT values
      if (row.DT && (row.DT < 40 || row.DT > 200)) {
        anomalies.push({
          depth: row.DEPTH,
          type: 'dt_anomaly',
          description: `Unusual DT value: ${row.DT} μs/ft`
        });
      }

      // Check for extreme GR values
      if (row.GR && (row.GR < 0 || row.GR > 300)) {
        anomalies.push({
          depth: row.DEPTH,
          type: 'gr_anomaly',
          description: `Unusual GR value: ${row.GR} API`
        });
      }
    });

    return anomalies.slice(0, 5); // Return top 5 anomalies
  };

  // Calculate trend (simple linear regression slope)
  const calculateTrend = (values) => {
    if (values.length < 2) return 'insufficient_data';
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squared indices
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (Math.abs(slope) < 0.01) return 'stable';
    return slope > 0 ? 'increasing' : 'decreasing';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Dynamic quick questions based on available data
  const getQuickQuestions = () => {
    const baseQuestions = [
      "What is the current drilling depth?",
      "Analyze the rock composition data",
      "Explain the DT measurements",
      "What do the GR readings indicate?",
      "Provide drilling recommendations"
    ];

    if (uploadedData && uploadedData.rows) {
      return [
        `Analyze the ${uploadedData.rows.length} data points in my Excel file`,
        "What's the dominant rock type in this formation?",
        "Are there any anomalies in the drilling parameters?",
        "How do DT and GR values correlate with rock composition?",
        "What drilling challenges should I expect based on this data?"
      ];
    }

    if (selectedWell) {
      return [
        `Tell me about ${selectedWell.name} well status`,
        "What's the drilling progress for this well?",
        "Analyze the geological formation",
        "Recommend next drilling steps",
        "Identify potential drilling risks"
      ];
    }

    return baseQuestions;
  };

  const quickQuestions = getQuickQuestions();

  const handleQuickQuestion = (question) => {
    setInputMessage(question);
  };

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header - Mobile Optimized */}
      <div className="bg-white dark:bg-gray-800 rounded-t-lg shadow-sm p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-500 rounded-full mr-3 flex-shrink-0">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white truncate">AI Drilling Assistant</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {selectedWell ? `Analyzing ${selectedWell.name}` : 'Ready to help with drilling data'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Questions - Mobile Responsive */}
      {messages.length <= 1 && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 border-b border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Quick questions:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleQuickQuestion(question)}
                className="px-3 py-2 bg-white dark:bg-gray-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500 transition-all duration-200 text-left"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages - Mobile Optimized */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg ${
                message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                  message.type === 'user'
                    ? 'bg-primary-500 ml-3'
                    : 'bg-gray-500 mr-3'
                }`}
              >
                {message.type === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div
                className={`px-4 py-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <p
                  className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-primary-100' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {formatTimestamp(message.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-500 mr-3 flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-sm px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin text-primary-500" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Mobile Optimized */}
      <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow-sm p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <div className="flex-1">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about drilling data, well analysis, or any drilling-related questions..."
              className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm sm:text-base"
              rows={3}
              disabled={isLoading}
              maxLength={500}
            />
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="flex items-center justify-center px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
            >
              <Send className="w-4 h-4 mr-2" />
              <span className="sm:hidden">Send</span>
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 text-xs text-gray-500 dark:text-gray-400 space-y-1 sm:space-y-0">
          <span className="hidden sm:block">Press Enter to send, Shift+Enter for new line</span>
          <span className="sm:hidden text-center">Enter to send</span>
          <span className="text-center sm:text-right">{inputMessage.length}/500</span>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
