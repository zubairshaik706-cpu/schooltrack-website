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
    hifz: 'Hifz Tracking', messages: 'Messages', settings: 'Settings',
    salah: 'Salah Tracker', tuition: 'Tuition', calendar: 'Calendar',
    quizzes: 'Quizzes', staff: 'Staff'
  };
  const pageLabel = titles[page] || page;
  document.getElementById('pageTitle').textContent = pageLabel;
  document.title = pageLabel + ' – SchoolTrack';
  document.getElementById('topbarActions').innerHTML = '';

  const pages = { dashboard, students, enrollment, classes, attendance, gradebook, hifz, messages, settings, salah, tuition, calendar, quizzes, staff };
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
      <button class="btn btn-primary" onclick="openAddStudentModal()">+ Add Student</button>
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
  renderStudentList('active');
}

let _currentStudentFilter = 'active';
let _currentStudentGender = '';
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

  document.getElementById('topbarActions').innerHTML = `
    <button class="btn btn-secondary" onclick="openReportCardModal()">📄 Report Cards</button>
    <button class="btn btn-primary" onclick="openAddGradeModal()">+ Add Assignment</button>
  `;

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
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div class="card-title">Parent Portal</div>
          <button class="btn btn-primary btn-sm" onclick="openAddParentModal()">+ Add Parent</button>
        </div>
        <p style="font-size:13px;color:var(--text3);margin-bottom:12px;">Parents can log in at <strong>parent.html</strong> with their email and password to view their child's grades and attendance.</p>
        ${(() => {
          const parents = DB.getList('parents');
          if (parents.length === 0) return '<p style="font-size:13px;color:var(--text3);">No parent accounts yet.</p>';
          const students = DB.getList('students');
          const sMap = Object.fromEntries(students.map(s=>[s.id, s.firstName+' '+s.lastName]));
          return `<div class="table-wrap"><table>
            <thead><tr><th>Name</th><th>Email</th><th>Children</th><th></th></tr></thead>
            <tbody>${parents.map(p=>`<tr>
              <td><strong>${p.name}</strong></td>
              <td style="font-size:12px;color:var(--text3)">${p.email}</td>
              <td style="font-size:12px;color:var(--text3)">${(p.studentIds||[]).map(id=>sMap[id]).filter(Boolean).join(', ')||'—'}</td>
              <td><button class="btn btn-danger btn-sm" onclick="removeParent('${p.id}')">Remove</button></td>
            </tr>`).join('')}</tbody>
          </table></div>`;
        })()}
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
          const classStudents = students.filter(s => s.classId === cls.id && s.status === 'active');
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
  const classStudents = DB.getList('students').filter(s => s.classId === classId && s.status === 'active');
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
      <button class="btn btn-primary" onclick="openTuitionModal()">+ Add Entry</button>
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
  viewStudentTuition(studentId);
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
  const students = DB.getList('students').filter(s => s.classId === classId && s.status === 'active');
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
  let studentList = DB.getList('students').filter(s => s.classId === classId && s.status === 'active');
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
      <button class="btn btn-primary" onclick="openEventModal()">+ Add Event</button>
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
      <button class="btn btn-primary" onclick="openNewQuizModal()">+ New Quiz</button>
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
      <button class="btn btn-primary" onclick="openAddStaffModal()">+ Add Staff</button>
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
