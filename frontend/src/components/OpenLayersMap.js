import React, { useEffect, useRef } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import { Stroke, Style, Icon, Circle as CircleStyle, Fill } from "ol/style";
import { fromLonLat } from "ol/proj";

export default function OpenLayersMap({ position, route, onMapReady }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const routeLayerRef = useRef(null);
  const markerFeatureRef = useRef(null);

  useEffect(() => {
    const osm = new TileLayer({
      source: new OSM(),
    });

    const routeSource = new VectorSource();
    const routeLayer = new VectorLayer({
      source: routeSource,
      style: new Style({
        stroke: new Stroke({ color: "rgba(40,116,240,0.9)", width: 5 }),
      }),
    });

    const markerSource = new VectorSource();
    const markerLayer = new VectorLayer({
      source: markerSource,
      style: new Style({
        image: new CircleStyle({
          radius: 8,
          fill: new Fill({ color: "#ef4444" }),
          stroke: new Stroke({ color: "#fff", width: 2 }),
        }),
      }),
    });

    routeLayerRef.current = routeLayer;

    const map = new Map({
      target: mapRef.current,
      layers: [osm, routeLayer, markerLayer],
      view: new View({
        center: fromLonLat([position[1], position[0]]),
        zoom: 13,
      }),
      controls: [],
    });

    mapObj.current = map;

    // expose map instance if caller wants it
    if (onMapReady) onMapReady(map);

    return () => {
      map.setTarget(null);
    };
  }, []); // init once

  // update position marker & view
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;

    const layers = map.getLayers().getArray();
    // marker layer is the last layer (markerLayer)
    const markerLayer = layers[layers.length - 1];
    const markerSource = markerLayer.getSource();

    markerSource.clear();
    const pt = new Feature({ geometry: new Point(fromLonLat([position[1], position[0]])) });
    markerSource.addFeature(pt);

    // fly/animate to new position
    map.getView().animate({ center: fromLonLat([position[1], position[0]]), duration: 600, zoom: 14 });
  }, [position]);

  // update route polyline
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;

    const layers = map.getLayers().getArray();
    const routeLayer = routeLayerRef.current;
    if (!routeLayer) return;

    const src = routeLayer.getSource();
    src.clear();

    if (route && route.length > 0) {
      // route is expected as array of [lat, lon]
      const coordsLonLat = route.map((c) => [c[1], c[0]]);
      const transformed = coordsLonLat.map((ll) => fromLonLat(ll));
      const line = new LineString(transformed);
      const feat = new Feature({ geometry: line });
      src.addFeature(feat);
    }
  }, [route]);

  return <div ref={mapRef} style={{ width: "100%", height: "100%" }} />;
}
