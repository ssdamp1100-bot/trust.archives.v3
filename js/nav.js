document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.main-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      menu.classList.toggle('active');
    });
  }

  // Admin link injection (site-wide)
  try {
    if (window.authService && window.authService.isLoggedIn && window.authService.isLoggedIn()) {
      const user = window.authService.getCurrentUser?.();
      const navMenu = document.querySelector('.main-menu');
      if (navMenu) {
        const existing = navMenu.querySelector('a[href="admin.html"]');
        if (user?.role === 'admin') {
          if (!existing) {
            const link = document.createElement('a');
            link.href = 'admin.html';
            link.className = 'menu-item';
            link.innerHTML = '<i class="fa fa-cog" aria-hidden="true"></i> لوحة الإدارة';
            navMenu.appendChild(link);
          }
        } else if (existing) {
          existing.remove();
        }
      }
    }
  } catch (e) {
    console.warn('nav.js: admin link init failed', e);
  }
});