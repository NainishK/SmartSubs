"use client";

import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import React, { useEffect, useState } from "react";

interface ThemeToggleProps {
    isCollapsed?: boolean;
    className?: string; // Allow external styling
}

export function ThemeToggle({ isCollapsed = false, className = '' }: ThemeToggleProps) {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Avoid hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <div className={`flex items-center gap-3 p-3 rounded-xl opacity-50 ${className} ${isCollapsed ? 'justify-center' : ''}`}>
                <Sun className="h-5 w-5" />
            </div>
        );
    }

    // Cycle theme: light -> dark -> system -> light
    const getNextThemeInfo = () => {
        if (theme === "light") {
            return {
                next: "dark" as const,
                label: "Dark Mode",
                icon: <Moon className="h-5 w-5 text-indigo-400" />,
                title: "Switch to Dark Mode"
            };
        } else if (theme === "dark") {
            return {
                next: "system" as const,
                label: "System Theme",
                icon: <Laptop className="h-5 w-5 text-emerald-400" />,
                title: "Switch to System Theme"
            };
        } else {
            return {
                next: "light" as const,
                label: "Light Mode",
                icon: <Sun className="h-5 w-5 text-amber-500" />,
                title: "Switch to Light Mode"
            };
        }
    };

    const { next, label, icon, title } = getNextThemeInfo();

    return (
        <button
            onClick={() => setTheme(next)}
            className={`
                flex items-center w-full text-left transition-colors duration-200
                ${isCollapsed ? 'justify-center p-2' : ''}
                ${className}
            `}
            aria-label="Toggle theme"
            title={isCollapsed ? title : ""}
        >
            <span className="flex items-center justify-center min-w-[24px]">
                {icon}
            </span>

            {!isCollapsed && (
                <span className="font-medium text-[0.95rem]">
                    {label}
                </span>
            )}
        </button>
    );
}
