/* ========================================
   RecoverEase — Main Application Script
   ======================================== */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000/api'
  : '/api';

let currentUser = null;
let medicines = [];
let selectedCondition = 'surgery';
let selectedDay = 1;
let currentSlide = 0;
let sliderInterval = null;
let reminderInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initAnimations();
  const page = detectPage();
  if (page === 'index') initSlider();
  if (page === 'login') initLoginForm();
  if (page === 'register') initRegisterForm();
  if (page === 'recovery') initRecoveryPage();
  if (page === 'medicine') initMedicinePage();
  if (page === 'exercise') initExercisePage();
  if (page === 'dashboard') initDashboard();
  startReminderSystem();
});

function detectPage() {
  const path = window.location.pathname;
  if (path.includes('login')) return 'login';
  if (path.includes('register')) return 'register';
  if (path.includes('recovery')) return 'recovery';
  if (path.includes('medicine')) return 'medicine';
  if (path.includes('exercise')) return 'exercise';
  if (path.includes('dashboard')) return 'dashboard';
  return 'index';
}

// ── Toast Notifications ──
function showToast(message, type = 'info', duration = 4000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info',
    medicine: 'fa-bell'
  };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── API Service ──
async function apiCall(endpoint, options = {}) {
  try {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'API Error');
    return data;
  } catch (error) {
    return getFallbackData(endpoint, options);
  }
}

function getFallbackData(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (endpoint.includes('/auth/login') && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    return { success: true, data: { token: 'fb_tok_' + Date.now(), user: { id: 'fb_1', name: 'Demo User', email: body.email || 'demo@recoverease.com', condition: 'surgery' } } };
  }
  if (endpoint.includes('/auth/register') && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    return { success: true, data: { token: 'fb_tok_' + Date.now(), user: { id: 'fb_' + Date.now(), name: body.name || 'User', email: body.email } } };
  }
  if (endpoint.includes('/medicine') && method === 'GET') {
    return { success: true, data: getFallbackMedicines() };
  }
  if (endpoint.includes('/medicine') && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    return { success: true, message: 'Medicine added', data: { _id: 'med_' + Date.now(), ...body, takenToday: false, active: true } };
  }
  if (endpoint.includes('/recovery') && method === 'GET') {
    const params = new URLSearchParams(endpoint.split('?')[1] || '');
    const condition = params.get('condition') || 'surgery';
    const day = parseInt(params.get('day')) || 1;
    return { success: true, data: DEFAULT_RECOVERY_DATA[condition]?.find(p => p.day === day) || getDefaultDayPlan(condition, day), source: 'default' };
  }
  if (endpoint.includes('/user/') && method === 'GET') {
    return { success: true, data: getFallbackUserStats() };
  }
  return { success: false, message: 'Offline mode' };
}

function getFallbackMedicines() {
  return [
    { _id: 'm1', name: 'Amoxicillin', dosage: '500mg', time: '08:00 AM', frequency: 'thrice-daily', notes: 'Take after meals', takenToday: false },
    { _id: 'm2', name: 'Ibuprofen', dosage: '400mg', time: '09:00 AM', frequency: 'twice-daily', notes: 'For pain relief', takenToday: true },
    { _id: 'm3', name: 'Omeprazole', dosage: '20mg', time: '07:00 AM', frequency: 'once-daily', notes: 'Before breakfast', takenToday: false },
    { _id: 'm4', name: 'Acetaminophen', dosage: '650mg', time: '02:00 PM', frequency: 'as-needed', notes: 'If fever exceeds 100.4°F', takenToday: false }
  ];
}

function getFallbackUserStats() {
  return {
    user: { id: 'fb_1', name: 'Demo User', email: 'demo@recoverease.com', condition: 'surgery', createdAt: new Date() },
    stats: { medicineCount: 4, totalTasks: 25, completedTasks: 18, taskCompletionRate: 72, medicinesTakenToday: 1, totalActiveMedicines: 4, medicineAdherenceRate: 25, recoveryPlansCount: 5 }
  };
}

function getDefaultDayPlan(condition, day) {
  const templates = {
    surgery: [
      { title: 'Continue recovery protocol', description: 'Follow your established routine for Day ' + day, time: 'All Day', category: 'rest' },
      { title: 'Take scheduled medications', description: 'All prescribed medications on time', time: 'As scheduled', category: 'medicine' },
      { title: 'Gentle mobility exercises', description: 'Increase activity level gradually', time: '09:00 AM', category: 'exercise' },
      { title: 'Balanced nutrition', description: 'High protein, vitamin-rich meals', time: 'Meals', category: 'diet' },
      { title: 'Monitor symptoms', description: 'Track pain levels and temperature', time: 'Evening', category: 'checkup' }
    ],
    fever: [
      { title: 'Rest and monitor temperature', description: 'Track temperature every 4 hours', time: 'All Day', category: 'rest' },
      { title: 'Medication as needed', description: 'Fever reducers if temperature elevated', time: 'As needed', category: 'medicine' },
      { title: 'Stay hydrated', description: 'At least 8 glasses of fluids', time: 'All Day', category: 'diet' },
      { title: 'Light activity', description: 'Short walks if feeling well', time: 'Afternoon', category: 'exercise' },
      { title: 'Note any changes', description: 'Report new symptoms to doctor', time: 'Evening', category: 'checkup' }
    ],
    fracture: [
      { title: 'Immobilization continues', description: 'Keep cast/splint secure', time: 'All Day', category: 'rest' },
      { title: 'Pain management', description: 'Take medication as prescribed', time: 'Scheduled', category: 'medicine' },
      { title: 'Joint mobility exercises', description: 'Move unaffected joints', time: '3x daily', category: 'exercise' },
      { title: 'Calcium-rich diet', description: 'Dairy, leafy greens, fortified foods', time: 'Meals', category: 'diet' },
      { title: 'Check for complications', description: 'Numbness, swelling, color changes', time: 'Evening', category: 'checkup' }
    ]
  };
  const tasks = (templates[condition] || templates.surgery).map(t => ({ ...t, completed: false }));
  return { day, tasks, notes: 'Day ' + day + ' of your ' + condition + ' recovery plan.' };
}

const DEFAULT_RECOVERY_DATA = {
  surgery: [
    { day: 1, tasks: [
      { title: 'Complete bed rest', description: 'Stay in bed, limit movement to bathroom only', time: 'All Day', completed: false, category: 'rest' },
      { title: 'Take prescribed antibiotics', description: 'First dose as directed by doctor', time: '08:00 AM', completed: false, category: 'medicine' },
      { title: 'Wound care check', description: 'Inspect incision site for bleeding or swelling', time: '10:00 AM', completed: false, category: 'hygiene' },
      { title: 'Deep breathing exercises', description: '5 slow deep breaths every hour', time: 'Hourly', completed: false, category: 'exercise' },
      { title: 'Clear liquids only', description: 'Water, broth, apple juice', time: 'Meals', completed: false, category: 'diet' }
    ], notes: 'Most critical day. Call doctor if fever exceeds 101°F.' },
    { day: 3, tasks: [
      { title: 'Short walks with assistance', description: 'Walk 5 minutes with caregiver support', time: '09:00 AM', completed: false, category: 'exercise' },
      { title: 'Pain medication on schedule', description: 'Do not wait for pain to become severe', time: '06:00 AM, 02:00 PM, 10:00 PM', completed: false, category: 'medicine' },
      { title: 'Increase fluid intake', description: 'Aim for 8 glasses of water today', time: 'All Day', completed: false, category: 'diet' },
      { title: 'Leg exercises in bed', description: 'Ankle pumps and gentle knee bends', time: '11:00 AM, 03:00 PM', completed: false, category: 'exercise' },
      { title: 'Wound dressing change', description: 'Follow doctor instructions', time: '10:00 AM', completed: false, category: 'hygiene' }
    ], notes: 'Pain should be gradually decreasing.' },
    { day: 7, tasks: [
      { title: 'Walk independently 10 minutes', description: 'Without assistance in safe area', time: '09:00 AM, 04:00 PM', completed: false, category: 'exercise' },
      { title: 'Soft solid foods', description: 'Mashed potatoes, yogurt, eggs', time: 'Meals', completed: false, category: 'diet' },
      { title: 'Reduce pain medication', description: 'Follow tapering schedule', time: 'As scheduled', completed: false, category: 'medicine' },
      { title: 'Upper body stretching', description: 'Arm raises and shoulder rolls', time: '11:00 AM', completed: false, category: 'exercise' },
      { title: 'Shower with assistance', description: 'Keep incision dry', time: '08:00 AM', completed: false, category: 'hygiene' }
    ], notes: 'Stitches may need removal this week.' },
    { day: 14, tasks: [
      { title: 'Walk 20 minutes twice daily', description: 'Maintain steady pace', time: '09:00 AM, 05:00 PM', completed: false, category: 'exercise' },
      { title: 'Resume normal diet', description: 'Balanced meals with protein', time: 'Meals', completed: false, category: 'diet' },
      { title: 'Strength exercises', description: 'Light resistance bands', time: '11:00 AM', completed: false, category: 'exercise' },
      { title: 'OTC pain relief only', description: 'Acetaminophen or ibuprofen', time: 'As needed', completed: false, category: 'medicine' },
      { title: 'Follow-up appointment', description: 'Wound healing assessment', time: 'Scheduled', completed: false, category: 'checkup' }
    ], notes: 'Avoid heavy lifting over 10 lbs.' },
    { day: 30, tasks: [
      { title: 'Walk 30 minutes daily', description: 'Brisk walking appropriate', time: 'Morning', completed: false, category: 'exercise' },
      { title: 'Full range of motion', description: 'Gentle yoga or stretching', time: '10:00 AM', completed: false, category: 'exercise' },
      { title: 'Normal activities', description: 'Most daily tasks resumed', time: 'All Day', completed: false, category: 'rest' },
      { title: 'Stop prescriptions', description: 'If approved by doctor', time: 'As directed', completed: false, category: 'medicine' },
      { title: 'Final checkup', description: 'Comprehensive assessment', time: 'Scheduled', completed: false, category: 'checkup' }
    ], notes: 'Continue building strength gradually.' }
  ],
  fever: [
    { day: 1, tasks: [
      { title: 'Complete bed rest', description: 'Stay in bed, keep warm', time: 'All Day', completed: false, category: 'rest' },
      { title: 'Fever-reducing medication', description: 'Acetaminophen or ibuprofen', time: 'Every 6 hours', completed: false, category: 'medicine' },
      { title: 'Hydrate continuously', description: 'Water, electrolytes, broths', time: 'All Day', completed: false, category: 'diet' },
      { title: 'Monitor temperature', description: 'Record every 2 hours', time: 'Every 2 hours', completed: false, category: 'checkup' },
      { title: 'Cool compress', description: 'On forehead for comfort', time: 'As needed', completed: false, category: 'hygiene' }
    ], notes: 'Seek emergency care if temp exceeds 103°F.' },
    { day: 3, tasks: [
      { title: 'Light activity', description: 'Short walks if feeling better', time: 'Afternoon', completed: false, category: 'exercise' },
      { title: 'Continue medication', description: 'If temp above 100.4°F', time: 'As needed', completed: false, category: 'medicine' },
      { title: 'BRAT diet', description: 'Bananas, Rice, Applesauce, Toast', time: 'Meals', completed: false, category: 'diet' },
      { title: 'Deep breathing', description: '10 slow breaths', time: '09:00 AM, 03:00 PM', completed: false, category: 'exercise' },
      { title: 'Sponge bath', description: 'Lukewarm to reduce temperature', time: 'As needed', completed: false, category: 'hygiene' }
    ], notes: 'Fever should be trending downward.' },
    { day: 7, tasks: [
      { title: 'Light daily activities', description: 'Housework, short walks', time: 'As tolerated', completed: false, category: 'exercise' },
      { title: 'Stop fever medication', description: 'If normal for 48 hours', time: 'As directed', completed: false, category: 'medicine' },
      { title: 'Balanced diet', description: 'Normal eating with nutrition', time: 'Meals', completed: false, category: 'diet' },
      { title: 'Stretching routine', description: '15 minutes light stretching', time: '10:00 AM', completed: false, category: 'exercise' },
      { title: 'Follow-up blood test', description: 'CBC and inflammatory markers', time: 'Scheduled', completed: false, category: 'checkup' }
    ], notes: 'Post-fever weakness is normal.' },
    { day: 14, tasks: [
      { title: 'Moderate exercise', description: '20-minute walks', time: 'Daily', completed: false, category: 'exercise' },
      { title: 'Full diet resumed', description: 'No restrictions', time: 'Meals', completed: false, category: 'diet' },
      { title: 'Energy rebuilding', description: 'Prioritize sleep and nutrition', time: 'All Day', completed: false, category: 'rest' },
      { title: 'Doctor clearance', description: 'Return to full activities', time: 'Scheduled', completed: false, category: 'checkup' }
    ], notes: 'Full recovery expected.' },
    { day: 30, tasks: [
      { title: 'Full exercise routine', description: 'Pre-illness levels', time: 'Daily', completed: false, category: 'exercise' },
      { title: 'Normal life resumed', description: 'All activities', time: 'All Day', completed: false, category: 'rest' },
      { title: 'Immune support diet', description: 'Vitamin-rich foods', time: 'Meals', completed: false, category: 'diet' },
      { title: 'Final health check', description: 'Complete recovery', time: 'Scheduled', completed: false, category: 'checkup' }
    ], notes: 'Maintain healthy habits.' }
  ],
  fracture: [
    { day: 1, tasks: [
      { title: 'Immobilize area', description: 'Keep cast dry and elevated', time: 'All Day', completed: false, category: 'rest' },
      { title: 'Pain medication', description: 'As prescribed', time: 'Every 6 hours', completed: false, category: 'medicine' },
      { title: 'Elevate limb', description: 'Above heart level', time: 'All Day', completed: false, category: 'rest' },
      { title: 'Ice therapy', description: '20 min on, 20 min off', time: 'Every 2 hours', completed: false, category: 'hygiene' },
      { title: 'Finger/toe exercises', description: 'Joints above/below fracture', time: 'Hourly', completed: false, category: 'exercise' }
    ], notes: 'Watch for compartment syndrome signs.' },
    { day: 7, tasks: [
      { title: 'Continue immobilization', description: 'Do not remove cast', time: 'All Day', completed: false, category: 'rest' },
      { title: 'Reduce pain meds', description: 'Taper as pain decreases', time: 'As needed', completed: false, category: 'medicine' },
      { title: 'ROM for other joints', description: 'Gentle nearby movements', time: '3x daily', completed: false, category: 'exercise' },
      { title: 'Isometric exercises', description: 'Muscle contractions', time: '09:00 AM, 03:00 PM', completed: false, category: 'exercise' },
      { title: 'Orthopedic follow-up', description: 'X-ray check', time: 'Scheduled', completed: false, category: 'checkup' }
    ], notes: 'Swelling should be decreasing.' },
    { day: 14, tasks: [
      { title: 'Partial weight bearing', description: 'If doctor cleared', time: 'As directed', completed: false, category: 'exercise' },
      { title: 'OTC pain relief', description: 'Ibuprofen as needed', time: 'As needed', completed: false, category: 'medicine' },
      { title: 'Strengthening', description: 'Around fracture area', time: '2x daily', completed: false, category: 'exercise' },
      { title: 'Calcium-rich diet', description: 'Dairy, greens, fortified', time: 'Meals', completed: false, category: 'diet' },
      { title: 'Cast care', description: 'Keep clean and dry', time: 'Daily', completed: false, category: 'hygiene' }
    ], notes: 'Good nutrition is critical.' },
    { day: 21, tasks: [
      { title: 'Increased weight bearing', description: 'Gradually increase', time: 'As directed', completed: false, category: 'exercise' },
      { title: 'Vitamin D supplements', description: 'Calcium + D for healing', time: 'Daily', completed: false, category: 'medicine' },
      { title: 'Pool therapy', description: 'Water exercises', time: 'If available', completed: false, category: 'exercise' },
      { title: 'Protein-rich meals', description: 'Bone and muscle repair', time: 'Meals', completed: false, category: 'diet' },
      { title: 'Follow-up X-ray', description: 'Healing progress', time: 'Scheduled', completed: false, category: 'checkup' }
    ], notes: 'Cast may be changed or removed.' },
    { day: 30, tasks: [
      { title: 'Physical therapy', description: 'Formal PT sessions', time: '2-3x weekly', completed: false, category: 'exercise' },
      { title: 'Continue supplements', description: 'Calcium and D', time: 'Daily', completed: false, category: 'medicine' },
      { title: 'Near-normal activities', description: 'With caution', time: 'As tolerated', completed: false, category: 'rest' },
      { title: 'Balanced diet', description: 'Calcium, protein, D, magnesium', time: 'Meals', completed: false, category: 'diet' },
      { title: 'Month assessment', description: 'Comprehensive check', time: 'Scheduled', completed: false, category: 'checkup' }
    ], notes: 'Full healing takes 6-12 weeks.' }
  ]
};

// ── Navbar ──
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 30);
  });

  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !links.contains(e.target)) links.classList.remove('open');
    });
  }

  updateNavAuth();
}

function updateNavAuth() {
  const token = localStorage.getItem('token');
  const actions = document.querySelector('.nav-actions');
  if (!actions) return;
  if (token) {
    actions.innerHTML = `
      <a href="dashboard.html" class="btn btn-sm btn-primary">Dashboard</a>
      <button onclick="logout()" class="btn btn-sm btn-ghost">Logout</button>
    `;
  } else {
    actions.innerHTML = `
      <a href="login.html" class="btn btn-sm btn-secondary">Login</a>
      <a href="register.html" class="btn btn-sm btn-primary">Sign Up</a>
    `;
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully', 'success');
  setTimeout(() => window.location.href = 'index.html', 800);
}

// ── Animations ──
function initAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));
}

// ── 3D Slider ──
function initSlider() {
  const slides = document.querySelectorAll('.slider-slide');
  const dots = document.querySelectorAll('.slider-dot');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  if (!slides.length) return;

  function updateSlider() {
    const total = slides.length;
    slides.forEach((slide, i) => {
      slide.className = 'slider-slide';
      if (i === currentSlide) slide.classList.add('active');
      else if (i === (currentSlide - 1 + total) % total) slide.classList.add('prev');
      else if (i === (currentSlide + 1) % total) slide.classList.add('next');
      else if (i === (currentSlide - 2 + total) % total) slide.classList.add('hidden-left');
      else slide.classList.add('hidden-right');
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));
  }

  function goNext() { currentSlide = (currentSlide + 1) % slides.length; updateSlider(); }
  function goPrev() { currentSlide = (currentSlide - 1 + slides.length) % slides.length; updateSlider(); }

  if (prevBtn) prevBtn.addEventListener('click', () => { goPrev(); resetInterval(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { goNext(); resetInterval(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { currentSlide = i; updateSlider(); resetInterval(); }));

  function resetInterval() { clearInterval(sliderInterval); sliderInterval = setInterval(goNext, 5000); }
  updateSlider();
  sliderInterval = setInterval(goNext, 5000);
}

// ── Login ──
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';
    btn.disabled = true;
    const result = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    btn.innerHTML = 'Login'; btn.disabled = false;
    if (result.success) {
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      showToast('Welcome back, ' + result.data.user.name + '!', 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    } else {
      showToast(result.message || 'Login failed', 'error');
    }
  });
}

// ── Register ──
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]').value.trim();
    const email = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const confirm = form.querySelector('[name="confirmPassword"]').value;
    if (!name || !email || !password || !confirm) { showToast('Please fill in all fields', 'error'); return; }
    if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }
    if (password.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
    btn.disabled = true;
    const result = await apiCall('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    btn.innerHTML = 'Create Account'; btn.disabled = false;
    if (result.success) {
      localStorage.setItem('token', result.data.token);
      localStorage.setItem('user', JSON.stringify(result.data.user));
      showToast('Account created! Welcome, ' + result.data.user.name, 'success');
      setTimeout(() => window.location.href = 'dashboard.html', 1000);
    } else {
      showToast(result.message || 'Registration failed', 'error');
    }
  });
}

// ── Recovery Page ──
function initRecoveryPage() {
  const conditionBtns = document.querySelectorAll('.condition-btn');
  const dayBtns = document.querySelectorAll('.day-btn');
  const taskContainer = document.getElementById('taskContainer');

  conditionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      conditionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCondition = btn.dataset.condition;
      selectedDay = 1;
      loadRecoveryPlan();
    });
  });

  dayBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dayBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDay = parseInt(btn.dataset.day);
      loadRecoveryPlan();
    });
  });

  loadRecoveryPlan();
}

async function loadRecoveryPlan() {
  const container = document.getElementById('taskContainer');
  const dayLabel = document.getElementById('dayLabel');
  if (!container) return;

  container.innerHTML = '<div class="text-center" style="padding:40px"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px;color:var(--primary)"></i></div>';
  if (dayLabel) dayLabel.textContent = `Day ${selectedDay}`;

  const result = await apiCall(`/recovery?condition=${selectedCondition}&day=${selectedDay}`);
  if (result.success && result.data) {
    const plan = result.data;
    const completedCount = plan.tasks.filter(t => t.completed).length;
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <span class="section-label">Day ${plan.day} Plan</span>
          <h3 style="font-size:18px">${completedCount}/${plan.tasks.length} tasks completed</h3>
        </div>
        <div style="width:120px;height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="width:${plan.tasks.length ? (completedCount/plan.tasks.length*100) : 0}%;height:100%;background:var(--accent);border-radius:4px;transition:width 0.5s"></div>
        </div>
      </div>
      <div class="task-list">
        ${plan.tasks.map((task, i) => `
          <div class="task-card ${task.completed ? 'completed' : ''}" data-index="${i}">
            <button class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${i}, this)">
              ${task.completed ? '<i class="fa-solid fa-check"></i>' : ''}
            </button>
            <div style="flex:1">
              <span class="task-category ${task.category}">${task.category}</span>
              <div class="task-title">${task.title}</div>
              <div class="task-desc">${task.description}</div>
              <div class="task-time"><i class="fa-regular fa-clock"></i> ${task.time}</div>
            </div>
          </div>
        `).join('')}
      </div>
      ${plan.notes ? `<div class="day-notes"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>Important:</strong> ${plan.notes}</div></div>` : ''}
    `;
  } else {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-clipboard-list"></i><h3>No plan found</h3><p>Select a condition and day to view your recovery plan.</p></div>';
  }
}

function toggleTask(index, btn) {
  const card = btn.closest('.task-card');
  const isCompleted = card.classList.toggle('completed');
  btn.classList.toggle('checked');
  btn.innerHTML = isCompleted ? '<i class="fa-solid fa-check"></i>' : '';
  if (isCompleted) showToast('Task completed!', 'success', 2000);
}

// ── Medicine Page ──
function initMedicinePage() {
  loadMedicines();
  const form = document.getElementById('medicineForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        name: form.querySelector('[name="name"]').value.trim(),
        dosage: form.querySelector('[name="dosage"]').value.trim(),
        time: form.querySelector('[name="time"]').value,
        frequency: form.querySelector('[name="frequency"]').value,
        notes: form.querySelector('[name="notes"]').value.trim()
      };
      if (!data.name || !data.dosage || !data.time) { showToast('Please fill required fields', 'error'); return; }
      const result = await apiCall('/medicine', { method: 'POST', body: JSON.stringify(data) });
      if (result.success) {
        showToast('Medicine added successfully', 'success');
        form.reset();
        loadMedicines();
      } else {
        showToast(result.message || 'Failed to add medicine', 'error');
      }
    });
  }
}

async function loadMedicines() {
  const container = document.getElementById('medicineList');
  if (!container) return;
  container.innerHTML = '<div class="text-center" style="padding:40px"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px;color:var(--primary)"></i></div>';
  const result = await apiCall('/medicine');
  if (result.success && result.data) {
    medicines = result.data;
    if (medicines.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-pills"></i><h3>No medicines added</h3><p>Add your first medicine using the form above.</p></div>';
      return;
    }
    container.innerHTML = `<div class="medicine-list">${medicines.map(med => `
      <div class="medicine-card ${med.takenToday ? 'taken' : ''}" id="med-${med._id}">
        <div class="medicine-icon">
          <i class="fa-solid ${med.takenToday ? 'fa-circle-check' : 'fa-capsules'}"></i>
        </div>
        <div class="medicine-info">
          <div class="medicine-name">${med.name}</div>
          <div class="medicine-details">
            <span><i class="fa-solid fa-prescription-bottle"></i> ${med.dosage}</span>
            <span><i class="fa-regular fa-clock"></i> ${med.time}</span>
            <span><i class="fa-solid fa-repeat"></i> ${med.frequency.replace('-', ' ')}</span>
          </div>
          ${med.notes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">${med.notes}</div>` : ''}
        </div>
        <div class="medicine-actions">
          <button class="btn btn-sm ${med.takenToday ? 'btn-accent' : 'btn-secondary'}" onclick="toggleMedicine('${med._id}')">
            ${med.takenToday ? '<i class="fa-solid fa-check"></i> Taken' : 'Mark Taken'}
          </button>
          <button class="btn btn-sm btn-icon btn-ghost" onclick="deleteMedicine('${med._id}')" title="Delete">
            <i class="fa-solid fa-trash" style="color:var(--danger)"></i>
          </button>
        </div>
      </div>
    `).join('')}</div>`;
  }
}

async function toggleMedicine(id) {
  const result = await apiCall(`/medicine/${id}/taken`, { method: 'PUT', body: JSON.stringify({}) });
  if (result.success) { loadMedicines(); showToast('Medicine status updated', 'success', 2000); }
}

async function deleteMedicine(id) {
  const card = document.getElementById('med-' + id);
  if (card) {
    card.style.transition = 'all 0.3s';
    card.style.opacity = '0';
    card.style.transform = 'translateX(40px)';
  }
  const result = await apiCall(`/medicine/${id}`, { method: 'DELETE' });
  if (result.success) { setTimeout(() => loadMedicines(), 300); showToast('Medicine removed', 'success', 2000); }
}

// ── Reminder System ──
function startReminderSystem() {
  reminderInterval = setInterval(() => {
    if (medicines.length === 0) return;
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    medicines.forEach(med => {
      if (!med.takenToday && med.time === currentTime) {
        showToast(`Time to take ${med.name} (${med.dosage})`, 'medicine', 8000);
      }
    });
  }, 30000);
}

// ── Exercise Page ──
function initExercisePage() {
  const filterBtns = document.querySelectorAll('.exercise-filter-btn');
  const grid = document.getElementById('exerciseGrid');
  if (!grid) return;

  const exercises = [
    { id: 1, title: 'Deep Breathing', category: 'breathing', duration: '5 min', difficulty: 'Easy', description: 'Slow deep breaths to expand lung capacity and reduce stress after surgery.', image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=600&h=400&fit=crop' },
    { id: 2, title: 'Ankle Pumps', category: 'mobility', duration: '10 min', difficulty: 'Easy', description: 'Gentle ankle flexion and extension to promote blood circulation.', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&h=400&fit=crop' },
    { id: 3, title: 'Shoulder Rolls', category: 'stretching', duration: '5 min', difficulty: 'Easy', description: 'Forward and backward shoulder rolls to relieve upper body tension.', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&h=400&fit=crop' },
    { id: 4, title: 'Walking Program', category: 'cardio', duration: '15 min', difficulty: 'Moderate', description: 'Gradual walking program to rebuild endurance after bed rest.', image: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&h=400&fit=crop' },
    { id: 5, title: 'Knee Bends', category: 'strength', duration: '10 min', difficulty: 'Moderate', description: 'Supported knee bends to maintain joint flexibility.', image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=600&h=400&fit=crop' },
    { id: 6, title: 'Neck Stretches', category: 'stretching', duration: '5 min', difficulty: 'Easy', description: 'Gentle neck side bends and rotations to relieve stiffness.', image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop' },
    { id: 7, title: 'Leg Raises', category: 'strength', duration: '10 min', difficulty: 'Moderate', description: 'Lying leg raises to strengthen core and hip flexors.', image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&h=400&fit=crop' },
    { id: 8, title: 'Wrist Circles', category: 'mobility', duration: '5 min', difficulty: 'Easy', description: 'Circular wrist movements to maintain joint mobility.', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&h=400&fit=crop' },
    { id: 9, title: 'Seated Marching', category: 'cardio', duration: '8 min', difficulty: 'Easy', description: 'March in place while seated for gentle cardiovascular exercise.', image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&h=400&fit=crop' },
    { id: 10, title: 'Wall Push-ups', category: 'strength', duration: '8 min', difficulty: 'Moderate', description: 'Modified push-ups against a wall to build upper body strength.', image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&h=400&fit=crop' }
  ];

  function renderExercises(filter = 'all') {
    const filtered = filter === 'all' ? exercises : exercises.filter(e => e.category === filter);
    grid.innerHTML = filtered.map(ex => `
      <div class="exercise-card">
        <img class="exercise-img" src="${ex.image}" alt="${ex.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop'">
        <div class="exercise-body">
          <div class="exercise-category">${ex.category}</div>
          <h3>${ex.title}</h3>
          <p>${ex.description}</p>
          <div class="exercise-meta">
            <span><i class="fa-regular fa-clock"></i> ${ex.duration}</span>
            <span><i class="fa-solid fa-signal"></i> ${ex.difficulty}</span>
          </div>
        </div>
      </div>
    `).join('');
    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state"><i class="fa-solid fa-dumbbell"></i><h3>No exercises found</h3><p>Try a different category filter.</p></div>';
    }
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderExercises(btn.dataset.filter);
    });
  });

  renderExercises();
}

// ── Dashboard ──
async function initDashboard() {
  const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
  if (!userId) { window.location.href = 'login.html'; return; }

  const result = await apiCall(`/user/${userId}`);
  if (result.success && result.data) {
    const { user, stats } = result.data;
    renderDashboard(user, stats);
  }
}

function renderDashboard(user, stats) {
  // Stat cards
  const statCards = document.getElementById('statCards');
  if (statCards) {
    statCards.innerHTML = `
      <div class="stat-card blue animate-in delay-1">
        <div class="stat-icon blue"><i class="fa-solid fa-clipboard-check"></i></div>
        <div class="stat-value">${stats.taskCompletionRate}%</div>
        <div class="stat-label">Task Completion</div>
      </div>
      <div class="stat-card green animate-in delay-2">
        <div class="stat-icon green"><i class="fa-solid fa-pills"></i></div>
        <div class="stat-value">${stats.medicineAdherenceRate}%</div>
        <div class="stat-label">Medicine Adherence</div>
      </div>
      <div class="stat-card amber animate-in delay-3">
        <div class="stat-icon amber"><i class="fa-solid fa-calendar-check"></i></div>
        <div class="stat-value">${stats.completedTasks}/${stats.totalTasks}</div>
        <div class="stat-label">Tasks Done</div>
      </div>
      <div class="stat-card purple animate-in delay-4">
        <div class="stat-icon purple"><i class="fa-solid fa-heart-pulse"></i></div>
        <div class="stat-value">Day 1</div>
        <div class="stat-label">Recovery Day</div>
      </div>
    `;
  }

  // Progress ring
  const progressRing = document.getElementById('progressRing');
  if (progressRing) {
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (stats.taskCompletionRate / 100) * circumference;
    progressRing.innerHTML = `
      <div class="progress-ring-container">
        <svg class="progress-ring" width="130" height="130">
          <circle class="progress-ring-bg" cx="65" cy="65" r="54"/>
          <circle class="progress-ring-fill" cx="65" cy="65" r="54"
            stroke="var(--primary)" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" id="ringFill"/>
        </svg>
        <div class="progress-info">
          <h4>${stats.taskCompletionRate}%</h4>
          <p>Overall Recovery Progress</p>
        </div>
      </div>
    `;
    setTimeout(() => {
      const fill = document.getElementById('ringFill');
      if (fill) fill.style.strokeDashoffset = offset;
    }, 200);
  }

  // Bar chart
  const barChart = document.getElementById('barChart');
  if (barChart) {
    const days = ['Day 1', 'Day 3', 'Day 7', 'Day 14', 'Day 30'];
    const values = [100, 85, 65, 45, 20];
    const maxVal = Math.max(...values);
    barChart.innerHTML = days.map((d, i) => `
      <div class="bar-item">
        <div class="bar" style="height: 0%" data-height="${(values[i] / maxVal) * 100}%"></div>
        <span class="bar-label">${d}</span>
      </div>
    `).join('');
    setTimeout(() => {
      barChart.querySelectorAll('.bar').forEach(bar => {
        bar.style.height = bar.dataset.height;
      });
    }, 400);
  }

  // Activity feed
  const activityFeed = document.getElementById('activityFeed');
  if (activityFeed) {
    const activities = [
      { text: 'Completed "Deep breathing exercises"', time: '2 hours ago', color: 'green' },
      { text: 'Took Ibuprofen 400mg', time: '3 hours ago', color: 'blue' },
      { text: 'Started Day 7 recovery plan', time: '5 hours ago', color: 'amber' },
      { text: 'Completed "Wound care check"', time: '6 hours ago', color: 'green' },
      { text: 'Added new medicine: Omeprazole', time: 'Yesterday', color: 'blue' }
    ];
    activityFeed.innerHTML = activities.map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.color}"></div>
        <div>
          <div class="activity-text">${a.text}</div>
          <div class="activity-time">${a.time}</div>
        </div>
      </div>
    `).join('');
  }

  // Upcoming medicines
  const upcomingMeds = document.getElementById('upcomingMeds');
  if (upcomingMeds) {
    const meds = [
      { name: 'Amoxicillin', dose: '500mg', time: '08:00 AM' },
      { name: 'Omeprazole', dose: '20mg', time: '09:00 AM' },
      { name: 'Ibuprofen', dose: '400mg', time: '02:00 PM' },
      { name: 'Acetaminophen', dose: '650mg', time: '06:00 PM' }
    ];
    upcomingMeds.innerHTML = meds.map(m => `
      <div class="upcoming-med">
        <span class="upcoming-med-time">${m.time}</span>
        <span class="upcoming-med-name">${m.name}</span>
        <span class="upcoming-med-dose">${m.dose}</span>
      </div>
    `).join('');
  }

  // Welcome message
  const welcomeName = document.getElementById('welcomeName');
  if (welcomeName) welcomeName.textContent = user.name;
}