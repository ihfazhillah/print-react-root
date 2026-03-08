import { Modal } from './Modal';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  isLoading,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button className={styles.cancel} onClick={onCancel} disabled={isLoading}>
          Cancel
        </button>
        <button className={styles.confirm} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Loading…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
