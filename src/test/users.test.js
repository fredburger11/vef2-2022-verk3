/* eslint-disable no-underscore-dangle */
import { describe, expect, test } from '@jest/globals';
import { fetchAndParse } from './utils.js';

describe('events', () => {
  test('GET /events do exists', async () => {

    const { result } = await fetchAndParse('/events');

    expect(result.limit).toBe(10);
    expect(result.offset).toBe(0);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(result._links).toBeDefined();
    expect(result._links.self).toBeDefined();
  });

  test('GET /events/1 does exists', async () => {
    const { result } = await fetchAndParse('/events/1');

    expect(result.id).toBe(1);
    expect(result.name).toBeDefined();

  });
});

