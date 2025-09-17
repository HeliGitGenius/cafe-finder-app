let map;
let placesService;
let userLocation;
let allCafes = [];
let filteredCafes = [];
let activeMarkers = [];
let selectedCafe = null;
let favorites = JSON.parse(localStorage.getItem('cafeFavorites')) || [];
let isDarkTheme = localStorage.getItem('darkTheme') === 'true';
let isDebugMode = false;

function debugLog(message) {
    if (isDebugMode) {
        console.log(`[CafeFinder Debug] ${message}`);
        const debugInfo = document.getElementById('debugInfo');
        debugInfo.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
        debugInfo.classList.add('show');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    debugLog('App initialized');
    initializeTheme();
    setupEventListeners();
    requestUserLocation();
});

function initializeTheme() {
    if (isDarkTheme) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i><span>Light</span>';
    }
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    localStorage.setItem('darkTheme', isDarkTheme);
    
    if (isDarkTheme) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i><span>Light</span>';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-moon"></i><span>Dark</span>';
    }
    
    if (map) {
        map.setOptions({
            styles: isDarkTheme ? getDarkMapStyle() : []
        });
    }
    
    showToast('Theme updated! ✨', 'success');
}

function setupEventListeners() {
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('toggleSidebar').addEventListener('click', toggleSidebar);
    document.getElementById('locationBtn').addEventListener('click', requestUserLocation);
    
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') performSearch();
    });
    document.getElementById('voiceBtn').addEventListener('click', startVoiceSearch);
    
    document.getElementById('ratingFilter').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);
    document.getElementById('openNow').addEventListener('change', applyFilters);
    document.getElementById('radiusFilter').addEventListener('input', function(e) {
        document.getElementById('radiusValue').textContent = e.target.value + ' km';
        debounceSearch();
    });
    
    document.getElementById('myLocationBtn').addEventListener('click', centerOnUserLocation);
    document.getElementById('favoritesBtn').addEventListener('click', showFavorites);

    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'd') {
            e.preventDefault();
            isDebugMode = !isDebugMode;
            showToast(`Debug mode ${isDebugMode ? 'ON' : 'OFF'}`, 'success');
        }
    });
}

function requestUserLocation() {
    debugLog('Requesting user location...');
    
    if (navigator.geolocation) {
        showToast('🌍 Getting your location...', 'success');
        
        navigator.geolocation.getCurrentPosition(
            function(position) {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                debugLog(`Location found: ${userLocation.lat}, ${userLocation.lng}`);
                showToast('📍 Location found!', 'success');
                initializeMap();
                setTimeout(() => {
                    searchNearbyCafes();
                }, 1000);
            },
            function(error) {
                debugLog(`Geolocation error: ${error.message}`);
                console.error('Geolocation error:', error);
                userLocation = { lat: 19.0760, lng: 72.8777 };
                showToast('🌍 Using default location (Mumbai). Enable location for better results!', 'error');
                initializeMap();
                setTimeout(() => {
                    searchNearbyCafes();
                }, 1000);
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 300000
            }
        );
    } else {
        debugLog('Geolocation not supported');
        userLocation = { lat: 19.0760, lng: 72.8777 };
        showToast('🌍 Geolocation not supported. Using default location.', 'error');
        initializeMap();
        setTimeout(() => {
            searchNearbyCafes();
        }, 1000);
    }
}

function centerOnUserLocation() {
    if (userLocation && map) {
        map.setCenter(userLocation);
        map.setZoom(15);
        showToast('📍 Centered on your location!', 'success');
    }
}

function initializeMap() {
    debugLog('Initializing map...');
    
    const mapOptions = {
        zoom: 14,
        center: userLocation,
        styles: isDarkTheme ? getDarkMapStyle() : [],
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
        gestureHandling: 'cooperative'
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    
    placesService = new google.maps.places.PlacesService(map);
    
    debugLog('Map and Places service initialized');

    if (userLocation) {
        new google.maps.Marker({
            position: userLocation,
            map: map,
            title: 'Your Location',
            icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-pushpin.png',
                scaledSize: new google.maps.Size(40, 40)
            }
        });
    }
}

function getDarkMapStyle() {
    return [
        {
            featureType: 'all',
            elementType: 'labels.text.fill',
            stylers: [{ color: '#ffffff' }]
        },
        {
            featureType: 'all',
            elementType: 'labels.text.stroke',
            stylers: [{ color: '#000000' }, { lightness: 13 }]
        },
        {
            featureType: 'administrative',
            elementType: 'geometry.fill',
            stylers: [{ color: '#000000' }]
        },
        {
            featureType: 'administrative',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#144b53' }, { lightness: 14 }, { weight: 1.4 }]
        },
        {
            featureType: 'landscape',
            elementType: 'all',
            stylers: [{ color: '#08304b' }]
        },
        {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [{ color: '#0c4152' }, { lightness: 5 }]
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry.fill',
            stylers: [{ color: '#000000' }]
        },
        {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#0b434f' }, { lightness: 25 }]
        },
        {
            featureType: 'road.arterial',
            elementType: 'geometry.fill',
            stylers: [{ color: '#000000' }]
        },
        {
            featureType: 'road.arterial',
            elementType: 'geometry.stroke',
            stylers: [{ color: '#0b3d51' }, { lightness: 16 }]
        },
        {
            featureType: 'road.local',
            elementType: 'geometry',
            stylers: [{ color: '#000000' }]
        },
        {
            featureType: 'transit',
            elementType: 'all',
            stylers: [{ color: '#146474' }]
        },
        {
            featureType: 'water',
            elementType: 'all',
            stylers: [{ color: '#021019' }]
        }
    ];
}

function searchNearbyCafes(query = '') {
    if (!map || !placesService || !userLocation) {
        debugLog('Missing required components for search');
        showToast('⚠️ Map not ready yet. Please wait...', 'error');
        return;
    }

    debugLog(`Searching for cafes with query: "${query}"`);
    showToast('🔍 Searching for cafes...', 'success');

    const radius = parseInt(document.getElementById('radiusFilter').value) * 1000;
    
    const searchStrategies = [
        {
            location: new google.maps.LatLng(userLocation.lat, userLocation.lng),
            radius: radius,
            type: 'cafe',
            keyword: query.trim() || 'coffee'
        },
        {
            location: new google.maps.LatLng(userLocation.lat, userLocation.lng),
            radius: radius,
            keyword: query.trim() ? `${query} cafe coffee` : 'cafe coffee shop'
        },
        {
            location: new google.maps.LatLng(userLocation.lat, userLocation.lng),
            radius: radius,
            name: query.trim() || 'cafe'
        }
    ];

    let currentStrategy = 0;

    function trySearch() {
        if (currentStrategy >= searchStrategies.length) {
            handleSearchError('ZERO_RESULTS');
            return;
        }

        const request = searchStrategies[currentStrategy];
        debugLog(`Trying search strategy ${currentStrategy + 1}: ${JSON.stringify({...request, location: 'LatLng'})}`);

        placesService.nearbySearch(request, function(results, status, pagination) {
            debugLog(`Strategy ${currentStrategy + 1} - Status: ${status}, Results: ${results ? results.length : 0}`);
            
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                allCafes = results.map(place => ({
                    ...place,
                    distance: calculateDistance(
                        userLocation, 
                        {lat: place.geometry.location.lat(), lng: place.geometry.location.lng()}
                    )
                }));
                
                debugLog(`Successfully found ${allCafes.length} cafes`);
                applyFilters();
                showToast(`☕ Found ${results.length} cafes nearby!`, 'success');
                
                if (pagination && pagination.hasNextPage && results.length < 40) {
                    debugLog('Loading additional results...');
                    setTimeout(() => {
                        pagination.nextPage();
                    }, 1200);
                }
                
            } else if (status === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
                handleAPIKeyError();
            } else if (status === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT) {
                handleQuotaError();
            } else {
                currentStrategy++;
                setTimeout(() => {
                    trySearch();
                }, 500);
            }
        });
    }

    trySearch();
}

function handleAPIKeyError() {
    const errorMessage = `
        <div class="error-state">
            <i class="fas fa-key" style="color: #E91E63; font-size: 48px; margin-bottom: 20px;"></i>
            <h3>🔑 API Key Issue</h3>
            <p style="margin: 15px 0; line-height: 1.6;">Your Google Maps API key needs configuration:</p>
            
            <div style="background: #FFF3C4; padding: 15px; border-radius: 10px; margin: 15px 0; text-align: left;">
                <strong>Quick Fix Steps:</strong>
                <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #E91E63;">Google Cloud Console</a></li>
                    <li>Select your project</li>
                    <li>Click "APIs & Services" → "Library"</li>
                    <li>Search and enable these APIs:
                        <ul style="margin: 5px 0; padding-left: 20px;">
                            <li>✅ Maps JavaScript API</li>
                            <li>✅ Places API</li>
                        </ul>
                    </li>
                    <li>Go to "Credentials" → Click your API key</li>
                    <li>Under "API restrictions", select "Restrict key"</li>
                    <li>Enable: Maps JavaScript API & Places API</li>
                    <li>Save and wait 5 minutes</li>
                </ol>
            </div>
            
            <div style="margin-top: 20px;">
                <button onclick="searchNearbyCafes()" style="margin: 5px; padding: 12px 24px; background: var(--success-color); color: white; border: none; border-radius: 20px; cursor: pointer;">
                    🔄 Try Again
                </button>
                <button onclick="window.open('https://console.cloud.google.com/apis/credentials', '_blank')" style="margin: 5px; padding: 12px 24px; background: var(--accent-color); color: white; border: none; border-radius: 20px; cursor: pointer;">
                    🔧 Fix API Key
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('cafeList').innerHTML = errorMessage;
    document.getElementById('resultsCount').textContent = 'API Error';
    showToast('🔑 Please configure your API key permissions', 'error');
}

function handleQuotaError() {
    const errorMessage = `
        <div class="error-state">
            <i class="fas fa-chart-line" style="color: #FF9800; font-size: 48px; margin-bottom: 20px;"></i>
            <h3>📊 Quota Exceeded</h3>
            <p>You've reached your daily API quota limit.</p>
            <div style="background: #FFF3C4; padding: 15px; border-radius: 10px; margin: 15px 0;">
                <strong>Solutions:</strong>
                <ul style="text-align: left; margin: 10px 0;">
                    <li>Wait 24 hours for quota reset</li>
                    <li>Enable billing in Google Cloud Console</li>
                    <li>Increase quota limits</li>
                </ul>
            </div>
            <button onclick="window.open('https://console.cloud.google.com/billing', '_blank')" style="margin-top: 15px; padding: 12px 24px; background: var(--warning-color); color: white; border: none; border-radius: 20px; cursor: pointer;">
                💳 Setup Billing
            </button>
        </div>
    `;
    
    document.getElementById('cafeList').innerHTML = errorMessage;
    document.getElementById('resultsCount').textContent = 'Quota Error';
    showToast('📊 API quota exceeded. Please check your billing.', 'error');
}

function handleSearchError(status) {
    let errorMessage = '';
    let toastMessage = '';
    
    switch (status) {
        case google.maps.places.PlacesServiceStatus.ZERO_RESULTS:
            errorMessage = `
                <div class="error-state">
                    <i class="fas fa-search" style="color: var(--text-light); font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>🔍 No Cafes Found</h3>
                    <p>No cafes found in this area with your current filters.</p>
                    <div style="margin: 20px 0;">
                        <button onclick="document.getElementById('radiusFilter').value='5'; document.getElementById('radiusValue').textContent='5 km'; searchNearbyCafes();" style="margin: 5px; padding: 10px 20px; background: var(--accent-color); color: white; border: none; border-radius: 15px; cursor: pointer;">
                            📏 Expand Search (5km)
                        </button>
                        <button onclick="document.getElementById('ratingFilter').value='0'; document.getElementById('openNow').checked=false; searchNearbyCafes();" style="margin: 5px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 15px; cursor: pointer;">
                            🎯 Clear Filters
                        </button>
                    </div>
                </div>
            `;
            toastMessage = '🔍 No cafes found. Try expanding your search area.';
            break;
            
        case google.maps.places.PlacesServiceStatus.REQUEST_DENIED:
            handleAPIKeyError();
            return;
            
        case google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT:
            handleQuotaError();
            return;
            
        default:
            errorMessage = `
                <div class="error-state">
                    <i class="fas fa-exclamation-triangle" style="color: var(--accent-color); font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>😕 Something went wrong</h3>
                    <p>Unable to search for cafes right now.</p>
                    <button onclick="searchNearbyCafes()" style="margin-top: 15px; padding: 12px 24px; background: var(--accent-color); color: white; border: none; border-radius: 20px; cursor: pointer;">
                        🔄 Try Again
                    </button>
                </div>
            `;
            toastMessage = '😕 Search failed. Please try again.';
    }
    
    document.getElementById('cafeList').innerHTML = errorMessage;
    document.getElementById('resultsCount').textContent = 'Error';
    showToast(toastMessage, 'error');
}

function applyFilters() {
    debugLog('Applying filters...');
    
    const minRating = parseFloat(document.getElementById('ratingFilter').value);
    const sortBy = document.getElementById('sortBy').value;
    const openNow = document.getElementById('openNow').checked;

    filteredCafes = allCafes.filter(cafe => {
        const rating = cafe.rating || 0;
        const isOpen = !openNow || (cafe.opening_hours && cafe.opening_hours.open_now);
        
        return rating >= minRating && isOpen;
    });

    filteredCafes.sort((a, b) => {
        switch (sortBy) {
            case 'rating':
                return (b.rating || 0) - (a.rating || 0);
            case 'name':
                return a.name.localeCompare(b.name);
            case 'distance':
            default:
                return a.distance - b.distance;
        }
    });

    debugLog(`Filtered to ${filteredCafes.length} cafes`);
    displayCafes();
    updateMapMarkers();
}

function displayCafes() {
    const cafeList = document.getElementById('cafeList');
    const resultsCount = document.getElementById('resultsCount');
    
    resultsCount.textContent = `${filteredCafes.length} found`;

    if (filteredCafes.length === 0) {
        cafeList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-coffee"></i>
                <h3>No cafes match your criteria</h3>
                <p>Try adjusting your filters or search in a different area!</p>
            </div>
        `;
        return;
    }

    cafeList.innerHTML = filteredCafes.map((cafe, index) => `
        <div class="cafe-card" role="listitem" tabindex="0" data-place-id="${cafe.place_id}" 
             aria-labelledby="cafe-name-${index}" onclick="selectCafe('${cafe.place_id}')"
             onkeydown="handleCafeCardKeydown(event, '${cafe.place_id}')">
            <div class="cafe-header">
                <div>
                    <div class="cafe-name" id="cafe-name-${index}">${cafe.name}</div>
                    <div class="cafe-rating" aria-label="Rating: ${cafe.rating || 'No rating'} stars">
                        <span class="stars">${generateStars(cafe.rating)}</span>
                        <span class="rating-text">${cafe.rating ? cafe.rating.toFixed(1) : 'New'} ${cafe.user_ratings_total ? `(${cafe.user_ratings_total})` : ''}</span>
                    </div>
                </div>
                <button class="favorite-btn ${favorites.includes(cafe.place_id) ? 'active' : ''}" 
                        onclick="toggleFavorite(event, '${cafe.place_id}')"
                        aria-label="${favorites.includes(cafe.place_id) ? 'Remove from favorites' : 'Add to favorites'}">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            
            <div class="cafe-info">
                ${cafe.price_level ? `<span class="info-badge price">${'£'.repeat(cafe.price_level)}</span>` : ''}
                <span class="info-badge ${cafe.opening_hours && cafe.opening_hours.open_now ? 'open' : 'closed'}">
                    ${cafe.opening_hours && cafe.opening_hours.open_now ? '✅ Open Now' : '❌ Closed'}
                </span>
                ${cafe.rating >= 4.5 ? '<span class="info-badge" style="background: #FFD700; color: #333;">⭐ Top Rated</span>' : ''}
            </div>
            
            <div class="cafe-address">📍 ${cafe.vicinity}</div>
            <div class="cafe-distance">${cafe.distance.toFixed(1)} km away</div>
        </div>
    `).join('');
}

function updateMapMarkers() {
    activeMarkers.forEach(marker => marker.setMap(null));
    activeMarkers = [];

    filteredCafes.forEach((cafe, index) => {
        const marker = new google.maps.Marker({
            position: cafe.geometry.location,
            map: map,
            title: cafe.name,
            icon: {
                url: favorites.includes(cafe.place_id) 
                    ? 'https://maps.google.com/mapfiles/ms/icons/red-pushpin.png'
                    : 'https://maps.google.com/mapfiles/ms/icons/orange-pushpin.png',
                scaledSize: new google.maps.Size(35, 35)
            }
        });

        marker.addListener('click', () => selectCafe(cafe.place_id));
        activeMarkers.push(marker);
    });
}

function selectCafe(placeId) {
    selectedCafe = placeId;
    
    document.querySelectorAll('.cafe-card').forEach(card => {
        card.classList.remove('active');
    });
    
    const selectedCard = document.querySelector(`[data-place-id="${placeId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('active');
        selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const cafe = filteredCafes.find(c => c.place_id === placeId);
    if (cafe && map) {
        map.setCenter(cafe.geometry.location);
        map.setZoom(16);
        
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div style="font-family: 'Comfortaa', cursive; max-width: 250px;">
                    <h3 style="margin: 0 0 10px 0; color: #8B4513;">${cafe.name}</h3>
                    <div style="margin: 5px 0;">
                        <span style="color: #FFD700;">${generateStars(cafe.rating)}</span>
                        <span style="margin-left: 8px; color: #666;">${cafe.rating ? cafe.rating.toFixed(1) : 'New'}</span>
                    </div>
                    <p style="margin: 8px 0; color: #666; font-size: 14px;">${cafe.vicinity}</p>
                    <div style="margin: 10px 0;">
                        <span style="background: ${cafe.opening_hours && cafe.opening_hours.open_now ? '#4CAF50' : '#E91E63'}; 
                                     color: white; padding: 4px 8px; border-radius: 10px; font-size: 12px;">
                            ${cafe.opening_hours && cafe.opening_hours.open_now ? '✅ Open Now' : '❌ Closed'}
                        </span>
                    </div>
                </div>
            `
        });

        const marker = activeMarkers.find(m => m.getTitle() === cafe.name);
        if (marker) {
            infoWindow.open(map, marker);
        }
    }
}

function generateStars(rating) {
    if (!rating) return '☆☆☆☆☆';
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + 
           (hasHalfStar ? '☆' : '') + 
           '☆'.repeat(emptyStars);
}

function calculateDistance(pos1, pos2) {
    const R = 6371;
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLon = (pos2.lng - pos1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toggleFavorite(event, placeId) {
    event.stopPropagation();
    
    const index = favorites.indexOf(placeId);
    if (index > -1) {
        favorites.splice(index, 1);
        showToast('💔 Removed from favorites', 'success');
    } else {
        favorites.push(placeId);
        showToast('💖 Added to favorites!', 'success');
    }
    
    localStorage.setItem('cafeFavorites', JSON.stringify(favorites));
    
    displayCafes();
    updateMapMarkers();
}

function showFavorites() {
    if (favorites.length === 0) {
        showToast('💔 No favorites yet! Click the heart icon on cafes to add them.', 'error');
        return;
    }

    const favoriteCafes = allCafes.filter(cafe => favorites.includes(cafe.place_id));
    
    if (favoriteCafes.length === 0) {
        showToast('💔 Your favorite cafes are not in the current search results.', 'error');
        return;
    }

    filteredCafes = favoriteCafes;
    displayCafes();
    updateMapMarkers();
    
    document.getElementById('resultsCount').textContent = `${favoriteCafes.length} favorites`;
    showToast(`💖 Showing ${favoriteCafes.length} favorite cafes!`, 'success');
}

function performSearch() {
    const query = document.getElementById('searchInput').value.trim();
    debugLog(`Performing search with query: "${query}"`);
    searchNearbyCafes(query);
}

let searchTimeout;
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchNearbyCafes();
    }, 1000);
}

function handleCafeCardKeydown(event, placeId) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectCafe(placeId);
    }
}

function startVoiceSearch() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast('🚫 Voice search not supported in this browser', 'error');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    document.getElementById('voiceBtn').innerHTML = '<i class="fas fa-stop"></i>';
    document.getElementById('voiceBtn').style.background = 'var(--accent-color)';
    
    showToast('🎤 Listening... Speak now!', 'success');

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('searchInput').value = transcript;
        showToast(`🎤 Heard: "${transcript}"`, 'success');
        performSearch();
        
        document.getElementById('voiceBtn').innerHTML = '<i class="fas fa-microphone"></i>';
        document.getElementById('voiceBtn').style.background = '';
    };

    recognition.onend = function() {
        document.getElementById('voiceBtn').innerHTML = '<i class="fas fa-microphone"></i>';
        document.getElementById('voiceBtn').style.background = '';
    };

    recognition.onerror = function(event) {
        showToast(`🚫 Voice search error: ${event.error}`, 'error');
        document.getElementById('voiceBtn').innerHTML = '<i class="fas fa-microphone"></i>';
        document.getElementById('voiceBtn').style.background = '';
    };

    recognition.start();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

function initMap() {
    debugLog('Google Maps loaded, waiting for user location...');
}

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
});

window.addEventListener('error', function(event) {
    if (event.message.includes('Google Maps')) {
        showToast('🗺️ Map loading failed. Please check your internet connection.', 'error');
        debugLog(`Map error: ${event.message}`);
    }
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        debugLog('Service Worker support detected');
    });
}

