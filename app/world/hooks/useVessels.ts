import { useEffect, useRef } from "react";
import type { Viewer, Entity } from "cesium";
import axios from "axios";

export interface VesselReport {
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

export function useVessels({
  viewerRef,
  showVessels,
  Cesium
}: {
  viewerRef: React.MutableRefObject<Viewer | null>;
  showVessels: boolean;
  Cesium: typeof import("cesium");
}) {
  const vesselsRef = useRef<{ [id: string]: Entity }>({});
  const vesselApi = "https://ais.marineplan.com/location/v1/locations.json";

  const fetchVessels = async (viewer: Viewer) => {
    try {
      const res = await axios.get(vesselApi);
      const data = res.data;
      Object.values(vesselsRef.current).forEach((entity) => {
        viewer.entities.remove(entity);
      });
      vesselsRef.current = {};
      if (data.reports && Array.isArray(data.reports)) {
        (data.reports as VesselReport[]).forEach((vessel) => {
          const lon = vessel.point?.longitude;
          const lat = vessel.point?.latitude;
          const entityId = `vessel_${vessel.mmsi}`;
          if (lon && lat) {
            const existing = viewer.entities.getById(entityId);
            if (existing) viewer.entities.remove(existing);
            const entity = viewer.entities.add({
              id: entityId,
              position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
              billboard: {
                image: 'https://maps.google.com/mapfiles/kml/shapes/ferry.png',
                scale: 0.7,
                rotation: Cesium.Math.toRadians(vessel.bearingDeg || 0),
                alignedAxis: Cesium.Cartesian3.UNIT_Z,
              },
            });
            vesselsRef.current[vessel.mmsi] = entity;
          }
        });
      }
    } catch (error) {
      console.error("Error fetching vessels:", error);
    }
  };

  useEffect(() => {
    if (viewerRef.current && showVessels) {
      fetchVessels(viewerRef.current);
    } else if (viewerRef.current && !showVessels) {
      Object.values(vesselsRef.current).forEach((entity) => {
        viewerRef.current?.entities.remove(entity);
      });
      vesselsRef.current = {};
    }
    // eslint-disable-next-line
  }, [showVessels]);

  return {
    fetchVessels,
    vesselsRef,
  };
}
