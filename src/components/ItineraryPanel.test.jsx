import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ItineraryPanel from './ItineraryPanel.jsx';

describe('ItineraryPanel', () => {
  const itineraries = [[
    { id: 'a', name: 'Louvre', category: 'museum', lat: 1, lon: 2 },
    { id: 'b', name: 'Garden', category: 'park', lat: 1.1, lon: 2.1 },
  ]];

  const poiMeta = {
    '0-a': { globalIndex: 1, dayIdx: 0, poi: itineraries[0][0] },
    '0-b': { globalIndex: 2, dayIdx: 0, poi: itineraries[0][1] },
  };

  it('renders nothing without itineraries', () => {
    const { container } = render(
      <ItineraryPanel
        itineraries={[]}
        pois={[]}
        totalTime={0}
        startDate="2026-05-01"
        activeDay={null}
        selectedPoiKey={null}
        poiMeta={{}}
        cardRefs={{ current: {} }}
        onActiveDayChange={vi.fn()}
        onPoiSelect={vi.fn()}
        onViewAllDays={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders itinerary stops as accessible buttons', async () => {
    const user = userEvent.setup();
    const onPoiSelect = vi.fn();

    render(
      <ItineraryPanel
        itineraries={itineraries}
        pois={itineraries.flat()}
        totalTime={20}
        startDate="2026-05-01"
        activeDay={null}
        selectedPoiKey={null}
        poiMeta={poiMeta}
        cardRefs={{ current: {} }}
        onActiveDayChange={vi.fn()}
        onPoiSelect={onPoiSelect}
        onViewAllDays={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /itinerary/i })).toBeInTheDocument();
    expect(screen.getByText('20 mins')).toBeInTheDocument();

    const stopButton = screen.getByRole('button', { name: /stop 1: louvre/i });
    await user.click(stopButton);
    expect(onPoiSelect).toHaveBeenCalledWith('0-a');
  });

  it('focuses a day and clears selection via view all', async () => {
    const user = userEvent.setup();
    const onActiveDayChange = vi.fn();
    const onViewAllDays = vi.fn();

    render(
      <ItineraryPanel
        itineraries={itineraries}
        pois={itineraries.flat()}
        totalTime={20}
        startDate="2026-05-31"
        activeDay={null}
        selectedPoiKey={null}
        poiMeta={poiMeta}
        cardRefs={{ current: {} }}
        onActiveDayChange={onActiveDayChange}
        onPoiSelect={vi.fn()}
        onViewAllDays={onViewAllDays}
      />
    );

    await user.click(screen.getByRole('button', { name: /day 1,/i }));
    expect(onActiveDayChange).toHaveBeenCalledWith(0);

    await user.click(screen.getByRole('button', { name: /view all days/i }));
    expect(onViewAllDays).toHaveBeenCalled();
  });

  it('renders website link when POI has a website', () => {
    const withWebsite = [[
      { id: 'a', name: 'Louvre', category: 'museum', lat: 1, lon: 2, website: 'https://louvre.fr' },
    ]];

    render(
      <ItineraryPanel
        itineraries={withWebsite}
        pois={withWebsite.flat()}
        totalTime={0}
        startDate="2026-05-31"
        activeDay={0}
        selectedPoiKey={null}
        poiMeta={{ '0-a': { globalIndex: 1, dayIdx: 0, poi: withWebsite[0][0] } }}
        cardRefs={{ current: {} }}
        onActiveDayChange={vi.fn()}
        onPoiSelect={vi.fn()}
        onViewAllDays={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /visit website for louvre/i })).toBeInTheDocument();
  });
});
