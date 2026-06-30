import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { logger, LogLevel, LogEntry, NetworkLogEntry } from '../utils/logger';

type Tab = 'logs' | 'network';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-slate-400',
  info: 'text-blue-400',
  warn: 'text-amber-400',
  error: 'text-red-400',
};

const LEVEL_BG: Record<LogLevel, string> = {
  debug: 'bg-slate-900/50',
  info: 'bg-blue-900/20',
  warn: 'bg-amber-900/20',
  error: 'bg-red-900/20',
};

const STATUS_COLORS: Record<string, string> = {
  '2': 'text-green-400',
  '3': 'text-blue-400',
  '4': 'text-amber-400',
  '5': 'text-red-400',
};

function getStatusColor(status?: number): string {
  if (!status) return 'text-slate-400';
  return STATUS_COLORS[String(status)[0]] || 'text-slate-400';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
    + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max) + '…' : str;
}

const TIME_RANGE_OPTIONS = [
  { label: 'All', value: Infinity },
  { label: '5m', value: 5 * 60 * 1000 },
  { label: '1h', value: 60 * 60 * 1000 },
  { label: '24h', value: 24 * 60 * 60 * 1000 },
];

interface DebugPanelProps {
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen: externalIsOpen, onToggle }) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen ?? internalIsOpen;
  const setIsOpen = useCallback((value: boolean) => {
    setInternalIsOpen(value);
    onToggle?.(value);
  }, [onToggle]);

  const [tab, setTab] = useState<Tab>('logs');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<number>(Infinity);
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [networkLogs, setNetworkLogs] = useState<NetworkLogEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const update = () => {
      setLogs(logger.getLogEntries());
      setNetworkLogs(logger.getNetworkLogs());
    };
    update();
    return logger.subscribe(update);
  }, []);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, networkLogs, autoScroll]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
      if (isOpen && e.key === '/' && searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, setIsOpen]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const categories = useMemo(() => {
    return ['all', ...logger.getCategories()];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const now = Date.now();
    return logs.filter(entry => {
      if (levelFilter !== 'all' && entry.level !== levelFilter) return false;
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
      if (now - entry.timestamp > timeRange) return false;
      if (searchQuery) {
        const searchStr = `${entry.message} ${JSON.stringify(entry.data || '')} ${entry.category || ''}`.toLowerCase();
        if (!searchStr.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [logs, levelFilter, categoryFilter, timeRange, searchQuery]);

  const filteredNetworkLogs = useMemo(() => {
    const now = Date.now();
    return networkLogs.filter(entry => {
      if (now - entry.timestamp > timeRange) return false;
      if (searchQuery) {
        const searchStr = `${entry.url} ${entry.method} ${entry.error || ''}`.toLowerCase();
        if (!searchStr.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [networkLogs, timeRange, searchQuery]);

  const context = logger.getContextInfo();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="Debug Panel (Ctrl+Shift+D)"
        className="fixed bottom-20 left-2 z-[99999] w-9 h-9 rounded-full bg-slate-800/90 border border-slate-600/20 text-blue-400 text-base cursor-pointer flex items-center justify-center backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[50vh] z-[99999] flex flex-col bg-slate-900/97 border-t border-slate-700/15 backdrop-blur-xl font-mono text-xs text-slate-200">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-700/10 bg-slate-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-bold text-blue-400">🐛 Debug</span>
          
          <div className="flex gap-1">
            {(['logs', 'network'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase cursor-pointer transition-colors ${
                  tab === t 
                    ? 'bg-blue-500/20 text-blue-400' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t} ({t === 'logs' ? filteredLogs.length : filteredNetworkLogs.length})
              </button>
            ))}
          </div>

          {tab === 'logs' && (
            <div className="flex gap-1 items-center">
              {(['all', 'debug', 'info', 'warn', 'error'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLevelFilter(l)}
                  className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors ${
                    levelFilter === l 
                      ? 'bg-slate-700/50 font-bold' 
                      : 'hover:bg-slate-700/30'
                  } ${l === 'all' ? 'text-slate-300' : LEVEL_COLORS[l]}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1 items-center ml-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-800 border border-slate-600/30 rounded px-1.5 py-0.5 text-[10px] text-slate-300 cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat === 'all' ? 'All Cats' : cat}</option>
              ))}
            </select>

            <select
              value={timeRange}
              onChange={(e) => setTimeRange(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600/30 rounded px-1.5 py-0.5 text-[10px] text-slate-300 cursor-pointer"
            >
              {TIME_RANGE_OPTIONS.map(opt => (
                <option key={opt.label} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search... (/)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-800 border border-slate-600/30 rounded px-2 py-0.5 text-[10px] text-slate-300 w-32 focus:outline-none focus:border-blue-500/50"
          />

          <label className="flex items-center gap-1 cursor-pointer text-slate-500 text-[10px]">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-3 h-3"
            />
            Auto
          </label>

          <button
            onClick={() => navigator.clipboard.writeText(JSON.stringify(context, null, 2))}
            className="px-2 py-0.5 rounded border border-slate-600/20 bg-transparent text-slate-500 text-[10px] cursor-pointer hover:text-slate-300"
            title="Copy context to clipboard"
          >
            📋
          </button>

          <button
            onClick={() => logger.downloadLogs()}
            className="px-2 py-0.5 rounded border border-slate-600/20 bg-transparent text-slate-500 text-[10px] cursor-pointer hover:text-slate-300"
          >
            📥
          </button>

          <button
            onClick={() => logger.clear()}
            className="px-2 py-0.5 rounded border border-slate-600/20 bg-transparent text-slate-500 text-[10px] cursor-pointer hover:text-slate-300"
          >
            🗑
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="px-1.5 border-none bg-transparent text-slate-500 cursor-pointer text-sm leading-none hover:text-slate-300"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="shrink-0 px-3 py-1 border-b border-slate-700/10 bg-slate-800/30 text-[10px] text-slate-500 flex items-center gap-4">
        <span>Session: <span className="text-slate-400 font-mono">{context.sessionId}</span></span>
        <span>User: <span className="text-slate-400">{context.userId || 'anonymous'}</span></span>
        <span>Env: <span className="text-slate-400">{context.environment}</span></span>
      </div>

      <div className="flex-1 overflow-auto py-1">
        {tab === 'logs' && (
          <>
            {filteredLogs.length === 0 && (
              <div className="p-5 text-center text-slate-600">
                No log entries match the current filters
              </div>
            )}
            {filteredLogs.map(entry => (
              <div
                key={entry.id}
                onClick={() => entry.data && toggleExpand(entry.id)}
                className={`px-3 py-0.5 border-b border-slate-700/5 cursor-default ${entry.data ? 'cursor-pointer hover:bg-slate-800/50' : ''} ${LEVEL_BG[entry.level]}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-slate-600 shrink-0 text-[10px]" title={formatRelativeTime(entry.timestamp)}>
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className={`${LEVEL_COLORS[entry.level]} font-bold shrink-0 w-10 uppercase text-[10px] leading-5`}>
                    {entry.level}
                  </span>
                  {entry.category && (
                    <span className="text-violet-400 bg-violet-500/10 px-1 rounded text-[10px] shrink-0">
                      {entry.category}
                    </span>
                  )}
                  <span className="text-slate-200 flex-1">{entry.message}</span>
                  {entry.data && <span className="text-slate-600 text-[10px]">▼</span>}
                </div>
                {expandedId === entry.id && entry.data && (
                  <pre className="my-1 ml-24 p-2 bg-black/30 rounded text-slate-400 text-[11px] overflow-auto max-h-52 whitespace-pre-wrap break-words">
                    {typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </>
        )}

        {tab === 'network' && (
          <>
            {filteredNetworkLogs.length === 0 && (
              <div className="p-5 text-center text-slate-600">
                No network activity matches the current filters
              </div>
            )}
            {filteredNetworkLogs.map(entry => (
              <div
                key={entry.id}
                onClick={() => toggleExpand(entry.id)}
                className={`px-3 py-0.5 border-b border-slate-700/5 cursor-pointer hover:bg-slate-800/50 ${
                  entry.error ? 'bg-red-900/10' : entry.status && entry.status >= 400 ? 'bg-amber-900/10' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 shrink-0 text-[10px]">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className="font-bold text-violet-400 w-12 shrink-0 text-[11px]">
                    {entry.method}
                  </span>
                  <span className={`${getStatusColor(entry.status)} font-bold w-8 shrink-0 text-[11px]`}>
                    {entry.status || (entry.error ? 'ERR' : '...')}
                  </span>
                  <span className={`shrink-0 w-14 text-[11px] text-right ${
                    entry.duration && entry.duration > 2000 ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {entry.duration ? `${entry.duration}ms` : '—'}
                  </span>
                  <span className="text-slate-300 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {truncate(entry.url, 80)}
                  </span>
                </div>
                {expandedId === entry.id && (
                  <div className="my-1 ml-24 p-2 bg-black/30 rounded text-[11px] overflow-auto max-h-52">
                    {entry.error && (
                      <div className="text-red-400 mb-1">
                        <strong>Error:</strong> {entry.error}
                      </div>
                    )}
                    {entry.responseBody && (
                      <pre className="text-slate-400 whitespace-pre-wrap break-words m-0">
                        {typeof entry.responseBody === 'string'
                          ? truncate(entry.responseBody, 1000)
                          : JSON.stringify(entry.responseBody, null, 2)}
                      </pre>
                    )}
                    {!entry.error && !entry.responseBody && (
                      <span className="text-slate-600">No response body captured</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        <div ref={logEndRef} />
      </div>
    </div>
  );
};

export default DebugPanel;
