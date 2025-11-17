import React, { useState } from "react";
import "./App.css";
import NavigationMap from "./components/NavigationMap";
import OSMTest from "./components/OSMTest";

function App() {
  const [result, setResult] = useState("");
  const [checking, setChecking] = useState(false);
  const [showOSMTest, setShowOSMTest] = useState(false);

  const checkBackend = async () => {
    setChecking(true);
    try {
      const res = await fetch("http://localhost:5000/api/route/get", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      const data = await res.json();
      setResult(data.message);
    } catch (error) {
      setResult("Backend connection failed");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="nav-title">AI Navigation Agent</div>
        <div className="nav-actions">
          <span className="status-chip">{result || "Backend status pending"}</span>
          <button className="primary-button" onClick={checkBackend} disabled={checking}>
            {checking && <span className="button-loader" aria-hidden="true"></span>}
            {checking ? "Checking..." : "Check Backend Status"}
          </button>
        </div>
      </header>
      <main className="main-content">
        <p className="hero-copy">
          Voice-powered navigation plus smart routing for confident commutes.
        </p>
        <div className="test-toggle-row">
          <span>Need to verify OSM endpoints?</span>
          <button
            className="ghost-button"
            onClick={() => setShowOSMTest((current) => !current)}
          >
            {showOSMTest ? "Hide OSM Test" : "Run OSM Connectivity Test"}
          </button>
        </div>
        {showOSMTest && <OSMTest />}
        <NavigationMap />
      </main>
    </div>
  );
}

export default App;
