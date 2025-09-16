import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../api';

const FileUpload = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
      setUploadStatus({
        type: 'error',
        message: 'Please upload an Excel file (.xlsx or .xls)'
      });
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    setUploadedFile(file);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(apiUrl('/api/upload'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadStatus({
        type: 'success',
        message: 'File uploaded and processed successfully!'
      });

      // Call the callback with the processed data
      if (onFileUpload) {
        onFileUpload(response.data);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.message || 'Failed to upload file. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setUploadStatus(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <FileSpreadsheet className="w-12 h-12 sm:w-16 sm:h-16 text-primary-500 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2">Upload Well Data</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Upload your Excel file containing well drilling data for analysis
          </p>
        </div>

        {!uploadedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-6 sm:p-12 text-center transition-colors ${
              dragActive
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-2">
              Drag and drop your Excel file here
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">or</p>
            <label className="inline-flex items-center px-4 py-2 sm:px-6 sm:py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer transition-colors text-sm sm:text-base">
              <Upload className="w-4 h-4 mr-2" />
              Choose File
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
              Supports .xlsx and .xls files up to 10MB
            </p>
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start flex-1 min-w-0">
                <FileSpreadsheet className="w-8 h-8 text-green-500 mr-3 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800 dark:text-white truncate">{uploadedFile.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={clearUpload}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploading && (
              <div className="mb-4">
                <div className="flex items-center text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Processing file...
                </div>
              </div>
            )}

            {uploadStatus && (
              <div className={`flex items-center p-3 rounded-lg ${
                uploadStatus.type === 'success' 
                  ? 'bg-green-50 text-green-800' 
                  : 'bg-red-50 text-red-800'
              }`}>
                {uploadStatus.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 mr-2" />
                )}
                <span>{uploadStatus.message}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 sm:mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h3 className="font-medium text-gray-800 dark:text-white mb-3">Expected Data Format</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Your Excel file should contain the following columns (based on the provided sample):
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div>• <strong>DEPTH:</strong> Well depth (m)</div>
            <div>• <strong>%SH:</strong> Shale percentage</div>
            <div>• <strong>%SS:</strong> Sandstone percentage</div>
            <div>• <strong>%LS:</strong> Limestone percentage</div>
            <div>• <strong>%DOL:</strong> Dolomite percentage</div>
            <div>• <strong>%ANH:</strong> Anhydrite percentage</div>
            <div>• <strong>%Coal:</strong> Coal percentage</div>
            <div>• <strong>%Salt:</strong> Salt percentage</div>
            <div>• <strong>DT:</strong> Delta Time measurements</div>
            <div>• <strong>GR:</strong> Gamma Ray readings</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
