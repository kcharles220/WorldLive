import { useEffect, useRef } from "react";
import axios from "axios";

export interface Flight {
    icao24: string;
    callsign: string;
    origin_country: string;
    time_position: number | null;
    last_contact: number | null;
    longitude: number;
    latitude: number;
    baro_altitude: number | null;
    on_ground: boolean;
    velocity: number | null;
    true_track: number | null;
    vertical_rate: number | null;
    sensors: number[] | null;
    geo_altitude: number | null;
    squawk: string | null;
    spi: boolean | null;
    position_source: number | null;
    category: number | null;

}

export function useFlights({
    viewerRef,
    showFlights,
    use3DFlightModels,
    maxFlightDistance,
    Cesium
}: {
    viewerRef: React.MutableRefObject<any>;
    showFlights: boolean;
    use3DFlightModels: boolean;
    maxFlightDistance: number;
    Cesium: any;
}) {
    const flightsRef = useRef<{ [id: string]: any }>({});
    const allFlightsDataRef = useRef<Flight[]>([]);
    const visibleFlightsRef = useRef<Set<string>>(new Set());

    const flightApi = "https://opensky-network.org/api/states/all";

    // Function to handle plane clicks and show popup
    const showPlaneData = (icao24: string) => {
        // Find the full flight data
        const flightData = allFlightsDataRef.current.find(f => f.icao24 === icao24);

        // Trigger a custom event with flight data
        const event = new CustomEvent('planeClicked', {
            detail: { icao24, flightData }
        });
        window.dispatchEvent(event);
    };

    const fetchFlights = async (viewer: any) => {
        try {
            const res = await axios.get(flightApi);
            const data = res.data;


            if (Array.isArray(data.states)) {
                // Filter first, then map - much more efficient than forEach with conditions
                allFlightsDataRef.current = data.states
                    .filter((state: (string | number | boolean | null)[]) =>
                        state[8] === false && // only not grounded planes
                        typeof state[5] === "number" && // valid longitude
                        typeof state[6] === "number" && // valid latitude
                        state[1] // has flight ID
                    )
                    .map((state: (string | number | boolean | null)[]) => {
                        const rawAlt = state[7];
                        const rawHeading = state[10];
                        const rawFlightId = state[1];
                        
                        return {
                            icao24: state[0] as string,
                            callsign: typeof rawFlightId === "string" ? rawFlightId.trim() : String(rawFlightId || "").trim(),
                            origin_country: state[2] as string,
                            time_position: typeof state[3] === "number" ? state[3] : null,
                            last_contact: typeof state[4] === "number" ? state[4] : null,
                            longitude: state[5] as number,
                            latitude: state[6] as number,
                            baro_altitude: typeof rawAlt === "number" ? rawAlt : Number(rawAlt) || 10000,
                            on_ground: typeof state[8] === "boolean" ? state[8] : null,
                            velocity: typeof state[9] === "number" ? state[9] : null,
                            true_track: typeof rawHeading === "number" ? rawHeading : Number(rawHeading) || 0,
                            vertical_rate: typeof state[11] === "number" ? state[11] : null,
                            sensors: Array.isArray(state[12]) ? state[12] : null,
                            geo_altitude: typeof state[13] === "number" ? state[13] : null,
                            squawk: typeof state[14] === "string" ? state[14].trim() : null,
                            spi: typeof state[15] === "boolean" ? state[15] : null,
                            position_source: typeof state[16] === "number" ? state[16] : null,
                            category: typeof state[17] === "number" ? state[17] : null
                        };
                    });


            } else {
                console.warn('No states array in API response');
                allFlightsDataRef.current = [];
            }

            updateVisibleFlights(viewer);
        } catch (error) {
            console.error("Error fetching flights:", error);
        }
    };

    const calculateDistance = (cameraPos: any, flightLon: number, flightLat: number, flightAlt: number) => {
        const flightPos = Cesium.Cartesian3.fromDegrees(flightLon, flightLat, flightAlt);
        return Cesium.Cartesian3.distance(cameraPos, flightPos);
    };

    const updateVisibleFlights = (viewer: any) => {
        if (!viewer || allFlightsDataRef.current.length === 0) return;

        const camera = viewer.camera;
        const cameraHeight = camera.positionCartographic.height;
        const newVisibleFlights = new Set<string>();



        // Adaptive parameters based on zoom level for Level of Detail (LOD)
        // Use much more generous distance calculations to show more flights
        let adaptiveMaxDistance: number;
        if (cameraHeight > 10000000) {        // Very high altitude - global view
            adaptiveMaxDistance = maxFlightDistance; // Show all flights globally
        } else if (cameraHeight > 5000000) {   // High altitude - continental view
            adaptiveMaxDistance = Math.min(maxFlightDistance, 50000000); // 50,000 km
        } else if (cameraHeight > 1000000) {   // Medium altitude - regional view
            adaptiveMaxDistance = Math.min(maxFlightDistance, 20000000); // 20,000 km
        } else if (cameraHeight > 100000) {    // Low altitude - local view
            adaptiveMaxDistance = Math.min(maxFlightDistance, 10000000); // 10,000 km
        } else {                               // Very low altitude - detailed view
            adaptiveMaxDistance = Math.min(maxFlightDistance, 5000000);  // 5,000 km
        }

        // Dynamic flight count limits based on camera height - increased for better visibility
        let maxFlights: number;
        if (cameraHeight > 10000000) {        // Very high altitude - show fewer flights
            maxFlights = 1000;
        } else if (cameraHeight > 5000000) {   // High altitude
            maxFlights = 1500;
        } else if (cameraHeight > 1000000) {   // Medium altitude
            maxFlights = 2000;
        } else {                               // Low altitude - show more detail
            maxFlights = 2500;
        }

        // Get viewport rectangle for initial culling
        let viewRectangle;
        try {
            viewRectangle = camera.computeViewRectangle();
        } catch (error) {
            console.warn('Could not compute view rectangle, showing all flights:', error);
            viewRectangle = null;
        }

        // Hybrid approach: viewport culling + distance sorting + flight limiting
        const candidateFlights = allFlightsDataRef.current
            .filter(flight => {
                // Only apply viewport culling when zoomed in close - not at global scale
                if (viewRectangle && cameraHeight < 5000000) { // Only apply viewport culling when very zoomed in
                    const lon = Cesium.Math.toRadians(flight.longitude);
                    const lat = Cesium.Math.toRadians(flight.latitude);

                    // Large buffer to show flights beyond immediate viewport
                    const buffer = 2.0; // ~120 degrees buffer - very generous
                    if (lon < viewRectangle.west - buffer || lon > viewRectangle.east + buffer ||
                        lat < viewRectangle.south - buffer || lat > viewRectangle.north + buffer) {
                        return false;
                    }
                }
                // At medium to global scale, show all flights regardless of viewport
                return true;
            })
            .map(flight => {
                const distance = calculateDistance(camera.position, flight.longitude, flight.latitude, flight.baro_altitude || 10000);
                const altitude = flight.baro_altitude || 10000;

                // Calculate flight importance with better global distribution
                let importance: number;
                if (cameraHeight > 5000000) {
                    // For global view, prioritize flights more equally across regions
                    // Add some randomness to prevent clustering in same areas
                    const baseImportance = (altitude / 1000) / Math.max(distance / 1000000, 1); // Use distance in Mm for global scale
                    const randomFactor = 0.5 + Math.random() * 0.5; // 0.5 to 1.0 randomness
                    importance = baseImportance * randomFactor;
                } else {
                    // For closer views, use standard distance-based importance
                    importance = (altitude / 1000) / Math.max(distance / 1000, 1);
                }

                return { flight, distance, importance };
            })
            .filter(({ distance }) => {
                const withinDistance = distance <= adaptiveMaxDistance;
                return withinDistance;
            })
            .sort((a, b) => {
                // At global scale, prioritize geographic distribution over just distance
                if (cameraHeight > 10000000) {
                    // For global view, sort more by importance to get better worldwide coverage
                    return b.importance - a.importance;
                } else {
                    // For closer views, sort by importance first, then by distance
                    if (Math.abs(a.importance - b.importance) > 0.1) {
                        return b.importance - a.importance; // Higher importance first
                    }
                    return a.distance - b.distance; // Closer flights first for same importance
                }
            })
            .slice(0, maxFlights); // Limit total flights for performance

        // Debug: log some distance information
        if (allFlightsDataRef.current.length > 0) {
            const sampleFlights = allFlightsDataRef.current.slice(0, 5).map(flight => {
                const distance = calculateDistance(camera.position, flight.longitude, flight.latitude, flight.baro_altitude || 10000);
                return { id: flight.icao24, distance: Math.round(distance), withinRange: distance <= adaptiveMaxDistance };
            });
        }


        // Process only the best candidate flights
        candidateFlights.forEach(({ flight }) => {
            const flightId = flight.icao24;
            newVisibleFlights.add(flightId);

            // Only add if not already visible - avoid redundant entity operations
            if (!visibleFlightsRef.current.has(flightId)) {
                const entityId = `flight_${flightId}`;
                const existing = viewer.entities.getById(entityId);
                if (existing) viewer.entities.remove(existing);

                const position = Cesium.Cartesian3.fromDegrees(flight.longitude, flight.latitude, flight.baro_altitude || 10000);
                const entityConfig: Partial<any> = {
                    id: entityId,
                    position: position,
                };

                if (use3DFlightModels) {
                    entityConfig.model = {
                        uri: '/models/plane.glb',
                        scale: 50,
                        minimumPixelSize: 32,
                        maximumScale: 2000,
                        runAnimations: false,
                        color: Cesium.Color.WHITE.withAlpha(0.95),
                    };
                    entityConfig.orientation = Cesium.Transforms.headingPitchRollQuaternion(
                        position,
                        new Cesium.HeadingPitchRoll(
                            Cesium.Math.toRadians(flight.true_track || 0),
                            0,
                            0
                        )
                    );
                } else {
                    entityConfig.billboard = {
                        image: 'https://maps.google.com/mapfiles/kml/shapes/airports.png',
                        scale: 0.5,
                        rotation: Cesium.Math.toRadians(flight.true_track || 0),
                        alignedAxis: Cesium.Cartesian3.UNIT_Z,
                    };
                }

                const entity = viewer.entities.add(entityConfig);
                flightsRef.current[flightId] = entity;
            }
        });

        // Remove flights that are no longer visible - optimized cleanup
        const flightsToRemove = Array.from(visibleFlightsRef.current).filter(flightId => !newVisibleFlights.has(flightId));
        flightsToRemove.forEach(flightId => {
            const entity = flightsRef.current[flightId];
            if (entity) {
                viewer.entities.remove(entity);
                delete flightsRef.current[flightId];
            }
        });

        visibleFlightsRef.current = newVisibleFlights;
    };

    useEffect(() => {
        if (viewerRef.current && showFlights) {
            fetchFlights(viewerRef.current);

            // Add throttled camera change event listener to improve performance
            const viewer = viewerRef.current;
            let throttleTimeout: NodeJS.Timeout | null = null;

            const onCameraChange = () => {
                if (showFlights && !throttleTimeout) {
                    throttleTimeout = setTimeout(() => {
                        updateVisibleFlights(viewer);
                        throttleTimeout = null;
                    }, 100); // Throttle to max 10 updates per second
                }
            };

            viewer.camera.changed.addEventListener(onCameraChange);

            // Add click handler for planes
            const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            handler.setInputAction((movement: any) => {
                const pickedObject = viewer.scene.pick(movement.position);
                if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.id?.startsWith("flight_")) {
                    const flightId = pickedObject.id.id.replace("flight_", "");
                    showPlaneData(flightId);
                }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

            return () => {
                if (throttleTimeout) {
                    clearTimeout(throttleTimeout);
                }
                if (viewer && !viewer.isDestroyed()) {
                    viewer.camera.changed.removeEventListener(onCameraChange);
                }
                handler.destroy();
            };
        } else if (viewerRef.current && !showFlights) {
            Object.values(flightsRef.current).forEach((entity) => {
                viewerRef.current.entities.remove(entity);
            });
            flightsRef.current = {};
            visibleFlightsRef.current.clear();
            allFlightsDataRef.current = [];
        }
        // eslint-disable-next-line
    }, [showFlights, use3DFlightModels, maxFlightDistance]);

    return {
        fetchFlights,
        updateVisibleFlights,
        flightsRef,
        allFlightsDataRef,
        visibleFlightsRef,
        showPlaneData,
    };
}
