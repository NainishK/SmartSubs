"use client";

import { Moon, Sun } from "lucide-react";
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

    return (
        <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={`
                flex items-center w-full text-left transition-colors duration-200
                ${isCollapsed ? 'justify-center p-2' : ''}
                ${className}
            `}
            aria-label="Toggle theme"
            title={isCollapsed ? (theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode") : ""}
        >
            <span className="flex items-center justify-center min-w-[24px]">
                {theme === "dark" ? (
                    <Sun className="h-5 w-5 text-amber-500" />
                ) : (
                    <Moon className="h-5 w-5" />
                )}
            </span>

            {!isCollapsed && (
                <span className="font-medium text-[0.95rem]">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
            )}
        </button>
    );
}
