import { DB } from './data/db.js';

class AddisActiveApp {
  constructor() {
    this.currentView = 'home';
    this.userCoords = [9.0300, 38.7400];
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
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.style.opacity = '0';
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
        (pos) => { this.userCoords = [pos.coords.latitude, pos.coords.longitude]; },
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

    const searchTrigger = document.getElementById('searchTrigger');
    const searchModal = document.getElementById('searchModal');
    const searchClose = document.getElementById('searchClose');
    const searchInput = document.getElementById('globalSearchInput');

    if (searchTrigger && searchModal) searchTrigger.addEventListener('click', () => searchModal.classList.add('active'));
    if (searchClose && searchModal) searchClose.addEventListener('click', () => searchModal.classList.remove('active'));
    if (searchInput) searchInput.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));

    const onboardingForm = document.getElementById('onboardingForm');
    onboardingForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('setupName').value;
      const primaryActivity = document.getElementById('setupActivity').value;
      const homeArea = document.getElementById('setupArea').value;

      DB.userProfile = {
        username,
        primaryActivity,
        homeArea,
        xp: 50,
        level: 1,
        activeGoals: [
          { id: 'g1', title: `First ${DB.activitiesMeta[primaryActivity]?.title || 'Activity'} Session`, target: '5 KM', progress: '0 KM', status: 'In Progress' }
        ],
        completedActivitiesCount: 0
      };

      localStorage.setItem('addis_active_profile', JSON.stringify(DB.userProfile));
      document.getElementById('onboardingModal').style.display = 'none';
      this.renderView('home');
    });

    const detailModal = document.getElementById('detailModal');
    detailModal?.addEventListener('click', (e) => {
      if (e.target === detailModal) detailModal.classList.remove('active');
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

    main.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'view-section';

    switch(viewName) {
      case 'home': wrapper.innerHTML = this.getHomeHTML(); this.bindHomeEvents(); break;
      case 'explore': wrapper.innerHTML = this.getExploreHTML('all'); this.bindExploreEvents(); break;
      case 'activity': wrapper.innerHTML = this.getActivityTrackerHTML(); this.bindTrackerEvents(); break;
      case 'profile': wrapper.innerHTML = this.getProfileHTML(); this.bindProfileEvents(); break;
      default: wrapper.innerHTML = this.getHomeHTML();
    }

    main.appendChild(wrapper);
    setTimeout(() => wrapper.classList.add('active'), 10);
  }

  getSortedRoutes() {
    return [...DB.routes].sort((a, b) => {
      const distA = this.calcHaversine(this.userCoords[0], this.userCoords[1], a.coords[0], a.coords[1]);
      const distB = this.calcHaversine(this.userCoords[0], this.userCoords[1], b.coords[0], b.coords[1]);
      return distA - distB;
    });
  }

  calcHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  getHomeHTML() {
    const profile = DB.userProfile || { username: 'Athlete', homeArea: 'Bole', primaryActivity: 'run', xp: 0, level: 1 };
    const sortedRoutes = this.getSortedRoutes().slice(0, 4);
    const actMeta = DB.activitiesMeta[profile.primaryActivity] || DB.activitiesMeta['run'];

    return `
      <div class="hero-box">
        <div class="location-tag"><span class="brand-dot"></span><span>ADDIS ABABA • 2,355M ALTITUDE</span></div>
        <h2 class="hero-title">${profile.username.toUpperCase()}</h2>
        <p class="hero-tagline">LVL ${profile.level} ATHLETE • ${profile.xp} XP</p>
        <p class="hero-desc">Engine tuned for ${actMeta.title} ${actMeta.icon} across Addis corridors.</p>
        <div class="hero-btns">
          <button class="btn btn-primary" id="heroExploreBtn">Explore All Activities</button>
          <button class="btn btn-outline" id="heroTrackBtn">Start GPS Session</button>
        </div>
      </div>

      <div class="card">
        <span class="section-subtitle">Proximity Engine</span>
        <h3 class="section-title">Nearest to You</h3>
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.75rem;">
          ${sortedRoutes.map(r => `
            <div style="background:#181818; padding:1rem; border-radius:10px; border:1px solid #222; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="window.app.showRouteDetails('${r.id}')">
              <div>
                <span class="badge">${DB.activitiesMeta[r.activity]?.icon || '📍'} ${r.activity.toUpperCase()} •${r.area}</span>
                <h4 style="font-family:var(--font-display); font-size:1.05rem; margin:0.3rem 0;">${r.name}</h4>
                <p style="font-size:0.8rem; color:var(--text-muted);">📏 ${r.distance} \vert{} ⚡${r.elevation}</p>
              </div>
              <button class="btn btn-outline btn-sm">View</button>
            </div>
          `).join('')}
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
      <span class="section-subtitle">Multi-Activity & Video Feed</span>
      <h3 class="section-title">Explore 23+ Addis Locations</h3>
      <p class="section-desc">Filter by running, walking, cycling, swimming, hiking, football, or fitness.</p>
      
      <div class="filter-bar">
        <button class="filter-chip ${filter === 'all' ? 'active':''}" data-filter="all">All</button>
        <button class="filter-chip ${filter === 'run' ? 'active':''}" data-filter="run">Run 🏃</button>
        <button class="filter-chip ${filter === 'walk' ? 'active':''}" data-filter="walk">Walk 🚶</button>
        <button class="filter-chip ${filter === 'bike' ? 'active':''}" data-filter="bike">Bike 🚴</button>
        <button class="filter-chip ${filter === 'swim' ? 'active':''}" data-filter="swim">Swim 🏊</button>
        <button class="filter-chip ${filter === 'hike' ? 'active':''}" data-filter="hike">Hike 🥾</button>
        <button class="filter-chip ${filter === 'football' ? 'active':''}" data-filter="football">Football ⚽</button>
        <button class="filter-chip ${filter === 'fitness' ? 'active':''}" data-filter="fitness">Fitness 🏋️</button>
      </div>

      <div class="grid-2" style="margin-top:1rem;">
        ${routes.map(r => `
          <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="background:#1a1a1a; padding:0.75rem; border-radius:8px; border:1px solid #282828; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.85rem; font-weight:600;">📺 Watch: ${r.videoTitle}</span>
                <span class="badge">⏱️ ${r.videoDuration}</span>
              </div>
              <span class="badge">${DB.activitiesMeta[r.activity]?.icon || '📍'} ${r.activity.toUpperCase()} •${r.area}</span>
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
    `;
  }

  bindExploreEvents() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const filter = e.target.getAttribute('data-filter');
        const main = document.getElementById('appMain');
        if (main) {
          const wrapper = main.querySelector('.view-section');
          if (wrapper) wrapper.innerHTML = this.getExploreHTML(filter);
          this.bindExploreEvents();
        }
      });
    });

    document.querySelectorAll('.route-detail-btn').forEach(btn => {
      btn.addEventListener('click', () => { this.showRouteDetails(btn.getAttribute('data-id')); });
    });
  }

  showRouteDetails(routeId) {
    const r = DB.routes.find(x => x.id === routeId);
    if (!r) return;
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailModalContent');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <span class="badge">${r.activity.toUpperCase()} • ${r.area}</span>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('detailModal').classList.remove('active')">✕ Close</button>
      </div>
      <h3 style="font-family:var(--font-display); font-size:1.4rem; margin-bottom:0.5rem;">${r.name}</h3>
      <p style="font-size:0.9rem; color:var(--text-muted); margin-bottom:1rem;">${r.desc}</p>
      
      <div style="background:#181818; padding:1rem; border-radius:10px; margin-bottom:1rem; font-size:0.85rem; display:flex; flex-direction:column; gap:0.5rem;">
        <div>📏 <strong>Distance / Format:</strong> ${r.distance}</div>
        <div>⚡ <strong>Elevation / Intensity:</strong> ${r.elevation}</div>
        <div>🧭 <strong>Surface / Ground:</strong> ${r.surface}</div>
        <div>📍 <strong>Starting Point:</strong> ${r.startingPoint}</div>
      </div>

      <h4 style="font-family:var(--font-display); font-size:1rem; margin-bottom:0.5rem;">Facilities & Amenities</h4>
      <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem; margin-bottom:1.25rem;">
        ${r.facilities.map(f => `<div style="background:#181818; padding:0.5rem 0.75rem; border-radius:8px; color:var(--text-muted);">✓ ${f}</div>`).join('')}
      </div>

      <button class="btn btn-primary btn-full" onclick="alert('Route saved to favorites! +20 XP'); document.getElementById('detailModal').classList.remove('active');">⭐ Save Route & Earn XP</button>
    `;
    modal.classList.add('active');
  }

  getActivityTrackerHTML() {
    return `
      <span class="section-subtitle">Live GPS Engine</span>
      <h3 class="section-title">Multi-Activity Tracker</h3>
      <p class="section-desc">Track runs, rides, walks, hikes, and training locally.</p>
      <div class="tracker-card">
        <div id="timerDisplay" class="timer-display">00:00:00</div>
        <div class="metrics-row">
          <div class="metric-box"><div id="distDisplay" class="m-val">0.00</div><div class="m-lbl">Kilometers</div></div>
          <div class="metric-box"><div id="paceDisplay" class="m-val">0:00</div><div class="m-lbl">Pace /km</div></div>
          <div class="metric-box"><div id="gpsStatus" class="m-val" style="font-size:1rem; color:var(--accent-lime);">Ready</div><div class="m-lbl">GPS Status</div></div>
        </div>
        <div id="trackerMap" style="height:200px; width:100%; border-radius:10px; margin-bottom:1rem; background:#111;"></div>
        <div style="display:flex; gap:0.5rem;">
          <button id="startTrackBtn" class="btn btn-primary btn-full">Start Session (+100 XP)</button>
          <button id="stopTrackBtn" class="btn btn-outline" style="display:none; color:var(--danger-red); border-color:var(--danger-red);">Finish & Claim XP</button>
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
      if (DB.userProfile) {
        DB.userProfile.xp += 100;
        if (DB.userProfile.xp >= 150) DB.userProfile.level = 2;
        DB.userProfile.completedActivitiesCount = (DB.userProfile.completedActivitiesCount || 0) + 1;
        localStorage.setItem('addis_active_profile', JSON.stringify(DB.userProfile));
      }
      alert('Activity completed! You earned +100 XP and unlocked territory progress!');
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

  getProfileHTML() {
    const profile = DB.userProfile || { username: 'Athlete', xp: 50, level: 1, activeGoals: [] };
    const xpPercent = Math.min(100, (profile.xp / 150) * 100);

    return `
      <span class="section-subtitle">Gamification & Progression</span>
      <h3 class="section-title">${profile.username}'s Dashboard</h3>
      <p class="section-desc">Level ${profile.level} Athlete • ${profile.xp} / 150 XP to Next Level</p>

      <div class="card" style="background:#141810; border-color:rgba(204,255,0,0.3);">
        <div style="display:flex; justify-content:space-between; font-family:var(--font-tech); font-size:0.8rem; margin-bottom:0.5rem;">
          <span>LEVEL ${profile.level}</span>
          <span style="color:var(--accent-lime);">${profile.xp} XP</span>
        </div>
        <div style="width:100%; height:8px; background:#222; border-radius:4px; overflow:hidden;">
          <div style="width:${xpPercent}%; height:100%; background:var(--accent-lime); transition:width 0.4s ease;"></div>
        </div>
      </div>

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
        <h4 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:0.5rem;">Territory Conquering</h4>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.75rem; margin-top:0.75rem;">
          ${DB.territories.map(t => `
            <div style="background:#181818; border:1px solid ${profile.xp >= t.xpRequired ? 'var(--accent-lime)' : 'var(--border-color)'}; padding:0.75rem; border-radius:10px;">
              <div style="font-size:1.5rem; margin-bottom:0.2rem;">${t.icon}</div>
              <div style="font-family:var(--font-display); font-size:0.9rem; font-weight:700;">${t.name}</div>
              <div style="font-family:var(--font-tech); font-size:0.65rem; color:${profile.xp >= t.xpRequired ? 'var(--accent-lime)' : 'var(--text-dim)'}; margin-top:0.2rem;">
                ${profile.xp >= t.xpRequired ? 'UNLOCKED ⚡' : `NEEDS ${t.xpRequired} XP`}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <h4 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:0.5rem;">Badges & Achievements</h4>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.75rem; margin-top:0.75rem;">
          ${DB.badges.map(b => `
            <div style="background:#181818; border:1px solid ${profile.completedActivitiesCount > 0 ? 'var(--accent-lime)' : 'var(--border-color)'}; padding:0.75rem; border-radius:10px; text-align:center;">
              <div style="font-size:1.8rem; margin-bottom:0.2rem;">${b.icon}</div>
              <div style="font-family:var(--font-display); font-size:0.85rem; font-weight:700;">${b.name}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">${b.desc}</div>
            </div>
          `).join('')}
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
