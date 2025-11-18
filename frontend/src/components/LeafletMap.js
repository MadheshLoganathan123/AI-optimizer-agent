import React, { useEffect, useRef } from "react";
import L from "leaflet";

export default function LeafletMap({ position, route, onMapReady }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const routeLayerRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(position, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    const marker = L.circleMarker(position, {
      radius: 8,
      fillColor: "#ef4444",
      color: "#fff",
      weight: 2,
      fillOpacity: 1
    }).addTo(map);

    const routeLayer = L.polyline([], {
      color: "#2563eb",
      weight: 5,
      opacity: 0.8,
      lineJoin: "round"
    }).addTo(map);

    mapInstance.current = map;
    markerRef.current = marker;
    routeLayerRef.current = routeLayer;

    if (onMapReady) onMapReady(map);

    return () => {
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    map.flyTo(position, 14, { duration: 0.8 });
    markerRef.current?.setLatLng(position);
  }, [position]);

  useEffect(() => {
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;

    if (route?.length) {
      routeLayer.setLatLngs(route);
    } else {
      routeLayer.setLatLngs([]);
    }
  }, [route]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
