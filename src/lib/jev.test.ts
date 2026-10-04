import { afterEach, describe, expect, it, vi } from 'vitest';
import { askOpenRouter } from './jev';

afterEach(() => vi.unstubAllGlobals());

describe('askOpenRouter', () => {
  it('sends the native decision request and returns its answers', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ answers: { action: { type: 'choice', choice: 'grind', confidence: 1, probabilities: { grind: 1 } } } }), {
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetch);

    await expect(askOpenRouter({ order: 'latte' }, { action: { type: 'choice' } })).resolves.toMatchObject({
      action: { choice: 'grind' },
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/alpha/decisions',
      expect.objectContaining({
        body: JSON.stringify({ model: '~typesafe/jev-latest', state: { order: 'latte' }, questions: { action: { type: 'choice' } } }),
      }),
    );
  });

  it('rejects an unsuccessful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'no credits' } }), { status: 402 })));
    await expect(askOpenRouter({}, {})).rejects.toThrow('no credits');
  });
});
