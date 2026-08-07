import React, { useState } from 'react';
import { SignalSlashIcon, CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { useT } from '../../utils/i18n';

export const OfflineBanner: React.FC = () => {
  const t = useT();
  const isOnline = useNetworkStatus();
  const { isSyncing } = useOfflineQueue();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissed state when going offline again
  React.useEffect(() => {
    if (!isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  if (isOnline && !isSyncing) return null;

  if (!isOnline && !dismissed) {
    return (
      <div className="bg-cream-2 text-espresso px-4 py-2 text-center text-sm font-medium border-b border-hairline flex items-center justify-between gap-2 shrink-0" role="alert">
        <span className="flex items-center gap-2 flex-1 justify-center">
          <SignalSlashIcon className="w-4 h-4 text-ember-500" />
          {t.ui.misc.offlineMessage}
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-cream-3 transition-colors"
          aria-label={t.ui.misc.hideAlert}
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className="bg-cream-2 text-espresso px-4 py-2 text-center text-sm font-medium border-b border-hairline flex items-center justify-center gap-2 shrink-0" role="status">
        <CloudArrowUpIcon className="w-4 h-4 text-copper-500 animate-bounce" />
        {t.ui.misc.syncingOffline}
      </div>
    );
  }

  return null;
};
