import React, { useState, useEffect } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Plus, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../api';

const FileUpload = ({ wells = [], selectedWell, onSelectWell, onWellCreated, onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [wellMode, setWellMode] = useState(() => {
    if (selectedWell) return 'existing';
    return wells.length > 0 ? 'existing' : 'new';
  });
  const [selectedWellId, setSelectedWellId] = useState(selectedWell?.id ? String(selectedWell.id) : '');
  const [newWellName, setNewWellName] = useState('');
  const [newWellDepth, setNewWellDepth] = useState('');
  const [newWellStatus, setNewWellStatus] = useState('Active');
  const [wellSaving, setWellSaving] = useState(false);
  const [wellError, setWellError] = useState(null);
  const [wellSuccess, setWellSuccess] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(false);

  useEffect(() => {
    if (selectedWell?.id) {
      setSelectedWellId(String(selectedWell.id));
      setWellMode('existing');
      setWellSuccess(null);
    }
  }, [selectedWell]);

  useEffect(() => {
    if (!selectedWell && wells.length > 0 && wellMode === 'new') {
      setWellMode('existing');
      setWellSuccess(null);
    }
  }, [wells, selectedWell, wellMode]);

  useEffect(() => {
    const fetchRecentUploads = async () => {
      try {
        setLoadingUploads(true);
        const { data } = await axios.get(apiUrl('/api/uploads'));
        setRecentUploads(data);
      } catch (error) {
        console.error('Error loading uploads:', error);
      } finally {
        setLoadingUploads(false);
      }
    };

    fetchRecentUploads();
  }, []);

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

  const resetUploadState = () => {
    setUploadedFile(null);
    setUploadStatus(null);
  };

  const createWell = async () => {
    const trimmedName = newWellName.trim();
    if (!trimmedName) {
      setWellError('Please provide a name for the new well.');
      throw new Error('validation');
    }

    const parsedDepth = Number(newWellDepth);
    if (!Number.isFinite(parsedDepth) || parsedDepth <= 0) {
      setWellError('Please provide a positive depth (in meters) for the new well.');
      throw new Error('validation');
    }

    try {
      setWellSaving(true);
      setWellError(null);
      setWellSuccess(null);

      const { data: createdWell } = await axios.post(apiUrl('/api/wells'), {
        name: trimmedName,
        depth: parsedDepth,
        status: newWellStatus
      });

      setSelectedWellId(String(createdWell.id));
      setWellMode('existing');
      setNewWellName('');
      setNewWellDepth('');
      setNewWellStatus('Active');
      setWellSuccess('Well created successfully. You can now select it and upload data.');

      if (onWellCreated) {
        onWellCreated(createdWell);
      }
      if (onSelectWell) {
        onSelectWell(createdWell);
      }

      return createdWell;
    } catch (error) {
      console.error('Error creating well:', error);
      setWellError(error.response?.data?.error || 'Failed to create well. Please try again.');
      throw error;
    } finally {
      setWellSaving(false);
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

    if (wellMode === 'existing' && !selectedWellId) {
      setUploadStatus({
        type: 'error',
        message: 'Please choose a well to associate with this data or create a new well.'
      });
      return;
    }

    let associatedWellId = selectedWellId;

    if (wellMode === 'new') {
      try {
        const createdWell = await createWell();
        associatedWellId = createdWell?.id ? String(createdWell.id) : '';
        if (!associatedWellId) {
          return;
        }
      } catch (error) {
        return;
      }
    }

    setUploading(true);
    setUploadStatus(null);
    setUploadedFile(file);

    const formData = new FormData();
    formData.append('file', file);
    if (associatedWellId) {
      formData.append('wellId', associatedWellId);
    }

    try {
      const response = await axios.post(apiUrl('/api/upload'), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const uploadResult = response.data;

      setUploadStatus({
        type: 'success',
        message: associatedWellId
          ? 'File uploaded, persisted, and linked to the selected well.'
          : 'File uploaded and persisted successfully.'
      });

      if (uploadResult.fileId) {
        try {
          const persisted = await axios.get(apiUrl(`/api/uploads/${uploadResult.fileId}/data`));
          uploadResult.rows = persisted.data.rows;
          uploadResult.statistics = persisted.data.statistics;
        } catch (fetchError) {
          console.error('Error confirming persisted data:', fetchError);
        }
      }

      if (associatedWellId && onSelectWell) {
        const well = wells.find(w => String(w.id) === String(associatedWellId)) || selectedWell;
        if (well) {
          onSelectWell(well);
        }
      }

      if (onFileUpload) {
        onFileUpload(uploadResult);
      }

      // Refresh uploads list
      try {
        const { data } = await axios.get(apiUrl('/api/uploads'));
        setRecentUploads(data);
      } catch (refreshError) {
        console.error('Error refreshing uploads list:', refreshError);
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
    resetUploadState();
    setNewWellName('');
    setNewWellDepth('');
    setNewWellStatus('Active');
    setWellError(null);
    setWellSuccess(null);
    if (!selectedWell && wells.length === 0) {
      setWellMode('new');
    }
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

        {/* Well Association */}
        <div className="mt-6 sm:mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-800 dark:text-white">Associate Data with a Well</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setWellMode('existing');
                  setWellError(null);
                }}
                className={`px-3 py-1 text-sm rounded-lg border ${wellMode === 'existing' ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300'}`}
              >
                Existing Well
              </button>
              <button
                type="button"
                onClick={() => {
                  setWellMode('new');
                  setSelectedWellId('');
                  setWellError(null);
                }}
                className={`px-3 py-1 text-sm rounded-lg border ${wellMode === 'new' ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-300'}`}
              >
                <Plus className="w-4 h-4 inline-block mr-1" /> New Well
              </button>
            </div>
          </div>

          {wellMode === 'existing' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="well-select">
                Choose an existing well
              </label>
              <select
                id="well-select"
                value={selectedWellId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedWellId(value);
                  if (value && onSelectWell) {
                    const selected = wells.find((well) => String(well.id) === value);
                    if (selected) {
                      onSelectWell(selected);
                    }
                  }
                }}
                className="w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-sm"
              >
                <option value="">Select well...</option>
                {wells.map((well) => (
                  <option key={well.id} value={well.id}>
                    {well.name} · {well.depth.toLocaleString()}m · {well.status}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Data will be persisted and linked to the selected well for visualization and chatbot analysis.
              </p>
            </div>
          )}

          {wellMode === 'new' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="new-well-name">
                  Well Name
                </label>
                <input
                  id="new-well-name"
                  type="text"
                  value={newWellName}
                  onChange={(e) => setNewWellName(e.target.value)}
                  className="mt-1 w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-sm"
                  placeholder="e.g., Horizon Field-12"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="new-well-depth">
                  Total Depth (m)
                </label>
                <input
                  id="new-well-depth"
                  type="number"
                  value={newWellDepth}
                  onChange={(e) => setNewWellDepth(e.target.value)}
                  className="mt-1 w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-sm"
                  placeholder="e.g., 3200"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="new-well-status">
                  Status
                </label>
                <select
                  id="new-well-status"
                  value={newWellStatus}
                  onChange={(e) => setNewWellStatus(e.target.value)}
                  className="mt-1 w-full border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800 text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              {wellError && (
                <div className="sm:col-span-2">
                  <div className="flex items-center p-3 rounded-lg bg-red-50 text-red-800 text-sm">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    {wellError}
                  </div>
                </div>
              )}
              {wellSaving && (
                <div className="sm:col-span-2 text-sm text-primary-600 flex items-center">
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Creating well...
                </div>
              )}
            </div>
          )}
        </div>

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

        <div className="mt-6 sm:mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800 dark:text-white">Recent Uploads</h3>
            <button
              type="button"
              onClick={async () => {
                try {
                  setLoadingUploads(true);
                  const { data } = await axios.get(apiUrl('/api/uploads'));
                  setRecentUploads(data);
                } catch (error) {
                  console.error('Error refreshing uploads:', error);
                } finally {
                  setLoadingUploads(false);
                }
              }}
              className="flex items-center px-2 py-1 text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loadingUploads ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
            {recentUploads.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 p-4">No uploads yet. Upload a file to see it listed here.</p>
            ) : (
              recentUploads.map((upload) => (
                <div
                  key={upload.id}
                  className="p-3 text-sm text-gray-700 dark:text-gray-300 flex justify-between hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={async () => {
                    try {
                      const persisted = await axios.get(apiUrl(`/api/uploads/${upload.id}/data`));
                      const persistedPayload = {
                        rows: persisted.data.rows,
                        totalRows: persisted.data.totalRows,
                        statistics: persisted.data.statistics,
                        fileId: upload.id,
                        file: {
                          filename: upload.filename,
                          originalName: upload.originalName,
                          size: upload.size
                        }
                      };
                      if (onFileUpload) {
                        onFileUpload(persistedPayload);
                      }
                      setUploadStatus({
                        type: 'success',
                        message: 'Loaded persisted dataset from previous upload.'
                      });
                    } catch (persistedError) {
                      console.error('Error loading persisted upload:', persistedError);
                      setUploadStatus({
                        type: 'error',
                        message: 'Unable to load persisted dataset.'
                      });
                    }
                  }}
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white truncate">{upload.originalName || upload.filename}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(upload.uploadedAt).toLocaleString()} · {upload.rows} rows
                    </p>
                  </div>
                  <div className="text-right">
                    <p>{upload.size ? `${(upload.size / 1024).toFixed(1)} KB` : '—'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
