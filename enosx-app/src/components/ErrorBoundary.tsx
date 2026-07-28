import React from "react";

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ENOSX Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex h-screen w-screen items-center justify-center"
          style={{ background: "#0a0a0a", color: "#f0f0f0" }}
        >
          <div className="text-center max-w-md px-6">
            <div
              className="text-4xl font-black mb-4"
              style={{ color: "#dc143c" }}
            >
              ENOSX
            </div>
            <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
              Something went wrong
            </p>
            <p
              className="text-xs mb-6"
              style={{
                color: "rgba(255,255,255,0.3)",
                fontFamily: "monospace",
              }}
            >
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl text-sm"
              style={{
                background: "rgba(220,20,60,0.15)",
                border: "1px solid rgba(220,20,60,0.3)",
                color: "#dc143c",
              }}
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
