import { Github, Globe, Linkedin, Mail } from "lucide-react";

interface FooterProps {
  onScrollToSection: (sectionId: string) => void;
}

export function Footer({ onScrollToSection }: FooterProps) {
  return (
    <footer className="relative overflow-hidden bg-background">
      {/* Subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-muted/20 to-transparent" />

      <div className="relative w-full py-16 px-4 sm:px-6 lg:px-8 border-t border-border/30">
        <div className="max-w-6xl mx-auto">

          {/* Main Footer Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">

            {/* Brand Section */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">WorldLive</h3>
                  <p className="text-xs text-muted-foreground">Real-time visualization</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                Experience the world through interactive 3D data visualization and real-time global insights.
              </p>
            </div>

            {/* Navigation */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Navigate</h4>
              <div className="space-y-2">
                {[
                  { label: 'Top', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
                  { label: 'Features', action: () => onScrollToSection('features') },
                  { label: 'About', action: () => onScrollToSection('about') },

                ].map((link) => (
                  <button
                    key={link.label}
                    onClick={link.action}
                    className="cursor-pointer block text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 text-left"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Connect */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground">Connect</h4>
              <div className="space-y-2">
                <a
                  href="mailto:carlos.ppinto220@gmail.com"
                  className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  aria-label="Email"
                >
                  <Mail />

                  <span>carlos.ppinto220@gmail.com</span>
                </a>
                <a
                  href="https://github.com/kcharles220"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  aria-label="GitHub"
                >
                  <Github />

                  <span>GitHub</span>
                </a>
                <a
                  href="https://www.linkedin.com/in/carlospinto03/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  aria-label="LinkedIn"
                >
                  <Linkedin />

                  <span>LinkedIn</span>
                </a>

              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t border-border/30">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
              <p className="text-sm text-muted-foreground">
                © 2025 WorldLive. All rights reserved.
              </p>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <span>Made with</span>
                <span className="text-red-500">♥</span>
                <span>for exploration</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
