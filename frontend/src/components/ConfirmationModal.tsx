import React from 'react';

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
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '16px',
                width: '400px',
                maxWidth: '90%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f3f4f6'
            }}>
                <h3 style={{ marginTop: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>{title}</h3>
                <p style={{ color: '#6b7280', marginBottom: '2rem', lineHeight: 1.5 }}>{message}</p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            background: 'white',
                            color: '#374151',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: isDangerous ? '#ef4444' : '#7c3aed',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 500,
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
