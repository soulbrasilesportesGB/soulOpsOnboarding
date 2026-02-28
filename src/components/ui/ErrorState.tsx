import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  fullScreen?: boolean;
  children?: ReactNode;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  fullScreen = false,
  children,
}: ErrorStateProps) {
  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-gray-50'
    : 'py-8';

  const errorMessage = message || (typeof error === 'string' ? error : error?.message) || 'An unexpected error occurred.';

  return (
    <div className={containerClass}>
      <div className="max-w-md mx-auto bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-12 h-12 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-red-900 mb-2">{title}</h3>
        <p className="text-red-700 mb-4">{errorMessage}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Try Again
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
