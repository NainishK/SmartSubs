import Sidebar from '@/components/Sidebar';
import styles from './dashboard.module.css';
import { RecommendationsProvider } from '@/context/RecommendationsContext';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.layout}>
            <Sidebar />
            <main className={styles.mainContent}>
                <RecommendationsProvider>
                    {children}
                </RecommendationsProvider>
            </main>
        </div>
    );
}
