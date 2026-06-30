// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
    });
  });

  navLinks.querySelectorAll('.has-dropdown .nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (window.innerWidth <= 900) {
        e.preventDefault();
        btn.closest('.has-dropdown').classList.toggle('open');
      }
    });
  });
}

// ===== FEATURE TABS =====
const featTabs = document.querySelectorAll('.feat-tab');
featTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const feat = tab.dataset.feat;
    featTabs.forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.feat-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panel = document.getElementById('feat-' + feat);
    if (panel) panel.classList.add('active');
  });
});

// ===== DASHBOARD TABS =====
const dashTabs = document.querySelectorAll('.dash-tab');
const dashScreens = document.querySelectorAll('.dash-screen');

dashTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    dashTabs.forEach(t => t.classList.remove('active'));
    dashScreens.forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    const screen = document.getElementById('tab-' + target);
    if (screen) screen.classList.add('active');
  });
});

// ===== FAQ ACCORDION =====
function toggleFaq(btn) {
  const isOpen = btn.classList.contains('open');
  const answer = btn.nextElementSibling;

  document.querySelectorAll('.faq-q.open').forEach(q => {
    q.classList.remove('open');
    const a = q.nextElementSibling;
    if (a) a.classList.remove('open');
  });

  if (!isOpen) {
    btn.classList.add('open');
    if (answer) answer.classList.add('open');
  }
}

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

document.querySelectorAll('.anim').forEach(el => observer.observe(el));
