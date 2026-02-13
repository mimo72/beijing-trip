import { describe, it, expect, beforeEach } from 'vitest';
import tripData from '../data.js';

// Set up DOM elements required by app.js module initialization
document.body.innerHTML = '<div id="root"></div><div id="toast"></div>';
const { App, Storage } = await import('../app.js');

beforeEach(() => {
  localStorage.clear();
  App.checked = {};
  App.expenses = [];
  App.customChecklist = [];
  App.collapsedCats = {};
  App.tab = 'today';
  App.dayIndex = 0;
  document.body.innerHTML = '<div id="root"></div><div id="toast"></div>';
  App.rootEl = document.getElementById('root');
});

describe('tab switching', () => {
  it('go() updates tab state', () => {
    App.go('trip');
    expect(App.tab).toBe('trip');
  });

  it('go() updates tab to list', () => {
    App.go('list');
    expect(App.tab).toBe('list');
  });

  it('go() updates tab to me', () => {
    App.go('me');
    expect(App.tab).toBe('me');
  });

  it('go() defaults back to today', () => {
    App.go('trip');
    App.go('today');
    expect(App.tab).toBe('today');
  });
});

describe('day selection', () => {
  it('selectDay updates dayIndex', () => {
    App.selectDay(2);
    expect(App.dayIndex).toBe(2);
  });

  it('selectDay(0) sets first day', () => {
    App.selectDay(3);
    App.selectDay(0);
    expect(App.dayIndex).toBe(0);
  });

  it('selectDay(4) sets last day', () => {
    App.selectDay(4);
    expect(App.dayIndex).toBe(4);
  });
});

describe('checklist toggle', () => {
  it('toggle sets item to true when unchecked', () => {
    App.toggle('p1');
    expect(App.checked['p1']).toBe(true);
  });

  it('toggle sets item to false when checked', () => {
    App.checked['p1'] = true;
    App.toggle('p1');
    expect(App.checked['p1']).toBe(false);
  });

  it('toggle persists to storage', () => {
    App.toggle('k5');
    const stored = JSON.parse(localStorage.getItem('bj_ck'));
    expect(stored['k5']).toBe(true);
  });

  it('multiple toggles work correctly', () => {
    App.toggle('p1');
    App.toggle('p2');
    App.toggle('p1'); // untoggle
    expect(App.checked['p1']).toBe(false);
    expect(App.checked['p2']).toBe(true);
  });
});

describe('expense CRUD', () => {
  it('addExpense adds an expense', () => {
    App.addExpense('food', 120);
    expect(App.expenses).toHaveLength(1);
    expect(App.expenses[0].c).toBe('food');
    expect(App.expenses[0].a).toBe(120);
  });

  it('addExpense ignores invalid inputs', () => {
    App.addExpense('', 100);
    App.addExpense('food', 0);
    App.addExpense('food', -10);
    App.addExpense(null, 100);
    expect(App.expenses).toHaveLength(0);
  });

  it('addExpense converts amount to number', () => {
    App.addExpense('food', '200');
    expect(App.expenses[0].a).toBe(200);
  });

  it('addExpense persists to storage', () => {
    App.addExpense('transport', 50);
    const stored = JSON.parse(localStorage.getItem('bj_ex'));
    expect(stored).toHaveLength(1);
    expect(stored[0].c).toBe('transport');
  });

  it('deleteExpense removes an expense', () => {
    App.addExpense('food', 100);
    App.addExpense('transport', 50);
    App.deleteExpense(0);
    expect(App.expenses).toHaveLength(1);
    expect(App.expenses[0].c).toBe('transport');
  });

  it('deleteExpense persists to storage', () => {
    App.addExpense('food', 100);
    App.addExpense('food', 200);
    App.deleteExpense(1);
    const stored = JSON.parse(localStorage.getItem('bj_ex'));
    expect(stored).toHaveLength(1);
  });

  it('spent calculates after adding expenses', () => {
    App.addExpense('food', 100);
    App.addExpense('food', 250);
    App.addExpense('transport', 80);
    expect(App.spent('food')).toBe(350);
    expect(App.spent('transport')).toBe(80);
  });
});

describe('render functions return valid HTML', () => {
  it('renderTrip returns HTML string', () => {
    App.dayIndex = 0;
    const html = App.renderTrip();
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('renderTrip contains day theme', () => {
    App.dayIndex = 0;
    const html = App.renderTrip();
    expect(html).toContain(tripData.days[0].th);
  });

  it('renderList returns HTML string', () => {
    const html = App.renderList();
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('renderList contains checklist sections', () => {
    const html = App.renderList();
    expect(html).toContain('出发准备');
    expect(html).toContain('行李清单');
  });

  it('renderMe returns HTML string', () => {
    const html = App.renderMe();
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('renderMe contains flight and hotel info', () => {
    const html = App.renderMe();
    expect(html).toContain(tripData.flights.outbound.code);
    expect(html).toContain(tripData.hotel.name);
  });

  it('renderTimelineItem returns valid HTML for each type', () => {
    const types = ['flight', 'transport', 'attraction', 'food', 'explore', 'rest'];
    types.forEach(type => {
      const item = { t: '10:00', e: '11:00', n: 'Test', p: type, dt: 'Details' };
      const html = App.renderTimelineItem(item, '');
      expect(typeof html).toBe('string');
      expect(html).toContain('Test');
    });
  });

  it('renderTimelineItem handles items with actions', () => {
    const item = {
      t: '10:00', e: '11:00', n: 'With actions', p: 'attraction', dt: 'Some detail',
      ac: [{ l: 'Navigate', p: 'nav', n: 'Place', la: 39.9, lo: 116.4 }]
    };
    const html = App.renderTimelineItem(item, '');
    expect(html).toContain('Navigate');
  });

  it('renderTimelineItem handles confidence status', () => {
    const item = { t: '10:00', n: 'Verified', p: 'attraction', cf: 'v' };
    const html = App.renderTimelineItem(item, '');
    expect(html).toContain('已验证');
  });

  it('renderFlightCard returns HTML with flight details', () => {
    const html = App.renderFlightCard(tripData.flights.outbound, '去程');
    expect(html).toContain('MU5105');
    expect(html).toContain('去程');
    expect(html).toContain('10:00');
    expect(html).toContain('12:15');
  });
});

describe('renderCountdown', () => {
  it('returns HTML with countdown info', () => {
    const html = App.renderCountdown();
    expect(typeof html).toBe('string');
    expect(html).toContain('天后出发');
  });
});

describe('renderWeatherWidget', () => {
  it('returns HTML with weather cards for all days', () => {
    const html = App.renderWeatherWidget();
    expect(html).toContain('Day1');
    expect(html).toContain('Day5');
  });
});

describe('renderTripStats', () => {
  it('returns HTML with statistics', () => {
    const html = App.renderTripStats();
    expect(html).toContain('总天数');
    expect(html).toContain('景点');
    expect(html).toContain('美食');
  });
});

describe('renderBudgetSection', () => {
  it('returns HTML with budget info', () => {
    const html = App.renderBudgetSection();
    expect(html).toContain('预算追踪');
    expect(html).toContain('总预算');
    expect(html).toContain(String(tripData.budget.total));
  });
});

describe('custom checklist items', () => {
  it('addCustomCheckItem does nothing without input element', () => {
    App.addCustomCheckItem();
    expect(App.customChecklist).toHaveLength(0);
  });

  it('deleteCustomCheckItem removes the item', () => {
    App.customChecklist = [{ id: 'cu1', tx: 'item1' }, { id: 'cu2', tx: 'item2' }];
    App.checked['cu1'] = true;
    App.deleteCustomCheckItem('cu1');
    expect(App.customChecklist).toHaveLength(1);
    expect(App.customChecklist[0].id).toBe('cu2');
    expect(App.checked['cu1']).toBeUndefined();
  });
});

describe('toggleCategory', () => {
  it('toggles collapsed state', () => {
    expect(App.collapsedCats['prep']).toBeFalsy();
    App.toggleCategory('prep');
    expect(App.collapsedCats['prep']).toBe(true);
    App.toggleCategory('prep');
    expect(App.collapsedCats['prep']).toBe(false);
  });
});
