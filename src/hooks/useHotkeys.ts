import { useEffect, useEffectEvent } from 'react';

export type Hotkeys = Record<string, (event: KeyboardEvent) => void>;

const TEXT_INPUTS = new Set(['text', 'search', 'number', 'email', 'url', 'password', 'tel']);

/** True when the key should go to the focused control instead of the page shortcuts. */
function belongsToControl(event: KeyboardEvent): boolean {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target instanceof HTMLInputElement) {
    if (TEXT_INPUTS.has(target.type)) return true;
    // Radios and checkboxes keep their native arrow and space behavior.
    return event.key.startsWith('Arrow') || event.key === ' ';
  }
  return false;
}

/**
 * Page-level shortcuts. Keys are matched by `event.key` (letters lower-cased), e.g. "ArrowLeft", "a", "?".
 * Ignored with Ctrl/Meta/Alt, while typing, and while a modal dialog is open.
 */
export function useHotkeys(hotkeys: Hotkeys, enabled = true): void {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
    if (document.querySelector('dialog[open]')) return;
    if (belongsToControl(event)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const handler = hotkeys[key];
    if (!handler) return;
    event.preventDefault();
    handler(event);
  });

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
