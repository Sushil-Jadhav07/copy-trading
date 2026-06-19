import React from 'react';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('AppErrorBoundary caught an error', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 text-sm text-rose-600 dark:text-rose-400">
          <p className="font-semibold">UI runtime error</p>
          <p className="mt-2 break-words font-mono text-xs">
            {this.state.error?.message || 'Unknown error'}
          </p>
          {import.meta.env.DEV && this.state.error?.stack ? (
            <pre className="mt-3 overflow-auto whitespace-pre-wrap text-[11px] text-rose-500/80">
              {this.state.error.stack}
            </pre>
          ) : null}
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
