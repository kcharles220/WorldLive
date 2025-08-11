"use client";

import { ModeToggle } from "@/components/theme-toggle";
import { useState, useEffect } from "react";
import { AnimatedThemeToggler } from "../magicui/animated-theme-toggler";

interface HeaderProps {
    onScrollToSection: (sectionId: string) => void;
}

export function Header({ onScrollToSection }: HeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`
      fixed top-6 left-1/2 transform -translate-x-1/2 transition-all duration-300 ease-out z-50
      ${isScrolled ? 'w-[98%] max-w-6xl' : 'w-[95%] max-w-5xl'}
    `}>
            {/* Clean floating container */}
            <div className={`
        relative transition-all duration-300 ease-out
        ${isScrolled
                    ? 'rounded-2xl bg-background/95 backdrop-blur-xl border border-border/40 shadow-lg'
                    : 'rounded-3xl bg-background/90 backdrop-blur-2xl border border-border/30 shadow-xl'
                }
      `}>

                {/* Main content */}
                <div className={`
          px-6 flex justify-between items-center transition-all duration-300
          ${isScrolled ? 'py-3' : 'py-4'}
        `}>

                    {/* Clean logo */}
                    <div className="flex items-center space-x-3 group">
                        <div className={`
              transition-all duration-300 group-hover:scale-105
              ${isScrolled ? 'w-9 h-9 rounded-xl' : 'w-10 h-10 rounded-2xl'}
              bg-gradient-to-br from-blue-500 to-purple-600 
              shadow-md group-hover:shadow-lg
              flex items-center justify-center
            `}>
                            <span className={`
                font-semibold text-white transition-all duration-300
                ${isScrolled ? 'text-base' : 'text-lg'}
              `}>🌍</span>
                        </div>

                        <span className={`
              font-bold text-foreground transition-all duration-300
              ${isScrolled ? 'text-xl' : 'text-2xl'}
            `}>
                            WorldLive
                        </span>
                    </div>

                    {/* Clean navigation - centered */}
                    <nav className="hidden md:flex items-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
                        {[
                            { label: 'World', action: () => window.location.href = '/world' },
                            { label: 'Features', action: () => onScrollToSection('features') },
                            { label: 'About', action: () => onScrollToSection('about') }
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className="
                  px-4 py-2 rounded-xl font-medium transition-all duration-200
                  text-muted-foreground hover:text-foreground
                  hover:bg-accent/80
                "
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <AnimatedThemeToggler />
                </div>
            </div>
        </header>
    );
}
