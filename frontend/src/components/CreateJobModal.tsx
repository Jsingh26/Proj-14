import React, { useState } from 'react';
import { CreateJobDto } from '../types/job';
import { X, Loader2, PlusCircle } from 'lucide-react';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateJobDto) => Promise<boolean>;
  isCreating: boolean;
}

const COMMON_TYPES = ['report', 'email', 'data-sync', 'export', 'cleanup', 'indexing'];

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isCreating,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedTitle = title.trim();
    const trimmedType = type.trim();

    if (!trimmedTitle || trimmedTitle.length < 3) {
      setValidationError('Title must be at least 3 characters long.');
      return;
    }
    if (trimmedTitle.length > 120) {
      setValidationError('Title cannot exceed 120 characters.');
      return;
    }

    if (!trimmedType || trimmedType.length < 2) {
      setValidationError('Type must be at least 2 characters long.');
      return;
    }
    if (trimmedType.length > 50) {
      setValidationError('Type cannot exceed 50 characters.');
      return;
    }

    const success = await onSubmit({ title: trimmedTitle, type: trimmedType });
    if (success) {
      setTitle('');
      setType('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-headline"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h3 id="modal-headline" className="text-base font-semibold text-slate-900">
              Create New Job
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {validationError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                {validationError}
              </div>
            )}

            {/* Title Input */}
            <div>
              <label htmlFor="job-title" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                id="job-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Generate Monthly Financial Report"
                disabled={isCreating}
                maxLength={120}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 transition"
                autoFocus
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Min 3 chars, max 120 chars.
              </p>
            </div>

            {/* Type Input */}
            <div>
              <label htmlFor="job-type" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Job Type <span className="text-rose-500">*</span>
              </label>
              <input
                id="job-type"
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. report"
                disabled={isCreating}
                maxLength={50}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400 transition"
              />
              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-slate-400 mr-1">Suggestions:</span>
                {COMMON_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    disabled={isCreating}
                    className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-md transition"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Note:</span> Every new job is automatically queued with initial status <span className="font-mono text-amber-700 font-semibold">PENDING</span>.
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition shadow-sm shadow-indigo-200"
            >
              {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isCreating ? 'Creating Job...' : 'Create Job'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
