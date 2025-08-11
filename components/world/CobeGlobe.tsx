"use client";

import { useEffect, useRef, useState } from 'react';
import { Globe, Home, Layers, Settings, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

interface CobeGlobeProps {}

export default function CobeGlobe({}: CobeGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const globeRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let animationId: number;

    const initializeGlobe = async () => {
      try {
        const COBE = await import('cobe');
        
        if (!canvasRef.current) return;

        let phi = 0;
        let theta = 0;

        const globe = COBE.default(canvasRef.current, {
          devicePixelRatio: 2,
          width: window.innerWidth,
          height: window.innerHeight,
          phi: 0,
          theta: 0,
          dark: 1,
          diffuse: 1.2,
          mapSamples: 16000,
          mapBrightness: 6,
          baseColor: [0.3, 0.3, 0.3],
          markerColor: [0.1, 0.8, 1],
          glowColor: [1, 1, 1],
          markers: [
            // Add some sample markers
            { location: [40.7128, -74.0060], size: 0.03 }, // New York
            { location: [51.5074, -0.1278], size: 0.03 }, // London
            { location: [35.6762, 139.6503], size: 0.03 }, // Tokyo
            { location: [-33.8688, 151.2093], size: 0.03 }, // Sydney
            { location: [1.3521, 103.8198], size: 0.03 }, // Singapore
          ],
          onRender: (state: any) => {
            phi += 0.01;
            state.phi = phi;
            state.theta = theta;
          }
        });

        globeRef.current = globe;
        setIsLoading(false);

        // Handle mouse interactions
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        const handleMouseDown = (e: MouseEvent) => {
          isDragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
        };

        const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging) return;
          
          const deltaX = e.clientX - lastX;
          const deltaY = e.clientY - lastY;
          
          phi += deltaX * 0.01;
          theta = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, theta + deltaY * 0.01));
          
          lastX = e.clientX;
          lastY = e.clientY;
        };

        const handleMouseUp = () => {
          isDragging = false;
        };

        if (canvasRef.current) {
          canvasRef.current.addEventListener('mousedown', handleMouseDown);
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
          if (canvasRef.current) {
            canvasRef.current.removeEventListener('mousedown', handleMouseDown);
          }
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };

      } catch (err) {
        console.error('Failed to initialize COBE globe:', err);
        setIsLoading(false);
      }
    };

    initializeGlobe();

    // Handle window resize
    const handleResize = () => {
      if (canvasRef.current && globeRef.current) {
        const canvas = canvasRef.current;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (globeRef.current) {
        globeRef.current.destroy();
      }
    };
  }, []);

  const resetView = () => {
    // Reset globe rotation
    if (globeRef.current) {
      // This would require access to COBE internals, simplified for now
      window.location.reload();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full w-full bg-gradient-to-b from-blue-900 to-black flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <Globe className="absolute inset-0 m-auto w-8 h-8 text-blue-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-white text-xl font-bold">Loading Earth</h2>
            <p className="text-blue-200">Initializing globe visualization...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black overflow-hidden">
      {/* COBE Globe Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
      
      {/* Custom UI Overlay */}
      {showControls && (
        <>
          {/* Top Left - Brand */}
          <div className="absolute top-4 left-4 z-50">
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg">WorldLive</h1>
                  <p className="text-white/70 text-xs">Interactive Globe</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Right - Controls */}
          <div className="absolute top-4 right-4 z-50">
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={resetView}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all duration-200 group"
                  title="Reset View"
                >
                  <RotateCcw className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                </button>
                <button
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all duration-200 group"
                  title="Layers"
                >
                  <Layers className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all duration-200 group"
                  title="Fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Left - Status */}
          <div className="absolute bottom-4 left-4 z-50">
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">Active</span>
                </div>
                <div className="text-white/70 text-xs">
                  COBE globe ready
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Right - Instructions */}
          <div className="absolute bottom-4 right-4 z-50">
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-4 max-w-xs">
              <div className="space-y-2">
                <h3 className="text-white font-medium text-sm">Controls</h3>
                <div className="space-y-1 text-xs text-white/70">
                  <div>• Click and drag to rotate</div>
                  <div>• Globe auto-rotates when idle</div>
                  <div>• Markers show key locations</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toggle Controls Button (when hidden) */}
      {!showControls && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setShowControls(true)}
            className="w-12 h-12 bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl flex items-center justify-center hover:bg-black/30 transition-all duration-200"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
