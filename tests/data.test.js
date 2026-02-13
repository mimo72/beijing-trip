import { describe, it, expect } from 'vitest';
import tripData from '../data.js';

describe('tripData structure', () => {
  it('has 5 days of itinerary', () => {
    expect(tripData.days).toHaveLength(5);
  });

  it('has valid start and end dates', () => {
    expect(tripData.startDate).toBe('2026-02-20');
    expect(tripData.endDate).toBe('2026-02-24');
  });
});

describe('days - required fields', () => {
  const requiredFields = ['d', 'l', 'w', 'th', 'wx', 'ft', 'tl', 'bg', 'i'];

  tripData.days.forEach((day, index) => {
    describe(`Day ${index + 1} (${day.d})`, () => {
      requiredFields.forEach(field => {
        it(`has required field "${field}"`, () => {
          expect(day).toHaveProperty(field);
          expect(day[field]).toBeDefined();
        });
      });

      it('has a non-empty timeline', () => {
        expect(day.tl.length).toBeGreaterThan(0);
      });

      it('has day index matching position', () => {
        expect(day.i).toBe(index + 1);
      });
    });
  });
});

describe('timeline items - required fields', () => {
  tripData.days.forEach((day, di) => {
    day.tl.forEach((item, ti) => {
      describe(`Day ${di + 1}, item ${ti} ("${item.n}")`, () => {
        it('has required fields: t, n, p', () => {
          expect(item).toHaveProperty('t');
          expect(item).toHaveProperty('n');
          expect(item).toHaveProperty('p');
        });

        it('has a valid time format (HH:MM)', () => {
          expect(item.t).toMatch(/^\d{2}:\d{2}$/);
        });

        it('has valid end time format if present', () => {
          if (item.e) {
            expect(item.e).toMatch(/^\d{2}:\d{2}$/);
          }
        });

        it('has a known type', () => {
          const validTypes = [
            'flight', 'transport', 'attraction', 'food',
            'explore', 'rest', 'prepare', 'shopping', 'free'
          ];
          expect(validTypes).toContain(item.p);
        });
      });
    });
  });
});

describe('budget values', () => {
  tripData.days.forEach((day, index) => {
    it(`Day ${index + 1} budget values are non-negative numbers`, () => {
      Object.values(day.bg).forEach(val => {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('total budget is a positive number', () => {
    expect(tripData.budget.total).toBeGreaterThan(0);
  });

  it('budget categories have required fields', () => {
    tripData.budget.categories.forEach(cat => {
      expect(cat).toHaveProperty('id');
      expect(cat).toHaveProperty('nm');
      expect(cat).toHaveProperty('am');
      expect(cat).toHaveProperty('ic');
      expect(cat.am).toBeGreaterThan(0);
    });
  });
});

describe('flight data', () => {
  const requiredFlightFields = ['code', 'from', 'to', 'depart', 'arrive', 'date'];

  it('has outbound flight with required fields', () => {
    const f = tripData.flights.outbound;
    requiredFlightFields.forEach(field => {
      expect(f).toHaveProperty(field);
    });
  });

  it('has return flight with required fields', () => {
    const f = tripData.flights.return;
    requiredFlightFields.forEach(field => {
      expect(f).toHaveProperty(field);
    });
  });

  it('flight times are valid HH:MM', () => {
    const timePattern = /^\d{2}:\d{2}$/;
    expect(tripData.flights.outbound.depart).toMatch(timePattern);
    expect(tripData.flights.outbound.arrive).toMatch(timePattern);
    expect(tripData.flights.return.depart).toMatch(timePattern);
    expect(tripData.flights.return.arrive).toMatch(timePattern);
  });
});

describe('hotel data', () => {
  it('has required fields', () => {
    const h = tripData.hotel;
    expect(h).toHaveProperty('name');
    expect(h).toHaveProperty('address');
    expect(h).toHaveProperty('metro');
    expect(h).toHaveProperty('lat');
    expect(h).toHaveProperty('lng');
  });

  it('has valid coordinates', () => {
    expect(tripData.hotel.lat).toBeGreaterThan(0);
    expect(tripData.hotel.lng).toBeGreaterThan(0);
  });
});

describe('checklist data', () => {
  it('has prep checklist with items', () => {
    expect(tripData.checklist.prep.length).toBeGreaterThan(0);
  });

  it('has packing checklist with items', () => {
    expect(tripData.checklist.packing.length).toBeGreaterThan(0);
  });

  it('all prep items have id and tx', () => {
    tripData.checklist.prep.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('tx');
    });
  });

  it('all packing items have id, tx, and ct (category)', () => {
    tripData.checklist.packing.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('tx');
      expect(item).toHaveProperty('ct');
    });
  });

  it('all checklist IDs are unique', () => {
    const allIds = [
      ...tripData.checklist.prep.map(x => x.id),
      ...tripData.checklist.packing.map(x => x.id)
    ];
    const unique = new Set(allIds);
    expect(unique.size).toBe(allIds.length);
  });
});

describe('contacts', () => {
  it('has emergency contacts', () => {
    expect(tripData.contacts.length).toBeGreaterThan(0);
  });

  it('each contact has name and phone', () => {
    tripData.contacts.forEach(c => {
      expect(c).toHaveProperty('n');
      expect(c).toHaveProperty('p');
    });
  });
});
