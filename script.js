// ═══════════════════════════════════════════════
//  Uprising DevHub — script.js
// ═══════════════════════════════════════════════
(function () {
'use strict';

/* ─── FIREBASE CONFIG ─── */
const FB_CONFIG = {
  apiKey: "AIzaSyAGJahiwga57JV36YG4jYxnNYuqY2IBfa8",
  authDomain: "uprising-dev-hub-remastered.firebaseapp.com",
  projectId: "uprising-dev-hub-remastered",
  storageBucket: "uprising-dev-hub-remastered.firebasestorage.app",
  messagingSenderId: "926751480098",
  appId: "1:926751480098:web:c4e7138ed64966fa34ed7b"
};

let fbApp = null, db = null, auth = null, storage = null, fbReady = false;

function initFirebase() {
  try {
    if (typeof firebase === 'undefined') return false;
    if (fbApp) return true;
    fbApp   = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(FB_CONFIG);
    db      = firebase.firestore();
    auth    = firebase.auth();
    storage = firebase.storage();
    fbReady = true;
    auth.onAuthStateChanged(user => {
      if (user) saveUserLocal({ email: user.email, uid: user.uid });
      else { localStorage.removeItem('udhub_cu'); updateAuthUI(); }
    });
    return true;
  } catch (e) {
    console.error('Firebase init failed:', e);
    return false;
  }
}

/* ─── CONSTANTS ─── */
const GENRES = [
  'Action','Adventure','Role-Playing (RPG)','Simulation','Strategy','Sports',
  'Racing','Fighting','Shooter (FPS / TPS)','Platformer','Puzzle','Idle / Incremental',
  'Horror / Survival','Sandbox / Open World','Music / Rhythm','Educational',
  'Party / Casual','MMO / Online Multiplayer','Board / Card','Virtual Reality (VR)',
  'Augmented Reality (AR)','Stealth','Arcade / Retro','Simulation Sports','Other / Experimental'
];
const COVER_W = 480, COVER_H = 296;

/* ─── DOM ─── */
const $ = id => document.getElementById(id);
const modal            = $('modal');
const authModal        = $('authModal');
const profileModal     = $('profileModal');
const fbModal          = $('fbModal');
const submitForm       = $('submitForm');
const cardImageInput   = $('cardImage');
const categoryContainer= $('categoryContainer');
const nextPageBtn      = $('nextPage');
const searchInput      = $('searchInput');
const loginBtn         = $('loginBtn');
const signupBtn        = $('signupBtn');
const closeAuth        = $('closeAuth');
const authForm         = $('authForm');
const authTitle        = $('authTitle');
const profileSection   = $('profileSection');
const authSection      = $('authSection');
const profileAvatar    = $('profileAvatar');
const profileEmailEl   = $('profileEmail');
const profileLogout    = $('profileLogout');
const uploadGameBtn    = $('uploadGameBtn');
const closeProfile     = $('closeProfile');
const profileForm      = $('profileForm');
const profileFormEmail = $('profileFormEmail');
const profileFormBio   = $('profileFormBio');
const cancelProfile    = $('cancelProfile');
const fbStatusDot      = $('fbStatusDot');
const fbStatusText     = $('fbStatusText');
const fbConnectBtn     = $('fbConnectBtn');
const closeFbModal     = $('closeFbModal');
const setFbBtn         = $('setFbBtn');
const cta              = $('ctaSubmit');
const closeModalEl     = $('closeModal');
const cancelBtn        = $('cancelSubmit');

let authMode = 'login';

/* ─── FIREBASE STATUS ─── */
function updateFbStatus() {
  if (fbStatusDot)  fbStatusDot.className = 'fb-dot ' + (fbReady ? 'connected' : 'disconnected');
  if (fbStatusText) fbStatusText.textContent = fbReady ? 'Firebase Connected' : 'Firebase Not Connected';
  if (fbConnectBtn) { fbConnectBtn.textContent = fbReady ? '✓ Connected' : 'Connect & Continue'; fbConnectBtn.disabled = fbReady; }
}

/* ─── AUTH ─── */
function emailColor(e) {
  let h = 0;
  for (let i = 0; i < e.length; i++) { h = ((h << 5) - h) + e.charCodeAt(i); h = h & h; }
  return `hsl(${Math.abs(h) % 360},70%,60%)`;
}
function loadUser()       { return JSON.parse(localStorage.getItem('udhub_cu') || 'null'); }
function saveUserLocal(u) { localStorage.setItem('udhub_cu', JSON.stringify(u)); updateAuthUI(); }

function updateAuthUI() {
  const cu = loadUser();
  if (cu) {
    if (profileEmailEl) profileEmailEl.textContent = cu.email;
    if (profileAvatar)  { profileAvatar.style.background = emailColor(cu.email); profileAvatar.onclick = () => openProfileModal(cu.email); }
    if (profileSection) profileSection.classList.remove('hidden');
    if (authSection)    authSection.classList.add('hidden');
    if (uploadGameBtn)  uploadGameBtn.onclick = openModal;
    if (profileLogout)  profileLogout.onclick = async () => {
      if (fbReady && auth) { try { await auth.signOut(); } catch(e){} }
      localStorage.removeItem('udhub_cu');
      location.reload();
    };
  } else {
    if (profileSection) profileSection.classList.add('hidden');
    if (authSection)    authSection.classList.remove('hidden');
  }
}

async function getUserProfile(email) {
  if (fbReady && db) {
    try { const s = await db.collection('users').doc(email).get(); return s.exists ? (s.data().profile || { bio: '' }) : { bio: '' }; }
    catch(e) { return { bio: '' }; }
  }
  const u = JSON.parse(localStorage.getItem('udhub_users') || '{}');
  return (u[email] && u[email].profile) ? u[email].profile : { bio: '' };
}

async function saveUserProfile(email, profile) {
  if (fbReady && db) { try { await db.collection('users').doc(email).set({ profile }, { merge: true }); return; } catch(e){} }
  const u = JSON.parse(localStorage.getItem('udhub_users') || '{}');
  if (!u[email]) u[email] = {};
  u[email].profile = profile;
  localStorage.setItem('udhub_users', JSON.stringify(u));
}

async function openProfileModal(email) {
  const p = await getUserProfile(email);
  if (profileFormEmail) profileFormEmail.value = email;
  if (profileFormBio)   profileFormBio.value   = p.bio || '';
  if (profileModal) profileModal.classList.remove('hidden');
}

async function registerUser(email, password) {
  if (fbReady && auth) {
    try {
      const c = await auth.createUserWithEmailAndPassword(email, password);
      try { await db.collection('users').doc(email).set({ email, createdAt: Date.now(), profile: { bio: '' } }); } catch(e){}
      saveUserLocal({ email, uid: c.user.uid });
      return { ok: true, msg: 'Account created!' };
    } catch(e) { return { ok: false, msg: e.message }; }
  }
  const u = JSON.parse(localStorage.getItem('udhub_users') || '{}');
  if (u[email]) return { ok: false, msg: 'Email already registered' };
  u[email] = { email, password, profile: { bio: '' }, createdAt: Date.now() };
  localStorage.setItem('udhub_users', JSON.stringify(u));
  saveUserLocal({ email });
  return { ok: true, msg: 'Account created!' };
}

async function loginUser(email, password) {
  if (fbReady && auth) {
    try {
      const c = await auth.signInWithEmailAndPassword(email, password);
      saveUserLocal({ email, uid: c.user.uid });
      return { ok: true, msg: 'Logged in!' };
    } catch(e) { return { ok: false, msg: e.message }; }
  }
  const u = JSON.parse(localStorage.getItem('udhub_users') || '{}');
  if (!u[email]) return { ok: false, msg: 'User not found' };
  if (u[email].password !== password) return { ok: false, msg: 'Wrong password' };
  saveUserLocal({ email });
  return { ok: true, msg: 'Logged in!' };
}

/* ─── AUTH FORM ─── */
if (authForm) {
  authForm.addEventListener('submit', async ev => {
    ev.preventDefault();
    const email    = authForm.querySelector('input[name="email"]').value.trim();
    const password = authForm.querySelector('input[name="password"]').value.trim();
    if (!email || !password) { alert('Email and password required'); return; }
    const btn = authForm.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Please wait…'; }
    try {
      const r = authMode === 'signup' ? await registerUser(email, password) : await loginUser(email, password);
      if (r.ok) { if (authModal) authModal.classList.add('hidden'); authForm.reset(); updateAuthUI(); }
      else alert('Error: ' + r.msg);
    } catch(e) { alert('Unexpected error: ' + e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Continue'; } }
  });
}

/* ─── GENRE HELPERS ─── */
function gradientFromStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; }
  const h1 = Math.abs(h) % 360, h2 = (h1 + 55) % 360;
  return `linear-gradient(135deg,hsl(${h1},75%,55%),hsl(${h2},75%,55%))`;
}

function populateGenres() {
  const form = $('submitForm'); if (!form) return;
  const sel  = form.querySelector('select[name="genre"]'); if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  GENRES.forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    o.style.background = '#040a23'; o.style.color = '#fff';
    sel.appendChild(o);
  });
}

/* ─── IMAGE CROP ─── */
function cropToBlob(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Could not read file'));
    r.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load image'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = COVER_W; canvas.height = COVER_H;
          const ctx = canvas.getContext('2d');
          const sr = img.width / img.height, dr = COVER_W / COVER_H;
          let sx, sy, sw, sh;
          if (sr > dr) { sh = img.height; sw = sh * dr; sx = (img.width - sw) / 2; sy = 0; }
          else         { sw = img.width; sh = sw / dr; sx = 0; sy = (img.height - sh) / 2; }
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, COVER_W, COVER_H);
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image conversion failed')), 'image/jpeg', 0.85);
        } catch(err) { reject(err); }
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}

function cropToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Could not read file'));
    r.onload = e => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = COVER_W; canvas.height = COVER_H;
        const ctx = canvas.getContext('2d');
        const sr = img.width / img.height, dr = COVER_W / COVER_H;
        let sx, sy, sw, sh;
        if (sr > dr) { sh = img.height; sw = sh * dr; sx = (img.width - sw) / 2; sy = 0; }
        else         { sw = img.width; sh = sw / dr; sx = 0; sy = (img.height - sh) / 2; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, COVER_W, COVER_H);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}

/* ─── UPLOAD PROGRESS ─── */
function showProgress(msg, pct) {
  const w = $('uploadProgress'), b = $('uploadBar'), t = $('uploadStatusText');
  if (w) w.style.display = 'block';
  if (b) b.style.width = pct + '%';
  if (t) t.textContent = msg;
}
function hideProgress() {
  const w = $('uploadProgress'), b = $('uploadBar');
  if (w) w.style.display = 'none';
  if (b) b.style.width = '0%';
}

/* ─── DOWNLOAD COUNT HELPERS ─── */
function getDownloadKey(gameId) { return 'udhub_dl_' + gameId; }
function getDownloadCount(gameId) { return parseInt(localStorage.getItem(getDownloadKey(gameId)) || '0', 10); }
function incrementDownload(gameId) {
  const n = getDownloadCount(gameId) + 1;
  localStorage.setItem(getDownloadKey(gameId), String(n));
  // Also persist to Firestore if connected
  if (fbReady && db) {
    db.collection('games').doc(String(gameId)).update({
      downloads: firebase.firestore.FieldValue.increment(1)
    }).catch(() => {});
  }
  return n;
}

/* ─── GAME STORAGE ─── */
async function saveGame(game) {
  const cu = loadUser();
  if (!cu) { alert('You must be logged in to submit games'); return false; }
  game.developer = cu.email;
  game.createdAt = Date.now();
  game.downloads = 0;

  const isLocalFile = location.protocol === 'file:';

  if (fbReady && db && storage && !isLocalFile) {
    try {
      showProgress('Uploading image…', 15);
      const imgRef     = storage.ref(`covers/${game.id}.jpg`);
      const uploadTask = imgRef.put(game._blob, { contentType: 'image/jpeg' });
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          snap => { const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 65) + 15; showProgress('Uploading image…', pct); },
          err  => reject(err),
          ()   => resolve()
        );
      });
      showProgress('Getting image URL…', 85);
      game.image = await imgRef.getDownloadURL();
      delete game._blob; delete game._dataURL;
      showProgress('Saving game…', 93);
      await db.collection('games').doc(String(game.id)).set(game);
      showProgress('Done!', 100);
      return true;
    } catch(e) {
      console.error('Firebase save failed:', e);
      alert('Upload failed: ' + e.message + '\n\nMake sure Firebase Storage is enabled and rules allow writes (test mode).');
      return false;
    }
  }

  // Firebase connected but file:// — save to Firestore with dataURL
  if (fbReady && db && isLocalFile) {
    try {
      showProgress('Saving to Firestore…', 50);
      game.image = game._dataURL;
      delete game._blob; delete game._dataURL;
      await db.collection('games').doc(String(game.id)).set(game);
      showProgress('Done!', 100);
      return true;
    } catch(e) { console.error('Firestore save failed:', e); }
  }

  // Full local fallback
  showProgress('Saving locally…', 80);
  game.image = game._dataURL || game.image;
  delete game._blob; delete game._dataURL;
  const key  = 'udhub_games_' + cu.email;
  const data = JSON.parse(localStorage.getItem(key) || '[]');
  data.unshift(game);
  localStorage.setItem(key, JSON.stringify(data));
  showProgress('Done!', 100);
  return true;
}

async function loadGames() {
  if (fbReady && db) {
    try {
      const snap = await db.collection('games').orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => d.data());
    } catch(e) { console.error('loadGames:', e); }
  }
  let all = [];
  const u = JSON.parse(localStorage.getItem('udhub_users') || '{}');
  Object.keys(u).forEach(email => {
    const games = JSON.parse(localStorage.getItem('udhub_games_' + email) || '[]');
    games.forEach(g => { if (!g.image && g.screenshots && g.screenshots.length) g.image = g.screenshots[0]; if (!g.downloads) g.downloads = 0; });
    all = all.concat(games);
  });
  return all;
}

async function deleteGame(gameId) {
  const cu = loadUser(); if (!cu) return;
  if (fbReady && db) {
    try {
      await db.collection('games').doc(String(gameId)).delete();
      try { await storage.ref(`covers/${gameId}.jpg`).delete(); } catch(e) {}
      return;
    } catch(e) { console.error('deleteGame:', e); }
  }
  const key = 'udhub_games_' + cu.email;
  const games = JSON.parse(localStorage.getItem(key) || '[]');
  localStorage.setItem(key, JSON.stringify(games.filter(g => g.id !== gameId)));
}

async function getGameById(id) {
  if (fbReady && db) {
    try { const s = await db.collection('games').doc(String(id)).get(); return s.exists ? s.data() : null; }
    catch(e) {}
  }
  return (await loadGames()).find(g => g.id == id) || null;
}

/* ─── ESCAPE HTML ─── */
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ─── CARDS ─── */
function createCard(game) {
  const card = document.createElement('div'); card.className = 'card';

  // Cover image
  const shot = document.createElement('div'); shot.className = 'screenshot';
  if (game.image) {
    const img = document.createElement('img');
    img.src = game.image; img.alt = game.title || '';
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;object-position:center;display:block;';
    shot.appendChild(img);
  } else { shot.textContent = 'No image'; }
  if (!game.available) {
    const ov = document.createElement('div'); ov.className = 'unavailable-overlay'; ov.textContent = 'Coming Soon';
    shot.appendChild(ov);
  }
  card.appendChild(shot);

  // Body
  const body = document.createElement('div'); body.className = 'card-body';
  const meta = document.createElement('div'); meta.className = 'meta';
  meta.innerHTML = `<strong>${esc(game.title)}</strong><span class="dev-tag">${esc(game.developer || 'Anonymous')}</span>`;
  body.appendChild(meta);
  if (game.description) {
    const desc = document.createElement('div'); desc.className = 'desc';
    desc.textContent = game.description.length > 88 ? game.description.slice(0, 88) + '…' : game.description;
    body.appendChild(desc);
  }
  card.appendChild(body);

  // Footer: download count + View button
  const footer = document.createElement('div'); footer.className = 'card-footer';
  const dlCount = document.createElement('div'); dlCount.className = 'dl-count';
  const dlNum = game.downloads || getDownloadCount(game.id) || 0;
  dlCount.innerHTML = `<span class="dl-icon">⬇</span> ${dlNum.toLocaleString()} download${dlNum !== 1 ? 's' : ''}`;
  footer.appendChild(dlCount);

  const viewBtn = document.createElement('button'); viewBtn.className = 'btn small'; viewBtn.textContent = 'View';
  viewBtn.addEventListener('click', () => window.open(`detail.html?gameId=${game.id}`, '_blank'));
  footer.appendChild(viewBtn);
  card.appendChild(footer);

  return card;
}

/* ─── SEARCH — live as you type ─── */
let page = 0, searchQuery = '', allGamesCache = [];

function filterGames(games) {
  if (!searchQuery.trim()) return games;
  const q = searchQuery.toLowerCase();
  return games.filter(g =>
    (g.title || '').toLowerCase().includes(q) ||
    (g.description || '').toLowerCase().includes(q) ||
    (g.genre || '').toLowerCase().includes(q) ||
    (g.developer || '').toLowerCase().includes(q)
  );
}

/* ─── SEARCH RESULTS VIEW ─── */
function renderSearchResults(games) {
  if (!categoryContainer) return;
  const q = searchQuery;
  categoryContainer.innerHTML = '';

  const header = document.createElement('div');
  header.style.cssText = 'padding:0 4px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;';
  header.innerHTML = `
    <div>
      <div style="font-family:Orbitron,sans-serif;font-size:.7rem;letter-spacing:.15em;color:rgba(0,198,255,.6);text-transform:uppercase;margin-bottom:4px;">Search results for</div>
      <div style="font-size:1.3rem;font-weight:700;color:var(--white);">"${esc(q)}"</div>
      <div style="font-size:.82rem;color:rgba(255,255,255,.45);margin-top:3px;">${games.length} game${games.length !== 1 ? 's' : ''} found</div>
    </div>
    <button id="clearSearch" class="btn ghost" style="font-size:.8rem;padding:7px 14px;">✕ Clear search</button>
  `;
  categoryContainer.appendChild(header);

  if (!games.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:60px 20px;opacity:.4;font-family:Orbitron,sans-serif;font-size:.78rem;letter-spacing:.1em;';
    empty.textContent = 'No games match your search.';
    categoryContainer.appendChild(empty);
  } else {
    const grid = document.createElement('div'); grid.className = 'category-grid';
    games.forEach(g => grid.appendChild(createCard(g)));
    categoryContainer.appendChild(grid);
  }

  const clr = $('clearSearch');
  if (clr) clr.addEventListener('click', () => {
    searchQuery = '';
    if (searchInput) searchInput.value = '';
    renderCategoryRows();
  });
}

/* ─── CATEGORY GRID VIEW (View All) ─── */
function renderCategoryGrid(catName, games) {
  if (!categoryContainer) return;
  categoryContainer.innerHTML = '';

  // Back button + header
  const header = document.createElement('div');
  header.style.cssText = 'padding:0 4px 24px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;';
  const backBtn = document.createElement('button');
  backBtn.className = 'btn ghost';
  backBtn.style.cssText = 'font-size:.8rem;padding:7px 14px;';
  backBtn.textContent = '◀ Back';
  backBtn.addEventListener('click', () => renderCategoryRows());
  header.appendChild(backBtn);

  const titleWrap = document.createElement('div');
  const catLabel = document.createElement('div');
  catLabel.style.cssText = 'font-family:Orbitron,sans-serif;font-size:.65rem;letter-spacing:.15em;color:rgba(0,198,255,.6);text-transform:uppercase;margin-bottom:4px;';
  catLabel.textContent = 'Category';
  const catTitle = document.createElement('div');
  catTitle.style.cssText = 'font-family:Orbitron,sans-serif;font-size:1.2rem;font-weight:700;';
  const pill = document.createElement('span');
  pill.style.cssText = `display:inline-block;padding:4px 14px;border-radius:6px;background:${gradientFromStr(catName)};color:#020510;font-size:.82rem;`;
  pill.textContent = catName;
  catTitle.appendChild(pill);
  titleWrap.appendChild(catLabel);
  titleWrap.appendChild(catTitle);
  header.appendChild(titleWrap);

  const count = document.createElement('div');
  count.style.cssText = 'margin-left:auto;font-size:.82rem;color:rgba(255,255,255,.4);';
  count.textContent = `${games.length} game${games.length !== 1 ? 's' : ''}`;
  header.appendChild(count);
  categoryContainer.appendChild(header);

  if (!games.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:60px 20px;opacity:.4;font-family:Orbitron,sans-serif;font-size:.78rem;letter-spacing:.1em;';
    empty.textContent = 'No games in this category yet.';
    categoryContainer.appendChild(empty);
  } else {
    const grid = document.createElement('div'); grid.className = 'category-grid';
    games.forEach(g => grid.appendChild(createCard(g)));
    categoryContainer.appendChild(grid);
  }
}

/* ─── CATEGORY ROWS (main view) ─── */
async function renderCategoryRows() {
  if (!categoryContainer) return;
  categoryContainer.innerHTML = '<div style="text-align:center;padding:40px;opacity:.35;font-family:Orbitron,sans-serif;font-size:.72rem;letter-spacing:.15em;">LOADING...</div>';
  allGamesCache = await loadGames();

  if (searchQuery.trim()) {
    renderSearchResults(filterGames(allGamesCache));
    return;
  }

  categoryContainer.innerHTML = '';
  const cats = GENRES.slice(page * 6, page * 6 + 6);

  cats.forEach(cat => {
    const inCat = allGamesCache.filter(g => g.genre === cat);

    const row    = document.createElement('div'); row.className = 'category-row';
    const header = document.createElement('div'); header.className = 'category-header';

    // Bubble
    const bubble = document.createElement('div'); bubble.className = 'category-bubble';
    bubble.style.background = gradientFromStr(cat);
    const title = document.createElement('h3'); title.textContent = cat;
    bubble.appendChild(title); header.appendChild(bubble);

    // "View All" button
    const viewAllBtn = document.createElement('button');
    viewAllBtn.className = 'btn small view-all-btn';
    viewAllBtn.innerHTML = `View All <span class="view-all-count">${inCat.length}</span>`;
    viewAllBtn.addEventListener('click', () => renderCategoryGrid(cat, inCat));
    header.appendChild(viewAllBtn);

    // Carousel
    const wrap    = document.createElement('div'); wrap.className = 'carousel-wrap';
    const left    = document.createElement('button'); left.className = 'arrow left'; left.textContent = '◀';
    const right   = document.createElement('button'); right.className = 'arrow right'; right.textContent = '▶';
    const carousel = document.createElement('div'); carousel.className = 'carousel';

    if (!inCat.length) {
      const empty = document.createElement('div'); empty.className = 'card';
      empty.style.cssText = 'display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.2);font-size:.76rem;min-height:80px;padding:20px;';
      empty.textContent = 'No games yet'; carousel.appendChild(empty);
    }
    inCat.forEach(g => carousel.appendChild(createCard(g)));

    left.addEventListener('click',  () => carousel.scrollBy({ left: -280, behavior: 'smooth' }));
    right.addEventListener('click', () => carousel.scrollBy({ left:  280, behavior: 'smooth' }));
    wrap.appendChild(left); wrap.appendChild(carousel); wrap.appendChild(right);
    row.appendChild(header); row.appendChild(wrap);
    categoryContainer.appendChild(row);
  });
}

/* ─── DETAIL PAGE ─── */
async function renderDetailPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('gameId');
  if (!id) return;
  const container = $('gameDetail'); if (!container) return;
  container.innerHTML = '<p style="opacity:.35;padding:40px;font-family:Orbitron,sans-serif;font-size:.72rem;letter-spacing:.15em;">LOADING...</p>';
  const game = await getGameById(id);
  if (!game) { container.innerHTML = '<p style="opacity:.4;padding:40px">Game not found.</p>'; return; }
  const cu      = loadUser();
  const isOwner = cu && cu.email === game.developer;
  const dlCount = game.downloads || getDownloadCount(game.id) || 0;
  container.innerHTML = `
    <a href="hub.html" style="color:var(--cyan);opacity:.6;font-size:.85rem;display:inline-flex;align-items:center;gap:6px;margin-bottom:26px;font-family:Rajdhani,sans-serif;">◀ Back to Hub</a>
    ${game.image ? `<div class="detail-cover"><img src="${esc(game.image)}" alt="${esc(game.title)}"></div>` : ''}
    <div class="detail-badge">${esc(game.genre || '')}</div>
    <h1 class="detail-title">${esc(game.title)}</h1>
    <div class="detail-dev">by ${esc(game.developer || 'Unknown Developer')}</div>
    <div class="detail-dl-count"><span>⬇</span> ${dlCount.toLocaleString()} download${dlCount !== 1 ? 's' : ''}</div>
    <p class="detail-desc">${esc(game.description || 'No description provided.')}</p>
    ${game.link
      ? `<a href="${esc(game.link)}" target="_blank" rel="noopener noreferrer" class="btn download" id="dlBtn">⬇ Download / Play</a>`
      : '<p style="opacity:.32;font-size:.82rem;font-family:Orbitron,sans-serif;letter-spacing:.1em;">NO DOWNLOAD LINK</p>'}
    ${isOwner ? `<div style="margin-top:34px;padding-top:22px;border-top:1px solid var(--border)">
      <p style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--cyan);letter-spacing:.12em;margin-bottom:11px;opacity:.65">OWNER CONTROLS</p>
      <button id="deleteGameBtn" class="btn danger">Delete This Game</button>
    </div>` : ''}
  `;

  // Track downloads
  const dlBtn = container.querySelector('#dlBtn');
  if (dlBtn) dlBtn.addEventListener('click', () => incrementDownload(game.id));

  if (isOwner) {
    const del = container.querySelector('#deleteGameBtn');
    if (del) del.addEventListener('click', async () => {
      if (confirm('Delete this game permanently?')) { await deleteGame(game.id); window.location.href = 'hub.html'; }
    });
  }
}

/* ─── SUBMIT MODAL ─── */
function openModal() {
  const cu = loadUser();
  if (!cu) { alert('Please log in first to submit a game.'); if (authModal) { authMode = 'login'; if (authTitle) authTitle.textContent = 'Log in'; authModal.classList.remove('hidden'); } return; }
  populateGenres(); hideProgress();
  if (modal) modal.classList.remove('hidden');
}
function closeModalFn() { if (modal) modal.classList.add('hidden'); }
if (cta)         cta.addEventListener('click', openModal);
if (closeModalEl) closeModalEl.addEventListener('click', closeModalFn);
if (cancelBtn)   cancelBtn.addEventListener('click', closeModalFn);

if (submitForm) {
  submitForm.addEventListener('submit', async ev => {
    ev.preventDefault();
    const cu = loadUser();
    if (!cu) { alert('You must be logged in to submit games'); return; }
    const fd          = new FormData(submitForm);
    const title       = (fd.get('title') || '').trim();
    const genre       = fd.get('genre') || '';
    const description = fd.get('description') || '';
    const link        = fd.get('link') || '';
    const file        = cardImageInput && cardImageInput.files[0] ? cardImageInput.files[0] : null;
    if (!title || !genre) { alert('Title and genre are required'); return; }
    if (!file)            { alert('Please select a cover image'); return; }
    if (!file.type.startsWith('image/')) { alert('Please select a valid image file (JPG, PNG, etc.)'); return; }
    const submitBtn = submitForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Uploading…'; }
    showProgress('Processing image…', 8);
    try {
      const [blob, dataURL] = await Promise.all([cropToBlob(file), cropToDataURL(file)]);
      const game = { id: Date.now(), title, genre, description, link, _blob: blob, _dataURL: dataURL, image: dataURL, developer: cu.email, available: !!link.trim(), downloads: 0, upvotes: 0, comments: [], createdAt: Date.now() };
      const ok = await saveGame(game);
      if (ok) { await renderCategoryRows(); closeModalFn(); submitForm.reset(); if (cardImageInput) cardImageInput.value = ''; setTimeout(hideProgress, 1200); }
    } catch(err) {
      console.error('Submit error:', err);
      alert('Error processing image: ' + err.message + '\n\nTry a smaller or different image.');
    } finally { if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit'; } }
  });
}

/* ─── AUTH BUTTONS ─── */
if (loginBtn)  loginBtn.addEventListener('click',  () => { authMode = 'login';  if (authTitle) authTitle.textContent = 'Log in';  if (authForm) authForm.reset(); if (authModal) authModal.classList.remove('hidden'); });
if (signupBtn) signupBtn.addEventListener('click', () => { authMode = 'signup'; if (authTitle) authTitle.textContent = 'Sign up'; if (authForm) authForm.reset(); if (authModal) authModal.classList.remove('hidden'); });
if (closeAuth) closeAuth.addEventListener('click', () => { if (authModal) authModal.classList.add('hidden'); });

/* ─── PROFILE ─── */
if (closeProfile)  closeProfile.addEventListener('click',  () => { if (profileModal) profileModal.classList.add('hidden'); });
if (cancelProfile) cancelProfile.addEventListener('click', () => { if (profileModal) profileModal.classList.add('hidden'); });
if (profileForm) {
  profileForm.addEventListener('submit', async ev => {
    ev.preventDefault();
    const cu = loadUser(); if (!cu) return;
    await saveUserProfile(cu.email, { bio: profileFormBio ? profileFormBio.value.trim() : '' });
    alert('Profile updated!');
    if (profileModal) profileModal.classList.add('hidden');
  });
}

/* ─── FIREBASE MODAL ─── */
if (closeFbModal) closeFbModal.addEventListener('click', () => { if (fbModal) fbModal.classList.add('hidden'); });
if (setFbBtn)     setFbBtn.addEventListener('click',     () => { if (fbModal) fbModal.classList.remove('hidden'); });
if (fbConnectBtn) {
  fbConnectBtn.addEventListener('click', () => {
    fbConnectBtn.textContent = 'Connecting…'; fbConnectBtn.disabled = true;
    const ok = initFirebase();
    setTimeout(() => {
      updateFbStatus();
      if (ok) { if (fbModal) fbModal.classList.add('hidden'); renderCategoryRows(); updateAuthUI(); }
      else { fbConnectBtn.textContent = 'Retry'; fbConnectBtn.disabled = false; alert('Firebase SDK not available. Make sure you are online.'); }
    }, 900);
  });
}

/* ─── SEARCH (live) ─── */
if (searchInput) {
  // Live search as you type
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    page = 0;
    if (allGamesCache.length) {
      if (searchQuery) renderSearchResults(filterGames(allGamesCache));
      else renderCategoryRows();
    }
  });
  // Also fire on Enter for UX
  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchQuery = searchInput.value.trim();
      page = 0;
      renderCategoryRows();
      if (searchQuery) { const c = $('categories'); if (c) c.scrollIntoView({ behavior: 'smooth' }); }
    }
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { searchQuery = ''; searchInput.value = ''; page = 0; renderCategoryRows(); }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener('click', () => {
    page++;
    if (page * 6 >= GENRES.length) page = 0;
    searchQuery = '';
    if (searchInput) searchInput.value = '';
    renderCategoryRows();
    const c = $('categories'); if (c) window.scrollTo({ top: c.offsetTop, behavior: 'smooth' });
  });
}

/* ═══════════════════════════════════════════════
   RYZEN AI
   NOTE: Direct Anthropic API calls from a browser
   are blocked by CORS on hosted sites. Ryzen needs
   a backend proxy (Cloudflare Worker, Firebase
   Function, etc.) to forward requests. Set
   RYZEN_PROXY_URL to your proxy endpoint to
   enable it. Without a proxy, Ryzen shows a
   helpful message explaining what's needed.
═══════════════════════════════════════════════ */
const RYZEN_PROXY_URL = ''; // e.g. 'https://your-worker.workers.dev/ryzen'

const ryzenBtn      = $('ryzenBtn');
const ryzenPanel    = $('ryzenPanel');
const ryzenClose    = $('ryzenClose');
const ryzenInput    = $('ryzenInput');
const ryzenSend     = $('ryzenSend');
const ryzenMessages = $('ryzenMessages');

if (ryzenBtn)   ryzenBtn.addEventListener('click',  () => ryzenPanel && ryzenPanel.classList.toggle('open'));
if (ryzenClose) ryzenClose.addEventListener('click', () => ryzenPanel && ryzenPanel.classList.remove('open'));

/* ─── RYZEN CHAT HISTORY (per user, saved to localStorage + Firestore) ─── */
function getRyzenHistoryKey() {
  const cu = loadUser();
  return cu ? 'udhub_ryzen_' + cu.email : 'udhub_ryzen_guest';
}

function loadRyzenHistory() {
  try { return JSON.parse(localStorage.getItem(getRyzenHistoryKey()) || '[]'); }
  catch(e) { return []; }
}

function saveRyzenHistory(history) {
  try { localStorage.setItem(getRyzenHistoryKey(), JSON.stringify(history.slice(-40))); } catch(e) {}
  // Also sync to Firestore if available
  const cu = loadUser();
  if (fbReady && db && cu) {
    db.collection('ryzen_chats').doc(cu.email).set({ history: history.slice(-40), updatedAt: Date.now() }, { merge: true }).catch(() => {});
  }
}

function addMsg(text, role, save) {
  if (!ryzenMessages) return null;
  const div = document.createElement('div'); div.className = 'msg ' + role;
  div.textContent = text;
  ryzenMessages.appendChild(div); ryzenMessages.scrollTop = ryzenMessages.scrollHeight;
  if (save) {
    const history = loadRyzenHistory();
    history.push({ role: role === 'user' ? 'user' : 'assistant', content: text, ts: Date.now() });
    saveRyzenHistory(history);
  }
  return div;
}

function renderSavedHistory() {
  if (!ryzenMessages) return;
  const history = loadRyzenHistory();
  if (!history.length) return;
  // Clear default welcome and replay
  ryzenMessages.innerHTML = '';
  history.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'msg ' + (msg.role === 'user' ? 'user' : 'ai');
    div.textContent = msg.content;
    ryzenMessages.appendChild(div);
  });
  ryzenMessages.scrollTop = ryzenMessages.scrollHeight;
}

async function sendToRyzen(txt) {
  txt = txt.trim(); if (!txt) return;
  addMsg(txt, 'user', true);
  if (ryzenInput) ryzenInput.value = '';
  const typing = addMsg('Ryzen is thinking…', 'ai typing', false);

  // No proxy configured
  if (!RYZEN_PROXY_URL) {
    if (typing) typing.remove();
    addMsg("Ryzen needs a backend proxy to work on hosted sites — the Anthropic API blocks direct browser calls (CORS). Ask your dev to set up a Cloudflare Worker or Firebase Function and set RYZEN_PROXY_URL in script.js.", 'ai', false);
    return;
  }

  const games = await loadGames();
  const list  = games.length
    ? games.map(g => `- "${g.title}" (${g.genre}) by ${g.developer}: ${(g.description || '').slice(0, 80)}`).join('\n')
    : 'No games uploaded yet.';

  // Build conversation history for context
  const history = loadRyzenHistory();
  const messages = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-10) // last 5 exchanges
    .map(m => ({ role: m.role, content: m.content }));
  // Add current message
  messages.push({ role: 'user', content: txt });

  try {
    const res = await fetch(RYZEN_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: `You are Ryzen, the AI game scout for Uprising DevHub — an indie game showcase with a space station vibe. You are cool, knowledgeable, and love games. Help users find games on the hub that match what they describe, or suggest similar popular games if nothing matches on the hub. Be conversational and concise (2-4 sentences max). Never use markdown headers or bullet lists.\n\nGames on the hub:\n${list}`,
        messages
      })
    });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error ? err.error.message : 'API error ' + res.status); }
    const data  = await res.json();
    if (typing) typing.remove();
    const reply = data.content && data.content[0] ? data.content[0].text : "Something went wrong — try again!";
    addMsg(reply, 'ai', true);
  } catch(e) {
    if (typing) typing.remove();
    console.error('Ryzen error:', e);
    addMsg("Couldn't reach my systems. Check your proxy setup and internet connection.", 'ai', false);
  }
}

if (ryzenSend)  ryzenSend.addEventListener('click',   () => ryzenInput && sendToRyzen(ryzenInput.value));
if (ryzenInput) ryzenInput.addEventListener('keydown', e  => { if (e.key === 'Enter') sendToRyzen(ryzenInput.value); });

/* ─── INIT ─── */
initFirebase();
updateFbStatus();
updateAuthUI();
populateGenres();
if (categoryContainer) renderCategoryRows();
renderDetailPage();
// Load Ryzen chat history when panel opens
if (ryzenBtn) ryzenBtn.addEventListener('click', () => {
  if (ryzenPanel && ryzenPanel.classList.contains('open')) renderSavedHistory();
});

window.Uprising = { loadGames, initFirebase };

})();

/* ═══════════════════════════════════════════════
   SPACE BATTLE ANIMATION
═══════════════════════════════════════════════ */
(function initSpaceBattle() {
  const canvas = document.getElementById('spaceBattle');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);

  // ── Ship class ──
  class Ship {
    constructor(cfg) {
      Object.assign(this, cfg);
      this.vx = cfg.vx || 0;
      this.vy = cfg.vy || 0;
      this.hp = cfg.maxHp || 100;
      this.maxHp = cfg.maxHp || 100;
      this.flashTimer = 0;
      this.shootCooldown = 0;
    }
    get alive() { return this.hp > 0; }
  }

  // ── Bullet class ──
  class Bullet {
    constructor(x, y, vx, vy, color, owner) {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy;
      this.color = color; this.owner = owner;
      this.life = 1; this.len = 14;
    }
    update() { this.x += this.vx; this.y += this.vy; }
    get alive() { return this.x > -50 && this.x < canvas.width+50 && this.y > -50 && this.y < canvas.height+50; }
  }

  // ── Particle class ──
  class Particle {
    constructor(x, y, vx, vy, color, life) {
      this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.color=color;
      this.life=life; this.maxLife=life; this.size=Math.random()*3+1;
    }
    update() {
      this.x+=this.vx; this.y+=this.vy; this.life--;
      this.vx*=.95; this.vy*=.95;
    }
    get alive() { return this.life > 0; }
  }

  // ── Shield flash ──
  class ShieldHit {
    constructor(x,y,r,color){ this.x=x;this.y=y;this.r=r;this.color=color;this.life=18;this.maxLife=18; }
    update(){ this.life--; }
    get alive(){ return this.life > 0; }
  }

  let bullets = [], particles = [], shields = [];
  let phase = 'approach'; // approach → battle → victory → reset
  let phaseTimer = 0;
  let winner = null;

  // ── Spawn ships ──
  function spawnShips() {
    bullets = []; particles = []; shields = [];
    phase = 'approach'; phaseTimer = 0; winner = null;

    const W = canvas.width, H = canvas.height;
    const cy = H * .42;

    // Alien ship (left side, attacking from left)
    alienShip = new Ship({
      x: -120, y: cy,
      vx: 1.4, vy: 0,
      targetX: W * .28, targetY: cy,
      color: '#A855F7',
      glowColor: 'rgba(168,85,247,.6)',
      maxHp: 100, side: 'alien',
      shootCooldown: 0, shootRate: 52,
      size: 1,
    });

    // Human ship (right side, defender)
    humanShip = new Ship({
      x: W + 120, y: cy,
      vx: -1.4, vy: 0,
      targetX: W * .72, targetY: cy,
      color: '#00D4FF',
      glowColor: 'rgba(0,212,255,.6)',
      maxHp: 100, side: 'human',
      shootCooldown: 0, shootRate: 58,
      size: 1,
    });
  }

  let alienShip, humanShip;
  spawnShips();

  function explode(x, y, count, colors) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + .5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push(new Particle(x, y, Math.cos(angle)*speed, Math.sin(angle)*speed, color, Math.random()*30+20));
    }
  }

  // ── Draw alien ship (UFO-like saucer with glow) ──
  function drawAlienShip(s, alpha) {
    if (!s.alive && phase !== 'victory') return;
    const flash = s.flashTimer > 0;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.globalAlpha = alpha * (flash ? .5 + .5*Math.sin(s.flashTimer*1.2) : 1);

    // Glow
    const g = ctx.createRadialGradient(0,0,4,0,0,48);
    g.addColorStop(0, 'rgba(168,85,247,.25)');
    g.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0,0,48,30,0,0,Math.PI*2); ctx.fill();

    // Saucer body
    ctx.shadowColor = '#A855F7'; ctx.shadowBlur = 18;
    ctx.fillStyle = flash ? '#fff' : '#6D28D9';
    ctx.beginPath(); ctx.ellipse(0,4,36,11,0,0,Math.PI*2); ctx.fill();

    // Dome
    ctx.fillStyle = flash ? '#fff' : '#8B5CF6';
    ctx.beginPath(); ctx.ellipse(0,-2,18,13,0,Math.PI,0); ctx.fill();

    // Dome highlight
    ctx.fillStyle = 'rgba(196,181,253,.35)';
    ctx.beginPath(); ctx.ellipse(-3,-5,10,7,-.3,Math.PI,0); ctx.fill();

    // Underside lights
    const lightColors = ['#F472B6','#00D4FF','#A855F7','#FBBF24'];
    for (let i = 0; i < 4; i++) {
      const lx = (i - 1.5) * 14;
      ctx.shadowColor = lightColors[i]; ctx.shadowBlur = 10;
      ctx.fillStyle = lightColors[i];
      ctx.beginPath(); ctx.arc(lx, 11, 3.5, 0, Math.PI*2); ctx.fill();
    }

    // Thruster trail
    ctx.shadowBlur = 0;
    const tg = ctx.createLinearGradient(36,0,70,0);
    tg.addColorStop(0,'rgba(168,85,247,.55)');
    tg.addColorStop(1,'rgba(168,85,247,0)');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.ellipse(52,4,18,5,0,0,Math.PI*2); ctx.fill();

    ctx.restore();
  }

  // ── Draw human ship (sleek fighter) ──
  function drawHumanShip(s, alpha) {
    if (!s.alive && phase !== 'victory') return;
    const flash = s.flashTimer > 0;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(-1, 1); // flip to face left
    ctx.globalAlpha = alpha * (flash ? .5 + .5*Math.sin(s.flashTimer*1.2) : 1);

    // Glow
    const g = ctx.createRadialGradient(0,0,4,0,0,50);
    g.addColorStop(0,'rgba(0,212,255,.22)');
    g.addColorStop(1,'rgba(0,212,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,50,0,Math.PI*2); ctx.fill();

    ctx.shadowColor = '#00D4FF'; ctx.shadowBlur = 20;

    // Main body
    ctx.fillStyle = flash ? '#fff' : '#0E4A6B';
    ctx.beginPath();
    ctx.moveTo(46, 0); ctx.lineTo(-10, -9); ctx.lineTo(-20, 0); ctx.lineTo(-10, 9);
    ctx.closePath(); ctx.fill();

    // Cockpit
    ctx.fillStyle = flash ? '#fff' : '#00D4FF';
    ctx.beginPath();
    ctx.moveTo(32,0); ctx.lineTo(10,-5); ctx.lineTo(8,0); ctx.lineTo(10,5);
    ctx.closePath(); ctx.fill();

    // Cockpit glass
    ctx.fillStyle='rgba(187,247,255,.28)';
    ctx.beginPath(); ctx.ellipse(22,0,8,4,0,0,Math.PI*2); ctx.fill();

    // Wing top
    ctx.fillStyle = flash ? '#fff' : '#0891B2';
    ctx.beginPath();
    ctx.moveTo(10,-9); ctx.lineTo(-5,-28); ctx.lineTo(-18,-10); ctx.lineTo(-10,-9);
    ctx.closePath(); ctx.fill();

    // Wing bottom
    ctx.fillStyle = flash ? '#fff' : '#0891B2';
    ctx.beginPath();
    ctx.moveTo(10,9); ctx.lineTo(-5,28); ctx.lineTo(-18,10); ctx.lineTo(-10,9);
    ctx.closePath(); ctx.fill();

    // Engine pods
    ctx.fillStyle = flash ? '#fff' : '#164E63';
    ctx.beginPath(); ctx.ellipse(-16,-16,8,4,-.3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-16,16,8,4,.3,0,Math.PI*2); ctx.fill();

    // Engine glow
    ctx.shadowColor='#00FFB2'; ctx.shadowBlur=14;
    ctx.fillStyle='#00FFB2';
    ctx.beginPath(); ctx.ellipse(-22,-16,4,3,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-22,16,4,3,0,0,Math.PI*2); ctx.fill();

    // Exhaust
    ctx.shadowBlur=0;
    const eg1 = ctx.createLinearGradient(-24,-16,-46,-16);
    eg1.addColorStop(0,'rgba(0,255,178,.5)'); eg1.addColorStop(1,'rgba(0,255,178,0)');
    ctx.fillStyle=eg1; ctx.beginPath(); ctx.ellipse(-36,-16,14,4,0,0,Math.PI*2); ctx.fill();
    const eg2 = ctx.createLinearGradient(-24,16,-46,16);
    eg2.addColorStop(0,'rgba(0,255,178,.5)'); eg2.addColorStop(1,'rgba(0,255,178,0)');
    ctx.fillStyle=eg2; ctx.beginPath(); ctx.ellipse(-36,16,14,4,0,0,Math.PI*2); ctx.fill();

    ctx.restore();
  }

  // ── Draw bullet ──
  function drawBullet(b) {
    ctx.save();
    ctx.globalAlpha = .9;
    ctx.shadowColor = b.color; ctx.shadowBlur = 10;
    const angle = Math.atan2(b.vy, b.vx);
    ctx.translate(b.x, b.y); ctx.rotate(angle);
    const g = ctx.createLinearGradient(-b.len,0,4,0);
    g.addColorStop(0,'rgba(255,255,255,0)');
    g.addColorStop(.6,b.color);
    g.addColorStop(1,'#fff');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.ellipse(0,0,b.len/2,2.5,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ── Draw particle ──
  function drawParticle(p) {
    ctx.save();
    ctx.globalAlpha = (p.life/p.maxLife)*.9;
    ctx.shadowColor = p.color; ctx.shadowBlur = 6;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size*(p.life/p.maxLife), 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ── Draw shield hit ──
  function drawShieldHit(sh) {
    const a = sh.life/sh.maxLife;
    ctx.save();
    ctx.globalAlpha = a * .6;
    ctx.strokeStyle = sh.color; ctx.shadowColor = sh.color; ctx.shadowBlur = 18;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r*(1+(1-a)*.4), 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  // ── Draw HP bar ──
  function drawHpBar(ship, label, barX, barY, flip) {
    const W2 = 90, H2 = 6;
    const x = flip ? barX - W2 : barX;
    ctx.save();
    ctx.globalAlpha = .75;
    // bg
    ctx.fillStyle='rgba(255,255,255,.07)';
    ctx.beginPath(); ctx.roundRect(x, barY, W2, H2, 3); ctx.fill();
    // fill
    const pct = Math.max(0, ship.hp/ship.maxHp);
    const fillColor = pct > .5 ? ship.color : pct > .25 ? '#FBBF24' : '#EF4444';
    ctx.fillStyle = fillColor;
    ctx.shadowColor = fillColor; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(x, barY, W2*pct, H2, 3); ctx.fill();
    // label
    ctx.shadowBlur=0; ctx.globalAlpha=.5;
    ctx.fillStyle='#fff'; ctx.font='bold 9px Orbitron,monospace';
    ctx.textAlign = flip ? 'right' : 'left';
    ctx.fillText(label, flip ? x+W2 : x, barY-5);
    ctx.restore();
  }

  // ── Shoot helper ──
  function shoot(from, target, speed, color) {
    const dx = target.x - from.x, dy = target.y - from.y;
    const dist = Math.sqrt(dx*dx+dy*dy) || 1;
    const spread = (Math.random()-.5) * .12;
    bullets.push(new Bullet(
      from.x + (from.side==='alien'?38:-38), from.y,
      (dx/dist)*speed + spread,
      (dy/dist)*speed + spread,
      color, from.side
    ));
  }

  // ── Main loop ──
  function update() {
    const W = canvas.width, H = canvas.height;
    phaseTimer++;

    if (phase === 'approach') {
      // Move ships to battle positions
      const lerp = (a,b,t) => a+(b-a)*t;
      alienShip.x = lerp(alienShip.x, alienShip.targetX, .025);
      alienShip.y = lerp(alienShip.y, alienShip.targetY, .025);
      humanShip.x = lerp(humanShip.x, humanShip.targetX, .025);
      humanShip.y = lerp(humanShip.y, humanShip.targetY, .025);
      if (Math.abs(alienShip.x - alienShip.targetX) < 3) phase = 'battle';
    }

    if (phase === 'battle') {
      // Gentle idle bob
      alienShip.y = alienShip.targetY + Math.sin(phaseTimer*.025)*8;
      humanShip.y = humanShip.targetY + Math.sin(phaseTimer*.025+1.4)*8;

      // Shooting
      alienShip.shootCooldown--;
      humanShip.shootCooldown--;

      if (alienShip.shootCooldown <= 0 && alienShip.alive) {
        shoot(alienShip, humanShip, 5.5, '#F472B6');
        shoot(alienShip, humanShip, 5.5, '#A855F7');
        alienShip.shootCooldown = alienShip.shootRate + Math.random()*20;
      }
      if (humanShip.shootCooldown <= 0 && humanShip.alive) {
        shoot(humanShip, alienShip, 5.5, '#00D4FF');
        shoot(humanShip, alienShip, 5.5, '#00FFB2');
        humanShip.shootCooldown = humanShip.shootRate + Math.random()*20;
      }

      // Bullet logic
      bullets.forEach(b => {
        b.update();
        if (b.owner === 'alien' && humanShip.alive) {
          const dx=b.x-humanShip.x, dy=b.y-humanShip.y;
          if (Math.sqrt(dx*dx+dy*dy) < 34) {
            humanShip.hp -= 8 + Math.random()*5;
            humanShip.flashTimer = 8;
            explode(humanShip.x+Math.random()*20-10, humanShip.y+Math.random()*20-10, 6, ['#00D4FF','#fff','#00FFB2']);
            shields.push(new ShieldHit(humanShip.x, humanShip.y, 38, '#00D4FF'));
            b.life = 0;
          }
        }
        if (b.owner === 'human' && alienShip.alive) {
          const dx=b.x-alienShip.x, dy=b.y-alienShip.y;
          if (Math.sqrt(dx*dx+dy*dy) < 36) {
            alienShip.hp -= 8 + Math.random()*5;
            alienShip.flashTimer = 8;
            explode(alienShip.x+Math.random()*20-10, alienShip.y+Math.random()*12-6, 6, ['#A855F7','#fff','#F472B6']);
            shields.push(new ShieldHit(alienShip.x, alienShip.y, 42, '#A855F7'));
            b.life = 0;
          }
        }
      });
      bullets = bullets.filter(b => b.alive && b.life > 0);

      // Flash timers
      if (alienShip.flashTimer > 0) alienShip.flashTimer--;
      if (humanShip.flashTimer > 0) humanShip.flashTimer--;

      // Death check
      if (!alienShip.alive || !humanShip.alive) {
        const dead = !alienShip.alive ? alienShip : humanShip;
        winner = !alienShip.alive ? humanShip : alienShip;
        explode(dead.x, dead.y, 50, ['#FF6B35','#FCD34D','#EF4444','#fff','#F97316']);
        explode(dead.x, dead.y, 30, ['#A855F7','#EC4899','#fff']);
        phase = 'victory';
        phaseTimer = 0;
      }
    }

    if (phase === 'victory') {
      // Winner does a victory fly-off
      if (winner === alienShip) alienShip.x -= 1.2;
      else humanShip.x += 1.2;
      if (phaseTimer > 120) { phase = 'reset'; phaseTimer = 0; }
    }

    if (phase === 'reset') {
      if (phaseTimer > 60) spawnShips();
    }

    // Update effects
    particles.forEach(p => p.update());
    shields.forEach(s => s.update());
    particles = particles.filter(p => p.alive);
    shields   = shields.filter(s => s.alive);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const W = canvas.width, H = canvas.height;

    // Ships
    const aAlpha = alienShip.alive ? 1 : Math.max(0, 1 - (phaseTimer/40));
    const hAlpha = humanShip.alive ? 1 : Math.max(0, 1 - (phaseTimer/40));
    drawAlienShip(alienShip, aAlpha);
    drawHumanShip(humanShip, hAlpha);

    // Bullets
    bullets.forEach(drawBullet);

    // Effects
    particles.forEach(drawParticle);
    shields.forEach(drawShieldHit);

    // HP bars (only during battle)
    if (phase === 'battle' || phase === 'victory') {
      const barY = alienShip.targetY - 52;
      drawHpBar(alienShip, 'ALIEN',  W*.28 - 45, barY, false);
      drawHpBar(humanShip, 'DEFENDER', W*.72 - 45, barY, false);
    }

    // VS divider line
    if (phase === 'battle') {
      ctx.save();
      ctx.globalAlpha = .07;
      ctx.strokeStyle='#fff';
      ctx.setLineDash([4,8]);
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(W*.5, alienShip.targetY - 70);
      ctx.lineTo(W*.5, alienShip.targetY + 70);
      ctx.stroke();
      ctx.restore();
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }
  loop();
})();
