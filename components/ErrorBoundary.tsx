import React from 'react';
import { logger } from '../utils/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error(`React Error Boundary caught: ${error.message}`, {
      error: { name: error.name, message: error.message, stack: error.stack },
      componentStack: errorInfo.componentStack,
    }, 'react');
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '20px',
        }}>
          <div style={{
            maxWidth: '420px',
            width: '100%',
            background: 'rgba(30, 41, 59, 0.8)',
            borderRadius: '16px',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            padding: '32px',
            textAlign: 'center',
            backdropFilter: 'blur(12px)',
          }} role="alert">
            {/* Error Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h2 style={{ color: '#f1f5f9', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
              حدث خطأ غير متوقع
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 8px', direction: 'rtl' }}>
              عذراً، حدث خطأ في التطبيق. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
            </p>

            {/* Error Details (collapsible) */}
            {this.state.error && (
              <details style={{ margin: '16px 0', textAlign: 'left' }}>
                <summary style={{ color: '#64748b', fontSize: '12px', cursor: 'pointer', marginBottom: '8px' }}>
                  التفاصيل التقنية
                </summary>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)',
                  color: '#ef4444',
                  padding: '12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  overflow: 'auto',
                  maxHeight: '150px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {this.state.error.name}: {this.state.error.message}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                إعادة المحاولة
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  background: 'rgba(20, 184, 166, 0.2)',
                  color: '#5eead4',
                  border: '1px solid rgba(20, 184, 166, 0.4)',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                العودة للرئيسية
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  background: 'rgba(148, 163, 184, 0.15)',
                  color: '#94a3b8',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                تحديث الصفحة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
