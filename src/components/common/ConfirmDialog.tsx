import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  confirmDisabled?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  type = 'warning',
  confirmDisabled = false
}) => {
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-rose-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      default:
        return <Info className="w-6 h-6 text-sky-500" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-500 text-white';
      case 'warning':
        return 'bg-[#F59E0B] hover:bg-[#D97706] text-black font-semibold';
      default:
        return 'bg-sky-600 hover:bg-sky-500 text-white';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-muted)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            disabled={confirmDisabled}
            className={`px-4 py-2 text-xs rounded-xl transition-all shadow-md ${getConfirmButtonClass()} ${
              confirmDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4 items-start">
        <div className="p-3 rounded-2xl bg-[var(--surface-muted)] border border-[var(--divider)] shrink-0">
          {getIcon()}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-[var(--text-primary)] leading-relaxed font-medium">{message}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            This action will modify financial records and update ledger simulations across the platform.
          </p>
        </div>
      </div>
    </Modal>
  );
};
