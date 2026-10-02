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
    this.currentExploreFilter = 'all';
    this.init();
  }

  init() {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 400);
      }, 500);
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

    document.getElementById('adminPulseBtn')?.addEventListener('click', () => {
      const pin = prompt('Enter Admin Passcode for City Pulse:');
      if (pin === '2355') {
        this.renderView('gov');
      } else if (pin !== null) {
        alert('Invalid admin passcode.');
      }
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

    document.addEventListener('click', (e) => {
      const detailBtn = e.target.closest('.route-detail-btn');
      if (detailBtn) {
        const id = detailBtn.getAttribute('data-id');
        this.showRouteDetails(id);
      }

      const filterChip = e.target.closest('.filter-chip');
      if (filterChip) {
        const filter = filterChip.getAttribute('data-filter');
        this.currentExploreFilter = filter;
        const main = document.getElementById('appMain');
        if (main) {
          const wrapper = main.querySelector('.view-section');
          if (wrapper) wrapper.innerHTML = this.getExploreHTML(filter);
        }
      }
    });
  }

  renderView(viewName) {
    if (!DB.userProfile && viewName !== 'profile' && viewName !== 'gov') {
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
      case 'explore': wrapper.innerHTML = this.getExploreHTML(this.currentExploreFilter); break;
      case 'activity': wrapper.innerHTML = this.getActivityTrackerHTML(); this.bindTrackerEvents(); break;
      case 'community': wrapper.innerHTML = this.getCommunityHTML(); break;
      case 'gov': wrapper.innerHTML = this.getGovernmentDashboardHTML(); break;
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
        <h2 class="hero-title">GOOD MORNING, ${profile.username.toUpperCase()}</h2>
        <p class="hero-tagline">LVL ${profile.level} ATHLETE • ${profile.xp} XP</p>
        <p class="hero-desc">Engine tuned for ${actMeta.title} ${actMeta.icon} across Addis corridors.</p>
        <div class="hero-btns">
          <button class="btn btn-primary" onclick="window.app.renderView('explore')">Explore Addis 🗺️</button>
          <button class="btn btn-outline" id="heroTrackBtn">Start GPS Session</button>
        </div>
      </div>

      <div class="card">
        <span class="section-subtitle">Addis Active Today</span>
        <h3 class="section-title">📍 Nearest to You</h3>
        <p class="section-desc">Sorted dynamically by your current GPS position with full route telemetry.</p>
        <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.75rem;">
          ${sortedRoutes.map(r => `
            <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="background:#1a1a1a; padding:0.5rem 0.75rem; border-radius:8px; border:1px solid #282828; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
                  <span style="font-size:0.8rem; font-weight:600;">📺 Watch: ${r.videoTitle}</span>
                  <span class="badge">⏱️ ${r.videoDuration}</span>
                </div>
                <span class="badge">${DB.activitiesMeta[r.activity]?.icon || '📍'} ${r.activity.toUpperCase()} •${r.area}</span>
                <h4 style="font-family:var(--font-display); font-size:1.1rem; margin:0.3rem 0;">${r.name}</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem;">${r.desc}</p>
                <div style="font-size:0.75rem; color:var(--accent-lime); font-family:var(--font-tech); margin-bottom:0.75rem;">📏 ${r.distance} | ⚡ ${r.elevation} \vert{} 🧭 ${r.surface}</div>
              </div>
              <button class="btn btn-outline btn-full btn-sm route-detail-btn" data-id="${r.id}">View Route Details</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindHomeEvents() {
    document.getElementById('heroTrackBtn')?.addEventListener('click', () => this.renderView('activity'));
  }

  getExploreHTML(filter) {
    this.currentExploreFilter = filter;
    const allRoutes = this.getSortedRoutes();
    const routes = filter === 'all' ? allRoutes : allRoutes.filter(r => r.activity === filter);

    return `
      <span class="section-subtitle">Central Discovery</span>
      <h3 class="section-title">Explore Addis Ababa</h3>
      <p class="section-desc">Classified strictly by exercise category across 23+ high-altitude locations.</p>
      
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
              <div style="font-size:0.75rem; color:var(--accent-lime); font-family:var(--font-tech); margin-bottom:1rem;">📏 ${r.distance} | ⚡ ${r.elevation} \vert{} 🧭 ${r.surface}</div>
            </div>
            <button class="btn btn-outline btn-full btn-sm route-detail-btn" data-id="${r.id}">View Route Details</button>
          </div>
        `).join('')}
      </div>
    `;
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
      <p class="section-desc">Define your activity type before starting your local GPS session.</p>
      <div class="tracker-card">
        <div style="margin-bottom:1rem; text-align:left;">
          <label style="font-size:0.75rem; font-family:var(--font-tech); color:var(--text-muted);">ACTIVE SESSION TYPE</label>
          <select id="trackerActivityType" style="width:100%; background:#181818; border:1px solid var(--border-color); color:#fff; padding:0.75rem; border-radius:8px; margin-top:0.3rem;">
            <option value="run">Running 🏃</option>
            <option value="walk">Walking 🚶</option>
            <option value="bike">Cycling 🚴</option>
            <option value="swim">Swimming 🏊</option>
            <option value="hike">Hiking 🥾</option>
            <option value="football">Football ⚽</option>
            <option value="fitness">Fitness 🏋️️</option>
          </select>
        </div>

        <div id="activeActivityBadge" style="margin-bottom:1rem; font-family:var(--font-tech); font-size:0.8rem; color:var(--accent-lime);"></div>
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
    const activitySelect = document.getElementById('trackerActivityType');
    const badgeDiv = document.getElementById('activeActivityBadge');

    startBtn?.addEventListener('click', () => {
      if (activitySelect) {
        activitySelect.disabled = true;
        const selectedVal = activitySelect.value;
        const meta = DB.activitiesMeta[selectedVal] || { title: selectedVal, icon: '⚡' };
        if (badgeDiv) badgeDiv.innerText = `🟢 TRACKING ACTIVE: ${meta.title.toUpperCase()} ${meta.icon}`;
      }
      startBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'block';
      this.startGPSession();
    });

    stopBtn?.addEventListener('click', () => {
      this.stopGPSession();
      if (activitySelect) activitySelect.disabled = false;
      if (badgeDiv) badgeDiv.innerText = '';
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

  getCommunityHTML() {
    return `
      <span class="section-subtitle">Community Network</span>
      <h3 class="section-title">Active Addis Communities</h3>
      <p class="section-desc">Connect with running clubs, cycling networks, and walking groups.</p>
      <div style="display:flex; flex-direction:column; gap:1rem;">
        ${DB.communities.map(c => `
          <div class="card">
            <span class="badge">${c.type} •${c.area}</span>
            <h4 style="font-family:var(--font-display); font-size:1.15rem; margin:0.4rem 0;">${c.name}</h4>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">${c.desc}</p>
            <div style="font-size:0.8rem; font-family:var(--font-tech); color:var(--accent-lime); margin-bottom:1rem;">📅 ${c.schedule} \vert{} 📍 ${c.meetingPoint}</div>
            <button class="btn btn-primary btn-full btn-sm" onclick="alert('Successfully connected with ${c.name}!')">Join Community Layer</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  getGovernmentDashboardHTML() {
    const totalRoutes = DB.routes.length;
    const totalCommunities = DB.communities.length;
    const totalTerritories = DB.territories.length;

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <div>
          <span class="section-subtitle">Admin Security Layer</span>
          <h3 class="section-title">City Pulse Dashboard</h3>
        </div>
        <button class="btn btn-outline btn-sm" onclick="window.app.renderView('home')">✕ Exit Admin</button>
      </div>
      <p class="section-desc">Restricted municipal intelligence overview for authorized administrators only.</p>

      <div class="grid-2" style="margin-bottom:1rem;">
        <div class="card" style="margin-bottom:0;">
          <div class="m-val" style="color:var(--accent-lime); font-size:2rem;">${totalRoutes}</div>
          <div class="m-lbl" style="margin-top:0.3rem;">Verified Active Corridors & Parks</div>
        </div>
        <div class="card" style="margin-bottom:0;">
          <div class="m-val" style="color:var(--accent-lime); font-size:2rem;">${totalCommunities}</div>
          <div class="m-lbl" style="margin-top:0.3rem;">Registered Community Networks</div>
        </div>
      </div>

      <div class="card">
        <h4 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:0.75rem;">📊 Activity Ecosystem Distribution</h4>
        <div style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.85rem;">
          <div style="background:#181818; padding:0.75rem; border-radius:8px; display:flex; justify-content:space-between;">
            <span>🏃 Running Corridors</span><strong style="color:var(--accent-lime);">8 Locations</strong>
          </div>
          <div style="background:#181818; padding:0.75rem; border-radius:8px; display:flex; justify-content:space-between;">
            <span>🚶 Walking Promenades</span><strong style="color:var(--accent-lime);">6 Locations</strong>
          </div>
          <div style="background:#181818; padding:0.75rem; border-radius:8px; display:flex; justify-content:space-between;">
            <span>🚴 Cycling Routes</span><strong style="color:var(--accent-lime);">3 Locations</strong>
          </div>
          <div style="background:#181818; padding:0.75rem; border-radius:8px; display:flex; justify-content:space-between;">
            <span>🥾 Hiking Trails</span><strong style="color:var(--accent-lime);">3 Locations</strong>
          </div>
          <div style="background:#181818; padding:0.75rem; border-radius:8px; display:flex; justify-content:space-between;">
            <span>⚽ Swimming, Football & Fitness</span><strong style="color:var(--accent-lime);">3 Locations</strong>
          </div>
        </div>
      </div>
    `;
  }

  getProfileHTML() {
    const profile = DB.userProfile || { username: 'Athlete', xp: 50, level: 1, activeGoals: [], completedActivitiesCount: 0 };
    const xpPercent = Math.min(100, (profile.xp / 150) * 100);

    return `
      <!-- Strava-Inspired "You" Profile Layout -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <div>
          <h2 style="font-family:var(--font-display); font-size:1.6rem; font-weight:800;">${profile.username}</h2>
          <span class="badge">LVL ${profile.level} ATHLETE • ${profile.homeArea}</span>
        </div>
        <button class="icon-btn" onclick="alert('Profile settings')">⚙️</button>
      </div>

      <!-- Top Segment Tabs matching Strava You style -->
      <div style="display:flex; gap:1.5rem; border-bottom:1px solid var(--border-color); margin-bottom:1.25rem; font-family:var(--font-sans); font-weight:600; font-size:0.95rem;">
        <span style="color:var(--accent-lime); padding-bottom:0.5rem; border-bottom:2px solid var(--accent-lime); cursor:pointer;">Progress</span>
        <span style="color:var(--text-muted); padding-bottom:0.5rem; cursor:pointer;" onclick="alert('Workouts log coming soon')">Workouts</span>
        <span style="color:var(--text-muted); padding-bottom:0.5rem; cursor:pointer;" onclick="alert('Activities log coming soon')">Activities</span>
      </div>

      <!-- Weekly Progress Card -->
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
          <span style="font-family:var(--font-display); font-size:1.1rem; font-weight:700;">This week</span>
          <span class="badge">XP: ${profile.xp}</span>
        </div>
        <div class="metrics-row" style="grid-template-columns: repeat(3, 1fr); margin-bottom:1rem;">
          <div class="metric-box"><div class="m-val">${(profile.completedActivitiesCount * 3.5).toFixed(1)} km</div><div class="m-lbl">Distance</div></div>
          <div class="metric-box"><div class="m-val">${profile.completedActivitiesCount * 25}m</div><div class="m-lbl">Time</div></div>
          <div class="metric-box"><div class="m-val">+140m</div><div class="m-lbl">Elev Gain</div></div>
        </div>
        <div style="background:#181818; padding:1rem; border-radius:10px; border:1px solid var(--border-color); text-align:center;">
          <div style="font-family:var(--font-tech); font-size:0.75rem; color:var(--text-muted); margin-bottom:0.5rem;">PROGRESSION CURVE (12 WEEKS)</div>
          <div style="height:60px; display:flex; align-items:flex-end; justify-content:space-between; padding:0 1rem;">
            <div style="width:8px; height:20%; background:var(--border-color); border-radius:4px;"></div>
            <div style="width:8px; height:35%; background:var(--border-color); border-radius:4px;"></div>
            <div style="width:8px; height:50%; background:var(--border-color); border-radius:4px;"></div>
            <div style="width:8px; height:40%; background:var(--border-color); border-radius:4px;"></div>
            <div style="width:8px; height:75%; background:var(--accent-lime); border-radius:4px;"></div>
            <div style="width:8px; height:60%; background:var(--accent-lime); border-radius:4px;"></div>
          </div>
        </div>
      </div>

      <!-- Streak & Gamified Territory Card -->
      <div class="card" style="display:flex; align-items:center; justify-content:space-between; background:linear-gradient(135deg, #181410 0%, var(--bg-card) 100%);">
        <div>
          <span class="section-subtitle">Consistency Streak</span>
          <h3 style="font-family:var(--font-display); font-size:1.8rem; font-weight:800; color:#ff6600;">🔥 ${Math.max(1, profile.completedActivitiesCount)} Weeks</h3>
          <p style="font-size:0.85rem; color:var(--text-muted);">Active consistency across Addis high-altitude corridors.</p>
        </div>
        <div style="font-size:2.5rem; background:rgba(255,102,0,0.15); padding:1rem; border-radius:14px; border:1px solid rgba(255,102,0,0.3);">⚡</div>
      </div>

      <!-- Territory & Gamification Progress -->
      <div class="card">
        <h4 style="font-family:var(--font-display); font-size:1.1rem; margin-bottom:0.5rem;">🗺️ Gamified Territory Exploration</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Unlock municipal zones as your athlete level and XP increase.</p>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.75rem;">
          ${DB.territories.map(t => `
            <div style="background:#181818; border:1px solid ${profile.xp >= t.xpRequired ? 'var(--accent-lime)' : 'var(--border-color)'}; padding:0.75rem; border-radius:10px;">
              <div style="font-size:1.5rem; margin-bottom:0.2rem;">${t.icon}</div>
              <div style="font-family:var(--font-display); font-size:0.9rem; font-weight:700;">${t.name}</div>
              <div style="font-family:var(--font-tech); font-size:0.65rem; color:${profile.xp >= t.xpRequired ? 'var(--accent-lime)' : 'var(--text-dim)'}; margin-top:0.2rem;">
                ${profile.xp >= t.xpRequired ? 'EXPLORED ⚡' : `NEEDS ${t.xpRequired} XP`}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Personal Goals -->
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
