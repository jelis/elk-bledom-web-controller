/**
 * Minimal internationalization: German and English, picked from the browser language.
 *
 * - `t('key', { name: 'x' })` returns the text; `{name}` placeholders are replaced.
 * - Static markup is translated by `applyTranslations()` from these attributes:
 *     data-i18n="key"          sets the text content
 *     data-i18n-aria="key"     sets aria-label
 *     data-i18n-content="key"  sets content (for <meta>)
 * - Missing keys fall back to English, then to the key itself.
 *
 * To add a language: create `locales/xx.js` with the same keys as `en.js`, register it below.
 * `test/i18n.test.js` checks that all languages have identical keys and placeholders.
 */
import de from './locales/de.js';
import en from './locales/en.js';

export const LOCALES = { de, en };
export const FALLBACK_LANGUAGE = 'en';

/**
 * First supported language in the browser's preference list, else English.
 * @param {readonly string[]} [languages] e.g. `navigator.languages`
 * @returns {string}
 */
export function detectLanguage(languages = globalThis.navigator?.languages ?? [globalThis.navigator?.language]) {
  for (const tag of languages ?? []) {
    const base = String(tag ?? '')
      .toLowerCase()
      .split('-')[0];
    if (Object.hasOwn(LOCALES, base)) return base;
  }
  return FALLBACK_LANGUAGE;
}

let language = detectLanguage();

export const getLanguage = () => language;

/** @param {string} code a key of LOCALES; unknown codes fall back to English */
export function setLanguage(code) {
  language = Object.hasOwn(LOCALES, code) ? code : FALLBACK_LANGUAGE;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [vars] values for `{placeholder}`s
 */
export function t(key, vars = {}) {
  const text = LOCALES[language][key] ?? LOCALES[FALLBACK_LANGUAGE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => String(vars[name] ?? match));
}

/** Translates the static markup and sets `<html lang>` and the page title. @param {ParentNode} [root] */
export function applyTranslations(root = document) {
  document.documentElement.lang = language;
  document.title = t('doc.title');
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  root.querySelectorAll('[data-i18n-content]').forEach((el) => el.setAttribute('content', t(el.dataset.i18nContent)));
}
