import React, { useState } from "react";

const geocodeEndpoint =
  "https://nominatim.openstreetmap.org/search?q=Chennai Central&format=json";
const routeEndpoint =
  "https://router.project-osrm.org/route/v1/driving/80.2707,13.0827;80.2496,13.0604?overview=full&geometries=geojson";

export default function OSMTest() {
  const [geoLoading, setGeoLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [geoResult, setGeoResult] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [routeError, setRouteError] = useState("");

  const testGeocoding = async () => {
    setGeoError("");
    setGeoLoading(true);
    try {
      const response = await fetch(geocodeEndpoint);
      const data = await response.json();
      if (data.length === 0) {
        setGeoError("No geocoding results returned.");
        setGeoResult(null);
      } else {
        setGeoResult({
          lat: data[0].lat,
          lon: data[0].lon
        });
      }
    } catch (error) {
      setGeoError("Geocoding request failed.");
      setGeoResult(null);
    } finally {
      setGeoLoading(false);
    }
  };

  const testRouting = async () => {
    setRouteError("");
    setRouteLoading(true);
    try {
      const response = await fetch(routeEndpoint);
      const data = await response.json();
      if (data.routes?.length) {
        const routeInfo = data.routes[0];
        setRouteResult({
          distance: routeInfo.distance,
          duration: routeInfo.duration
        });
      } else {
        setRouteError("No route data returned.");
        setRouteResult(null);
      }
    } catch (error) {
      setRouteError("Routing request failed.");
      setRouteResult(null);
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <section className="osm-test-card">
      <header className="osm-test-header">
        <h3>OSM Connectivity Test</h3>
        <p>Verify Nominatim and OSRM endpoints without touching main logic.</p>
      </header>

      <div className="osm-test-grid">
        <div className="osm-test-controls">
          <button onClick={testGeocoding} disabled={geoLoading}>
            {geoLoading ? "Testing..." : "Test Geocoding (Nominatim)"}
          </button>
          <button onClick={testRouting} disabled={routeLoading}>
            {routeLoading ? "Testing..." : "Test Routing (OSRM)"}
          </button>
        </div>

        <div className="osm-test-results">
          <div>
            <strong>Geocoding</strong>
            {geoError && <p className="osm-test-error">{geoError}</p>}
            {geoResult ? (
              <p>
                Latitude: {geoResult.lat}
                <br /> Longitude: {geoResult.lon}
              </p>
            ) : (
              !geoError && <p className="osm-test-placeholder">Awaiting geocoding verification.</p>
            )}
          </div>
          <div>
            <strong>Routing</strong>
            {routeError && <p className="osm-test-error">{routeError}</p>}
            {routeResult ? (
              <p>
                Distance: {(routeResult.distance / 1000).toFixed(2)} km
                <br /> Duration: {(routeResult.duration / 60).toFixed(1)} mins
              </p>
            ) : (
              !routeError && <p className="osm-test-placeholder">Awaiting routing verification.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
