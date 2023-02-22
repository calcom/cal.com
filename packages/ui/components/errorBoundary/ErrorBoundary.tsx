import type { ErrorInfo } from "react";
import React from "react";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; message?: string },
  { error: Error | null; errorInfo: ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode } | Readonly<{ children: React.ReactNode }>) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  componentDidCatch?(error: Error, errorInfo: ErrorInfo) {
    // Catch errors in any components below and re-render with error message
    this.setState({ error, errorInfo });
    // You can also log error messages to an error reporting service here
  }

  render() {
    if (this.state.errorInfo) {
      // Error path
      return (
        <div>
          <h2>{this.props.message || "Something went wrong."}</h2>
          <details style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }
    // Normally, just render children
    return this.props.children;
  }
}

export default ErrorBoundary;
