import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from './Pagination';

describe('Pagination Component', () => {
    const mockPagination = {
        currentPage: 2,
        totalPages: 5,
        totalItems: 50,
        itemsPerPage: 10,
        hasNextPage: true,
        hasPrevPage: true
    };

    const mockOnPageChange = jest.fn();

    test('should NOT render if totalPages is 1', () => {
        const singlePage = { ...mockPagination, totalPages: 1 };
        const { container } = render(<Pagination pagination={singlePage} onPageChange={mockOnPageChange} />);
        expect(container.firstChild).toBeNull();
    });

    test('should render pagination info correctly', () => {
        const { container } = render(<Pagination pagination={mockPagination} onPageChange={mockOnPageChange} />);
        expect(screen.getByText(/Mostrando/i)).toBeInTheDocument();
        // Check that pagination info section exists
        expect(container.querySelector('.pagination-info')).toBeInTheDocument();
    });

    test('should call onPageChange when a page number is clicked', () => {
        render(<Pagination pagination={mockPagination} onPageChange={mockOnPageChange} />);

        const page3Btn = screen.getByText('3');
        fireEvent.click(page3Btn);

        expect(mockOnPageChange).toHaveBeenCalledWith(3);
    });

    test('should disable prev buttons when on first page', () => {
        const firstPage = { ...mockPagination, currentPage: 1, hasPrevPage: false };
        render(<Pagination pagination={firstPage} onPageChange={mockOnPageChange} />);

        const prevBtn = screen.getByTitle('Página anterior');
        const firstBtn = screen.getByTitle('Primera página');

        expect(prevBtn).toBeDisabled();
        expect(firstBtn).toBeDisabled();
    });

    test('should call onPageChange when items per page changes', () => {
        render(<Pagination pagination={mockPagination} onPageChange={mockOnPageChange} />);

        const select = screen.getByLabelText('Items por página:');
        fireEvent.change(select, { target: { value: '50' } });

        expect(mockOnPageChange).toHaveBeenCalledWith(1, 50);
    });
});
