const app = document.getElementById('app');

const users = {
  admin: { password: 'admin123', role: 'admin', name: 'Dr. Ellis Carter' },
  faculty: { password: 'faculty123', role: 'faculty', name: 'Prof. Maya Lee' },
  student: { password: 'student123', role: 'student', name: 'Aarav Singh', studentId: 'S102' }
};

const state = {
  activeUser: null,
  students: [
    { id: 'S101', name: 'Nina Brooks', attendance: 88, internalMarks: 76, assignmentScore: 81 },
    { id: 'S102', name: 'Aarav Singh', attendance: 64, internalMarks: 59, assignmentScore: 61 },
    { id: 'S103', name: 'Lina Gomez', attendance: 92, internalMarks: 84, assignmentScore: 88 }
  ],
  blockchain: [],
  activePanel: 'overview',
  charts: {},
  refreshTimer: null,
  notice: ''
};

function stopRealtime() {
  if (state.refreshTimer) {
    clearInterval(state.refreshTimer);
    state.refreshTimer = null;
  }
}

function hashRecord(payload) {
  const json = JSON.stringify(payload);
  let hash = 2166136261;
  for (let i = 0; i < json.length; i += 1) {
    hash ^= json.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `BLK-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function predictRisk({ attendance, internalMarks, assignmentScore }) {
  const marksAvg = (internalMarks + assignmentScore) / 2;
  const normalized = attendance * 0.45 + marksAvg * 0.55;
  const probabilitySafe = Math.max(0, Math.min(100, Math.round(normalized)));
  const safe = probabilitySafe >= 70;
  const explanation = attendance < 70
    ? 'Low attendance detected'
    : marksAvg < 65
      ? 'Declining academic trend'
      : 'Healthy academic consistency';

  return {
    status: safe ? 'Safe' : 'At Risk',
    probabilitySafe,
    confidence: `${probabilitySafe}% ${safe ? 'Safe' : 'At Risk'}`,
    explanation
  };
}

function addBlock(student) {
  const record = {
    blockNumber: state.blockchain.length + 1,
    timestamp: new Date().toLocaleString(),
    studentId: student.id,
    payload: {
      attendance: student.attendance,
      internalMarks: student.internalMarks,
      assignmentScore: student.assignmentScore
    }
  };
  record.hash = hashRecord(record);
  state.blockchain.unshift(record);
}

state.students.forEach(addBlock);

function riskSplit() {
  const outcomes = state.students.map(predictRisk);
  return outcomes.reduce(
    (acc, curr) => {
      curr.status === 'Safe' ? acc.safe++ : acc.risk++;
      return acc;
    },
    { safe: 0, risk: 0 }
  );
}

function render() {
  stopRealtime();
  if (!state.activeUser) {
    renderLogin();
    return;
  }
  renderDashboard();
}

function renderLogin() {
  app.innerHTML = `
    <section class="login-wrap">
      <div class="login-card">
        <div class="login-side">
          <h1>EduTech Analytics</h1>
          <p class="muted" style="margin-top:10px; line-height:1.6;">Scalable Academic Intelligence Platform for blockchain-integrated records, ML risk prediction, and transparent role-based insights.</p>
          <div class="role-credentials">
            <h3 style="margin-top:12px;">Demo credentials</h3>
            <div class="cred-row">Admin → <strong>admin</strong> / <strong>admin123</strong></div>
            <div class="cred-row">Faculty → <strong>faculty</strong> / <strong>faculty123</strong></div>
            <div class="cred-row">Student → <strong>student</strong> / <strong>student123</strong></div>
          </div>
        </div>
        <div class="login-main">
          <h2>Role-based Login</h2>
          <p class="muted" style="margin-top:8px;">Secure access for Admin, Faculty, and Students.</p>
          <form id="loginForm" style="margin-top:18px; display:grid; gap:10px;">
            <input name="username" placeholder="Username" required />
            <input name="password" type="password" placeholder="Password" required />
            <button class="primary-btn" type="submit">Sign In</button>
          </form>
          <p id="loginError" style="color:#cc5b5b; margin-top:10px;"></p>
        </div>
      </div>
    </section>
  `;

  document.getElementById('loginForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const username = String(form.get('username')).trim().toLowerCase();
    const password = String(form.get('password')).trim();
    const found = users[username];

    if (!found || found.password !== password) {
      document.getElementById('loginError').textContent = 'Invalid credentials.';
      return;
    }

    state.activeUser = found;
    state.activePanel = 'overview';
    state.notice = '';
    render();
  });
}

function sidebar(role) {
  const panels = role === 'admin'
    ? [
      ['overview', 'Overview'],
      ['students', 'Student Registry'],
      ['blockchain', 'Blockchain Ledger'],
      ['analytics', 'Analytics']
    ]
    : role === 'faculty'
      ? [['overview', 'Class Insights'], ['analytics', 'Performance Trends']]
      : [['overview', 'My Dashboard']];

  const nav = panels
    .map(
      ([key, label]) => `<button class="nav-btn ${state.activePanel === key ? 'active' : ''}" data-panel="${key}">${label}</button>`
    )
    .join('');

  return `
    <aside class="sidebar">
      <div class="brand">EduTech Analytics</div>
      <nav>${nav}</nav>
      <button class="nav-btn" id="logoutBtn" style="margin-top:16px;">Sign Out</button>
    </aside>
  `;
}

function overviewCards(students) {
  const risks = students.map(predictRisk);
  const atRiskCount = risks.filter((r) => r.status === 'At Risk').length;
  const avgAttendance = Math.round(students.reduce((s, p) => s + p.attendance, 0) / students.length);
  const avgMarks = Math.round(students.reduce((s, p) => s + (p.internalMarks + p.assignmentScore) / 2, 0) / students.length);

  return `
    <div class="card-grid">
      <article class="card"><p class="muted">Total Students</p><p class="kpi-value">${students.length}</p></article>
      <article class="card"><p class="muted">At-Risk Students</p><p class="kpi-value">${atRiskCount}</p></article>
      <article class="card"><p class="muted">Average Attendance</p><p class="kpi-value">${avgAttendance}%</p></article>
      <article class="card"><p class="muted">Average Marks</p><p class="kpi-value">${avgMarks}</p></article>
    </div>
  `;
}

function adminView() {
  const rows = state.students
    .map((s) => {
      const risk = predictRisk(s);
      return `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.attendance}%</td><td>${Math.round((s.internalMarks + s.assignmentScore) / 2)}</td><td><span class="badge ${risk.status === 'Safe' ? 'safe' : 'risk'}">${risk.status}</span></td></tr>`;
    })
    .join('');

  const ledger = state.blockchain
    .slice(0, 8)
    .map((b) => `<tr><td>#${b.blockNumber}</td><td>${b.timestamp}</td><td>${b.hash}</td></tr>`)
    .join('');

  if (state.activePanel === 'students') {
    return `
      <section class="panel">
        <h3>All Students with Predicted Risk</h3>
        <table class="table"><thead><tr><th>ID</th><th>Name</th><th>Attendance</th><th>Avg Marks</th><th>Risk</th></tr></thead><tbody>${rows}</tbody></table>
      </section>
    `;
  }

  if (state.activePanel === 'blockchain') {
    return `
      <section class="panel">
        <h3>Immutable Ledger (Simulated Blockchain)</h3>
        <p class="muted" style="margin-top:6px;">Records are append-only: block number, timestamp, and data hash are fixed once added.</p>
        <table class="table"><thead><tr><th>Block</th><th>Timestamp</th><th>Data Hash</th></tr></thead><tbody>${ledger}</tbody></table>
      </section>
    `;
  }

  if (state.activePanel === 'analytics') {
    return `
      ${overviewCards(state.students)}
      <section class="panel"><h3>Risk Distribution</h3><canvas id="riskPie"></canvas></section>
    `;
  }

  return `
    ${overviewCards(state.students)}
    <section class="panel-grid">
      <article class="panel">
        <h3>Add New Student & Upload Academic Data</h3>
        <form id="addStudentForm" class="form-grid">
          <input name="id" placeholder="Student ID" required />
          <input name="name" placeholder="Student Name" required />
          <input name="attendance" type="number" min="0" max="100" placeholder="Attendance %" required />
          <input name="internal" type="number" min="0" max="100" placeholder="Internal Marks" required />
          <input name="assignment" type="number" min="0" max="100" placeholder="Assignment Score" required />
          <button class="primary-btn" type="submit">Add & Anchor to Blockchain</button>
        </form>
        ${state.notice ? `<p class="muted" style="margin-top:10px; color:#4f8e5a;">${state.notice}</p>` : ''}
      </article>
      <article class="panel">
        <h3>Risk Distribution</h3>
        <canvas id="riskPie"></canvas>
      </article>
    </section>
    <section class="panel">
      <h3>All Students with Predicted Risk</h3>
      <table class="table"><thead><tr><th>ID</th><th>Name</th><th>Attendance</th><th>Avg Marks</th><th>Risk</th></tr></thead><tbody>${rows}</tbody></table>
    </section>
    <section class="panel">
      <h3>Immutable Ledger (Simulated Blockchain)</h3>
      <p class="muted" style="margin-top:6px;">Records are append-only: block number, timestamp, and data hash are fixed once added.</p>
      <table class="table"><thead><tr><th>Block</th><th>Timestamp</th><th>Data Hash</th></tr></thead><tbody>${ledger}</tbody></table>
    </section>
  `;
}

function facultyView() {
  const students = state.students;
  const alerts = students
    .map((s) => {
      const risk = predictRisk(s);
      const suggestion = s.attendance < 70
        ? 'Needs attendance improvement'
        : risk.status === 'At Risk'
          ? 'Academic intervention recommended'
          : 'On-track performance';
      return `<tr><td>${s.name}</td><td>${risk.confidence}</td><td>${suggestion}</td></tr>`;
    })
    .join('');

  if (state.activePanel === 'analytics') {
    return `
      <section class="panel-grid">
        <article class="panel"><h3>Attendance Trend</h3><canvas id="attendanceLine"></canvas></article>
        <article class="panel"><h3>Marks Progression</h3><canvas id="marksLine"></canvas></article>
      </section>
      <section class="panel">
        <h3>ML Early Warning Suggestions</h3>
        <table class="table"><thead><tr><th>Student</th><th>Prediction</th><th>Recommendation</th></tr></thead><tbody>${alerts}</tbody></table>
      </section>
    `;
  }

  return `
    <section class="panel">
      <h3>Assigned Students Overview</h3>
      ${overviewCards(students)}
    </section>
  `;
}

function studentView() {
  const student = state.students.find((s) => s.id === state.activeUser.studentId) || state.students[0];
  const risk = predictRisk(student);
  const block = state.blockchain.find((b) => b.studentId === student.id);

  return `
    <section class="panel-grid">
      <article class="panel">
        <h3>${student.name} (${student.id})</h3>
        <p class="muted" style="margin-top:8px;">Attendance: ${student.attendance}%</p>
        <p class="muted">Marks (Avg): ${Math.round((student.internalMarks + student.assignmentScore) / 2)}</p>
        <p style="margin-top:12px;"><span class="badge ${risk.status === 'Safe' ? 'safe' : 'risk'}">${risk.status}</span></p>
        <p class="muted" style="margin-top:10px;">Prediction Probability Score: <strong>${risk.probabilitySafe}%</strong></p>
        <p class="muted">${risk.explanation}</p>
      </article>
      <article class="panel">
        <h3>Blockchain Verification</h3>
        <p class="muted" style="margin-top:10px;">Verification Badge: <span class="badge safe">Verified On Demo Ledger</span></p>
        <p class="muted" style="margin-top:10px;">Block #${block?.blockNumber ?? 'N/A'}</p>
        <p class="muted">Timestamp: ${block?.timestamp ?? 'N/A'}</p>
        <p class="muted">Hash: ${block?.hash ?? 'N/A'}</p>
      </article>
    </section>
    <section class="panel">
      <h3>Personal Performance Trend</h3>
      <canvas id="studentTrend"></canvas>
    </section>
  `;
}

function renderDashboard() {
  const role = state.activeUser.role;
  let body = '';
  if (role === 'admin') body = adminView();
  if (role === 'faculty') body = facultyView();
  if (role === 'student') body = studentView();

  app.innerHTML = `
    <div class="app-shell">
      ${sidebar(role)}
      <section class="content">
        <header>
          <h2>${role[0].toUpperCase() + role.slice(1)} Dashboard</h2>
          <p class="muted" style="margin-top:6px;">Welcome, ${state.activeUser.name}. Real-time academic intelligence with modular, future-ready architecture.</p>
        </header>
        ${body}
        <footer class="footer-note">
          <strong>Future Scope:</strong> Integrate production blockchain backend, hosted ML prediction API, cloud-native database, and institution-wide real-time streaming analytics.
        </footer>
      </section>
    </div>
  `;

  document.querySelectorAll('[data-panel]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activePanel = btn.dataset.panel;
      render();
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    state.activeUser = null;
    state.notice = '';
    render();
  });

  if (role === 'admin') {
    const form = document.getElementById('addStudentForm');
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const student = {
        id: String(formData.get('id')).trim().toUpperCase(),
        name: String(formData.get('name')).trim(),
        attendance: Number(formData.get('attendance')),
        internalMarks: Number(formData.get('internal')),
        assignmentScore: Number(formData.get('assignment'))
      };

      const duplicateId = state.students.some((s) => s.id === student.id);
      const values = [student.attendance, student.internalMarks, student.assignmentScore];
      const invalidRange = values.some((v) => Number.isNaN(v) || v < 0 || v > 100);

      if (!student.id || !student.name || duplicateId || invalidRange) {
        state.notice = duplicateId
          ? 'Student ID already exists. Please use a unique ID.'
          : 'Please enter valid values (0-100) and required fields.';
        render();
        return;
      }

      state.students.unshift(student);
      addBlock(student);
      state.notice = `Record for ${student.name} added and anchored in block #${state.blockchain[0].blockNumber}.`;
      render();
    });

    drawRiskPie();
  }

  if (role === 'faculty' && state.activePanel === 'analytics') {
    drawFacultyCharts();
    state.refreshTimer = setInterval(drawFacultyCharts, 4000);
  }

  if (role === 'student') {
    drawStudentChart();
  }
}

function drawRiskPie() {
  const ctx = document.getElementById('riskPie');
  if (!ctx || typeof Chart === 'undefined') return;
  state.charts.riskPie?.destroy();
  const split = riskSplit();
  state.charts.riskPie = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Safe', 'At Risk'],
      datasets: [{
        data: [split.safe, split.risk],
        backgroundColor: ['#84be8b', '#e8a2a2']
      }]
    },
    options: { plugins: { legend: { position: 'bottom' } } }
  });
}

function drawFacultyCharts() {
  if (typeof Chart === 'undefined') return;
  const labels = state.students.map((s) => s.id);
  const attendance = state.students.map((s) => s.attendance + Math.round(Math.random() * 4 - 2));
  const marks = state.students.map((s) => Math.round((s.internalMarks + s.assignmentScore) / 2 + (Math.random() * 4 - 2)));

  const aCtx = document.getElementById('attendanceLine');
  const mCtx = document.getElementById('marksLine');

  if (aCtx) {
    state.charts.attendance?.destroy();
    state.charts.attendance = new Chart(aCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Attendance %', data: attendance, borderColor: '#7aa4ff', tension: 0.3, fill: false }]
      },
      options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }
    });
  }

  if (mCtx) {
    state.charts.marks?.destroy();
    state.charts.marks = new Chart(mCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Marks', data: marks, backgroundColor: '#b8c8ff' }]
      },
      options: { scales: { y: { min: 0, max: 100 } }, plugins: { legend: { display: false } } }
    });
  }
}

function drawStudentChart() {
  const ctx = document.getElementById('studentTrend');
  if (!ctx || typeof Chart === 'undefined') return;
  state.charts.student?.destroy();
  const student = state.students.find((s) => s.id === state.activeUser.studentId) || state.students[0];
  const data = [
    student.attendance - 6,
    student.attendance - 2,
    student.attendance,
    Math.round((student.internalMarks + student.assignmentScore) / 2)
  ];

  state.charts.student = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Term 1', 'Term 2', 'Term 3', 'Current Score'],
      datasets: [{ data, borderColor: '#82b7a7', tension: 0.25, fill: true, backgroundColor: 'rgba(130,183,167,0.15)' }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 100 } } }
  });
}

render();