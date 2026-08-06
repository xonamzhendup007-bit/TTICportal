// ============================================================
// TTIC Auth Layer — auth.js  (Sign In + Sign Up)
// Place <script src="auth.js"></script> LAST before </body>
// ============================================================

// ── 1. Supabase auth helpers ─────────────────────────────────
async function getAuthHeader() {
  const { data: sessionData, error: sessionError } = await window.supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.access_token) {
    return null;
  }

  return `Bearer ${sessionData.session.access_token}`;
}

async function fetchProfile() {
  const authHeader = await getAuthHeader();
  if (!authHeader) return null;

  const response = await fetch('/api/profile', {
    headers: { Authorization: authHeader }
  });

  if (!response.ok) return null;
  const p = await response.json();
  // Normalize to `{ id, name, email, role }` for consistency in the app
  return {
    id: p.user_id || p.userId || p.id,
    name: `${p.first_name || ''}${p.last_name ? ` ${p.last_name}` : ''}`.trim() || p.name || '',
    email: p.email || '',
    role: p.role || 'staff'
  };
}

// --- Dev-mode local user store (used when Supabase is not configured) ---
const DEV_USERS_KEY = 'ttic_dev_users';
const DEFAULT_DEV_USERS = [
  { id: 'staff_001', name: 'Tashi Dorji', email: 'tashi@example.com', password: 'staff123', role: 'staff' },
  { id: 'staff_002', name: 'Karma Wangmo', email: 'karma@example.com', password: 'staff456', role: 'staff' },
  { id: 'prin_001',  name: 'Principal Dema', email: 'principal@example.com', password: 'principal789', role: 'principal' },
];

function getDevUsers() {
  try {
    const stored = localStorage.getItem(DEV_USERS_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_DEV_USERS.slice();
  } catch (e) { return DEFAULT_DEV_USERS.slice(); }
}

function saveDevUsers(users) {
  localStorage.setItem(DEV_USERS_KEY, JSON.stringify(users));
}

function isSupabaseConfigured() {
  return !!window.supabase && window.__SUPABASE_CONFIGURED__ !== false;
}

function injectAppModeBannerStyles() {
  if (document.getElementById('app-mode-banner-style')) return;
  const style = document.createElement('style');
  style.id = 'app-mode-banner-style';
  style.textContent = `
    #app-mode-banner {
      position: sticky;
      top: 0;
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: .75rem 1rem;
      font-family: 'Outfit', sans-serif;
      font-size: .88rem;
      color: #fff;
      text-align: center;
      background: #0d6efd;
      border-bottom: 1px solid rgba(255,255,255,.2);
    }
    #app-mode-banner.warning { background: #d63384; }
    #app-mode-banner.success { background: #198754; }
    #app-mode-banner small { display: block; font-size: .78rem; opacity: .85; margin-top: .15rem; }
  `;
  document.head.appendChild(style);
}

function showAppModeBanner() {
  injectAppModeBannerStyles();
  if (document.getElementById('app-mode-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'app-mode-banner';
  if (isSupabaseConfigured()) {
    banner.className = 'success';
    banner.innerHTML = '<strong>Live Supabase mode:</strong> Shared authentication and data enabled.';
  } else {
    banner.className = 'warning';
    banner.innerHTML = '<strong>Development mode:</strong> Supabase is not configured. Data is stored locally and not shared between browsers. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel env vars.';
  }
  document.body.prepend(banner);
}

const Auth = {
  login(user) {
    sessionStorage.setItem('ttic_user', JSON.stringify(user));
  },
  async logout() {
    if (window.supabase && window.supabase.auth && typeof window.supabase.auth.signOut === 'function') {
      try {
        await window.supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out failed:', e);
      }
    }
    sessionStorage.removeItem('ttic_user');
    location.reload();
  },
  current() {
    const raw = sessionStorage.getItem('ttic_user');
    return raw ? JSON.parse(raw) : null;
  },
  isLoggedIn() { return !!this.current(); },
  hasRole(role) { const u = this.current(); return u && u.role === role; },
};

// ── 3. Styles ───────────────────────────────────────────────
function injectStyles() {
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

    #auth-overlay {
      position: fixed; inset: 0; z-index: 9997;
      display: flex; align-items: center; justify-content: center;
      font-family: 'Outfit', sans-serif;
    }

    #auth-backdrop {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, #17251e 0%, #263b2f 50%, #3c5141 100%);
    }

    #auth-backdrop::before {
      content: '';
      position: absolute; inset: 0;
      background-image:
        radial-gradient(circle at 20% 20%, rgba(241,196,15,.12) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(255,255,255,.06) 0%, transparent 50%);
    }

    #auth-card {
      position: relative; z-index: 9999;
      width: min(460px, 94vw);
      background: rgba(255,255,255,0.97);
      border-radius: 0;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,20,.45), 0 4px 16px rgba(0,0,0,.12);
      animation: authSlideUp .35s cubic-bezier(.22,.68,0,1.2) both;
    }

    @keyframes authSlideUp {
      from { opacity: 0; transform: translateY(28px) scale(.97); }
      to   { opacity: 1; transform: translateY(0)    scale(1);   }
    }

    #auth-top-bar {
      background: #17251e;
      padding: 1.6rem 2rem 1.4rem;
      text-align: center;
      position: relative;
    }

    #auth-top-bar::after {
      content: '';
      position: absolute; bottom: -1px; left: 0; right: 0; height: 4px;
      background: #bf9b53;
    }

    #auth-logo {
      width: 56px; height: 56px; border-radius: 50%;
      background: rgba(255,255,255,.15);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto .75rem;
      border: 2px solid rgba(255,255,255,.3);
      font-size: 1.6rem;
    }

    #auth-logo img { width: 36px; height: 36px; object-fit: contain; }

    #auth-portal-title {
      font-size: 1.2rem; font-weight: 700; color: #fff; margin: 0 0 .2rem;
    }

    #auth-portal-sub {
      font-size: .78rem; color: rgba(255,255,255,.65); margin: 0;
    }

    #auth-tabs {
      display: flex; border-bottom: 1px solid #e9ecef; background: #f8f9fa;
    }

    .auth-tab {
      flex: 1; padding: .85rem; text-align: center;
      font-size: .88rem; font-weight: 600; color: #6c757d;
      cursor: pointer; border: none; background: none;
      border-bottom: 3px solid transparent;
      transition: color .2s, border-color .2s, background .2s;
      letter-spacing: .02em; font-family: 'Outfit', sans-serif;
    }

    .auth-tab.active {
      color: #004a99; border-bottom-color: #004a99; background: #fff;
    }

    .auth-tab:hover:not(.active) { color: #004a99; background: #f0f4ff; }

    #auth-body { padding: 1.5rem 2rem 1.75rem; background: #fff; }

    .auth-panel { display: none; }
    .auth-panel.active {
      display: block;
      animation: authFadeIn .22s ease both;
    }

    @keyframes authFadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .auth-msg {
      border-radius: 8px; padding: .6rem .85rem;
      font-size: .83rem; margin-bottom: .85rem; display: none;
      font-weight: 500;
    }
    .auth-msg.error   { background: #fff0f0; color: #c0392b; border-left: 3px solid #e74c3c; display: block; }
    .auth-msg.success { background: #edfaf3; color: #1a7a45; border-left: 3px solid #27ae60; display: block; }

    .auth-field { margin-bottom: 1rem; }

    .auth-field label {
      display: block; font-size: .74rem; font-weight: 700;
      color: #6c757d; margin-bottom: .4rem; letter-spacing: .06em;
      text-transform: uppercase;
    }

    .auth-field input,
    .auth-field select {
      width: 100%; padding: .62rem .9rem;
      border: 1.5px solid #dee2e6; border-radius: 8px;
      font-size: .9rem; color: #212529; background: #fff;
      box-sizing: border-box; outline: none;
      transition: border-color .2s, box-shadow .2s;
      font-family: 'Outfit', sans-serif;
    }

    .auth-field input:focus,
    .auth-field select:focus {
      border-color: #bf9b53;
      box-shadow: 0 0 0 3px rgba(191,155,83,.16);
    }

    .auth-pw-wrap { position: relative; }
    .auth-pw-wrap input { padding-right: 2.6rem; }

    .auth-pw-toggle {
      position: absolute; right: .7rem; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: #adb5bd; font-size: .9rem; padding: 0; line-height: 1;
      transition: color .2s;
    }
    .auth-pw-toggle:hover { color: #004a99; }

    .auth-row { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }

    .auth-strength {
      height: 4px; border-radius: 2px; background: #e9ecef; margin-top: .4rem;
    }
    .auth-strength-bar {
      height: 100%; border-radius: 2px; width: 0;
      transition: width .3s ease, background .3s ease;
    }
    .auth-strength-label { font-size: .72rem; margin-top: .25rem; font-weight: 600; }

    .auth-role-pills { display: flex; gap: .5rem; margin-top: .35rem; }

    .auth-role-pill {
      flex: 1; padding: .55rem .5rem; border-radius: 8px; cursor: pointer;
      border: 1.5px solid #dee2e6; background: #fff;
      text-align: center; font-size: .84rem; font-weight: 600; color: #6c757d;
      transition: all .18s; font-family: 'Outfit', sans-serif;
    }
    .auth-role-pill:hover { border-color: #bf9b53; color: #17251e; background: #f7f1e3; }
    .auth-role-pill.selected {
      border-color: #bf9b53; background: #f7f1e3; color: #17251e;
      box-shadow: 0 0 0 3px rgba(191,155,83,.14);
    }

    .auth-btn {
      width: 100%; padding: .75rem;
      background: #17251e;
      color: #fff; border: 1px solid #bf9b53; border-radius: 0;
      font-size: .95rem; font-weight: 700; cursor: pointer;
      font-family: 'Outfit', sans-serif; letter-spacing: .02em;
      transition: opacity .2s, transform .1s, box-shadow .2s;
      margin-top: .35rem;
      box-shadow: 0 4px 14px rgba(23,37,30,.22);
    }
    .auth-btn:hover  { opacity: 1; background: #bf9b53; color: #17251e; box-shadow: 0 6px 18px rgba(23,37,30,.28); }
    .auth-btn:active { transform: scale(.99); }

    #auth-footer {
      text-align: center; padding: .8rem 2rem 1rem;
      border-top: 1px solid #f1f3f5;
      font-size: .72rem; color: #adb5bd; background: #fff;
      letter-spacing: .02em;
    }
  `;
  document.head.appendChild(style);
}

// ── 4. Render modal ─────────────────────────────────────────
function injectLoginModal() {
  injectStyles();

  const overlay = document.createElement("div");
  overlay.id = "auth-overlay";
  overlay.innerHTML = `
    <div id="auth-backdrop"></div>
    <div id="auth-card" role="dialog" aria-modal="true" aria-labelledby="auth-portal-title">

      <div id="auth-top-bar">
        <div id="auth-logo">
          <img src="images/ttic-logo.png" alt="TTIC" onerror="this.parentElement.innerHTML='🏫'">
        </div>
        <p id="auth-portal-title">TTIC Staff Portal</p>
        <p id="auth-portal-sub">Technical Training Institute — Chumey</p>
      </div>

      <div id="auth-tabs">
        <button class="auth-tab active" data-panel="signin">Sign In</button>
        <button class="auth-tab"        data-panel="signup">Create Account</button>
      </div>

      <div id="auth-body">

        <!-- Sign In Panel -->
        <div class="auth-panel active" id="panel-signin">
          <div id="signin-error"   class="auth-msg" style="display:none;"></div>
          <div id="signin-success" class="auth-msg" style="display:none;"></div>

          <div class="auth-field">
            <label for="signin-email">Email address</label>
            <input type="email" id="signin-email" placeholder="you@ttic.edu.bt" autocomplete="username">
          </div>

          <div class="auth-field">
            <label for="signin-pw">Password</label>
            <div class="auth-pw-wrap">
              <input type="password" id="signin-pw" placeholder="Enter your password" autocomplete="current-password">
              <button type="button" class="auth-pw-toggle" data-target="signin-pw">👁</button>
            </div>
          </div>

          <button class="auth-btn" id="signin-btn">Sign In</button>
        </div>

        <!-- Sign Up Panel -->
        <div class="auth-panel" id="panel-signup">
          <div id="signup-error"   class="auth-msg" style="display:none;"></div>
          <div id="signup-success" class="auth-msg" style="display:none;"></div>

          <div class="auth-row">
            <div class="auth-field">
              <label for="signup-fname">First name</label>
              <input type="text" id="signup-fname" placeholder="e.g. Tenzin" autocomplete="off">
            </div>
            <div class="auth-field">
              <label for="signup-lname">Last name</label>
              <input type="text" id="signup-lname" placeholder="e.g. Wangchuk" autocomplete="off">
            </div>
          </div>

          <div class="auth-field">
            <label for="signup-email">Email address</label>
            <input type="email" id="signup-email" placeholder="you@ttic.edu.bt" autocomplete="off">
          </div>

          <div class="auth-field">
            <label>Role</label>
            <div class="auth-role-pills">
              <button type="button" class="auth-role-pill selected" data-role="staff">Staff</button>
              <button type="button" class="auth-role-pill"          data-role="principal">Principal</button>
            </div>
          </div>

          <div class="auth-field">
            <label for="signup-pw">Password</label>
            <div class="auth-pw-wrap">
              <input type="password" id="signup-pw" placeholder="Create a password" autocomplete="new-password">
              <button type="button" class="auth-pw-toggle" data-target="signup-pw">👁</button>
            </div>
            <div class="auth-strength"><div class="auth-strength-bar" id="strength-bar"></div></div>
            <div class="auth-strength-label" id="strength-label"></div>
          </div>

          <div class="auth-field">
            <label for="signup-pw2">Confirm password</label>
            <div class="auth-pw-wrap">
              <input type="password" id="signup-pw2" placeholder="Repeat your password" autocomplete="new-password">
              <button type="button" class="auth-pw-toggle" data-target="signup-pw2">👁</button>
            </div>
          </div>

          <button class="auth-btn" id="signup-btn">Create Account</button>
        </div>

      </div>

      <div id="auth-footer">
        &copy; 2026 TTIC &nbsp;&middot;&nbsp; Quality &nbsp;&middot;&nbsp; Integrity &nbsp;&middot;&nbsp; Dignity of Labour
      </div>

    </div>
  `;
  document.body.appendChild(overlay);
  _bindModalEvents();
}

// ── 5. No local sign-in dropdown needed when using Supabase auth.
function _populateSigninSelect() {
  // noop
}

// ── 6. Bind modal events ─────────────────────────────────────
function _bindModalEvents() {
  // Tabs
  document.querySelectorAll(".auth-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".auth-panel").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById("panel-" + tab.dataset.panel).classList.add("active");
    });
  });

  // Show/hide password toggles
  document.querySelectorAll(".auth-pw-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const inp = document.getElementById(btn.dataset.target);
      inp.type = inp.type === "password" ? "text" : "password";
    });
  });

  // Role pills
  document.querySelectorAll(".auth-role-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      document.querySelectorAll(".auth-role-pill").forEach(p => p.classList.remove("selected"));
      pill.classList.add("selected");
    });
  });

  // Password strength
  document.getElementById("signup-pw").addEventListener("input", e => {
    _updateStrength(e.target.value);
  });

  // Sign in
  document.getElementById("signin-btn").addEventListener("click", handleLogin);
  document.getElementById("signin-pw").addEventListener("keydown", e => {
    if (e.key === "Enter") handleLogin();
  });

  // Sign up
  document.getElementById("signup-btn").addEventListener("click", handleSignup);
  document.getElementById("signup-pw2").addEventListener("keydown", e => {
    if (e.key === "Enter") handleSignup();
  });
}

// ── 7. Password strength meter ───────────────────────────────
function _updateStrength(pw) {
  let score = 0;
  if (pw.length >= 8)          score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  const levels = [
    { w: "0%",   bg: "#e9ecef", txt: ""          },
    { w: "25%",  bg: "#e74c3c", txt: "Weak"       },
    { w: "50%",  bg: "#e67e22", txt: "Fair"       },
    { w: "75%",  bg: "#f1c40f", txt: "Good"       },
    { w: "100%", bg: "#27ae60", txt: "Strong ✓"  },
  ];
  const lvl = levels[pw.length ? Math.max(score, 1) : 0];
  const bar = document.getElementById("strength-bar");
  const lbl = document.getElementById("strength-label");
  bar.style.width      = lvl.w;
  bar.style.background = lvl.bg;
  lbl.textContent      = lvl.txt;
  lbl.style.color      = lvl.bg;
}

// ── 8. Message helpers ───────────────────────────────────────
function _msg(id, type, text) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `auth-msg ${type}`;
  el.textContent = text;
  el.style.display = "block";
}
function _clearMsg(...ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.className = "auth-msg"; el.textContent = ""; el.style.display = "none"; }
  });
}

// ── 9. Login handler ─────────────────────────────────────────
async function handleLogin() {
  _clearMsg('signin-error', 'signin-success');

  const email = document.getElementById('signin-email').value.trim().toLowerCase();
  const password = document.getElementById('signin-pw').value.trim();

  if (!email) { _msg('signin-error', 'error', 'Please enter your email address.'); return; }
  if (!password) { _msg('signin-error', 'error', 'Please enter your password.'); return; }

  if (!window.supabase || window.__SUPABASE_CONFIGURED__ === false) {
    // Use local dev store for authentication when Supabase is not available.
    return handleLoginFallback();
  }

  let signInResult;
  try {
    signInResult = await window.supabase.auth.signInWithPassword({ email, password });
  } catch (e) {
    const msg = (e && e.message) ? e.message : 'Network error while contacting authentication server.';
    _msg('signin-error', 'error', msg);
    return;
  }

  const { data, error } = signInResult;
  if (error) {
    _msg('signin-error', 'error', error.message || 'Unable to sign in.');
    return;
  }
  const profileRaw = await fetchProfile();
  if (!profileRaw) {
    _msg('signin-error', 'error', 'Unable to load staff profile after sign in.');
    return;
  }

  const profile = {
    id: profileRaw.id,
    name: profileRaw.name,
    email: profileRaw.email,
    role: profileRaw.role
  };

  _msg('signin-success', 'success', `Welcome back, ${profile.name}! Signing you in…`);
  setTimeout(() => {
    Auth.login(profile);
    document.getElementById('auth-overlay').remove();
    bootApp(profile);
  }, 900);
}

// Dev-mode login fallback when Supabase is not configured
async function handleLoginFallback() {
  _clearMsg('signin-error', 'signin-success');

  const email = document.getElementById('signin-email').value.trim().toLowerCase();
  const password = document.getElementById('signin-pw').value.trim();

  if (!email) { _msg('signin-error', 'error', 'Please enter your email address.'); return; }
  if (!password) { _msg('signin-error', 'error', 'Please enter your password.'); return; }

  const user = getDevUsers().find(u => u.email.toLowerCase() === email && u.password === password);
  if (!user) {
    _msg('signin-error', 'error', 'Incorrect email or password.');
    return;
  }

  const profile = { id: user.id, name: user.name, email: user.email, role: user.role };
  _msg('signin-success', 'success', `Welcome back, ${profile.name}! Signing you in…`);
  setTimeout(() => {
    Auth.login(profile);
    document.getElementById('auth-overlay').remove();
    bootApp(profile);
  }, 700);
}

// ── 10. Signup handler ───────────────────────────────────────
async function handleSignup() {
  _clearMsg('signup-error', 'signup-success');

  const fname = document.getElementById('signup-fname').value.trim();
  const lname = document.getElementById('signup-lname').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const role = document.querySelector('.auth-role-pill.selected')?.dataset.role || 'staff';
  const pw = document.getElementById('signup-pw').value;
  const pw2 = document.getElementById('signup-pw2').value;

  if (!fname || !lname) { _msg('signup-error', 'error', 'Please enter your first and last name.'); return; }
  if (!email) { _msg('signup-error', 'error', 'Please enter your email address.'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    _msg('signup-error', 'error', 'Please enter a valid email address.'); return;
  }
  if (pw.length < 6) { _msg('signup-error', 'error', 'Password must be at least 6 characters.'); return; }
  if (pw !== pw2) { _msg('signup-error', 'error', 'Passwords do not match.'); return; }

  const fullName = `${fname} ${lname}`;

  // If Supabase is not configured, use a local dev user store for testing.
  if (!window.supabase || window.__SUPABASE_CONFIGURED__ === false) {
    // Ensure email uniqueness in dev store
    const existing = getDevUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) { _msg('signup-error', 'error', 'An account with this email already exists.'); return; }

    const newUser = {
      id: `dev_${Date.now()}`,
      name: fullName,
      email: email,
      password: pw,
      role: role
    };
    const users = getDevUsers();
    users.push(newUser);
    saveDevUsers(users);

    _msg('signup-success', 'success', 'Local dev account created! Switch to Sign In to continue.');
    ['signup-fname','signup-lname','signup-email','signup-pw','signup-pw2']
      .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('strength-bar').style.width = '0';
    document.getElementById('strength-label').textContent = '';

    setTimeout(() => {
      _clearMsg('signup-success');
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
      document.querySelector('[data-panel="signin"]').classList.add('active');
      document.getElementById('panel-signin').classList.add('active');
    }, 900);

    return;
  }

  const { data: signUpData, error: signUpError } = await window.supabase.auth.signUp({ email, password: pw });
  if (signUpError) {
    _msg('signup-error', 'error', signUpError.message || 'Unable to create authentication account.');
    return;
  }

  let user = signUpData?.user;
  if (!user) {
    _msg('signup-error', 'error', 'Unable to create user account.');
    return;
  }

  if (!signUpData.session) {
    const { data: signInData, error: signInError } = await window.supabase.auth.signInWithPassword({ email, password: pw });
    if (signInError) {
      _msg('signup-error', 'error', signInError.message || 'Unable to sign in after account creation.');
      return;
    }
    user = signInData?.user || user;
  }

  const session = await window.supabase.auth.getSession();
  const token = session?.data?.session?.access_token;
  if (!token) {
    _msg('signup-error', 'error', 'Unable to obtain session token after signup.');
    return;
  }

  const registerResponse = await fetch('/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ first_name: fname, last_name: lname, email, role })
  });

  if (!registerResponse.ok) {
    const errorBody = await registerResponse.json().catch(() => null);
    _msg('signup-error', 'error', errorBody?.error || 'Unable to save staff profile.');
    return;
  }

  _msg('signup-success', 'success', 'Account created! You can now sign in with your new email and password.');
  ['signup-fname','signup-lname','signup-email','signup-pw','signup-pw2']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('strength-bar').style.width = '0';
  document.getElementById('strength-label').textContent = '';

  setTimeout(() => {
    _clearMsg('signup-success');
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-panel="signin"]').classList.add('active');
    document.getElementById('panel-signin').classList.add('active');
  }, 1300);
}

// ── 11. Boot app after login ──────────────────────────────────
function bootApp(user) {
  const navbar = document.querySelector(".navbar .container");
  if (navbar) {
    const userBar = document.createElement("div");
    userBar.id = "auth-userbar";
    userBar.innerHTML = `
      <span style="font-size:.85rem;color:rgba(255,255,255,.85);margin-right:.75rem;font-family:'Outfit',sans-serif;">
        ${user.name}
        <span style="background:rgba(241,196,15,.22);border:1px solid rgba(241,196,15,.45);border-radius:4px;padding:2px 9px;font-size:.72rem;margin-left:6px;color:#f1c40f;letter-spacing:.03em;">${user.role}</span>
      </span>
      <button onclick="Auth.logout()" class="btn btn-outline-light btn-sm" style="font-size:.8rem;font-family:'Outfit',sans-serif;">Sign out</button>
    `;
    navbar.appendChild(userBar);
  }

  const switchContainer =
    document.getElementById("roleSwitchContainer");

if (user.role === "staff") {

    // Hide switch view completely
    if (switchContainer) {
        switchContainer.classList.add("hidden");
    }

    _switchSection("staff-view");

} else if (user.role === "principal") {

    // Show switch view only to principal
    if (switchContainer) {
        switchContainer.classList.remove("hidden");
    }

    _switchSection("principal-view");
}

  if (typeof window.renderLeaveBalance === "function") {
    window.renderLeaveBalance();
  }
  if (typeof window.renderLeaveBalanceOverview === "function") {
    window.renderLeaveBalanceOverview();
  }
}

// ── 12. Section switcher ──────────────────────────────────────
function _switchSection(sectionId) {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  const target = document.getElementById(sectionId);
  if (target) target.classList.remove("hidden");
}

function _installShowSectionGuard() {
  const _original = typeof window.showSection === "function"
    ? window.showSection : _switchSection;

  window.showSection = function(sectionId) {
    const user = Auth.current();
    if (!user) return;
    if (sectionId === "principal-view" && user.role !== "principal") {
      alert("Access denied. Only principals can access this view.");
      return;
    }
    _original(sectionId);
  };
}

// ── 13. Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  _installShowSectionGuard();
  showAppModeBanner();

  // If Supabase isn't configured or failed to initialize, show the modal so
  // users still see the login UI (errors will explain backend misconfiguration).
  if (!window.supabase || window.__SUPABASE_CONFIGURED__ === false) {
    injectLoginModal();
    return;
  }

  let session;
  try {
    session = await window.supabase.auth.getSession();
  } catch (e) {
    console.warn('Unable to read Supabase session:', e);
    injectLoginModal();
    return;
  }

  if (!session?.data?.session) {
    injectLoginModal();
    return;
  }

  let profile = Auth.current();
  if (!profile) {
    profile = await fetchProfile();
    if (!profile) {
      try { await window.supabase.auth.signOut(); } catch {}
      injectLoginModal();
      return;
    }
    Auth.login(profile);
  }

  bootApp(profile);
});
