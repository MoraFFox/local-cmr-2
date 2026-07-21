/**
 * AutoSaveIndicator Component
 *
 * Shows auto-save status with visual feedback
 *
 * @example
 * ```tsx
 * <AutoSaveIndicator
 *   isSaving={autoSave.isSaving}
 *   lastSaved={autoSave.lastSaved}
 *   hasUnsavedChanges={autoSave.hasUnsavedChanges}
 * />
 * ```
 */

import React, { useState } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface AutoSaveIndicatorProps {
  /** Currently saving */
  isSaving?: boolean;
  /** Last save timestamp */
  lastSaved?: Date | null;
  /** Has unsaved changes */
  hasUnsavedChanges?: boolean;
  /** Save error occurred */
  hasError?: boolean;
  /** Display variant */
  variant?: 'compact' | 'full' | 'icon-only';
  /** Position in container */
  position?: 'top-right' | 'bottom-right' | 'inline';
  /** Custom class name */
  className?: string;
}

/**
 * Format relative time (e.g., "2 min ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 30) return 'just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  isSaving = false,
  lastSaved = null,
  hasUnsavedChanges = false,
  hasError = false,
  variant = 'compact',
  position = 'inline',
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const status = hasError ? 'error' : isSaving ? 'saving' : hasUnsavedChanges ? 'unsaved' : 'saved';

  const statusConfig = {
    saving: {
      icon: ClockIcon,
      color: 'text-primary',
      bg: 'bg-primary/10',
      border: 'border-primary/30',
      text: 'Saving...',
      ariaLabel: 'Saving changes'
    },
    saved: {
      icon: CheckCircleIcon,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: lastSaved ? `Saved ${formatRelativeTime(lastSaved)}` : 'Saved',
      ariaLabel: 'All changes saved'
    },
    unsaved: {
      icon: ClockIcon,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'Unsaved changes',
      ariaLabel: 'You have unsaved changes'
    },
    error: {
      icon: ExclamationCircleIcon,
      color: 'text-ember-500',
      bg: 'bg-ember-500/10',
      border: 'border-ember-500/30',
      text: 'Save failed',
      ariaLabel: 'Failed to save changes'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const baseClasses = 'flex items-center gap-2 text-xs font-medium transition-all duration-200';

  // Icon-only variant
  if (variant === 'icon-only') {
    return (
      <div className={`${baseClasses} ${className}`}>
        <button
          type="button"
          className={`p-1.5 rounded-lg ${config.bg} ${config.color} hover:bg-opacity-80 transition-colors`}
          aria-label={config.ariaLabel}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onFocus={() => setShowTooltip(true)}
          onBlur={() => setShowTooltip(false)}
        >
          <Icon className="w-4 h-4" />
        </button>

        {showTooltip && (
          <div className="absolute z-50 px-2 py-1 bg-espresso text-cream text-xs rounded shadow-lg">
            {config.text}
          </div>
        )}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`${baseClasses} ${config.bg} ${config.color} px-3 py-1.5 rounded-lg ${className}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{config.text}</span>
      </div>
    );
  }

  // Full variant with all details
  return (
    <div
      className={`${baseClasses} ${config.bg} ${config.color} px-3 py-2 rounded-lg border ${config.border} ${className}`}
      role="status"
      aria-live="polite"
    >
      <Icon className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
      <span>{config.text}</span>


    </div>
  );
};

/**
 * Auto save status bar (for form headers)
 */
interface AutoSaveStatusBarProps {
  isSaving?: boolean;
  lastSaved?: Date | null;
  hasUnsavedChanges?: boolean;
  hasError?: boolean;
  onSaveNow?: () => void;
  versionCount?: number;
}

export const AutoSaveStatusBar: React.FC<AutoSaveStatusBarProps> = ({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  hasError,
  onSaveNow,
  versionCount = 0
}) => {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-cream-2 border border-hairline rounded-lg">
      <AutoSaveIndicator
        isSaving={isSaving}
        lastSaved={lastSaved}
        hasUnsavedChanges={hasUnsavedChanges}
        hasError={hasError}
        variant="compact"
      />

      <div className="flex items-center gap-3 text-xs text-latte">
        {versionCount > 0 && (
          <span>{versionCount} versions saved</span>
        )}

        {hasUnsavedChanges && onSaveNow && (
          <button
            type="button"
            onClick={onSaveNow}
            disabled={isSaving}
            className="px-3 py-1 text-primary bg-primary/10 rounded-md hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save now
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Floating auto-save indicator (for while editing)
 */
interface FloatingAutoSaveProps {
  isSaving?: boolean;
  lastSaved?: Date | null;
  position?: 'bottom-right' | 'bottom-left';
}

export const FloatingAutoSave: React.FC<FloatingAutoSaveProps> = ({
  isSaving,
  lastSaved,
  position = 'bottom-right'
}) => {
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-40 pointer-events-none`}
      role="status"
      aria-live="polite"
    >
      <AutoSaveIndicator
        isSaving={isSaving}
        lastSaved={lastSaved}
        variant="icon-only"
      />
    </div>
  );
};

export default AutoSaveIndicator;