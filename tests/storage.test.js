import { describe, it, expect, beforeEach } from 'vitest';

// We need to set up the DOM before importing app.js since it calls document.getElementById('root')
// at module level. We import Storage from app.js which requires DOM.
beforeEach(() => {
  localStorage.clear();
});

// Import Storage after jsdom environment is set up
// app.js expects a #root element to exist
document.body.innerHTML = '<div id="root"></div><div id="toast"></div>';
const { Storage } = await import('../app.js');

describe('Storage.get', () => {
  it('returns default value when key does not exist', () => {
    const result = Storage.get('nonexistent', 'default');
    expect(result).toBe('default');
  });

  it('returns default value when key does not exist (object default)', () => {
    const result = Storage.get('nonexistent', {});
    expect(result).toEqual({});
  });

  it('returns default value when key does not exist (array default)', () => {
    const result = Storage.get('nonexistent', []);
    expect(result).toEqual([]);
  });

  it('returns parsed JSON when key exists', () => {
    localStorage.setItem('bj_test', JSON.stringify({ foo: 'bar' }));
    const result = Storage.get('test', {});
    expect(result).toEqual({ foo: 'bar' });
  });

  it('returns parsed array when key exists', () => {
    localStorage.setItem('bj_arr', JSON.stringify([1, 2, 3]));
    const result = Storage.get('arr', []);
    expect(result).toEqual([1, 2, 3]);
  });

  it('returns parsed string when key exists', () => {
    localStorage.setItem('bj_str', JSON.stringify('hello'));
    const result = Storage.get('str', '');
    expect(result).toBe('hello');
  });

  it('handles malformed JSON gracefully by returning default', () => {
    localStorage.setItem('bj_bad', '{not valid json');
    const result = Storage.get('bad', 'fallback');
    expect(result).toBe('fallback');
  });

  it('returns default for null stored value (JSON.parse("null") is null, which is falsy)', () => {
    localStorage.setItem('bj_nul', 'null');
    const result = Storage.get('nul', 'default');
    // JSON.parse('null') returns null, and null || defaultValue returns defaultValue
    expect(result).toBe('default');
  });
});

describe('Storage.set', () => {
  it('stores stringified JSON object', () => {
    Storage.set('obj', { a: 1, b: 2 });
    const raw = localStorage.getItem('bj_obj');
    expect(JSON.parse(raw)).toEqual({ a: 1, b: 2 });
  });

  it('stores stringified JSON array', () => {
    Storage.set('list', [1, 2, 3]);
    const raw = localStorage.getItem('bj_list');
    expect(JSON.parse(raw)).toEqual([1, 2, 3]);
  });

  it('stores stringified primitive', () => {
    Storage.set('num', 42);
    const raw = localStorage.getItem('bj_num');
    expect(JSON.parse(raw)).toBe(42);
  });

  it('overwrites existing value', () => {
    Storage.set('key', 'first');
    Storage.set('key', 'second');
    const raw = localStorage.getItem('bj_key');
    expect(JSON.parse(raw)).toBe('second');
  });
});

describe('Storage round-trip', () => {
  it('set then get returns the same value', () => {
    const data = { checked: { p1: true, p2: false }, items: [1, 2] };
    Storage.set('roundtrip', data);
    const result = Storage.get('roundtrip', {});
    expect(result).toEqual(data);
  });
});
