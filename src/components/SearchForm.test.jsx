import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchForm from './SearchForm.jsx';
import { todayISO, getTripEndDate } from '../utils/dates.js';

describe('SearchForm', () => {
  const startDate = todayISO();
  const baseProps = {
    destination: '',
    startDate,
    daysCount: 3,
    radiusKm: 5,
    loading: false,
    endDate: getTripEndDate(startDate, 3),
    onDestinationChange: vi.fn(),
    onStartDateChange: vi.fn(),
    onDaysCountChange: vi.fn(),
    onRadiusKmChange: vi.fn(),
    onSubmit: vi.fn((e) => e.preventDefault()),
  };

  it('renders labeled form controls', () => {
    render(<SearchForm {...baseProps} />);
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/days:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/radius:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /plan my itinerary/i })).toBeInTheDocument();
  });

  it('submits the form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<SearchForm {...baseProps} onSubmit={onSubmit} destination="Paris" />);
    await user.click(screen.getByRole('button', { name: /plan my itinerary/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables submit while loading', () => {
    render(<SearchForm {...baseProps} loading />);
    expect(screen.getByRole('button', { name: /plan my itinerary/i })).toBeDisabled();
  });

  it('calls change handlers for trip controls', async () => {
    const user = userEvent.setup();
    const onDestinationChange = vi.fn();
    const onStartDateChange = vi.fn();
    const onDaysCountChange = vi.fn();
    const onRadiusKmChange = vi.fn();

    render(
      <SearchForm
        {...baseProps}
        onDestinationChange={onDestinationChange}
        onStartDateChange={onStartDateChange}
        onDaysCountChange={onDaysCountChange}
        onRadiusKmChange={onRadiusKmChange}
      />
    );

    await user.type(screen.getByLabelText(/destination/i), 'Rome');
    fireEvent.change(screen.getByLabelText(/days:/i), { target: { value: '4' } });
    fireEvent.change(screen.getByLabelText(/radius:/i), { target: { value: '8' } });

    expect(onDestinationChange).toHaveBeenCalled();
    expect(onDaysCountChange).toHaveBeenCalledWith(4);
    expect(onRadiusKmChange).toHaveBeenCalledWith(8);
  });
});
