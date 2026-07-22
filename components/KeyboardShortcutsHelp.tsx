import React, { createContext, useContext, useEffect, useState } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { SafeModal } from './form-ui/SafeModal';
import { ar } from '../utils/arabicTranslations';

interface KeyboardShortcut {
  keyLabel: string;
  description: string;
}

interface KeyboardShortcutsHelpContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const KeyboardShortcutsHelpContext = createContext<KeyboardShortcutsHelpContextValue | null>(null);

function useKeyboardShortcutsHelpContext() {
  const ctx = useContext(KeyboardShortcutsHelpContext);
  if (!ctx) {
    throw new Error('useKeyboardShortcutsHelpContext must be used within KeyboardShortcutsHelpProvider');
  }
  return ctx;
}

function isTypingElement(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (element as HTMLElement).isContentEditable
  );
}

/**
 * Returns true if the pressed key is the help shortcut.
 *
 * We accept "?" (with or without Shift, because many layouts require
 * Shift to produce it). We deliberately ignore Ctrl/Alt/Meta so the
 * shortcut does not collide with browser/OS shortcuts.
 */
function isHelpShortcut(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return event.key === '?' || (event.key === '/' && event.shiftKey);
}

const SHORTCUTS: KeyboardShortcut[] = [
  {
    keyLabel: ar.ui.formProgress.jumpToNextIncompleteShortcut,
    description: ar.ui.formProgress.jumpToNextIncomplete,
  },
  {
    keyLabel: '?',
    description: ar.common.keyboardShortcutsHint,
  },
];

/**
 * Global keyboard shortcuts help modal.
 *
 * Pressing the "?" key anywhere outside an input/textarea/select/contenteditable
 * element opens (or closes) the help overlay. Use the exported trigger button
 * for discoverability on both desktop and mobile.
 */
export const KeyboardShortcutsHelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  return (
    <KeyboardShortcutsHelpContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
      <KeyboardShortcutsHelpModal />
    </KeyboardShortcutsHelpContext.Provider>
  );
};

/**
 * Button that opens the keyboard shortcuts help overlay.
 */
export const KeyboardShortcutsHelpButton: React.FC<{ className?: string }> = ({ className }) => {
  const { isOpen, open } = useKeyboardShortcutsHelpContext();

  return (
    <button
      type="button"
      onClick={open}
      className={className}
      aria-label={ar.common.keyboardShortcuts}
      title={ar.common.keyboardShortcuts}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      <QuestionMarkCircleIcon className="w-6 h-6" />
    </button>
  );
};

/**
 * Modal + global "?" listener. This component is rendered once inside the
 * provider so the shortcut works from anywhere in the app.
 */
const KeyboardShortcutsHelpModal: React.FC = () => {
  const { isOpen, open, close } = useKeyboardShortcutsHelpContext();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isHelpShortcut(event)) return;

      if (isTypingElement(document.activeElement)) return;

      event.preventDefault();
      open();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <SafeModal
      isOpen={isOpen}
      onClose={close}
      type="info"
      size="md"
      title={ar.common.keyboardShortcuts}
      closeOnBackdropClick
    >
      <div className="space-y-4">
        <p className="text-sm text-latte">{ar.common.keyboardShortcutsDescription}</p>

        <ul className="divide-y divide-hairline dark:divide-hairline rounded-lg border border-hairline dark:border-hairline overflow-hidden">
          {SHORTCUTS.map((shortcut, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-4 px-4 py-3 bg-cream dark:bg-espresso-light"
            >
              <span className="text-sm text-latte">{shortcut.description}</span>
              <kbd className="shrink-0 px-2 py-1 text-xs font-mono font-bold bg-cream-2 dark:bg-espresso border border-hairline dark:border-hairline rounded">
                {shortcut.keyLabel}
              </kbd>
            </li>
          ))}
        </ul>

        <p className="text-xs text-latte/70">
          {ar.ui.formProgress.shortcutTypingGuard}
        </p>
      </div>
    </SafeModal>
  );
};

export default KeyboardShortcutsHelpProvider;
