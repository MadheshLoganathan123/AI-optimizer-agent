import { useState, useRef } from "react";
import axios from "axios";
import VoiceAssistant from "./VoiceAssistant";
import OpenLayersMap from "./OpenLayersMap";
import "leaflet/dist/leaflet.css";

export default function NavigationMap() {
  const [position, setPosition] = useState([13.0827, 80.2707]);
  const [route, setRoute] = useState([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const mapRef = useRef(null);

  const focusOnLocation = (lat, lon, zoom = 14) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([lat, lon], zoom, { duration: 1.2 });
  };

  const searchPlace = async (place) => {
    if (!place?.trim()) return;
    setLoadingRoute(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json`;
      const res = await axios.get(url);

      if (!res.data.length) return;
      const lat = parseFloat(res.data[0].lat);
      const lon = parseFloat(res.data[0].lon);

      setPosition([lat, lon]);
      focusOnLocation(lat, lon);
      await getRoute(lat, lon);
    } catch (error) {
      console.error("Search place failed:", error);
    } finally {
      setLoadingRoute(false);
    }
  };

  const getRoute = async (lat, lon) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/80.2707,13.0827;${lon},${lat}?overview=full&geometries=geojson`;
      const res = await axios.get(url);
      const coords = res.data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
      setRoute(coords);
    } catch (error) {
      console.error("Unable to load route:", error);
      setRoute([]);
    }
  };

  const handleVoiceCommand = (command) => {
    if (!command) return;
    const normalized = command.toLowerCase();

    if (normalized.includes("navigate to") || normalized.includes("go to")) {
      const place = normalized
        .replace("navigate to", "")
        .replace("go to", "")
        .trim();

      if (place) {
        setSearchTerm(place);
        searchPlace(place);
      }
      return;
    }

    const map = mapRef.current;
    if (!map) return;

    if (normalized.includes("zoom in")) map.setZoom(map.getZoom() + 1);
    if (normalized.includes("zoom out")) map.setZoom(map.getZoom() - 1);

    if (normalized.includes("move left") || normalized.includes("left")) map.panBy([-200, 0]);
    if (normalized.includes("move right") || normalized.includes("right")) map.panBy([200, 0]);
    if (normalized.includes("go up") || normalized.includes("up")) map.panBy([0, -200]);
    if (normalized.includes("go down") || normalized.includes("down")) map.panBy([0, 200]);
  };

  return (
    <section className="map-shell">
      <div className="transcript-card">
        <div className="card-header">
          <span>Voice transcript</span>
          {listening ? <span className="dot" aria-hidden="true"></span> : null}
        </div>
        <p className="transcript-body">
          {transcript
            ? transcript
            : listening
            ? "Listening... Speak a command like “navigate to Marina Beach”."
            : "Awaiting your command. Tap the mic to begin navigation or zoom control."
          }
        </p>
        <small className="transcript-hint">
          {listening
            ? "Tap the mic button to stop and execute the command."
            : "Try “navigate to [place]”, “zoom in/out”, or “move left/right/up/down”."
          }
        </small>
      </div>

      <div className="search-row">
        <label className="sr-only" htmlFor="destination-input">
          Destination search
        </label>
        <input
          id="destination-input"
          className="search-input"
          type="text"
          placeholder="Search destination manually"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              searchPlace(searchTerm);
            }
          }}
        />
        <button
          className="ghost-button"
          onClick={() => searchPlace(searchTerm)}
          disabled={loadingRoute}
        >
          {loadingRoute ? "Routing…" : "Search"}
        </button>
      </div>

      <div className="map-wrapper">
        {loadingRoute && <div className="map-loader">Updating route…</div>}
        <div className="primary-map" style={{ height: 520 }}>
          <OpenLayersMap position={position} route={route} onMapReady={(m) => (mapRef.current = m)} />
        </div>
      </div>

      <VoiceAssistant
        onCommand={handleVoiceCommand}
        onTranscriptChange={setTranscript}
        onListeningChange={setListening}
      />
    </section>
  );
}

