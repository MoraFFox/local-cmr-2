/**
 * Centralized Logger for CMR Application
 * 
 * Features:
 * - Log levels: debug, info, warn, error
 * - In-memory ring buffer with configurable size
 * - localStorage persistence with retention policy
 * - Console forwarding with configurable behavior
 * - Structured log entries with timestamps, stack traces, and context
 * - Export/download logs as JSON
 * - Network request/response logging
 * - Performance timing (time/timeEnd)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  userId?: string;
  sessionId: string;
  appVersion: string;
  buildTime: string;
  environment: 'development' | 'production';
  url?: string;
  userAgent?: string;
}

export interface LogEntry {
  id: string;
  level: LogLevel;
  timestamp: number;
  message: string;
  data?: any;
  stack?: string;
  category?: string;
  context?: LogContext;
}

export interface NetworkLogEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  context?: LogContext;
}

export interface LoggerConfig {
  maxLogEntries: number;
  maxNetworkEntries: number;
  persistToLocalStorage: boolean;
  localStorageKey: string;
  retentionMs: number;
  minLevel: LogLevel;
  consoleOutput: boolean;
  includeContext: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
  maxLogEntries: 500,
  maxNetworkEntries: 200,
  persistToLocalStorage: true,
  localStorageKey: 'cmr_logs',
  retentionMs: 24 * 60 * 60 * 1000,
  minLevel: 'debug',
  consoleOutput: true,
  includeContext: true,
};

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function generateSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
}

function getAppVersion(): string {
  if (typeof window === 'undefined') return 'unknown';
  return (window as any).__CMR_VERSION__ || 'unknown';
}

function getBuildTime(): string {
  if (typeof window === 'undefined') return new Date().toISOString();
  return (window as any).__CMR_BUILD_TIME__ || new Date().toISOString();
}

class Logger {
  private logs: LogEntry[] = [];
  private networkLogs: NetworkLogEntry[] = [];
  private listeners: Set<() => void> = new Set();
  private config: LoggerConfig;
  private context: LogContext;
  private timers: Map<string, number> = new Map();
  private currentUserId: string | undefined;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.context = {
      sessionId: generateSessionId(),
      appVersion: getAppVersion(),
      buildTime: getBuildTime(),
      environment: import.meta.env.DEV ? 'development' : 'production',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    };

    if (this.config.persistToLocalStorage && typeof localStorage !== 'undefined') {
      this.loadPersistedLogs();
    }
  }

  setUserId(userId: string | undefined): void {
    this.currentUserId = userId;
    this.context = { ...this.context, userId };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }

  private getContext(): LogContext {
    return {
      ...this.context,
      userId: this.currentUserId,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel];
  }

  private addLog(level: LogLevel, message: string, data?: any, category?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      id: this.generateId(),
      level,
      timestamp: Date.now(),
      message,
      data: data !== undefined ? this.safeSerialize(data) : undefined,
      stack: level === 'error' ? new Error().stack : undefined,
      category,
      context: this.config.includeContext ? this.getContext() : undefined,
    };

    this.logs.push(entry);
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    if (this.config.consoleOutput) {
      const consoleFn = level === 'debug' ? console.debug : console[level];
      const prefix = `[${level.toUpperCase()}]${category ? ` [${category}]` : ''}`;
      if (data !== undefined) {
        consoleFn(prefix, message, data);
      } else {
        consoleFn(prefix, message);
      }
    }

    this.persistLogs();
    this.notifyListeners();
  }

  private safeSerialize(data: any): any {
    try {
      if (data instanceof Error) {
        return {
          name: data.name,
          message: data.message,
          stack: data.stack,
        };
      }
      if (data instanceof File) {
        return { name: data.name, size: data.size, type: data.type };
      }
      if (data instanceof Blob) {
        return { size: data.size, type: data.type };
      }
      JSON.stringify(data);
      return data;
    } catch {
      return String(data);
    }
  }

  private persistLogs(): void {
    if (!this.config.persistToLocalStorage) return;
    if (typeof localStorage === 'undefined') return;
    
    try {
      const data = {
        logs: this.logs.slice(-this.config.maxLogEntries),
        networkLogs: this.networkLogs.slice(-this.config.maxNetworkEntries),
        context: this.context,
        savedAt: Date.now(),
      };
      localStorage.setItem(this.config.localStorageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to persist logs:', e);
    }
  }

  private loadPersistedLogs(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.config.localStorageKey);
      if (!stored) return;

      const data = JSON.parse(stored);
      const now = Date.now();
      
      if (data.savedAt && now - data.savedAt > this.config.retentionMs) {
        this.clear();
        return;
      }

      if (Array.isArray(data.logs)) {
        this.logs = data.logs.filter((entry: LogEntry) => 
          now - entry.timestamp <= this.config.retentionMs
        );
      }
      
      if (Array.isArray(data.networkLogs)) {
        this.networkLogs = data.networkLogs.filter((entry: NetworkLogEntry) =>
          now - entry.timestamp <= this.config.retentionMs
        );
      }

      if (data.context?.sessionId) {
        this.context.sessionId = data.context.sessionId;
      }
    } catch (e) {
      console.warn('Failed to load persisted logs:', e);
    }
  }

  debug(message: string, data?: any, category?: string): void {
    this.addLog('debug', message, data, category);
  }

  info(message: string, data?: any, category?: string): void {
    this.addLog('info', message, data, category);
  }

  warn(message: string, data?: any, category?: string): void {
    this.addLog('warn', message, data, category);
  }

  error(message: string, data?: any, category?: string): void {
    this.addLog('error', message, data, category);
  }

  time(label: string): void {
    this.timers.set(label, performance.now());
    this.debug(`Timer started: ${label}`, undefined, 'performance');
  }

  timeEnd(label: string, category?: string): number | null {
    const startTime = this.timers.get(label);
    if (startTime === undefined) {
      this.warn(`Timer not found: ${label}`, undefined, 'performance');
      return null;
    }
    
    const duration = performance.now() - startTime;
    this.timers.delete(label);
    this.debug(`Timer ended: ${label}`, { duration: `${duration.toFixed(2)}ms` }, category || 'performance');
    return duration;
  }

  logNetworkRequest(method: string, url: string, requestBody?: any): string {
    const id = this.generateId();
    const entry: NetworkLogEntry = {
      id,
      timestamp: Date.now(),
      method,
      url: this.sanitizeUrl(url),
      requestBody: requestBody !== undefined ? this.safeSerialize(requestBody) : undefined,
      context: this.config.includeContext ? this.getContext() : undefined,
    };

    this.networkLogs.push(entry);
    if (this.networkLogs.length > this.config.maxNetworkEntries) {
      this.networkLogs = this.networkLogs.slice(-this.config.maxNetworkEntries);
    }

    this.persistLogs();
    this.notifyListeners();
    return id;
  }

  logNetworkResponse(id: string, status: number, duration: number, responseBody?: any): void {
    const entry = this.networkLogs.find(e => e.id === id);
    if (entry) {
      entry.status = status;
      entry.duration = duration;
      entry.responseBody = responseBody !== undefined ? this.safeSerialize(responseBody) : undefined;
      this.persistLogs();
      this.notifyListeners();
    }
  }

  logNetworkError(id: string, duration: number, error: string): void {
    const entry = this.networkLogs.find(e => e.id === id);
    if (entry) {
      entry.duration = duration;
      entry.error = error;
      this.notifyListeners();
    }

    this.addLog('error', `Network error: ${entry?.method} ${entry?.url}`, { error, duration }, 'network');
  }

  getLogEntries(level?: LogLevel): LogEntry[] {
    if (level) return this.logs.filter(l => l.level === level);
    return [...this.logs];
  }

  getNetworkLogs(): NetworkLogEntry[] {
    return [...this.networkLogs];
  }

  getContextInfo(): LogContext {
    return { ...this.context, userId: this.currentUserId };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn());
  }

  clear(): void {
    this.logs = [];
    this.networkLogs = [];
    this.timers.clear();
    
    if (this.config.persistToLocalStorage && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.config.localStorageKey);
    }
    
    this.notifyListeners();
  }

  downloadLogs(): void {
    const data = {
      exportedAt: new Date().toISOString(),
      context: this.getContextInfo(),
      logs: this.logs,
      networkLogs: this.networkLogs,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cmr-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  setConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  private sanitizeUrl(url: string): string {
    try {
      const u = new URL(url);
      u.searchParams.delete('apikey');
      return u.pathname + u.search;
    } catch {
      return url;
    }
  }

  search(query: string, options?: { level?: LogLevel; category?: string; timeRange?: number }): LogEntry[] {
    const now = Date.now();
    const timeRange = options?.timeRange || Infinity;
    
    return this.logs.filter(entry => {
      if (options?.level && entry.level !== options.level) return false;
      if (options?.category && entry.category !== options.category) return false;
      if (now - entry.timestamp > timeRange) return false;
      
      const searchStr = `${entry.message} ${JSON.stringify(entry.data || '')} ${entry.category || ''}`.toLowerCase();
      return searchStr.includes(query.toLowerCase());
    });
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.logs.forEach(entry => {
      if (entry.category) categories.add(entry.category);
    });
    return Array.from(categories).sort();
  }
}

export const logger = new Logger();

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error(`Unhandled error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    }, 'global');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error
      ? { name: event.reason.name, message: event.reason.message, stack: event.reason.stack }
      : String(event.reason);
    logger.error('Unhandled promise rejection', reason, 'global');
  });
}
