import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '2rem',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            border: '1px solid #334155',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#ef4444'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem', color: '#ffffff' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              An unexpected display error occurred. You can safely reload the portal or sign in again.
            </p>

            {this.state.error?.message && (
              <div style={{
                backgroundColor: '#0f172a',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                color: '#f87171',
                textAlign: 'left',
                fontFamily: 'monospace',
                marginBottom: '1.5rem',
                overflowX: 'auto',
                border: '1px solid #334155'
              }}>
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '0.875rem',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <RefreshCw size={16} />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
