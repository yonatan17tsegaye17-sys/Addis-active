import { DB } from './data/db.js';

class AddisActiveApp {
  constructor() {
    this.currentView = 'home';
    this.activeActivity = null;
    this.watchId = null;
    this.startTime = null;
    this.timerInterval = null;
    this.distance = 0;
    this.lastCoords = null;
    this.routeCoordinates = [];
    this.mapInstance = null;
    this.polylineInstance = null;
    this.init();
  }

  init() {
    this.checkOnlineStatus();
    this.setupEventListeners();
    this.renderView('home');
  }

  checkOnlineStatus() {
    const banner = document.getElementById('offlineBanner');
    if (!banner) return;
    const updateStatus = () => {
      if (navigator.onLine) {
        banner.style.display = 'none';
      } else {
        banner.style.display = 'block';
      }
    };
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  setupEventListeners() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const target = tab.getAttribute('data-target');
        this.renderView(target);
      });
    });

    document.querySelectorAll('[data-link="home"]').forEach(el => {
      el.addEventListener('click', () => this.renderView('home'));
    });

    document.querySelectorAll('[data-link="profile"]').forEach(el => {
      el.addEventListener('click', () => this.renderView('profile'));
    });

    const searchTrigger = document.getElementById('searchTrigger');
    const searchModal = document.getElementById('searchModal');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('globalSearchInput');

    if (searchTrigger && searchModal) {
      searchTrigger.addEventListener('click', () => searchModal.classList.add('active'));
    }
    if (searchClose && searchModal) {
      searchClose.addEventListener('click', () => searchModal.classList.remove('active'));
    }
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));
    }
  }

  renderView(viewName) {
    this.currentView = viewName;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.querySelectorAll('.nav-tab').forEach(tab => {
      if (tab.getAttribute('data-target') === viewName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    const main = document.getElementById('appMain');
    if (!main) return;

    switch(viewName) {
      case 'home':
        main.innerHTML = this.getHomeHTML();
        this.bindHomeEvents();
        break;
      case 'explore':
        main.innerHTML = this.getExploreHTML('all');
        this.bindExploreEvents();
        break;
      case 'videos':
        main.innerHTML = this.getVideosHTML();
        this.bindVideoEvents();
        break;
      case 'activity':
        main.innerHTML = this.getActivityTrackerHTML();
        this.bindTrackerEvents();
        break;
      case 'events':
        main.innerHTML = this.getEventsHTML();
        this.bindEventEvents();
        break;
      case 'profile':
        main.innerHTML = this.getProfileHTML();
        this.bindProfileEvents();
        break;
      default:
        main.innerHTML = this.getHomeHTML();
    }
  }

  getHomeHTML() {
    return `
      <div class="view-section active">
        <div class="hero-box">
          <div class="location-tag">
            <span class="brand-dot"></span>
            <span>ADDIS ABABA • 2,355M ALTITUDE</span>
          </div>
          <h2 class="hero-title">DISCOVER, MOVE & CONNECT.</h2>
          <p class="hero-tagline">THE ACTIVE LIFE ENGINE FOR ETHIOPIA'S CAPITAL</p>
          <p class="hero-desc">Explore verified mountain routes, join community running sessions, and track your movement across Addis Ababa.</p>
          <div class="hero-btns">
            <button class="btn btn-primary" id="heroExploreBtn">Explore Addis</button>
            <button class="btn btn-outline" id="heroTrackBtn">Start Activity</button>
          </div>
        </div>

        <div class="card">
          <span class="section-subtitle">City Pulse</span>
          <h3 class="section-title">Active Schedule</h3>
          <p class="section-desc">Upcoming community sessions and verified routes.</p>
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${DB.events.map(ev => `
              <div style="background:#181818; padding:1rem; border-radius:8px; border:1px solid #222;">
                <span class="badge">${ev.activityId}</span>
                <h4 style="font-family:var(--font-display); font-size:1.1rem; margin:0.3rem 0;">${ev.title}</h4>
                <p style="font-size:0.850rem; color:var(--text-muted);">📍 ${ev.location} \vert{} ⏰${ev.startTime}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  bindHomeEvents() {
    document.getElementById('heroExploreBtn')?.addEventListener('click', () => this.renderView('explore'));
    document.getElementById('heroTrackBtn')?.addEventListener('click', () => this.renderView('activity'));
  }

  getExploreHTML(filter) {
    const routes = filter === 'all' ? DB.routes : DB.routes.filter(r => r.activity === filter);
    return `
      <div class="view-section active">
        <span class="section-subtitle">Explore Addis</span>
        <h3 class="section-title">Routes & Parks</h3>
        <p class="section-desc">Verified trails, tarmac loops, and active spaces across the city.</p>
        
        <div class="filter-bar">
          <button class="filter-chip ${filter === 'all' ? 'active':''}" data-filter="all">All</button>
          <button class="filter-chip ${filter === 'run' ? 'active':''}" data-filter="run">Run</button>
          <button class="filter-chip ${filter === 'hike' ? 'active':''}" data-filter="hike">Hike</button>
          <button class="filter-chip ${filter === 'walk' ? 'active':''}" data-filter="walk">Walk</button>
        </div>

        <div id="mapContainer"></div>

        <div class="grid-2" style="margin-top:1rem;">
          ${routes.map(r => `
            <div class="card" style="margin-bottom:0;">
              <span class="badge">${r.activity} •${r.area}</span>
              <h4 style="font-family:var(--font-display); font-size:1.1rem; margin:0.4rem 0;">${r.name}</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">${r.desc}</p>
              <div style="display:flex; justify-content:space-between; font-family:var(--font-tech); font-size:0.75rem; color:var(--accent-lime); margin-bottom:1rem;">
                <span>📏 ${r.distance}</span>
                <span>⚡ ${r.elevation}</span>
              </div>
              <button class="btn btn-outline btn-full btn-sm" onclick="alert('Route selected: ${r.name}')">View Route Details</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindExploreEvents() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const filter = e.target.getAttribute('data-filter');
        const main = document.getElementById('appMain');
        if (main) main.innerHTML = this.getExploreHTML(filter);
        this.bindExploreEvents();
      });
    });

    setTimeout(() => {
      if (typeof L !== 'undefined' && document.getElementById('mapContainer')) {
        const map = L.map('mapContainer').setView([9.0300, 38.7400], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);
        L.marker([9.0192, 38.7890]).addTo(map).bindPopup('<b>Bole Loop</b>');
        L.marker([9.0765, 38.7421]).addTo(map).bindPopup('<b>Entoto Ridge</b>');
      }
    }, 150);
  }

  getVideosHTML() {
    return `
      <div class="view-section active">
        <span class="section-subtitle">Video-First Discovery</span>
        <h3 class="section-title">Addis Visual Feed</h3>
        <p class="section-desc">“Watch before you go” — Preview routes, parks, and active corridors across Addis Ababa.</p>
        
        <div style="display:flex; flex-direction:column; gap:1.25rem;">
          ${DB.videos.map(v => `
            <div class="card" style="margin-bottom:0; padding:0; overflow:hidden;">
              <div style="position:relative; background:#000; height:180px;">
                <img src="${v.thumbnail}" alt="${v.title}" style="width:100%; height:100%; object-fit:cover; opacity:0.8;">
                <div style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.8); padding:2px 8px; border-radius:4px; font-family:var(--font-tech); font-size:0.7rem; color:var(--accent-lime);">
                  ⏱️ ${v.duration}
                </div>
              </div>
              <div style="padding:1rem;">
                <span class="badge">${v.area}</span>
                <h4 style="font-family:var(--font-display); font-size:1.1rem; margin:0.4rem 0;">${v.title}</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">${v.desc}</p>
                <button class="btn btn-outline btn-full btn-sm" onclick="alert('Playing video walkthrough: ${v.title}')">▶ Watch Walkthrough</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindVideoEvents() {}

  getActivityTrackerHTML() {
    return `
      <div class="view-section active">
        <span class="section-subtitle">Live GPS Engine</span>
        <h3 class="section-title">Activity Tracker</h3>
        <p class="section-desc">Track runs, walks, hikes, and rides locally with zero data transmission.</p>

        <div class="tracker-card">
          <div id="timerDisplay" class="timer-display">00:00:00</div>
          <div class="metrics-row">
            <div class="metric-box">
              <div id="distDisplay" class="m-val">0.00</div>
              <div class="m-lbl">Kilometers</div>
            </div>
            <div class="metric-box">
              <div id="paceDisplay" class="m-val">0:00</div>
              <div class="m-lbl">Pace /km</div>
            </div>
            <div class="metric-box">
              <div id="gpsStatus" class="m-val" style="font-size:1rem; color:var(--accent-lime);">Ready</div>
              <div class="m-lbl">GPS Status</div>
            </div>
          </div>
          <div id="trackerMap" style="height:200px; width:100%; border-radius:8px; margin-bottom:1rem; background:#111;"></div>
          <div style="display:flex; gap:0.5rem;">
            <button id="startTrackBtn" class="btn btn-primary btn-full">Start Session</button>
            <button id="pauseTrackBtn" class="btn btn-outline" style="display:none;">Pause</button>
            <button id="stopTrackBtn" class="btn btn-outline" style="display:none; color:var(--danger-red); border-color:var(--danger-red);">Finish</button>
          </div>
        </div>
      </div>
    `;
  }

  bindTrackerEvents() {
    const startBtn = document.getElementById('startTrackBtn');
    const pauseBtn = document.getElementById('pauseTrackBtn');
    const stopBtn = document.getElementById('stopTrackBtn');

    startBtn?.addEventListener('click', () => {
      startBtn.style.display = 'none';
      if (pauseBtn) pauseBtn.style.display = 'block';
      if (stopBtn) stopBtn.style.display = 'block';
      this.startGPSession();
    });

    stopBtn?.addEventListener('click', () => {
      this.stopGPSession();
      alert('Activity completed and saved locally to My Journey!');
      this.renderView('profile');
    });

    setTimeout(() => {
      if (typeof L !== 'undefined' && document.getElementById('trackerMap')) {
        this.mapInstance = L.map('trackerMap').setView([9.0300, 38.7400], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(this.mapInstance);
      }
    }, 150);
  }

  startGPSession() {
    this.startTime = Date.now();
    this.distance = 0;
    this.routeCoordinates = [];
    
    document.getElementById('gpsStatus').innerText = 'Searching';

    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          if (accuracy > 30) return;

          document.getElementById('gpsStatus').innerText = 'Active';
          const newPoint = [latitude, longitude];

          if (this.lastCoords) {
            const distIncrement = this.calculateHaversine(this.lastCoords[0], this.lastCoords[1], latitude, longitude);
            if (distIncrement > 0.002) {
              this.distance += distIncrement;
              document.getElementById('distDisplay').innerText = this.distance.toFixed(2);
            }
          }
          this.lastCoords = newPoint;
          this.routeCoordinates.push(newPoint);

          if (this.mapInstance) {
            this.mapInstance.setView(newPoint, 15);
            if (!this.polylineInstance) {
              this.polylineInstance = L.polyline(this.routeCoordinates, { color: '#CCFF00', weight: 4 }).addTo(this.mapInstance);
            } else {
              this.polylineInstance.setLatLngs(this.routeCoordinates);
            }
          }
        },
        (error) => {
          document.getElementById('gpsStatus').innerText = 'Denied/Error';
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    } else {
      document.getElementById('gpsStatus').innerText = 'Unsupported';
    }

    this.timerInterval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
      const mins = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
      const secs = (elapsedSeconds % 60).toString().padStart(2, '0');
      const hours = Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0');
      document.getElementById('timerDisplay').innerText = `${hours}:${mins}:${secs}`;
    }, 1000);
  }

  stopGPSession() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  getEventsHTML() {
    return `
      <div class="view-section active">
        <span class="section-subtitle">Community Schedule</span>
        <h3 class="section-title">Events & Meetups</h3>
        <p class="section-desc">Join verified group runs and outdoor community sessions.</p>
        <div style="display:flex; flex-direction:column; gap:1rem;">
          ${DB.events.map(ev => `
            <div class="card" style="margin-bottom:0;">
              <span class="badge">${ev.status}</span>
              <h4 style="font-family:var(--font-display); font-size:1.15rem; margin:0.4rem 0;">${ev.title}</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">${ev.description}</p>
              <div style="font-size:0.8rem; font-family:var(--font-tech); color:var(--accent-lime); margin-bottom:1rem;">📅 ${ev.date} at${ev.startTime}</div>
              <button class="btn btn-primary btn-full btn-sm" onclick="alert('Successfully registered for ${ev.title}!')">Register for Event</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindEventEvents() {}

  getProfileHTML() {
    return `
      <div class="view-section active">
        <span class="section-subtitle">My Journey</span>
        <h3 class="section-title">Activity Dashboard</h3>
        <p class="section-desc">Your local history, goals, territory stamps, and unlocked badges.</p>

        <div class="card">
          <h4 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:0.5rem;">Territory Stamps & Exploration</h4>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">Collect stamps by exploring city districts.</p>
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.75rem; margin-top:0.75rem;">
            ${DB.territories.map(t => `
              <div style="background:#181818; border:1px solid ${t.status === 'UNLOCKED' ? 'var(--accent-lime)' : 'var(--border-color)'}; padding:0.75rem; border-radius:8px;">
                <div style="font-size:1.5rem; margin-bottom:0.2rem;">${t.icon}</div>
                <div style="font-family:var(--font-display); font-size:0.9rem; font-weight:700;">${t.name}</div>
                <div style="font-family:var(--font-tech); font-size:0.65rem; color:${t.status === 'UNLOCKED' ? 'var(--accent-lime)' : 'var(--text-dim)'}; margin-top:0.2rem;">${t.status}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <h4 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:0.5rem;">Badges & Achievements</h4>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem;">
            ${DB.badges.map(b => `
              <div style="background:#181818; border:1px solid ${b.unlocked ? 'var(--accent-lime)' : 'var(--border-color)'}; padding:0.5rem 0.75rem; border-radius:6px; font-size:0.8rem; display:flex; align-items:center; gap:6px;">
                <span>${b.icon}</span>
                <span>${b.name}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <h4 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:0.5rem;">Saved Activities</h4>
          <p style="font-size:0.85rem; color:var(--text-dim);">Completed GPS sessions will appear here.</p>
        </div>
      </div>
    `;
  }

  bindProfileEvents() {}

  handleGlobalSearch(query) {
    const resultsContainer = document.getElementById('searchResults');
    if (!resultsContainer) return;
    if (!query.trim()) {
      resultsContainer.innerHTML = '<p class="search-hint">Type anything to explore Addis Ababa...</p>';
      return;
    }

    const q = query.toLowerCase();
    const matchedRoutes = DB.routes.filter(r => r.name.toLowerCase().includes(q) || r.area.toLowerCase().includes(q));
    const matchedEvents = DB.events.filter(e => e.title.toLowerCase().includes(q));

    let html = '';
    if (matchedRoutes.length === 0 && matchedEvents.length === 0) {
      html = '<p class="search-hint">No results found in Addis Active.</p>';
    } else {
      matchedRoutes.forEach(r => {
        html += `<div class="search-result-item" onclick="alert('Selected route: ${r.name}')"><strong>Route:</strong> ${r.name} (${r.area})</div>`;
      });
      matchedEvents.forEach(e => {
        html += `<div class="search-result-item" onclick="alert('Selected event: ${e.title}')"><strong>Event:</strong> ${e.title}</div>`;
      });
    }
    resultsContainer.innerHTML = html;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AddisActiveApp();
});
