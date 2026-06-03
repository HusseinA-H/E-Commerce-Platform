import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingBoundary from '@/components/LoadingBoundary';

describe('LoadingBoundary', () => {
  it('renders children when not loading', () => {
    render(
      <LoadingBoundary isLoading={false}>
        <div data-testid="child-content">Content Loaded</div>
      </LoadingBoundary>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders a loading spinner when loading is true', () => {
    render(
      <LoadingBoundary isLoading={true}>
        <div data-testid="child-content">Content Loaded</div>
      </LoadingBoundary>
    );

    // The component renders a loader with text "SYNCING PERFORMANCE DATA"
    const spinnerText = screen.getByText(/SYNCING PERFORMANCE DATA/i);
    expect(spinnerText).toBeInTheDocument();
  });
});
