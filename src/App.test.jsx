import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';

vi.mock('./components/Map.jsx', () => ({
  default: () => <div role="application" aria-label="Mock map">Map</div>,
}));

vi.mock('./engine/planTrip.js', () => ({
  planTrip: vi.fn(),
}));

vi.mock('./utils/clipboard.js', () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(undefined),
}));

import { planTrip } from './engine/planTrip.js';
import { copyTextToClipboard } from './utils/clipboard.js';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('renders accessible shell with skip link and labeled controls', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /skip to map and itinerary/i })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: /trip planner sidebar/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
    expect(screen.getByRole('application', { name: /mock map/i })).toBeInTheDocument();
  });

  it('toggles theme with accessible button', async () => {
    const user = userEvent.setup();
    render(<App />);

    const themeButton = screen.getByRole('button', { name: /switch to light mode/i });
    await user.click(themeButton);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('shows settings panel when settings button is expanded', async () => {
    const user = userEvent.setup();
    render(<App />);

    const settingsButton = screen.getByRole('button', { name: /api developer settings/i });
    expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(settingsButton);
    expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText(/radar.io api key/i)).toBeInTheDocument();
  });

  it('plans a trip and renders itinerary summary', async () => {
    const user = userEvent.setup();
    planTrip.mockResolvedValue({
      location: { lat: 48.8, lon: 2.3, name: 'Paris, France' },
      weather: [{ date: '2026-05-01', maxTemp: 20, minTemp: 10, weatherCode: 0 }],
      pois: [
        { id: 'a', name: 'Louvre', category: 'museum', lat: 1, lon: 2 },
        { id: 'b', name: 'Garden', category: 'park', lat: 1.1, lon: 2.1 },
      ],
      itineraries: [[
        { id: 'a', name: 'Louvre', category: 'museum', lat: 1, lon: 2 },
        { id: 'b', name: 'Garden', category: 'park', lat: 1.1, lon: 2.1 },
      ]],
      totalTime: 25,
    });

    render(<App />);
    await user.type(screen.getByLabelText(/destination/i), 'Paris');
    await user.click(screen.getByRole('button', { name: /plan my itinerary/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /itinerary/i })).toBeInTheDocument();
    });

    expect(screen.getByText('25 mins')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop 1: louvre/i })).toBeInTheDocument();
  });

  it('shows alert when planning fails', async () => {
    const user = userEvent.setup();
    planTrip.mockRejectedValue(new Error('Could not find destination. Try a different city.'));

    render(<App />);
    await user.type(screen.getByLabelText(/destination/i), 'Nowhere');
    await user.click(screen.getByRole('button', { name: /plan my itinerary/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not find destination');
    });
  });

  it('shows loading overlay while planning', async () => {
    const user = userEvent.setup();
    let resolvePlan;
    planTrip.mockImplementation(
      () => new Promise((resolve) => { resolvePlan = resolve; })
    );

    render(<App />);
    await user.type(screen.getByLabelText(/destination/i), 'Paris');
    await user.click(screen.getByRole('button', { name: /plan my itinerary/i }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    resolvePlan({
      location: { lat: 1, lon: 2, name: 'Paris' },
      weather: [],
      pois: [],
      itineraries: [],
      totalTime: 0,
    });

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('selects and deselects itinerary stops', async () => {
    const user = userEvent.setup();
    planTrip.mockResolvedValue({
      location: { lat: 48.8, lon: 2.3, name: 'Paris, France' },
      weather: [],
      pois: [{ id: 'a', name: 'Louvre', category: 'museum', lat: 1, lon: 2 }],
      itineraries: [[{ id: 'a', name: 'Louvre', category: 'museum', lat: 1, lon: 2 }]],
      totalTime: 0,
    });

    render(<App />);
    await user.type(screen.getByLabelText(/destination/i), 'Paris');
    await user.click(screen.getByRole('button', { name: /plan my itinerary/i }));

    const stop = await screen.findByRole('button', { name: /stop 1: louvre/i });
    await user.click(stop);
    expect(stop).toHaveAttribute('aria-pressed', 'true');

    await user.click(stop);
    expect(stop).toHaveAttribute('aria-pressed', 'false');
  });

  it('ignores empty destination submit', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /plan my itinerary/i }));
    expect(planTrip).not.toHaveBeenCalled();
  });

  it('hydrates trip inputs from URL parameters', () => {
    window.history.replaceState({}, '', '/?to=Rome&start=2026-06-01&days=4&radius=8');

    render(<App />);

    expect(screen.getByLabelText(/destination/i)).toHaveValue('Rome');
    expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-06-01');
    expect(screen.getByLabelText(/days:/i)).toHaveValue('4');
    expect(screen.getByLabelText(/radius:/i)).toHaveValue('8');
    expect(planTrip).not.toHaveBeenCalled();
  });

  it('auto-plans when landing with run=1 in the share link', async () => {
    window.history.replaceState({}, '', '/?to=Paris&days=3&radius=5&run=1');
    planTrip.mockResolvedValue({
      location: { lat: 48.8, lon: 2.3, name: 'Paris, France' },
      weather: [],
      pois: [{ id: 'a', name: 'Louvre', category: 'museum', lat: 1, lon: 2 }],
      itineraries: [[{ id: 'a', name: 'Louvre', category: 'museum', lat: 1, lon: 2 }]],
      totalTime: 0,
    });

    render(<App />);

    await waitFor(() => {
      expect(planTrip).toHaveBeenCalledWith(expect.objectContaining({ destination: 'Paris' }));
    });
  });

  it('shows share panel and copies a shareable link', async () => {
    const user = userEvent.setup();

    render(<App />);
    await user.type(screen.getByLabelText(/destination/i), 'Paris');

    const shareInput = screen.getByLabelText(/shareable trip link/i);
    expect(shareInput.value).toContain('to=Paris');
    expect(shareInput.value).toContain('run=1');

    await user.click(screen.getByRole('button', { name: /copy share link to clipboard/i }));
    expect(copyTextToClipboard).toHaveBeenCalledWith(shareInput.value);
    expect(screen.getByRole('button', { name: /share link copied/i })).toBeInTheDocument();
  });
});
