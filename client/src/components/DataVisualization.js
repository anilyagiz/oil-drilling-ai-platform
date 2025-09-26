import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { BarChart3, TrendingUp, Activity, Database } from 'lucide-react';
import { apiUrl } from '../api';

const DataVisualization = ({ selectedWell, uploadedData }) => {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadWellData = useCallback(async () => {
    if (!selectedWell) return;

    setLoading(true);
    try {
      const response = await fetch(apiUrl(`/api/wells/${selectedWell.id}/data`));
      if (response.ok) {
        const wellData = await response.json();
        const processedData = wellData.map(row => {
          const processedRow = {
            depth: row.depth || 0,
            shale: row.shale_percent || 0,
            sandstone: row.sandstone_percent || 0,
            limestone: row.limestone_percent || 0,
            dolomite: row.dolomite_percent || 0,
            anhydrite: row.anhydrite_percent || 0,
            coal: row.coal_percent || 0,
            salt: row.salt_percent || 0,
            DT: row.dt || 0,
            GR: row.gr || 0,
            dominantRockType: row.dominant_rock_type || 'Unknown'
          };

          // Calculate total rock composition
          processedRow.rockComposition = processedRow.shale + processedRow.sandstone + 
                                       processedRow.limestone + processedRow.dolomite + 
                                       processedRow.anhydrite + processedRow.coal + 
                                       processedRow.salt;

          return processedRow;
        });
        setChartData(processedData);
      }
    } catch (error) {
      console.error('Error loading well data:', error);
      setChartData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedWell]);

  useEffect(() => {
    const loadUploadedData = async () => {
      if (!uploadedData) {
        return;
      }

      if (uploadedData.rows && uploadedData.rows.length > 0) {
        processData(uploadedData);
        return;
      }

      if (uploadedData.fileId) {
        setLoading(true);
        try {
          const response = await fetch(apiUrl(`/api/uploads/${uploadedData.fileId}/data`));
          if (response.ok) {
            const persisted = await response.json();
            processData({ rows: persisted.rows });
          } else {
            setChartData([]);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error loading persisted upload data:', error);
          setChartData([]);
          setLoading(false);
        }
      }
    };

    if (uploadedData) {
      loadUploadedData();
    } else if (selectedWell) {
      loadWellData();
    } else {
      setChartData([]);
    }
  }, [selectedWell, uploadedData, loadWellData]);

  const processData = (data) => {
    // Process the uploaded Excel data with actual structure
    if (data && data.rows) {
      const processedData = data.rows.map((row, index) => {
        const processedRow = {
          depth: row.DEPTH || index * 10,
          shale: row.SH || 0,
          sandstone: row.SS || 0,
          limestone: row.LS || 0,
          dolomite: row.DOL || 0,
          anhydrite: row.ANH || 0,
          coal: row.Coal || 0,
          salt: row.Salt || 0,
          DT: row.DT || 0,
          GR: row.GR || 0,
          dominantRockType: row.dominantRockType || 'Unknown'
        };

        // Calculate total rock composition
        processedRow.rockComposition = processedRow.shale + processedRow.sandstone + 
                                     processedRow.limestone + processedRow.dolomite + 
                                     processedRow.anhydrite + processedRow.coal + 
                                     processedRow.salt;

        return processedRow;
      });
      setChartData(processedData);
    } else {
      setChartData([]);
    }
    setLoading(false);
  };

  const getRockTypeDistribution = () => {
    const distribution = {};
    chartData.forEach(row => {
      const rockType = row.dominantRockType || 'Unknown';
      distribution[rockType] = (distribution[rockType] || 0) + 1;
    });

    return Object.entries(distribution)
      .map(([rockType, count]) => ({ rockType, count }))
      .sort((a, b) => b.count - a.count);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const depthValue = payload[0]?.payload?.depth ?? label;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-800">Depth: {depthValue}m</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-48 mb-2 sm:mb-0 animate-shimmer"></div>
            <div className="h-4 bg-gray-200 rounded w-32 animate-shimmer"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center">
                  <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded mr-3 animate-shimmer"></div>
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-shimmer"></div>
                    <div className="h-5 bg-gray-200 rounded w-20 animate-shimmer"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart Skeletons */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-shimmer"></div>
            <div className="w-full h-64 bg-gray-100 rounded animate-shimmer"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!selectedWell && !uploadedData) {
    return (
      <div className="text-center py-12">
        <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">No Data Available</h3>
        <p className="text-gray-500">
          Select a well from the sidebar or upload data to view visualizations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-2 sm:mb-0">Data Analysis</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <BarChart3 className="w-4 h-4" />
            <span>{chartData.length} data points</span>
          </div>
        </div>
        
        {/* Stats Grid - Enhanced with Rock Composition */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-xs sm:text-sm text-blue-600">Depth Range</p>
                <p className="text-lg sm:text-xl font-bold text-blue-800">
                  {chartData.length > 0 
                    ? `${Math.min(...chartData.map(d => d.depth)).toLocaleString()}-${Math.max(...chartData.map(d => d.depth)).toLocaleString()}m`
                    : '0m'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center">
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mr-3" />
              <div>
                <p className="text-xs sm:text-sm text-green-600">Avg GR</p>
                <p className="text-lg sm:text-xl font-bold text-green-800">
                  {chartData.length > 0 
                    ? (chartData.reduce((sum, d) => sum + d.GR, 0) / chartData.length).toFixed(1)
                    : 0
                  } API
                </p>
              </div>
            </div>
          </div>

          <div className="bg-orange-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center">
              <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500 mr-3" />
              <div>
                <p className="text-xs sm:text-sm text-orange-600">Avg DT</p>
                <p className="text-lg sm:text-xl font-bold text-orange-800">
                  {chartData.length > 0 
                    ? (chartData.reduce((sum, d) => sum + d.DT, 0) / chartData.length).toFixed(1)
                    : 0
                  } μs/ft
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center">
              <Database className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-xs sm:text-sm text-purple-600">Data Points</p>
                <p className="text-lg sm:text-xl font-bold text-purple-800">{chartData.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dominant Rock Type Summary */}
        {chartData.length > 0 && (
          <div className="mt-4 bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Dominant Rock Types</h4>
            <div className="flex flex-wrap gap-2">
              {getRockTypeDistribution().slice(0, 5).map(({ rockType, count }) => (
                <span 
                  key={rockType}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {rockType}: {count} ({((count / chartData.length) * 100).toFixed(1)}%)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Chart - Depth vs Rock Composition */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 animate-fade-in">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Depth vs Rock Composition
        </h3>
        <div className="w-full" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                dataKey="rockComposition"
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                label={{ value: 'Rock Composition (%)', position: 'insideBottomRight', offset: -5 }}
                fontSize={12}
              />
              <YAxis 
                type="number"
                dataKey="depth"
                label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="rockComposition" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={false}
                name="Rock Composition"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rock Composition Breakdown */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Complete Rock Composition Analysis vs Depth
        </h3>
        <div className="w-full" style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                fontSize={12}
                label={{ value: 'Percentage (%)', position: 'insideBottomRight', offset: -5 }}
                domain={[0, 1]}
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
              />
              <YAxis 
                type="number"
                dataKey="depth"
                fontSize={12}
                label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-800">Depth: {label}m</p>
                        {payload.map((entry, index) => (
                          <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.dataKey}: {(entry.value * 100).toFixed(1)}%
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="shale" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={false}
                name="Shale"
              />
              <Line 
                type="monotone" 
                dataKey="sandstone" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={false}
                name="Sandstone"
              />
              <Line 
                type="monotone" 
                dataKey="limestone" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={false}
                name="Limestone"
              />
              <Line 
                type="monotone" 
                dataKey="dolomite" 
                stroke="#06b6d4" 
                strokeWidth={2}
                dot={false}
                name="Dolomite"
              />
              <Line 
                type="monotone" 
                dataKey="anhydrite" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                name="Anhydrite"
              />
              <Line 
                type="monotone" 
                dataKey="coal" 
                stroke="#374151" 
                strokeWidth={2}
                dot={false}
                name="Coal"
              />
              <Line 
                type="monotone" 
                dataKey="salt" 
                stroke="#fbbf24" 
                strokeWidth={2}
                dot={false}
                name="Salt"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rock Type Distribution Bar Chart */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Dominant Rock Type Distribution
        </h3>
        <div className="w-full" style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={getRockTypeDistribution()} 
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="rockType" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                fontSize={12}
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const percentage = ((payload[0].value / chartData.length) * 100).toFixed(1);
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-800">{label}</p>
                        <p className="text-sm text-gray-600">
                          Count: {payload[0].value} ({percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary Charts - Responsive Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* DT Chart */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Delta Time (DT) vs Depth
          </h3>
          <div className="w-full" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} label={{ value: 'DT (μs/ft)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis type="number" dataKey="depth" fontSize={12} label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="DT" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={false}
                  name="DT (μs/ft)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GR Chart */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Gamma Ray (GR) vs Depth
          </h3>
          <div className="w-full" style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} label={{ value: 'GR (API)', position: 'insideBottomRight', offset: -5 }} />
                <YAxis type="number" dataKey="depth" fontSize={12} label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="GR" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={false}
                  name="GR (API)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Enhanced Data Summary with Rock Composition Details */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Statistical Analysis</h3>
          
          {/* Rock Composition Statistics */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">Rock Composition Statistics (%)</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rock Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Average</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Max</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Std Dev</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[
                    { name: 'Shale', key: 'shale', color: 'bg-purple-100 text-purple-800' },
                    { name: 'Sandstone', key: 'sandstone', color: 'bg-orange-100 text-orange-800' },
                    { name: 'Limestone', key: 'limestone', color: 'bg-green-100 text-green-800' },
                    { name: 'Dolomite', key: 'dolomite', color: 'bg-cyan-100 text-cyan-800' },
                    { name: 'Anhydrite', key: 'anhydrite', color: 'bg-red-100 text-red-800' },
                    { name: 'Coal', key: 'coal', color: 'bg-gray-100 text-gray-800' },
                    { name: 'Salt', key: 'salt', color: 'bg-yellow-100 text-yellow-800' }
                  ].map(({ name, key, color }) => {
                    const values = chartData.map(d => d[key] * 100);
                    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
                    const min = Math.min(...values);
                    const max = Math.max(...values);
                    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);
                    
                    return (
                      <tr key={key}>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
                            {name}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">{avg.toFixed(2)}%</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{min.toFixed(2)}%</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{max.toFixed(2)}%</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{stdDev.toFixed(2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Well Log Statistics */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Well Log Measurements</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* DT Statistics */}
              <div className="bg-green-50 p-4 rounded-lg">
                <h5 className="font-medium text-green-800 mb-2">Delta Time (DT)</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-600">Average:</span>
                    <span className="font-semibold">{(chartData.reduce((sum, d) => sum + d.DT, 0) / chartData.length).toFixed(2)} μs/ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Range:</span>
                    <span className="font-semibold">
                      {Math.min(...chartData.map(d => d.DT)).toFixed(2)} - {Math.max(...chartData.map(d => d.DT)).toFixed(2)} μs/ft
                    </span>
                  </div>
                </div>
              </div>

              {/* GR Statistics */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h5 className="font-medium text-yellow-800 mb-2">Gamma Ray (GR)</h5>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Average:</span>
                    <span className="font-semibold">{(chartData.reduce((sum, d) => sum + d.GR, 0) / chartData.length).toFixed(2)} API</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Range:</span>
                    <span className="font-semibold">
                      {Math.min(...chartData.map(d => d.GR)).toFixed(2)} - {Math.max(...chartData.map(d => d.GR)).toFixed(2)} API
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVisualization;
