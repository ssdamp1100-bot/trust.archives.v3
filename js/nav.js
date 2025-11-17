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

        // Inject Logout button for logged-in users
        let logoutBtn = navMenu.querySelector('#logoutBtn');
        if (!logoutBtn) {
          logoutBtn = document.createElement('button');
          logoutBtn.id = 'logoutBtn';
          logoutBtn.className = 'menu-item login-btn';
          logoutBtn.type = 'button';
          logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> تسجيل الخروج';
          logoutBtn.addEventListener('click', async () => {
            try {
              const res = await window.authService?.logout?.();
              if (res?.success) {
                window.location.href = 'index.html';
              } else {
                // Fallback: clear client state and redirect
                window.authService?.clearUser?.();
                window.location.href = 'index.html';
              }
            } catch (e) {
              window.authService?.clearUser?.();
              window.location.href = 'index.html';
            }
          });
          navMenu.appendChild(logoutBtn);
        } else {
          // Ensure class matches login button style if already exists
          logoutBtn.classList.add('login-btn');
        }
      }
    }
  } catch (e) {
    console.warn('nav.js: admin link init failed', e);
  }

  // If not logged in, ensure logout button is removed if present
  try {
    if (!(window.authService && window.authService.isLoggedIn && window.authService.isLoggedIn())) {
      const navMenu = document.querySelector('.main-menu');
      const logoutBtn = navMenu?.querySelector('#logoutBtn');
      if (logoutBtn) logoutBtn.remove();
    }
  } catch (e) {
    // no-op
  }
});