import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  isRetrying,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-rose-50/50 rounded-xl border border-rose-200 text-center">
      <div className="p-3 bg-rose-100 text-rose-600 rounded-full mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-rose-900 mb-1">
        Unable to Load Jobs
      </h3>
      <p className="text-xs text-rose-700 max-w-md mb-5 leading-relaxed">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg shadow-sm shadow-rose-200 transition disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>{isRetrying ? 'Retrying...' : 'Retry Connection'}</span>
      </button>
    </div>
  );
};
