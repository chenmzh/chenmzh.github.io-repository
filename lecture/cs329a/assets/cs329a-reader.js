/* CS329A reader runtime: local navigation only; no network, eval, or HTML injection. */
(() => {
  const body = document.body;
  const reader = document.getElementById('reader-scroll');
  const views = [...document.querySelectorAll('.session-view')];
  const navLinks = [...document.querySelectorAll('[data-view]')];
  const toc = document.getElementById('section-toc');
  const previous = document.getElementById('previous-button');
  const next = document.getElementById('next-button');
  const pageCount = document.getElementById('page-count');
  const toolbarTitle = document.getElementById('toolbar-title');
  const menu = document.getElementById('menu-button');
  const sidebar = document.getElementById('sidebar');
  const scrim = document.getElementById('sidebar-scrim');
  const search = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');
  const searchStatus = document.getElementById('search-status');
  const sessionIds = views.map(view => view.id);
  let activeView = null;
  let tocObserver = null;
  let returnFocus = menu;

  if (!views.length) return;
  body.classList.add('cs329a-enhanced');
  if (sidebar) sidebar.setAttribute('tabindex', '-1');

  const text = (node, value) => { if (node) node.textContent = value; };
  const titleOf = view => view.dataset.title || view.querySelector('h1')?.textContent.trim() || view.id;
  const numberOf = view => view.dataset.number || view.id.replace(/\D/g, '').padStart(2, '0');
  const viewFor = id => document.getElementById(id)?.closest('.session-view') || document.getElementById(id);
  const short = value => value.replace(/\s+/g, ' ').trim().slice(0, 150);

  const setNavState = viewId => navLinks.forEach(link => {
    const active = link.dataset.view === viewId;
    link.setAttribute('aria-current', active ? 'page' : 'false');
  });

  const setPager = index => {
    const previousView = views[index - 1];
    const nextView = views[index + 1];
    const setLink = (link, view, direction) => {
      if (!link) return;
      if (!view) {
        link.removeAttribute('href');
        link.setAttribute('aria-disabled', 'true');
        text(link, '');
        return;
      }
      link.href = `#${view.id}`;
      link.setAttribute('aria-disabled', 'false');
      text(link, `${direction} ${numberOf(view)} · ${titleOf(view)}`);
    };
    setLink(previous, previousView, '←');
    setLink(next, nextView, '→');
    text(pageCount, `${String(index + 1).padStart(2, '0')} / ${views.length}`);
  };

  const markToc = id => [...toc.querySelectorAll('a[data-target]')].forEach(link => {
    link.setAttribute('aria-current', link.dataset.target === id ? 'location' : 'false');
  });

  const observeToc = active => {
    if (tocObserver) tocObserver.disconnect();
    if (!('IntersectionObserver' in window)) return;
    const headings = [...active.querySelectorAll('h2[id], h3[id]')];
    tocObserver = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) markToc(visible[0].target.id);
    }, { root: reader, rootMargin: '-10% 0px -72% 0px', threshold: [0.05, 0.25, 0.7] });
    headings.forEach(heading => tocObserver.observe(heading));
  };

  const buildToc = active => {
    toc.replaceChildren();
    const headings = [...active.querySelectorAll('h2[id], h3[id]')];
    headings.forEach(heading => {
      const link = document.createElement('a');
      link.className = 'cs329a-toc';
      link.dataset.target = heading.id;
      link.dataset.level = heading.tagName === 'H3' ? '3' : '2';
      link.href = `#${heading.id}`;
      link.setAttribute('aria-current', 'false');
      link.textContent = heading.textContent.trim();
      link.addEventListener('click', event => {
        event.preventDefault();
        const target = document.getElementById(heading.id);
        if (target) {
          history.pushState(null, '', `#${heading.id}`);
          reader.scrollTo({ top: Math.max(0, target.offsetTop - 18), behavior: 'smooth' });
          target.focus({ preventScroll: true });
          markToc(heading.id);
        }
      });
      toc.append(link);
    });
    observeToc(active);
  };

  const activate = (viewId, headingId = '', writeHash = false, focusHeading = false) => {
    const active = document.getElementById(viewId)?.closest('.session-view') || views[0];
    const index = views.indexOf(active);
    activeView = active;
    views.forEach(view => { view.hidden = view !== active; });
    setNavState(active.id);
    setPager(index);
    buildToc(active);
    text(toolbarTitle, `CS329A / ${numberOf(active)} · ${titleOf(active)}`);
    document.title = `${numberOf(active)} · ${titleOf(active)} · CS329A`;
    reader.scrollTop = 0;
    const candidate = headingId ? document.getElementById(headingId) : null;
    const target = candidate && candidate.closest('.session-view') === active ? candidate : null;
    if (writeHash) history.pushState(null, '', `#${target ? headingId : active.id}`);
    if (target) {
      reader.scrollTo({ top: Math.max(0, target.offsetTop - 18), behavior: 'auto' });
      markToc(target.id);
      if (focusHeading) target.focus({ preventScroll: true });
    }
  };

  const activateFromHash = () => {
    const raw = decodeURIComponent(location.hash.slice(1));
    const direct = raw ? document.getElementById(raw) : null;
    const active = direct?.closest('.session-view') || views.find(view => view.id === raw) || views[0];
    const heading = direct && direct !== active ? direct.id : '';
    activate(active.id, heading, false, Boolean(heading));
  };

  navLinks.forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    activate(link.dataset.view, '', true, false);
    closeDrawer(true);
  }));
  [previous, next].forEach(link => link?.addEventListener('click', event => {
    if (link.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; }
    event.preventDefault();
    const target = viewFor(link.getAttribute('href').slice(1));
    if (target) { activate(target.id, '', true, false); closeDrawer(true); }
  }));
  window.addEventListener('hashchange', activateFromHash);
  window.addEventListener('popstate', activateFromHash);

  const closeDrawer = restore => {
    body.classList.remove('cs329a-drawer-open');
    if (menu) menu.setAttribute('aria-expanded', 'false');
    if (restore && returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
  };
  const openDrawer = () => {
    if (!menu) return;
    returnFocus = document.activeElement;
    body.classList.add('cs329a-drawer-open');
    menu.setAttribute('aria-expanded', 'true');
    sidebar?.querySelector('a[href], button, input, select')?.focus();
  };
  menu?.addEventListener('click', () => body.classList.contains('cs329a-drawer-open') ? closeDrawer(false) : openDrawer());
  scrim?.addEventListener('click', () => closeDrawer(true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && body.classList.contains('cs329a-drawer-open')) {
      closeDrawer(true);
      return;
    }
    if (event.key === 'Tab' && body.classList.contains('cs329a-drawer-open') && sidebar) {
      const focusable = [...sidebar.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(node => !node.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); search?.focus(); }
  });

  const root = document.documentElement;
  const storageGet = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
  const storageSet = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
  if (storageGet('cs329a-reader-theme') === 'dark') root.dataset.theme = 'dark';
  document.getElementById('theme-button')?.addEventListener('click', () => {
    const dark = root.dataset.theme !== 'dark';
    if (dark) root.dataset.theme = 'dark'; else delete root.dataset.theme;
    storageSet('cs329a-reader-theme', dark ? 'dark' : 'light');
  });
  const changeFont = delta => {
    const current = parseFloat(getComputedStyle(root).getPropertyValue('--reader-size')) || 17;
    root.style.setProperty('--reader-size', `${Math.max(14, Math.min(22, current + delta))}px`);
  };
  document.getElementById('font-down')?.addEventListener('click', () => changeFont(-1));
  document.getElementById('font-up')?.addEventListener('click', () => changeFont(1));
  document.getElementById('print-button')?.addEventListener('click', () => window.print());

  const searchIndex = [];
  views.forEach(view => {
    [...view.querySelectorAll('h1, h2, h3')].forEach(heading => {
      searchIndex.push({ viewId: view.id, headingId: heading.id, title: heading.textContent.trim(), body: short(heading.parentElement?.textContent || view.textContent) });
    });
  });
  const clearResults = () => { searchResults.replaceChildren(); searchResults.hidden = true; };
  const runSearch = () => {
    const query = search.value.trim().toLocaleLowerCase();
    if (!query) { clearResults(); text(searchStatus, '搜索已清除。'); return; }
    const hits = searchIndex.filter(item => `${item.title} ${item.body}`.toLocaleLowerCase().includes(query)).slice(0, 30);
    searchResults.replaceChildren();
    hits.forEach(hit => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cs329a-search-result';
      const meta = document.createElement('span'); meta.className = 'cs329a-result-meta'; meta.textContent = `SESSION ${numberOf(document.getElementById(hit.viewId))}`;
      const heading = document.createElement('span'); heading.className = 'cs329a-result-heading'; heading.textContent = hit.title;
      const snippet = document.createElement('span'); snippet.className = 'cs329a-result-snippet'; snippet.textContent = hit.body;
      button.append(meta, heading, snippet);
      button.addEventListener('click', () => { activate(hit.viewId, hit.headingId, true, true); clearResults(); search.value = ''; });
      searchResults.append(button);
    });
    searchResults.hidden = hits.length === 0;
    text(searchStatus, hits.length ? `找到 ${hits.length} 个匹配标题。` : `没有找到“${query}”的讲次或小节。`);
  };
  search?.addEventListener('input', runSearch);
  search?.addEventListener('keydown', event => { if (event.key === 'Escape') { search.value = ''; clearResults(); search.blur(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.cs329a-search-wrap')) clearResults(); });

  activateFromHash();
})();
