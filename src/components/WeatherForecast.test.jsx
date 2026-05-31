import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeatherForecast from './WeatherForecast.jsx';

describe('WeatherForecast', () => {
  it('renders nothing without weather or location', () => {
    const { container } = render(
      <WeatherForecast weather={[]} location={null} daysCount={3} startDate="2026-05-01" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders daily weather cards with accessible labels', () => {
    render(
      <WeatherForecast
        weather={[{ date: '2026-05-01', maxTemp: 30, minTemp: 20, weatherCode: 0 }]}
        location={{ name: 'Paris, France' }}
        daysCount={1}
        startDate="2026-05-01"
      />
    );

    expect(screen.getByRole('heading', { name: /weather · paris/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/high 30 degrees/i)).toBeInTheDocument();
  });
});
