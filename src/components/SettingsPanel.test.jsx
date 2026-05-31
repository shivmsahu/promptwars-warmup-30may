import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from './SettingsPanel.jsx';

describe('SettingsPanel', () => {
  it('renders API key fields with labels', () => {
    render(
      <SettingsPanel
        radarKey=""
        orsKey=""
        onRadarKeyChange={vi.fn()}
        onOrsKeyChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/radar.io api key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/openrouteservice api key/i)).toBeInTheDocument();
  });

  it('calls change handlers when typing', async () => {
    const user = userEvent.setup();
    const onRadarKeyChange = vi.fn();
    const onOrsKeyChange = vi.fn();
    render(
      <SettingsPanel
        radarKey=""
        orsKey=""
        onRadarKeyChange={onRadarKeyChange}
        onOrsKeyChange={onOrsKeyChange}
      />
    );

    await user.type(screen.getByLabelText(/radar.io api key/i), 'abc');
    await user.type(screen.getByLabelText(/openrouteservice api key/i), 'xyz');
    expect(onRadarKeyChange).toHaveBeenCalled();
    expect(onOrsKeyChange).toHaveBeenCalled();
  });
});
