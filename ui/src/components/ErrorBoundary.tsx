import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f0f0f',
          color: '#ffffff',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <h2 style={{ marginTop: 0, color: '#ef4444' }}>❌ Something went wrong</h2>
            <p style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.8)' }}>
              An error occurred in the application. Please try refreshing the page.
            </p>
            {this.state.error && (
              <details style={{
                marginBottom: '1rem',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '8px',
                fontSize: '0.875rem',
              }}>
                <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                  Error Details
                </summary>
                <div style={{ marginTop: '0.5rem', fontFamily: 'monospace' }}>
                  <div style={{ color: '#ef4444', marginBottom: '0.5rem' }}>
                    <strong>Error:</strong> {this.state.error.message}
                  </div>
                  {this.state.errorInfo && (
                    <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem' }}>
                      <strong>Stack:</strong>
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(102, 126, 234, 0.8)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(107, 114, 128, 0.5)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

