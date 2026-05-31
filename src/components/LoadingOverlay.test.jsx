import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingOverlay from './LoadingOverlay.jsx';

describe('LoadingOverlay', () => {
  it('renders accessible loading dialog with stage text', () => {
    render(<LoadingOverlay stage="Geocoding Destination" />);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Planning your trip')).toBeInTheDocument();
    expect(screen.getByText('Geocoding Destination...')).toBeInTheDocument();
  });
});
