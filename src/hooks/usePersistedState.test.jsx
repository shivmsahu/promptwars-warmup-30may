import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { usePersistedState } from './usePersistedState.js';

function TestHarness({ storageKey, defaultValue }) {
  const [value, setValue] = usePersistedState(storageKey, defaultValue);
  return (
    <div>
      <span data-testid="value">{value}</span>
      <button type="button" onClick={() => setValue('updated')}>Update</button>
    </div>
  );
}

describe('usePersistedState', () => {
  it('reads default value when storage is empty', () => {
    render(<TestHarness storageKey="theme" defaultValue="dark" />);
    expect(screen.getByTestId('value')).toHaveTextContent('dark');
  });

  it('reads stored value from localStorage', () => {
    localStorage.setItem('theme', 'light');
    render(<TestHarness storageKey="theme" defaultValue="dark" />);
    expect(screen.getByTestId('value')).toHaveTextContent('light');
  });

  it('persists updates to localStorage', () => {
    render(<TestHarness storageKey="theme" defaultValue="dark" />);
    act(() => {
      screen.getByRole('button', { name: 'Update' }).click();
    });
    expect(localStorage.getItem('theme')).toBe('updated');
    expect(screen.getByTestId('value')).toHaveTextContent('updated');
  });

  it('falls back to default when localStorage read fails', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    render(<TestHarness storageKey="theme" defaultValue="dark" />);
    expect(screen.getByTestId('value')).toHaveTextContent('dark');
  });
});
