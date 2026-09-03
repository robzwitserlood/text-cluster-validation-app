import { describe, it, expect } from 'vitest';
import { makeSeed, seededShuffle } from '../../server/src/lib/shuffle';

/** T012 (US1): deterministic seeded shuffle — stable per participant+item, varies across participants (FR-003, R6). */
describe('seededShuffle', () => {
  const words = ['soil', 'nitrogen', 'livestock', 'deposition', 'agriculture', 'keyboard', 'tractor', 'compost'];

  it('produces a stable order for the same participant+item across calls', () => {
    const seed = makeSeed('participant-A', 'w-014');
    const first = seededShuffle(words, seed);
    const second = seededShuffle(words, seed);
    expect(second).toEqual(first);
  });

  it('keeps the same seed stable for the same participant+item', () => {
    expect(makeSeed('participant-A', 'w-014')).toBe(makeSeed('participant-A', 'w-014'));
    expect(makeSeed('participant-A', 'w-014')).not.toBe(makeSeed('participant-B', 'w-014'));
  });

  it('returns a permutation of the input without mutating it', () => {
    const input = [...words];
    const result = seededShuffle(input, makeSeed('p', 'i'));
    expect([...result].sort()).toEqual([...words].sort());
    expect(input).toEqual(words); // not mutated
  });

  it('varies the intruder position across participants (placement does not reveal the answer)', () => {
    const positions = new Set<number>();
    for (let i = 0; i < 16; i++) {
      const order = seededShuffle(words, makeSeed(`participant-${i}`, 'w-014'));
      positions.add(order.indexOf('keyboard'));
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});
