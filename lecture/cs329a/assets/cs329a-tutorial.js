/* CS329A tutorial runtime: no network, no eval, no user-code execution. */
(() => {
  const page = document.querySelector('.cs329a-tutorial');
  if (!page) return;
  const $ = (selector, scope = page) => scope.querySelector(selector);
  const $$ = (selector, scope = page) => [...scope.querySelectorAll(selector)];
  const menu = $('.cs329a-menu');
  const sidebar = $('.cs329a-sidebar');
  const scrim = $('.cs329a-scrim');
  const reader = $('.cs329a-reader');
  const closeTargets = $$('[data-close-sidebar]:not(.cs329a-scrim)');
  let returnFocus = menu;
  if (sidebar) sidebar.setAttribute('tabindex', '-1');

  const closeSidebar = () => {
    page.classList.remove('cs329a-sidebar-open');
    if (menu) menu.setAttribute('aria-expanded', 'false');
  };
  const openSidebar = () => {
    if (!menu) return;
    returnFocus = document.activeElement;
    page.classList.add('cs329a-sidebar-open');
    menu.setAttribute('aria-expanded', 'true');
    const first = $('.cs329a-nav-item', sidebar);
    if (first) first.focus();
  };
  if (menu) menu.addEventListener('click', () => page.classList.contains('cs329a-sidebar-open') ? closeSidebar() : openSidebar());
  if (scrim) scrim.addEventListener('click', () => {
    closeSidebar();
    if (window.matchMedia('(max-width: 780px)').matches && returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
  });
  closeTargets.forEach(link => link.addEventListener('click', () => {
    closeSidebar();
    if (window.matchMedia('(max-width: 780px)').matches && returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
  }));
  document.addEventListener('keydown', event => {
    if (!page.classList.contains('cs329a-sidebar-open')) return;
    if (event.key === 'Escape') {
      closeSidebar();
      if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
      return;
    }
    if (event.key === 'Tab' && sidebar) {
      const focusable = $$('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])', sidebar)
        .filter(node => !node.disabled && node.getAttribute('aria-hidden') !== 'true');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  const themeButton = $('.cs329a-theme');
  const savedTheme = (() => { try { return localStorage.getItem('cs329a-tutorial-theme'); } catch (_) { return null; } })();
  if (savedTheme === 'dark') page.classList.add('cs329a-dark');
  if (themeButton) themeButton.addEventListener('click', () => {
    const dark = page.classList.toggle('cs329a-dark');
    try { localStorage.setItem('cs329a-tutorial-theme', dark ? 'dark' : 'light'); } catch (_) {}
  });
  const setFontSize = delta => {
    const current = parseFloat(getComputedStyle(page).getPropertyValue('--cs-reader-size')) || 17;
    page.style.setProperty('--cs-reader-size', `${Math.max(14, Math.min(21, current + delta))}px`);
  };
  const fontDown = $('.cs329a-font-down');
  const fontUp = $('.cs329a-font-up');
  if (fontDown) fontDown.addEventListener('click', () => setFontSize(-1));
  if (fontUp) fontUp.addEventListener('click', () => setFontSize(1));
  const printButton = $('.cs329a-print');
  if (printButton) printButton.addEventListener('click', () => window.print());

  const links = $$('[data-section]');
  const setActive = id => links.forEach(link => {
    const active = link.dataset.section === id;
    if (link.classList.contains('cs329a-nav-item')) link.setAttribute('aria-current', active ? 'page' : 'false');
    else link.setAttribute('aria-current', active ? 'true' : 'false');
  });
  const sections = $$('section[id]');
  if (sections.length) {
    const initial = window.location.hash.slice(1);
    if (initial && sections.some(section => section.id === initial)) setActive(initial);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      }, { root: reader || null, rootMargin: '-12% 0px -68% 0px', threshold: [0.05, 0.25, 0.6] });
      sections.forEach(section => observer.observe(section));
    }
  }

  const search = $('.cs329a-search');
  const status = $('.cs329a-search-status');
  const searchable = $$('[data-search]');
  const runSearch = () => {
    if (!search || !searchable.length) return;
    const query = search.value.trim().toLowerCase();
    let matches = 0;
    searchable.forEach(item => {
      const haystack = `${item.dataset.search || ''} ${item.textContent}`.toLowerCase();
      const visible = !query || haystack.includes(query);
      item.hidden = !visible;
      if (visible) matches += 1;
    });
    if (status) {
      status.textContent = query ? `本页搜索：${matches} 个内容块匹配“${query}”。` : '本页搜索已清除。';
    }
  };
  if (search) search.addEventListener('input', runSearch);

  const svg = (tag, attributes = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  };
  const setText = (node, value) => { if (node) node.textContent = value; };
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const announce = (node, value) => { setText(node, value); if (node) node.setAttribute('data-updated', String(Date.now())); };
  window.CS329A = Object.freeze({ $, $$, svg, setText, clamp, announce });
})();
