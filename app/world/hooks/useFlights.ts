import { useEffect, useRef, useCallback } from "react";
import type { Viewer, Cartesian3, Entity, Cartesian2, HeadingPitchRoll, ScreenSpaceEventHandler } from "cesium";
import axios from "axios";

// Throttle utility function
type ThrottledFunction<T extends unknown[]> = (...args: T) => void;
const throttle = <T extends unknown[]>(func: (...args: T) => void, delay: number): ThrottledFunction<T> => {
    let timeoutId: NodeJS.Timeout | null = null;
    return (...args: T) => {
        if (timeoutId === null) {
            timeoutId = setTimeout(() => {
                func(...args);
                timeoutId = null;
            }, delay);
        }
    };
};

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
    Cesium
}: {
    viewerRef: React.MutableRefObject<Viewer | null>;
    showFlights: boolean;
    use3DFlightModels: boolean;
    maxFlightDistance: number;
    Cesium: typeof import("cesium");
}) {
    const flightsRef = useRef<{ [id: string]: Entity }>({});
    const allFlightsDataRef = useRef<Flight[]>([]);
    const lastCameraPosition = useRef<Cartesian3 | null>(null);
    const lastCameraHeight = useRef<number>(0);

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

    const fetchFlights = async (viewer: Viewer) => {
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

            updateFlightDisplay(viewer);
        } catch (error) {
            console.error("Error fetching flights:", error);
        }
    };

    // Calculate distance between two points (ignoring altitude for better performance)
    const calculateDistance = (viewer: Viewer, flight: Flight): number => {
        const cameraCartographic = viewer.camera.positionCartographic;
        const flightCartographic = Cesium.Cartographic.fromDegrees(flight.longitude, flight.latitude);
        
        return Cesium.Cartesian3.distance(
            Cesium.Cartographic.toCartesian(cameraCartographic),
            Cesium.Cartographic.toCartesian(flightCartographic)
        );
    };

    // Smart flight selection based on camera position and zoom level
    const selectFlightsToShow = (viewer: Viewer): Flight[] => {
        const cameraHeight = viewer.camera.positionCartographic.height;

        // Adaptive parameters based on camera height
        let maxDistance: number;
        let maxFlights: number;
        let priorityRadius: number;

        if (cameraHeight > 20000000) { // Very high altitude - Global view
            maxDistance = 50000000; // 50,000 km
            maxFlights = use3DFlightModels ? 30 : 100;
            priorityRadius = 10000000;
        } else if (cameraHeight > 5000000) { // High altitude - Continental view
            maxDistance = 20000000; // 20,000 km
            maxFlights = use3DFlightModels ? 50 : 200;
            priorityRadius = 5000000;
        } else if (cameraHeight > 1000000) { // Medium altitude - Regional view
            maxDistance = 5000000; // 5,000 km
            maxFlights = use3DFlightModels ? 100 : 400;
            priorityRadius = 2000000;
        } else { 
            maxDistance = 2000000; // 2,000 km
            maxFlights = use3DFlightModels ? 150 : 600;
            priorityRadius = 1000000;
        }

        // Get flights with distance and priority scoring
        const flightsWithDistance = allFlightsDataRef.current
            .map(flight => {
                const distance = calculateDistance(viewer, flight);
                // Priority: closer flights + higher altitude flights get priority
                const altitudeFactor = (flight.baro_altitude || 0) / 15000; // Normalize altitude
                const distanceFactor = Math.max(0, 1 - (distance / priorityRadius));
                const priority = distanceFactor + altitudeFactor * 0.3;
                
                return { flight, distance, priority };
            })
            .filter(({ distance }) => distance <= maxDistance)
            .sort((a, b) => b.priority - a.priority) // Highest priority first
            .slice(0, maxFlights)
            .map(({ flight }) => flight);

        return flightsWithDistance;
    };

    // Check if camera moved significantly
    const hasCameraMovedSignificantly = (viewer: Viewer): boolean => {
        const currentPosition = viewer.camera.position;
        const currentHeight = viewer.camera.positionCartographic.height;
        
        if (!lastCameraPosition.current) {
            lastCameraPosition.current = currentPosition.clone();
            lastCameraHeight.current = currentHeight;
            return true;
        }

        const distanceMoved = Cesium.Cartesian3.distance(currentPosition, lastCameraPosition.current);
        const heightChange = Math.abs(currentHeight - lastCameraHeight.current);
        
        // Adaptive thresholds based on camera height
        const heightThreshold = currentHeight * 0.1; // 10% height change
        const distanceThreshold = currentHeight * 0.05; // 5% of height as distance threshold
        
        const significantMove = distanceMoved > distanceThreshold || heightChange > heightThreshold;
        
        if (significantMove) {
            lastCameraPosition.current = currentPosition.clone();
            lastCameraHeight.current = currentHeight;
        }
        
        return significantMove;
    };

    // Create a single flight entity
    const createFlightEntity = (viewer: Viewer, flight: Flight): Entity => {
        const flightId = flight.icao24;
        const entityId = `flight_${flightId}`;
        const position = Cesium.Cartesian3.fromDegrees(flight.longitude, flight.latitude, flight.baro_altitude || 10000);
        
        const entityConfig: Parameters<typeof viewer.entities.add>[0] = {
            id: entityId,
            position: position,
        };

        if (use3DFlightModels) {
            entityConfig.model = {
                uri: '/models/plane.glb',
                scale: 30,
                minimumPixelSize: 32,
                maximumScale: 1000,
                runAnimations: false,
                color: Cesium.Color.WHITE.withAlpha(0.95),
            };
            entityConfig.orientation = Cesium.Transforms.headingPitchRollQuaternion(
                position,
                new Cesium.HeadingPitchRoll(
                    Cesium.Math.toRadians(flight.true_track || 0),
                    0,
                    0
                ) as HeadingPitchRoll
            );
        } else {
            entityConfig.billboard = {
                image: '/models/airplane2.svg',
                scale: 0.5,
                rotation: Cesium.Math.toRadians(-(flight.true_track || 0)),
                alignedAxis: Cesium.Cartesian3.UNIT_Z,
                color: new Cesium.Color(1.0, 1.0, 1.0, 0.9),
            };
        }

        return viewer.entities.add(entityConfig);
    };

    // Smart entity management with dynamic LOD
    const updateFlightDisplay = useCallback(throttle((viewer: Viewer) => {
        if (!hasCameraMovedSignificantly(viewer)) return;
        
        const selectedFlights = selectFlightsToShow(viewer);
        const selectedFlightIds = new Set(selectedFlights.map(f => f.icao24));
        
        // Remove entities that are no longer needed
        const currentEntityIds = new Set(Object.keys(flightsRef.current));
        currentEntityIds.forEach(flightId => {
            if (!selectedFlightIds.has(flightId)) {
                const entity = flightsRef.current[flightId];
                if (entity) {
                    viewer.entities.remove(entity);
                    delete flightsRef.current[flightId];
                }
            }
        });
        
        // Add new entities for selected flights
        selectedFlights.forEach(flight => {
            const flightId = flight.icao24;
            if (!flightsRef.current[flightId]) {
                try {
                    const entity = createFlightEntity(viewer, flight);
                    flightsRef.current[flightId] = entity;
                } catch (error) {
                    console.warn(`Failed to create entity for flight ${flightId}:`, error);
                }
            } else {
                // Update existing entity position and orientation
                const entity = flightsRef.current[flightId];
                const position = Cesium.Cartesian3.fromDegrees(
                    flight.longitude, 
                    flight.latitude, 
                    flight.baro_altitude || 10000
                );
                entity.position = new Cesium.ConstantPositionProperty(position);
                
                if (use3DFlightModels && entity.orientation) {
                    entity.orientation = new Cesium.ConstantProperty(
                        Cesium.Transforms.headingPitchRollQuaternion(
                            position,
                            new Cesium.HeadingPitchRoll(
                                Cesium.Math.toRadians(flight.true_track || 0),
                                0,
                                0
                            ) as HeadingPitchRoll
                        )
                    );
                } else if (entity.billboard) {
                    entity.billboard.rotation = new Cesium.ConstantProperty(
                        Cesium.Math.toRadians(-(flight.true_track || 0))
                    );
                }
            }
        });
        
        console.log(`Showing ${selectedFlights.length} flights out of ${allFlightsDataRef.current.length} total`);
    }, 250), []);

    useEffect(() => {
        if (!viewerRef.current) return;

        const viewer = viewerRef.current;
        
        if (showFlights) {
            // Initial fetch and display
            fetchFlights(viewer);
            
            // Set up camera event listeners for dynamic updates
            const removeListener = viewer.camera.changed.addEventListener(() => {
                updateFlightDisplay(viewer);
            });

            // Add click handler for planes
            const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            handler.setInputAction((movement: { position: Cartesian2 }) => {
                const pickedObject = viewer.scene.pick(movement.position);
                if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.id?.startsWith("flight_")) {
                    const flightId = pickedObject.id.id.replace("flight_", "");
                    showPlaneData(flightId);
                }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

            return () => {
                removeListener();
                (handler as ScreenSpaceEventHandler).destroy();
            };
        } else {
            // Hide all flights
            Object.values(flightsRef.current).forEach((entity) => {
                viewer.entities.remove(entity);
            });
            flightsRef.current = {};
            allFlightsDataRef.current = [];
        }
    }, [showFlights, updateFlightDisplay]);

    // Handle model type changes (force recreation)
    useEffect(() => {
        if (!viewerRef.current || !showFlights) return;

        const viewer = viewerRef.current;

        // Clear existing entities (but do NOT clear allFlightsDataRef or call fetchFlights)
        Object.values(flightsRef.current).forEach((entity) => {
            viewer.entities.remove(entity);
        });
        flightsRef.current = {};

        // Trigger redisplay with new model type
        if (allFlightsDataRef.current.length > 0) {
            updateFlightDisplay(viewer);
        }
    }, [use3DFlightModels, updateFlightDisplay]);

    return {
        fetchFlights,
        updateFlightDisplay,
        flightsRef,
        allFlightsDataRef,
        showPlaneData,
    };
}
