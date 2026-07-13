import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    console.error("[ErrorBoundary]", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="text-7xl mb-3.5">💥</div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-1.5">
              Something Went Wrong
            </h1>
            <p className="text-[#a0a0b0] text-sm mb-4 leading-relaxed">
              An unexpected error occurred. Refresh the page to continue. If the
              problem persists, please contact support.
            </p>
            {this.state.error && (
              <p className="text-[#ff2244] text-xs font-mono bg-[#1a0010] border border-[#ff2244]/20 rounded-lg px-3 py-1.5 mb-4 text-left break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-[#ff6b00] text-white font-bold uppercase rounded-lg hover:bg-[#e66000] transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
