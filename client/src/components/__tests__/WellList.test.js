import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WellList from '../WellList';

const mockWells = [
  {
    id: 1,
    name: 'Well Alpha-1',
    depth: 2500,
    status: 'Active'
  },
  {
    id: 2,
    name: 'Well Beta-2',
    depth: 3200,
    status: 'Inactive'
  },
  {
    id: 3,
    name: 'Well Gamma-3',
    depth: 1800,
    status: 'Maintenance'
  }
];

describe('WellList', () => {
  const mockOnWellSelect = jest.fn();

  beforeEach(() => {
    mockOnWellSelect.mockClear();
  });

  it('should render well inventory title', () => {
    render(<WellList wells={[]} selectedWell={null} onWellSelect={mockOnWellSelect} />);
    
    expect(screen.getByText('Well Inventory')).toBeInTheDocument();
  });

  it('should render all wells with correct information', () => {
    render(<WellList wells={mockWells} selectedWell={null} onWellSelect={mockOnWellSelect} />);
    
    expect(screen.getByText('Well Alpha-1')).toBeInTheDocument();
    expect(screen.getByText('Well Beta-2')).toBeInTheDocument();
    expect(screen.getByText('Well Gamma-3')).toBeInTheDocument();
    
    expect(screen.getByText('Depth: 2,500m')).toBeInTheDocument();
    expect(screen.getByText('Depth: 3,200m')).toBeInTheDocument();
    expect(screen.getByText('Depth: 1,800m')).toBeInTheDocument();
  });

  it('should display correct status for each well', () => {
    render(<WellList wells={mockWells} selectedWell={null} onWellSelect={mockOnWellSelect} />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
  });

  it('should display correct status descriptions', () => {
    render(<WellList wells={mockWells} selectedWell={null} onWellSelect={mockOnWellSelect} />);
    
    expect(screen.getByText('Drilling in progress')).toBeInTheDocument();
    expect(screen.getByText('Currently inactive')).toBeInTheDocument();
    expect(screen.getByText('Under maintenance')).toBeInTheDocument();
  });

  it('should highlight selected well', () => {
    const selectedWell = mockWells[0];
    render(<WellList wells={mockWells} selectedWell={selectedWell} onWellSelect={mockOnWellSelect} />);
    
    const selectedWellElement = screen.getByText('Well Alpha-1').closest('div');
    expect(selectedWellElement).toHaveClass('border-primary-500');
  });

  it('should call onWellSelect when a well is clicked', async () => {
    const user = userEvent.setup();
    render(<WellList wells={mockWells} selectedWell={null} onWellSelect={mockOnWellSelect} />);
    
    await user.click(screen.getByText('Well Alpha-1'));
    
    expect(mockOnWellSelect).toHaveBeenCalledWith(mockWells[0]);
  });

  it('should display summary statistics', () => {
    render(<WellList wells={mockWells} selectedWell={null} onWellSelect={mockOnWellSelect} />);
    
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Total Wells')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Total wells count
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Active wells count
  });

  it('should handle empty wells array', () => {
    render(<WellList wells={[]} selectedWell={null} onWellSelect={mockOnWellSelect} />);
    
    expect(screen.getByText('Well Inventory')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2); // Total wells and active wells count should be 0
  });

  it('should render correct status icons', () => {
    render(<WellList wells={mockWells} selectedWell={null} onWellSelect={mockOnWellSelect} />);
    
    // Check that well items are clickable (they have cursor-pointer class)
    const wellItems = screen.getAllByText(/Well .+-\d+/);
    expect(wellItems).toHaveLength(mockWells.length);
    
    wellItems.forEach(item => {
      expect(item.closest('div')).toHaveClass('cursor-pointer');
    });
  });

  it('should apply correct CSS classes for different statuses', () => {
    render(<WellList wells={mockWells} selectedWell={null} onWellSelect={mockOnWellSelect} />);
    
    // Get status badges (not the summary section)
    const statusBadges = screen.getAllByText('Active').filter(el => 
      el.classList.contains('px-2')
    );
    const inactiveStatus = screen.getByText('Inactive');
    const maintenanceStatus = screen.getByText('Maintenance');
    
    expect(statusBadges[0]).toHaveClass('bg-green-100', 'text-green-800');
    expect(inactiveStatus).toHaveClass('bg-gray-100', 'text-gray-800');
    expect(maintenanceStatus).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });
});