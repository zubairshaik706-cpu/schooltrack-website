/* =============================================
   SCHOOLTRACK APP — Full working SPA
   Data stored in localStorage
   ============================================= */

// ===== DATA LAYER =====
const DB = {
  get(key) { try { return JSON.parse(localStorage.getItem('st_' + key)) || null; } catch { return null; } },
  set(key, val) { localStorage.setItem('st_' + key, JSON.stringify(val)); },
  getList(key) { return DB.get(key) || []; },
  push(key, item) { const list = DB.getList(key); item.id = item.id || Date.now() + Math.random(); list.push(item); DB.set(key, list); return item; },
  update(key, id, updates) { const list = DB.getList(key); const i = list.findIndex(x => x.id == id); if (i >= 0) { list[i] = { ...list[i], ...updates }; DB.set(key, list); } },
  remove(key, id) { DB.set(key, DB.getList(key).filter(x => x.id != id)); },
  find(key, id) { return DB.getList(key).find(x => x.id == id); }
};

// ===== AUTH =====
function getUser() {
  const activeSession = localStorage.getItem('st_active_session');
  const admin = DB.get('user');
  const staff = DB.get('staff_session');
  if (activeSession === 'staff' && staff) {
    // fall through to staff branch below
  } else if (admin) {
    return admin;
  }
  if (!staff) return null;
  const nameParts = (staff.name || '').trim().split(' ');
  return {
    ...staff,
    firstName: nameParts[0] || 'Staff',
    lastName: nameParts.slice(1).join(' ') || '',
    schoolName: (DB.get('user') || {}).schoolName || 'My School',
    isStaff: true
  };
}
function requireAuth() {
  const user = getUser();
  if (!user) { window.location.href = 'login.html'; return null; }
  return user;
}
function logout() {
  localStorage.removeItem('st_user');
  localStorage.removeItem('st_staff_session');
  localStorage.removeItem('st_active_session');
  window.location.href = 'login.html';
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const user = requireAuth();
  if (!user) return;

  // One-time migration: wipe any data from older versions (seed data, test data, etc.)
  if (!DB.get('clean_v1')) {
    ['students','classes','grades','attendance','hifz','messages','seeded'].forEach(k => localStorage.removeItem('st_' + k));
    DB.set('clean_v1', true);
  }

  // Set user info
  document.getElementById('userName').textContent = user.firstName + ' ' + user.lastName;
  document.getElementById('userAvatar').textContent = (user.firstName[0] || 'A').toUpperCase();
  const schoolName = user.schoolName || 'My School';
  document.getElementById('schoolName').textContent = schoolName;
  document.getElementById('schoolBadgeIcon').textContent = (schoolName[0] || 'S').toUpperCase();
  document.getElementById('sidebarUserName').textContent = (user.firstName || 'Admin') + ' · ' + (user.isStaff ? (user.role || 'Staff') : 'ADMIN');

  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  document.getElementById('menuToggle').addEventListener('click', () => sidebar.classList.toggle('open'));
  document.getElementById('sidebarClose').addEventListener('click', () => sidebar.classList.remove('open'));
  document.getElementById('sidebarCollapseBtn').addEventListener('click', () => sidebar.classList.remove('open'));

  // Dark mode toggle
  document.getElementById('darkModeToggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    toast(document.body.classList.contains('dark-mode') ? 'Dark mode on' : 'Dark mode off', '');
  });

  // Expandable nav groups
  document.querySelectorAll('.nav-group-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.nav-group');
      group.classList.toggle('open');
    });
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Academic year label + progress (Aug 1 – Jun 30 school year)
  (function initAcademicYear() {
    const now = new Date();
    const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1; // school year starts August
    const start = new Date(y, 7, 1);
    const end = new Date(y + 1, 6, 31);
    document.getElementById('academicYearLabel').textContent = `${y}-${y + 1}`;
    const totalDays = (end - start) / 86400000;
    const elapsed = Math.min(Math.max((now - start) / 86400000, 0), totalDays);
    const pct = Math.round((elapsed / totalDays) * 100);
    const weeksLeft = Math.max(Math.ceil((end - now) / (7 * 86400000)), 0);
    document.getElementById('yearProgressFill').style.width = pct + '%';
    document.getElementById('yearProgressLabel').textContent = now > end || now < start ? 'Out of session' : `${weeksLeft} weeks left`;
  })();

  // Global search — Enter jumps to Students page filtered by query
  document.getElementById('globalSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      navigate('students');
      setTimeout(() => renderStudentList('active', q), 0);
    }
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

  // Nav routing — both top-level items and sub-items
  document.querySelectorAll('.nav-item[data-page], .nav-sub-item[data-page]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigate(item.dataset.page);
      // Auto-open parent group when sub-item clicked
      const group = item.closest('.nav-group');
      if (group) group.classList.add('open');
      if (window.innerWidth <= 900) sidebar.classList.remove('open');
    });
  });

  // Load initial page
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigate(hash);
});

function navigate(page) {
  // Mark active on both top-level nav items and sub-items
  document.querySelectorAll('.nav-item[data-page], .nav-sub-item[data-page]').forEach(i => {
    i.classList.toggle('active', i.dataset.page === page);
  });
  // Also auto-open the group containing the active sub-item
  document.querySelectorAll('.nav-sub-item[data-page]').forEach(i => {
    if (i.dataset.page === page) {
      const grp = i.closest('.nav-group');
      if (grp) grp.classList.add('open');
    }
  });
  window.location.hash = page;

  const titles = {
    dashboard: 'Dashboard', students: 'Students', enrollment: 'Enrollment Applications',
    classes: 'All Classes', attendance: 'Attendance', gradebook: 'All Gradebooks',
    hifz: 'Hifz Tracking', messages: 'Communications', settings: 'Settings',
    salah: 'Salah Tracker', tuition: 'Tuition', calendar: 'Calendar',
    quizzes: 'Quizzes', staff: 'Teachers', admins: 'Admins', parents: 'Parents',
    infractions: 'Behavior Tracking', billing: 'Billing', 'report-builder': 'Report Builder'
  };
  const pageLabel = titles[page] || page;
  document.getElementById('pageTitle').textContent = pageLabel;
  document.title = pageLabel + ' – SchoolTrack';
  document.getElementById('topbarActions').innerHTML = '';

  const pages = {
    dashboard, students, enrollment, classes, attendance, gradebook, hifz,
    messages, settings, salah, tuition, calendar, quizzes, staff,
    admins, parents, infractions, billing, 'report-builder': reportBuilder
  };
  if (pages[page]) pages[page]();
  else document.getElementById('mainContent').innerHTML = `<div class="empty-state"><div class="empty-state-icon">🚧</div><h3>Coming soon</h3><p>This page is under construction.</p></div>`;
}

// ===== TOAST =====
function toast(msg, type = '') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.className = 'toast' + (type ? ' toast-' + type : '');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== MODAL =====
function openModal(title, bodyHTML) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); }

// ===== HELPERS =====
const avatarColors = ['#4f46e5','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899'];
function avatarColor(name) { let h = 0; for (const c of name) h += c.charCodeAt(0); return avatarColors[h % avatarColors.length]; }
function initials(first, last) { return ((first[0] || '') + (last[0] || '')).toUpperCase(); }
function formatDate(d) { if (!d) return '—'; const dt = new Date(d.includes('T') ? d : d + 'T00:00:00'); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function today() { return new Date().toISOString().split('T')[0]; }
function timeAgo(idTimestamp) {
  const ms = Date.now() - Number(idTimestamp);
  if (!isFinite(ms) || ms < 0) return 'just now';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

// =============================================
// PAGE: DASHBOARD
// =============================================
function dashboard() {
  const students = DB.getList('students');
  const classes = DB.getList('classes');
  const grades = DB.getList('grades');
  const staffList = DB.getList('staff');
  const messages = DB.getList('messages');
  const parents = DB.getList('parents');
  const user = getUser();
  const active = students.filter(s => s.status === 'active').length;

  // Recent activity — newest students/staff first
  const activityItems = [
    ...students.slice(-5).map(s => ({ name: `${s.firstName} ${s.lastName}`, action: 'joined', initials: initials(s.firstName, s.lastName), color: avatarColor(s.firstName + s.lastName), time: s.id ? timeAgo(s.id) : '', sortId: s.id || 0 })),
    ...staffList.slice(-3).map(s => { const np = (s.name || '').trim().split(' '); return { name: s.name, action: 'added as staff', initials: initials(np[0] || '', np[1] || ''), color: avatarColor(s.name || 'Staff'), time: s.id ? timeAgo(s.id) : '', sortId: s.id || 0 }; })
  ].sort((a, b) => b.sortId - a.sortId).slice(0, 5);

  const recentAnnouncements = messages.filter(m => m.recipientType === 'announcement' || m.recipientType === 'parents').slice(-3).reverse();

  document.getElementById('mainContent').innerHTML = `
    <div class="profile-card">
      <div class="profile-card-left">
        <div class="profile-avatar">${(user.firstName?.[0] || 'A').toUpperCase()}</div>
        <div>
          <div class="profile-name">${(user.firstName || '').toUpperCase()} ${(user.lastName || '').toUpperCase()}</div>
          <div class="profile-role">${user.isStaff ? (user.role || 'Staff') : 'Administrator'} at ${user.schoolName || 'My School'}</div>
          <div class="profile-meta">
            <span>✉️ ${user.email || '—'}</span>
            <span>📞 ${user.phone || '—'}</span>
            <span>🏫 ${user.schoolName || 'My School'}</span>
          </div>
        </div>
      </div>
      <div class="profile-card-actions">
        <button class="btn btn-secondary" onclick="navigate('settings')">✎ Edit Profile</button>
        <button class="btn btn-primary" onclick="navigate('settings')">⚙ Settings</button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${students.length}</div><div class="stat-sub">Students</div></div>
      <div class="stat-card"><div class="stat-value">${staffList.length}</div><div class="stat-sub">Teachers</div></div>
      <div class="stat-card"><div class="stat-value">${classes.length}</div><div class="stat-sub">Classes</div></div>
      <div class="stat-card"><div class="stat-value">0</div><div class="stat-sub">Pending Invites</div></div>
    </div>

    <div class="dash-grid">
      <div>
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header"><div class="card-title">⚡ Quick Actions</div></div>
          <div class="quick-actions-grid">
            <button class="quick-action-btn" onclick="navigate('enrollment')">
              <div class="quick-action-icon" style="background:var(--blue-bg);color:#1e40af;">👤</div>
              <div class="quick-action-label">Add Student</div>
            </button>
            <button class="quick-action-btn" onclick="navigate('staff')">
              <div class="quick-action-icon" style="background:var(--green-bg);color:#065f46;">🧑</div>
              <div class="quick-action-label">Add Teacher</div>
            </button>
            <button class="quick-action-btn" onclick="navigate('classes')">
              <div class="quick-action-icon" style="background:var(--blue-bg);color:#1e40af;">🖥️</div>
              <div class="quick-action-label">Create Class</div>
            </button>
            <button class="quick-action-btn" onclick="navigate('messages')">
              <div class="quick-action-icon" style="background:var(--yellow-bg);color:#92400e;">✈️</div>
              <div class="quick-action-label">Send Email</div>
            </button>
            <button class="quick-action-btn" onclick="toast('SMS messaging is coming soon.', '')">
              <div class="quick-action-icon" style="background:var(--green-bg);color:#065f46;">💬</div>
              <div class="quick-action-label">Send SMS</div>
            </button>
            <button class="quick-action-btn" onclick="toast('AI Student Import is coming soon.', '')">
              <div class="quick-action-icon" style="background:var(--blue-bg);color:#1e40af;">✎</div>
              <div class="quick-action-label">AI Student Import</div>
            </button>
            <button class="quick-action-btn" onclick="toast('Calendar import is coming soon.', '')">
              <div class="quick-action-icon" style="background:var(--red-bg);color:#991b1b;">🗂️</div>
              <div class="quick-action-label">Import Calendar</div>
            </button>
            <button class="quick-action-btn" onclick="navigate('calendar')">
              <div class="quick-action-icon" style="background:var(--green-bg);color:#065f46;">📅</div>
              <div class="quick-action-label">Create Event</div>
            </button>
            <button class="quick-action-btn" onclick="navigate('messages')">
              <div class="quick-action-icon" style="background:var(--green-bg);color:#065f46;">📣</div>
              <div class="quick-action-label">Announcement</div>
            </button>
            <button class="quick-action-btn" onclick="toast('Academic Years management is coming soon.', '')">
              <div class="quick-action-icon" style="background:var(--green-bg);color:#065f46;">🗓️</div>
              <div class="quick-action-label">Academic Years</div>
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title">📣 Recent Announcements</div><button class="btn btn-secondary btn-sm" onclick="navigate('messages')">New +</button></div>
          ${recentAnnouncements.length === 0 ? `
            <div class="schedule-empty"><div class="si">📣</div><div class="st">No announcements yet</div><div class="ss">Messages sent to parents will appear here.</div></div>
          ` : recentAnnouncements.map(m => `
            <div class="activity-item">
              <span style="font-size:16px;flex-shrink:0;">📨</span>
              <div>
                <div class="activity-text"><strong>${m.subject}</strong> — ${m.to}</div>
                <div class="activity-time">${formatDate(m.date)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="dash-side-grid">
        <div class="card">
          <div class="card-header"><div class="card-title"><svg class="card-title-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg> Today's Schedule</div><a href="#" onclick="event.preventDefault();navigate('calendar')" style="font-size:12px;color:var(--primary);font-weight:600;">View Full ›</a></div>
          ${classes.length === 0 ? `
            <div class="schedule-empty">
              <svg class="si-cube" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>
              <div class="st">No classes today</div><div class="ss">Enjoy your free day!</div>
            </div>
          ` : classes.map(c => `
            <div class="schedule-item">
              <div class="schedule-dot"></div>
              <div><div class="schedule-text">${c.name}</div><div class="schedule-sub">${c.teacher || 'Unassigned'}</div></div>
            </div>
          `).join('')}
        </div>

        <div class="card">
          <div class="card-header"><div class="card-title"><svg class="card-title-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg> Recent Activity</div></div>
          ${activityItems.length === 0 ? `
            <div class="schedule-empty">
              <svg class="si-cube" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              <div class="st">Nothing yet</div><div class="ss">Activity will show up here.</div>
            </div>
          ` : activityItems.map(r => `
            <div class="activity-item">
              <div class="student-avatar" style="width:28px;height:28px;font-size:10.5px;background:${r.color};flex-shrink:0;">${r.initials}</div>
              <div>
                <div class="activity-text"><strong>${r.name}</strong> ${r.action}</div>
                <div class="activity-time">${r.time}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="card-header">
        <div class="card-title">🏫 Schools</div>
        <button class="btn btn-primary btn-sm" onclick="toast('School management coming soon.','')">+ Add School</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>SCHOOL</th><th>CLASSES</th><th>STUDENTS</th><th>TEACHERS</th><th>ACTIONS</th></tr></thead>
        <tbody>
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <strong>${user.schoolName || 'My School'}</strong>
                <span class="badge badge-green" style="font-size:10px;">● SELECTED</span>
              </div>
              <div style="font-size:12px;color:var(--text4);">${user.email || ''}</div>
            </td>
            <td>${classes.length}</td>
            <td>${students.length}</td>
            <td>${staffList.length}</td>
            <td><button class="btn btn-secondary btn-sm" onclick="navigate('settings')">✎ Edit</button></td>
          </tr>
        </tbody>
      </table></div>
      <div style="padding:8px 0 4px;font-size:12px;color:var(--text4);">1 school total &nbsp;<a href="#" style="color:var(--primary);font-weight:600;" onclick="event.preventDefault()">View all schools →</a></div>
    </div>

    <div class="card" style="margin-top:16px;">
      <div class="card-header">
        <div class="card-title">📅 Attendance Overview</div>
        <a href="#" onclick="event.preventDefault();navigate('attendance')" style="font-size:12px;color:var(--primary);font-weight:600;">View All →</a>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:4px 0 8px;">
        <div class="att-overview-box">
          <div class="att-overview-label">TODAY</div>
          ${(() => {
            const todayRec = DB.getList('attendance').filter(r => r.date === today());
            if (todayRec.length === 0) return `<div class="att-overview-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg><div>No attendance recorded today</div></div>`;
            const present = todayRec.filter(r => r.status === 'present').length;
            const absent = todayRec.filter(r => r.status === 'absent').length;
            return `<div style="display:flex;gap:16px;padding:8px 0;"><div><div style="font-size:22px;font-weight:700;color:#10b981;">${present}</div><div style="font-size:12px;color:var(--text4);">Present</div></div><div><div style="font-size:22px;font-weight:700;color:#ef4444;">${absent}</div><div style="font-size:12px;color:var(--text4);">Absent</div></div></div>`;
          })()}
        </div>
        <div class="att-overview-box">
          <div class="att-overview-label">THIS WEEK</div>
          ${(() => {
            const mon = mondayOf(new Date());
            const weekDates = Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(d.getDate()+i);return isoDate(d);});
            const weekRec = DB.getList('attendance').filter(r => weekDates.includes(r.date));
            if (weekRec.length === 0) return `<div class="att-overview-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><div>No attendance data this week</div></div>`;
            const present = weekRec.filter(r => r.status === 'present').length;
            const absent = weekRec.filter(r => r.status === 'absent').length;
            return `<div style="display:flex;gap:16px;padding:8px 0;"><div><div style="font-size:22px;font-weight:700;color:#10b981;">${present}</div><div style="font-size:12px;color:var(--text4);">Present</div></div><div><div style="font-size:22px;font-weight:700;color:#ef4444;">${absent}</div><div style="font-size:12px;color:var(--text4);">Absent</div></div></div>`;
          })()}
        </div>
      </div>
    </div>
  `;
}

// =============================================
// PAGE: STUDENTS
// =============================================
function students() {
  renderStudentList('active');
}

function renderStudentList(filterStatus = 'active', search = '', filterGender = '') {
  _currentStudentFilter = filterStatus;
  _currentStudentGender = filterGender;
  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openAddStudentModal()">+ Add Student</button>`;

  let list = DB.getList('students');
  if (filterStatus !== 'all') list = list.filter(s => s.status === filterStatus);
  if (filterGender) list = list.filter(s => s.gender === filterGender);
  if (search) list = list.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()));

  const classes = DB.getList('classes');
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Students</h2><p>${DB.getList('students').length} total enrolled</p></div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:0;">
      <div class="tabs" style="margin-bottom:0;border-bottom:none;">
        <button class="tab-btn ${filterStatus==='active'?'active':''}" onclick="renderStudentList('active','','${filterGender}')">Active</button>
        <button class="tab-btn ${filterStatus==='inactive'?'active':''}" onclick="renderStudentList('inactive','','${filterGender}')">Inactive</button>
        <button class="tab-btn ${filterStatus==='all'?'active':''}" onclick="renderStudentList('all','','${filterGender}')">All</button>
      </div>
      <div class="gender-filter-btns">
        <button class="gender-btn ${!filterGender?'active':''}" onclick="renderStudentList('${filterStatus}','','')">All Genders</button>
        <button class="gender-btn ${filterGender==='Male'?'active':''}" onclick="renderStudentList('${filterStatus}','','Male')">Male</button>
        <button class="gender-btn ${filterGender==='Female'?'active':''}" onclick="renderStudentList('${filterStatus}','','Female')">Female</button>
      </div>
    </div>
    <div style="border-bottom:1px solid var(--border);margin-bottom:20px;"></div>

    <div class="search-bar">
      <div class="search-input-wrap">
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        <input class="form-input search-input" type="text" placeholder="Search students…" oninput="renderStudentList('${filterStatus}', this.value, '${filterGender}')" value="${search}" />
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        ${list.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">👥</div>
            <h3>No students found</h3>
            <p>${search ? 'Try a different search.' : 'Add your first student to get started.'}</p>
            <button class="btn btn-primary" onclick="openAddStudentModal()">+ Add Student</button>
          </div>` : `
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(s => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="student-avatar" style="background:${avatarColor(s.firstName+s.lastName)}">${initials(s.firstName,s.lastName)}</div>
                      <div>
                        <div style="font-weight:600;">${s.firstName} ${s.lastName}</div>
                        <div style="font-size:12px;color:var(--text3);">${s.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td>${classMap[s.classId] || '—'}</td>
                  <td>${s.gender || '—'}</td>
                  <td>${formatDate(s.dob)}</td>
                  <td><span class="badge ${s.status==='active'?'badge-green':'badge-gray'}">${s.status}</span></td>
                  <td>
                    <div style="display:flex;gap:6px;">
                      <button class="btn btn-secondary btn-sm" onclick="viewStudent('${s.id}')">View</button>
                      <button class="btn btn-danger btn-sm" onclick="removeStudent('${s.id}')">Remove</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}
      </div>
    </div>
  `;
}

function openAddStudentModal() {
  const classes = DB.getList('classes');
  openModal('Add Student', `
    <form onsubmit="submitAddStudent(event)" class="form-grid">
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">First Name <span class="required">*</span></label>
          <input class="form-input" name="firstName" required placeholder="Sara" />
        </div>
        <div class="form-group">
          <label class="form-label">Last Name <span class="required">*</span></label>
          <input class="form-input" name="lastName" required placeholder="Malik" />
        </div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="form-select" name="gender">
            <option value="">Select…</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input class="form-input" name="dob" type="date" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Class <span class="required">*</span></label>
        <select class="form-select" name="classId" required>
          <option value="">Select class…</option>
          ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Parent / Guardian Email</label>
        <input class="form-input" name="email" type="email" placeholder="parent@example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Parent Phone</label>
        <input class="form-input" name="phone" type="tel" placeholder="555-0100" />
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" name="notes" placeholder="Any additional notes…"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Student</button>
      </div>
    </form>
  `);
}

function submitAddStudent(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const student = { firstName: fd.get('firstName'), lastName: fd.get('lastName'), gender: fd.get('gender'), dob: fd.get('dob'), classId: fd.get('classId'), email: fd.get('email'), phone: fd.get('phone'), notes: fd.get('notes'), status: 'active', juz: 0 };
  DB.push('students', student);
  closeModal();
  toast('Student added successfully!', 'success');
  renderStudentList('active');
}

function viewStudent(id) {
  const s = DB.find('students', id);
  if (!s) return;
  const classList = DB.getList('classes');
  const cls = classList.find(c => c.id === s.classId);
  const grades = DB.getList('grades').filter(g => g.studentId == id);
  openModal(`${s.firstName} ${s.lastName}`, `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
      <div class="student-avatar" style="width:52px;height:52px;font-size:18px;background:${avatarColor(s.firstName+s.lastName)}">${initials(s.firstName,s.lastName)}</div>
      <div>
        <div style="font-size:17px;font-weight:700;">${s.firstName} ${s.lastName}</div>
        <div style="font-size:13px;color:var(--text3);">${cls ? cls.name : '—'} · ${s.gender || '—'}</div>
      </div>
    </div>
    <div class="form-grid">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><div style="font-size:11px;color:var(--text4);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:3px;">Email</div><div style="font-size:13.5px;">${s.email || '—'}</div></div>
        <div><div style="font-size:11px;color:var(--text4);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:3px;">Phone</div><div style="font-size:13.5px;">${s.phone || '—'}</div></div>
        <div><div style="font-size:11px;color:var(--text4);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:3px;">Date of Birth</div><div style="font-size:13.5px;">${formatDate(s.dob)}</div></div>
        <div><div style="font-size:11px;color:var(--text4);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:3px;">Status</div><span class="badge ${s.status==='active'?'badge-green':'badge-gray'}">${s.status}</span></div>
      </div>
      ${grades.length ? `
        <div style="margin-top:8px;">
          <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Recent Grades</div>
          ${grades.slice(-3).map(g => `
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;">
              <span>${g.subject} — ${g.assignment}</span>
              <strong>${g.score}/${g.total}</strong>
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${s.notes ? `<div style="background:var(--bg);border-radius:8px;padding:12px;font-size:13px;color:var(--text3);">${s.notes}</div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" onclick="removeStudent('${s.id}', true)">Remove Student</button>
      <button class="btn btn-secondary" onclick="editStudent('${s.id}')">Edit</button>
      <button class="btn btn-primary" onclick="closeModal()">Close</button>
    </div>
  `);
}

function editStudent(id) {
  const s = DB.find('students', id);
  if (!s) return;
  const classList = DB.getList('classes');
  openModal('Edit Student', `
    <form onsubmit="submitEditStudent(event,'${id}')" class="form-grid">
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">First Name <span class="required">*</span></label>
          <input class="form-input" name="firstName" required value="${s.firstName}" />
        </div>
        <div class="form-group">
          <label class="form-label">Last Name <span class="required">*</span></label>
          <input class="form-input" name="lastName" required value="${s.lastName}" />
        </div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="form-select" name="gender">
            <option value="">Select…</option>
            <option ${s.gender==='Male'?'selected':''}>Male</option>
            <option ${s.gender==='Female'?'selected':''}>Female</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input class="form-input" name="dob" type="date" value="${s.dob || ''}" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Class</label>
        <select class="form-select" name="classId">
          <option value="">No class</option>
          ${classList.map(c => `<option value="${c.id}" ${c.id==s.classId?'selected':''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-select" name="status">
          <option value="active" ${s.status==='active'?'selected':''}>Active</option>
          <option value="inactive" ${s.status==='inactive'?'selected':''}>Inactive</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Parent / Guardian Email</label>
        <input class="form-input" name="email" type="email" value="${s.email || ''}" placeholder="parent@example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Parent Phone</label>
        <input class="form-input" name="phone" type="tel" value="${s.phone || ''}" placeholder="555-0100" />
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" name="notes" placeholder="Any additional notes…">${s.notes || ''}</textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `);
}

function submitEditStudent(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  DB.update('students', id, {
    firstName: fd.get('firstName'), lastName: fd.get('lastName'),
    gender: fd.get('gender'), dob: fd.get('dob'), classId: fd.get('classId'),
    status: fd.get('status'), email: fd.get('email'), phone: fd.get('phone'), notes: fd.get('notes')
  });
  closeModal();
  toast('Student updated!', 'success');
  renderStudentList(_currentStudentFilter, '', _currentStudentGender);
}

let _currentStudentFilter = 'active';
let _currentStudentGender = '';
function removeStudent(id, fromModal = false) {
  if (!confirm('Remove this student? This cannot be undone.')) return;
  DB.remove('students', id);
  toast('Student removed.', '');
  if (fromModal) closeModal();
  renderStudentList(_currentStudentFilter, '', _currentStudentGender);
}

// =============================================
// PAGE: ENROLLMENT
// =============================================
function enrollment() {
  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openEnrollmentForm()">+ New Enrollment</button>`;
  const students = DB.getList('students');
  const classes = DB.getList('classes');
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <h2>Enrollment</h2>
        <p>Manage student enrollment and applications</p>
      </div>
    </div>

    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-label">Enrolled</div>
        <div class="stat-value">${students.filter(s=>s.status==='active').length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏫</div>
        <div class="stat-label">Classes</div>
        <div class="stat-value">${classes.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-label">Capacity Used</div>
        <div class="stat-value">${students.length > 0 ? Math.round(students.length / Math.max(classes.length * 20, 1) * 100) : 0}%</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">All Enrollments</div>
        <button class="btn btn-secondary btn-sm" onclick="openEnrollmentForm()">+ Enroll</button>
      </div>
      <div class="table-wrap">
        ${students.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">🎓</div>
            <h3>No students enrolled</h3>
            <p>Start by enrolling your first student.</p>
            <button class="btn btn-primary" onclick="openEnrollmentForm()">+ Enroll Student</button>
          </div>` : `
          <table>
            <thead><tr><th>Student</th><th>Class</th><th>Parent Email</th><th>Date of Birth</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${students.map(s => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="student-avatar" style="background:${avatarColor(s.firstName+s.lastName)}">${initials(s.firstName,s.lastName)}</div>
                      <strong>${s.firstName} ${s.lastName}</strong>
                    </div>
                  </td>
                  <td>${classMap[s.classId] || '—'}</td>
                  <td style="color:var(--text3);">${s.email || '—'}</td>
                  <td>${formatDate(s.dob)}</td>
                  <td><span class="badge ${s.status==='active'?'badge-green':'badge-gray'}">${s.status}</span></td>
                  <td>
                    <select class="form-select" style="width:120px;padding:5px 8px;font-size:12px;" onchange="changeStudentStatus('${s.id}',this.value)">
                      <option value="active" ${s.status==='active'?'selected':''}>Active</option>
                      <option value="inactive" ${s.status==='inactive'?'selected':''}>Inactive</option>
                    </select>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>`}
      </div>
    </div>
  `;
}

function openEnrollmentForm() {
  const classes = DB.getList('classes');
  openModal('Enroll New Student', `
    <form onsubmit="submitEnrollment(event)" class="form-grid">
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">First Name <span class="required">*</span></label>
          <input class="form-input" name="firstName" required placeholder="Sara" />
        </div>
        <div class="form-group">
          <label class="form-label">Last Name <span class="required">*</span></label>
          <input class="form-input" name="lastName" required placeholder="Malik" />
        </div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">Gender</label>
          <select class="form-select" name="gender">
            <option value="">Select…</option>
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input class="form-input" type="date" name="dob" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Enroll in Class <span class="required">*</span></label>
        <select class="form-select" name="classId" required>
          <option value="">Select class…</option>
          ${classes.length === 0 ? '<option disabled>No classes yet — add a class first</option>' : classes.map(c => `<option value="${c.id}">${c.name} (${c.teacher})</option>`).join('')}
        </select>
        ${classes.length === 0 ? `<span class="form-hint">⚠️ <a href="#" onclick="navigate('classes');closeModal()" style="color:var(--primary)">Add a class first</a></span>` : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Parent / Guardian Name</label>
        <input class="form-input" name="parentName" placeholder="Ahmad Malik" />
      </div>
      <div class="form-group">
        <label class="form-label">Parent Email</label>
        <input class="form-input" type="email" name="email" placeholder="parent@example.com" />
      </div>
      <div class="form-group">
        <label class="form-label">Parent Phone</label>
        <input class="form-input" type="tel" name="phone" placeholder="555-0100" />
      </div>
      <div class="form-group">
        <label class="form-label">Medical / Special Notes</label>
        <textarea class="form-textarea" name="notes" placeholder="Any allergies, special needs, etc."></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Confirm Enrollment</button>
      </div>
    </form>
  `);
}

function submitEnrollment(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  if (!fd.get('classId')) { toast('Please select a class.', 'error'); return; }
  const student = { firstName: fd.get('firstName'), lastName: fd.get('lastName'), gender: fd.get('gender'), dob: fd.get('dob'), classId: fd.get('classId'), parentName: fd.get('parentName'), email: fd.get('email'), phone: fd.get('phone'), notes: fd.get('notes'), status: 'active', juz: 0 };
  DB.push('students', student);
  closeModal();
  toast('Student enrolled successfully! 🎓', 'success');
  enrollment();
}

function changeStudentStatus(id, status) {
  DB.update('students', id, { status });
  toast('Status updated.', 'success');
}

// =============================================
// PAGE: CLASSES
// =============================================
function classes() {
  const classList = DB.getList('classes');
  const students = DB.getList('students');

  if (classList.length === 0) {
    classSetupWizard();
    return;
  }

  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openAddClassModal()">+ Add Class</button>`;

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Classes</h2><p>${classList.length} classes · ${students.length} students</p></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
      ${classList.length === 0 ? `
        <div class="card" style="grid-column:1/-1;">
          <div class="empty-state">
            <div class="empty-state-icon">🏫</div>
            <h3>No classes yet</h3>
            <p>Add your first class to start managing students.</p>
            <button class="btn btn-primary" onclick="openAddClassModal()">+ Add Class</button>
          </div>
        </div>` :
        classList.map(c => {
          const cnt = students.filter(s => String(s.classId) === String(c.id)).length;
          return `
            <div class="card">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
                <div>
                  <div style="font-size:15px;font-weight:700;">${c.name}</div>
                  <div style="font-size:13px;color:var(--text3);margin-top:2px;">${c.teacher}</div>
                </div>
                <span class="badge badge-blue">${c.level || 'Class'}</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                <span style="font-size:13px;color:var(--text3);">👥 ${cnt} students</span>
              </div>
              <div style="display:flex;gap:8px;">
                <button class="btn btn-secondary btn-sm" onclick="navigate('attendance')">Attendance</button>
                <button class="btn btn-secondary btn-sm" onclick="editClass('${c.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="removeClass('${c.id}')">Remove</button>
              </div>
            </div>
          `;
        }).join('')
      }
      <div class="card" style="border:2px dashed var(--border);background:transparent;display:flex;align-items:center;justify-content:center;min-height:160px;cursor:pointer;" onclick="openAddClassModal()">
        <div style="text-align:center;color:var(--text3);">
          <div style="font-size:28px;margin-bottom:8px;">+</div>
          <div style="font-size:14px;font-weight:600;">Add Class</div>
        </div>
      </div>
    </div>
  `;
}

function openAddClassModal() {
  openModal('Add Class', `
    <form onsubmit="submitAddClass(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">Class Name <span class="required">*</span></label>
        <input class="form-input" name="name" required placeholder="Grade 4 — Hifz" />
      </div>
      <div class="form-group">
        <label class="form-label">Teacher / Instructor</label>
        <input class="form-input" name="teacher" placeholder="Ustadh Ahmad" />
      </div>
      <div class="form-group">
        <label class="form-label">Program Level</label>
        <select class="form-select" name="level">
          <option value="">Select…</option>
          <option>Hifz</option>
          <option>Maktab</option>
          <option>K-12</option>
          <option>Alim Course</option>
          <option>Weekend School</option>
          <option>Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Schedule</label>
        <input class="form-input" name="schedule" placeholder="Mon, Wed, Fri · 4:00–6:00 PM" />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Class</button>
      </div>
    </form>
  `);
}

function submitAddClass(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  DB.push('classes', { name: fd.get('name'), teacher: fd.get('teacher'), level: fd.get('level'), schedule: fd.get('schedule'), students: 0 });
  closeModal();
  toast('Class added!', 'success');
  classes();
}

function editClass(id) {
  const c = DB.find('classes', id);
  if (!c) return;
  openModal('Edit Class', `
    <form onsubmit="submitEditClass(event,'${id}')" class="form-grid">
      <div class="form-group">
        <label class="form-label">Class Name <span class="required">*</span></label>
        <input class="form-input" name="name" required value="${c.name}" />
      </div>
      <div class="form-group">
        <label class="form-label">Teacher / Instructor</label>
        <input class="form-input" name="teacher" value="${c.teacher || ''}" placeholder="Ustadh Ahmad" />
      </div>
      <div class="form-group">
        <label class="form-label">Program Level</label>
        <select class="form-select" name="level">
          <option value="">Select…</option>
          ${['Hifz','Maktab','K-12','Alim Course','Weekend School','Other'].map(l => `<option ${c.level===l?'selected':''}>${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Schedule</label>
        <input class="form-input" name="schedule" value="${c.schedule || ''}" placeholder="Mon, Wed, Fri · 4:00–6:00 PM" />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Changes</button>
      </div>
    </form>
  `);
}

function submitEditClass(e, id) {
  e.preventDefault();
  const fd = new FormData(e.target);
  DB.update('classes', id, { name: fd.get('name'), teacher: fd.get('teacher'), level: fd.get('level'), schedule: fd.get('schedule') });
  closeModal();
  toast('Class updated!', 'success');
  classes();
}

function removeClass(id) {
  if (!confirm('Remove this class? Students will not be deleted.')) return;
  DB.remove('classes', id);
  toast('Class removed.', '');
  classes();
}

// =============================================
// CLASS SETUP WIZARD
// =============================================
let _classSetupTemplate = '';
const CLASS_TEMPLATES = {
  'Weekend School': ['Islamic Studies', 'Quran', 'Arabic', 'Seerah'],
  'Maktab': ['Quran Recitation', 'Islamic Studies', 'Urdu', 'Duas & Surahs'],
  'Madrasah': ['Hifz', 'Tajweed', 'Fiqh', 'Arabic', 'Aqeedah', 'Hadith'],
  'Custom': []
};

function classSetupWizard() {
  document.getElementById('topbarActions').innerHTML = '';
  document.getElementById('mainContent').innerHTML = `
    <div style="min-height:calc(100vh - var(--topbar-h) - 56px);display:flex;align-items:flex-start;justify-content:center;padding:32px 16px;background:var(--bg);">
      <div class="class-setup-card">
        <div style="text-align:center;margin-bottom:28px;">
          <div class="class-setup-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8" width="28" height="28"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          </div>
          <h2 style="font-size:20px;font-weight:800;color:var(--text);margin-top:14px;margin-bottom:6px;">Set up your classes</h2>
          <p style="font-size:14px;color:var(--text3);max-width:440px;margin:0 auto;">We'll create a basic class structure for your school. You can customize this later.</p>
        </div>

        <div class="class-setup-protip">
          <svg viewBox="0 0 20 20" fill="#2563eb" width="16" height="16"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.997.134-2.02.5-2.914.484-1.173 1.5-2.086 1.5-3.086a4 4 0 10-8 0c0 1 1.016 1.913 1.5 3.086.366.894.485 1.917.5 2.914h4z"/></svg>
          <div><span style="font-weight:700;color:#2563eb;">Pro Tip</span><br>Don't worry about getting this perfect right now. You can always add, remove, or rename classes later from your dashboard.</div>
        </div>

        <div style="margin-bottom:24px;">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:12px;">Choose a template to get started quickly:</div>
          <div class="class-template-grid">
            ${Object.keys(CLASS_TEMPLATES).map(t => `
              <button class="class-template-btn ${_classSetupTemplate===t?'selected':''}" onclick="selectClassTemplate('${t}')">
                <div class="class-template-icon ${t.toLowerCase().replace(' ','-')}">
                  ${t === 'Weekend School' ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4a3 3 0 016 0v4"/></svg>` :
                    t === 'Maktab' ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>` :
                    t === 'Madrasah' ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4a3 3 0 016 0v4"/></svg>` :
                    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="26" height="26"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`}
                </div>
                <div style="font-size:13px;font-weight:600;color:var(--text);">${t}</div>
                ${t === 'Custom' ? `<div style="font-size:11.5px;color:var(--text4);">Start from scratch</div>` : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px;">Your Subjects & Levels</div>
          <p style="font-size:13px;color:var(--text3);margin-bottom:16px;">Select a template above to populate subjects and levels automatically, or add them manually.</p>
          <div id="classSetupSubjects">
            ${_classSetupTemplate && CLASS_TEMPLATES[_classSetupTemplate].length > 0 ? `
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${CLASS_TEMPLATES[_classSetupTemplate].map(s => `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg);border-radius:8px;border:1px solid var(--border);">
                    <span style="font-size:13.5px;font-weight:500;">${s}</span>
                    <button class="btn btn-secondary btn-sm">Edit</button>
                  </div>
                `).join('')}
                <button class="btn btn-secondary btn-sm" style="align-self:flex-start;margin-top:4px;" onclick="toast('Add subject coming soon.','')">+ Add Subject</button>
              </div>
            ` : `
              <div style="text-align:center;padding:32px;color:var(--text4);">
                <div style="font-size:28px;margin-bottom:8px;">☝️</div>
                <div style="font-size:13px;">Select a template above to get started</div>
              </div>
            `}
          </div>
        </div>

        <div class="class-setup-footer">
          <button class="btn btn-secondary" onclick="navigate('dashboard')">‹ Back</button>
          <button class="btn btn-primary" style="background:#2563eb;border-color:#2563eb;min-width:180px;" onclick="finishClassSetup()">Continue to Payment →</button>
        </div>
      </div>
    </div>
  `;
}

function selectClassTemplate(t) {
  _classSetupTemplate = t;
  classSetupWizard();
}

function finishClassSetup() {
  if (!_classSetupTemplate) { toast('Please select a template first.', 'error'); return; }
  const subjects = CLASS_TEMPLATES[_classSetupTemplate];
  if (subjects.length > 0) {
    subjects.forEach(s => DB.push('classes', { name: s, teacher: '', level: _classSetupTemplate, schedule: '' }));
    toast(`${subjects.length} classes created from ${_classSetupTemplate} template!`, 'success');
  } else {
    openAddClassModal();
    return;
  }
  _classSetupTemplate = '';
  classes();
}

// =============================================
// PAGE: ATTENDANCE
// =============================================
// Weekly attendance grid state
let _attWeekStart = mondayOf(new Date());
let _attClassFilter = '';

function mondayOf(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function isoDate(d) { return d.toISOString().split('T')[0]; }

function attendance() {
  _attWeekStart = mondayOf(new Date());
  document.getElementById('topbarActions').innerHTML = '';
  renderAttendanceWeek();
}

function renderAttendanceWeek() {
  const classList = DB.getList('classes');
  let students = DB.getList('students').filter(s => s.status === 'active');
  if (_attClassFilter) students = students.filter(s => String(s.classId) === String(_attClassFilter));

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(_attWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const todayIso = today();
  const records = DB.getList('attendance');
  const weekStartLabel = weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEndLabel = weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Attendance</h2><p>Track and manage student attendance</p></div>
    </div>

    ${classList.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No classes yet</h3>
        <p>Add classes first before taking attendance.</p>
        <button class="btn btn-primary" onclick="navigate('classes')">Add Class</button>
      </div>` : `
      <div class="att-toolbar">
        <div class="att-toolbar-select">
          <span>🏫</span>
          <select onchange="_attClassFilter=this.value;renderAttendanceWeek();">
            <option value="">All Classes</option>
            ${classList.map(c => `<option value="${c.id}" ${String(_attClassFilter)===String(c.id)?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="att-week-nav">
          <button onclick="_attWeekStart.setDate(_attWeekStart.getDate()-7);renderAttendanceWeek();">‹</button>
          <span class="att-week-label">📅 ${weekStartLabel} – ${weekEndLabel}</span>
          <button onclick="_attWeekStart.setDate(_attWeekStart.getDate()+7);renderAttendanceWeek();">›</button>
        </div>
        <div class="att-actions-menu" style="position:relative;">
          <button class="btn btn-secondary" onclick="toggleAttActionsMenu(event)">Actions ▾</button>
          <div class="att-actions-dropdown" id="attActionsDropdown" style="display:none;">
            <button onclick="closeAttActionsMenu();markAllPresentToday();">✅ Mark All Present (Today)</button>
            <button onclick="closeAttActionsMenu();clearTodayAttendance();">🗑️ Clear Today's Records</button>
            <button onclick="closeAttActionsMenu();exportAttendanceWeekCSV();">⬇️ Export Week as CSV</button>
          </div>
        </div>
      </div>

      <div class="att-week-table-wrap">
        <table class="att-week-table">
          <thead>
            <tr>
              <th class="att-stu-col">Student Name</th>
              ${weekDates.map(d => {
                const iso = isoDate(d);
                const isToday = iso === todayIso;
                return `<th class="${isToday ? 'att-today' : ''}">
                  <div class="att-date-day">${isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div class="att-date-sub">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                </th>`;
              }).join('')}
            </tr>
          </thead>
          <tbody>
            ${students.length === 0 ? `<tr><td colspan="8" style="text-align:center;color:var(--text3);padding:30px;">No students found.</td></tr>` : students.map(s => `
              <tr data-student-id="${s.id}">
                <td class="att-stu-col">
                  <div class="att-week-row-name">
                    <div class="student-avatar" style="background:${avatarColor(s.firstName+s.lastName)}">${initials(s.firstName,s.lastName)}</div>
                    <div>
                      <div class="att-week-row-name-text">${s.firstName} ${s.lastName}</div>
                      <div class="att-week-row-name-sub">ID ${String(s.id).slice(-2)}</div>
                    </div>
                  </div>
                </td>
                ${weekDates.map(d => {
                  const iso = isoDate(d);
                  const future = iso > todayIso;
                  const rec = records.find(r => String(r.studentId) === String(s.id) && r.date === iso);
                  const status = rec ? rec.status : '';
                  const label = status === 'present' ? 'Present' : status === 'absent' ? 'Absent' : status === 'late' ? 'Late' : '—';
                  const cls = future ? 'is-future' : status ? `is-${status}` : '';
                  return `<td><span class="att-cell-pill ${cls}" ${future ? '' : `onclick="cycleAttCell(this,'${s.id}','${iso}')"`}>${label}</span></td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>`
    }
  `;
}

const ATT_CYCLE = ['', 'present', 'absent', 'late'];
function cycleAttCell(el, studentId, date) {
  const records = DB.getList('attendance');
  const rec = records.find(r => String(r.studentId) === String(studentId) && r.date === date);
  const current = rec ? rec.status : '';
  const next = ATT_CYCLE[(ATT_CYCLE.indexOf(current) + 1) % ATT_CYCLE.length];

  if (rec) {
    if (next === '') DB.remove('attendance', rec.id);
    else DB.update('attendance', rec.id, { status: next });
  } else if (next !== '') {
    DB.push('attendance', { studentId: String(studentId), date, status: next });
  }

  el.className = 'att-cell-pill' + (next ? ` is-${next}` : '');
  el.textContent = next === 'present' ? 'Present' : next === 'absent' ? 'Absent' : next === 'late' ? 'Late' : '—';
  toast(next ? `Marked ${next} ✓` : 'Cleared', 'success');
}

function markAllPresentToday() {
  let students = DB.getList('students').filter(s => s.status === 'active');
  if (_attClassFilter) students = students.filter(s => String(s.classId) === String(_attClassFilter));
  const date = today();
  const existing = DB.getList('attendance').filter(a => !(a.date === date && students.some(s => String(s.id) === String(a.studentId))));
  const newRecords = students.map(s => ({ id: Date.now() + Math.random(), studentId: String(s.id), date, status: 'present' }));
  DB.set('attendance', [...existing, ...newRecords]);
  toast(`Marked all present for ${formatDate(date)} ✓`, 'success');
  renderAttendanceWeek();
}

function clearTodayAttendance() {
  let students = DB.getList('students').filter(s => s.status === 'active');
  if (_attClassFilter) students = students.filter(s => String(s.classId) === String(_attClassFilter));
  const date = today();
  const ids = new Set(students.map(s => String(s.id)));
  const remaining = DB.getList('attendance').filter(a => !(a.date === date && ids.has(String(a.studentId))));
  DB.set('attendance', remaining);
  toast(`Cleared today's attendance records ✓`, '');
  renderAttendanceWeek();
}

function exportAttendanceWeekCSV() {
  let students = DB.getList('students').filter(s => s.status === 'active');
  if (_attClassFilter) students = students.filter(s => String(s.classId) === String(_attClassFilter));
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(_attWeekStart);
    d.setDate(d.getDate() + i);
    return isoDate(d);
  });
  const records = DB.getList('attendance');
  const headers = ['Student', ...weekDates];
  const rows = students.map(s => {
    const cells = weekDates.map(date => {
      const rec = records.find(r => String(r.studentId) === String(s.id) && r.date === date);
      return rec ? rec.status : '';
    });
    return [`${s.firstName} ${s.lastName}`, ...cells].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `attendance-${weekDates[0]}-to-${weekDates[6]}.csv`;
  a.click();
  toast('Attendance exported as CSV!', 'success');
}

function toggleAttActionsMenu(e) {
  e.stopPropagation();
  const dd = document.getElementById('attActionsDropdown');
  const opening = dd.style.display === 'none';
  dd.style.display = opening ? 'flex' : 'none';
  if (opening) {
    const closeOnOutsideClick = () => { dd.style.display = 'none'; document.removeEventListener('click', closeOnOutsideClick); };
    setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 0);
  }
}
function closeAttActionsMenu() {
  const dd = document.getElementById('attActionsDropdown');
  if (dd) dd.style.display = 'none';
}

// =============================================
// PAGE: GRADEBOOK
// =============================================
function gradebook() {
  const classList = DB.getList('classes');
  const students = DB.getList('students');
  const grades = DB.getList('grades');

  document.getElementById('topbarActions').innerHTML = `
    <button class="btn btn-secondary" onclick="openReportCardModal()">📄 Report Cards</button>
    <button class="btn btn-primary" onclick="openAddGradeModal()">+ Add Assignment</button>
  `;

  const subjects = [...new Set(grades.map(g => g.subject))];
  const activeSubject = subjects[0] || 'Islamic Studies';

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Gradebook</h2><p>Track assignments and grades</p></div>
    </div>

    ${students.length === 0 ? `
      <div class="empty-state"><div class="empty-state-icon">📊</div><h3>No students yet</h3><p>Enroll students first to start grading.</p><button class="btn btn-primary" onclick="navigate('enrollment')">Enroll Students</button></div>` :
    `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div class="card-title">Grade Summary</div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Class</th>
              ${subjects.map(s => `<th>${s}</th>`).join('')}
              <th>Average</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => {
              const cls = classList.find(c => c.id === s.classId);
              const subjectAvgs = subjects.map(sub => {
                const subGrades = grades.filter(g => g.studentId == s.id && g.subject === sub);
                if (!subGrades.length) return '<td style="color:var(--text4)">—</td>';
                const avg = Math.round(subGrades.reduce((a,g)=>a+(g.score/g.total*100),0)/subGrades.length);
                const color = avg>=90?'var(--green)':avg>=70?'var(--text2)':'var(--red)';
                return `<td style="font-weight:600;color:${color}">${avg}%</td>`;
              });
              const allGrades = grades.filter(g => g.studentId == s.id);
              const overall = allGrades.length ? Math.round(allGrades.reduce((a,g)=>a+(g.score/g.total*100),0)/allGrades.length) : null;
              return `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                      <div class="student-avatar" style="background:${avatarColor(s.firstName+s.lastName)}">${initials(s.firstName,s.lastName)}</div>
                      <strong>${s.firstName} ${s.lastName}</strong>
                    </div>
                  </td>
                  <td style="color:var(--text3);font-size:13px;">${cls?.name || '—'}</td>
                  ${subjectAvgs.join('')}
                  <td>${overall !== null ? `<span class="badge ${overall>=90?'badge-green':overall>=70?'badge-blue':'badge-red'}">${overall}%</span>` : '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">All Assignments</div>
        <button class="btn btn-secondary btn-sm" onclick="openAddGradeModal()">+ Add</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Subject</th><th>Assignment</th><th>Score</th><th>Date</th><th></th></tr></thead>
          <tbody>
            ${grades.length === 0
              ? `<tr><td colspan="6"><div class="empty-state" style="padding:30px"><p>No grades yet. Add an assignment to get started.</p></div></td></tr>`
              : grades.slice().reverse().map(g => {
                  const s = students.find(st => st.id == g.studentId);
                  if (!s) return '';
                  const pct = Math.round(g.score / g.total * 100);
                  return `
                    <tr>
                      <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                          <div class="student-avatar" style="background:${avatarColor(s.firstName+s.lastName)}">${initials(s.firstName,s.lastName)}</div>
                          ${s.firstName} ${s.lastName}
                        </div>
                      </td>
                      <td>${g.subject}</td>
                      <td>${g.assignment}</td>
                      <td><span class="badge ${pct>=90?'badge-green':pct>=70?'badge-blue':'badge-red'}">${g.score}/${g.total}</span></td>
                      <td style="color:var(--text3);">${formatDate(g.date)}</td>
                      <td><button class="btn btn-danger btn-sm" onclick="removeGrade('${g.id}')">Delete</button></td>
                    </tr>
                  `;
                }).join('')
            }
          </tbody>
        </table>
      </div>
    </div>`}
  `;
}

function openAddGradeModal() {
  const students = DB.getList('students').filter(s => s.status === 'active');
  openModal('Add Assignment / Grade', `
    <form onsubmit="submitGrade(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">Student <span class="required">*</span></label>
        <select class="form-select" name="studentId" required>
          <option value="">Select student…</option>
          ${students.map(s => `<option value="${s.id}">${s.firstName} ${s.lastName}</option>`).join('')}
        </select>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">Subject <span class="required">*</span></label>
          <input class="form-input" name="subject" required placeholder="Islamic Studies" list="subject-list" />
          <datalist id="subject-list">
            <option>Islamic Studies</option><option>Quran</option><option>Arabic</option><option>Hifz</option><option>Math</option><option>English</option><option>Science</option>
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-label">Assignment <span class="required">*</span></label>
          <input class="form-input" name="assignment" required placeholder="Midterm Exam" />
        </div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">Score <span class="required">*</span></label>
          <input class="form-input" name="score" type="number" required min="0" max="1000" placeholder="85" />
        </div>
        <div class="form-group">
          <label class="form-label">Out of <span class="required">*</span></label>
          <input class="form-input" name="total" type="number" required min="1" placeholder="100" value="100" />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" name="date" type="date" value="${today()}" />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Grade</button>
      </div>
    </form>
  `);
}

function submitGrade(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const score = parseInt(fd.get('score'));
  const total = parseInt(fd.get('total'));
  if (total <= 0) { toast('Total must be greater than 0.', 'error'); return; }
  if (score > total) { toast('Score cannot exceed total.', 'error'); return; }
  DB.push('grades', { studentId: fd.get('studentId'), subject: fd.get('subject'), assignment: fd.get('assignment'), score, total, date: fd.get('date') });
  closeModal();
  toast('Grade saved!', 'success');
  gradebook();
}

function removeGrade(id) {
  if (!confirm('Delete this grade entry?')) return;
  DB.remove('grades', id);
  toast('Grade deleted.', '');
  gradebook();
}

// =============================================
// PAGE: HIFZ TRACKING
// =============================================
function hifz() {
  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openHifzModal()">+ Log Session</button>`;
  const students = DB.getList('students');
  const classList = DB.getList('classes');
  const hifzLogs = DB.getList('hifz');

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Hifz Tracking</h2><p>Track daily Quran memorization — sabaq, sabqi & manzil</p></div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">Student Progress</div></div>
      ${students.length === 0
        ? `<div class="empty-state"><div class="empty-state-icon">📖</div><h3>No students yet</h3><p>Enroll students to track Hifz progress.</p></div>`
        : `<div class="table-wrap"><table>
            <thead><tr><th>Student</th><th>Class</th><th>Juz Completed</th><th>Progress</th><th>Last Session</th><th>Actions</th></tr></thead>
            <tbody>
              ${students.map(s => {
                const cls = classList.find(c => c.id === s.classId);
                const logs = hifzLogs.filter(h => h.studentId == s.id);
                const lastLog = logs.slice(-1)[0];
                const juz = s.juz || 0;
                const pct = Math.round(juz / 30 * 100);
                return `
                  <tr>
                    <td>
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div class="student-avatar" style="background:${avatarColor(s.firstName+s.lastName)}">${initials(s.firstName,s.lastName)}</div>
                        <strong>${s.firstName} ${s.lastName}</strong>
                      </div>
                    </td>
                    <td style="color:var(--text3);font-size:13px;">${cls?.name || '—'}</td>
                    <td><strong>${juz}</strong> / 30 Juz</td>
                    <td style="min-width:140px;">
                      <div style="display:flex;align-items:center;gap:8px;">
                        <div class="hifz-progress" style="flex:1;"><div class="hifz-fill" style="width:${pct}%"></div></div>
                        <span style="font-size:12px;color:var(--text3);width:32px;">${pct}%</span>
                      </div>
                    </td>
                    <td style="color:var(--text3);font-size:13px;">${lastLog ? formatDate(lastLog.date) : '—'}</td>
                    <td><button class="btn btn-secondary btn-sm" onclick="openHifzModal('${s.id}')">Log</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table></div>`
      }
    </div>

    ${hifzLogs.length > 0 ? `
    <div class="card" style="margin-top:16px;">
      <div class="card-header"><div class="card-title">Recent Sessions</div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Student</th><th>Date</th><th>Sabaq</th><th>Sabqi</th><th>Manzil</th><th>Mistakes</th><th>Notes</th><th></th></tr></thead>
        <tbody>
          ${hifzLogs.slice().reverse().slice(0,10).map(h => {
            const s = students.find(st => st.id == h.studentId);
            if (!s) return '';
            return `
              <tr>
                <td><strong>${s.firstName} ${s.lastName}</strong></td>
                <td>${formatDate(h.date)}</td>
                <td>${h.sabaq || '—'}</td>
                <td>${h.sabqi || '—'}</td>
                <td>${h.manzil || '—'}</td>
                <td>${h.mistakes != null ? `<span class="badge ${h.mistakes<=3?'badge-green':h.mistakes<=7?'badge-yellow':'badge-red'}">${h.mistakes}</span>` : '—'}</td>
                <td style="color:var(--text3);font-size:13px;">${h.notes || '—'}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeHifz('${h.id}')">Delete</button></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table></div>
    </div>` : ''}
  `;
}

function openHifzModal(preselectedId) {
  const students = DB.getList('students').filter(s => s.status === 'active');
  openModal('Log Hifz Session', `
    <form onsubmit="submitHifz(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">Student <span class="required">*</span></label>
        <select class="form-select" name="studentId" required>
          <option value="">Select student…</option>
          ${students.map(s => `<option value="${s.id}" ${s.id==preselectedId?'selected':''}>${s.firstName} ${s.lastName}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" type="date" name="date" value="${today()}" />
      </div>
      <div class="form-grid form-grid-3">
        <div class="form-group">
          <label class="form-label">Sabaq (New)</label>
          <input class="form-input" name="sabaq" placeholder="e.g. Al-Baqarah 1–5" />
        </div>
        <div class="form-group">
          <label class="form-label">Sabqi (Recent)</label>
          <input class="form-input" name="sabqi" placeholder="e.g. Al-Fatihah" />
        </div>
        <div class="form-group">
          <label class="form-label">Manzil (Old)</label>
          <input class="form-input" name="manzil" placeholder="e.g. Juz 1" />
        </div>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">Mistakes</label>
          <input class="form-input" name="mistakes" type="number" min="0" placeholder="0" />
        </div>
        <div class="form-group">
          <label class="form-label">Juz Completed (total)</label>
          <input class="form-input" name="juz" type="number" min="0" max="30" placeholder="e.g. 5" />
          <span class="form-hint">Updates the student's total Juz count</span>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" name="notes" placeholder="Tajweed notes, areas to improve…"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Session</button>
      </div>
    </form>
  `);
}

function removeHifz(id) {
  if (!confirm('Delete this Hifz session?')) return;
  DB.remove('hifz', id);
  toast('Session deleted.', '');
  hifz();
}

function submitHifz(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const studentId = fd.get('studentId');
  const juz = fd.get('juz');
  DB.push('hifz', { studentId, date: fd.get('date'), sabaq: fd.get('sabaq'), sabqi: fd.get('sabqi'), manzil: fd.get('manzil'), mistakes: fd.get('mistakes') ? parseInt(fd.get('mistakes')) : null, notes: fd.get('notes'), juz: juz ? parseInt(juz) : null });
  if (juz) DB.update('students', studentId, { juz: parseInt(juz) });
  closeModal();
  toast('Hifz session logged! 📖', 'success');
  hifz();
}

// =============================================
// PAGE: MESSAGES
// =============================================
// =============================================
// PAGE: MESSAGES
// =============================================
let _msgTab = 'all';

function messages() {
  _msgTab = _msgTab || 'all';
  const msgs = DB.getList('messages');
  const parents = DB.getList('parents');

  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openMessageModal()">+ New Message</button>`;

  const tabs = [
    { id: 'all', label: 'All Messages', count: msgs.length },
    { id: 'parents', label: 'To Parents', count: msgs.filter(m=>m.recipientType==='parents'||m.recipientType==='parent').length },
    { id: 'announcement', label: 'Announcements', count: msgs.filter(m=>m.recipientType==='announcement').length },
  ];

  const filtered = _msgTab === 'all' ? msgs :
                   _msgTab === 'parents' ? msgs.filter(m=>m.recipientType==='parents'||m.recipientType==='parent') :
                   msgs.filter(m=>m.recipientType==='announcement');

  const statusBadge = m => {
    if (m.sentViaEmail) return `<span class="badge badge-green">✓ Emailed</span>`;
    if (m.recipientType==='announcement') return `<span class="badge badge-blue">📣 Announcement</span>`;
    return `<span class="badge badge-gray">Saved</span>`;
  };

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Messages</h2><p>Send messages to parents and log school announcements</p></div>
    </div>

    ${parents.length === 0 ? `
    <div style="background:var(--yellow-bg);border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#92400e;">
      <strong>Tip:</strong> Add parent accounts in <a href="#" onclick="navigate('settings')" style="color:#92400e;font-weight:700;text-decoration:underline;">Settings → Parent Portal</a> to send them email messages directly.
    </div>` : ''}

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
      ${tabs.map(t => `
        <button onclick="_msgTab='${t.id}';messages();"
          style="padding:7px 16px;border-radius:8px;border:1px solid ${_msgTab===t.id?'var(--primary)':'var(--border2)'};
          background:${_msgTab===t.id?'var(--primary)':'#fff'};color:${_msgTab===t.id?'#fff':'var(--text2)'};
          font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .15s;">
          ${t.label} <span style="opacity:.7;font-weight:400;">(${t.count})</span>
        </button>`).join('')}
    </div>

    <div class="card">
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📨</div>
          <h3>No messages yet</h3>
          <p>${_msgTab==='all'?'Send your first message to parents or create a school announcement.':
              _msgTab==='parents'?'No parent messages yet. Click "+ New Message" to reach parents.':
              'No announcements yet.'}</p>
          <button class="btn btn-primary" onclick="openMessageModal()">+ New Message</button>
        </div>` : `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>To</th>
                <th>Subject</th>
                <th>Preview</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filtered.slice().reverse().map(m => `
                <tr style="cursor:pointer;" onclick="viewMessage('${m.id}')">
                  <td onclick="event.stopPropagation()">${statusBadge(m)}</td>
                  <td style="font-size:13px;font-weight:600;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.to}</td>
                  <td><strong style="font-size:13px;">${m.subject}</strong></td>
                  <td style="color:var(--text3);font-size:13px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.body.replace(/\n/g,' ').substring(0,70)}${m.body.length>70?'…':''}</td>
                  <td style="color:var(--text3);font-size:12px;white-space:nowrap;">${formatDate(m.date)}</td>
                  <td onclick="event.stopPropagation()">
                    <button class="btn btn-danger btn-sm" onclick="removeMessage('${m.id}')">Delete</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`}
    </div>
  `;
}

function viewMessage(id) {
  const m = DB.find('messages', id);
  if (!m) return;
  openModal(m.subject, `
    <div style="display:flex;gap:16px;margin-bottom:18px;flex-wrap:wrap;">
      <div style="flex:1;min-width:140px;">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:3px;">To</div>
        <div style="font-size:14px;font-weight:600;">${m.to}</div>
      </div>
      <div style="flex:1;min-width:140px;">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:3px;">Date</div>
        <div style="font-size:14px;">${formatDate(m.date)}</div>
      </div>
      <div style="flex:1;min-width:140px;">
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:3px;">Status</div>
        <div style="font-size:13px;">${m.sentViaEmail ? '✅ Sent via email' : m.recipientType==='announcement' ? '📣 School announcement' : '💾 Saved to records'}</div>
      </div>
    </div>
    ${m.emails && m.emails.length ? `
    <div style="margin-bottom:14px;">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:6px;">Email Recipients</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${m.emails.map(e=>`<span class="badge badge-blue">${e}</span>`).join('')}
      </div>
    </div>` : ''}
    <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;font-weight:600;margin-bottom:8px;">Message</div>
    <div style="background:var(--bg);border-radius:10px;padding:16px;font-size:14px;line-height:1.7;white-space:pre-wrap;color:var(--text2);">${m.body}</div>
    ${m.emails && m.emails.length ? `
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);">
      <a href="mailto:${m.emails.join(',')}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}"
        class="btn btn-primary" style="text-decoration:none;display:inline-block;">
        📧 Open in Email Client
      </a>
    </div>` : ''}
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn btn-danger" onclick="removeMessage('${m.id}');closeModal();">Delete</button>
    </div>
  `);
}

function openMessageModal() {
  const parents = DB.getList('parents');
  const classes = DB.getList('classes');
  const students = DB.getList('students');

  // Build recipient options
  const parentEmails = parents.map(p=>p.email).filter(Boolean);
  const parentOpts = parents.map(p => {
    const childNames = (p.studentIds||[]).map(sid=>{const s=students.find(s=>String(s.id)===String(sid));return s?s.firstName+' '+s.lastName:'';}).filter(Boolean).join(', ');
    return `<option value="parent:${p.id}">${p.name}${childNames?' ('+childNames+')':''}</option>`;
  }).join('');

  openModal('New Message', `
    <form onsubmit="submitMessage(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">Recipient Type <span class="required">*</span></label>
        <select class="form-select" name="recipientType" required onchange="updateRecipientUI(this.value)">
          <option value="">Choose type…</option>
          <option value="parents">All Parents${parentEmails.length?' ('+parentEmails.length+' email'+(parentEmails.length!==1?'s':'')+')':' — no emails on file'}</option>
          ${parents.map(p=>`<option value="parent:${p.id}">${p.name} — parent of ${(p.studentIds||[]).map(sid=>{const s=students.find(s=>String(s.id)===String(sid));return s?s.firstName:'';}).filter(Boolean).join(', ')||'?'}</option>`).join('')}
          ${classes.map(c=>`<option value="class:${c.id}">${c.name} — class parents</option>`).join('')}
          <option value="announcement">School-wide Announcement</option>
        </select>
      </div>
      <div id="recipientEmailRow" style="display:none;" class="form-group">
        <label class="form-label">Email Addresses</label>
        <div id="recipientEmailDisplay" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:13px;color:var(--text3);min-height:38px;"></div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px;">These addresses will be pre-filled when you open your email client.</div>
      </div>
      <div class="form-group">
        <label class="form-label">Subject <span class="required">*</span></label>
        <input class="form-input" name="subject" required placeholder="School Announcement" />
      </div>
      <div class="form-group">
        <label class="form-label">Message <span class="required">*</span></label>
        <textarea class="form-textarea" name="body" required style="min-height:130px;"
          placeholder="Dear parents,&#10;&#10;We would like to inform you…&#10;&#10;JazakAllahu Khayran,&#10;${getUser().schoolName||'School Administration'}"></textarea>
      </div>
      <div class="modal-footer" style="flex-direction:column;gap:8px;align-items:stretch;">
        <button type="submit" name="action" value="email" class="btn btn-primary" id="sendEmailBtn" style="display:none;">
          📧 Send via Email Client &amp; Save
        </button>
        <button type="submit" name="action" value="save" class="btn btn-secondary">
          💾 Save to Records Only
        </button>
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `);
}

function updateRecipientUI(type) {
  const parents = DB.getList('parents');
  const students = DB.getList('students');
  const classes = DB.getList('classes');
  const emailRow = document.getElementById('recipientEmailRow');
  const emailDisplay = document.getElementById('recipientEmailDisplay');
  const sendBtn = document.getElementById('sendEmailBtn');

  let emails = [];

  if (type === 'parents') {
    emails = parents.map(p=>p.email).filter(Boolean);
  } else if (type.startsWith('parent:')) {
    const pid = type.replace('parent:','');
    const p = parents.find(p=>String(p.id)===String(pid));
    if (p && p.email) emails = [p.email];
  } else if (type.startsWith('class:')) {
    const cid = type.replace('class:','');
    const classStudents = students.filter(s=>String(s.classId)===String(cid));
    const sids = new Set(classStudents.map(s=>String(s.id)));
    emails = parents.filter(p=>(p.studentIds||[]).some(sid=>sids.has(String(sid)))).map(p=>p.email).filter(Boolean);
  } else if (type === 'announcement') {
    emails = parents.map(p=>p.email).filter(Boolean);
  }

  if (emails.length > 0) {
    emailRow.style.display = '';
    emailDisplay.innerHTML = emails.map(e=>`<span class="badge badge-blue" style="margin:2px;">${e}</span>`).join(' ');
    sendBtn.style.display = '';
  } else if (type && type !== '') {
    emailRow.style.display = '';
    emailDisplay.innerHTML = `<span style="color:var(--text4);font-style:italic;">No email addresses on file for this recipient. Add parent accounts in Settings → Parent Portal.</span>`;
    sendBtn.style.display = 'none';
  } else {
    emailRow.style.display = 'none';
    sendBtn.style.display = 'none';
  }
}

function submitMessage(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const recipientType = fd.get('recipientType');
  const subject = fd.get('subject').trim();
  const body = fd.get('body').trim();
  const action = e.submitter ? e.submitter.value : 'save';

  if (!recipientType) { toast('Please select a recipient.', 'error'); return; }
  if (!subject) { toast('Please enter a subject.', 'error'); return; }
  if (!body) { toast('Please write a message.', 'error'); return; }

  // Resolve display name and emails
  const parents = DB.getList('parents');
  const students = DB.getList('students');
  const classes = DB.getList('classes');
  let toLabel = '';
  let emails = [];

  if (recipientType === 'parents') {
    toLabel = 'All Parents';
    emails = parents.map(p=>p.email).filter(Boolean);
  } else if (recipientType.startsWith('parent:')) {
    const pid = recipientType.replace('parent:','');
    const p = parents.find(p=>String(p.id)===String(pid));
    toLabel = p ? p.name : 'Parent';
    if (p && p.email) emails = [p.email];
  } else if (recipientType.startsWith('class:')) {
    const cid = recipientType.replace('class:','');
    const cls = classes.find(c=>String(c.id)===String(cid));
    const classStudents = students.filter(s=>String(s.classId)===String(cid));
    const sids = new Set(classStudents.map(s=>String(s.id)));
    toLabel = cls ? cls.name + ' — Parents' : 'Class Parents';
    emails = parents.filter(p=>(p.studentIds||[]).some(sid=>sids.has(String(sid)))).map(p=>p.email).filter(Boolean);
  } else if (recipientType === 'announcement') {
    toLabel = 'All — School Announcement';
    emails = parents.map(p=>p.email).filter(Boolean);
  }

  const sentViaEmail = action === 'email' && emails.length > 0;
  DB.push('messages', { to: toLabel, subject, body, date: today(), recipientType, emails, sentViaEmail });

  if (sentViaEmail) {
    const mailtoLink = `mailto:${emails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
    toast('Message saved! Your email client is opening…', 'success');
  } else {
    toast('Message saved to records.', 'success');
  }

  closeModal();
  messages();
}

function removeMessage(id) {
  if (!confirm('Delete this message?')) return;
  DB.remove('messages', id);
  toast('Message deleted.', '');
  messages();
}

// =============================================
// PAGE: SETTINGS
// =============================================
let _settingsTab = 'profile';

function settings() {
  renderSettings(_settingsTab);
}

function renderSettings(tab) {
  _settingsTab = tab;
  const user = getUser();
  const tabs = ['Profile','Billing','Attendance','SMS','Calendar','Enrollments','Data'];

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Dashboard</div>
        <h2>Settings</h2>
        <p>Manage settings for ${user.schoolName || 'My School'}</p>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:0;">
      ${tabs.map(t => `<button class="tab-btn ${_settingsTab===t.toLowerCase()?'active':''}" onclick="renderSettings('${t.toLowerCase()}')">${t}</button>`).join('')}
    </div>
    <div style="border-bottom:1px solid var(--border);margin-bottom:20px;"></div>

    <div style="max-width:580px;display:flex;flex-direction:column;gap:16px;">
      ${tab === 'profile' ? `
        <div class="card">
          <div class="card-title" style="margin-bottom:16px;">School Information</div>
          <form onsubmit="saveSettings(event)" class="form-grid">
            <div class="form-group"><label class="form-label">School Name</label><input class="form-input" name="schoolName" value="${user.schoolName || ''}" placeholder="Al-Noor Academy" /></div>
            <div class="form-group"><label class="form-label">Admin Name</label><input class="form-input" value="${user.firstName + ' ' + user.lastName}" readonly style="background:var(--bg);color:var(--text3);" /></div>
            <div class="form-group"><label class="form-label">Email</label><input class="form-input" value="${user.email || ''}" readonly style="background:var(--bg);color:var(--text3);" /></div>
            <div><button type="submit" class="btn btn-primary">Save Changes</button></div>
          </form>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:16px;">Change Password</div>
          <form onsubmit="changePassword(event)" class="form-grid">
            <div class="form-group"><label class="form-label">Current Password</label><input class="form-input" name="currentPw" type="password" placeholder="Enter current password" required /></div>
            <div class="form-group"><label class="form-label">New Password</label><input class="form-input" name="newPw" type="password" placeholder="Min 6 characters" minlength="6" required /></div>
            <div class="form-group"><label class="form-label">Confirm New Password</label><input class="form-input" name="confirmPw" type="password" placeholder="Repeat new password" required /></div>
            <div><button type="submit" class="btn btn-secondary">Update Password</button></div>
          </form>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:4px;">Account</div>
          <p style="font-size:13px;color:var(--text3);margin-bottom:16px;">Logged in as <strong>${user.email}</strong></p>
          <button class="btn btn-danger" onclick="logout()">Log out</button>
        </div>
      ` : tab === 'sms' ? `
        <div class="card">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;">
            <div style="width:48px;height:48px;border-radius:12px;background:#dcfce7;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg viewBox="0 0 20 20" fill="#16a34a" width="24" height="24"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/></svg>
            </div>
            <div>
              <div style="font-size:15px;font-weight:700;">SMS Settings</div>
              <div style="font-size:13px;color:var(--text3);">Send SMS messages to parents and students</div>
            </div>
          </div>
          <div style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:14px;font-size:13.5px;color:var(--text2);margin-bottom:16px;line-height:1.6;">
            Text announcements and attendance alerts to parents and students. You'll get a dedicated number, and usage is billed to your card on file at <strong>$0.03</strong> per message segment, totaled at the end of each month.
          </div>
          <label style="display:flex;align-items:flex-start;gap:10px;font-size:13.5px;margin-bottom:16px;cursor:pointer;">
            <input type="checkbox" id="smsAck" style="margin-top:2px;width:14px;height:14px;accent-color:#0d9488;" />
            I acknowledge SMS is billed at <strong>$0.03</strong> per message segment and added to my monthly invoice.
          </label>
          <div class="form-group" style="margin-bottom:20px;">
            <label class="form-label">Monthly budget (USD, optional)</label>
            <input class="form-input" type="number" id="smsBudget" value="0" min="0" style="max-width:120px;" />
          </div>
          <button class="btn btn-primary" style="background:#16a34a;border-color:#16a34a;display:flex;align-items:center;gap:8px;" onclick="toast('SMS setup coming soon!','success')">
            <svg viewBox="0 0 20 20" fill="white" width="16" height="16"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/></svg>
            Turn on SMS & get a number
          </button>
        </div>
      ` : tab === 'billing' ? `
        <div class="card">
          <div class="card-title" style="margin-bottom:16px;">Billing Settings</div>
          <p style="font-size:13.5px;color:var(--text3);margin-bottom:16px;">Connect a payment account to collect tuition from parents.</p>
          <button class="btn btn-primary" onclick="navigate('billing')">Set Up Payment Collection →</button>
        </div>
      ` : tab === 'attendance' ? `
        <div class="card">
          <div class="card-title" style="margin-bottom:16px;">Attendance Settings</div>
          <div class="form-group">
            <label class="form-label">Default week start</label>
            <select class="form-select" style="max-width:200px;"><option selected>Monday</option><option>Sunday</option></select>
          </div>
          <div class="form-group">
            <label class="form-label">Absence threshold (days)</label>
            <input class="form-input" type="number" value="5" style="max-width:120px;" />
          </div>
          <button class="btn btn-primary" onclick="toast('Attendance settings saved.','success')">Save</button>
        </div>
      ` : tab === 'calendar' ? `
        <div class="card">
          <div class="card-title" style="margin-bottom:16px;">Calendar Settings</div>
          <p style="font-size:13.5px;color:var(--text3);margin-bottom:16px;">Import or sync your school calendar with external services.</p>
          <button class="btn btn-secondary" onclick="toast('Calendar import coming soon.','')">Import Calendar (.ics)</button>
        </div>
      ` : tab === 'enrollments' ? `
        <div class="card">
          <div class="card-title" style="margin-bottom:16px;">Enrollment Settings</div>
          <p style="font-size:13.5px;color:var(--text3);margin-bottom:16px;">Manage enrollment form settings and public application links.</p>
          <button class="btn btn-primary" onclick="navigate('enrollment')">Manage Enrollment Forms →</button>
        </div>
      ` : tab === 'data' ? `
        <div class="card">
          <div class="card-title" style="margin-bottom:16px;">Data & Backup</div>
          <p style="font-size:13.5px;color:var(--text3);margin-bottom:16px;">All your data is saved locally in your browser. Export a backup anytime.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-secondary" onclick="exportData()">Export JSON</button>
            <button class="btn btn-secondary" onclick="exportStudentsCSV()">Export Students (CSV)</button>
            <button class="btn btn-danger" onclick="clearAllData()">Reset All Data</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:12px;">Parent Portal</div>
          <p style="font-size:13px;color:var(--text3);margin-bottom:12px;">Parents log in at <strong>parent.html</strong> to view their child's grades and attendance.</p>
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <button class="btn btn-primary btn-sm" onclick="openAddParentModal()">+ Add Parent</button>
          </div>
          ${(() => {
            const parentList = DB.getList('parents');
            if (parentList.length === 0) return '<p style="font-size:13px;color:var(--text3);">No parent accounts yet.</p>';
            const studentList = DB.getList('students');
            const sMap = Object.fromEntries(studentList.map(s=>[s.id, s.firstName+' '+s.lastName]));
            return `<div class="table-wrap"><table>
              <thead><tr><th>Name</th><th>Email</th><th>Children</th><th></th></tr></thead>
              <tbody>${parentList.map(p=>`<tr>
                <td><strong>${p.name}</strong></td>
                <td style="font-size:12px;color:var(--text3)">${p.email}</td>
                <td style="font-size:12px;color:var(--text3)">${(p.studentIds||[]).map(id=>sMap[id]).filter(Boolean).join(', ')||'—'}</td>
                <td><button class="btn btn-danger btn-sm" onclick="removeParent('${p.id}')">Remove</button></td>
              </tr>`).join('')}</tbody>
            </table></div>`;
          })()}
        </div>
      ` : `<div class="card"><p style="color:var(--text3);font-size:13.5px;">Coming soon.</p></div>`}
    </div>
  `;
}

function saveSettings(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const user = getUser();
  const schoolName = fd.get('schoolName');
  DB.set('user', { ...user, schoolName });
  document.getElementById('schoolName').textContent = schoolName;
  toast('Settings saved!', 'success');
}

function changePassword(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const user = getUser();
  const currentPw = fd.get('currentPw');
  const newPw = fd.get('newPw');
  const confirmPw = fd.get('confirmPw');
  if (currentPw !== user.password) { toast('Current password is incorrect.', 'error'); return; }
  if (newPw.length < 6) { toast('New password must be at least 6 characters.', 'error'); return; }
  if (newPw !== confirmPw) { toast('New passwords do not match.', 'error'); return; }
  DB.set('user', { ...user, password: newPw });
  e.target.reset();
  toast('Password updated successfully!', 'success');
}

function exportData() {
  const data = { students: DB.getList('students'), classes: DB.getList('classes'), grades: DB.getList('grades'), attendance: DB.getList('attendance'), hifz: DB.getList('hifz'), messages: DB.getList('messages'), tuition: DB.getList('tuition'), salah: DB.getList('salah'), events: DB.getList('events'), quizzes: DB.getList('quizzes'), staff: DB.getList('staff'), parents: DB.getList('parents') };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'schooltrack-data.json';
  a.click();
  toast('Data exported!', 'success');
}

function exportStudentsCSV() {
  const students = DB.getList('students');
  if (!students.length) { toast('No students to export.', ''); return; }
  const classes = DB.getList('classes');
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
  const headers = ['First Name', 'Last Name', 'Gender', 'Date of Birth', 'Class', 'Parent Email', 'Parent Phone', 'Status', 'Juz Completed'];
  const rows = students.map(s => [
    s.firstName, s.lastName, s.gender || '', s.dob || '',
    classMap[s.classId] || '', s.email || '', s.phone || '',
    s.status, s.juz || 0
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'schooltrack-students.csv';
  a.click();
  toast('Students exported as CSV!', 'success');
}

function clearAllData() {
  if (!confirm('This will delete ALL school data. Are you sure?')) return;
  ['students','classes','grades','attendance','hifz','messages','tuition','salah','events','quizzes','staff','parents'].forEach(k => localStorage.removeItem('st_' + k));
  toast('All data cleared.', '');
  navigate('dashboard');
}

// =============================================
// PAGE: SALAH TRACKER
// =============================================
const pendingSalah = {};
const PRAYERS = ['fajr','dhuhr','asr','maghrib','isha'];
const PRAYER_LABELS = { fajr:'F', dhuhr:'D', asr:'A', maghrib:'M', isha:'I' };

function salah() {
  Object.keys(pendingSalah).forEach(k => delete pendingSalah[k]);
  const salahDate = today();
  document.getElementById('topbarActions').innerHTML = `
    <input type="date" class="form-input" id="salahDate" value="${salahDate}"
      onchange="renderSalahDate(this.value)" style="width:160px;padding:7px 10px;font-size:13px;" />
  `;
  renderSalahDate(salahDate);
}

function renderSalahDate(date) {
  const classList = DB.getList('classes');
  const students = DB.getList('students');
  const records = DB.getList('salah').filter(r => r.date === date);

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Salah Tracker</h2><p>Track daily prayer attendance — ${formatDate(date)}</p></div>
      <button class="btn btn-primary" onclick="saveSalahAttendance('${date}')">Save</button>
    </div>
    ${classList.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">🕋</div>
        <h3>No classes yet</h3>
        <p>Add classes first to track Salah attendance.</p>
      </div>` : `
      <div style="margin-bottom:12px;background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px 16px;display:flex;gap:20px;font-size:12px;font-weight:600;color:var(--text3);">
        <span>F = Fajr</span><span>D = Dhuhr</span><span>A = Asr</span><span>M = Maghrib</span><span>I = Isha</span>
      </div>
      <div class="att-grid">
        ${classList.map(cls => {
          const classStudents = students.filter(s => String(s.classId) === String(cls.id) && s.status === 'active');
          return `
            <div class="att-class-card">
              <div class="att-class-name">${cls.name} <span style="font-size:12px;color:var(--text3);font-weight:400;">— ${cls.teacher}</span></div>
              ${classStudents.length === 0 ? `<p style="font-size:13px;color:var(--text3);">No students in this class.</p>` :
                classStudents.map(s => {
                  const rec = records.find(r => r.studentId == s.id) || {};
                  return `
                    <div class="att-student-row salah-row" data-student-id="${s.id}">
                      <div class="att-student-name" style="min-width:130px;">
                        <div class="student-avatar" style="width:26px;height:26px;font-size:10px;background:${avatarColor(s.firstName+s.lastName)}">${initials(s.firstName,s.lastName)}</div>
                        ${s.firstName} ${s.lastName}
                      </div>
                      <div style="display:flex;gap:5px;">
                        ${PRAYERS.map(p => `
                          <button class="salah-btn ${rec[p] ? 'salah-done' : ''}"
                            title="${p.charAt(0).toUpperCase()+p.slice(1)}"
                            onclick="toggleSalah(this,'${s.id}','${p}')">
                            ${PRAYER_LABELS[p]}
                          </button>
                        `).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              <div style="margin-top:10px;">
                <button class="btn btn-secondary btn-sm" onclick="markAllSalah('${cls.id}')">All Present</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>`
    }
  `;
}

function toggleSalah(btn, studentId, prayer) {
  btn.classList.toggle('salah-done');
}

function markAllSalah(classId) {
  const classStudents = DB.getList('students').filter(s => String(s.classId) === String(classId) && s.status === 'active');
  const ids = new Set(classStudents.map(s => String(s.id)));
  document.querySelectorAll('.salah-row').forEach(row => {
    if (ids.has(row.dataset.studentId)) {
      row.querySelectorAll('.salah-btn').forEach(b => b.classList.add('salah-done'));
    }
  });
}

function saveSalahAttendance(date) {
  const existing = DB.getList('salah').filter(r => r.date !== date);
  const uiRecords = [];
  document.querySelectorAll('.salah-row').forEach(row => {
    const sid = row.dataset.studentId;
    if (!sid) return;
    const rec = { id: Date.now() + Math.random(), studentId: sid, date };
    PRAYERS.forEach(p => {
      const btn = row.querySelector(`.salah-btn[title="${p.charAt(0).toUpperCase()+p.slice(1)}"]`);
      rec[p] = btn ? btn.classList.contains('salah-done') : false;
    });
    uiRecords.push(rec);
  });
  DB.set('salah', [...existing, ...uiRecords]);
  toast(`Salah saved for ${formatDate(date)} ✓`, 'success');
}

// =============================================
// PAGE: TUITION
// =============================================
function tuition() {
  const students = DB.getList('students').filter(s => s.status === 'active');
  const payments = DB.getList('tuition');

  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openTuitionModal()">+ Add Entry</button>`;

  if (students.length === 0) {
    document.getElementById('mainContent').innerHTML = `
      <div class="page-header"><div><h2>Tuition</h2><p>Track payments and balances</p></div></div>
      <div class="empty-state"><div class="empty-state-icon">💳</div><h3>No students yet</h3><p>Add students to start tracking tuition.</p></div>`;
    return;
  }

  const rows = students.map(s => {
    const sp = payments.filter(p => p.studentId == s.id);
    const charged = sp.filter(p => p.type === 'charge').reduce((a,p) => a + Number(p.amount), 0);
    const paid = sp.filter(p => p.type === 'payment').reduce((a,p) => a + Number(p.amount), 0);
    const balance = charged - paid;
    return { s, charged, paid, balance };
  });

  const totalCharged = rows.reduce((a,r) => a + r.charged, 0);
  const totalPaid = rows.reduce((a,r) => a + r.paid, 0);
  const totalOwed = rows.reduce((a,r) => a + Math.max(0, r.balance), 0);

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Tuition</h2><p>Payments and balances for all students</p></div>
    </div>
    <div class="stats-row" style="margin-bottom:20px;">
      <div class="stat-card"><div class="stat-val">$${totalCharged.toFixed(2)}</div><div class="stat-label">Total Charged</div></div>
      <div class="stat-card"><div class="stat-val">$${totalPaid.toFixed(2)}</div><div class="stat-label">Total Collected</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--red)">$${totalOwed.toFixed(2)}</div><div class="stat-label">Outstanding</div></div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Charged</th><th>Paid</th><th>Balance</th><th></th></tr></thead>
          <tbody>
            ${rows.map(({s, charged, paid, balance}) => `
              <tr>
                <td><strong>${s.firstName} ${s.lastName}</strong></td>
                <td>$${charged.toFixed(2)}</td>
                <td style="color:var(--green)">$${paid.toFixed(2)}</td>
                <td><span class="badge ${balance > 0 ? 'badge-red' : balance < 0 ? 'badge-blue' : 'badge-green'}">
                  ${balance > 0 ? 'Owes $'+balance.toFixed(2) : balance < 0 ? 'Credit $'+Math.abs(balance).toFixed(2) : 'Paid up'}
                </span></td>
                <td><button class="btn btn-secondary btn-sm" onclick="viewStudentTuition('${s.id}')">History</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function viewStudentTuition(studentId) {
  const s = DB.find('students', studentId);
  const payments = DB.getList('tuition').filter(p => p.studentId == studentId);
  const charged = payments.filter(p => p.type === 'charge').reduce((a,p) => a + Number(p.amount), 0);
  const paid = payments.filter(p => p.type === 'payment').reduce((a,p) => a + Number(p.amount), 0);
  const balance = charged - paid;

  openModal(`${s.firstName} ${s.lastName} — Tuition`, `
    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="flex:1;background:var(--bg);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:18px;font-weight:700;">$${charged.toFixed(2)}</div>
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Charged</div>
      </div>
      <div style="flex:1;background:var(--green-bg);border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:18px;font-weight:700;color:var(--green)">$${paid.toFixed(2)}</div>
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">Paid</div>
      </div>
      <div style="flex:1;background:${balance>0?'var(--red-bg)':'var(--green-bg)'};border-radius:8px;padding:12px;text-align:center;">
        <div style="font-size:18px;font-weight:700;color:${balance>0?'var(--red)':'var(--green)'}">$${Math.abs(balance).toFixed(2)}</div>
        <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;">${balance>0?'Owed':balance<0?'Credit':'Clear'}</div>
      </div>
    </div>
    ${payments.length === 0 ? '<p style="color:var(--text3);font-size:13px;margin-bottom:16px;">No entries yet.</p>' : `
    <div class="table-wrap" style="margin-bottom:16px;">
      <table>
        <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Note</th><th></th></tr></thead>
        <tbody>
          ${payments.slice().reverse().map(p => `
            <tr>
              <td style="font-size:12px;">${formatDate(p.date)}</td>
              <td><span class="badge ${p.type==='payment'?'badge-green':'badge-red'}" style="text-transform:capitalize;">${p.type}</span></td>
              <td>$${Number(p.amount).toFixed(2)}</td>
              <td style="color:var(--text3);font-size:12px;">${p.note||'—'}</td>
              <td><button class="btn btn-danger btn-sm" onclick="removeTuitionEntry('${p.id}','${studentId}')">×</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`}
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Close</button>
      <button class="btn btn-primary" onclick="openTuitionModal('${studentId}')">+ Add Entry</button>
    </div>
  `);
}

function openTuitionModal(preStudentId = '') {
  const students = DB.getList('students').filter(s => s.status === 'active');
  openModal('Add Tuition Entry', `
    <form onsubmit="submitTuition(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">Student <span class="required">*</span></label>
        <select class="form-select" name="studentId" required>
          <option value="">Select student…</option>
          ${students.map(s => `<option value="${s.id}" ${String(s.id)===String(preStudentId)?'selected':''}>${s.firstName} ${s.lastName}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Type <span class="required">*</span></label>
        <select class="form-select" name="type" required>
          <option value="charge">Charge (tuition fee)</option>
          <option value="payment">Payment (received)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Amount ($) <span class="required">*</span></label>
        <input class="form-input" name="amount" type="number" min="0.01" step="0.01" placeholder="150.00" required />
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" name="date" type="date" value="${today()}" />
      </div>
      <div class="form-group">
        <label class="form-label">Note</label>
        <input class="form-input" name="note" placeholder="Monthly fee, scholarship, etc." />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Entry</button>
      </div>
    </form>
  `);
}

function submitTuition(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  DB.push('tuition', { studentId: fd.get('studentId'), type: fd.get('type'), amount: fd.get('amount'), date: fd.get('date')||today(), note: fd.get('note') });
  closeModal();
  toast('Entry added!', 'success');
  tuition();
}

function removeTuitionEntry(id, studentId) {
  if (!confirm('Delete this entry?')) return;
  DB.remove('tuition', id);
  toast('Entry removed.', '');
  closeModal();
  setTimeout(() => viewStudentTuition(studentId), 50);
}

// =============================================
// FEATURE: REPORT CARDS (from Gradebook)
// =============================================
function openReportCardModal() {
  const classes = DB.getList('classes');
  if (classes.length === 0) { toast('Add classes first.', 'error'); return; }
  openModal('Generate Report Cards', `
    <form onsubmit="generateReportCard(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">Class <span class="required">*</span></label>
        <select class="form-select" name="classId" required onchange="loadStudentsForReport(this.value)">
          <option value="">Select class…</option>
          ${classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Student</label>
        <select class="form-select" name="studentId" id="reportStudentSel">
          <option value="all">All Students</option>
        </select>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Generate →</button>
      </div>
    </form>
  `);
}

function loadStudentsForReport(classId) {
  const students = DB.getList('students').filter(s => String(s.classId) === String(classId) && s.status === 'active');
  const sel = document.getElementById('reportStudentSel');
  if (sel) sel.innerHTML = `<option value="all">All Students</option>` + students.map(s => `<option value="${s.id}">${s.firstName} ${s.lastName}</option>`).join('');
}

function generateReportCard(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const classId = fd.get('classId');
  const studentId = fd.get('studentId');
  const cls = DB.find('classes', classId);
  const user = getUser();
  let studentList = DB.getList('students').filter(s => String(s.classId) === String(classId) && s.status === 'active');
  if (studentId !== 'all') studentList = studentList.filter(s => String(s.id) === String(studentId));
  if (studentList.length === 0) { toast('No students found.', 'error'); return; }

  const grades = DB.getList('grades');
  const attendance = DB.getList('attendance');

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Report Cards</title>
<style>
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;background:#fff;padding:0;margin:0;}
  .page{page-break-after:always;padding:40px;max-width:680px;margin:0 auto;}
  .hdr{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #0d9488;padding-bottom:14px;margin-bottom:22px;}
  .school{font-size:20px;font-weight:800;color:#0d9488;} .yr{font-size:12px;color:#6b7280;}
  .rlbl{font-size:16px;font-weight:700;color:#374151;} .rdt{font-size:11px;color:#6b7280;}
  .sinfo{background:#f0fdfa;border-radius:8px;padding:14px 18px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .si-lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;} .si-val{font-size:13px;font-weight:600;}
  .sec{font-size:13px;font-weight:700;color:#374151;margin:18px 0 8px;border-left:3px solid #0d9488;padding-left:10px;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  th{background:#0d9488;color:#fff;padding:7px 12px;text-align:left;font-size:12px;}
  td{padding:7px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;}
  tr:nth-child(even) td{background:#f9fafb;}
  .gA{color:#059669;font-weight:700;} .gB{color:#0d9488;font-weight:700;} .gC{color:#f59e0b;font-weight:700;} .gD,.gF{color:#ef4444;font-weight:700;}
  .ftrs{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:24px;}
  .sig{border-top:1px solid #374151;padding-top:4px;font-size:11px;color:#6b7280;}
  @media print{.no-print{display:none;}.page{padding:24px;}}
  .print-btn{position:fixed;top:16px;right:16px;background:#0d9488;color:#fff;border:none;padding:9px 18px;border-radius:7px;cursor:pointer;font-size:14px;font-weight:600;}
</style></head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Print</button>
${studentList.map(s => {
  const sg = grades.filter(g => g.studentId == s.id);
  const subjects = [...new Set(sg.map(g => g.subject))];
  const att = attendance.filter(a => a.studentId == s.id);
  const present = att.filter(a => a.status==='present').length;
  const total = att.length;
  const rate = total > 0 ? Math.round(present/total*100) : 0;
  const subRows = subjects.map(sub => {
    const sg2 = sg.filter(g => g.subject===sub);
    const avg = sg2.reduce((a,g) => a+(g.score/g.total*100),0)/sg2.length;
    const letter = avg>=90?'A':avg>=80?'B':avg>=70?'C':avg>=60?'D':'F';
    return `<tr><td>${sub}</td><td>${sg2.length}</td><td>${avg.toFixed(1)}%</td><td class="g${letter}">${letter}</td></tr>`;
  }).join('');
  return `<div class="page">
    <div class="hdr">
      <div><div class="school">${user.schoolName||'My School'}</div><div class="yr">Academic Report</div></div>
      <div style="text-align:right"><div class="rlbl">Report Card</div><div class="rdt">Generated ${new Date().toLocaleDateString()}</div></div>
    </div>
    <div class="sinfo">
      <div><div class="si-lbl">Student</div><div class="si-val">${s.firstName} ${s.lastName}</div></div>
      <div><div class="si-lbl">Class</div><div class="si-val">${cls.name}</div></div>
      <div><div class="si-lbl">Gender</div><div class="si-val">${s.gender||'—'}</div></div>
      <div><div class="si-lbl">Attendance</div><div class="si-val">${present}/${total} days (${rate}%)</div></div>
    </div>
    <div class="sec">Academic Performance</div>
    ${sg.length===0?'<p style="color:#6b7280;font-size:13px;">No grades recorded.</p>':`
    <table><thead><tr><th>Subject</th><th>Assignments</th><th>Average</th><th>Grade</th></tr></thead><tbody>${subRows}</tbody></table>`}
    <div class="sec">Attendance</div>
    <table><thead><tr><th>Present</th><th>Absent</th><th>Late</th><th>Rate</th></tr></thead>
    <tbody><tr><td>${att.filter(a=>a.status==='present').length}</td><td>${att.filter(a=>a.status==='absent').length}</td><td>${att.filter(a=>a.status==='late').length}</td><td>${rate}%</td></tr></tbody></table>
    <div class="ftrs"><div><div class="sig">Class Teacher</div></div><div><div class="sig">Principal / Administrator</div></div></div>
  </div>`;
}).join('')}
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) { toast('Popup blocked — please allow popups and try again.', 'error'); return; }
  w.document.write(html);
  w.document.close();
  closeModal();
}

// =============================================
// PAGE: CALENDAR
// =============================================
function calendar() {
  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openEventModal()">+ Add Event</button>`;
  const now = new Date();
  renderCalendar(now.getFullYear(), now.getMonth());
}

function renderCalendar(year, month) {
  const events = DB.getList('events');
  const monthEvents = events.filter(e => { const d = new Date(e.date + 'T00:00:00'); return d.getFullYear()===year && d.getMonth()===month; });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
  const typeColors = { holiday:'#ef4444', exam:'#f59e0b', event:'#0d9488', other:'#6b7280' };

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += `<div class="cal-cell cal-empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvs = events.filter(e => e.date === ds);
    const isToday = ds === today();
    cells += `<div class="cal-cell ${isToday?'cal-today':''}" onclick="openEventModal('${ds}')">
      <div class="cal-day-num ${isToday?'cal-today-num':''}">${d}</div>
      <div class="cal-dots">${dayEvs.map(ev=>`<div class="cal-dot" style="background:${typeColors[ev.type]||'#6b7280'}" title="${ev.title}"></div>`).join('')}</div>
    </div>`;
  }

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Calendar</h2><p>School events, holidays and schedules</p></div>
    </div>
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <button class="btn btn-secondary btn-sm" onclick="renderCalendar(${month===0?year-1:year},${month===0?11:month-1})">‹ Prev</button>
        <strong style="font-size:15px;">${monthName}</strong>
        <button class="btn btn-secondary btn-sm" onclick="renderCalendar(${month===11?year+1:year},${month===11?0:month+1})">Next ›</button>
      </div>
      <div class="cal-grid">
        ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="cal-header">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:12px;">Events in ${monthName}</div>
      ${monthEvents.length === 0 ? '<p style="color:var(--text3);font-size:14px;">No events this month.</p>' : `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${monthEvents.sort((a,b)=>a.date.localeCompare(b.date)).map(ev=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--bg);border-radius:8px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${typeColors[ev.type]||'#6b7280'};flex-shrink:0;"></div>
            <div style="flex:1;">
              <div style="font-size:14px;font-weight:600;">${ev.title}</div>
              <div style="font-size:12px;color:var(--text3);">${formatDate(ev.date)} · <span style="text-transform:capitalize;">${ev.type}</span>${ev.description?' · '+ev.description:''}</div>
            </div>
            <button class="btn btn-danger btn-sm" onclick="removeEvent('${ev.id}',${year},${month})">Delete</button>
          </div>
        `).join('')}
      </div>`}
    </div>
  `;
}

function openEventModal(preDate='') {
  openModal('Add Event', `
    <form onsubmit="submitEvent(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">Title <span class="required">*</span></label>
        <input class="form-input" name="title" placeholder="Eid Holiday, Final Exams…" required />
      </div>
      <div class="form-group">
        <label class="form-label">Date <span class="required">*</span></label>
        <input class="form-input" name="date" type="date" value="${preDate||today()}" required />
      </div>
      <div class="form-group">
        <label class="form-label">Type</label>
        <select class="form-select" name="type">
          <option value="event">Event</option>
          <option value="holiday">Holiday</option>
          <option value="exam">Exam</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input class="form-input" name="description" placeholder="Optional details…" />
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Event</button>
      </div>
    </form>
  `);
}

function submitEvent(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const ev = DB.push('events', { title: fd.get('title'), date: fd.get('date'), type: fd.get('type'), description: fd.get('description') });
  closeModal();
  toast('Event added!', 'success');
  const d = new Date(ev.date + 'T00:00:00');
  renderCalendar(d.getFullYear(), d.getMonth());
}

function removeEvent(id, year, month) {
  if (!confirm('Delete this event?')) return;
  DB.remove('events', id);
  toast('Event removed.', '');
  renderCalendar(year, month);
}

// =============================================
// PAGE: QUIZ BUILDER
// =============================================
const _quizQuestions = [];

function quizzes() {
  const list = DB.getList('quizzes');
  const classes = DB.getList('classes');
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openNewQuizModal()">+ New Quiz</button>`;
  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Quiz Builder</h2><p>Create and print quizzes for your classes</p></div>
    </div>
    ${list.length === 0 ? `
      <div class="empty-state"><div class="empty-state-icon">📝</div><h3>No quizzes yet</h3><p>Create your first quiz to get started.</p><button class="btn btn-primary" onclick="openNewQuizModal()">+ New Quiz</button></div>` : `
      <div class="card-grid">
        ${list.map(q => `
          <div class="card">
            <div style="font-size:28px;margin-bottom:8px;">📝</div>
            <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${q.title}</div>
            <div style="font-size:12px;color:var(--text3);margin-bottom:14px;">${classMap[q.classId]||'No class'} · ${q.questions.length} question${q.questions.length!==1?'s':''}</div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn-primary btn-sm" onclick="printQuiz('${q.id}')">🖨️ Print</button>
              <button class="btn btn-danger btn-sm" onclick="removeQuiz('${q.id}')">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>`}
  `;
}

function openNewQuizModal() {
  _quizQuestions.length = 0;
  const classes = DB.getList('classes');
  openModal('New Quiz', `
    <div class="form-grid">
      <div class="form-group">
        <label class="form-label">Quiz Title <span class="required">*</span></label>
        <input class="form-input" id="quizTitle" placeholder="Week 3 Islamic Studies Quiz" />
      </div>
      <div class="form-group">
        <label class="form-label">Class</label>
        <select class="form-select" id="quizClassId">
          <option value="">Select class…</option>
          ${classes.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin:16px 0;border-top:1px solid var(--border);padding-top:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong style="font-size:14px;">Questions</strong>
        <button class="btn btn-secondary btn-sm" type="button" onclick="addQuizQuestion()">+ Add Question</button>
      </div>
      <div id="quizQList"><p style="color:var(--text3);font-size:13px;">No questions yet.</p></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" type="button" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" type="button" onclick="saveQuiz()">Save Quiz</button>
    </div>
  `);
}

function addQuizQuestion() {
  _quizQuestions.push({ id: Date.now(), q:'', type:'mc', options:['','','',''], answer:'' });
  renderQuizQuestions();
}

function renderQuizQuestions() {
  const c = document.getElementById('quizQList');
  if (!c) return;
  if (_quizQuestions.length === 0) { c.innerHTML = '<p style="color:var(--text3);font-size:13px;">No questions yet.</p>'; return; }
  c.innerHTML = _quizQuestions.map((q,i) => `
    <div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:10px;border:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong style="font-size:13px;">Q${i+1}</strong>
        <button class="btn btn-danger btn-sm" type="button" onclick="removeQuizQ(${q.id})">×</button>
      </div>
      <input class="form-input" placeholder="Question text…" value="${q.q||''}"
        oninput="updateQuizQ(${q.id},'q',this.value)" style="margin-bottom:8px;" />
      <select class="form-select" onchange="updateQuizQ(${q.id},'type',this.value)" style="margin-bottom:8px;">
        <option value="mc" ${q.type==='mc'?'selected':''}>Multiple Choice</option>
        <option value="tf" ${q.type==='tf'?'selected':''}>True / False</option>
        <option value="sa" ${q.type==='sa'?'selected':''}>Short Answer</option>
      </select>
      ${q.type==='mc'?q.options.map((o,oi)=>`
        <div style="display:flex;gap:6px;margin-bottom:5px;align-items:center;">
          <input type="radio" name="ans_${q.id}" value="${oi}" ${q.answer==oi?'checked':''} onchange="updateQuizQ(${q.id},'answer',this.value)" />
          <input class="form-input" placeholder="Option ${oi+1}" value="${o}" oninput="updateQuizOpt(${q.id},${oi},this.value)" style="flex:1;" />
        </div>`).join('')+`<p style="font-size:11px;color:var(--text3);margin-top:2px;">Select radio = correct answer</p>`:
      q.type==='tf'?`<div style="display:flex;gap:16px;">
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;"><input type="radio" name="ans_${q.id}" value="True" ${q.answer==='True'?'checked':''} onchange="updateQuizQ(${q.id},'answer',this.value)" /> True</label>
        <label style="display:flex;align-items:center;gap:5px;font-size:13px;"><input type="radio" name="ans_${q.id}" value="False" ${q.answer==='False'?'checked':''} onchange="updateQuizQ(${q.id},'answer',this.value)" /> False</label>
      </div>`:
      `<p style="font-size:12px;color:var(--text3);">Students write their answer in the space provided.</p>`}
    </div>
  `).join('');
}

function updateQuizQ(id, field, val) {
  const q = _quizQuestions.find(q=>q.id==id);
  if (q) { q[field]=val; if(field==='type') renderQuizQuestions(); }
}
function updateQuizOpt(qId, oi, val) {
  const q = _quizQuestions.find(q=>q.id==qId);
  if (q) q.options[oi]=val;
}
function removeQuizQ(id) {
  const idx = _quizQuestions.findIndex(q=>q.id==id);
  if (idx>=0) _quizQuestions.splice(idx,1);
  renderQuizQuestions();
}
function saveQuiz() {
  const title = document.getElementById('quizTitle')?.value.trim();
  const classId = document.getElementById('quizClassId')?.value;
  if (!title) { toast('Enter a quiz title.','error'); return; }
  if (_quizQuestions.length === 0) { toast('Add at least one question.','error'); return; }
  DB.push('quizzes', { title, classId, createdAt: today(), questions: JSON.parse(JSON.stringify(_quizQuestions)) });
  closeModal();
  toast('Quiz saved!','success');
  quizzes();
}
function removeQuiz(id) {
  if (!confirm('Delete this quiz?')) return;
  DB.remove('quizzes', id);
  toast('Quiz deleted.','');
  quizzes();
}
function printQuiz(id) {
  const q = DB.find('quizzes', id);
  const cls = q.classId ? DB.find('classes', q.classId) : null;
  const user = getUser();
  const w = window.open('','_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${q.title}</title>
<style>body{font-family:Arial,sans-serif;padding:40px;color:#111;max-width:680px;margin:0 auto;}
.hdr{border-bottom:2px solid #0d9488;padding-bottom:12px;margin-bottom:22px;}
.school{font-size:12px;color:#6b7280;}.title{font-size:22px;font-weight:800;color:#0d9488;}
.meta{font-size:12px;color:#6b7280;margin-top:4px;}
.sinfo{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:18px 0;}
.field{border-bottom:1px solid #374151;min-height:24px;padding:4px 0;}.fl{font-size:11px;color:#6b7280;}
.q{margin-bottom:22px;}.qt{font-size:14px;font-weight:600;margin-bottom:8px;}
.opt{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:13px;}
.circle{width:16px;height:16px;border:1.5px solid #374151;border-radius:50%;flex-shrink:0;}
.saline{border-bottom:1px solid #d1d5db;margin:6px 0;height:26px;}
@media print{.no-print{display:none;}}
.pbtn{position:fixed;top:16px;right:16px;background:#0d9488;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;}</style></head><body>
<button class="pbtn no-print" onclick="window.print()">🖨️ Print</button>
<div class="hdr"><div class="school">${user.schoolName||'My School'}</div>
<div class="title">${q.title}</div>
<div class="meta">${cls?cls.name:''} &nbsp;·&nbsp; ${q.questions.length} Questions &nbsp;·&nbsp; Date: ___________</div></div>
<div class="sinfo"><div><div class="fl">Student Name</div><div class="field"></div></div><div><div class="fl">Score</div><div class="field"></div></div></div>
${q.questions.map((qn,i)=>`<div class="q"><div class="qt">${i+1}. ${qn.q||'[Question]'}</div>
${qn.type==='mc'?qn.options.filter(o=>o).map(o=>`<div class="opt"><div class="circle"></div>${o}</div>`).join(''):
qn.type==='tf'?`<div class="opt"><div class="circle"></div>True</div><div class="opt"><div class="circle"></div>False</div>`:
`<div class="saline"></div><div class="saline"></div><div class="saline"></div>`}
</div>`).join('')}
</body></html>`);
  w.document.close();
}

// =============================================
// PAGE: STAFF & PERMISSIONS
// =============================================
function staff() {
  const staffList = DB.getList('staff');
  const classes = DB.getList('classes');
  const classMap = Object.fromEntries(classes.map(c=>[c.id, c.name]));

  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openAddStaffModal()">+ Add Staff</button>`;
  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Staff & Permissions</h2><p>Manage teachers and staff access</p></div>
    </div>
    <div style="background:var(--yellow-bg);border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13.5px;color:#92400e;">
      <strong>How it works:</strong> Staff members use their email + password at the main login page. Teachers see only their assigned classes. Viewers have read-only access.
    </div>
    ${staffList.length === 0 ? `
      <div class="empty-state"><div class="empty-state-icon">👤</div><h3>No staff yet</h3><p>Add teachers and staff to give them their own login.</p><button class="btn btn-primary" onclick="openAddStaffModal()">+ Add Staff</button></div>` : `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Classes</th><th></th></tr></thead>
            <tbody>
              ${staffList.map(s=>`
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td style="color:var(--text3)">${s.email}</td>
                  <td><span class="badge ${s.role==='admin'?'badge-green':s.role==='teacher'?'badge-blue':'badge-gray'}" style="text-transform:capitalize;">${s.role}</span></td>
                  <td style="font-size:12px;color:var(--text3);">${s.role==='teacher'?(s.classIds||[]).map(id=>classMap[id]).filter(Boolean).join(', ')||'All':'All'}</td>
                  <td><button class="btn btn-danger btn-sm" onclick="removeStaff('${s.id}')">Remove</button></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`}
  `;
}

function openAddStaffModal() {
  const classes = DB.getList('classes');
  openModal('Add Staff Member', `
    <form onsubmit="submitStaff(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">Full Name <span class="required">*</span></label>
        <input class="form-input" name="name" placeholder="Ustadh Ahmad Malik" required />
      </div>
      <div class="form-group">
        <label class="form-label">Email <span class="required">*</span></label>
        <input class="form-input" name="email" type="email" placeholder="ahmad@school.edu" required />
      </div>
      <div class="form-group">
        <label class="form-label">Password <span class="required">*</span></label>
        <input class="form-input" name="password" type="password" placeholder="Min 6 characters" minlength="6" required />
      </div>
      <div class="form-group">
        <label class="form-label">Role <span class="required">*</span></label>
        <select class="form-select" name="role" required onchange="document.getElementById('classGrp').style.display=this.value==='teacher'?'':'none'">
          <option value="teacher">Teacher — sees assigned classes only</option>
          <option value="viewer">Viewer — read-only, sees everything</option>
          <option value="admin">Admin — full access</option>
        </select>
      </div>
      <div class="form-group" id="classGrp">
        <label class="form-label">Assigned Classes</label>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:150px;overflow-y:auto;padding:4px 0;">
          ${classes.length===0?'<p style="font-size:13px;color:var(--text3);">No classes added yet.</p>':
            classes.map(c=>`<label style="display:flex;align-items:center;gap:8px;font-size:13px;"><input type="checkbox" name="classIds" value="${c.id}" />${c.name}</label>`).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Staff Member</button>
      </div>
    </form>
  `);
}

function submitStaff(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = fd.get('email').trim().toLowerCase();
  if (DB.getList('staff').find(s=>s.email===email)) { toast('Email already in use.','error'); return; }
  if (getUser().email === email) { toast('That email belongs to the admin account.','error'); return; }
  DB.push('staff', { name: fd.get('name'), email, password: fd.get('password'), role: fd.get('role'), classIds: fd.getAll('classIds') });
  closeModal();
  toast('Staff member added!','success');
  staff();
}

function removeStaff(id) {
  if (!confirm('Remove this staff member?')) return;
  DB.remove('staff', id);
  toast('Removed.','');
  staff();
}

// =============================================
// PAGE: PARENT PORTAL (settings section)
// =============================================
function openAddParentModal() {
  const students = DB.getList('students').filter(s=>s.status==='active');
  openModal('Add Parent', `
    <form onsubmit="submitParent(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">Parent Name <span class="required">*</span></label>
        <input class="form-input" name="name" placeholder="Fatima Hassan" required />
      </div>
      <div class="form-group">
        <label class="form-label">Email <span class="required">*</span></label>
        <input class="form-input" name="email" type="email" placeholder="fatima@example.com" required />
      </div>
      <div class="form-group">
        <label class="form-label">Password <span class="required">*</span></label>
        <input class="form-input" name="password" type="password" placeholder="Min 6 characters" minlength="6" required />
      </div>
      <div class="form-group">
        <label class="form-label">Their Children</label>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto;padding:4px 0;">
          ${students.length===0?'<p style="font-size:13px;color:var(--text3);">No active students yet.</p>':
            students.map(s=>`<label style="display:flex;align-items:center;gap:8px;font-size:13px;"><input type="checkbox" name="studentIds" value="${s.id}" />${s.firstName} ${s.lastName}</label>`).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Parent</button>
      </div>
    </form>
  `);
}

function submitParent(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const email = fd.get('email').trim().toLowerCase();
  if (DB.getList('parents').find(p=>p.email===email)) { toast('Email already in use.','error'); return; }
  DB.push('parents', { name: fd.get('name'), email, password: fd.get('password'), studentIds: fd.getAll('studentIds') });
  closeModal();
  toast('Parent added!','success');
  settings();
}

function removeParent(id) {
  if (!confirm('Remove this parent account?')) return;
  DB.remove('parents', id);
  toast('Parent removed.','');
  settings();
}

// =============================================
// PAGE: ADMINS
// =============================================
function admins() {
  const user = getUser();
  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Dashboard › People</div>
        <h2>Admins</h2>
        <p>Manage administrator accounts</p>
      </div>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
          <tbody>
            <tr>
              <td><div style="display:flex;align-items:center;gap:10px;"><div class="student-avatar" style="background:#2563eb;">${(user.firstName?.[0]||'A').toUpperCase()}</div><strong>${user.firstName||''} ${user.lastName||''}</strong></div></td>
              <td style="color:var(--text3);">${user.email||'—'}</td>
              <td><span class="badge badge-blue">Admin</span></td>
              <td><span class="badge badge-green">Active</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// =============================================
// PAGE: PARENTS
// =============================================
function parents() {
  const parentList = DB.getList('parents');
  const students = DB.getList('students');
  document.getElementById('topbarActions').innerHTML = `
    <button class="btn btn-secondary" onclick="toast('Archive coming soon.','')">
      <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14" style="margin-right:4px;"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4zM3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/></svg>
      Archived
    </button>
    <button class="btn btn-primary" onclick="openAddParentModal()">+ Add Parent</button>
  `;
  document.getElementById('mainContent').innerHTML = `
    <div class="page-header" style="align-items:flex-start;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        <button onclick="navigate('dashboard')" style="margin-top:4px;color:var(--text4);background:none;border:none;cursor:pointer;font-size:18px;line-height:1;">‹</button>
        <div>
          <div class="breadcrumb">Dashboard › Parents</div>
          <h2 style="font-size:26px;font-weight:800;">Parents</h2>
          <p>Manage parent accounts and contacts</p>
        </div>
      </div>
    </div>

    ${parentList.length === 0 ? `
      <div class="parents-empty-card">
        <div class="parents-empty-icon">
          <svg viewBox="0 0 24 24" fill="#2563eb" width="36" height="36"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
        </div>
        <h3 style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:6px;">No parents</h3>
        <p style="font-size:13.5px;color:var(--text3);max-width:280px;text-align:center;margin-bottom:20px;">Get started by adding your first parent to the system.</p>
        <button class="btn btn-primary" style="background:#2563eb;border-color:#2563eb;" onclick="openAddParentModal()">+ Add Parent</button>
      </div>
    ` : `
      <div class="card">
        <div class="table-wrap"><table>
          <thead><tr><th>Parent</th><th>Email</th><th>Children</th><th>Actions</th></tr></thead>
          <tbody>
            ${parentList.map(p => {
              const children = students.filter(s => (p.studentIds||[]).includes(String(s.id)));
              return `<tr>
                <td><div style="display:flex;align-items:center;gap:10px;"><div class="student-avatar" style="background:#8b5cf6;">${(p.name?.[0]||'P').toUpperCase()}</div><strong>${p.name||'—'}</strong></div></td>
                <td style="color:var(--text3);">${p.email||'—'}</td>
                <td>${children.map(c=>`${c.firstName} ${c.lastName}`).join(', ')||'—'}</td>
                <td>
                  <button class="btn btn-danger btn-sm" onclick="removeParentDirect('${p.id}')">Remove</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </div>
    `}
  `;
}

function removeParentDirect(id) {
  if (!confirm('Remove this parent account?')) return;
  DB.remove('parents', id);
  toast('Parent removed.', '');
  parents();
}

// =============================================
// PAGE: INFRACTIONS (Behavior Tracking)
// =============================================
let _infractionTab = 'all';

function infractions() {
  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openNewInfractionModal()">+ New Infraction</button>`;
  renderInfractions();
}

function renderInfractions() {
  const all = DB.getList('infractions');
  const tabs = ['all','reported','under-review','resolved'];
  const tabLabels = { all:'All', reported:'Reported', 'under-review':'Under Review', resolved:'Resolved' };
  const filtered = _infractionTab === 'all' ? all : all.filter(r => r.status === _infractionTab);

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Dashboard</div>
        <h2>Behavior Tracking</h2>
        <p>Manage and track student infractions</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-secondary" onclick="exportInfractionsCSV()">⬇ Export</button>
        <button class="btn btn-primary" onclick="openNewInfractionModal()">+ New Infraction</button>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:0;">
      ${tabs.map(t => `<button class="tab-btn ${_infractionTab===t?'active':''}" onclick="_infractionTab='${t}';renderInfractions();">${tabLabels[t]} <span style="font-size:11px;background:var(--bg2);border-radius:99px;padding:1px 6px;margin-left:3px;">${t==='all'?all.length:all.filter(r=>r.status===t).length}</span></button>`).join('')}
    </div>
    <div style="border-bottom:1px solid var(--border);margin-bottom:16px;"></div>

    <div class="card" style="margin-bottom:16px;">
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;">
        <div>
          <div style="font-size:12px;color:var(--text4);margin-bottom:4px;">Severity</div>
          <select class="form-select" onchange="renderInfractions()"><option>All Severities</option><option>Low</option><option>Medium</option><option>High</option></select>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text4);margin-bottom:4px;">Category</div>
          <select class="form-select" onchange="renderInfractions()"><option>All Categories</option><option>Behavior</option><option>Attendance</option><option>Academic</option><option>Other</option></select>
        </div>
        <button class="btn btn-secondary" style="display:flex;align-items:center;gap:6px;">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.553.894l-4 2A1 1 0 016 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/></svg>
          Filter
        </button>
      </div>
    </div>

    <div class="card">
      ${filtered.length === 0 ? `
        <div class="empty-state">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--bg2);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
            <svg viewBox="0 0 20 20" fill="currentColor" width="24" height="24" style="color:var(--text4);"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          </div>
          <h3>No infractions found</h3>
          <p>No behavior incidents have been recorded yet</p>
        </div>` : `
        <div class="table-wrap"><table>
          <thead><tr><th>STUDENT</th><th>CATEGORY</th><th>SEVERITY</th><th>DATE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
          <tbody>
            ${filtered.map(r => `
              <tr>
                <td><strong>${r.studentName||'—'}</strong><br><span style="font-size:12px;color:var(--text4);">${r.description||''}</span></td>
                <td><span class="badge badge-gray">${r.category||'Other'}</span></td>
                <td><span class="badge ${r.severity==='High'?'badge-red':r.severity==='Medium'?'badge-yellow':'badge-gray'}">${r.severity||'Low'}</span></td>
                <td style="color:var(--text3);">${formatDate(r.date)}</td>
                <td><span class="badge ${r.status==='resolved'?'badge-green':r.status==='under-review'?'badge-blue':'badge-yellow'}">${r.status||'reported'}</span></td>
                <td>
                  <select class="form-select" style="width:130px;font-size:12px;padding:4px 8px;" onchange="updateInfractionStatus('${r.id}',this.value)">
                    <option value="reported" ${r.status==='reported'?'selected':''}>Reported</option>
                    <option value="under-review" ${r.status==='under-review'?'selected':''}>Under Review</option>
                    <option value="resolved" ${r.status==='resolved'?'selected':''}>Resolved</option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table></div>`}
    </div>
  `;
}

function openNewInfractionModal() {
  const students = DB.getList('students').filter(s=>s.status==='active');
  openModal('New Infraction', `
    <form onsubmit="submitInfraction(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">Student <span class="required">*</span></label>
        <select class="form-select" name="studentId" required>
          <option value="">Select student…</option>
          ${students.map(s=>`<option value="${s.id}">${s.firstName} ${s.lastName}</option>`).join('')}
        </select>
      </div>
      <div class="form-grid form-grid-2">
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-select" name="category">
            <option>Behavior</option><option>Attendance</option><option>Academic</option><option>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Severity</label>
          <select class="form-select" name="severity">
            <option>Low</option><option>Medium</option><option>High</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Date</label>
        <input class="form-input" name="date" type="date" value="${today()}" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" name="description" placeholder="Describe what happened…"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Submit</button>
      </div>
    </form>
  `);
}

function submitInfraction(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const sid = fd.get('studentId');
  const s = DB.find('students', sid);
  DB.push('infractions', {
    studentId: sid, studentName: s ? `${s.firstName} ${s.lastName}` : '—',
    category: fd.get('category'), severity: fd.get('severity'),
    date: fd.get('date'), description: fd.get('description'), status: 'reported'
  });
  closeModal();
  toast('Infraction recorded.', 'success');
  renderInfractions();
}

function updateInfractionStatus(id, status) {
  DB.update('infractions', id, { status });
  toast('Status updated.', 'success');
}

function exportInfractionsCSV() {
  const rows = DB.getList('infractions');
  const csv = ['Student,Category,Severity,Date,Status,Description',
    ...rows.map(r => `"${r.studentName}","${r.category}","${r.severity}","${r.date}","${r.status}","${(r.description||'').replace(/"/g,'""')}"`)
  ].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = 'infractions.csv'; a.click();
}

// =============================================
// PAGE: BILLING
// =============================================
function billing() {
  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-secondary" onclick="toast('Archive coming soon.','')">Archive</button>`;
  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Dashboard</div>
        <h2>Billing</h2>
        <p>Manage invoices and collect tuition payments</p>
      </div>
    </div>
    <div class="card">
      <div style="max-width:460px;margin:40px auto;text-align:center;padding:20px;">
        <div style="width:72px;height:72px;border-radius:16px;background:#2563eb;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
          <svg viewBox="0 0 24 24" fill="white" width="36" height="36"><path d="M4 4h16a2 2 0 012 2v1H2V6a2 2 0 012-2zm-2 5h20v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9zm5 5a1 1 0 100 2h2a1 1 0 100-2H7z"/></svg>
        </div>
        <h3 style="font-size:20px;font-weight:700;margin-bottom:8px;">Set Up Payment Collection</h3>
        <p style="color:var(--text3);font-size:14px;margin-bottom:24px;line-height:1.6;">Connect your payment account to start collecting tuition payments from parents. Payments go directly to your bank account.</p>
        <div style="display:flex;justify-content:center;gap:28px;margin-bottom:28px;">
          <div style="text-align:center;">
            <div style="width:44px;height:44px;border-radius:10px;background:#eff6ff;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">
              <svg viewBox="0 0 20 20" fill="#2563eb" width="22" height="22"><path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            </div>
            <div style="font-size:12.5px;font-weight:600;">Secure</div>
            <div style="font-size:11px;color:var(--text4);">PCI compliant</div>
          </div>
          <div style="text-align:center;">
            <div style="width:44px;height:44px;border-radius:10px;background:#f0fdf4;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">
              <svg viewBox="0 0 20 20" fill="#16a34a" width="22" height="22"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>
            </div>
            <div style="font-size:12.5px;font-weight:600;">Fast Payouts</div>
            <div style="font-size:11px;color:var(--text4);">2-day transfers</div>
          </div>
          <div style="text-align:center;">
            <div style="width:44px;height:44px;border-radius:10px;background:#fefce8;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;">
              <svg viewBox="0 0 20 20" fill="#ca8a04" width="22" height="22"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/></svg>
            </div>
            <div style="font-size:12.5px;font-weight:600;">All Cards</div>
            <div style="font-size:11px;color:var(--text4);">Visa, MC, Amex</div>
          </div>
        </div>
        <button class="btn btn-primary" style="padding:11px 28px;font-size:14.5px;" onclick="toast('Payment setup coming soon!','')">→ Get Started</button>
      </div>
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-header">
        <div class="card-title">💳 Tuition Payments</div>
        <button class="btn btn-secondary btn-sm" onclick="navigate('tuition')">View Tuition →</button>
      </div>
      <div class="empty-state" style="padding:24px;">
        <p style="color:var(--text3);">Set up payment collection above to start accepting tuition payments.</p>
      </div>
    </div>
  `;
}

// =============================================
// PAGE: REPORT BUILDER
// =============================================
let _reportTab = 'all';

function reportBuilder() {
  document.getElementById('topbarActions').innerHTML = `
    <button class="btn btn-secondary" onclick="toast('Saved reports coming soon.','')">Saved</button>
    <button class="btn btn-secondary" onclick="toast('Report cards coming soon.','')">Report Cards</button>
  `;
  renderReportBuilder();
}

function renderReportBuilder() {
  const tabs = ['all','attendance','grades','directory','hifz','behavior','billing','profile'];
  const reports = [
    { name: 'Teacher Compliance', desc: 'See which teachers are recording attendance and which are falling behind.', cat: 'attendance', starred: true },
    { name: 'Daily Attendance', desc: "Today's attendance for every class on one page.", cat: 'attendance' },
    { name: 'Student Summary', desc: 'Per-student attendance rates and trends.', cat: 'attendance' },
    { name: 'Class Rates', desc: 'Attendance rate broken down by class.', cat: 'attendance' },
    { name: 'Chronic Absentees', desc: 'Students with 5 or more absences.', cat: 'attendance' },
    { name: 'Below Threshold', desc: 'Students whose attendance rate fell under a chosen percentage.', cat: 'attendance' },
    { name: 'Teacher Log', desc: 'Days each teacher has marked attendance.', cat: 'attendance' },
    { name: 'Class Grades', desc: 'All grades for every assignment in a class.', cat: 'grades' },
    { name: 'Class Averages', desc: 'Average grade per assignment in a class.', cat: 'grades' },
    { name: 'Failing Students', desc: 'Students currently failing based on grade cutoff.', cat: 'grades', starred: true },
    { name: 'Top Students', desc: 'Top-performing students across the school.', cat: 'grades' },
    { name: 'Distribution', desc: 'Grade distribution (A/B/C/D/F) by class.', cat: 'grades' },
    { name: 'Student Directory', desc: 'All active students with contact info and parent contacts.', cat: 'directory' },
    { name: 'Parent Directory', desc: 'All active parents and their children in class.', cat: 'directory' },
    { name: 'Class Roster', desc: 'Students assigned to each class with contact info.', cat: 'directory' },
    { name: 'Hifz Progress', desc: 'All students with Hifz info and assigned teacher.', cat: 'hifz' },
    { name: 'Infraction Log', desc: 'All infractions across the school.', cat: 'behavior' },
    { name: 'Repeat Offenders', desc: 'Students with infractions above a set number.', cat: 'behavior' },
    { name: 'Pending Follow Up', desc: 'Infractions with status "in progress"', cat: 'behavior' },
    { name: 'School Profile', desc: 'All information associated with your school.', cat: 'profile' },
  ];

  const filtered = _reportTab === 'all' ? reports : reports.filter(r => r.cat === _reportTab);
  const catColors = { attendance:'#f59e0b', grades:'#3b82f6', directory:'#8b5cf6', hifz:'#10b981', behavior:'#ef4444', billing:'#06b6d4', profile:'#6b7280' };

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <div class="breadcrumb">Dashboard</div>
        <h2>Reports</h2>
        <p>Generate attendance, grade, billing, roster &amp; Hifz reports.</p>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:0;">
      <div class="tabs" style="margin-bottom:0;border-bottom:none;flex-wrap:wrap;">
        ${tabs.map(t=>t==='all'?
          `<button class="tab-btn ${_reportTab==='all'?'active':''}" onclick="_reportTab='all';renderReportBuilder();">All</button>`:
          `<button class="tab-btn ${_reportTab===t?'active':''}" onclick="_reportTab='${t}';renderReportBuilder();">${t.charAt(0).toUpperCase()+t.slice(1)}</button>`
        ).join('')}
      </div>
      <div class="search-input-wrap" style="max-width:220px;">
        <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        <input class="form-input search-input" type="text" placeholder="Search reports" />
      </div>
    </div>
    <div style="border-bottom:1px solid var(--border);margin-bottom:16px;"></div>

    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>REPORT</th><th>CATEGORY</th><th>ACTION</th></tr></thead>
          <tbody>
            ${filtered.map(r => `
              <tr>
                <td>
                  <div style="display:flex;align-items:flex-start;gap:10px;">
                    <div style="width:28px;height:28px;border-radius:6px;background:${catColors[r.cat]}22;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
                      <div style="width:8px;height:8px;border-radius:50%;background:${catColors[r.cat]};"></div>
                    </div>
                    <div>
                      <div style="font-weight:600;font-size:13.5px;">${r.name}${r.starred?` <span style="font-size:10px;background:#fef9c3;color:#854d0e;border-radius:4px;padding:1px 5px;margin-left:4px;">⭐</span>`:''}</div>
                      <div style="font-size:12px;color:var(--text3);margin-top:2px;">${r.desc}</div>
                    </div>
                  </div>
                </td>
                <td><span style="font-size:12px;font-weight:600;color:${catColors[r.cat]};">${r.cat.charAt(0).toUpperCase()+r.cat.slice(1)}</span></td>
                <td><button class="btn btn-primary btn-sm" onclick="runReport('${r.name}')">Run →</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function runReport(name) {
  toast(`Running "${name}" report…`, 'success');
}
