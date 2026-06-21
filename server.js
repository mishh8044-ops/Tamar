const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== إعداد قاعدة البيانات ==========
const db = new sqlite3.Database('./database/users.db');

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`);

// مستخدم افتراضي
const defaultUser = { username: 'agent', password: '123456' };
db.get('SELECT * FROM users WHERE username = ?', [defaultUser.username], (err, row) => {
  if (!row) {
    bcrypt.hash(defaultUser.password, 10, (err, hash) => {
      if (!err) db.run('INSERT INTO users (username, password) VALUES (?, ?)', [defaultUser.username, hash]);
    });
  }
});

// ========== إعدادات الجلسة ==========
app.use(session({
  secret: 'royal_army_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== Middleware التحقق ==========
function isAuthenticated(req, res, next) {
  if (req.session.userId) return next();
  res.redirect('/');
}

// ========== تعريف الصفحات المضمنة ==========

// --- صفحة تسجيل الدخول (index) ---
const loginPage = `
<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Royal Army SMS - تسجيل الدخول</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; }
    body { background-color:#0b0e14; color:#e0e0e0; height:100vh; display:flex; justify-content:center; align-items:center; }
    .login-container { background:#141a24; padding:40px 35px; border-radius:12px; box-shadow:0 8px 30px rgba(0,0,0,0.8); width:380px; border:1px solid #2a3a4a; }
    .login-container .logo { text-align:center; margin-bottom:30px; }
    .login-container .logo h1 { font-size:22px; color:#d4af37; letter-spacing:2px; font-weight:700; text-transform:uppercase; border-bottom:1px solid #2a3a4a; padding-bottom:12px; }
    .login-container .logo h1 small { display:block; font-size:12px; color:#8899aa; letter-spacing:3px; margin-top:4px; }
    .login-container .subtitle { color:#b0c4de; font-size:14px; text-align:center; margin-bottom:25px; letter-spacing:1px; }
    .login-container .input-group { margin-bottom:18px; }
    .login-container .input-group label { display:block; font-size:13px; color:#b0c4de; margin-bottom:5px; letter-spacing:0.5px; }
    .login-container .input-group input { width:100%; padding:12px 15px; background:#1e2632; border:1px solid #2a3a4a; border-radius:6px; color:#fff; font-size:14px; outline:none; transition:border 0.3s; }
    .login-container .input-group input:focus { border-color:#d4af37; }
    .login-container .security-check { background:#1a222e; padding:12px 15px; border-radius:6px; margin-bottom:18px; display:flex; align-items:center; gap:12px; border:1px solid #2a3a4a; }
    .login-container .security-check span { font-size:18px; font-weight:bold; color:#d4af37; }
    .login-container .security-check input { flex:1; padding:8px 12px; background:#0b0e14; border:none; border-radius:4px; color:#fff; font-size:14px; outline:1px solid #2a3a4a; }
    .login-container .security-check input:focus { outline-color:#d4af37; }
    .login-container .btn-signin { width:100%; padding:14px; background:#d4af37; border:none; border-radius:6px; font-size:16px; font-weight:bold; color:#0b0e14; cursor:pointer; transition:background 0.3s; letter-spacing:1px; }
    .login-container .btn-signin:hover { background:#c5a12e; }
    .login-container .footer { margin-top:25px; text-align:center; font-size:11px; color:#667788; border-top:1px solid #1e2632; padding-top:18px; letter-spacing:0.5px; }
    .login-container .footer span { color:#d4af37; }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo"><h1>ROYAL ARMY <small>SMS PANEL</small></h1></div>
    <div class="subtitle">SECURE LOGIN</div>
    <h2 style="color:#b0c4de; font-size:18px; margin-bottom:20px;">Welcome back</h2>
    <p style="color:#8899aa; font-size:13px; margin-bottom:25px;">Enter your account details to continue.</p>
    <form id="loginForm">
      <div class="input-group">
        <label for="username">Username</label>
        <input type="text" id="username" placeholder="Enter username" required>
      </div>
      <div class="input-group">
        <label for="password">Password</label>
        <input type="password" id="password" placeholder="Enter password" required>
      </div>
      <div class="security-check">
        <span>2 + 5 = ?</span>
        <input type="number" id="answer" placeholder="Answer" required>
      </div>
      <button type="submit" class="btn-signin">Sign In</button>
    </form>
    <div class="footer">
      Authorized accounts only<br>
      <span>Powered by Royal Army SMS · Developer by Sohii</span>
    </div>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const answer = document.getElementById('answer').value;
      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, answer })
        });
        const data = await res.json();
        if (res.ok && data.success) window.location.href = '/dashboard';
        else alert(data.message || 'فشل تسجيل الدخول');
      } catch(err) { alert('حدث خطأ، حاول مرة أخرى.'); }
    });
  </script>
</body>
</html>
`;

// --- صفحة لوحة التحكم (dashboard) ---
const dashboardPage = `
<!DOCTYPE html>
<html lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Royal Army SMS - لوحة التحكم</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; }
    body { background:#0b0e14; color:#e0e0e0; height:100vh; }
    .dashboard-wrapper { display:flex; width:100%; height:100vh; background:#0b0e14; }
    .sidebar { width:240px; background:#141a24; padding:25px 0; display:flex; flex-direction:column; border-right:1px solid #1e2632; height:100vh; position:sticky; top:0; }
    .sidebar .brand { text-align:center; padding-bottom:25px; border-bottom:1px solid #1e2632; margin-bottom:20px; }
    .sidebar .brand h2 { font-size:18px; color:#d4af37; letter-spacing:1px; text-transform:uppercase; }
    .sidebar .brand small { display:block; font-size:11px; color:#8899aa; margin-top:4px; }
    .sidebar .nav { list-style:none; flex:1; padding:0 15px; }
    .sidebar .nav li { padding:12px 18px; margin:4px 0; border-radius:8px; cursor:pointer; transition:background 0.2s,color 0.2s; color:#b0c4de; font-size:14px; display:flex; align-items:center; gap:12px; }
    .sidebar .nav li:hover { background:#1e2632; color:#fff; }
    .sidebar .nav li.active { background:#1e2632; color:#d4af37; font-weight:600; }
    .sidebar .nav li .icon { font-size:18px; width:24px; text-align:center; }
    .sidebar .logout-btn { margin:20px 15px 0; padding:12px; background:#2a1f1f; border:1px solid #4a2a2a; border-radius:8px; color:#e0a0a0; text-align:center; cursor:pointer; transition:background 0.2s; font-weight:500; }
    .sidebar .logout-btn:hover { background:#3a2a2a; }
    .main-content { flex:1; padding:30px 40px; overflow-y:auto; background:#0f131a; }
    .main-content .page-header { margin-bottom:30px; }
    .main-content .page-header h1 { font-size:26px; color:#fff; font-weight:300; }
    .main-content .page-header p { color:#8899aa; font-size:14px; margin-top:4px; }
    .stats-cards { display:flex; gap:20px; margin-bottom:35px; flex-wrap:wrap; }
    .stat-card { background:#1a222e; padding:20px 25px; border-radius:10px; flex:1; min-width:150px; border:1px solid #2a3a4a; }
    .stat-card .label { font-size:13px; color:#8899aa; text-transform:uppercase; letter-spacing:0.5px; }
    .stat-card .value { font-size:32px; font-weight:600; color:#d4af37; margin-top:6px; }
    .chart-section { background:#1a222e; padding:25px; border-radius:10px; border:1px solid #2a3a4a; margin-top:10px; }
    .chart-section h3 { font-size:16px; color:#b0c4de; margin-bottom:20px; letter-spacing:0.5px; }
    .chart-container { height:200px; }
    .page-section { display:none; }
    .page-section.active { display:block; }
    .footer-text { margin-top:30px; text-align:center; font-size:12px; color:#556677; border-top:1px solid #1a222e; padding-top:20px; }
  </style>
</head>
<body>
<div class="dashboard-wrapper">
  <aside class="sidebar">
    <div class="brand"><h2>ROYAL ARMY</h2><small>Agent Panel</small></div>
    <ul class="nav">
      <li class="active" data-section="dashboard"><span class="icon">📊</span> Dashboard</li>
      <li data-section="clients"><span class="icon">👥</span> My Clients</li>
      <li data-section="assign"><span class="icon">📞</span> Assign Numbers</li>
      <li data-section="sms-test"><span class="icon">✉️</span> SMS Test Panel</li>
      <li data-section="test-reports"><span class="icon">📋</span> Test SMS Reports</li>
      <li data-section="my-reports"><span class="icon">📄</span> My SMS Reports</li>
      <li data-section="account"><span class="icon">⚙️</span> Account</li>
    </ul>
    <div class="logout-btn" id="logoutBtn">🚪 Logout</div>
  </aside>
  <main class="main-content">
    <section id="section-dashboard" class="page-section active">
      <div class="page-header"><h1>Agent Dashboard</h1><p>Manage clients, number routing, test traffic, payouts and ...</p></div>
      <div class="stats-cards">
        <div class="stat-card"><div class="label">Today SMS</div><div class="value" id="todaySms">0</div></div>
        <div class="stat-card"><div class="label">Last 7 Day SMS</div><div class="value" id="last7Sms">0</div></div>
        <div class="stat-card"><div class="label">Last 30 Day SMS</div><div class="value" id="last30Sms">0</div></div>
      </div>
      <div class="chart-section"><h3>SMS LAST 7 DAYS</h3><div class="chart-container"><canvas id="smsChart"></canvas></div></div>
      <div style="margin-top:15px; color:#8899aa; font-size:13px;">0 NEW ACCOUNTS</div>
    </section>
    <section id="section-clients" class="page-section"><h2>My Clients</h2><p>قائمة العملاء ستظهر هنا.</p></section>
    <section id="section-assign" class="page-section"><h2>Assign Numbers</h2><p>تخصيص أرقام للعملاء.</p></section>
    <section id="section-sms-test" class="page-section"><h2>SMS Test Panel</h2><p>لوحة اختبار إرسال الرسائل.</p></section>
    <section id="section-test-reports" class="page-section"><h2>Test SMS Reports</h2><p>تقارير اختبار الرسائل.</p></section>
    <section id="section-my-reports" class="page-section"><h2>My SMS Reports</h2><p>تقارير الرسائل الخاصة بي.</p></section>
    <section id="section-account" class="page-section"><h2>Account</h2><p>إعدادات الحساب.</p></section>
    <div class="footer-text">Powered by Royal Army SMS · Developer by Sohii</div>
  </main>
</div>
<script>
  // تبديل الأقسام
  document.querySelectorAll('.nav li').forEach(item => {
    item.addEventListener('click', function() {
      document.querySelectorAll('.nav li').forEach(li => li.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.page-section').forEach(section => section.classList.remove('active'));
      document.getElementById('section-'+this.dataset.section).classList.add('active');
    });
  });

  // تسجيل الخروج
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    const res = await fetch('/logout', { method: 'POST' });
    if (res.ok) window.location.href = '/';
  });

  // جلب الإحصائيات والرسم البياني
  async function loadStats() {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      document.getElementById('todaySms').textContent = data.today;
      document.getElementById('last7Sms').textContent = data.last7Days;
      document.getElementById('last30Sms').textContent = data.last30Days;

      new Chart(document.getElementById('smsChart'), {
        type: 'bar',
        data: {
          labels: data.chartData.labels,
          datasets: [{
            label: 'SMS',
            data: data.chartData.values,
            backgroundColor: '#d4af37',
            borderColor: '#b8952e',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, ticks: { color: '#8899aa' }, grid: { color: '#1a222e' } },
            x: { ticks: { color: '#8899aa' }, grid: { display: false } }
          }
        }
      });
    } catch(err) { console.error('فشل تحميل الإحصائيات', err); }
  }
  loadStats();
</script>
</body>
</html>
`;

// ========== نقاط النهاية (Routes) ==========

app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/dashboard');
  res.send(loginPage);
});

app.get('/dashboard', isAuthenticated, (req, res) => {
  res.send(dashboardPage);
});

app.post('/login', (req, res) => {
  const { username, password, answer } = req.body;
  if (parseInt(answer) !== 7) {
    return res.status(400).json({ success: false, message: 'إجابة السؤال الأمني غير صحيحة' });
  }
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) return res.status(401).json({ success: false, message: 'بيانات غير صحيحة' });
    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: 'بيانات غير صحيحة' });
      }
    });
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/stats', isAuthenticated, (req, res) => {
  const today = Math.floor(Math.random() * 50);
  const last7Days = Math.floor(Math.random() * 200);
  const last30Days = Math.floor(Math.random() * 800);
  const chartData = {
    labels: ['16 Jun', '17 Jun', '18 Jun', '19 Jun', '20 Jun', '21 Jun', '22 Jun'],
    values: [1, 1, 1, 0, 0, 0, 0]
  };
  res.json({ today, last7Days, last30Days, chartData });
});

// ========== تشغيل الخادم ==========
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 الخادم يعمل على http://localhost:${PORT} (وداخل الشبكة على IP الجهاز)`);
});
