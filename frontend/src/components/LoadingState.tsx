import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading jobs from server...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-16 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full mb-4 animate-spin">
        <Loader2 className="w-8 h-8" />
      </div>
      <p className="text-sm font-medium text-slate-700">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Connecting to NestJS REST API</p>
    </div>
  );
};
