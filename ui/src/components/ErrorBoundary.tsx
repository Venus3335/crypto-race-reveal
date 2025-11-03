import { Component, type ErrorInfo, type ReactNode } from "react";

import "./ErrorBoundary.css";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something Went Wrong</h1>
          <p>Sorry, an unexpected error occurred. Please refresh the page or try again later.</p>
          <button type="button" onClick={this.handleReload}>
            Reload
          </button>
          {this.state.error && (
            <details>
              <summary>Error details</summary>
              <pre>{this.state.error.message}</pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

