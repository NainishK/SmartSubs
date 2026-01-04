import { AlertTriangle } from 'lucide-react';
import styles from './WasteKiller.module.css';

export default function WasteKiller() {
    return (
        <div className={styles.container}>
            <div className={styles.alertCard}>
                <div className={styles.header}>
                    <div className={styles.iconWrapper}>
                        <AlertTriangle size={24} />
                    </div>
                    <span className={styles.title}>Unused Subscription Detected</span>
                </div>

                <div className={styles.content}>
                    <div className={styles.serviceInfo}>
                        <span className={styles.serviceName}>SonyLIV</span>
                        <span className={styles.lastUsed}>Last used: 45 days ago</span>
                    </div>
                    <div className={styles.savingsTag}>
                        Save ₹299/mo
                    </div>
                </div>

                <div className={styles.actions}>
                    <div className={styles.btnKeep}>Keep</div>
                    <div className={styles.btnCancel}>Cancel Subscription</div>
                </div>
            </div>
        </div>
    );
}
