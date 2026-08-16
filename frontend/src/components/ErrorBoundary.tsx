import { Component, ReactNode } from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'Unknown error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-void flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <div className="font-mono text-alarm text-xs uppercase tracking-widest mb-3">Trace interrupted</div>
            <h1 className="font-mono text-2xl text-trace mb-3">Something broke the readout</h1>
            <p className="font-sans text-sm text-tracedim mb-6">{this.state.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="font-mono text-xs px-4 py-2 rounded border border-voidline bg-voidraised text-trace hover:border-phosphor/40 hover:text-phosphor transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
