import styles from './ConfirmationModal.module.css';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    onCancel?: () => void;
    isDangerous?: boolean;
}

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmLabel = "Logout", onCancel, isDangerous = false }: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h3 className={styles.title}>{title}</h3>
                <div className={styles.message}>{message}</div>

                <div className={styles.actions}>
                    <button
                        onClick={onClose}
                        className={styles.cancelBtn}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={styles.confirmBtn}
                        style={{
                            background: isDangerous ? '#ef4444' : '#7c3aed',
                            boxShadow: isDangerous ? '0 4px 6px -1px rgba(239, 68, 68, 0.2)' : '0 4px 6px -1px rgba(124, 58, 237, 0.2)'
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div >
    );
}
