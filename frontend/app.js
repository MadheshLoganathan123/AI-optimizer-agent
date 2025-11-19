// API Keys (Replace with your actual keys)
const OPENCAGE_API_KEY = 'YOUR_KEY';
const OPENTRIPMAP_API_KEY = 'YOUR_KEY';

// Configuration
const DEFAULT_CENTER = [13.0827, 80.2707]; // Chennai
const DEFAULT_ZOOM = 13;

// State
let map;
let routingControl;
let startCoords = null;
let endCoords = null;
let isListening = false;

// DOM Elements
const btnStartExperience = document.getElementById('btn-start-experience');
const voiceOverlay = document.getElementById('voice-overlay');
const voiceStatus = document.getElementById('voice-status');
const manualControls = document.getElementById('manual-controls');
const inputStart = document.getElementById('input-start');
const inputEnd = document.getElementById('input-end');
const poiContainer = document.getElementById('poi-container');
const poiList = document.getElementById('poi-list');

// --- Voice & TTS ---

function speak(text, callback) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Cancel ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1.0;
    utterance.onend = () => { if (callback) callback(); };
    window.speechSynthesis.speak(utterance);
}

function listen(onResult) {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Voice API not supported. Use Chrome.');
        return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
        isListening = true;
        voiceStatus.textContent = "Listening...";
        voiceOverlay.classList.remove('hidden');
    };

    recognition.onend = () => { isListening = false; };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
    };

    recognition.onerror = (err) => {
        console.error("Speech API Error:", err.error);
        let msg = "I didn't catch that.";
        if (err.error === 'no-speech') msg = "No speech detected. Please try again.";
        if (err.error === 'network') msg = "Network error. Check your connection.";
        if (err.error === 'not-allowed') msg = "Microphone access blocked.";

        speak(msg, () => {
            voiceOverlay.classList.add('hidden');
        });
    };

    recognition.start();
}

// --- Geocoding (OpenCage) ---

async function geocode(query) {
    try {
        console.log(`Geocoding: ${query}`);
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPENCAGE_API_KEY}&limit=1`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status && data.status.code !== 200) {
            console.error("OpenCage API Error:", data.status.message);
            return null;
        }

        if (data.results && data.results.length > 0) {
            return data.results[0].geometry; // { lat, lng }
        }
        console.warn("OpenCage: No results found for query:", query);
        return null;
    } catch (err) {
        console.error("Geocoding network error:", err);
        return null;
    }
}

// --- Routing (Leaflet Routing Machine) ---

function calculateRoute(start, end) {
    if (routingControl) {
        map.removeControl(routingControl);
    }

    try {
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(start.lat, start.lng),
                L.latLng(end.lat, end.lng)
            ],
            routeWhileDragging: false,
            showAlternatives: false,
            fitSelectedRoutes: true,
            lineOptions: {
                styles: [{ color: 'blue', opacity: 0.6, weight: 6 }]
            },
            createMarker: function () { return null; } // Optional: suppress default markers if we want custom ones
        }).addTo(map);

        routingControl.on('routesfound', function (e) {
            const routes = e.routes;
            const summary = routes[0].summary;
            const distKm = (summary.totalDistance / 1000).toFixed(1);
            const timeMins = Math.round(summary.totalTime / 60);

            speak(`Route found. Distance: ${distKm} kilometers. Time: ${timeMins} minutes.`);
            fetchPOIs(end.lat, end.lng);
        });

        routingControl.on('routingerror', function (e) {
            console.error("Routing Error:", e);
            speak("Sorry, I couldn't calculate a route.");
        });

    } catch (e) {
        console.error("Leaflet Routing Machine Error:", e);
    }
}

// --- POIs (OpenTripMap) ---

async function fetchPOIs(lat, lon) {
    poiContainer.classList.remove('hidden');
    poiList.innerHTML = '<p>Loading nearby places...</p>';

    try {
        const radius = 2000; // 2km
        const url = `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&kinds=tourist_facilities,interesting_places&rate=2&format=json&limit=5&apikey=${OPENTRIPMAP_API_KEY}`;

        const res = await fetch(url);
        const places = await res.json();

        poiList.innerHTML = '';

        if (places.length === 0) {
            poiList.innerHTML = '<p>No popular places found nearby.</p>';
            return;
        }

        for (const place of places) {
            const detailsUrl = `https://api.opentripmap.com/0.1/en/places/xid/${place.xid}?apikey=${OPENTRIPMAP_API_KEY}`;
            const detailsRes = await fetch(detailsUrl);
            const details = await detailsRes.json();
            createPOICard(details);
            addPOIMarker(details);
        }

    } catch (err) {
        console.error("POI Error:", err);
        poiList.innerHTML = '<p>Could not load places.</p>';
    }
}

function createPOICard(place) {
    const card = document.createElement('div');
    card.className = 'poi-card';
    const imgUrl = place.preview ? place.preview.source : 'https://via.placeholder.com/200x120?text=No+Image';
    card.innerHTML = `
        <img src="${imgUrl}" class="poi-image" alt="${place.name}">
        <div class="poi-details">
            <div class="poi-name">${place.name}</div>
            <div class="poi-category">${place.kinds.split(',')[0].replace(/_/g, ' ')}</div>
        </div>
    `;
    poiList.appendChild(card);
}

function addPOIMarker(place) {
    L.marker([place.point.lat, place.point.lon])
        .addTo(map)
        .bindPopup(`<b>${place.name}</b><br>${place.kinds.split(',')[0]}`);
}

// --- Main Flow ---

async function startExperience() {
    btnStartExperience.classList.add('hidden');
    manualControls.classList.remove('hidden');
    voiceOverlay.classList.remove('hidden');

    // Step 1: Start Location
    voiceStatus.textContent = "Say your starting location...";
    speak("Please say your starting location.", () => {
        listen(async (transcript) => {
            voiceStatus.textContent = `Start: ${transcript}`;
            inputStart.value = transcript;

            const coords = await geocode(transcript);
            if (!coords) {
                speak("I couldn't find that place. Let's try again.");
                setTimeout(startExperience, 2000);
                return;
            }
            startCoords = coords;

            // Step 2: Destination
            voiceStatus.textContent = "Say your destination...";
            speak(`Okay, starting from ${transcript}. Now, say your destination.`, () => {
                listen(async (destTranscript) => {
                    voiceStatus.textContent = `Dest: ${destTranscript}`;
                    inputEnd.value = destTranscript;

                    const destCoords = await geocode(destTranscript);
                    if (!destCoords) {
                        speak("I couldn't find the destination. Please try again.");
                        voiceOverlay.classList.add('hidden');
                        return;
                    }
                    endCoords = destCoords;

                    // Step 3: Calculate Route
                    voiceStatus.textContent = "Calculating route...";
                    voiceOverlay.classList.add('hidden');
                    calculateRoute(startCoords, endCoords);
                });
            });
        });
    });
}

async function handleManualInput(type, value) {
    if (!value) return;
    const coords = await geocode(value);
    if (!coords) {
        alert(`Could not find location: ${value}`);
        return;
    }
    if (type === 'start') {
        startCoords = coords;
        speak(`Start set to ${value}`);
    } else {
        endCoords = coords;
        speak(`Destination set to ${value}`);
    }
    if (startCoords && endCoords) {
        calculateRoute(startCoords, endCoords);
    }
}

// --- Initialization ---

function initMap() {
    console.log("Initializing Map...");
    try {
        map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

        tileLayer.on('tileerror', function (e) {
            console.error("Tile loading error:", e);
        });

        tileLayer.addTo(map);

        // Force map resize calculation
        setTimeout(() => {
            map.invalidateSize();
        }, 100);

    } catch (e) {
        console.error("Map Initialization Error:", e);
        alert("Map failed to load. Check console for details.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();

    if (btnStartExperience) {
        btnStartExperience.addEventListener('click', startExperience);
    }

    if (inputStart) {
        inputStart.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleManualInput('start', inputStart.value);
        });
    }

    if (inputEnd) {
        inputEnd.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleManualInput('end', inputEnd.value);
        });
    }

    const closeBtn = document.getElementById('btn-close-overlay');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            voiceOverlay.classList.add('hidden');
            speak("Voice navigation cancelled.");
        });
    }
});
