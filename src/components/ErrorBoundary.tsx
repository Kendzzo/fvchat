import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error but don't crash
    console.error("[ErrorBoundary] Caught error:", error.message);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  handleReload = () => {
    // Force full page reload to recover from HMR issues
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Check if it's a React HMR queue error - these are recoverable with refresh
      const isHMRError = this.state.error?.message?.includes("queue") || 
                         this.state.error?.message?.includes("React");

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
          <AlertTriangle className="w-16 h-16 text-warning mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            {isHMRError ? "Actualización detectada" : "Algo salió mal"}
          </h2>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            {isHMRError 
              ? "La aplicación se actualizó. Recarga para ver los cambios."
              : "Ha ocurrido un error inesperado. Intenta recargar la página."
            }
          </p>
          <Button onClick={this.handleReload} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Recargar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
