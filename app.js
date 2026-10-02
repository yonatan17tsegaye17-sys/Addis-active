import { DB } from './data/db.js';
import { EXTRA } from './data/extra.js';
Object.assign(DB, EXTRA);

const KEY = 'addis_active_v2', OLD = 'addis_active_profile', DAY = 864e5;
const ALIAS = { explore: 'discover', activity: 'move', community: 'happening', profile: 'journey' };
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dayKey = d => new Date(d).toLocaleDateString('en-CA');
const ico = t => DB.activitiesMeta[t]?.icon || '📍';

class AddisActiveApp {
  constructor() {
    this.view = 'home'; this.filter = 'all'; this.pending = null;
    this.coords = [9.03, 38.74]; this.located = false;
    this.tracking = false; this.distance = 0; this.last = null; this.path = [];
    this.map = null; this.line = null; this.watchId = null; this.timer = null;
    this.init();
  }
  get P() { return DB.userProfile; }
  get lvl() { return Math.floor(this.P.xp / 150) + 1; }

  init() {
    const splash = $('splashScreen');
    if (splash) { splash.style.opacity = '0'; setTimeout(() => splash.remove(), 400); }
    this.load(); this.bind(); this.locate();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    const net = () => { const b = $('offlineBanner'); if (b) b.style.display = navigator.onLine ? 'none' : 'block'; };
    addEventListener('online', net); addEventListener('offline', net); net();
    if (!this.P) $('onboardingModal').style.display = 'flex';
    this.go('home');
  }

  /* ---------- storage & stats ---------- */
  load() {
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem(OLD);
      if (!raw) return;
      const p = { sessions: [], groups: [], rsvps: [], challenges: [], done: [], goals: [], best: 0, ...JSON.parse(raw) };
      p.goals = p.goals.map(g => ({ type: 'any', created: Date.now(), ...g, target: parseFloat(g.target) || 5 }));
      DB.userProfile = p;
    } catch { /* corrupted storage: start fresh */ }
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.P)); } catch { /* storage full/blocked */ } }
  totalKm(list = this.P.sessions) { return list.reduce((a, s) => a + s.km, 0); }
  streak() {
    const days = new Set(this.P.sessions.map(s => dayKey(s.date)));
    let n = 0, d = Date.now();
    if (!days.has(dayKey(d))) d -= DAY;
    while (days.has(dayKey(d))) { n++; d -= DAY; }
    return n;
  }
  chProgress(c) {
    const l = this.P.sessions.filter(s => s.date >= Date.now() - c.days * DAY && (c.activity === 'any' || s.type === c.activity));
    return c.metric === 'km' ? this.totalKm(l) : l.length;
  }
  goalProgress(g) { return this.totalKm(this.P.sessions.filter(s => s.date >= g.created && (g.type === 'any' || s.type === g.type))); }
  nextDate(e) {
    const n = new Date(), [h, m] = e.time.split(':').map(Number);
    const t = new Date(n.getFullYear(), n.getMonth(), n.getDate() + ((e.weekday - n.getDay() + 7) % 7), h, m);
    if (t < n) t.setDate(t.getDate() + 7);
    return t;
  }
  upcoming() { return DB.events.map(e => ({ ...e, when: this.nextDate(e) })).sort((a, b) => a.when - b.when); }
  whenLabel(d) {
    const day = dayKey(d) === dayKey(Date.now()) ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
    return `${day} · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  km(a, b) {
    const R = 6371, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  sortedRoutes(list = DB.routes) { return [...list].sort((a, b) => this.km(this.coords, a.coords) - this.km(this.coords, b.coords)); }
  locate() {
    navigator.geolocation?.getCurrentPosition(p => { this.coords = [p.coords.latitude, p.coords.longitude]; this.located = true; if (this.view === 'home' || this.view === 'discover') this.go(this.view); }, () => {}, { timeout: 5000 });
  }

  /* ---------- events ---------- */
  bind() {
    $('searchTrigger')?.addEventListener('click', () => $('searchModal').classList.add('active'));
    $('searchClose')?.addEventListener('click', () => $('searchModal').classList.remove('active'));
    $('globalSearchInput')?.addEventListener('input', e => this.search(e.target.value));
    $('detailModal')?.addEventListener('click', e => { if (e.target.id === 'detailModal') this.sheet(); });

    $('onboardingForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const act = $('setupActivity').value;
      DB.userProfile = { username: $('setupName').value.trim(), primaryActivity: act, homeArea: $('setupArea').value.trim(), xp: 50, sessions: [], groups: [], rsvps: [], challenges: [], done: [], best: 0,
        goals: [{ id: 'g1', title: `First ${DB.activitiesMeta[act].title} Session`, target: 5, type: act, created: Date.now() }] };
      this.save(); $('onboardingModal').style.display = 'none'; this.go('home');
    });

    document.addEventListener('click', e => {
      const t = e.target.closest('[data-act],[data-target],[data-link]');
      if (!t) return;
      if (t.dataset.target || t.dataset.link) return this.go(t.dataset.target || t.dataset.link);
      this.act(t.dataset.act, t.dataset);
    });
  }

  act(a, d) {
    const P = this.P;
    switch (a) {
      case 'go': this.go(d.view); break;
      case 'close': this.sheet(); $('searchModal').classList.remove('active'); break;
      case 'filter': this.filter = d.v; this.go('discover'); break;
      case 'detail': this.routeSheet(d.id); break;
      case 'choose': this.chooseSheet(d.v); break;
      case 'find': this.sheet(); this.filter = d.v; this.go('discover'); break;
      case 'start': this.sheet(); this.pending = { activity: d.v, route: d.id }; this.go('move'); break;
      case 'join': P.groups.includes(d.id) ? P.groups = P.groups.filter(x => x !== d.id) : P.groups.push(d.id); this.save(); this.go(this.view); break;
      case 'rsvp': { const k = d.id + '@' + d.day; P.rsvps.includes(k) ? P.rsvps = P.rsvps.filter(x => x !== k) : P.rsvps.push(k); this.save(); this.go(this.view); break; }
      case 'chall': P.challenges.includes(d.id) ? P.challenges = P.challenges.filter(x => x !== d.id) : P.challenges.push(d.id); this.save(); this.go(this.view); break;
      case 'addGoal': this.addGoal(); break;
      case 'save': this.sheet(); break;
    }
  }

  sheet(html) {
    const m = $('detailModal');
    if (!html) return m.classList.remove('active');
    $('detailModalContent').innerHTML = html; m.classList.add('active');
  }

  go(name) {
    name = ALIAS[name] || name;
    if (!this.P && name !== 'gov') { $('onboardingModal').style.display = 'flex'; return; }
    this.view = name;
    scrollTo({ top: 0 });
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', (ALIAS[t.dataset.target] || t.dataset.target) === name));
    if (this.map) { this.map.remove(); this.map = null; this.line = null; }
    const main = $('appMain'), w = document.createElement('div');
    w.className = 'view-section';
    const v = { home: 'homeHTML', discover: 'discoverHTML', happening: 'happeningHTML', move: 'moveHTML', journey: 'journeyHTML', gov: 'govHTML' }[name] || 'homeHTML';
    w.innerHTML = this[v]();
    main.innerHTML = ''; main.appendChild(w);
    if (name === 'move') this.bindMove();
    setTimeout(() => w.classList.add('active'), 10);
  }

  /* ---------- shared cards ---------- */
  routeCard(r) {
    const away = this.located ? ` · ${this.km(this.coords, r.coords).toFixed(1)} km away` : '';
    return `<div class="card route-card">
      <div class="video-strip"><span>📺 ${esc(r.videoTitle)}</span><span class="badge">⏱️ ${esc(r.videoDuration)}</span></div>
      <span class="badge">${ico(r.activity)} ${esc(r.activity)} · ${esc(r.area)}</span>
      <h4 class="card-title">${esc(r.name)}</h4>
      <p class="muted">${esc(r.desc)}</p>
      <div class="stat-line">📏 ${esc(r.distance)} | ⚡ ${esc(r.elevation)} | 🧭 ${esc(r.surface || 'Mixed')}${away}</div>
      <div class="btn-row">
        <button class="btn btn-outline btn-sm" data-act="detail" data-id="${r.id}">Details</button>
        <button class="btn btn-primary btn-sm" data-act="start" data-v="${r.activity}" data-id="${r.id}">Go here ⚡</button>
      </div></div>`;
  }
  eventRow(e) {
    const day = dayKey(e.when), going = this.P.rsvps.includes(e.id + '@' + day);
    return `<div class="event-row"><div><span class="badge">${ico(e.activity)} ${esc(e.activity)}</span>
      <div class="ev-title">${esc(e.title)}</div><div class="muted sm">${this.whenLabel(e.when)} · 📍 ${esc(e.place)}</div></div>
      <button class="btn ${going ? 'btn-primary' : 'btn-outline'} btn-sm" data-act="rsvp" data-id="${e.id}" data-day="${day}">${going ? "✓ Going" : "I'm in"}</button></div>`;
  }
  bar(pct) { return `<div class="bar"><div style="width:${Math.min(100, pct)}%"></div></div>`; }

  /* ---------- HOME (hub) ---------- */
  homeHTML() {
    const P = this.P, h = new Date().getHours(), g = h < 12 ? 'MORNING' : h < 18 ? 'AFTERNOON' : 'EVENING';
    const s = this.streak(), today = P.sessions.some(x => dayKey(x.date) === dayKey(Date.now()));
    const nudge = today ? 'Nice work today. Check what’s happening next.' : s > 0 ? `Keep your ${s}-day streak alive: move today.` : 'Start your first streak today.';
    const mine = this.sortedRoutes(DB.routes.filter(r => r.activity === P.primaryActivity));
    const near = (mine.length ? mine : this.sortedRoutes()).slice(0, 3);
    return `<div class="hero-box">
        <div class="location-tag"><span class="brand-dot"></span><span>ADDIS ABABA • 2,355M ALTITUDE</span></div>
        <h2 class="hero-title">GOOD ${g},<br>${esc(P.username).toUpperCase()}</h2>
        <p class="hero-tagline">LVL ${this.lvl} • ${P.xp} XP • 🔥 ${s} DAY STREAK</p>
        <p class="hero-desc">${nudge}</p>
      </div>
      <span class="section-subtitle">Choose your move</span>
      <div class="act-grid">${Object.entries(DB.activitiesMeta).map(([k, m]) => `<button class="act-tile ${k === P.primaryActivity ? 'main' : ''}" data-act="choose" data-v="${k}"><span>${m.icon}</span><small>${m.title}</small></button>`).join('')}</div>
      <div class="card"><span class="section-subtitle">What’s happening</span>
        ${this.upcoming().slice(0, 2).map(e => this.eventRow(e)).join('')}
        <button class="btn btn-outline btn-full btn-sm" data-act="go" data-view="happening">See all events & challenges</button></div>
      <span class="section-subtitle">${this.located ? 'Nearest to you' : 'Your activity'} · ${DB.activitiesMeta[P.primaryActivity]?.title}</span>
      ${near.map(r => this.routeCard(r)).join('')}`;
  }

  chooseSheet(a) {
    const m = DB.activitiesMeta[a], n = DB.routes.filter(r => r.activity === a).length;
    const ev = this.upcoming().find(e => e.activity === a);
    this.sheet(`<div class="sheet-head"><h3 class="card-title">${m.icon} ${m.title}</h3><button class="btn btn-outline btn-sm" data-act="close">✕</button></div>
      <p class="muted">${m.desc}</p>
      ${ev ? `<div class="stat-line">Next group session: ${esc(ev.title)} · ${this.whenLabel(ev.when)}</div>` : ''}
      <div class="btn-row" style="flex-direction:column"><button class="btn btn-outline btn-full" data-act="find" data-v="${a}">🗺️ Find places (${n})</button>
      <button class="btn btn-primary btn-full" data-act="start" data-v="${a}">⚡ Start tracking now</button></div>`);
  }

  /* ---------- DISCOVER ---------- */
  discoverHTML() {
    const f = this.filter, list = this.sortedRoutes(f === 'all' ? DB.routes : DB.routes.filter(r => r.activity === f));
    return `<span class="section-subtitle">Places · Routes · Videos</span>
      <h3 class="section-title">Discover Addis</h3>
      <p class="section-desc">${DB.routes.length} locations. ${this.located ? 'Sorted by distance from you.' : 'Allow location to sort by distance.'}</p>
      <div class="filter-bar"><button class="filter-chip ${f === 'all' ? 'active' : ''}" data-act="filter" data-v="all">All</button>
      ${Object.entries(DB.activitiesMeta).map(([k, m]) => `<button class="filter-chip ${f === k ? 'active' : ''}" data-act="filter" data-v="${k}">${m.title} ${m.icon}</button>`).join('')}</div>
      <div class="grid-2">${list.map(r => this.routeCard(r)).join('') || '<p class="muted">Nothing here yet.</p>'}</div>`;
  }
  routeSheet(id) {
    const r = DB.routes.find(x => x.id === id); if (!r) return;
    this.sheet(`<div class="sheet-head"><span class="badge">${esc(r.activity)} · ${esc(r.area)}</span><button class="btn btn-outline btn-sm" data-act="close">✕</button></div>
      <h3 class="card-title">${esc(r.name)}</h3><p class="muted">${esc(r.desc)}</p>
      <div class="info-box"><div>📏 <b>Distance:</b> ${esc(r.distance)}</div><div>⚡ <b>Elevation:</b> ${esc(r.elevation)}</div>
      <div>🧭 <b>Surface:</b> ${esc(r.surface || 'Mixed')}</div><div>⏱️ <b>Est. time:</b> ${esc(r.estimatedTime)}</div><div>📍 <b>Start:</b> ${esc(r.startingPoint)}</div>
      <div>💬 ${esc(r.communityNotes)}</div></div>
      <div class="chips">${r.facilities.map(f => `<span class="badge">✓ ${esc(f)}</span>`).join('')}</div>
      <button class="btn btn-primary btn-full" style="margin-top:1rem" data-act="start" data-v="${r.activity}" data-id="${r.id}">⚡ Start ${esc(r.activity)} here</button>`);
  }

  /* ---------- HAPPENING ---------- */
  happeningHTML() {
    const P = this.P;
    return `<span class="section-subtitle">Groups · Events · Challenges</span>
      <h3 class="section-title">What’s Happening</h3>
      <p class="section-desc">Join something, then go move.</p>
      <div class="card"><h4 class="card-title">📅 This week</h4>${this.upcoming().map(e => this.eventRow(e)).join('')}</div>
      <div class="card"><h4 class="card-title">🏆 Challenges</h4>
      ${DB.challenges.map(c => { const on = P.challenges.includes(c.id), pr = this.chProgress(c), done = P.done.includes(c.id);
        return `<div class="event-row"><div style="flex:1"><div class="ev-title">${c.icon} ${esc(c.title)}</div>
        <div class="muted sm">+${c.xp} XP · ${c.days} days${on ? ` · ${pr.toFixed(c.metric === 'km' ? 1 : 0)}/${c.target}` : ''}</div>${on ? this.bar(pr / c.target * 100) : ''}</div>
        <button class="btn ${on ? 'btn-primary' : 'btn-outline'} btn-sm" data-act="chall" data-id="${c.id}">${done ? '✓ Done' : on ? 'Joined' : 'Join'}</button></div>`; }).join('')}</div>
      <span class="section-subtitle">Communities</span>
      ${DB.communities.map(c => `<div class="card"><span class="badge">${esc(c.type)} · ${esc(c.area)}</span>
        <h4 class="card-title">${esc(c.name)}</h4><p class="muted">${esc(c.desc)}</p>
        <div class="stat-line">📅 ${esc(c.schedule)} | 📍 ${esc(c.meetingPoint)}</div>
        <button class="btn ${P.groups.includes(c.id) ? 'btn-outline' : 'btn-primary'} btn-full btn-sm" data-act="join" data-id="${c.id}">${P.groups.includes(c.id) ? '✓ Joined (tap to leave)' : 'Join group'}</button></div>`).join('')}`;
  }

  /* ---------- MOVE ---------- */
  moveHTML() {
    const pend = this.pending, r = pend?.route && DB.routes.find(x => x.id === pend.route);
    return `<span class="section-subtitle">Live GPS engine</span><h3 class="section-title">Move</h3>
      <div class="tracker-card">
        ${r ? `<div class="info-box" style="text-align:left">📍 Heading to <b>${esc(r.name)}</b><br><span class="muted sm">Start: ${esc(r.startingPoint)} · ${esc(r.distance)}</span></div>` : ''}
        <label class="lbl">ACTIVITY</label>
        <select id="trackerActivityType" class="field">${Object.entries(DB.activitiesMeta).map(([k, m]) => `<option value="${k}">${m.title} ${m.icon}</option>`).join('')}</select>
        <div id="timerDisplay" class="timer-display">00:00:00</div>
        <div class="metrics-row">
          <div class="metric-box"><div id="distDisplay" class="m-val">0.00</div><div class="m-lbl">Kilometers</div></div>
          <div class="metric-box"><div id="paceDisplay" class="m-val">0:00</div><div class="m-lbl">Pace /km</div></div>
          <div class="metric-box"><div id="gpsStatus" class="m-val" style="font-size:1rem;color:var(--accent-lime)">Ready</div><div class="m-lbl">GPS</div></div>
        </div>
        <div id="trackerMap" class="map"></div>
        <button id="startTrackBtn" class="btn btn-primary btn-full">Start session</button>
        <button id="stopTrackBtn" class="btn btn-outline btn-full" style="display:none;color:var(--danger-red);border-color:var(--danger-red)">Finish & claim XP</button>
        <p class="muted sm" style="margin-top:.75rem">Indoor swim or gym? Time still counts. Keep this screen open while tracking.</p>
      </div>`;
  }
  bindMove() {
    const sel = $('trackerActivityType'), start = $('startTrackBtn'), stop = $('stopTrackBtn');
    sel.value = this.tracking ? this.trackType : (this.pending?.activity || this.P.primaryActivity);
    this.pending = null;
    if (this.tracking) { sel.disabled = true; start.style.display = 'none'; stop.style.display = 'block'; $('gpsStatus').innerText = 'Active'; $('distDisplay').innerText = this.distance.toFixed(2); }
    start.onclick = () => { sel.disabled = true; start.style.display = 'none'; stop.style.display = 'block'; this.trackType = sel.value; this.startGPS(); };
    stop.onclick = () => this.finish();
    if (typeof L !== 'undefined') {
      this.map = L.map('trackerMap').setView(this.coords, 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(this.map);
      L.circleMarker(this.coords, { radius: 6, color: '#CCFF00' }).addTo(this.map);
      if (this.path.length) this.line = L.polyline(this.path, { color: '#CCFF00', weight: 4 }).addTo(this.map);
    }
  }
  startGPS() {
    this.tracking = true; this.startTime = Date.now(); this.distance = 0; this.last = null; this.path = []; this.line = null;
    $('gpsStatus').innerText = navigator.geolocation ? 'Active' : 'No GPS';
    this.watchId = navigator.geolocation?.watchPosition(pos => {
      const { latitude, longitude, accuracy } = pos.coords;
      if (accuracy > 30) return;
      const pt = [latitude, longitude];
      if (this.last) { const d = this.km(this.last, pt); if (d < 0.003) return; this.distance += d; }
      this.last = pt; this.path.push(pt);
      const el = $('distDisplay'); if (el) el.innerText = this.distance.toFixed(2);
      if (this.map) { this.map.setView(pt, 16); this.line ? this.line.setLatLngs(this.path) : this.line = L.polyline(this.path, { color: '#CCFF00', weight: 4 }).addTo(this.map); }
    }, () => { const g = $('gpsStatus'); if (g) g.innerText = 'Weak'; }, { enableHighAccuracy: true });
    this.timer = setInterval(() => {
      const s = Math.floor((Date.now() - this.startTime) / 1000), p = n => String(n).padStart(2, '0');
      const t = $('timerDisplay'); if (t) t.innerText = `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
      const pc = $('paceDisplay'); if (pc && this.distance > 0.1) { const sp = s / this.distance; pc.innerText = `${Math.floor(sp / 60)}:${p(Math.round(sp % 60) % 60)}`; }
    }, 1000);
  }
  finish() {
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    clearInterval(this.timer); this.watchId = null; this.tracking = false;
    const P = this.P, secs = Math.floor((Date.now() - this.startTime) / 1000), km = +this.distance.toFixed(2), type = this.trackType;
    if (secs < 10) return this.go('move');
    const xp = 20 + Math.round(km * 10) + Math.floor(secs / 120);
    const had = new Set(DB.badges.filter(b => b.check(this)).map(b => b.id)), lvl0 = this.lvl;
    P.sessions.push({ id: Date.now(), type, date: Date.now(), km, secs, xp }); P.xp += xp;
    P.best = Math.max(P.best || 0, this.streak());
    const won = [];
    P.challenges.forEach(id => { const c = DB.challenges.find(x => x.id === id); if (c && !P.done.includes(id) && this.chProgress(c) >= c.target) { P.done.push(id); P.xp += c.xp; won.push(c); } });
    const badges = DB.badges.filter(b => !had.has(b.id) && b.check(this));
    this.save();
    const ev = this.upcoming().find(e => e.activity === type);
    this.go('journey');
    this.sheet(`<div class="sheet-head"><h3 class="card-title">${ico(type)} Session complete</h3><button class="btn btn-outline btn-sm" data-act="close">✕</button></div>
      <div class="metrics-row"><div class="metric-box"><div class="m-val">${km.toFixed(2)}</div><div class="m-lbl">KM</div></div>
      <div class="metric-box"><div class="m-val">${Math.floor(secs / 60)}m</div><div class="m-lbl">Time</div></div>
      <div class="metric-box"><div class="m-val">+${xp}</div><div class="m-lbl">XP</div></div></div>
      <p>🔥 Streak: <b>${this.streak()} day${this.streak() === 1 ? '' : 's'}</b>${this.lvl > lvl0 ? ` · 🎉 Level ${this.lvl}!` : ''}</p>
      ${won.map(c => `<p>🏆 Challenge complete: ${esc(c.title)} (+${c.xp} XP)</p>`).join('')}
      ${badges.map(b => `<p>${b.icon} New badge: <b>${b.name}</b></p>`).join('')}
      ${ev ? `<div class="info-box">🤝 Next group ${esc(type)}: ${esc(ev.title)}, ${this.whenLabel(ev.when)}<br>
        <button class="btn btn-outline btn-sm" style="margin-top:.5rem" data-act="rsvp" data-id="${ev.id}" data-day="${dayKey(ev.when)}">I’m in</button></div>` : ''}
      <button class="btn btn-primary btn-full" style="margin-top:1rem" data-act="go" data-view="happening">Find your crew →</button>`);
  }

  /* ---------- JOURNEY ---------- */
  journeyHTML() {
    const P = this.P, into = P.xp % 150, s = this.streak();
    return `<span class="section-subtitle">Goals · XP · Badges · Streaks</span>
      <h3 class="section-title">${esc(P.username)}’s Journey</h3>
      <div class="card hero-lite"><div class="row-between mono"><span>LEVEL ${this.lvl}</span><span style="color:var(--accent-lime)">${into} / 150 XP</span></div>${this.bar(into / 150 * 100)}</div>
      <div class="metrics-row"><div class="metric-box"><div class="m-val">${s}🔥</div><div class="m-lbl">Streak</div></div>
        <div class="metric-box"><div class="m-val">${this.totalKm().toFixed(1)}</div><div class="m-lbl">Total KM</div></div>
        <div class="metric-box"><div class="m-val">${P.sessions.length}</div><div class="m-lbl">Sessions</div></div></div>
      <div class="card"><div class="row-between"><h4 class="card-title">🎯 Goals</h4><button class="btn btn-primary btn-sm" data-act="addGoal">+ Add</button></div>
        ${P.goals.map(g => { const pr = this.goalProgress(g); return `<div class="goal"><div class="row-between"><b>${esc(g.title)}</b><span class="mono" style="color:var(--accent-lime)">${pr.toFixed(1)}/${g.target} KM</span></div>${this.bar(pr / g.target * 100)}</div>`; }).join('') || '<p class="muted">No goals yet.</p>'}</div>
      <div class="card"><h4 class="card-title">Recent sessions</h4>
        ${P.sessions.slice(-5).reverse().map(x => `<div class="event-row"><span>${ico(x.type)} ${new Date(x.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span><span class="mono">${x.km.toFixed(2)} km · ${Math.floor(x.secs / 60)}m · +${x.xp} XP</span></div>`).join('') || '<p class="muted">Your first session is one tap away: Move tab.</p>'}</div>
      <div class="card"><h4 class="card-title">Badges</h4><div class="grid-badges">
        ${DB.badges.map(b => { const on = b.check(this); return `<div class="tile ${on ? 'on' : ''}"><div style="font-size:1.8rem;opacity:${on ? 1 : .35}">${b.icon}</div><b>${b.name}</b><div class="muted sm">${b.desc}</div></div>`; }).join('')}</div></div>
      <div class="card"><h4 class="card-title">Territories</h4><div class="grid-badges">
        ${DB.territories.map(t => { const on = P.xp >= t.xpRequired; return `<div class="tile ${on ? 'on' : ''}"><div style="font-size:1.5rem">${t.icon}</div><b>${t.name}</b><div class="mono sm" style="color:${on ? 'var(--accent-lime)' : 'var(--text-dim)'}">${on ? 'EXPLORED ⚡' : `NEEDS ${t.xpRequired} XP`}</div></div>`; }).join('')}</div></div>
      <button class="btn btn-outline btn-full" data-act="go" data-view="gov">🏛️ City Pulse (municipal view)</button>`;
  }
  addGoal() {
    const title = prompt('Goal name (e.g. Entoto 20 KM this month):'), t = parseFloat(prompt('Target distance in KM:'));
    if (!title || !(t > 0)) return;
    this.P.goals.push({ id: 'g' + Date.now(), title, target: t, type: 'any', created: Date.now() });
    this.save(); this.go('journey');
  }

  /* ---------- CITY PULSE ---------- */
  govHTML() {
    const by = {}; DB.routes.forEach(r => by[r.activity] = (by[r.activity] || 0) + 1);
    return `<span class="section-subtitle">Municipal intelligence</span><h3 class="section-title">City Pulse</h3>
      <div class="metrics-row"><div class="metric-box"><div class="m-val" style="color:var(--accent-lime)">${DB.routes.length}</div><div class="m-lbl">Locations</div></div>
        <div class="metric-box"><div class="m-val" style="color:var(--accent-lime)">${DB.communities.length}</div><div class="m-lbl">Groups</div></div>
        <div class="metric-box"><div class="m-val" style="color:var(--accent-lime)">${DB.events.length}</div><div class="m-lbl">Weekly events</div></div></div>
      <div class="card"><h4 class="card-title">Activity distribution</h4>
        ${Object.entries(DB.activitiesMeta).map(([k, m]) => `<div class="event-row"><span>${m.icon} ${m.title}</span><b style="color:var(--accent-lime)">${by[k] || 0}</b></div>`).join('')}</div>
      <div class="card"><h4 class="card-title">Zones</h4>${DB.territories.map(t => `<div class="event-row"><span>${t.icon} <b>${t.name}</b></span><span class="muted sm">${t.desc}</span></div>`).join('')}</div>`;
  }

  /* ---------- SEARCH ---------- */
  search(q) {
    const res = $('searchResults'); q = q.trim().toLowerCase();
    if (!q) { res.innerHTML = '<p class="search-hint">Search places, areas or activities…</p>'; return; }
    const m = DB.routes.filter(r => [r.name, r.area, r.activity].some(x => x.toLowerCase().includes(q)));
    res.innerHTML = m.length ? m.map(r => `<div class="search-result-item" data-act="detail" data-id="${r.id}">${ico(r.activity)} <b>${esc(r.name)}</b> <span class="muted sm">${esc(r.area)}</span></div>`).join('') : '<p class="search-hint">No results.</p>';
    res.onclick = () => $('searchModal').classList.remove('active');
  }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new AddisActiveApp(); });
