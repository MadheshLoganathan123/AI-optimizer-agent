# Requirements Document

## Introduction

This document specifies the requirements for migrating the AI Navigation Agent application from multiple external APIs (OpenStreetMap, Nominatim, OSRM) to a unified RapidAPI-based architecture. The migration will consolidate all location services, routing, reviews, and safety data through RapidAPI endpoints while enhancing the voice command system and improving the user experience with dual-location input fields.

## Glossary

- **Navigation_System**: The AI Navigation Agent web application consisting of a React frontend and Express backend
- **RapidAPI**: A unified API marketplace platform that provides access to multiple API services through a single authentication mechanism
- **Geocoding_Service**: A service that converts location names or addresses into geographic coordinates (latitude/longitude)
- **Routing_Service**: A service that calculates optimal paths between two geographic points, providing turn-by-turn navigation
- **Review_Service**: A service that retrieves location reviews and ratings from the Maps Data API
- **Safety_Service**: A service that provides road safety information including accident hotspots, traffic incidents, and risk scores
- **Voice_Command_System**: The speech recognition interface that allows users to control navigation through spoken commands
- **Start_Location**: The origin point for a navigation route
- **Destination_Location**: The target endpoint for a navigation route
- **API_Endpoint**: A specific URL path that handles requests for a particular service function

## Requirements

### Requirement 1: API Migration to RapidAPI

**User Story:** As a developer, I want to remove all non-RapidAPI external API calls from the codebase, so that the application uses a single unified API platform for all services

#### Acceptance Criteria

1. WHEN the Navigation_System initializes, THE Navigation_System SHALL use only RapidAPI endpoints for all external service calls
2. THE Navigation_System SHALL remove all references to OpenStreetMap tile servers, Nominatim geocoding endpoints, and OSRM routing endpoints from the codebase
3. THE Navigation_System SHALL remove all references to MapQuest, Mapbox, Google APIs, and custom API endpoints from the codebase
4. THE Navigation_System SHALL configure RapidAPI authentication using environment variables stored in process.env.RAPIDAPI_KEY
5. THE Navigation_System SHALL include x-rapidapi-host and x-rapidapi-key headers in all RapidAPI requests

### Requirement 2: Location Review Integration

**User Story:** As a user, I want to see reviews and ratings for my destination, so that I can make informed decisions about my travel plans

#### Acceptance Criteria

1. THE Navigation_System SHALL implement a backend endpoint at /api/review that accepts review_id as a query parameter
2. WHEN a review request is received, THE Navigation_System SHALL call https://maps-data.p.rapidapi.com/review.php with the provided review_id
3. THE Navigation_System SHALL include x-rapidapi-host: maps-data.p.rapidapi.com and x-rapidapi-key headers in review requests
4. WHEN a destination is selected, THE Navigation_System SHALL automatically fetch and display review data for that location
5. THE Navigation_System SHALL display review information in the user interface alongside route information

### Requirement 3: Dual Location Search with Geocoding

**User Story:** As a user, I want to enter both a start location and destination with autocomplete suggestions, so that I can plan routes from any origin to any destination

#### Acceptance Criteria

1. THE Navigation_System SHALL display two separate input fields labeled "Start Location" and "Destination"
2. WHEN a user types in either location field, THE Navigation_System SHALL provide autocomplete suggestions using a RapidAPI geocoding service
3. THE Navigation_System SHALL implement a backend endpoint at /api/geocode that accepts a query parameter q for location search
4. THE Navigation_System SHALL use LocationIQ, GeoDB Cities API, or another accurate RapidAPI geocoding service for location search
5. WHEN a user selects a location from autocomplete suggestions, THE Navigation_System SHALL populate the corresponding input field with the selected location
6. THE Navigation_System SHALL support voice input for both Start_Location and Destination_Location fields

### Requirement 4: RapidAPI-Based Routing

**User Story:** As a user, I want to get turn-by-turn navigation between my start location and destination, so that I can follow an optimized route

#### Acceptance Criteria

1. THE Navigation_System SHALL implement a backend endpoint at /api/route that accepts start and end query parameters containing coordinates
2. THE Navigation_System SHALL use TomTom Routing, Route4Me, or OpenRouteService via RapidAPI for route calculation
3. WHEN a route request is received, THE Navigation_System SHALL return step-by-step navigation instructions
4. THE Navigation_System SHALL return route distance, estimated travel time, and traffic information
5. THE Navigation_System SHALL return turn-by-turn instructions for the calculated route
6. THE Navigation_System SHALL display the route as a polyline overlay on the map interface
7. THE Navigation_System SHALL provide a "Get Route" button that triggers route calculation when both locations are specified

### Requirement 5: Road Safety and Risk Analysis

**User Story:** As a user, I want to see safety information about my route including accident hotspots and risk scores, so that I can make safer travel decisions

#### Acceptance Criteria

1. THE Navigation_System SHALL implement a backend endpoint at /api/safety that accepts lat and lon query parameters
2. WHEN a safety request is received, THE Navigation_System SHALL fetch accident hotspot data from RapidAPI datasets
3. THE Navigation_System SHALL fetch traffic incident information from RapidAPI datasets
4. THE Navigation_System SHALL calculate and return road risk scores based on available safety data
5. WHEN a destination is selected, THE Navigation_System SHALL automatically display safety information and risk scores in the user interface
6. THE Navigation_System SHALL provide travel time optimization suggestions based on safety data

### Requirement 6: Enhanced Voice Command System

**User Story:** As a user, I want to use natural voice commands to specify my start location and destination, so that I can navigate hands-free

#### Acceptance Criteria

1. WHEN a user says "Navigate from [location]", THE Navigation_System SHALL populate the Start_Location field with the specified location
2. WHEN a user says "Take me to [location]" or "Navigate to [location]", THE Navigation_System SHALL populate the Destination_Location field with the specified location
3. WHEN both Start_Location and Destination_Location are populated via voice, THE Navigation_System SHALL automatically trigger route calculation
4. THE Navigation_System SHALL implement wake-word detection for phrases like "Hey RoadGPT, navigate to [location]"
5. THE Navigation_System SHALL use Web Speech API or RapidAPI Speech-to-Text service for continuous speech recognition
6. THE Navigation_System SHALL provide faster speech recognition response times compared to the current implementation
7. THE Navigation_System SHALL display voice input icons next to both Start_Location and Destination_Location input fields
8. WHEN voice input is active, THE Navigation_System SHALL provide visual feedback indicating listening state

### Requirement 7: Map Tile Service Migration

**User Story:** As a developer, I want to replace OpenStreetMap tile layers with RapidAPI-compatible map services, so that all map data comes from RapidAPI

#### Acceptance Criteria

1. THE Navigation_System SHALL remove the OpenStreetMap tile layer URL https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png from the codebase
2. THE Navigation_System SHALL implement a RapidAPI-compatible map tile service for displaying the base map
3. THE Navigation_System SHALL maintain the same map interaction capabilities including pan, zoom, and marker placement
4. THE Navigation_System SHALL display route polylines on the RapidAPI-sourced map tiles

### Requirement 8: Backend API Structure

**User Story:** As a developer, I want a well-organized backend API structure that handles all RapidAPI integrations, so that the code is maintainable and scalable

#### Acceptance Criteria

1. THE Navigation_System SHALL implement GET /api/geocode endpoint that uses RapidAPI for location search
2. THE Navigation_System SHALL implement GET /api/route endpoint that uses RapidAPI for routing calculations
3. THE Navigation_System SHALL implement GET /api/review endpoint that uses RapidAPI Maps Data API for reviews
4. THE Navigation_System SHALL implement GET /api/safety endpoint that uses RapidAPI for safety and traffic data
5. THE Navigation_System SHALL handle errors gracefully and return appropriate HTTP status codes for all endpoints
6. THE Navigation_System SHALL validate required query parameters for each endpoint before making RapidAPI calls
7. THE Navigation_System SHALL log RapidAPI request errors with sufficient detail for debugging

### Requirement 9: User Interface Enhancements

**User Story:** As a user, I want an intuitive interface with clear input fields and action buttons, so that I can easily plan and view my routes

#### Acceptance Criteria

1. THE Navigation_System SHALL display a "Start Location" input field with autocomplete functionality
2. THE Navigation_System SHALL display a "Destination" input field with autocomplete functionality
3. THE Navigation_System SHALL display a "Get Route" button that becomes enabled when both locations are specified
4. THE Navigation_System SHALL display voice input icons adjacent to both location input fields
5. WHEN a route is calculated, THE Navigation_System SHALL display the route polyline on the map
6. WHEN a destination is selected, THE Navigation_System SHALL display reviews and risk scores automatically
7. THE Navigation_System SHALL maintain the existing transcript card for voice command feedback
8. THE Navigation_System SHALL provide loading indicators during API requests

### Requirement 10: Environment Configuration

**User Story:** As a developer, I want proper environment configuration for RapidAPI credentials, so that the application can securely authenticate with RapidAPI services

#### Acceptance Criteria

1. THE Navigation_System SHALL store the RapidAPI key in an environment variable named RAPIDAPI_KEY
2. THE Navigation_System SHALL store RapidAPI host values in environment variables as needed for different services
3. THE Navigation_System SHALL load environment variables from a .env file in the backend directory
4. THE Navigation_System SHALL prevent exposure of API keys in client-side code
5. THE Navigation_System SHALL provide clear error messages when required environment variables are missing
