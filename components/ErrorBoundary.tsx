
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in RotaReport:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-700 rounded-lg m-4">
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <p>The staff rota could not be displayed due to an unexpected error.</p>
          <p className="text-sm mt-2">This is likely caused by inconsistent data from a previous version of the app. The rest of the dashboard should still be functional.</p>
          <details className="mt-4 text-xs bg-red-100 p-2 rounded">
            <summary>Error Details</summary>
            <pre className="mt-2 whitespace-pre-wrap">
              {this.state.error?.toString()}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
