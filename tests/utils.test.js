import { describe, it, expect } from 'vitest';

// Set up DOM elements required by app.js module initialization
document.body.innerHTML = '<div id="root"></div><div id="toast"></div>';
const { App } = await import('../app.js');

describe('parseHours', () => {
  it('parses "00:00" to 0', () => {
    expect(App.parseHours('00:00')).toBe(0);
  });

  it('parses "12:00" to 12', () => {
    expect(App.parseHours('12:00')).toBe(12);
  });

  it('parses "14:30" to 14.5', () => {
    expect(App.parseHours('14:30')).toBe(14.5);
  });

  it('parses "06:15" to 6.25', () => {
    expect(App.parseHours('06:15')).toBe(6.25);
  });

  it('parses "23:59" correctly', () => {
    expect(App.parseHours('23:59')).toBeCloseTo(23 + 59 / 60, 5);
  });

  it('parses "05:30" to 5.5', () => {
    expect(App.parseHours('05:30')).toBe(5.5);
  });
});

describe('daysLeft', () => {
  it('returns a number', () => {
    const result = App.daysLeft();
    expect(typeof result).toBe('number');
  });
});

describe('todayDate', () => {
  it('returns a YYYY-MM-DD string', () => {
    const d = App.todayDate();
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('checkedCount', () => {
  it('returns 0 when nothing is checked', () => {
    App.checked = {};
    expect(App.checkedCount('p')).toBe(0);
  });

  it('counts only matching prefix', () => {
    App.checked = { p1: true, p2: true, k1: true, p3: false };
    expect(App.checkedCount('p')).toBe(2);
  });

  it('does not count false values', () => {
    App.checked = { p1: false, p2: false };
    expect(App.checkedCount('p')).toBe(0);
  });

  it('counts "k" prefix separately', () => {
    App.checked = { k1: true, k2: true, k3: true, p1: true };
    expect(App.checkedCount('k')).toBe(3);
  });
});

describe('getWeatherIcon', () => {
  it('returns wind icon for wind descriptions', () => {
    expect(App.getWeatherIcon('风大注意防风')).toBe('\uD83D\uDCA8');
    expect(App.getWeatherIcon('风力5-6级')).toBe('\uD83D\uDCA8');
  });

  it('returns snowflake for dry-cold', () => {
    expect(App.getWeatherIcon('干冷注意保暖')).toBe('\u2744\uFE0F');
  });

  it('returns house for indoor', () => {
    expect(App.getWeatherIcon('室内为主')).toBe('\uD83C\uDFE0');
  });

  it('returns sun for easy/relaxed', () => {
    expect(App.getWeatherIcon('轻松为主')).toBe('\u2600\uFE0F');
  });

  it('returns default icon for unknown', () => {
    expect(App.getWeatherIcon('something else')).toBe('\uD83C\uDF24\uFE0F');
  });
});

describe('getWeatherTemp', () => {
  it('extracts temperature range', () => {
    expect(App.getWeatherTemp('5°C/-4°C 干冷注意保暖')).toBe('5°/-4°');
  });

  it('extracts negative high temp', () => {
    expect(App.getWeatherTemp('4°C/-6°C 山顶风力5-6级')).toBe('4°/-6°');
  });

  it('falls back to first word if no match', () => {
    expect(App.getWeatherTemp('unknown weather')).toBe('unknown');
  });
});

describe('getWeatherTip', () => {
  it('returns tip for keep warm', () => {
    expect(App.getWeatherTip('5°C/-4°C 干冷注意保暖')).toBe('注意保暖');
  });

  it('returns tip for wind protection', () => {
    expect(App.getWeatherTip('6°C/-3°C 故宫内风大注意防风')).toBe('注意防风');
  });

  it('returns tip for indoor recovery', () => {
    expect(App.getWeatherTip('5°C/-4°C 室内为主 恢复日')).toBe('室内恢复');
  });

  it('returns tip for relaxed', () => {
    expect(App.getWeatherTip('6°C/-3°C 轻松为主')).toBe('轻松出行');
  });

  it('returns empty string for unknown', () => {
    expect(App.getWeatherTip('some weather')).toBe('');
  });
});

describe('spent', () => {
  it('returns 0 when no expenses', () => {
    App.expenses = [];
    expect(App.spent('food')).toBe(0);
  });

  it('sums expenses for a given category', () => {
    App.expenses = [
      { c: 'food', a: 100, d: new Date().toISOString() },
      { c: 'food', a: 200, d: new Date().toISOString() },
      { c: 'transport', a: 50, d: new Date().toISOString() }
    ];
    expect(App.spent('food')).toBe(300);
    expect(App.spent('transport')).toBe(50);
  });

  it('returns 0 for category with no expenses', () => {
    App.expenses = [
      { c: 'food', a: 100, d: new Date().toISOString() }
    ];
    expect(App.spent('tickets')).toBe(0);
  });
});
