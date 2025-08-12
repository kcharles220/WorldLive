"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe } from "@/components/magicui/globe";
import { Home, RotateCcw, MapPin } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-20 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        
        {/* Error Code with Animation */}
        <div className="relative mb-8">
          <h1 className="text-[8rem] sm:text-[12rem] lg:text-[16rem] font-bold text-transparent bg-gradient-to-b from-foreground/20 to-foreground/5 bg-clip-text leading-none select-none">
            404
          </h1>
          
          {/* Floating Globe in the "0" */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 opacity-60">
              <Globe 
                className="!relative !inset-auto" 
                config={{
                  width: 200,
                  height: 200,
                  mapSamples: 8000,
                  markers: [
                    { location: [37.7749, -122.4194], size: 0.1 }, // San Francisco
                    { location: [40.7128, -74.0060], size: 0.1 },  // New York
                    { location: [51.5074, -0.1278], size: 0.1 },   // London
                    { location: [35.6762, 139.6503], size: 0.1 },  // Tokyo
                  ]
                }}
              />
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="text-center space-y-6 max-w-2xl mx-auto">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Oops! Page Not Found
            </h2>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
              The page you&apos;re looking for seems to have drifted away into space.
              
            </p>
          </div>

          {/* Interactive Elements */}
          <div className="flex flex-col items-center space-y-4 pt-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-md">
              <div className="bg-card border border-border/40 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">Connection Lost</span>
                </div>
              </div>
              <div className="bg-card border border-border/40 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Location Unknown</span>
                </div>
              </div>
              <div className="bg-card border border-border/40 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-sm text-muted-foreground">Searching...</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/">
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Home className="w-5 h-5 mr-2" />
                  Return Home
                </Button>
              </Link>
              
              <Link href="/world">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6 border-2 hover:bg-accent/50 transition-all duration-300"
                >
                  <Globe className="w-5 h-5 mr-2" />
                  Explore World
                </Button>
              </Link>
            </div>

            
          </div>
        </div>
      </div>

      {/* Background Globe Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-1/2 -right-1/4 w-[120%] h-[120%] opacity-5">
          <Globe 
            className="!relative !inset-auto" 
            config={{
              width: 1200,
              height: 1200,
              mapSamples: 4000,
              phi: 0.5,
              theta: 0.3,
            }}
          />
        </div>
      </div>

      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-500/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
