import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareTripPanel from './ShareTripPanel.jsx';

vi.mock('../utils/clipboard.js', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(undefined),
}));

import { copyTextToClipboard } from '../utils/clipboard.js';

describe('ShareTripPanel', () => {
  const baseProps = {
    destination: 'Paris',
    startDate: '2026-06-01',
    daysCount: 3,
    radiusKm: 5,
    baseUrl: 'https://example.com/',
    onAnnounce: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing without a destination', () => {
    const { container } = render(
      <ShareTripPanel {...baseProps} destination="" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders an accessible share URL field', () => {
    render(<ShareTripPanel {...baseProps} />);

    expect(screen.getByRole('heading', { name: /share this trip/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/shareable trip link/i)).toHaveValue(
      'https://example.com/?to=Paris&start=2026-06-01&days=3&radius=5&run=1'
    );
  });

  it('copies the share link and announces success', async () => {
    const user = userEvent.setup();
    render(<ShareTripPanel {...baseProps} />);

    await user.click(screen.getByRole('button', { name: /copy share link to clipboard/i }));

    expect(copyTextToClipboard).toHaveBeenCalledWith(
      'https://example.com/?to=Paris&start=2026-06-01&days=3&radius=5&run=1'
    );
    expect(baseProps.onAnnounce).toHaveBeenCalledWith('Share link copied to clipboard');
    expect(screen.getByRole('button', { name: /share link copied/i })).toBeInTheDocument();
  });
});
