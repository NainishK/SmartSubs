'use client';

import React from 'react';
import styles from './AppShowcaseStack.module.css';

const AppShowcaseStack = () => {
    return (
        <div className={styles.stackContainer}>
            {/* Card 1: Unused Alert (Left) */}
            <div className={styles.layer}>
                <img
                    src="/screenshots/unused_alert.png"
                    alt="Waste Killer Alert"
                    className={styles.imageHost}
                />
            </div>

            {/* Card 2: Subscriptions (Middle / Default Hero) */}
            <div className={styles.layer}>
                <img
                    src="/screenshots/subscriptions.png"
                    alt="Track Subscriptions"
                    className={styles.imageHost}
                />
            </div>

            {/* Card 3: Spending (Right) */}
            <div className={styles.layer}>
                <img
                    src="/screenshots/spending.png"
                    alt="Spending Analytics"
                    className={styles.imageHost}
                />
            </div>
        </div>
    );
};

export default AppShowcaseStack;
