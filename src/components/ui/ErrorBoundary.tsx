import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[var(--color-bg)] p-4 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[var(--color-error-subtle)] text-[var(--color-error)] mb-6">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] mb-3">Ops! Algo deu errado.</h1>
          <p className="text-[14px] text-[var(--color-text-faint)] mb-6 max-w-md">
            {this.state.error?.message || "Ocorreu um erro inesperado."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-bold rounded-lg transition-colors"
          >
            Recarregar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
