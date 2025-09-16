import React from 'react';
import { ChevronRight, Activity, Clock, Wrench } from 'lucide-react';

const WellList = ({ wells, selectedWell, onWellSelect }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Active':
        return <Activity className="w-4 h-4 text-green-500" />;
      case 'Inactive':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'Maintenance':
        return <Wrench className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 py-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Well Inventory</h3>
        <div className="space-y-3">
          {wells.map((well, index) => (
            <div
              key={well.id}
              onClick={() => onWellSelect(well)}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 hover:shadow-md animate-fade-in ${
                selectedWell?.id === well.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md ring-2 ring-primary-200'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 dark:text-white truncate">{well.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Depth: {well.depth.toLocaleString()}m
                  </p>
                  <div className="flex items-center mt-2">
                    {getStatusIcon(well.status)}
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {well.status === 'Active' && 'Drilling in progress'}
                      {well.status === 'Inactive' && 'Currently inactive'}
                      {well.status === 'Maintenance' && 'Under maintenance'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2 ml-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(well.status)}`}>
                    {well.status}
                  </span>
                  <ChevronRight 
                    className={`w-4 h-4 transition-colors ${
                      selectedWell?.id === well.id ? 'text-primary-500' : 'text-gray-400'
                    }`} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Summary Stats - Mobile Optimized */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Summary</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Wells</div>
            <div className="text-lg font-bold text-gray-800 dark:text-white">{wells.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Active</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {wells.filter(w => w.status === 'Active').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WellList;
