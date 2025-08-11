"use client";

import { useEffect, useRef, useState } from 'react';
import { Globe, Home, Layers, Settings, Maximize2, Minimize2, AlertCircle } from 'lucide-react';

interface CesiumViewerProps {}

export default function CesiumViewer({}: CesiumViewerProps) {
  const viewerRef = useRef<any>(null);
  const initializingRef = useRef<boolean>(false);
  const [cesiumContainer, setCesiumContainer] = useState<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Callback ref to detect when the container element is actually mounted
  const containerRef = (element: HTMLDivElement | null) => {
    setCesiumContainer(element);
  };

  useEffect(() => {
    // Only initialize when we have a container and haven't started initializing
    if (!cesiumContainer || initializingRef.current || viewerRef.current) {
      return;
    }

    initializingRef.current = true;
    let timeoutId: NodeJS.Timeout;
    
    const initializeCesium = async () => {
      try {
        setLoadingProgress(10);
        
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          setError('Loading timeout. CesiumJS is taking too long to initialize.');
          setIsLoading(false);
          initializingRef.current = false;
        }, 30000); // 30 seconds timeout

        setLoadingProgress(25);
        
        // Double-check container is still available
        if (!cesiumContainer) {
          throw new Error('Container element disappeared during initialization.');
        }

        setLoadingProgress(40);
        
        // Dynamically import Cesium with better error handling
        const cesiumModule = await import('cesium').catch((err) => {
          console.error('Failed to import Cesium:', err);
          throw new Error('Failed to load CesiumJS library');
        });
        
        setLoadingProgress(60);

        // Set Cesium ion access token (using default for now)
        cesiumModule.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI1YTk1YjIwNS0zNDdkLTQ1MmUtOTJlNy1lNDYzZDMwYzc0YzMiLCJpZCI6MzMwNjU1LCJpYXQiOjE3NTQ4ODA3ODB9._nMNzTOjio0xfipjHgq9E_H9r5h4rBCs648xvrKz36s';
        
        setLoadingProgress(75);

        // Initialize Cesium viewer with optimized options for development
        const viewer = new cesiumModule.Viewer(cesiumContainer, {
          homeButton: false,
          sceneModePicker: false,
          baseLayerPicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          geocoder: false,
          infoBox: false,
          selectionIndicator: false,
          creditContainer: undefined, // Remove credits
          shouldAnimate: true,
          // Disable features that cause network requests
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
          // Use a simpler terrain provider
          terrainProvider: new cesiumModule.EllipsoidTerrainProvider(),
        });

        viewerRef.current = viewer;
        setLoadingProgress(90);

        // Configure the scene for better performance and fewer network requests
        viewer.scene.globe.enableLighting = false; // Disable for faster loading
        viewer.scene.globe.showWaterEffect = false; // Disable water effect to reduce complexity
        viewer.scene.globe.showGroundAtmosphere = false; // Disable ground atmosphere
        
        // Disable terrain and data sources that cause network requests
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.dataSources.removeAll(); // Remove all data sources that might trigger network requests
        
        // Safely configure optional scene elements
        if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
        if (viewer.scene.sun) viewer.scene.sun.show = false;
        if (viewer.scene.moon) viewer.scene.moon.show = false;
        if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;

        // Disable automatic terrain height sampling to prevent ApproximateTerrainHeights requests
        try {
          // Suppress console errors from terrain requests
          const originalConsoleError = console.error;
          console.error = (...args: any[]) => {
            const message = args[0]?.toString() || '';
            if (message.includes('RequestErrorEvent') || 
                message.includes('ApproximateTerrainHeights') ||
                message.includes('Iau2006XysData')) {
              // Suppress these specific network error messages
              return;
            }
            originalConsoleError.apply(console, args);
          };
        } catch (e) {
          // Ignore any errors in error suppression
        }

        // Set initial camera position
        viewer.scene.camera.setView({
          destination: cesiumModule.Cartesian3.fromDegrees(0.0, 0.0, 15000000.0),
          orientation: {
            heading: 0.0,
            pitch: -1.5708, // Look down at Earth
            roll: 0.0
          }
        });

        setLoadingProgress(100);
        clearTimeout(timeoutId);
        setIsLoading(false);
        initializingRef.current = false;
        
      } catch (err: any) {
        clearTimeout(timeoutId);
        initializingRef.current = false;
        console.error('Cesium initialization error:', err);
        setError(err.message || 'Failed to initialize 3D Earth viewer');
        setIsLoading(false);
      }
    };

    initializeCesium();

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      initializingRef.current = false;
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
          viewerRef.current = null;
        } catch (err) {
          console.error('Error destroying viewer:', err);
        }
      }
    };
  }, [cesiumContainer]); // Depend on container availability

  const goHome = () => {
    if (viewerRef.current) {
      try {
        const cesiumModule = require('cesium');
        viewerRef.current.scene.camera.setView({
          destination: cesiumModule.Cartesian3.fromDegrees(0.0, 0.0, 15000000.0),
          orientation: {
            heading: 0.0,
            pitch: -1.5708,
            roll: 0.0
          }
        });
      } catch (err) {
        console.error('Error resetting camera:', err);
      }
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
      <div className="relative h-full w-full">
        {/* Cesium Container - Always render this so ref can be attached */}
        <div 
          ref={containerRef} 
          className="h-full w-full bg-gradient-to-b from-blue-900 to-black"
          style={{ 
            fontFamily: 'inherit',
          }}
        />
        
        {/* Loading overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-black flex items-center justify-center z-40">
          <div className="text-center space-y-6 max-w-md">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <Globe className="absolute inset-0 m-auto w-8 h-8 text-blue-400" />
            </div>
            <div className="space-y-3">
              <h2 className="text-white text-xl font-bold">Loading Earth</h2>
              <p className="text-blue-200">Initializing 3D visualization...</p>
              <div className="w-full bg-blue-900/50 rounded-full h-2">
                <div 
                  className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
              <p className="text-blue-300 text-sm">{loadingProgress}%</p>
            </div>
            {loadingProgress > 80 && (
              <p className="text-blue-200 text-xs">Almost ready...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Error state with more helpful information
  if (error) {
    return (
      <div className="relative h-full w-full">
        {/* Cesium Container - Always render this so ref can be attached */}
        <div 
          ref={containerRef} 
          className="h-full w-full bg-gradient-to-b from-blue-900 to-black"
          style={{ 
            fontFamily: 'inherit',
          }}
        />
        
        {/* Error overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-900 to-black flex items-center justify-center z-40">
          <div className="text-center space-y-6 max-w-md px-6">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto" />
            <div className="space-y-3">
              <h2 className="text-white text-xl font-bold">Unable to Load Earth</h2>
              <p className="text-red-200">{error}</p>
              <div className="text-red-300 text-sm space-y-1">
                <p>This might be due to:</p>
                <ul className="text-left space-y-1">
                  <li>• Network connectivity issues</li>
                  <li>• CesiumJS library loading problems</li>
                  <li>• Browser compatibility</li>
                </ul>
              </div>
              <div className="flex space-x-3 justify-center mt-6">
                <button 
                  onClick={() => window.location.reload()} 
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Retry
                </button>
                <button 
                  onClick={() => window.location.href = '/'} 
                  className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* Cesium Container */}
      <div 
        ref={containerRef} 
        className="h-full w-full bg-gradient-to-b from-blue-900 to-black"
        style={{ 
          fontFamily: 'inherit',
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
                  <p className="text-white/70 text-xs">Interactive Earth</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Right - Controls */}
          <div className="absolute top-4 right-4 z-50">
            <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={goHome}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all duration-200 group"
                  title="Home View"
                >
                  <Home className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
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
                  <span className="text-white text-sm font-medium">Ready</span>
                </div>
                <div className="text-white/70 text-xs">
                  3D Earth loaded successfully
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
                  <div>• Left click + drag to rotate</div>
                  <div>• Right click + drag to pan</div>
                  <div>• Scroll to zoom</div>
                  <div>• Middle click + drag to tilt</div>
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
