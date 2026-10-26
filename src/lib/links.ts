import type { Lang } from '../content/schema';

const ALLOWED_HOSTS = new Set(['learn.microsoft.com']);

/** Returns a safe, localized Learn URL, or undefined when the URL is not an https link to an allowed host. */
export function learnUrl(raw: string, lang: Lang): string | undefined {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname)) return undefined;
  if (lang === 'pt') url.pathname = url.pathname.replace(/^\/en-us\//, '/pt-br/');
  return url.toString();
}
