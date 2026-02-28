import type { ReactNode } from 'react';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
  children?: ReactNode;
}

export function LoadingState({
  message = 'Loading...',
  fullScreen = false,
  children,
}: LoadingStateProps) {
  const containerClass = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-gray-50'
    : 'py-8 text-center';

  return (
    <div className={containerClass}>
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-gray-600">{message}</p>
        {children}
      </div>
    </div>
  );
}
