/* Static framework page controls; intentionally separate from the 20-session view router. */
(() => {
  const body = document.body;
  const root = document.documentElement;
  const sidebar = document.getElementById('sidebar');
  const menu = document.getElementById('menu-button');
  const scrim = document.getElementById('sidebar-scrim');
  const returnFocus = () => { if (menu) menu.focus(); };
  const close = (restore = false) => {
    body.classList.remove('cs329a-drawer-open');
    menu?.setAttribute('aria-expanded', 'false');
    if (restore) returnFocus();
  };
  const open = () => {
    body.classList.add('cs329a-drawer-open');
    menu?.setAttribute('aria-expanded', 'true');
    sidebar?.querySelector('a[href]')?.focus();
  };
  body.classList.add('cs329a-enhanced');
  menu?.addEventListener('click', () => body.classList.contains('cs329a-drawer-open') ? close() : open());
  scrim?.addEventListener('click', () => close(true));
  sidebar?.querySelectorAll('a[href]').forEach(link => link.addEventListener('click', () => close(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && body.classList.contains('cs329a-drawer-open')) { close(true); return; }
    if (event.key !== 'Tab' || !body.classList.contains('cs329a-drawer-open') || !sidebar) return;
    const focusable = [...sidebar.querySelectorAll('a[href],button,input,[tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  const get = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const set = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  if (get('cs329a-reader-theme') === 'dark') root.dataset.theme = 'dark';
  document.getElementById('theme-button')?.addEventListener('click', () => {
    const dark = root.dataset.theme !== 'dark';
    if (dark) root.dataset.theme = 'dark'; else delete root.dataset.theme;
    set('cs329a-reader-theme', dark ? 'dark' : 'light');
  });
  const size = delta => {
    const current = parseFloat(getComputedStyle(root).getPropertyValue('--reader-size')) || 17;
    root.style.setProperty('--reader-size', `${Math.max(14, Math.min(22, current + delta))}px`);
  };
  document.getElementById('font-down')?.addEventListener('click', () => size(-1));
  document.getElementById('font-up')?.addEventListener('click', () => size(1));
  document.getElementById('print-button')?.addEventListener('click', () => window.print());
})();
