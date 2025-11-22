// API Keys - loaded from config.js or window.API_CONFIG
// If config.js is not loaded, use defaults (will show error)
const OPENCAGE_API_KEY = (window.API_CONFIG && window.API_CONFIG.OPENCAGE_API_KEY) || 'YOUR_KEY';
const OPENTRIPMAP_API_KEY = (window.API_CONFIG && window.API_CONFIG.OPENTRIPMAP_API_KEY) || 'YOUR_KEY';

// Validate API key on load
function validateApiKeys() {
    const isValid = OPENCAGE_API_KEY && OPENCAGE_API_KEY !== 'YOUR_KEY' && OPENCAGE_API_KEY.trim() !== '';
    if (!isValid) {
        console.error('⚠️ OpenCage API Key not configured!');
        console.log('To fix:');
        console.log('1. Set window.OPENCAGE_API_KEY in your HTML before app.js loads');
        console.log('2. Or set localStorage.setItem("OPENCAGE_API_KEY", "your-key-here")');
        console.log('3. Or update config.js with your actual API key');
        console.log('Get your API key from: https://opencagedata.com/api');
    } else {
        console.log('✅ OpenCage API Key loaded:', OPENCAGE_API_KEY.substring(0, 10) + '...');
    }
    return isValid;
}

// Configuration
const DEFAULT_CENTER = [13.0827, 80.2707]; // Chennai
const DEFAULT_ZOOM = 13;

// State
let map;
let routingControl;
let startCoords = null;
let endCoords = null;
let isListening = false;
let attractionsLayerGroup = null; // Layer group for attraction markers

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
    // Validate API key first
    if (!OPENCAGE_API_KEY || OPENCAGE_API_KEY === 'YOUR_KEY' || OPENCAGE_API_KEY.trim() === '') {
        console.error('❌ OpenCage API Key is not configured!');
        console.log('Please set your API key in config.js or via localStorage');
        return null;
    }

    // Validate query
    if (!query || typeof query !== 'string' || query.trim() === '') {
        console.error('❌ Invalid geocoding query:', query);
        return null;
    }

    const cleanQuery = query.trim();
    console.log(`\n🔍 [GEOCODE] Starting geocoding for: "${cleanQuery}"`);

    try {
        // Build URL with proper encoding
        const encodedQuery = encodeURIComponent(cleanQuery);
        const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedQuery}&key=${OPENCAGE_API_KEY}&limit=1`;
        
        console.log('📡 [GEOCODE] API Request URL:', url);
        console.log('🔑 [GEOCODE] API Key (first 10 chars):', OPENCAGE_API_KEY.substring(0, 10) + '...');

        // Make request
        const res = await fetch(url);
        
        // Check HTTP status
        if (!res.ok) {
            console.error(`❌ [GEOCODE] HTTP Error: ${res.status} ${res.statusText}`);
            const errorText = await res.text();
            console.error('❌ [GEOCODE] Error Response:', errorText);
            return null;
        }

        // Parse JSON response
        const data = await res.json();
        
        // Log full response for debugging
        console.log('📥 [GEOCODE] Full API Response:', JSON.stringify(data, null, 2));

        // Check API status code
        if (data.status) {
            if (data.status.code !== 200) {
                console.error(`❌ [GEOCODE] OpenCage API Error Code: ${data.status.code}`);
                console.error(`❌ [GEOCODE] Error Message: ${data.status.message}`);
                
                // Specific error messages
                if (data.status.code === 401 || data.status.code === 403) {
                    console.error('🔑 [GEOCODE] Authentication failed! Check your API key.');
                } else if (data.status.code === 402) {
                    console.error('💳 [GEOCODE] Quota exceeded! Check your API usage.');
                } else if (data.status.code === 429) {
                    console.error('⏱️ [GEOCODE] Rate limit exceeded! Slow down your requests.');
                }
                return null;
            }
            console.log('✅ [GEOCODE] API Status Code: 200 (Success)');
        }

        // Check if results exist
        if (!data.results) {
            console.warn('⚠️ [GEOCODE] No "results" field in response');
            return null;
        }

        if (data.results.length === 0) {
            console.warn(`⚠️ [GEOCODE] No results found for query: "${cleanQuery}"`);
            console.log('💡 [GEOCODE] Try a more specific location name or check spelling');
            return null;
        }

        // Extract coordinates
        const result = data.results[0];
        console.log('📍 [GEOCODE] Best Match:', result.formatted || result.formatted_address || cleanQuery);
        
        if (!result.geometry) {
            console.error('❌ [GEOCODE] No geometry in result:', result);
            return null;
        }

        const { lat, lng } = result.geometry;
        
        // Validate coordinates
        if (typeof lat !== 'number' || typeof lng !== 'number' || 
            isNaN(lat) || isNaN(lng) ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            console.error('❌ [GEOCODE] Invalid coordinates:', { lat, lng });
            return null;
        }

        const coords = { lat: parseFloat(lat), lng: parseFloat(lng) };
        console.log(`✅ [GEOCODE] Success! Coordinates: [${coords.lat}, ${coords.lng}]`);
        
        return coords;

    } catch (err) {
        console.error('❌ [GEOCODE] Network/Parse Error:', err);
        console.error('❌ [GEOCODE] Error Details:', {
            name: err.name,
            message: err.message,
            stack: err.stack
        });
        return null;
    }
}

// --- Routing (Leaflet Routing Machine) ---

function calculateRoute(start, end) {
    console.log('\n🚗 [ROUTING] Calculating route...');
    console.log('📍 [ROUTING] Start:', start);
    console.log('📍 [ROUTING] End:', end);
    
    // Validate coordinates
    if (!start || !end) {
        console.error('❌ [ROUTING] Missing start or end coordinates');
        return;
    }
    
    if (!start.lat || !start.lng || !end.lat || !end.lng) {
        console.error('❌ [ROUTING] Invalid coordinates structure');
        console.error('Expected: { lat: number, lng: number }');
        return;
    }
    
    // Validate coordinate values
    if (isNaN(start.lat) || isNaN(start.lng) || isNaN(end.lat) || isNaN(end.lng)) {
        console.error('❌ [ROUTING] Coordinates contain NaN values');
        return;
    }
    
    if (!map) {
        console.error('❌ [ROUTING] Map not initialized');
        return;
    }

    // Remove existing routing control
    if (routingControl) {
        console.log('🗑️ [ROUTING] Removing existing route');
        map.removeControl(routingControl);
        routingControl = null;
    }

    try {
        console.log('🗺️ [ROUTING] Creating routing control...');
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
            console.log('✅ [ROUTING] Route found!');
            const routes = e.routes;
            if (!routes || routes.length === 0) {
                console.error('❌ [ROUTING] No routes in response');
                return;
            }
            
            const summary = routes[0].summary;
            if (!summary) {
                console.error('❌ [ROUTING] No summary in route');
                return;
            }
            
            const distKm = (summary.totalDistance / 1000).toFixed(1);
            const timeMins = Math.round(summary.totalTime / 60);
            
            console.log(`📏 [ROUTING] Distance: ${distKm} km`);
            console.log(`⏱️ [ROUTING] Time: ${timeMins} minutes`);
            console.log(`📍 [ROUTING] Waypoints: ${routes[0].coordinates.length} points`);

            speak(`Route found. Distance: ${distKm} kilometers. Time: ${timeMins} minutes.`);
            
            // Fetch POIs for destination
            console.log('🏛️ [POI] Fetching points of interest for destination...');
            fetchPOIs(end.lat, end.lng);
            
            // Fetch attractions for destination (SerpAPI)
            console.log('🎯 [ATTRACTIONS] Fetching attractions for destination...');
            fetchAttractions(end.lat, end.lng);
        });

        routingControl.on('routingerror', function (e) {
            console.error('❌ [ROUTING] Routing Error:', e);
            console.error('❌ [ROUTING] Error Details:', {
                message: e.error?.message,
                code: e.error?.code,
                status: e.error?.status
            });
            speak("Sorry, I couldn't calculate a route.");
        });

    } catch (e) {
        console.error('❌ [ROUTING] Leaflet Routing Machine Error:', e);
        console.error('❌ [ROUTING] Error Stack:', e.stack);
        speak("Sorry, I couldn't calculate a route.");
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
        
        if (!res.ok) {
            if (res.status === 401) {
                console.error("❌ [POI] API Key Unauthorized. Check OPENTRIPMAP_API_KEY.");
                poiList.innerHTML = '<p>API Key Error (401). Check console.</p>';
                return;
            }
            throw new Error(`POI API Error: ${res.status}`);
        }

        const places = await res.json();

        poiList.innerHTML = '';

        if (!Array.isArray(places)) {
             console.error("❌ [POI] Invalid response format:", places);
             poiList.innerHTML = '<p>Error loading places.</p>';
             return;
        }

        if (places.length === 0) {
            poiList.innerHTML = '<p>No popular places found nearby.</p>';
            return;
        }

        for (const place of places) {
            const detailsUrl = `https://api.opentripmap.com/0.1/en/places/xid/${place.xid}?apikey=${OPENTRIPMAP_API_KEY}`;
            const detailsRes = await fetch(detailsUrl);
            if (detailsRes.ok) {
                const details = await detailsRes.json();
                createPOICard(details);
                addPOIMarker(details);
            }
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

// --- Attractions (SerpAPI) ---

async function fetchAttractions(lat, lon) {
    console.log(`\n🏛️ [ATTRACTIONS] Fetching attractions for coordinates: [${lat}, ${lon}]`);
    
    try {
        const backendUrl = (window.API_CONFIG && window.API_CONFIG.BACKEND_URL) || 'http://localhost:5000';
        const url = `${backendUrl}/api/attractions?lat=${lat}&lon=${lon}`;
        
        console.log(`📡 [ATTRACTIONS] Fetching from: ${url}`);
        
        const res = await fetch(url);
        
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`❌ [ATTRACTIONS] HTTP Error: ${res.status}`, errorData);
            return;
        }
        
        const data = await res.json();
        
        if (data.status !== 'ok') {
            console.error(`❌ [ATTRACTIONS] API Error:`, data.error || data.message);
            return;
        }
        
        if (!data.attractions || data.attractions.length === 0) {
            console.log(`⚠️ [ATTRACTIONS] No attractions found`);
            return;
        }
        
        console.log(`✅ [ATTRACTIONS] Found ${data.attractions.length} attractions`);
        
        // Display attractions
        displayAttractions(data.attractions);
        
        // Add attraction markers to map
        addAttractionMarkers(data.attractions);
        
    } catch (err) {
        console.error("❌ [ATTRACTIONS] Error:", err);
        console.error("❌ [ATTRACTIONS] Error details:", err.message);
    }
}

function displayAttractions(attractions) {
    // Create or get attractions container
    let attractionsContainer = document.getElementById('attractions-container');
    let attractionsList = document.getElementById('attractions-list');
    
    if (!attractionsContainer) {
        // Create attractions container if it doesn't exist
        attractionsContainer = document.createElement('div');
        attractionsContainer.id = 'attractions-container';
        attractionsContainer.className = 'poi-container';
        attractionsContainer.innerHTML = `
            <h3>Nearby Attractions (SerpAPI)</h3>
            <div id="attractions-list" class="poi-list"></div>
        `;
        
        // Insert after POI container or at the end of main
        const main = document.querySelector('main');
        if (main) {
            main.appendChild(attractionsContainer);
        }
        attractionsList = document.getElementById('attractions-list');
    }
    
    // Show container
    attractionsContainer.classList.remove('hidden');
    
    // Clear existing content
    if (attractionsList) {
        attractionsList.innerHTML = '';
        
        // Add each attraction
        attractions.forEach(attraction => {
            const card = document.createElement('div');
            card.className = 'poi-card';
            
            const imgUrl = attraction.photos && attraction.photos.length > 0 
                ? attraction.photos[0] 
                : 'https://via.placeholder.com/200x120?text=No+Image';
            
            const ratingHtml = attraction.rating 
                ? `<div class="poi-rating">⭐ ${attraction.rating}${attraction.reviews ? ` (${attraction.reviews} reviews)` : ''}</div>` 
                : '';
            
            card.innerHTML = `
                <img src="${imgUrl}" class="poi-image" alt="${attraction.name}" onerror="this.src='https://via.placeholder.com/200x120?text=No+Image'">
                <div class="poi-details">
                    <div class="poi-name">${attraction.name}</div>
                    <div class="poi-category">${attraction.address}</div>
                    ${ratingHtml}
                </div>
            `;
            
            attractionsList.appendChild(card);
        });
    }
}

function addAttractionMarkers(attractions) {
    // Remove existing attraction markers
    if (attractionsLayerGroup) {
        map.removeLayer(attractionsLayerGroup);
    }
    
    // Create new layer group
    attractionsLayerGroup = L.layerGroup();
    
    // Add markers for attractions with coordinates
    attractions.forEach(attraction => {
        if (attraction.coordinates && attraction.coordinates.lat && attraction.coordinates.lon) {
            const marker = L.marker([attraction.coordinates.lat, attraction.coordinates.lon], {
                icon: L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                })
            });
            
            const ratingText = attraction.rating ? `⭐ ${attraction.rating}` : '';
            marker.bindPopup(`
                <b>${attraction.name}</b><br>
                ${attraction.address}<br>
                ${ratingText}
            `);
            
            attractionsLayerGroup.addLayer(marker);
        }
    });
    
    // Add layer group to map
    if (attractionsLayerGroup.getLayers().length > 0) {
        attractionsLayerGroup.addTo(map);
        console.log(`✅ [ATTRACTIONS] Added ${attractionsLayerGroup.getLayers().length} attraction markers to map`);
    }
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
                console.error(`❌ [VOICE] Could not geocode start location: ${transcript}`);
                speak("I couldn't find that place. Let's try again.");
                setTimeout(startExperience, 2000);
                return;
            }
            startCoords = coords;
            console.log(`✅ [VOICE] Start coordinates resolved:`, startCoords);
            
            // Update map to show start location
            if (map) {
                map.setView([coords.lat, coords.lng], DEFAULT_ZOOM);
            }

            // Step 2: Destination
            voiceStatus.textContent = "Say your destination...";
            speak(`Okay, starting from ${transcript}. Now, say your destination.`, () => {
                listen(async (destTranscript) => {
                    voiceStatus.textContent = `Dest: ${destTranscript}`;
                    inputEnd.value = destTranscript;

                    const destCoords = await geocode(destTranscript);
                    if (!destCoords) {
                        console.error(`❌ [VOICE] Could not geocode destination: ${destTranscript}`);
                        speak("I couldn't find the destination. Please try again.");
                        voiceOverlay.classList.add('hidden');
                        return;
                    }
                    endCoords = destCoords;
                    console.log(`✅ [VOICE] End coordinates resolved:`, endCoords);
                    
                    // Update map to show end location
                    if (map) {
                        map.setView([destCoords.lat, destCoords.lng], DEFAULT_ZOOM);
                    }

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
    if (!value || !value.trim()) {
        console.warn('⚠️ Empty input for', type);
        return;
    }

    console.log(`\n📍 [MANUAL INPUT] ${type.toUpperCase()}: "${value}"`);
    const coords = await geocode(value);
    
    if (!coords) {
        const errorMsg = `I could not find the location: ${value}`;
        console.error(`❌ [MANUAL INPUT] ${errorMsg}`);
        alert(errorMsg + '\n\nPlease check:\n- Location name spelling\n- Try a more specific location\n- API key is configured correctly');
        return;
    }

    if (type === 'start') {
        startCoords = coords;
        console.log(`✅ [MANUAL INPUT] Start coordinates set:`, startCoords);
        speak(`Start set to ${value}`);
        
        // Update map view to start location
        if (map) {
            map.setView([coords.lat, coords.lng], DEFAULT_ZOOM);
            console.log(`🗺️ [MAP] View updated to start location`);
        }
    } else {
        endCoords = coords;
        console.log(`✅ [MANUAL INPUT] End coordinates set:`, endCoords);
        speak(`Destination set to ${value}`);
        
        // Update map view to end location
        if (map) {
            map.setView([coords.lat, coords.lng], DEFAULT_ZOOM);
            console.log(`🗺️ [MAP] View updated to end location`);
        }
    }
    
    if (startCoords && endCoords) {
        console.log(`\n🚗 [ROUTING] Calculating route from start to end...`);
        calculateRoute(startCoords, endCoords);
        
        // Fetch attractions for destination after route is calculated
        // (fetchAttractions will be called from calculateRoute's routesfound event)
    } else {
        console.log(`⏳ [ROUTING] Waiting for ${!startCoords ? 'start' : 'end'} location...`);
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
    // Validate API keys on startup
    console.log('\n🔧 [INIT] Initializing application...');
    const apiKeyValid = validateApiKeys();
    
    if (!apiKeyValid) {
        // Show user-friendly error in UI
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background: #ff4444; color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000; max-width: 500px; text-align: center;';
        errorDiv.innerHTML = `
            <strong>⚠️ API Key Not Configured</strong><br>
            Please set your OpenCage API key:<br>
            <input type="text" id="api-key-input" placeholder="Enter OpenCage API Key" style="margin: 10px 0; padding: 8px; width: 300px; border-radius: 4px; border: none;">
            <br>
            <button onclick="
                const key = document.getElementById('api-key-input').value.trim();
                if (key) {
                    localStorage.setItem('OPENCAGE_API_KEY', key);
                    window.location.reload();
                } else {
                    alert('Please enter a valid API key');
                }
            " style="padding: 8px 16px; background: white; color: #ff4444; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                Save & Reload
            </button>
            <br><small style="display: block; margin-top: 10px;">
                Get your key from: <a href="https://opencagedata.com/api" target="_blank" style="color: white;">opencagedata.com/api</a>
            </small>
        `;
        document.body.appendChild(errorDiv);
    }

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
