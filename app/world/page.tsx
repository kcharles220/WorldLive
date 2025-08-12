"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ion, Viewer, Cesium3DTileset, KmlDataSource, GridImageryProvider, Cartesian3, Math as CesiumMath, Entity, Transforms, HeadingPitchRoll } from "cesium";
import { Color } from "cesium";
import axios from "axios";
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
  Box
} from "lucide-react";

export default function WorldPage() {
  const router = useRouter();
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const tilesetRef = useRef<Cesium3DTileset | null>(null);
  const airportsRef = useRef<KmlDataSource | null>(null);
  const flightsRef = useRef<{ [id: string]: Entity }>({});
  const allFlightsDataRef = useRef<Flight[]>([]);
  const visibleFlightsRef = useRef<Set<string>>(new Set());
  const vesselsRef = useRef<{ [id: string]: Entity }>({});
  const statesProvincesRef = useRef<KmlDataSource | null>(null);
  const portsRef = useRef<KmlDataSource | null>(null);
  const bordersRef = useRef<KmlDataSource | null>(null);
  const maxFlightDistanceRef = useRef<number>(500000);
  const use3DFlightModelsRef = useRef<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  //APIs
  const flightApi = "https://opensky-network.org/api/states/all";
  const vesselApi = "https://ais.marineplan.com/location/v1/locations.json";

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
    showBorders: false,
    showFlights: false,
    showVessels: false,
    use3DFlightModels: false
  });

  // Fetch and render real-time vessels
  interface VesselReport {
    timeSecUtc: number;
    point: { latitude: number; longitude: number };
    destination?: { latitude: number; longitude: number };
    destinationName?: string;
    etaSecUtc?: number;
    boatName?: string;
    callSign?: string;
    mmsi: string;
    lengthMeters?: number;
    widthMeters?: number;
    heightMeters?: number;
    captain?: string;
    speedKmh?: number;
    bearingDeg?: number;
    vesselType?: string;
    source?: string;
    boundingBox?: {
      topLeft: { latitude: number; longitude: number };
      bottomRight: { latitude: number; longitude: number };
    };
  }

  const fetchVessels = async (viewer: Viewer) => {
    try {
      // Example endpoint, replace <version> and add any required parameters
      const res = await axios.get(vesselApi);
      const data = res.data;
      console.log("Fetched vessels data:", data);
      // Remove previous vessels
      Object.values(vesselsRef.current).forEach(entity => {
        viewer.entities.remove(entity);
      });
      vesselsRef.current = {};
      // Add new vessels
      if (data.reports && Array.isArray(data.reports)) {
        (data.reports as VesselReport[]).forEach((vessel) => {
          const lon = vessel.point?.longitude;
          const lat = vessel.point?.latitude;
          const entityId = `vessel_${vessel.mmsi}`;
          if (lon && lat) {
            // Remove existing entity with same id if present
            const existing = viewer.entities.getById(entityId);
            if (existing) viewer.entities.remove(existing);
            const entity = viewer.entities.add({
              id: entityId,
              position: Cartesian3.fromDegrees(lon, lat, 0),
              billboard: {
                image: 'https://maps.google.com/mapfiles/kml/shapes/ferry.png',
                scale: 0.7,
                rotation: CesiumMath.toRadians(vessel.bearingDeg || 0),
                alignedAxis: Cartesian3.UNIT_Z
              },
              /*
              label: {
                text: vessel.boatName || vessel.mmsi || '',
                font: '12px sans-serif',
                pixelOffset: new Cartesian2(0, -30)
              }*/
            });
            vesselsRef.current[vessel.mmsi] = entity;
          }
        });
      }
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  };

  // Effect to handle real-time vessels toggle
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (viewerRef.current && settings.showVessels) {
      fetchVessels(viewerRef.current);
      // Uncomment to poll every 60s (API usage caution)
      /*
      interval = setInterval(() => {
        fetchVessels(viewerRef.current!);
      }, 60000);
      */
    } else if (viewerRef.current && !settings.showVessels) {
      Object.values(vesselsRef.current).forEach(entity => {
        viewerRef.current!.entities.remove(entity);
      });
      vesselsRef.current = {};
    }
    return () => {
      if (interval) clearInterval(interval);
      if (viewerRef.current) {
        Object.values(vesselsRef.current).forEach(entity => {
          viewerRef.current!.entities.remove(entity);
        });
        vesselsRef.current = {};
      }
    };
  }, [settings.showVessels]);
  // Fetch and render real-time flights
  interface Flight {
    longitude: number;
    latitude: number;
    altitude?: number;
    heading?: number;
    flight_iata: string;
  }


  const fetchFlights = async (viewer: Viewer) => {
    try {
      const res = await axios.get(flightApi);
      const data = res.data;
      console.log("Fetched flights data:", data);

      // Clear previous flight data
      allFlightsDataRef.current = [];

      // Store all flights in memory
      if (Array.isArray(data.states)) {
        data.states.forEach((state: (string | number | null)[]) => {
          const lon = state[5];
          const lat = state[6];
          const rawAlt = state[7];
          const rawHeading = state[10];
          const alt = typeof rawAlt === "number" ? rawAlt : Number(rawAlt) || 10000;
          const heading = typeof rawHeading === "number" ? rawHeading : Number(rawHeading) || 0;
          const rawFlightId = state[1];
          const flightId = typeof rawFlightId === "string" ? rawFlightId.trim() : String(rawFlightId || "").trim();

          if (typeof lon === "number" && typeof lat === "number" && flightId) {
            allFlightsDataRef.current.push({
              longitude: lon,
              latitude: lat,
              altitude: alt,
              heading: heading,
              flight_iata: flightId
            });
          }
        });
      }

      // Update visible flights based on current camera position
      updateVisibleFlights(viewer);

    } catch (error) {
      console.error("Error fetching flights:", error);
    }
  };

  const calculateDistance = (cameraPos: Cartesian3, flightLon: number, flightLat: number, flightAlt: number) => {
    const flightPos = Cartesian3.fromDegrees(flightLon, flightLat, flightAlt);
    return Cartesian3.distance(cameraPos, flightPos);
  };

  const updateVisibleFlights = (viewer: Viewer) => {
    updateVisibleFlightsWithDistance(viewer, maxFlightDistanceRef.current, use3DFlightModelsRef.current);
  };

  const updateVisibleFlightsWithDistance = (viewer: Viewer, maxDistance: number, use3DModels: boolean) => {
    if (!viewer || allFlightsDataRef.current.length === 0) return;

    const cameraPosition = viewer.camera.position;
    const newVisibleFlights = new Set<string>();
    console.log("Is 3D?:", use3DModels);
    console.log("MaxDistance:", maxDistance);
    // Check each flight's distance from camera
    allFlightsDataRef.current.forEach((flight) => {
      const distance = calculateDistance(cameraPosition, flight.longitude, flight.latitude, flight.altitude || 10000);
      const entityId = `flight_${flight.flight_iata}`;


      if (distance <= maxDistance) {
        newVisibleFlights.add(flight.flight_iata);

        // Add flight if not already visible
        if (!visibleFlightsRef.current.has(flight.flight_iata)) {
          const existing = viewer.entities.getById(entityId);
          if (existing) viewer.entities.remove(existing);

          const position = Cartesian3.fromDegrees(flight.longitude, flight.latitude, flight.altitude || 10000);

          // Create entity with either 3D model or billboard based on setting
          const entityConfig: Partial<Entity.ConstructorOptions> = {
            id: entityId,
            position: position
          };
          if (use3DModels) {
            // Use 3D model
            entityConfig.model = {
              uri: '/models/plane.glb',
              scale: 50,
              minimumPixelSize: 32,
              maximumScale: 2000,
              runAnimations: false,
              color: Color.WHITE.withAlpha(0.95),
            };
            entityConfig.orientation = Transforms.headingPitchRollQuaternion(
              position,
              new HeadingPitchRoll(
                CesiumMath.toRadians(flight.heading || 0),
                0,
                0
              )
            );
          } else {
            // Use billboard icon
            entityConfig.billboard = {
              image: 'https://maps.google.com/mapfiles/kml/shapes/airports.png',
              scale: 0.5,
              rotation: CesiumMath.toRadians(flight.heading || 0),
              alignedAxis: Cartesian3.UNIT_Z
            };
            /*
            entityConfig.label = {
              text: flight.flight_iata,
              font: '18px "Segoe UI", Arial, Helvetica, sans-serif',
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 4,
              style: LabelStyle.FILL_AND_OUTLINE,
              pixelOffset: new Cartesian2(0, -36),
              scale: 1.2,
              translucencyByDistance: new NearFarScalar(1.5e3, 1.0, 2.0e7, 0.0),
              distanceDisplayCondition: new DistanceDisplayCondition(0.0, 2.0e7)
            };
            */
          }

          const entity = viewer.entities.add(entityConfig);
          flightsRef.current[flight.flight_iata] = entity;
        }
      }
    });

    // Remove flights that are now too far away
    visibleFlightsRef.current.forEach((flightId) => {
      if (!newVisibleFlights.has(flightId)) {
        const entity = flightsRef.current[flightId];
        if (entity) {
          viewer.entities.remove(entity);
          delete flightsRef.current[flightId];

        }
      }
    });

    // Update visible flights set
    visibleFlightsRef.current = newVisibleFlights;

  };
  // Effect to handle real-time flights toggle

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let debounceTimeout: NodeJS.Timeout | undefined;
    let cameraEventHandler: (() => void) | undefined;

    if (viewerRef.current && settings.showFlights) {
      const viewer = viewerRef.current;

      // Initial fetch
      fetchFlights(viewer);

      // Update flights every 60 seconds (commented to preserve API usage limits)
      /* 
      interval = setInterval(() => {
        fetchFlights(viewer);
      }, 60000);
      */

    } else if (viewerRef.current && !settings.showFlights) {
      // Remove all flight entities
      Object.values(flightsRef.current).forEach(entity => {
        viewerRef.current!.entities.remove(entity);
      });
      flightsRef.current = {};
      visibleFlightsRef.current.clear();
      allFlightsDataRef.current = [];
    }

    return () => {
      if (interval) clearInterval(interval);
      if (debounceTimeout) clearTimeout(debounceTimeout);
      if (cameraEventHandler) cameraEventHandler();

      // Clean up on unmount or toggle off
      if (viewerRef.current) {
        Object.values(flightsRef.current).forEach(entity => {
          viewerRef.current!.entities.remove(entity);
        });
        flightsRef.current = {};
        visibleFlightsRef.current.clear();
        allFlightsDataRef.current = [];
      }
    };
  }, [settings.showFlights]);


  useEffect(() => {
    if (!viewerRef.current) return;

    const viewer = viewerRef.current;

    const onCameraMoveEnd = () => {
      if (settings.showFlights) {
        updateVisibleFlights(viewer);
      }
    };

    // Use changed event for more frequent updates, or moveEnd for when movement stops.
    viewer.camera.changed.addEventListener(onCameraMoveEnd);

    return () => {
      // Make sure viewer and camera still exist on cleanup
      if (viewer && !viewer.isDestroyed()) {
        viewer.camera.changed.removeEventListener(onCameraMoveEnd);
      }
    };
  }, [settings.showFlights]);


  useEffect(() => {
    const newDistance = settings.use3DFlightModels ? 500000 : 4000000;
    maxFlightDistanceRef.current = newDistance;
    use3DFlightModelsRef.current = settings.use3DFlightModels;

    if (viewerRef.current && settings.showFlights) {
      Object.values(flightsRef.current).forEach(entity => {
        viewerRef.current!.entities.remove(entity);
      });
      flightsRef.current = {};
      visibleFlightsRef.current.clear();

      // Re-render flights with new setting and correct distance
      updateVisibleFlightsWithDistance(viewerRef.current, newDistance, settings.use3DFlightModels);
    }
  }, [settings.use3DFlightModels]);

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
        <>
          {/* Home Button - Top Left */}
          <div className="absolute top-4 left-4 z-40">
            <button
              onClick={() => router.push('/')}
              className="cursor-pointer w-10 h-10 bg-black/60 backdrop-blur-sm border border-border rounded-lg flex items-center justify-center hover:bg-black/40 transition-all duration-200 shadow-sm"
              title="Go to Home"
            >
              <Home className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Control Buttons - Top Right */}
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
                className="cursor-pointer w-8 h-8 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg flex items-center justify-center transition-all duration-200"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="font-medium text-white">Base Imagery</div>
                    <div className="text-gray-400 text-sm">Bing Maps Satellite</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Plane className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="font-medium text-white">Real-Time Flights</div>
                    <div className="text-gray-400 text-sm">
                      Visualize live air traffic
                      <span className="block text-xs text-red-400 mt-1">
                        (Be aware of performance issues)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {settings.showFlights && (
                    <button
                      onClick={() => updateSetting('use3DFlightModels', !settings.use3DFlightModels)}
                      className={`cursor-pointer w-7 h-7 border border-border rounded-lg flex items-center justify-center transition-all duration-200 shadow-sm
                        ${settings.use3DFlightModels
                          ? 'bg-yellow-400 hover:bg-yellow-300'
                          : 'bg-black/60 hover:bg-black/40 backdrop-blur-sm'
                        }`}
                      title="Toggle 3D Flight Models"
                    >
                      <Box
                        className="w-5 h-5"
                        color={settings.use3DFlightModels ? '#fff' : '#facc15'}
                      />
                    </button>
                  )}

                  <button
                    onClick={() => updateSetting('showFlights', !settings.showFlights)}
                    disabled={false}
                    className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showFlights ? 'bg-yellow-400' : 'bg-gray-700'}`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showFlights ? 'translate-x-6' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>

              </div>

              {/*
              <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Anchor className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="font-medium text-white">Naval Traffic</div>
                    <div className="text-gray-400 text-sm">Track live vessels</div>
                  </div>
                </div>
                <button
                  onClick={() => updateSetting('showVessels', !settings.showVessels)}
                  className={`cursor-pointer w-12 h-6 rounded-full transition-all duration-200 ${settings.showVessels ? 'bg-cyan-400' : 'bg-gray-700'}`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-200 ${settings.showVessels ? 'translate-x-6' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>
              */}
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl opacity-60 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Anchor className="w-5 h-5 text-cyan-500" />

                  <div>
                    <div className="font-medium text-gray-300">Naval Traffic</div>
                    <div className="text-gray-500 text-sm">Coming soon...</div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl opacity-60 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CloudRain className="w-5 h-5 text-cyan-100" />
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