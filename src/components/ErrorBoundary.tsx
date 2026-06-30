"use client";

import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#0a0a0e] flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <h2 className="text-lg font-bold text-white">Error interno</h2>
            <p className="text-sm text-white/50 font-mono bg-white/5 rounded-xl p-3 text-left whitespace-pre-wrap">
              {this.state.error.message}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = "/dashboard"; }}
              className="px-4 py-2 bg-coral-500 text-white rounded-xl text-sm hover:bg-coral-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
