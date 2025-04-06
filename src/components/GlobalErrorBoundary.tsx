"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default function GlobalErrorBoundary({ children }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Add global error handler
    const errorHandler = (event: ErrorEvent) => {
      event.preventDefault();
      setHasError(true);
      setError(event.error || new Error(event.message));

      // Log error to console for debugging
      console.error("Uncaught error:", event.error || event.message);
    };

    // Add unhandled rejection handler (for promises)
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      setHasError(true);
      setError(
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason))
      );

      // Log rejected promise to console for debugging
      console.error("Unhandled promise rejection:", event.reason);
    };

    // Register the event handlers
    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    // Remove event listeners on cleanup
    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
    };
  }, []);

  const handleReset = () => {
    setHasError(false);
    setError(null);
  };

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-center mb-4 text-red-500">
            <AlertTriangle size={48} />
          </div>
          <h2 className="text-xl font-bold text-center mb-4">
            Something went wrong
          </h2>
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-sm text-red-800 overflow-auto max-h-32">
            {error?.message || "An unexpected error occurred."}
          </div>
          <p className="text-gray-600 mb-4 text-sm">
            Please try again or contact support if the problem persists.
          </p>
          <div className="flex justify-center space-x-4">
            <Button onClick={() => window.location.reload()} variant="default">
              Reload Page
            </Button>
            <Button onClick={handleReset} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
