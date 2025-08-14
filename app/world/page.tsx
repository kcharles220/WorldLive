"use client";
import { useEffect, useRef, useState } from "react";
import { useVessels, Vessel } from "./hooks/useVessels";
import { useFlights, Flight } from "./hooks/useFlights";
import { useRouter } from "next/navigation";
import { Ion, Viewer, Cesium3DTileset, KmlDataSource, GridImageryProvider, Cartesian3, Math as CesiumMath } from "cesium";
import * as Cesium from "cesium";
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
  Home,
  Plane,
  Anchor,
  Shield,
  MapPinHouse,
  Sparkles,
  CloudRain,
  Activity,
  Box,
  ChevronRight,
  AlertTriangle,
  ChevronLeft,
  ArrowUpFromDot,
  Info,
  Search,
  LocateFixed
} from "lucide-react";

export default function WorldPage() {
  const [flightsCount, setFlightsCount] = useState(0);
  const router = useRouter();
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
  const [showSettings, setShowSettings] = useState(false);
  const [showDataLayers, setShowDataLayers] = useState(true);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFlights, setSearchFlights] = useState(true);
  const [searchVessels, setSearchVessels] = useState(true);
  const [searchResults, setSearchResults] = useState<{
    flights: Flight[];
    vessels: Vessel[];
  }>({ flights: [], vessels: [] });
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Flight popup state
  const [showFlightPopup, setShowFlightPopup] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<{
    icao24: string;
    flightData?: Flight;
  } | null>(null);

  // Settings (default)
  const [settings, setSettings] = useState({
    showSun: true,
    showMoon: true,
    showSkyAtmosphere: true,
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
    showBorders: false,
    showFlights: false,
    showVessels: false,
    use3DFlightModels: false,
    simulateMovement: false
  });

  const { allFlightsDataRef } = useFlights({
    viewerRef,
    showFlights: settings.showFlights,
    simulateMovement: settings.simulateMovement,
    use3DFlightModels: settings.use3DFlightModels,
    maxFlightDistance: settings.use3DFlightModels ? 2000000 : 20000000, // Much larger distances
    Cesium,
    onError: (err: string) => {
      setSettings(prev => ({ ...prev, showFlights: false }));
      setError({
        title: "Flight Data Error",
        message: err
      });
    },
    onFlightsCountChange: setFlightsCount
  });

  // Handle plane click events
  useEffect(() => {
    const handlePlaneClick = (event: Event) => {
      const { icao24, flightData } = (event as CustomEvent).detail;
      setSelectedFlight({ icao24, flightData });
      setShowFlightPopup(true);
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSearch && !target.closest('.search-container')) {
        setShowSearch(false);
        setShowSearchResults(false);
      }
    };

    window.addEventListener('planeClicked', handlePlaneClick);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('planeClicked', handlePlaneClick);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSearch]);

  // Vessel logic handled by useVessels hook
  const { } = useVessels({
    viewerRef,
    showVessels: settings.showVessels,
    Cesium
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

  // Search functionality
  const performSearch = (query: string) => {
    if (!query.trim()) {
      setSearchResults({ flights: [], vessels: [] });
      setShowSearchResults(false);
      return;
    }

    const results = {
      flights: [] as Flight[],
      vessels: [] as Vessel[]
    };

    // Search flights if enabled and flights are shown
    if (searchFlights && settings.showFlights && allFlightsDataRef.current) {
      results.flights = allFlightsDataRef.current.filter(flight =>
        flight.callsign?.toLowerCase().includes(query.toLowerCase()) ||
        flight.icao24?.toLowerCase().includes(query.toLowerCase()) ||
        flight.origin_country?.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Search vessels if enabled and vessels are shown (placeholder for when vessels are implemented)
    if (searchVessels && settings.showVessels) {
      // TODO: Add vessel search when vessel data is available
    }

    setSearchResults(results);
    setShowSearchResults(results.flights.length > 0 || results.vessels.length > 0);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  const selectSearchResult = (flight: Flight) => {
    setSelectedFlight({ icao24: flight.icao24, flightData: flight });
    setShowFlightPopup(true);
    setShowSearch(false);
    setShowSearchResults(false);
    setSearchQuery("");

    moveCameraToFlight(flight);
  };

  const moveCameraToFlight = (flight: Flight) => {
    if (viewerRef.current) {
      const viewer = viewerRef.current;
      const position = Cesium.Cartesian3.fromDegrees(
        flight.longitude,
        flight.latitude,
        (flight.baro_altitude || 10000) + 50000
      );
      viewer.camera.flyTo({
        destination: position,
        duration: 2
      });
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
      <style jsx>{`
                    @keyframes slideX {
                      0%, 100% { transform: translateX(0px); }
                      50% { transform: translateX(-4px); }
                    }
                  `}</style>
      {/* Error Notification */}
      {error && (
        <div className="fixed top-4 inset-x-4 z-[9999] max-w-md mx-auto">
          <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/20 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-2 duration-300 hover:scale-[1.02] transition-all">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-semibold text-sm">{error.title}</h4>
                <p className="text-red-200/80 text-xs mt-1 leading-relaxed">{error.message}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="cursor-pointer w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 flex-shrink-0"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5 text-white/70" />
              </button>
            </div>
          </div>
        </div>
      )}

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
        <>
          {/* Home Button - Top Left */}
          <div className="absolute top-4 left-4 z-40">
            <button
              onClick={() => router.push('/')}
              className="cursor-pointer w-10 h-10 bg-black/85 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/60 transition-all duration-200 shadow-sm"
              title="Go to Home"
            >
              <Home className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Control Buttons - Top Right */}
          <div className="absolute top-4 right-4 z-40 flex space-x-2">
            {/* Search Component */}
            <div className="relative search-container">
              <div className={`flex items-center transition-all duration-300 ease-in-out ${showSearch ? 'w-80' : 'w-24'
                }`}>
                {/* Search Input (appears when expanded) */}
                {showSearch && (
                  <div className="flex-1 bg-black/85 backdrop-blur-sm border border-border rounded-l-lg h-10 flex items-center px-3 gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={handleSearchInputChange}
                      placeholder={
                        !settings.showFlights && !settings.showVessels 
                          ? "Enable data layers to search..."
                          : `Search ${searchFlights && settings.showFlights ? 'flights' : ''}${searchFlights && settings.showFlights && searchVessels && settings.showVessels ? ', ' : ''}${searchVessels && settings.showVessels ? 'vessels' : ''}...`
                      }
                      className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-sm focus:outline-none"
                      autoFocus
                      disabled={!settings.showFlights && !settings.showVessels}
                    />

                    {/* Search Type Indicators */}
                    <div className="flex items-center gap-1">
                      {settings.showFlights && (
                        <button
                          onClick={() => setSearchFlights(!searchFlights)}
                          className={`p-1 rounded transition-colors ${searchFlights ? 'bg-yellow-500/20 text-yellow-400' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          title={`${searchFlights ? 'Disable' : 'Enable'} flight search`}
                        >
                          <Plane className="w-3 h-3" />
                        </button>
                      )}
                      {settings.showVessels && (
                        <button
                          onClick={() => setSearchVessels(!searchVessels)}
                          className={`p-1 rounded transition-colors ${searchVessels ? 'bg-cyan-500/20 text-cyan-400' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          title={`${searchVessels ? 'Disable' : 'Enable'} vessel search`}
                        >
                          <Anchor className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Search Button */}
                <button
                  onClick={() => {
                    if (showSearch) {
                      setShowSearch(false);
                      setShowSearchResults(false);
                      setSearchQuery("");
                    } else {
                      if (!settings.showFlights && !settings.showVessels) {
                        setShowSearch(true);
                        setShowSearchResults(true);
                        setSearchQuery("");
                        setSearchResults({ flights: [], vessels: [] });
                      } else {
                        setShowSearch(true);
                        setSearchFlights(settings.showFlights);
                        setSearchVessels(settings.showVessels);
                      }
                    }
                  }}
                  className={`cursor-pointer h-10 bg-black/85 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm gap-2 ${showSearch ? 'w-10 rounded-r-lg border-l-0' : 'w-25 rounded-lg'
                    }`}
                  title="Search Flights, Vessels and more!"
                >
                  {showSearch ? (
                    <ChevronRight className="w-5 h-5 text-foreground" />
                  ) : (
                    <>
                      <ChevronLeft className="w-5 h-5 text-foreground" />
                      <Search className="w-5 h-5 text-foreground" />
                    </>

                  )}
                </button>
              </div>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-12 right-0 w-80 max-w-[90vw] bg-black/85 backdrop-blur-sm border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar z-52">
                  {/* Flight Results */}
                  {searchResults.flights.length > 0 && (
                    <div className="p-2">
                      <div className="text-xs text-muted-foreground mb-2 px-2 flex items-center gap-1">
                        <Plane className="w-3 h-3" />
                        Flights ({searchResults.flights.length})
                      </div>
                      {searchResults.flights.map((flight) => (
                        <button
                          key={flight.icao24}
                          onClick={() => selectSearchResult(flight)}
                          className="w-full text-left p-2 rounded hover:bg-white/10 transition-colors group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-foreground group-hover:text-yellow-400 transition-colors">
                                {flight.callsign || flight.icao24}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {flight.origin_country || 'Unknown Origin'}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {flight.velocity ? `${Math.round(flight.velocity * 3.6)} km/h` : 'N/A'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Vessel Results (placeholder) */}
                  {searchResults.vessels.length > 0 && (
                    <div className="p-2 border-t border-border">
                      <div className="text-xs text-muted-foreground mb-2 px-2 flex items-center gap-1">
                        <Anchor className="w-3 h-3" />
                        Vessels ({searchResults.vessels.length})
                      </div>
                      {/* Vessel results would go here */}
                    </div>
                  )}

                  {/* No Results or Warning */}
                  {(!settings.showFlights && !settings.showVessels) ? (
                    <div className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        </div>
                      </div>
                      <div className="text-sm font-medium text-amber-400 mb-2">No Data Layers Enabled</div>
                      <div className="text-xs text-muted-foreground mb-3 leading-relaxed">
                        Enable flights or vessels in the Data Layers panel to search for live data.
                      </div>
                      
                      <button
                        onClick={() => {
                          setShowDataLayers(true);
                          setShowSearch(false);
                          setShowSearchResults(false);
                        }}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-xs text-amber-400 transition-colors"
                      >
                        Open Data Layers
                      </button>
                    </div>
                  ) : (
                    searchResults.flights.length === 0 && searchResults.vessels.length === 0 && searchQuery.trim() && (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        No results found for &quot;{searchQuery}&quot;
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Help Button */}
            <button
              onClick={() => setShowInstructions(true)}
              className="cursor-pointer w-10 h-10 bg-black/85 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm"
              title="Controls & Instructions"
            >
              <HelpCircle className="w-5 h-5 text-foreground" />
            </button>
            {/* Reset View Button */}
            <button
              onClick={() => resetView()}
              className="cursor-pointer w-10 h-10 bg-black/85 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm"
              title="Reset View"
            >
              <MapPinHouse className="w-5 h-5 text-foreground" />
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="cursor-pointer w-10 h-10 bg-black/85 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-foreground" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="cursor-pointer w-10 h-10 bg-black/85 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-foreground" />
              ) : (
                <Maximize2 className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>

          {/* Data Layers Toggle Button - Below Fullscreen Button */}
          {!showDataLayers && (
            <button
              onClick={() => setShowDataLayers(true)}
              className="gap-4 cursor-pointer fixed top-16 right-4 z-50 w-22 h-10 bg-black/85 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 shadow-sm transition-all duration-200"
              title="Show Data Layers"
            >
              <ChevronLeft className="w-4 h-4 text-foreground mr-1 animate-pulse" style={{
                animation: 'slideX 4s ease-in-out infinite'
              }} />
              <Layers className="w-5 h-5 text-foreground" />

            </button>
          )}
          {/* Data Layers Panel - Below Fullscreen Button */}
          <div
            className={`fixed top-16 right-4 z-5 transition-all duration-300 ease-in-out ${showDataLayers ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
              }`}
            style={{ width: '18rem', maxWidth: '90vw' }}
          >
            <div className="bg-black/85 border border-border rounded-2xl shadow-2xl backdrop-blur-sm w-full  flex flex-col">

              <div className="p-4 mb-4 border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 justify-center ">
                    <div className="w-9 h-9 bg-blue-500 border border-blue-400 rounded-xl flex items-center justify-center">
                      <Layers className="w-5 h-5 text-black" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Data Layers</h3>
                      <p className="text-gray-400 text-xs">Real-time world data</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDataLayers(false)}
                    className="cursor-pointer w-8 h-8 bg-gray-800/50 hover:bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center transition-all duration-200 group"
                    title="Hide Data Layers"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors duration-200" />
                  </button>
                </div>
              </div>



              <div className="space-y-3 px-3">
                {/* Real-Time Flights */}
                <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-xl hover:border-gray-600 transition-all duration-200">
                  <div className="flex items-center justify-between ">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-yellow-500/20 border border-yellow-500/30 rounded-lg flex items-center justify-center">
                        <Plane className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium">Live Flights</div>
                        <div className="text-gray-400 text-xs">
                          {settings.showFlights ? (
                            <span className="text-green-400">• {flightsCount} flights</span>
                          ) : (
                            'Real-time air traffic'
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      {settings.showFlights && (
                        <button
                          onClick={() => updateSetting('use3DFlightModels', !settings.use3DFlightModels)}
                          className={`cursor-pointer w-8 h-8 rounded-lg transition-all duration-200 flex items-center justify-center ${settings.use3DFlightModels
                            ? 'bg-yellow-400/20 border border-yellow-400/40'
                            : 'bg-gray-700/50 border border-gray-600'
                            }`}
                          title={settings.use3DFlightModels ? "Disable 3D Models" : "Enable 3D Models"}
                        >
                          <Box
                            className={`w-4 h-4 transition-colors duration-200 ${settings.use3DFlightModels ? 'text-yellow-400' : 'text-gray-400'
                              }`}
                          />
                        </button>
                      )}
                      <button
                        onClick={() => updateSetting('showFlights', !settings.showFlights)}
                        className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showFlights ? 'bg-yellow-400' : 'bg-gray-700'}`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showFlights ? 'translate-x-6' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </div>
                  </div>


                </div>

                {/* Naval Traffic */}
                <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-xl opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center">
                        <Anchor className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-gray-300 font-medium">Naval Traffic</div>
                        <div className="text-gray-500 text-xs">Coming soon...</div>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-gray-800 rounded-full">
                      <div className="w-5 h-5 bg-gray-600 rounded-full shadow-lg translate-x-0.5" />
                    </div>
                  </div>
                </div>

                {/* Weather Layer */}
                <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-xl opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center">
                        <CloudRain className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-gray-300 font-medium">Weather</div>
                        <div className="text-gray-500 text-xs">Coming soon...</div>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-gray-800 rounded-full">
                      <div className="w-5 h-5 bg-gray-600 rounded-full shadow-lg translate-x-0.5" />
                    </div>
                  </div>
                </div>

                {/* Natural Events */}
                <div className="p-4 bg-gray-900/30 border border-gray-800 rounded-xl opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center justify-center">
                        <Activity className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <div className="text-gray-300 font-medium">Natural Events</div>
                        <div className="text-gray-500 text-xs">Coming soon...</div>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-gray-800 rounded-full">
                      <div className="w-5 h-5 bg-gray-600 rounded-full shadow-lg translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Info */}
              <div className="mt-4 p-4 border-t border-gray-800">
                <div className="text-xs text-red-500 opacity-95">
                  Be aware of potential performance issues!
                </div>
              </div>
            </div>
          </div>
        </>
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
                className="cursor-pointer w-8 h-8 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center transition-all duration-200"
              >
                <X className="w-4 h-4 text-gray-300" />
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
                className="cursor-pointer w-8 h-8 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center transition-all duration-200"
              >
                <X className="w-4 h-4 text-gray-300" />
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

                {/* More Settings Section */}
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

                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                    <div className="flex items-center space-x-3 relative group">
                      <ArrowUpFromDot className="w-5 h-5 text-indigo-500" />
                      <span className="text-white font-medium">Simulate Movement</span>
                      <div className="relative flex items-center">
                        <Info className="w-5 h-5 text-gray-400 cursor-pointer" />
                        <div className=" absolute left-1/2 bottom-full mb-2 -translate-x-1/2 z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
                          <div className="w-[16rem] max-w-full bg-black/90 border border-gray-700 rounded-lg shadow-lg px-4 py-2 text-xs text-gray-200 flex items-center gap-2">
                            <span>
                              Aircraft positions are estimated using current speed and heading. Real flights may curve or change speed/altitude. Updates are limited to avoid API rate limits.
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('simulateMovement', !settings.simulateMovement)}
                      className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.simulateMovement ? 'bg-indigo-500' : 'bg-gray-700'
                        }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.simulateMovement ? 'translate-x-6' : 'translate-x-0.5'
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

      {/* Flight Popup */}
      {showFlightPopup && selectedFlight && (
        <div className="absolute top-16 left-4 bottom-4 z-40 max-w-md w-90 flex flex-col">
          <div className="bg-black/85 border border-border rounded-2xl shadow-2xl backdrop-blur-sm flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-500 border border-yellow-400 rounded-xl flex items-center justify-center">
                    <Plane className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedFlight.flightData?.callsign}</h3>
                    <p className="text-sm text-gray-400">Live Flight Data</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      if (selectedFlight.flightData) {
                        moveCameraToFlight(selectedFlight.flightData);
                      }
                    }}
                    className="cursor-pointer w-8 h-8 bg-gray-800/50 hover:bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center transition-all duration-200"
                    title="Go to Flight"
                  >
                    <LocateFixed className="w-4 h-4 text-gray-300" />
                  </button>
                  <button
                    onClick={() => setShowFlightPopup(false)}
                    className="cursor-pointer w-8 h-8 bg-gray-800/50 hover:bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center transition-all duration-200"
                    title="Close"
                  >
                    <X className="w-4 h-4 text-gray-300" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {selectedFlight.flightData && (
                <>
                  {/* Basic Info Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Basic Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">ICAO24</span>
                        <span className="text-white font-mono text-sm">{selectedFlight.flightData.icao24 || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Callsign</span>
                        <span className="text-white font-mono text-sm">{selectedFlight.flightData.callsign?.trim() || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Origin Country</span>
                        <span className="text-white text-sm">{selectedFlight.flightData.origin_country || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Squawk</span>
                        <span className="text-white font-mono text-sm">{selectedFlight.flightData.squawk || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Position Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Position</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Longitude</span>
                        <span className="text-white font-mono text-sm">{selectedFlight.flightData.longitude?.toFixed(6) || 'N/A'}°</span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Latitude</span>
                        <span className="text-white font-mono text-sm">{selectedFlight.flightData.latitude?.toFixed(6) || 'N/A'}°</span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">On Ground</span>
                        <span className={`text-sm font-medium ${selectedFlight.flightData.on_ground ? 'text-orange-400' : 'text-green-400'}`}>
                          {selectedFlight.flightData.on_ground ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Altitude & Movement Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Altitude & Movement</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Barometric Alt.</span>
                        <span className="text-white font-mono text-sm">
                          {selectedFlight.flightData.baro_altitude ? `${Math.round(selectedFlight.flightData.baro_altitude).toLocaleString()} m` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Geometric Alt.</span>
                        <span className="text-white font-mono text-sm">
                          {selectedFlight.flightData.geo_altitude ? `${Math.round(selectedFlight.flightData.geo_altitude).toLocaleString()} m` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Velocity</span>
                        <span className="text-white font-mono text-sm">
                          {selectedFlight.flightData.velocity ? `${Math.round(selectedFlight.flightData.velocity * 3.6)} km/h` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">True Track</span>
                        <span className="text-white font-mono text-sm">
                          {selectedFlight.flightData.true_track ? `${Math.round(selectedFlight.flightData.true_track)}°` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Vertical Rate</span>
                        <span className={`font-mono text-sm ${(selectedFlight.flightData.vertical_rate ?? 0) > 0 ? 'text-green-400' :
                          (selectedFlight.flightData.vertical_rate ?? 0) < 0 ? 'text-red-400' : 'text-white'
                          }`}>
                          {selectedFlight.flightData.vertical_rate ?
                            `${selectedFlight.flightData.vertical_rate > 0 ? '+' : ''}${selectedFlight.flightData.vertical_rate.toFixed(1)} m/s` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Aircraft Info Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Aircraft Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Category</span>
                        <span className="text-white text-sm">
                          {(() => {
                            const categories = [
                              'No information', 'No ADS-B Info', 'Light (< 15500 lbs)', 'Small (15500-75000 lbs)',
                              'Large (75000-300000 lbs)', 'High Vortex Large', 'Heavy (> 300000 lbs)', 'High Performance',
                              'Rotorcraft', 'Glider', 'Lighter-than-air', 'Parachutist', 'Ultralight', 'Reserved',
                              'UAV', 'Space Vehicle', 'Emergency Vehicle', 'Service Vehicle', 'Point Obstacle',
                              'Cluster Obstacle', 'Line Obstacle'
                            ];
                            const catIdx = selectedFlight.flightData.category;
                            return typeof catIdx === 'number' && catIdx >= 0 && catIdx < categories.length
                              ? categories[catIdx]
                              : 'Unknown';
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Position Source</span>
                        <span className="text-white text-sm">
                          {(() => {
                            const sources = ['ADS-B', 'ASTERIX', 'MLAT', 'FLARM'];
                            const posSource = selectedFlight.flightData.position_source;
                            return typeof posSource === 'number' && posSource >= 0 && posSource < sources.length
                              ? sources[posSource]
                              : 'Unknown';
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Special Purpose</span>
                        <span className={`text-sm font-medium ${selectedFlight.flightData.spi ? 'text-yellow-400' : 'text-gray-400'}`}>
                          {selectedFlight.flightData.spi ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Timestamps</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Last Contact</span>
                        <span className="text-white text-sm">
                          {selectedFlight.flightData.last_contact ?
                            new Date(selectedFlight.flightData.last_contact * 1000).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 bg-gray-900/50 rounded-lg">
                        <span className="text-gray-400 text-sm font-medium">Position Update</span>
                        <span className="text-white text-sm">
                          {selectedFlight.flightData.time_position ?
                            new Date(selectedFlight.flightData.time_position * 1000).toLocaleTimeString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!selectedFlight.flightData && (
                <div className="p-4 bg-gray-900/30 rounded-lg border border-gray-800">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 bg-red-500/20 rounded border border-red-500/30 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                    </div>
                    <span className="text-red-400 text-sm font-medium">No Data Available</span>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Flight data is not available for this aircraft.
                  </p>
                </div>
              )}
            </div>

            {/* Footer - Status Indicator */}
            <div className="p-4 border-t border-gray-800 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-sm font-medium">Live Tracking</span>
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