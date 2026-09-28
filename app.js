import { DB } from './data/db.js';

class AddisActiveApp {
  constructor() {
    this.currentView = 'home';
    this.userCoords = [9.0300, 38.7400]; // Default Addis Center
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
    // Hide splash screen immediately to prevent freezing
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.remove(), 400);
    }

    this.setupEventListeners();
    this.getUserLocation();
    this.checkUserOnboarding();
  }

  checkUserOnboarding() {
    const saved = localStorage.getItem('addis_active_profile');
    if (saved) {
      DB.userProfile = JSON.parse(saved);
      this.renderView('home');
    } else {
      const modal = document.getElementById('onboardingModal');
      if (modal) modal.style.display = 'flex';
      this.renderView('home');
    }
  }

  getUserLocation() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.userCoords = [pos.coords.latitude, pos.coords.longitude];
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }

  setupEventListeners() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.renderView(tab.getAttribute('data-target'));
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

    if (searchTrigger && searchModal) searchTrigger.addEventListener('click', () => searchModal.classList.add('active'));
    if (searchClose && searchModal) searchClose.addEventListener('click', () => searchModal.classList.remove('active'));
    if (searchInput) searchInput.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));

    const detailModal = document.getElementById('detailModal');
    detailModal?.addEventListener('click', (e) => {
      if (e.target === detailModal) detailModal.classList.remove('active');
    });

    const onboardingForm = document.getElementById('onboardingForm');
    onboardingForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('setupName').value;
      const primaryActivity = document.getElementById('setupActivity').value;
      const homeArea = document.getElementById('setupArea').value;
      const fitnessLevel = document.getElementById('setupLevel').value;

      DB.userProfile = {
        username,
        primaryActivity,
        homeArea,
        fitnessLevel,
        activeGoals: [
          { id: 'g1', title: `First ${primaryActivity.toUpperCase()} Session`, target: '5 KM', progress: '0 KM', status: 'In Progress' }
        ]
      };

      localStorage.setItem('addis_active_profile', JSON.stringify(DB.userProfile));
      document.getElementById('onboardingModal').style.display = 'none';
      this.renderView('home');
    });
  }

  renderView(viewName) {
    if (!DB.userProfile && viewName !== 'profile') {
      const modal = document.getElementById('onboardingModal');
      if (modal) modal.style.display = 'flex';
      return;
    }

    this.currentView = viewName;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.querySelectorAll('.nav-tab').forEach(tab => {
      if (tab.getAttribute('data-target') === viewName) tab.classList.add('active');
      else tab.classList.remove('active');
    });

    const main = document.getElementById('appMain');
    if (!main) return;

    switch(viewName) {
      case 'home': main.innerHTML = this.getHomeHTML(); this.bindHomeEvents(); break;
      case 'explore': main.innerHTML = this.getExploreHTML('all'); this.bindExploreEvents(); break;
      case 'videos': main.innerHTML = this.getVideosHTML(); break;
      case 'activity': main.innerHTML = this.getActivityTrackerHTML(); this.bindTrackerEvents(); break;
      case 'events': main.innerHTML = this.getEventsHTML(); break;
      case 'profile': main.innerHTML = this.getProfileHTML(); this.bindProfileEvents(); break;
      default: main.innerHTML = this.getHomeHTML();
    }
  }

  getSortedRoutes() {
    return [...DB.routes].sort((a, b) => {
      const distA = this.calcHaversine(this.userCoords[0], this.userCoords[1], a.coords[0], a.coords[1]);
      const distB = this.calcHaversine(this.userCoords[0], this.userCoords[1], b.coords[0], b.coords[1]);
      return distA - distB;
    });
  }

  getHomeHTML() {
    const profile = DB.userProfile || { username: 'Athlete', homeArea: 'Bole', primaryActivity: 'run' };
    const sortedRoutes = this.getSortedRoutes().slice(0, 4);

    return `
      <div class="view-section active">
        <div class="hero-box">
          <div class="location-tag"><span class="brand-dot"></span><span>ADDIS ABABA • 2,355M ALTITUDE</span></div>
          <h2 class="hero-title">WELCOME BACK, ${profile.username.toUpperCase()}</h2>
          <p class="hero-tagline">FAVORITE ZONE: ${profile.homeArea.toUpperCase()}</p>
          <p class="hero-desc">Your active engine is tuned for ${profile.primaryActivity} sessions across Addis parks & corridors.</p>
          <div class="hero-btns">
            <button class="btn btn-primary" id="heroExploreBtn">Explore Addis</button>
            <button class="btn btn-outline" id="heroTrackBtn">Start Activity</button>
          </div>
        </div>

        <div class="card">
          <span class="section-subtitle">Proximity Engine</span>
          <h3 class="section-title">Nearest to You</h3>
          <p class="section-desc">Sorted dynamically by your current GPS position.</p>
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${sortedRoutes.map(r => `
              <div style="background:#181818; padding:1rem; border-radius:10px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="window.app.showRouteDetails('${r.id}')">
                <div>
                  <span class="badge">${r.activity} •${r.area}</span>
                  <h4 style="font-family:var(--font-display); font-size:1.05rem; margin:0.3rem 0;">${r.name}</h4>
                  <p style="font-size:0.8rem; color:var(--text-muted);">📏 ${r.distance} \vert{} ⚡${r.elevation}</p>
                </div>
                <button class="btn btn-outline btn-sm">View</button>
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
    const allRoutes = this.getSortedRoutes();
    const routes = filter === 'all' ? allRoutes : allRoutes.filter(r => r.activity === filter);

    return `
      <div class="view-section active">
        <span class="section-subtitle">Explore Addis</span>
        <h3 class="section-title">20+ Corridors & Parks</h3>
        <p class="section-desc">Proximity-sorted active spaces across Addis Ababa.</p>
        
        <div class="filter-bar">
          <button class="filter-chip ${filter === 'all' ? 'active':''}" data-filter="all">All</button>
          <button class="filter-chip ${filter === 'run' ? 'active':''}" data-filter="run">Run</button>
          <button class="filter-chip ${filter === 'walk' ? 'active':''}" data-filter="walk">Walk</button>
          <button class="filter-chip ${filter === 'bike' ? 'active':''}" data-filter="bike">Bike</button>
          <button class="filter-chip ${filter === 'hike' ? 'active':''}" data-filter="hike">Hike</button>
          <button class="filter-chip ${filter === 'swim' ? 'active':''}" data-filter="swim">Swim</button>
          <button class="filter-chip ${filter === 'football' ? 'active':''}" data-filter="football">Football</button>
          <button class="filter-chip ${filter === 'fitness' ? 'active':''}" data-filter="fitness">Fitness</button>
        </div>

        <div id="mapContainer"></div>

        <div class="grid-2" style="margin-top:1rem;">
          ${routes.map(r => `
            <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <span class="badge">${r.activity} •${r.area}</span>
                <h4 style="font-family:var(--font-display); font-size:1.1rem; margin:0.4rem 0;">${r.name}</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">${r.desc}</p>
                <div style="display:flex; justify-content:space-between; font-family:var(--font-tech); font-size:0.75rem; color:var(--accent-lime); margin-bottom:1rem;">
                  <span>📏 ${r.distance}</span>
                  <span>⚡ ${r.elevation}</span>
                </div>
              </div>
              <button class="btn btn-outline btn-full btn-sm route-detail-btn" data-id="${r.id}">View Route Details</button>
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

    document.querySelectorAll('.route-detail-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.showRouteDetails(btn.getAttribute('data-id'));
      });
    });

    setTimeout(() => {
      if (typeof L !== 'undefined' && document.getElementById('mapContainer')) {
        const map = L.map('mapContainer').setView(this.userCoords, 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
        DB.routes.forEach(r => {
          L.marker(r.coords).addTo(map).bindPopup(`<b>${r.name}</b><br>${r.area}`);
        });
      }
    }, 150);
  }

  showRouteDetails(routeId) {
    const r = DB.routes.find(x => x.id === routeId);
    if (!r) return;
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailModalContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <span class="badge">${r.activity} • ${r.area}</span>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('detailModal').classList.remove('active')">✕ Close</button>
      </div>
      <h3 style="font-family:var(--font-display); font-size:1.4rem; margin-bottom:0.5rem;">${r.name}</h3>
      <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1rem;">${r.desc}</p>
      
      <div style="background:#181818; padding:1rem; border-radius:10px; margin-bottom:1rem; font-size:0.85rem; display:flex; flex-direction:column; gap:0.5rem;">
        <div>📏 <strong>Distance:</strong> ${r.distance}</div>
        <div>⚡ <strong>Elevation:</strong> ${r.elevation}</div>
        <div>🧭 <strong>Surface:</strong> ${r.surface}</div>
        <div>📍 <strong>Start Point:</strong> ${r.startingPoint}</div>
      </div>

      <h4 style="font-family:var(--font-display); font-size:1rem; margin-bottom:0.5rem;">Facilities & Amenities</h4>
      <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; margin-bottom:1.25rem;">
        ${r.facilities.map(f => `<div style="background:#181818; padding:0.5rem 0.75rem; border-radius:8px; color:var(--text-muted);">✓ ${f}</div>`).join('')}
      </div>

      <div style="background:rgba(204,255,0,0.1); border:1px solid rgba(204,255,0,0.3); padding:0.85rem; border-radius:10px; font-size:0.85rem; margin-bottom:1.25rem;">
        ${r.communityNotes}
      </div>

      <button class="btn btn-primary btn-full" onclick="alert('Route saved to your favorites!'); document.getElementById('detailModal').classList.remove('active');">⭐ Save Route to Favorites</button>
    `;
    modal.classList.add('active');
  }

  getVideosHTML() {
    return `
      <div class="view-section active">
        <span class="section-subtitle">Video-First Discovery</span>
        <h3 class="section-title">20+ Addis Visual Feeds</h3>
        <p class="section-desc">“Watch before you go” — Preview 20 different parks, corridors, and trails.</p>
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
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getActivityTrackerHTML() {
    return `
      <div class="view-section active">
        <span class="section-subtitle">Live GPS Engine</span>
        <h3 class="section-title">Activity Tracker</h3>
        <p class="section-desc">Track runs, hikes, and rides locally.</p>
        <div class="tracker-card">
          <div id="timerDisplay" class="timer-display">00:00:00</div>
          <div class="metrics-row">
            <div class="metric-box"><div id="distDisplay" class="m-val">0.00</div><div class="m-lbl">Kilometers</div></div>
            <div class="metric-box"><div id="paceDisplay" class="m-val">0:00</div><div class="m-lbl">Pace /km</div></div>
            <div class="metric-box"><div id="gpsStatus" class="m-val" style="font-size:1rem; color:var(--accent-lime);">Ready</div><div class="m-lbl">GPS Status</div></div>
          </div>
          <div id="trackerMap" style="height:200px; width:100%; border-radius:10px; margin-bottom:1rem; background:#111;"></div>
          <div style="display:flex; gap:0.5rem;">
            <button id="startTrackBtn" class="btn btn-primary btn-full">Start Session</button>
            <button id="stopTrackBtn" class="btn btn-outline" style="display:none; color:var(--danger-red); border-color:var(--danger-red);">Finish</button>
          </div>
        </div>
      </div>
    `;
  }

  bindTrackerEvents() {
    const startBtn = document.getElementById('startTrackBtn');
    const stopBtn = document.getElementById('stopTrackBtn');

    startBtn?.addEventListener('click', () => {
      startBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'block';
      this.startGPSession();
    });

    stopBtn?.addEventListener('click', () => {
      this.stopGPSession();
      alert('Activity completed and goal progress updated!');
      this.renderView('profile');
    });

    setTimeout(() => {
      if (typeof L !== 'undefined' && document.getElementById('trackerMap')) {
        this.mapInstance = L.map('trackerMap').setView(this.userCoords, 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.mapInstance);
      }
    }, 150);
  }

  startGPSession() {
    this.startTime = Date.now();
    this.distance = 0;
    this.routeCoordinates = [];
    document.getElementById('gpsStatus').innerText = 'Active';

    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition((pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > 30) return;
        const pt = [latitude, longitude];
        if (this.lastCoords) {
          const d = this.calcHaversine(this.lastCoords[0], this.lastCoords[1], latitude, longitude);
          if (d > 0.002) {
            this.distance += d;
            document.getElementById('distDisplay').innerText = this.distance.toFixed(2);
          }
        }
        this.lastCoords = pt;
        this.routeCoordinates.push(pt);
        if (this.mapInstance) {
          this.mapInstance.setView(pt, 15);
          if (!this.polylineInstance) {
            this.polylineInstance = L.polyline(this.routeCoordinates, { color: '#CCFF00', weight: 4 }).addTo(this.mapInstance);
          } else {
            this.polylineInstance.setLatLngs(this.routeCoordinates);
          }
        }
      }, () => {}, { enableHighAccuracy: true });
    }

    this.timerInterval = setInterval(() => {
      const s = Math.floor((Date.now() - this.startTime) / 1000);
      const m = Math.floor(s / 60).toString().padStart(2, '0');
      const sec = (s % 60).toString().padStart(2, '0');
      const h = Math.floor(s / 3600).toString().padStart(2, '0');
      document.getElementById('timerDisplay').innerText = `${h}:${m}:${sec}`;
    }, 1000);
  }

  stopGPSession() {
    if (this.watchId !== null) navigator.geolocation.clearWatch(this.watchId);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  calcHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  getEventsHTML() {
    return `
      <div class="view-section active">
        <span class="section-subtitle">Community Schedule</span>
        <h3 class="section-title">Events & Meetups</h3>
        <p class="section-desc">Join verified group runs across Addis Ababa.</p>
        <div style="display:flex; flex-direction:column; gap:1rem;">
          ${DB.events.map(ev => `
            <div class="card" style="margin-bottom:0;">
              <span class="badge">${ev.status}</span>
              <h4 style="font-family:var(--font-display); font-size:1.15rem; margin:0.4rem 0;">${ev.title}</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">${ev.description}</p>
              <div style="font-size:0.8rem; font-family:var(--font-tech); color:var(--accent-lime); margin-bottom:1rem;">📅 ${ev.date} at${ev.startTime}</div>
              <button class="btn btn-primary btn-full btn-sm" onclick="alert('Successfully registered!')">Register for Event</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getProfileHTML() {
    const profile = DB.userProfile || { username: 'Athlete', homeArea: 'Bole', primaryActivity: 'run', activeGoals: [] };
    return `
      <div class="view-section active">
        <span class="section-subtitle">My Journey & Goals</span>
        <h3 class="section-title">${profile.username}'s Dashboard</h3>
        <p class="section-desc">Active personalized fitness targets.</p>

        <div class="card" style="border-color:var(--accent-lime);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <h4 style="font-family:var(--font-display); font-size:1.1rem;">🎯 Personal Goals</h4>
            <button class="btn btn-primary btn-sm" id="addGoalBtn">+ Add Goal</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.75rem;">
            ${profile.activeGoals.map(g => `
              <div style="background:#181818; padding:0.85rem; border-radius:10px; border:1px solid #222;">
                <div style="display:flex; justify-content:space-between; font-weight:600; font-size:0.9rem; margin-bottom:0.3rem;">
                  <span>${g.title}</span>
                  <span style="font-family:var(--font-tech); color:var(--accent-lime);">${g.progress} /${g.target}</span>
                </div>
                <div style="font-family:var(--font-tech); font-size:0.65rem; color:var(--text-dim);">${g.status}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="card">
          <h4 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:0.5rem;">Territory Stamps</h4>
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.75rem; margin-top:0.75rem;">
            ${DB.territories.map(t => `
              <div style="background:#181818; border:1px solid ${t.status === 'UNLOCKED' ? 'var(--accent-lime)' : 'var(--border-color)'}; padding:0.75rem; border-radius:10px;">
                <div style="font-size:1.5rem; margin-bottom:0.2rem;">${t.icon}</div>
                <div style="font-family:var(--font-display); font-size:0.9rem; font-weight:700;">${t.name}</div>
                <div style="font-family:var(--font-tech); font-size:0.65rem; color:${t.status === 'UNLOCKED' ? 'var(--accent-lime)' : 'var(--text-dim)'}; margin-top:0.2rem;">${t.status}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  bindProfileEvents() {
    document.getElementById('addGoalBtn')?.addEventListener('click', () => {
      const title = prompt('Enter your custom goal title (e.g., Weekly 20KM Run):');
      const target = prompt('Enter target distance/amount (e.g., 20 KM):');
      if (title && target) {
        DB.userProfile.activeGoals.push({ id: 'g' + Date.now(), title, target, progress: '0 KM', status: 'In Progress' });
        localStorage.setItem('addis_active_profile', JSON.stringify(DB.userProfile));
        this.renderView('profile');
      }
    });
  }

  handleGlobalSearch(query) {
    const res = document.getElementById('searchResults');
    if (!res) return;
    if (!query.trim()) {
      res.innerHTML = '<p class="search-hint">Type anything to explore Addis Ababa...</p>';
      return;
    }
    const q = query.toLowerCase();
    const matches = DB.routes.filter(r => r.name.toLowerCase().includes(q) || r.area.toLowerCase().includes(q));
    res.innerHTML = matches.length ? matches.map(r => `
      <div class="search-result-item" onclick="document.getElementById('searchModal').classList.remove('active'); window.app.showRouteDetails('${r.id}');">
        <strong>${r.name}</strong> (${r.area})
      </div>
    `).join('') : '<p class="search-hint">No results found.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new AddisActiveApp(); });
