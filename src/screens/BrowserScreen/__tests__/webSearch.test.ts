import {cleanPageText} from '../browserUtils';
import {
  buildSearchUrl,
  buildWebSystemPrompt,
  decodeEntities,
  formatSources,
  htmlToText,
  parseDuckDuckGoHtml,
  resolveResultLink,
  stripTags,
} from '../webSearch';

// Mirrors the structure of html.duckduckgo.com/html/ result pages.
const SAMPLE = `
<div class="results">
  <div class="result results_links result--ad">
    <h2 class="result__title">
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/y.js?ad_domain=shop.example&amp;u3=x">Buy movies now</a>
    </h2>
    <a class="result__snippet" href="//duckduckgo.com/y.js?x">Sponsored text</a>
  </div>
  <div class="result results_links results_links_deep web-result">
    <h2 class="result__title">
      <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FRush_Hour_(1998_film)&amp;rut=abc123">Rush Hour (1998 film) - <b>Wikipedia</b></a>
    </h2>
    <a class="result__url" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FRush_Hour_(1998_film)">en.wikipedia.org/wiki/Rush_Hour</a>
    <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FRush_Hour_(1998_film)&amp;rut=abc123">Rush Hour is a <b>1998</b> action comedy starring Jackie Chan &amp; Chris Tucker.</a>
  </div>
  <div class="result results_links results_links_deep web-result">
    <h2 class="result__title">
      <a class="result__a" rel="nofollow" href="https://www.imdb.com/title/tt0120812/">Rush Hour (1998) - IMDb</a>
    </h2>
    <a class="result__snippet" href="https://www.imdb.com/title/tt0120812/">Directed by Brett Ratner.</a>
  </div>
  <div class="result results_links results_links_deep web-result">
    <h2 class="result__title">
      <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fen.wikipedia.org%2Fwiki%2FRush_Hour_(1998_film)">Duplicate of the first result</a>
    </h2>
  </div>
</div>`;

describe('resolveResultLink', () => {
  it('unwraps DuckDuckGo redirects', () => {
    expect(
      resolveResultLink(
        '//duckduckgo.com/l/?uddg=https%3A%2F%2Fa.com%2Fx%3Fy%3D1&amp;rut=z',
      ),
    ).toBe('https://a.com/x?y=1');
  });

  it('keeps direct links and rejects ads and non-web links', () => {
    expect(resolveResultLink('https://a.com/p')).toBe('https://a.com/p');
    expect(resolveResultLink('//duckduckgo.com/y.js?ad=1')).toBeNull();
    expect(resolveResultLink('javascript:alert(1)')).toBeNull();
    expect(resolveResultLink('//duckduckgo.com/l/?rut=only')).toBeNull();
    expect(resolveResultLink('https://duckduckgo.com/about')).toBeNull();
  });
});

describe('parseDuckDuckGoHtml', () => {
  it('extracts title, url and snippet; skips ads and duplicates', () => {
    const results = parseDuckDuckGoHtml(SAMPLE, 5);
    expect(results).toEqual([
      {
        title: 'Rush Hour (1998 film) - Wikipedia',
        url: 'https://en.wikipedia.org/wiki/Rush_Hour_(1998_film)',
        snippet:
          'Rush Hour is a 1998 action comedy starring Jackie Chan & Chris Tucker.',
      },
      {
        title: 'Rush Hour (1998) - IMDb',
        url: 'https://www.imdb.com/title/tt0120812/',
        snippet: 'Directed by Brett Ratner.',
      },
    ]);
  });

  it('respects the max and handles empty or unrelated html', () => {
    expect(parseDuckDuckGoHtml(SAMPLE, 1)).toHaveLength(1);
    expect(parseDuckDuckGoHtml('', 5)).toEqual([]);
    expect(parseDuckDuckGoHtml('<html><body>captcha</body></html>')).toEqual(
      [],
    );
  });
});

describe('text helpers', () => {
  it('decodes entities', () => {
    expect(decodeEntities('a &amp; b &lt;c&gt; &#65;&#x42; &unknown;')).toBe(
      'a & b <c> AB &unknown;',
    );
  });

  it('strips tags', () => {
    expect(stripTags('<b>Hello</b>   <i>world</i>&nbsp;!')).toBe('Hello world !');
  });

  it('extracts readable text and drops scripts, styles and chrome', () => {
    const html = `<html><head><title>T</title><style>p{color:red}</style></head>
      <body><nav>Menu</nav><script>var x = 1;</script>
      <h1>Title here</h1><p>First   paragraph &amp; more.</p><!-- hidden -->
      <ul><li>One</li><li>Two</li></ul><footer>Copyright</footer></body></html>`;
    const lines = cleanPageText(htmlToText(html)).split('\n');
    expect(lines).toEqual([
      'Title here',
      'First paragraph & more.',
      'One',
      'Two',
    ]);
  });
});

describe('prompt building', () => {
  const sources = [
    {title: 'A', url: 'https://a.com', snippet: 'snip a', text: 'x'.repeat(2000)},
    {title: 'B', url: 'https://b.com', snippet: 'snip b', text: ''},
  ];

  it('numbers sources, limits each, falls back to the snippet', () => {
    const out = buildWebSystemPrompt('base', sources, 1000);
    expect(out).toContain('[1] A\nURL: https://a.com');
    expect(out).toContain('[2] B\nURL: https://b.com\nsnip b');
    expect(out).toContain('untrusted data');
    expect(out).not.toContain('x'.repeat(501));
  });

  it('formats a deterministic sources list', () => {
    expect(formatSources(sources, 'المصادر')).toBe(
      '\n\nالمصادر:\n[1] A\nhttps://a.com\n[2] B\nhttps://b.com',
    );
    expect(formatSources([])).toBe('');
  });

  it('builds an encoded search url', () => {
    expect(buildSearchUrl(' rush hour & مرحبا ')).toBe(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(
        'rush hour & مرحبا',
      )}`,
    );
  });
});
