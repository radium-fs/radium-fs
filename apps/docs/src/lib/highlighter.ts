import {
  createHighlighterCore,
  type HighlighterCore,
} from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';

let highlighter: HighlighterCore | null = null;
let initPromise: Promise<HighlighterCore> | null = null;

export async function getHighlighter(): Promise<HighlighterCore> {
  if (highlighter) return highlighter;
  if (initPromise) return initPromise;

  initPromise = createHighlighterCore({
    themes: [
      import('shiki/themes/vitesse-dark.mjs'),
      import('shiki/themes/vitesse-light.mjs'),
    ],
    langs: [
      import('shiki/langs/typescript.mjs'),
      import('shiki/langs/json.mjs'),
      import('shiki/langs/javascript.mjs'),
    ],
    engine: createOnigurumaEngine(import('shiki/wasm')),
  });

  highlighter = await initPromise;
  return highlighter;
}

export function highlight(code: string, lang: string): string {
  if (!highlighter) return escapeHtml(code);

  const normalizedLang = lang === 'ts' ? 'typescript' : lang === 'js' ? 'javascript' : lang;
  const supported = ['typescript', 'json', 'javascript'];
  const useLang = supported.includes(normalizedLang) ? normalizedLang : 'text';

  try {
    return highlighter.codeToHtml(code, {
      lang: useLang,
      themes: {
        light: 'vitesse-light',
        dark: 'vitesse-dark',
      },
      defaultColor: false,
    });
  } catch {
    return `<pre><code>${escapeHtml(code)}</code></pre>`;
  }
}

export function langFromPath(path: string): string {
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.jsx')) return 'javascript';
  if (path.endsWith('.json')) return 'json';
  return 'text';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
