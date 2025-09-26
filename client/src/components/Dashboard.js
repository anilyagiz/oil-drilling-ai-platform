import React, { useState, useEffect } from 'react';
import WellList from './WellList';
import DataVisualization from './DataVisualization';
import Chatbot from './Chatbot';
import FileUpload from './FileUpload';
import { useTheme } from '../contexts/ThemeContext';
import { Upload, MessageCircle, BarChart3, Menu, X, Sun, Moon } from 'lucide-react';
import { apiUrl } from '../api';

const Dashboard = () => {
  const [selectedWell, setSelectedWell] = useState(null);
  const [wells, setWells] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedData, setUploadedData] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    // Load wells from API
    const loadWells = async () => {
      try {
        const response = await fetch(apiUrl('/api/wells'));
        if (response.ok) {
          const wellsData = await response.json();
          setWells(wellsData);
        }
      } catch (error) {
        console.error('Error loading wells:', error);
        // Start with empty array if API fails
        setWells([]);
      }
    };
    
    loadWells();
  }, []);

  const handleWellSelect = (well) => {
    setSelectedWell(well);
    setActiveTab('visualization');
  };

  const handleFileUpload = (data) => {
    if (data?.wellId) {
      const associatedWell = wells.find((well) => well.id === data.wellId);
      if (associatedWell) {
        setSelectedWell(associatedWell);
      }
    }

    setUploadedData(data);
    setActiveTab('visualization');
  };

  const handleWellCreated = (newWell) => {
    setWells((prev) => [newWell, ...prev]);
    setSelectedWell(newWell);
  };

  const tabs = [
    { id: 'upload', label: 'Upload Data', icon: Upload },
    { id: 'visualization', label: 'Data Analysis', icon: BarChart3 },
    { id: 'chatbot', label: 'AI Assistant', icon: MessageCircle },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-300">
      {/* Mobile Menu Overlay */}
      <div className={`fixed inset-0 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Oil Drilling AI</h1>
            </div>
            <WellList 
              wells={wells} 
              selectedWell={selectedWell}
              onWellSelect={(well) => {
                handleWellSelect(well);
                setSidebarOpen(false);
              }}
            />
          </div>
        </div>
      </div>

      {/* Left Sidebar - Well List */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-80">
          <div className="flex flex-col h-0 flex-1 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center justify-between flex-shrink-0 px-4">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Oil Drilling AI</h1>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
              <div className="mt-5 flex-1 h-0 overflow-y-auto">
                <WellList 
                  wells={wells} 
                  selectedWell={selectedWell}
                  onWellSelect={handleWellSelect}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          >
            <Menu className="h-6 w-6" />
          </button>
          <button
            onClick={toggleTheme}
            className="mr-4 p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white truncate">
                {selectedWell ? selectedWell.name : 'Select a Well'}
              </h2>
              {selectedWell && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Depth: {selectedWell.depth}m | Status: {selectedWell.status}
                </p>
              )}
            </div>
            
            {/* Tab Navigation - Mobile Optimized */}
            <div className="mt-4 sm:mt-0 flex flex-wrap gap-2 sm:flex-nowrap">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-primary-500 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-4 sm:p-6">
            {activeTab === 'upload' && (
              <FileUpload 
                wells={wells}
                selectedWell={selectedWell}
                onSelectWell={setSelectedWell}
                onWellCreated={handleWellCreated}
                onFileUpload={handleFileUpload}
              />
            )}
            {activeTab === 'visualization' && (
              <DataVisualization 
                selectedWell={selectedWell}
                uploadedData={uploadedData}
              />
            )}
            {activeTab === 'chatbot' && (
              <Chatbot selectedWell={selectedWell} uploadedData={uploadedData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
