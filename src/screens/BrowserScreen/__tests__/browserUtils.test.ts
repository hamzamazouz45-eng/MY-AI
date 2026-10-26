import {
  buildSystemPrompt,
  computeBudget,
  createTab,
  DEFAULT_SEARCH_URL,
  isContextFullError,
  isInternalScheme,
  isWebUrl,
  nextActiveAfterClose,
  parsePageMessage,
  tabLabel,
  toUrl,
  trimHistory,
  PROMPT_OVERHEAD_TOKENS,
  CHARS_PER_TOKEN,
} from '../browserUtils';
import {getBrowserStrings} from '../strings';

describe('toUrl', () => {
  it('returns empty for blank input', () => {
    expect(toUrl('')).toBe('');
    expect(toUrl('   ')).toBe('');
  });

  it('keeps full http(s) URLs as they are', () => {
    expect(toUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1');
    expect(toUrl('HTTP://Example.com')).toBe('HTTP://Example.com');
  });

  it('adds https to bare hosts', () => {
    expect(toUrl('example.com')).toBe('https://example.com');
    expect(toUrl('sub.example.org/path?q=1')).toBe(
      'https://sub.example.org/path?q=1',
    );
  });

  it('uses http for localhost and IP addresses', () => {
    expect(toUrl('localhost:3000')).toBe('http://localhost:3000');
    expect(toUrl('192.168.1.10:11434/v1')).toBe(
      'http://192.168.1.10:11434/v1',
    );
  });

  it('searches for anything else', () => {
    expect(toUrl('how to cook rice')).toBe(
      DEFAULT_SEARCH_URL.replace('%s', 'how%20to%20cook%20rice'),
    );
    expect(toUrl('مرحبا بالعالم', 'https://s.example/?q=%s')).toBe(
      `https://s.example/?q=${encodeURIComponent('مرحبا بالعالم')}`,
    );
  });

  it('falls back to the default engine if the template has no %s', () => {
    expect(toUrl('cats', 'https://bad.example/')).toBe(
      DEFAULT_SEARCH_URL.replace('%s', 'cats'),
    );
  });
});

describe('scheme helpers', () => {
  it('recognises web and internal schemes', () => {
    expect(isWebUrl('https://a.b')).toBe(true);
    expect(isWebUrl('about:blank')).toBe(false);
    expect(isInternalScheme('about:blank')).toBe(true);
    expect(isInternalScheme('https://a.b')).toBe(true);
    expect(isInternalScheme('mailto:a@b.c')).toBe(false);
    expect(isInternalScheme('intent://x#Intent;end')).toBe(false);
  });
});

describe('parsePageMessage', () => {
  it('parses a valid page message', () => {
    const page = parsePageMessage(
      JSON.stringify({
        type: 'page',
        title: 'T',
        url: 'https://a.b',
        text: 'body',
        selection: 'sel',
      }),
    );
    expect(page).toEqual({
      title: 'T',
      url: 'https://a.b',
      text: 'body',
      selection: 'sel',
    });
  });

  it('rejects errors, other types and garbage', () => {
    expect(parsePageMessage('{"type":"page","error":"x"}')).toBeNull();
    expect(parsePageMessage('{"type":"other"}')).toBeNull();
    expect(parsePageMessage('not json')).toBeNull();
  });
});

describe('buildSystemPrompt', () => {
  const page = {
    title: 'Title',
    url: 'https://a.b',
    text: 'x'.repeat(50),
    selection: ' chosen ',
  };

  it('returns the base prompt without a page', () => {
    expect(buildSystemPrompt('base', null)).toBe('base');
  });

  it('includes page details, selection and marks content untrusted', () => {
    const out = buildSystemPrompt('base', page, 1000);
    expect(out).toContain('Title: Title');
    expect(out).toContain('URL: https://a.b');
    expect(out).toContain('[Text selected by the user]\nchosen');
    expect(out).toContain('untrusted data');
    expect(out).not.toContain('(truncated)');
  });

  it('truncates long text and says so', () => {
    const out = buildSystemPrompt('base', page, 10);
    expect(out).toContain('(truncated)');
    expect(out).toContain('x'.repeat(10));
    expect(out).not.toContain('x'.repeat(11));
  });
});

describe('tab helpers', () => {
  it('creates blank and loading tabs', () => {
    expect(createTab(1).loading).toBe(false);
    expect(createTab(2, 'https://a.b')).toMatchObject({
      uri: 'https://a.b',
      url: 'https://a.b',
      loading: true,
    });
  });

  it('chooses the next active tab after closing', () => {
    const tabs = [createTab(1), createTab(2), createTab(3)];
    expect(nextActiveAfterClose(tabs, 2, 2)).toBe(3); // neighbour to the right
    expect(nextActiveAfterClose(tabs, 3, 3)).toBe(2); // last: go left
    expect(nextActiveAfterClose(tabs, 1, 3)).toBe(3); // active unchanged
    expect(nextActiveAfterClose([createTab(1)], 1, 1)).toBe(-1);
  });

  it('labels tabs by title, then address, then fallback', () => {
    expect(tabLabel({...createTab(1), title: 'Hello'}, 'New')).toBe('Hello');
    expect(tabLabel(createTab(1, 'https://a.b/x'), 'New')).toBe('a.b/x');
    expect(tabLabel(createTab(1), 'New')).toBe('New');
  });
});

describe('getBrowserStrings', () => {
  it('serves Arabic for ar and English otherwise', () => {
    expect(getBrowserStrings('ar').title).toBe('المتصفح');
    expect(getBrowserStrings('fr').title).toBe('Browser');
    expect(getBrowserStrings('en').chips).toHaveLength(4);
  });
});

describe('computeBudget', () => {
  it.each([1024, 2048, 4096, 8192, 32768])(
    'fits everything inside a %i-token context',
    n => {
      const b = computeBudget(n);
      const total =
        b.nPredict +
        PROMPT_OVERHEAD_TOKENS +
        (b.pageChars + b.historyChars) / CHARS_PER_TOKEN;
      expect(total).toBeLessThanOrEqual(Math.max(n, 1200));
      expect(b.nPredict).toBeGreaterThanOrEqual(128);
      expect(b.nPredict).toBeLessThanOrEqual(1024);
    },
  );

  it('falls back to 2048 for invalid sizes', () => {
    expect(computeBudget(NaN)).toEqual(computeBudget(2048));
    expect(computeBudget(0)).toEqual(computeBudget(2048));
  });

  it('gives bigger contexts more page text', () => {
    expect(computeBudget(8192).pageChars).toBeGreaterThan(
      computeBudget(2048).pageChars,
    );
  });
});

describe('trimHistory', () => {
  const msgs = [
    {role: 'user', content: 'a'.repeat(10)},
    {role: 'assistant', content: 'b'.repeat(10)},
    {role: 'user', content: 'c'.repeat(10)},
    {role: 'assistant', content: 'd'.repeat(10)},
  ];

  it('keeps everything when it fits', () => {
    expect(trimHistory(msgs, 100)).toHaveLength(4);
  });

  it('drops the oldest turns and never starts on an assistant turn', () => {
    const out = trimHistory(msgs, 30); // fits d, c, b -> starts on b -> drop b
    expect(out.map(m => m.content[0])).toEqual(['c', 'd']);
  });

  it('can return nothing', () => {
    expect(trimHistory(msgs, 5)).toEqual([]);
  });
});

describe('isContextFullError', () => {
  it('recognises the engine message', () => {
    expect(isContextFullError('Context is full')).toBe(true);
    expect(isContextFullError('prompt exceeds context size')).toBe(true);
    expect(isContextFullError('network down')).toBe(false);
  });
});
