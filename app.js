const DB = {
  routes: [
    { id: 'r1', name: 'Entoto Forest Ridge', activity: 'hike', distance: '10.5 KM', difficulty: 'Challenging', elevation: '+340m', area: 'Entoto', desc: 'High altitude trail through eucalyptus canopy with sweeping views over Addis.' },
    { id: 'r2', name: 'Bole Boulevard Loop', activity: 'run', distance: '5.2 KM', difficulty: 'Moderate', elevation: '+45m', area: 'Bole', desc: 'Smooth urban tarmac ideal for early morning strides and recovery tempos.' },
    { id: 'r3', name: 'Jan Meda Circuit', activity: 'run', distance: '7.0 KM', difficulty: 'Moderate', elevation: 'Flat', area: 'Arada', desc: 'Historic training ground where countless Ethiopian endurance legends built their engine.' },
    { id: 'r4', name: 'Meskel Square Urban Stride', activity: 'walk', distance: '4.0 KM', difficulty: 'Easy', elevation: '+20m', area: 'Meskel Square', desc: 'Central city loop connecting modern transit nodes and vibrant street life.' }
  ],
  communities: [
    { id: 'c1', name: 'Bertusew Running Club', activity: 'run', area: 'Addis Ababa (Rotating)', schedule: 'Fri 6:00 AM & Sun 6:30 AM', desc: 'Discipline, health, and community around endurance running.', link: 'https://t.me/bertusew' }
  ],
  events: [
    { id: 'e1', name: 'Bertusew Sunday Community Run', activity: 'run', date: 'This Sunday • 6:30 AM', location: 'Entoto Park Gate', organizer: 'Bertusew RC', distance: '5K / 10K', desc: 'Steady conversational pace followed by traditional Ethiopian coffee.' }
  ],
  badges: [
    { id: 'b1', name: 'FIRST STEP', icon: '👟', desc: 'Complete your first activity.', unlocked: true },
    { id: 'b2', name: 'CITY EXPLORER', icon: '🗺️', desc: 'Explore Addis Ababa routes.', unlocked: false },
    { id: 'b3', name: 'COMMUNITY MEMBER', icon: '🤝', desc: 'Connect with a local community.', unlocked: false },
    { id: 'b4', name: 'WEEKLY MOVE', icon: '⚡', desc: 'Complete active sessions.', unlocked: false }
  ],
  goals: [
    { id: 'g1', title: 'Complete your first 5K route', progress: '0/1', done: false },
    { id: 'g2', title: 'Explore 3 Addis Ababa routes', progress: '1/3', done: false }
  ]
};

let appState = {
  currentView: 'home',
  userProfile: { name: 'Abebe B.', goalSummary: 'Build endurance at high altitude' },
  tracker: { active: false, mode: 'Run', seconds: 0, distanceKm: 0.0, interval: null }
};

document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initSearch();
  initPWA();
});

function navigateTo(viewName, param = null) {
  appState.currentView = viewName;
  document.querySelectorAll('.mobile-nav .nav-tab').forEach(tab => {
    if (tab.getAttribute('data-target') === viewName) tab.classList.add('active');
    else tab.classList.remove('active');
  });
  renderView(viewName, param);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initRouter() {
  document.querySelectorAll('[data-link], .nav-tab').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-target') || el.getAttribute('data-link');
      if (target) navigateTo(target);
    });
  });
  navigateTo('home');
}

function renderView(viewName) {
  const main = document.getElementById('appMain');
  if (viewName === 'home') main.innerHTML = getHomeHTML();
  else if (viewName === 'explore') { main.innerHTML = getExploreHTML(); attachExploreEvents(); }
  else if (viewName === 'activity') main.innerHTML = getActivityHTML();
  else if (viewName === 'events') main.innerHTML = getEventsHTML();
  else if (viewName === 'profile') main.innerHTML = getProfileHTML();
}

function getHomeHTML() {
  return `
    <div class="view-section active">
      <div class="hero-box">
        <div class="location-tag"><span class="brand-dot"></span><span>ADDIS ABABA, ETHIOPIA • 2,355M ALTITUDE</span></div>
        <h1 class="hero-title">DISCOVER ADDIS.<br><span style="color:var(--accent-lime);">MOVE ADDIS.</span></h1>
        <p class="hero-tagline">DISCIPLINE | HEALTH | COMMUNITY</p>
        <p class="hero-desc">Find places to move, people to move with, and active events happening around Addis Ababa.</p>
        <div class="hero-btns">
          <button class="btn btn-primary" onclick="navigateTo('explore')">EXPLORE ADDIS</button>
          <button class="btn btn-outline" onclick="navigateTo('activity')">START MOVEMENT</button>
        </div>
      </div>

      <div class="section-block">
        <div class="block-header"><h2 class="block-title">What do you want to do today?</h2></div>
        <div class="action-grid">
          <button class="action-pill-btn" onclick="filterExploreBy('run')"><span class="action-icon">🏃</span><span class="action-label">Run</span></button>
          <button class="action-pill-btn" onclick="filterExploreBy('walk')"><span class="action-icon">🚶</span><span class="action-label">Walk</span></button>
          <button class="action-pill-btn" onclick="filterExploreBy('ride')"><span class="action-icon">🚴</span><span class="action-label">Ride</span></button>
          <button class="action-pill-btn" onclick="filterExploreBy('hike')"><span class="action-icon">🥾</span><span class="action-label">Hike</span></button>
        </div>
      </div>

      <div class="section-block">
        <div class="block-header"><h3 class="block-title">Featured Addis Route</h3><button class="view-all-link" onclick="navigateTo('explore')">View All</button></div>
        <div class="card">
          <span class="badge">ELEVATION CHALLENGE</span>
          <h3 style="font-family:var(--font-display); font-size:1.25rem; margin-bottom:0.3rem;">${DB.routes[0].name}</h3>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">${DB.routes[0].desc}</p>
          <button class="btn btn-sm btn-primary" onclick="navigateTo('explore')">EXPLORE</button>
        </div>
      </div>
    </div>
  `;
}

function getExploreHTML() {
  return `
    <div class="view-section active">
      <span class="section-subtitle">// DISCOVERY HUB</span>
      <h2 class="section-title">EXPLORE ADDIS</h2>
      <p class="section-desc">Your city is your playground. Filter routes and zones across Addis.</p>

      <div class="filter-bar">
        <button class="filter-chip active" data-filter="all">All</button>
        <button class="filter-chip" data-filter="run">Running</button>
        <button class="filter-chip" data-filter="walk">Walking</button>
        <button class="filter-chip" data-filter="ride">Cycling</button>
        <button class="filter-chip" data-filter="hike">Hiking</button>
      </div>

      <div class="map-placeholder-box">
        <div style="font-family:var(--font-display); font-weight:800; margin-bottom:0.3rem;">Addis Ababa Map Grid</div>
        <div style="font-size:0.85rem; color:var(--text-muted);">OpenStreetMap / Leaflet Architecture Ready</div>
      </div>

      <div class="grid-2" id="routesGrid">
        ${DB.routes.map(r => `
          <div class="card">
            <span class="badge">${r.activity.toUpperCase()} •${r.area}</span>
            <h4 style="font-family:var(--font-display); font-size:1.15rem; margin-bottom:0.3rem;">${r.name}</h4>
            <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">${r.desc}</p>
            <button class="btn btn-sm btn-outline btn-full" onclick="alert('Route saved!')">SAVE ROUTE</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function getActivityHTML() {
  const t = appState.tracker;
  return `
    <div class="view-section active">
      <span class="section-subtitle">// MOVE ADDIS</span>
      <h2 class="section-title">START ACTIVITY</h2>
      <p class="section-desc">Simulated telemetry ready for GPS integration.</p>

      <div class="tracker-card">
        <div class="tracker-mode-select">
          <button class="mode-btn ${t.mode === 'Run' ? 'active' : ''}" onclick="setTrackerMode('Run')">Run</button>
          <button class="mode-btn ${t.mode === 'Walk' ? 'active' : ''}" onclick="setTrackerMode('Walk')">Walk</button>
          <button class="mode-btn ${t.mode === 'Cycle' ? 'active' : ''}" onclick="setTrackerMode('Cycle')">Cycle</button>
        </div>
        <div class="timer-display" id="timerDisplay">00:00:00</div>
        <div class="metrics-row">
          <div class="metric-box"><div class="m-val" id="distanceVal">${t.distanceKm.toFixed(2)}</div><div class="m-lbl">Distance (KM)</div></div>
          <div class="metric-box"><div class="m-val">5:45</div><div class="m-lbl">Pace (/km)</div></div>
          <div class="metric-box"><div class="m-val">2,355</div><div class="m-lbl">Altitude (M)</div></div>
        </div>
        <div style="display:flex; gap:1rem;">
          ${!t.active ? `<button class="btn btn-primary btn-full" onclick="startTracker()">START SESSION</button>` : `<button class="btn btn-outline" onclick="pauseTracker()" style="flex:1; color:#FF4444;">PAUSE</button><button class="btn btn-primary" onclick="finishTracker()" style="flex:1;">FINISH</button>`}
        </div>
      </div>
    </div>
  `;
}

function getEventsHTML() {
  return `
    <div class="view-section active">
      <span class="section-subtitle">// CALENDAR</span>
      <h2 class="section-title">WHAT'S HAPPENING</h2>
      <p class="section-desc">Join active community gatherings across Addis Ababa.</p>
      ${DB.events.map(ev => `
        <div class="card">
          <span class="badge">${ev.activity.toUpperCase()} •${ev.date}</span>
          <h3 style="font-family:var(--font-display); font-size:1.25rem; margin-bottom:0.3rem;">${ev.name}</h3>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">${ev.desc}</p>
          <button class="btn btn-sm btn-primary btn-full" onclick="alert('Registered successfully!')">JOIN EVENT</button>
        </div>
      `).join('')}
    </div>
  `;
}

function getProfileHTML() {
  return `
    <div class="view-section active">
      <span class="section-subtitle">// DASHBOARD</span>
      <h2 class="section-title">MY JOURNEY</h2>
      <p class="section-desc">Your personal stats, goals, and earned badges.</p>

      <div class="profile-header-card">
        <div class="profile-avatar">A</div>
        <div><h3>Abebe B.</h3><p>Build endurance at high altitude</p></div>
      </div>

      <div class="section-block">
        <div class="block-header"><h3 class="block-title">Badges</h3></div>
        <div class="badge-grid">
          ${DB.badges.map(b => `<div class="badge-item ${b.unlocked ? 'unlocked' : ''}"><div class="b-icon">${b.icon}</div><div class="b-name">${b.name}</div><div class="b-status">${b.unlocked ? 'Unlocked' : 'Locked'}</div></div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function filterExploreBy(activity) {
  navigateTo('explore');
  setTimeout(() => {
    document.querySelectorAll('.filter-chip').forEach(c => {
      if (c.getAttribute('data-filter') === activity) c.click();
    });
  }, 50);
}

function attachExploreEvents() {
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.getAttribute('data-filter');
      const grid = document.getElementById('routesGrid');
      const filtered = filter === 'all' ? DB.routes : DB.routes.filter(r => r.activity === filter);
      grid.innerHTML = filtered.map(r => `
        <div class="card">
          <span class="badge">${r.activity.toUpperCase()} • ${r.area}</span>
          <h4 style="font-family:var(--font-display); font-size:1.15rem; margin-bottom:0.3rem;">${r.name}</h4>
          <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">${r.desc}</p>
          <button class="btn btn-sm btn-outline btn-full" onclick="alert('Route saved!')">SAVE ROUTE</button>
        </div>
      `).join('');
    });
  });
}

function setTrackerMode(m) { appState.tracker.mode = m; renderView('activity'); }
function startTracker() {
  appState.tracker.active = true;
  appState.tracker.interval = setInterval(() => {
    appState.tracker.seconds++;
    appState.tracker.distanceKm += 0.003;
    const t = document.getElementById('timerDisplay');
    const d = document.getElementById('distanceVal');
    if (t) t.textContent = new Date(appState.tracker.seconds * 1000).toISOString().substr(11, 8);
    if (d) d.textContent = appState.tracker.distanceKm.toFixed(2);
  }, 1000);
  renderView('activity');
}
function pauseTracker() { clearInterval(appState.tracker.interval); appState.tracker.active = false; renderView('activity'); }
function finishTracker() { clearInterval(appState.tracker.interval); alert('Session completed!'); appState.tracker.active = false; appState.tracker.seconds = 0; appState.tracker.distanceKm = 0.0; renderView('activity'); }

function initSearch() {
  const trigger = document.getElementById('searchTrigger');
  const modal = document.getElementById('searchModal');
  const close = document.getElementById('searchClose');
  const input = document.getElementById('globalSearchInput');
  const results = document.getElementById('searchResults');

  trigger.addEventListener('click', () => { modal.classList.add('active'); input.focus(); });
  close.addEventListener('click', () => modal.classList.remove('active'));
  input.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) { results.innerHTML = '<p class="search-hint">Type anything to explore...</p>'; return; }
    const match = DB.routes.filter(r => r.name.toLowerCase().includes(q));
    results.innerHTML = match.map(r => `<div class="search-result-item" onclick="document.getElementById('searchModal').classList.remove('active'); navigateTo('explore');"><strong>${r.name}</strong> — ${r.area}</div>`).join('') || '<p>No results</p>';
  });
}

function initPWA() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js');
}
