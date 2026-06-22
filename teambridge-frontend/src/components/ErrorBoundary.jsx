import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an uncaught exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          margin: '20px',
          background: '#fff0f0',
          border: '1px solid #ffcccc',
          borderRadius: '12px',
          color: '#cc0000',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '700' }}>
            ⚠️ Workspace Engine Exception
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#6e6e73' }}>
            An unexpected error occurred in this workspace component segment.
          </p>
          <pre style={{
            background: 'rgba(0, 0, 0, 0.05)',
            padding: '14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontFamily: '"SF Mono", Monaco, Consolas, monospace',
            overflowX: 'auto',
            color: '#333'
          }}>
            {this.state.error?.toString() || 'Unknown runtime error'}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Retry Component Render
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
