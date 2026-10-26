import {cleanPageText} from './browserUtils';
import {
  buildSearchUrl,
  htmlToText,
  parseDuckDuckGoHtml,
  SearchResult,
  WebSource,
} from './webSearch';

const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36';
const SEARCH_TIMEOUT_MS = 10000;
const PAGE_TIMEOUT_MS = 8000;
const MAX_HTML_CHARS = 400000;

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, {once: true});
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.8,ar;q=0.6',
      },
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function searchWeb(
  query: string,
  max: number,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const res = await fetchWithTimeout(
    buildSearchUrl(query),
    SEARCH_TIMEOUT_MS,
    signal,
  );
  if (!res.ok) {
    throw new Error(`Search failed (HTTP ${res.status})`);
  }
  return parseDuckDuckGoHtml(await res.text(), max);
}

/** Readable text of a page, or '' if it cannot be fetched or is not HTML. */
export async function readPage(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const res = await fetchWithTimeout(url, PAGE_TIMEOUT_MS, signal);
    if (!res.ok) {
      return '';
    }
    const type = res.headers.get('content-type') ?? '';
    if (!/text\/html|text\/plain|xhtml/i.test(type)) {
      return '';
    }
    const html = (await res.text()).slice(0, MAX_HTML_CHARS);
    return cleanPageText(htmlToText(html));
  } catch {
    return '';
  }
}

export interface SearchAndReadOptions {
  count: number;
  signal?: AbortSignal;
  onSearching?: () => void;
  onReading?: (found: number) => void;
}

/** Searches, then reads the top results in parallel. */
export async function searchAndRead(
  query: string,
  options: SearchAndReadOptions,
): Promise<WebSource[]> {
  options.onSearching?.();
  const results = await searchWeb(query, options.count, options.signal);
  if (results.length === 0) {
    return [];
  }
  options.onReading?.(results.length);
  const texts = await Promise.all(
    results.map(r => readPage(r.url, options.signal)),
  );
  return results.map((r, i) => ({...r, text: texts[i]}));
}
