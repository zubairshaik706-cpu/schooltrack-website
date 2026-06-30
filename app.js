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
function getUser() { return DB.get('user'); }
function requireAuth() {
  const user = getUser();
  if (!user) { window.location.href = 'login.html'; return null; }
  return user;
}
function logout() { localStorage.removeItem('st_user'); window.location.href = 'login.html'; }

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
  document.getElementById('schoolName').textContent = user.schoolName || 'My School';

  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  document.getElementById('menuToggle').addEventListener('click', () => sidebar.classList.toggle('open'));
  document.getElementById('sidebarClose').addEventListener('click', () => sidebar.classList.remove('open'));

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });

  // Nav routing
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigate(item.dataset.page);
      if (window.innerWidth <= 900) sidebar.classList.remove('open');
    });
  });

  // Load initial page
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigate(hash);
});

function navigate(page) {
  document.querySelectorAll('.nav-item[data-page]').forEach(i => i.classList.toggle('active', i.dataset.page === page));
  window.location.hash = page;

  const titles = {
    dashboard: 'Overview', students: 'Students', enrollment: 'Enrollment',
    classes: 'Classes', attendance: 'Attendance', gradebook: 'Gradebook',
    hifz: 'Hifz Tracking', messages: 'Messages', settings: 'Settings'
  };
  const pageLabel = titles[page] || page;
  document.getElementById('pageTitle').textContent = pageLabel;
  document.title = pageLabel + ' – SchoolTrack';
  document.getElementById('topbarActions').innerHTML = '';

  const pages = { dashboard, students, enrollment, classes, attendance, gradebook, hifz, messages, settings };
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
function formatDate(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function today() { return new Date().toISOString().split('T')[0]; }

// =============================================
// PAGE: DASHBOARD
// =============================================
function dashboard() {
  const students = DB.getList('students');
  const classes = DB.getList('classes');
  const grades = DB.getList('grades');
  const active = students.filter(s => s.status === 'active').length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const recent = [];
  if (students.length > 0) recent.push({ icon: '👥', text: `${students.length} student${students.length !== 1 ? 's' : ''} enrolled across ${classes.length} class${classes.length !== 1 ? 'es' : ''}`, time: 'Total' });
  if (grades.length > 0) recent.push({ icon: '📊', text: `${grades.length} grade entr${grades.length !== 1 ? 'ies' : 'y'} recorded`, time: 'Gradebook' });
  if (classes.length > 0) recent.push({ icon: '🏫', text: `${classes.length} class${classes.length !== 1 ? 'es' : ''} active — ${students.length} student${students.length !== 1 ? 's' : ''} total`, time: 'Classes' });
  recent.push({ icon: '🔔', text: 'Welcome to SchoolTrack!', time: 'Setup complete' });

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div>
        <h2>${greeting} 👋</h2>
        <p>Here's what's happening at ${getUser().schoolName || 'your school'} today.</p>
      </div>
      <button class="btn btn-primary" onclick="navigate('enrollment')">+ Enroll Student</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-label">Total Students</div>
        <div class="stat-value">${students.length}</div>
        <div class="stat-sub">${active} active</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🏫</div>
        <div class="stat-label">Classes</div>
        <div class="stat-value">${classes.length}</div>
        <div class="stat-sub">Active programs</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-label">Attendance Records</div>
        <div class="stat-value">${DB.getList('attendance').length || '—'}</div>
        <div class="stat-sub">${DB.getList('attendance').length ? 'Total entries' : 'None yet'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📈</div>
        <div class="stat-label">Avg. Grade</div>
        <div class="stat-value">${grades.length ? Math.round(grades.reduce((a,g)=>a+g.score,0)/grades.length) + '%' : '—'}</div>
        <div class="stat-sub">${grades.length ? 'All subjects' : 'No grades yet'}</div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Recent Activity</div>
        </div>
        ${recent.map(r => `
          <div class="activity-item">
            <span style="font-size:16px;flex-shrink:0;">${r.icon}</span>
            <div>
              <div class="activity-text">${r.text}</div>
              <div class="activity-time">${r.time}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Students by Class</div>
          <button class="btn btn-secondary btn-sm" onclick="navigate('classes')">Manage</button>
        </div>
        ${classes.length === 0
          ? `<div class="empty-state"><p>No classes yet. <a href="#" onclick="event.preventDefault();navigate('classes')" style="color:var(--primary)">Add one →</a></p></div>`
          : classes.map(c => {
              const cnt = DB.getList('students').filter(s => s.classId === c.id).length;
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
                  <div>
                    <div style="font-size:13.5px;font-weight:600;">${c.name}</div>
                    <div style="font-size:12px;color:var(--text3);">${c.teacher}</div>
                  </div>
                  <span class="badge badge-blue">${cnt} students</span>
                </div>
              `;
            }).join('')
        }
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

function renderStudentList(filterStatus = 'active', search = '') {
  _currentStudentFilter = filterStatus;
  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openAddStudentModal()">+ Add Student</button>`;

  let list = DB.getList('students');
  if (filterStatus !== 'all') list = list.filter(s => s.status === filterStatus);
  if (search) list = list.filter(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()));

  const classes = DB.getList('classes');
  const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Students</h2><p>${DB.getList('students').length} total enrolled</p></div>
      <button class="btn btn-primary" onclick="openAddStudentModal()">+ Add Student</button>
    </div>

    <div class="tabs">
      <button class="tab-btn ${filterStatus==='active'?'active':''}" onclick="renderStudentList('active','')">Active</button>
      <button class="tab-btn ${filterStatus==='inactive'?'active':''}" onclick="renderStudentList('inactive','')">Inactive</button>
      <button class="tab-btn ${filterStatus==='all'?'active':''}" onclick="renderStudentList('all','')">All</button>
    </div>

    <div class="search-bar">
      <div class="search-input-wrap">
        <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        <input class="form-input search-input" type="text" placeholder="Search students…" oninput="renderStudentList('${filterStatus}', this.value)" value="${search}" />
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
  renderStudentList('active');
}

let _currentStudentFilter = 'active';
function removeStudent(id, fromModal = false) {
  if (!confirm('Remove this student? This cannot be undone.')) return;
  DB.remove('students', id);
  toast('Student removed.', '');
  if (fromModal) closeModal();
  renderStudentList(_currentStudentFilter);
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
      <button class="btn btn-primary" onclick="openEnrollmentForm()">+ Enroll Student</button>
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
  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openAddClassModal()">+ Add Class</button>`;
  const classList = DB.getList('classes');
  const students = DB.getList('students');

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Classes</h2><p>${classList.length} classes · ${students.length} students</p></div>
      <button class="btn btn-primary" onclick="openAddClassModal()">+ Add Class</button>
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
          const cnt = students.filter(s => s.classId === c.id).length;
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
// PAGE: ATTENDANCE
// =============================================
function attendance() {
  const attDate = today();
  // Clear any stale pending marks from previous session
  Object.keys(pendingAtt).forEach(k => delete pendingAtt[k]);

  document.getElementById('topbarActions').innerHTML = `
    <input type="date" class="form-input" id="attDate" value="${attDate}" onchange="renderAttendanceDate(this.value)" style="width:160px;padding:7px 10px;font-size:13px;" />
  `;

  renderAttendanceDate(attDate);
}

function renderAttendanceDate(date) {
  const classList = DB.getList('classes');
  const students = DB.getList('students');
  const records = DB.getList('attendance').filter(a => a.date === date);

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Attendance</h2><p>${formatDate(date)}</p></div>
      <button class="btn btn-primary" onclick="saveAllAttendance('${date}')">Save Attendance</button>
    </div>

    ${classList.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No classes yet</h3>
        <p>Add classes first before taking attendance.</p>
        <button class="btn btn-primary" onclick="navigate('classes')">Add Class</button>
      </div>` :
      `<div class="att-grid" id="attGrid">
        ${classList.map(cls => {
          const classStudents = students.filter(s => s.classId === cls.id && s.status === 'active');
          return `
            <div class="att-class-card">
              <div class="att-class-name">${cls.name} <span style="font-size:12px;color:var(--text3);font-weight:400;">— ${cls.teacher}</span></div>
              ${classStudents.length === 0
                ? `<p style="font-size:13px;color:var(--text3);">No students in this class.</p>`
                : classStudents.map(s => {
                    const rec = records.find(r => r.studentId == s.id);
                    const status = rec ? rec.status : '';
                    return `
                      <div class="att-student-row" data-student-id="${s.id}">
                        <div class="att-student-name">
                          <div class="student-avatar" style="width:26px;height:26px;font-size:10px;background:${avatarColor(s.firstName+s.lastName)}">${initials(s.firstName,s.lastName)}</div>
                          ${s.firstName} ${s.lastName}
                        </div>
                        <div class="att-btns">
                          <button class="att-btn att-btn-p ${status==='present'?'selected-p':''}" title="Present" onclick="markAtt(this,'${s.id}','present')">P</button>
                          <button class="att-btn att-btn-a ${status==='absent'?'selected-a':''}" title="Absent" onclick="markAtt(this,'${s.id}','absent')">A</button>
                          <button class="att-btn att-btn-l ${status==='late'?'selected-l':''}" title="Late" onclick="markAtt(this,'${s.id}','late')">L</button>
                        </div>
                      </div>
                    `;
                  }).join('')}
              <div style="margin-top:12px;display:flex;gap:6px;">
                <button class="btn btn-secondary btn-sm" onclick="markAllInClass('${cls.id}','present','${date}')">All Present</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>`
    }
  `;
}

// track pending att changes in memory
const pendingAtt = {};
function markAtt(btn, studentId, status) {
  const row = btn.closest('.att-student-row');
  row.querySelectorAll('.att-btn').forEach(b => b.className = b.className.replace(/selected-[pla]/g, ''));
  btn.classList.add('selected-' + status[0]);
  pendingAtt[studentId] = status;
}

function markAllInClass(classId, status, date) {
  const classStudents = DB.getList('students').filter(s => s.classId === classId && s.status === 'active');
  const studentIds = new Set(classStudents.map(s => String(s.id)));
  classStudents.forEach(s => { pendingAtt[s.id] = status; });
  // Update UI using data attributes instead of parsing onclick
  document.querySelectorAll('.att-student-row').forEach(row => {
    const sid = row.dataset.studentId;
    if (sid && studentIds.has(String(sid))) {
      row.querySelectorAll('.att-btn').forEach(b => b.className = b.className.replace(/selected-[pla]/g, ''));
      const target = row.querySelector(`.att-btn-${status[0]}`);
      if (target) target.classList.add('selected-' + status[0]);
    }
  });
}

function saveAllAttendance(date) {
  const existing = DB.getList('attendance').filter(a => a.date !== date);
  // Collect all marks from UI (source of truth — includes both clicked and pre-loaded records)
  const uiRecords = [];
  document.querySelectorAll('.att-student-row').forEach(row => {
    const sid = row.dataset.studentId;
    if (!sid) return;
    const selected = row.querySelector('.att-btn[class*="selected-"]');
    if (selected) {
      const st = selected.classList.contains('selected-p') ? 'present' : selected.classList.contains('selected-a') ? 'absent' : 'late';
      uiRecords.push({ id: Date.now() + Math.random(), studentId: sid, status: st, date });
    }
  });
  // Fall back to pendingAtt for any student not in UI (shouldn't happen, but safe)
  Object.entries(pendingAtt).forEach(([studentId, status]) => {
    if (!uiRecords.find(r => r.studentId == studentId)) {
      uiRecords.push({ id: Date.now() + Math.random(), studentId, status, date });
    }
  });
  DB.set('attendance', [...existing, ...uiRecords]);
  toast(`Attendance saved for ${formatDate(date)} ✓`, 'success');
}

// =============================================
// PAGE: GRADEBOOK
// =============================================
function gradebook() {
  const classList = DB.getList('classes');
  const students = DB.getList('students');
  const grades = DB.getList('grades');

  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openAddGradeModal()">+ Add Assignment</button>`;

  const subjects = [...new Set(grades.map(g => g.subject))];
  const activeSubject = subjects[0] || 'Islamic Studies';

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Gradebook</h2><p>Track assignments and grades</p></div>
      <button class="btn btn-primary" onclick="openAddGradeModal()">+ Add Assignment</button>
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
                const avg = Math.round(subGrades.reduce((a,g)=>a+g.score,0)/subGrades.length);
                const color = avg>=90?'var(--green)':avg>=70?'var(--text2)':'var(--red)';
                return `<td style="font-weight:600;color:${color}">${avg}%</td>`;
              });
              const allGrades = grades.filter(g => g.studentId == s.id);
              const overall = allGrades.length ? Math.round(allGrades.reduce((a,g)=>a+g.score,0)/allGrades.length) : null;
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
      <button class="btn btn-primary" onclick="openHifzModal()">+ Log Session</button>
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
  DB.push('hifz', { studentId, date: fd.get('date'), sabaq: fd.get('sabaq'), sabqi: fd.get('sabqi'), manzil: fd.get('manzil'), mistakes: fd.get('mistakes') ? parseInt(fd.get('mistakes')) : null, notes: fd.get('notes') });
  if (juz) DB.update('students', studentId, { juz: parseInt(juz) });
  closeModal();
  toast('Hifz session logged! 📖', 'success');
  hifz();
}

// =============================================
// PAGE: MESSAGES
// =============================================
function messages() {
  const msgs = DB.getList('messages');

  document.getElementById('topbarActions').innerHTML = `<button class="btn btn-primary" onclick="openMessageModal()">+ New Message</button>`;

  document.getElementById('mainContent').innerHTML = `
    <div class="page-header">
      <div><h2>Messages</h2><p>Log announcements and notes for your records</p></div>
      <button class="btn btn-primary" onclick="openMessageModal()">+ New Message</button>
    </div>

    <div class="card">
      ${msgs.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📣</div>
          <h3>No messages yet</h3>
          <p>Log your first announcement or message.</p>
          <button class="btn btn-primary" onclick="openMessageModal()">+ New Message</button>
        </div>` : `
        <div class="table-wrap">
          <table>
            <thead><tr><th>To</th><th>Subject</th><th>Message</th><th>Date</th><th></th></tr></thead>
            <tbody>
              ${msgs.slice().reverse().map(m => `
                <tr>
                  <td><span class="badge badge-blue">${m.to}</span></td>
                  <td><strong>${m.subject}</strong></td>
                  <td style="color:var(--text3);max-width:300px;">${m.body.substring(0,80)}${m.body.length>80?'…':''}</td>
                  <td style="color:var(--text3);font-size:12px;">${formatDate(m.date)}</td>
                  <td><button class="btn btn-danger btn-sm" onclick="removeMessage('${m.id}')">Delete</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`}
    </div>
  `;
}

function openMessageModal() {
  const classes = DB.getList('classes');
  const classOptions = classes.map(c => `<option>${c.name} — Parents</option>`).join('');
  openModal('New Message', `
    <form onsubmit="submitMessage(event)" class="form-grid">
      <div class="form-group">
        <label class="form-label">To <span class="required">*</span></label>
        <select class="form-select" name="to" required>
          <option value="">Select recipients…</option>
          <option>All Parents</option>
          <option>All Teachers</option>
          <option>All Students</option>
          ${classOptions}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Subject <span class="required">*</span></label>
        <input class="form-input" name="subject" required placeholder="School Announcement" />
      </div>
      <div class="form-group">
        <label class="form-label">Message <span class="required">*</span></label>
        <textarea class="form-textarea" name="body" required style="min-height:120px;" placeholder="Dear parents, we would like to inform you…"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Message</button>
      </div>
    </form>
  `);
}

function submitMessage(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  DB.push('messages', { to: fd.get('to'), subject: fd.get('subject'), body: fd.get('body'), date: today() });
  closeModal();
  toast('Message saved!', 'success');
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
function settings() {
  const user = getUser();
  document.getElementById('mainContent').innerHTML = `
    <div class="page-header"><h2>Settings</h2></div>

    <div style="max-width:560px;display:flex;flex-direction:column;gap:16px;">
      <div class="card">
        <div class="card-title" style="margin-bottom:16px;">School Information</div>
        <form onsubmit="saveSettings(event)" class="form-grid">
          <div class="form-group">
            <label class="form-label">School Name</label>
            <input class="form-input" name="schoolName" value="${user.schoolName || ''}" placeholder="Al-Noor Academy" />
          </div>
          <div class="form-group">
            <label class="form-label">Admin Name</label>
            <input class="form-input" value="${user.firstName + ' ' + user.lastName}" readonly style="background:var(--bg);color:var(--text3);" />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" value="${user.email || ''}" readonly style="background:var(--bg);color:var(--text3);" />
          </div>
          <div>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-title" style="margin-bottom:16px;">Change Password</div>
        <form onsubmit="changePassword(event)" class="form-grid">
          <div class="form-group">
            <label class="form-label">Current Password</label>
            <input class="form-input" name="currentPw" type="password" placeholder="Enter current password" required />
          </div>
          <div class="form-group">
            <label class="form-label">New Password</label>
            <input class="form-input" name="newPw" type="password" placeholder="Min 6 characters" minlength="6" required />
          </div>
          <div class="form-group">
            <label class="form-label">Confirm New Password</label>
            <input class="form-input" name="confirmPw" type="password" placeholder="Repeat new password" required />
          </div>
          <div>
            <button type="submit" class="btn btn-secondary">Update Password</button>
          </div>
        </form>
      </div>

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
        <div class="card-title" style="margin-bottom:4px;">Account</div>
        <p style="font-size:13px;color:var(--text3);margin-bottom:16px;">Logged in as <strong>${user.email}</strong></p>
        <button class="btn btn-danger" onclick="logout()">Log out</button>
      </div>
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
  const data = { students: DB.getList('students'), classes: DB.getList('classes'), grades: DB.getList('grades'), attendance: DB.getList('attendance'), hifz: DB.getList('hifz'), messages: DB.getList('messages') };
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
  if (!confirm('This will delete ALL students, classes, grades, and attendance. Are you sure?')) return;
  ['students','classes','grades','attendance','hifz','messages'].forEach(k => localStorage.removeItem('st_' + k));
  toast('All data cleared.', '');
  navigate('dashboard');
}
