import { DB } from './data/db.js';

class AddisActiveApp {
  constructor() {
    this.currentView = 'home';
    this.userCoords = [9.0300, 38.7400];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.renderView('home');
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
  }

  renderView(viewName) {
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
      case 'activity': main.innerHTML = this.getActivityTrackerHTML(); break;
      case 'events': main.innerHTML = this.getEventsHTML(); break;
      case 'profile': main.innerHTML = this.getProfileHTML(); this.bindProfileEvents(); break;
      default: main.innerHTML = this.getHomeHTML();
    }
  }

  getHomeHTML() {
    const profile = DB.userProfile;
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
          <div style="display:flex; flex-direction:column; gap:0.75rem; margin-top:0.75rem;">
            ${DB.routes.slice(0, 4).map(r => `
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
    const routes = filter === 'all' ? DB.routes : DB.routes.filter(r => r.activity === filter);
    return `
      <div class="view-section active">
        <span class="section-subtitle">Explore Addis</span>
        <h3 class="section-title">20+ Corridors & Parks</h3>
        
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

        <div class="grid-2" style="margin-top:1rem;">
          ${routes.map(r => `
            <div class="card" style="margin-bottom:0; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <span class="badge">${r.activity} •${r.area}</span>
                <h4 style="font-family:var(--font-display); font-size:1.1rem; margin:0.4rem 0;">${r.name}</h4>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.75rem;">${r.desc}</p>
                <div style="font-size:0.75rem; color:var(--accent-lime); font-family:var(--font-tech); margin-bottom:1rem;">📏 ${r.distance} \vert{} ⚡${r.elevation}</div>
              </div>
              <button class="btn btn-outline btn-full btn-sm" onclick="window.app.showRouteDetails('${r.id}')">View Details</button>
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

      <button class="btn btn-primary btn-full" onclick="alert('Route saved!'); document.getElementById('detailModal').classList.remove('active');">⭐ Save Route</button>
    `;
    modal.classList.add('active');
  }

  getVideosHTML() {
    return `
      <div class="view-section active">
        <span class="section-subtitle">Video Discovery</span>
        <h3 class="section-title">20+ Addis Visual Feeds</h3>
        <div style="display:flex; flex-direction:column; gap:1.25rem;">
          ${DB.videos.map(v => `
            <div class="card" style="margin-bottom:0; padding:1rem;">
              <span class="badge">${v.area}</span>
              <h4 style="font-family:var(--font-display); font-size:1.1rem; margin:0.4rem 0;">${v.title}</h4>
              <p style="font-size:0.85rem; color:var(--text-muted);">${v.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  getActivityTrackerHTML() {
    return `
      <div class="view-section active">
        <span class="section-subtitle">GPS Engine</span>
        <h3 class="section-title">Activity Tracker</h3>
        <p class="section-desc">Track your session locally.</p>
        <div class="tracker-card">
          <div class="timer-display">00:00:00</div>
          <button class="btn btn-primary btn-full" onclick="alert('Session started!')">Start Session</button>
        </div>
      </div>
    `;
  }

  getEventsHTML() {
    return `
      <div class="view-section active">
        <span class="section-subtitle">Schedule</span>
        <h3 class="section-title">Events & Meetups</h3>
        <div class="card">
          <h4 style="font-family:var(--font-display);">${DB.events[0].title}</h4>
          <p style="font-size:0.85rem; color:var(--text-muted);">${DB.events[0].description}</p>
        </div>
      </div>
    `;
  }

  getProfileHTML() {
    const profile = DB.userProfile;
    return `
      <div class="view-section active">
        <span class="section-subtitle">My Journey</span>
        <h3 class="section-title">${profile.username}'s Dashboard</h3>
        <div class="card">
          <h4 style="font-family:var(--font-display); margin-bottom:0.5rem;">🎯 Personal Goals</h4>
          <button class="btn btn-primary btn-sm" id="addGoalBtn">+ Add Goal</button>
        </div>
      </div>
    `;
  }

  bindProfileEvents() {
    document.getElementById('addGoalBtn')?.addEventListener('click', () => {
      const title = prompt('Enter goal title:');
      const target = prompt('Enter target (e.g., 10 KM):');
      if (title && target) {
        DB.userProfile.activeGoals.push({ title, target, progress: '0 KM', status: 'In Progress' });
        this.renderView('profile');
      }
    });
  }

  handleGlobalSearch(query) {
    const res = document.getElementById('searchResults');
    if (!res || !query.trim()) return;
    const q = query.toLowerCase();
    const matches = DB.routes.filter(r => r.name.toLowerCase().includes(q));
    res.innerHTML = matches.length ? matches.map(r => `<div class="search-result-item" onclick="document.getElementById('searchModal').classList.remove('active'); window.app.showRouteDetails('${r.id}');"><strong>${r.name}</strong></div>`).join('') : '<p class="search-hint">No results.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new AddisActiveApp(); });
