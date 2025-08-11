"use client";
import { useEffect, useRef, useState } from "react";
import { Ion, Viewer, Cesium3DTileset, KmlDataSource, GridImageryProvider, Cartesian3, Math as CesiumMath, PointGraphics, Color } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import { accessToken } from "../../cesium.config";
import {
  Globe,
  HelpCircle,
  Maximize2,
  Minimize2,
  Layers,
  Settings,
  X,
  Sun,
  Moon,
  Eye,
  Building,
  Map,
  Navigation,
  Grid3x3,

  Plane,
  Anchor,
  Users,
  Shield,
  MapPinHouse,
  Sparkles
} from "lucide-react";

export default function WorldPage() {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const tilesetRef = useRef<Cesium3DTileset | null>(null);
  const airportsRef = useRef<KmlDataSource | null>(null);
  const statesProvincesRef = useRef<KmlDataSource | null>(null);
  const portsRef = useRef<KmlDataSource | null>(null);
  const bordersRef = useRef<KmlDataSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    showSun: false,
    showMoon: false,
    showSkyAtmosphere: false,
    enableLighting: false,
    showWaterEffect: true,
    showPhotorealistic3DTiles: false,
    showCountryBorders: false,
    showCityNames: false,
    showCoordinateGrid: false,
    enableDepthTesting: false,
    showGroundAtmosphere: true,
    showSkyBox: false,
    showAirports: false,
    showStatesProvinces: false,
    showPorts: false,
    showBorders: false
  });

  // Helper functions for KML management
  const loadKmlData = async (
    viewer: Viewer,
    dataSourceRef: React.MutableRefObject<KmlDataSource | null>,
    filePath: string
  ) => {
    try {
      if (!dataSourceRef.current) {
        const { KmlDataSource, HeightReference, ConstantProperty } = await import("cesium");
        dataSourceRef.current = await KmlDataSource.load(filePath, { clampToGround: false });
        viewer.dataSources.add(dataSourceRef.current);

        dataSourceRef.current.entities.values.forEach(function (entity) {
          
          
          if (entity.point) {
            entity.point.heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
            entity.point.pixelSize = new ConstantProperty(100);
          }
        });
      }
    } catch (error) {
      console.error(`Error loading KML data from ${filePath}:`, error);
    }
  };

  const removeKmlData = (
    viewer: Viewer,
    dataSourceRef: React.MutableRefObject<KmlDataSource | null>
  ) => {
    if (dataSourceRef.current) {
      viewer.dataSources.remove(dataSourceRef.current);
      dataSourceRef.current = null;
    }
  };

  // Function to load Google Photorealistic 3D Tiles
  const loadPhotorealistic3DTiles = async (viewer: Viewer) => {
    try {
      const { createGooglePhotorealistic3DTileset } = await import("cesium");
      const tileset = await createGooglePhotorealistic3DTileset();
      viewer.scene.primitives.add(tileset);
      tilesetRef.current = tileset;
    } catch (error) {
      console.log(`Failed to load tileset: ${error}`);
    }
  };

  // Function to remove Photorealistic 3D Tiles
  const removePhotorealistic3DTiles = (viewer: Viewer) => {
    if (tilesetRef.current) {
      viewer.scene.primitives.remove(tilesetRef.current);
      tilesetRef.current = null;
    }
  };

  useEffect(() => {
    Ion.defaultAccessToken = accessToken;
    (window as unknown as { CESIUM_BASE_URL: string }).CESIUM_BASE_URL = "/cesium";

    let viewer: Viewer | undefined;
    if (cesiumContainerRef.current) {
      viewer = new Viewer(cesiumContainerRef.current, {
        shouldAnimate: true,
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        fullscreenButton: false,
      });

      viewerRef.current = viewer;

      // Apply initial settings
      // Store the original skybox for toggling
      const originalSkyBox = viewer.scene.skyBox;
      if (!settings.showSkyBox) {
        viewer.scene.skyBox = undefined;
      }
      if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = settings.showSkyAtmosphere;
      if (viewer.scene.sun) viewer.scene.sun.show = settings.showSun;
      if (viewer.scene.moon) viewer.scene.moon.show = settings.showMoon;
      viewer.scene.globe.enableLighting = settings.enableLighting;
      viewer.scene.globe.showWaterEffect = settings.showWaterEffect;
      viewer.scene.globe.depthTestAgainstTerrain = settings.enableDepthTesting;
      viewer.scene.globe.showGroundAtmosphere = settings.showGroundAtmosphere;

      // Store original skybox reference for later use
      (viewer as unknown as { originalSkyBox: typeof originalSkyBox }).originalSkyBox = originalSkyBox;

      // City names and labels
      viewer.scene.globe.enableLighting = settings.enableLighting;
      if (settings.showCityNames) {
        viewer.scene.globe.tileCacheSize = 100;
      }

      // Hide loading when viewer is ready
      setTimeout(() => {
        setIsLoading(false);
      }, 2000);
    }

    return () => {
      if (viewer) viewer.destroy();
    };
  }, []);

  // Update viewer settings when state changes
  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current;
      if (viewer.scene.sun) viewer.scene.sun.show = settings.showSun;
      if (viewer.scene.moon) viewer.scene.moon.show = settings.showMoon;
      if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = settings.showSkyAtmosphere;
      viewer.scene.globe.enableLighting = settings.enableLighting;
      viewer.scene.globe.showWaterEffect = settings.showWaterEffect;
      viewer.scene.globe.depthTestAgainstTerrain = settings.enableDepthTesting;
      viewer.scene.globe.showGroundAtmosphere = settings.showGroundAtmosphere;

      // Handle sky box toggle - simple approach
      if (settings.showSkyBox) {
        // Restore original skybox if available
        if ((viewer as unknown as { originalSkyBox?: typeof viewer.scene.skyBox }).originalSkyBox && !viewer.scene.skyBox) {
          viewer.scene.skyBox = (viewer as unknown as { originalSkyBox?: typeof viewer.scene.skyBox }).originalSkyBox;
        }
      } else {
        viewer.scene.skyBox = undefined;
      }
    }
  }, [
    settings.showSun,
    settings.showMoon,
    settings.showSkyAtmosphere,
    settings.enableLighting,
    settings.showWaterEffect,
    settings.enableDepthTesting,
    settings.showGroundAtmosphere,
    settings.showSkyBox,
    settings.showCityNames
  ]);

  // Handle Photorealistic 3D Tiles toggle separately
  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current;

      if (settings.showPhotorealistic3DTiles) {
        // Turn off globe and load 3D tiles
        viewer.scene.globe.show = false;
        loadPhotorealistic3DTiles(viewer);
      } else {
        // Turn on globe and remove 3D tiles
        viewer.scene.globe.show = true;
        removePhotorealistic3DTiles(viewer);
      }
    }
  }, [settings.showPhotorealistic3DTiles]);



  // Handle Coordinate Grid toggle
  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current;

      if (settings.showCoordinateGrid) {
        const gridProvider = new GridImageryProvider({});
        viewer.scene.imageryLayers.addImageryProvider(gridProvider);
      } else {
        // Remove grid if it exists
        const layers = viewer.scene.imageryLayers;
        for (let i = layers.length - 1; i >= 0; i--) {
          const layer = layers.get(i);
          if (layer.imageryProvider instanceof GridImageryProvider) {
            layers.remove(layer);
          }
        }
      }
    }
  }, [settings.showCoordinateGrid]);



  // Handle Airports toggle
  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current;

      if (settings.showAirports) {
        loadKmlData(viewer, airportsRef, '/airports.kml');
      } else {
        removeKmlData(viewer, airportsRef);
      }
    }
  }, [settings.showAirports]);

  // Handle States/Provinces toggle
  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current;

      if (settings.showStatesProvinces) {
        loadKmlData(viewer, statesProvincesRef, '/states_provinces.kml');
      } else {
        removeKmlData(viewer, statesProvincesRef);
      }
    }
  }, [settings.showStatesProvinces]);

  // Handle Ports toggle
  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current;

      if (settings.showPorts) {
        loadKmlData(viewer, portsRef, '/ports.kml');
      } else {
        removeKmlData(viewer, portsRef);
      }
    }
  }, [settings.showPorts]);


  // Handle Borders toggle
  useEffect(() => {
    if (viewerRef.current) {
      const viewer = viewerRef.current;

      if (settings.showBorders) {
        loadKmlData(viewer, bordersRef, '/borders.kml');
      } else {
        removeKmlData(viewer, bordersRef);
      }
    }
  }, [settings.showBorders]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Handle click outside to close modals
  const handleModalBackdropClick = (e: React.MouseEvent, closeModal: () => void) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const resetView = () => {
    if (viewerRef.current) {
      const viewer = viewerRef.current;

      try {
        viewer.camera.flyTo({
          destination: Cartesian3.fromDegrees(0, 20, 25000000),
          orientation: {
            heading: CesiumMath.toRadians(0),
            pitch: CesiumMath.toRadians(-90),
          },
          duration: 1
        });
      } catch (err) {
        console.error('Error resetting camera:', err);
      }
    }
  };

  return (
    <div className="h-screen w-full bg-background relative">
      {/* Loading Animation */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-black flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <Globe className="absolute inset-0 m-auto w-8 h-8 text-blue-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-foreground text-xl font-bold">Loading World</h2>
              <p className="text-muted-foreground">Initializing 3D Earth visualization...</p>
            </div>
          </div>
        </div>
      )}

      {/* Cesium Container */}
      <div ref={cesiumContainerRef} style={{ width: "100%", height: "100vh" }} />

      {/* Control Buttons */}
      {!isLoading && (
        <div className="absolute top-4 right-4 z-40 flex space-x-2">
          {/* Help Button */}
          <button
            onClick={() => setShowInstructions(true)}
            className="cursor-pointer w-10 h-10 bg-black/60 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm"
            title="Controls & Instructions"
          >
            <HelpCircle className="w-5 h-5 text-foreground" />
          </button>
          {/* Reset View Button */}
          <button
            onClick={() => resetView()}
            className="cursor-pointer w-10 h-10 bg-black/60 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm"
            title="Reset View"
          >
            <MapPinHouse className="w-5 h-5 text-foreground" />
          </button>

          {/* Layers Button */}
          <button
            onClick={() => setShowLayers(true)}
            className="cursor-pointer w-10 h-10 bg-black/60 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm"
            title="Layers"
          >
            <Layers className="w-5 h-5 text-foreground" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="cursor-pointer w-10 h-10 bg-black/60 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-foreground" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="cursor-pointer w-10 h-10 bg-black/60 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-foreground" />
            ) : (
              <Maximize2 className="w-5 h-5 text-foreground" />
            )}
          </button>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => handleModalBackdropClick(e, () => setShowInstructions(false))}
        >
          <div className="bg-black border border-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[85vh] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Navigation Controls</h3>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="w-8 h-8 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center transition-all duration-200"
              >
                <X className="cursor-pointer w-4 h-4 text-gray-300" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-8rem)] pr-2 custom-scrollbar">
              <div className="space-y-4">
                {/* Mouse Controls */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                    <span>Mouse Controls</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4 p-3 bg-gray-900 rounded-xl border border-gray-800">
                      <div className="w-8 h-8 bg-black border border-gray-700 rounded-lg flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      </div>
                      <div>
                        <div className="text-white font-medium">Left Click + Drag</div>
                        <div className="text-gray-400 text-sm">Rotate the globe</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-3 bg-gray-900 rounded-xl border border-gray-800">
                      <div className="w-8 h-8 bg-black border border-gray-700 rounded-lg flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-sm"></div>
                      </div>
                      <div>
                        <div className="text-white font-medium">Right Click + Drag Up/Down</div>
                        <div className="text-gray-400 text-sm">Zoom in and out</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-3 bg-gray-900 rounded-xl border border-gray-800">
                      <div className="w-8 h-8 bg-black border border-gray-700 rounded-lg flex items-center justify-center">
                        <div className="w-3 h-3 border-2 border-white rounded-full"></div>
                      </div>
                      <div>
                        <div className="text-white font-medium">Scroll Up/Down</div>
                        <div className="text-gray-400 text-sm">Zoom in and out</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-3 bg-gray-900 rounded-xl border border-gray-800">
                      <div className="w-8 h-8 bg-black border border-gray-700 rounded-lg flex items-center justify-center">
                        <div className="text-xs text-white font-bold">⇧</div>
                      </div>
                      <div>
                        <div className="text-white font-medium">Shift + Left Click + Drag</div>
                        <div className="text-gray-400 text-sm">Rotate camera angle</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-3 bg-gray-900 rounded-xl border border-gray-800">
                      <div className="w-8 h-8 bg-black border border-gray-700 rounded-lg flex items-center justify-center">
                        <div className="text-xs text-white font-bold">⌃</div>
                      </div>
                      <div>
                        <div className="text-white font-medium">Ctrl + Left Click + Drag</div>
                        <div className="text-gray-400 text-sm">Change camera position</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-3 bg-gray-900 rounded-xl border border-gray-800">
                      <div className="w-8 h-8 bg-black border border-gray-700 rounded-lg flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full relative">
                          <div className="absolute inset-0 border border-gray-500 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <div className="text-white font-medium">Middle Click + Drag</div>
                        <div className="text-gray-400 text-sm">Change camera position</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                    <span>Quick Actions</span>
                  </h4>
                  <div className="space-y-2">

                    <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800">
                      <span className="text-white font-medium">Reset View Button</span>
                      <span className="text-gray-400 text-sm">Return to default view</span>
                    </div>
                  </div>
                </div>

                {/* Pro Tip */}
                <div className="mt-6 p-4 bg-gray-900 rounded-xl border border-gray-800">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">💡</span>
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">Pro Tip</div>
                      <div className="text-gray-300 text-sm mt-1">Use the settings panel to customize your viewing experience with different layers and visual effects!</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layers Modal */}
      {showLayers && (
        <div
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => handleModalBackdropClick(e, () => setShowLayers(false))}
        >
          <div className="bg-black border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Data Layers</h3>
              </div>
              <button
                onClick={() => setShowLayers(false)}
                className="w-8 h-8 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center transition-all duration-200"
              >
                <X className="cursor-pointer w-4 h-4 text-gray-300" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-white">Base Imagery</div>
                    <div className="text-gray-400 text-sm">Bing Maps Satellite</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl opacity-60">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-gray-300">Air Traffic</div>
                    <div className="text-gray-500 text-sm">Coming soon...</div>
                  </div>
                </div>
              </div>
                <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl opacity-60">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <div>
                  <div className="font-medium text-gray-300">Naval Traffic</div>
                  <div className="text-gray-500 text-sm">Coming soon...</div>
                  </div>
                </div>
                </div>
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl opacity-60">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <div>
                    <div className="font-medium text-gray-300">Weather Layer</div>
                    <div className="text-gray-500 text-sm">Coming soon...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => handleModalBackdropClick(e, () => setShowSettings(false))}
        >
          <div className="bg-black border border-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[85vh] shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center transition-all duration-200"
              >
                <X className="cursor-pointer w-4 h-4 text-gray-300" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(85vh-8rem)] pr-2 custom-scrollbar">
              <div className="space-y-6">
                {/* Celestial Objects Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                    <span>Celestial Objects</span>
                  </h4>

                  {/* Sky Box Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Sparkles className="w-5 h-5 text-blue-300" />
                      <span className="text-white font-medium">Star Field</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showSkyBox', !settings.showSkyBox)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showSkyBox ? 'bg-blue-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showSkyBox ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Sun Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Sun className="w-5 h-5 text-yellow-500" />
                      <span className="text-white font-medium">Show Sun</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showSun', !settings.showSun)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showSun ? 'bg-yellow-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showSun ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Moon Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Moon className="w-5 h-5 text-gray-400" />
                      <span className="text-white font-medium">Show Moon</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showMoon', !settings.showMoon)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showMoon ? 'bg-gray-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showMoon ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Atmosphere & Environment Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                    <span>Atmosphere & Environment</span>
                  </h4>

                  {/* Sky Atmosphere Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Eye className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-medium">Sky Atmosphere</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showSkyAtmosphere', !settings.showSkyAtmosphere)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showSkyAtmosphere ? 'bg-blue-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showSkyAtmosphere ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Ground Atmosphere Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-cyan-400" />
                      <span className="text-white font-medium">Ground Atmosphere</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showGroundAtmosphere', !settings.showGroundAtmosphere)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showGroundAtmosphere ? 'bg-cyan-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showGroundAtmosphere ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Lighting Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Sun className="w-5 h-5 text-orange-400" />
                      <span className="text-white font-medium">Enable Lighting</span>
                    </div>
                    <button
                      onClick={() => updateSetting('enableLighting', !settings.enableLighting)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.enableLighting ? 'bg-orange-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.enableLighting ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Surface & Water Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                    <span>Surface & Water</span>
                  </h4>

                  {/* Water Effect Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-blue-500 rounded-full" />
                      <span className="text-white font-medium">Water Effect</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showWaterEffect', !settings.showWaterEffect)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showWaterEffect ? 'bg-blue-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showWaterEffect ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Photorealistic 3D Tiles Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Building className="w-5 h-5 text-green-500" />
                      <span className="text-white font-medium">3D Buildings</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showPhotorealistic3DTiles', !settings.showPhotorealistic3DTiles)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showPhotorealistic3DTiles ? 'bg-green-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showPhotorealistic3DTiles ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Infrastructure & Places Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                    <span>Infrastructure & Places</span>
                  </h4>

                  {/* Airports Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Plane className="w-5 h-5 text-blue-500" />
                      <span className="text-white font-medium">Airports</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showAirports', !settings.showAirports)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showAirports ? 'bg-blue-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showAirports ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Ports Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Anchor className="w-5 h-5 text-cyan-500" />
                      <span className="text-white font-medium">Ports</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showPorts', !settings.showPorts)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showPorts ? 'bg-cyan-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showPorts ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* International Borders Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Map className="w-5 h-5 text-red-500" />
                      <span className="text-white font-medium">International Borders</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showBorders', !settings.showBorders)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showBorders ? 'bg-red-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showBorders ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* States/Provinces Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-purple-500" />
                      <span className="text-white font-medium">States/Provinces</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showStatesProvinces', !settings.showStatesProvinces)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showStatesProvinces ? 'bg-purple-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showStatesProvinces ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Advanced Settings Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
                    <span>More</span>
                  </h4>

                  {/* Depth Testing Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Eye className="w-5 h-5 text-purple-500" />
                      <span className="text-white font-medium">Depth Testing</span>
                    </div>
                    <button
                      onClick={() => updateSetting('enableDepthTesting', !settings.enableDepthTesting)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.enableDepthTesting ? 'bg-purple-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.enableDepthTesting ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Coordinate Grid Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3">
                      <Grid3x3 className="w-5 h-5 text-gray-500" />
                      <span className="text-white font-medium">Coordinate Grid</span>
                    </div>
                    <button
                      onClick={() => updateSetting('showCoordinateGrid', !settings.showCoordinateGrid)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showCoordinateGrid ? 'bg-gray-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showCoordinateGrid ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>
      )}

      <style global jsx>{`
        .cesium-viewer-bottom {
          display: none !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}