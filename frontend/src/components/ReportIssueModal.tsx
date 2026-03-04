'use client';

import { useState, useRef } from 'react';
import { X, Bug, Lightbulb, MessageSquare, Send, CheckCircle, AlertCircle, Paperclip, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import styles from './ReportIssueModal.module.css';

interface ReportIssueModalProps {
    visible: boolean;
    onClose: () => void;
}

const CATEGORIES = [
    { value: 'bug', label: 'Bug Report', icon: Bug, color: '#ef4444' },
    { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: '#f59e0b' },
    { value: 'other', label: 'General Feedback', icon: MessageSquare, color: '#3b82f6' }
];

export default function ReportIssueModal({ visible, onClose }: ReportIssueModalProps) {
    const [category, setCategory] = useState('bug');
    const [description, setDescription] = useState('');
    const [screenshots, setScreenshots] = useState<{ base64: string; name: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (screenshots.length >= 3) {
            setResult({ type: 'error', message: 'Maximum 3 screenshots allowed' });
            return;
        }
        if (!file.type.startsWith('image/')) {
            setResult({ type: 'error', message: 'Only image files are allowed' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setResult({ type: 'error', message: 'Image must be under 5MB' });
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            setScreenshots(prev => [...prev, { base64, name: file.name }]);
            setResult(null);
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeScreenshot = (index: number) => {
        setScreenshots(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!description.trim()) return;

        setSubmitting(true);
        setResult(null);

        try {
            const payload: any = { category, description };
            if (screenshots.length > 0) {
                payload.screenshots = screenshots.map(s => ({ base64: s.base64, name: s.name }));
            }

            const response = await api.post('/feedback/report', payload);
            setResult({
                type: 'success',
                message: `Issue #${response.data.issue_number} created successfully! Thank you for your feedback.`
            });
            setDescription('');
            setCategory('bug');
            setScreenshots([]);
        } catch (error: any) {
            setResult({
                type: 'error',
                message: error.response?.data?.detail || 'Failed to submit. Please try again.'
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setResult(null);
        setDescription('');
        setCategory('bug');
        setScreenshots([]);
        onClose();
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) handleClose();
    };

    if (!visible) return null;

    return (
        <div className={styles.overlay} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <button className={styles.closeButton} onClick={handleClose}>
                    <X size={20} />
                </button>

                <div className={styles.header}>
                    <h2 className={styles.title}>Report an Issue</h2>
                    <p className={styles.subtitle}>Help us improve SmartSubs</p>
                </div>

                {/* Category Selector */}
                <div className={styles.categoryGroup}>
                    {CATEGORIES.map(cat => {
                        const Icon = cat.icon;
                        return (
                            <button
                                key={cat.value}
                                className={`${styles.categoryBtn} ${category === cat.value ? styles.categoryActive : ''}`}
                                onClick={() => setCategory(cat.value)}
                                style={category === cat.value ? { borderColor: cat.color, color: cat.color } : {}}
                            >
                                <Icon size={18} />
                                {cat.label}
                            </button>
                        );
                    })}
                </div>

                {/* Description */}
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Description</label>
                    <textarea
                        className={styles.textarea}
                        placeholder="Describe the issue or your suggestion..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={5}
                        maxLength={2000}
                    />
                    <span className={styles.charCount}>{description.length}/2000</span>
                </div>

                {/* Screenshot Attachments */}
                <div className={styles.attachmentSection}>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />
                    {screenshots.map((s, i) => (
                        <div key={i} className={styles.attachmentPreview}>
                            <Paperclip size={14} />
                            <span className={styles.attachmentName}>{s.name}</span>
                            <button className={styles.removeAttachment} onClick={() => removeScreenshot(i)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {screenshots.length < 3 && (
                        <button
                            className={styles.attachBtn}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Paperclip size={16} />
                            {screenshots.length === 0 ? 'Attach Screenshot' : 'Add Another'}
                        </button>
                    )}
                </div>

                {/* Result Message */}
                {result && (
                    <div className={`${styles.resultMessage} ${result.type === 'success' ? styles.resultSuccess : styles.resultError}`}>
                        {result.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        {result.message}
                    </div>
                )}

                {/* Submit */}
                <button
                    className={styles.submitBtn}
                    onClick={handleSubmit}
                    disabled={submitting || !description.trim()}
                >
                    {submitting ? (
                        'Submitting...'
                    ) : (
                        <>
                            <Send size={16} />
                            Submit Report
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
