"use client";

import { Button } from "@/components/ui/button";
import { Globe } from "@/components/magicui/globe";


interface HeroProps {
  onScrollToSection: (sectionId: string) => void;
}

export function Hero({ onScrollToSection }: HeroProps) {
  return (
    <main className="relative z-0 h-[100vh] flex flex-col px-4 sm:px-6 lg:px-8 overflow-hidden">
      


      {/* Hero Content - Upper Section */}
      <div className="relative z-20 flex-1 flex items-center justify-center pt-16 ">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Explore Earth in
              <span className="block bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Real-Time 3D
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Watch live flights, ships, weather patterns, and earthquakes on an interactive 3D globe.
              Click on any object to discover detailed information about what's happening around the world.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="text-lg px-8 py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Explore the World
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 border-2 hover:bg-accent/50 transition-all duration-300"
              onClick={() => onScrollToSection('features')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      {/* Globe at Bottom */}
      <div className="absolute left-1/2 transform -translate-x-1/2 top-[85%]">
        <div className="w-[800px] h-[800px] scale-200 opacity-20">
          <Globe className="!relative !inset-auto" />
        </div>
      </div>
    </main>
  );
}
