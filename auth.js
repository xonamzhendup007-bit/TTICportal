// ============================================================
// TTIC Auth Layer — auth.js  (Sign In + Sign Up)
// Place <script src="auth.js"></script> LAST before </body>
// ============================================================

// ── 1. User store (persisted to localStorage) ───────────────
const USERS = [
  { id: "staff_001", name: "Tashi Dorji",    password: "staff123",     role: "staff"     },
  { id: "staff_002", name: "Karma Wangmo",   password: "staff456",     role: "staff"     },
  { id: "prin_001",  name: "Principal Dema", password: "principal789", role: "principal" },
];

function getUsers() {
  try {
    const stored = localStorage.getItem("ttic_users");
    return stored ? JSON.parse(stored) : USERS;
  } catch { return USERS; }
}

function saveUsers(users) {
  localStorage.setItem("ttic_users", JSON.stringify(users));
}

if (!localStorage.getItem("ttic_users")) saveUsers(USERS);

// ── 2. Session helpers ──────────────────────────────────────
const Auth = {
  login(user) {
    sessionStorage.setItem("ttic_user", JSON.stringify({
      id: user.id, name: user.name, role: user.role,
    }));
  },
  logout() {
    sessionStorage.removeItem("ttic_user");
    location.reload();
  },
  current() {
    const raw = sessionStorage.getItem("ttic_user");
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
            <label for="signin-select">Your name</label>
            <select id="signin-select">
              <option value="" disabled selected>Select your name…</option>
            </select>
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
  _populateSigninSelect();
}

// ── 5. Populate sign-in dropdown ────────────────────────────
function _populateSigninSelect() {
  const sel = document.getElementById("signin-select");
  if (!sel) return;
  sel.innerHTML = '<option value="" disabled selected>Select your name…</option>';
  getUsers().forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = `${u.name}  (${u.role})`;
    sel.appendChild(opt);
  });
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
function handleLogin() {
  _clearMsg("signin-error", "signin-success");

  const selectedId = document.getElementById("signin-select").value;
  const password   = document.getElementById("signin-pw").value.trim();

  if (!selectedId) { _msg("signin-error", "error", "Please select your name."); return; }
  if (!password)   { _msg("signin-error", "error", "Please enter your password."); return; }

  const match = getUsers().find(u => u.id === selectedId && u.password === password);

  if (!match) {
    _msg("signin-error", "error", "Incorrect password. Please try again.");
    document.getElementById("signin-pw").value = "";
    return;
  }

  _msg("signin-success", "success", `Welcome back, ${match.name}! Signing you in…`);
  setTimeout(() => {
    Auth.login(match);
    document.getElementById("auth-overlay").remove();
    bootApp(match);
  }, 900);
}

// ── 10. Signup handler ───────────────────────────────────────
function handleSignup() {
  _clearMsg("signup-error", "signup-success");

  const fname = document.getElementById("signup-fname").value.trim();
  const lname = document.getElementById("signup-lname").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const role  = document.querySelector(".auth-role-pill.selected")?.dataset.role || "staff";
  const pw    = document.getElementById("signup-pw").value;
  const pw2   = document.getElementById("signup-pw2").value;

  if (!fname || !lname)              { _msg("signup-error", "error", "Please enter your first and last name."); return; }
  if (!email || !email.includes("@")){ _msg("signup-error", "error", "Please enter a valid email address."); return; }
  if (pw.length < 6)                 { _msg("signup-error", "error", "Password must be at least 6 characters."); return; }
  if (pw !== pw2)                    { _msg("signup-error", "error", "Passwords do not match."); return; }

  const fullName = `${fname} ${lname}`;
  const users = getUsers();

  if (users.find(u => u.name.toLowerCase() === fullName.toLowerCase())) {
    _msg("signup-error", "error", "An account with this name already exists."); return;
  }

  const newUser = {
    id: `user_${Date.now()}`,
    name: fullName,
    email: email,
    password: pw,
    role: role,
  };

  users.push(newUser);
  saveUsers(users);

  _msg("signup-success", "success", "Account created! Switching you to sign in…");

  ["signup-fname","signup-lname","signup-email","signup-pw","signup-pw2"]
    .forEach(id => { document.getElementById(id).value = ""; });
  document.getElementById("strength-bar").style.width = "0";
  document.getElementById("strength-label").textContent = "";

  setTimeout(() => {
    _clearMsg("signup-success");
    document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".auth-panel").forEach(p => p.classList.remove("active"));
    document.querySelector('[data-panel="signin"]').classList.add("active");
    document.getElementById("panel-signin").classList.add("active");
    _populateSigninSelect();
    document.getElementById("signin-select").value = newUser.id;
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
document.addEventListener("DOMContentLoaded", () => {
  _installShowSectionGuard();
  if (!Auth.isLoggedIn()) {
    injectLoginModal();
  } else {
    bootApp(Auth.current());
  }
});
