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
  const focusTarget = target => {
    if (!target) return;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  const revealTarget = target => {
    const details = target?.closest('details');
    if (details) details.open = true;
  };
  const readerPosition = target => Math.max(0, target.getBoundingClientRect().top - reader.getBoundingClientRect().top + reader.scrollTop - 18);
  const decodeHash = encoded => {
    try { return decodeURIComponent(encoded); } catch (_) { return encoded; }
  };
  const headingExcerpt = heading => {
    const parts = [];
    let sibling = heading.nextElementSibling;
    while (sibling && parts.join(' ').length < 220) {
      if (/^H[1-3]$/.test(sibling.tagName)) break;
      if (sibling.matches('p, ul, ol, table, .cs329a-question, .cs329a-paper-meta')) parts.push(sibling.textContent || '');
      sibling = sibling.nextElementSibling;
    }
    return short(parts.join(' ') || heading.parentElement?.textContent || heading.textContent);
  };

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

  const updateFallbackToc = () => {
    if ('IntersectionObserver' in window || !activeView || !reader) return;
    const headings = [...activeView.querySelectorAll('h2[id], h3[id]')];
    const current = headings.reduce((found, heading) => heading.offsetTop <= reader.scrollTop + 36 ? heading : found, headings[0]);
    if (current) markToc(current.id);
  };
  reader?.addEventListener('scroll', updateFallbackToc, { passive: true });

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
          revealTarget(target);
          history.pushState(null, '', `#${heading.id}`);
          reader.scrollTo({ top: readerPosition(target), behavior: 'smooth' });
          focusTarget(target);
          markToc(heading.id);
        }
      });
      toc.append(link);
    });
    if (headings[0]) markToc(headings[0].id);
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
    const candidate = headingId ? document.getElementById(headingId) : null;
    const target = candidate && candidate.closest('.session-view') === active ? candidate : null;
    if (writeHash) history.pushState(null, '', `#${target ? headingId : active.id}`);
    const positionActive = () => {
      const activePosition = active.getBoundingClientRect().top - reader.getBoundingClientRect().top + reader.scrollTop;
      const showCourseGuide = active === views[0] && !writeHash && !headingId && !location.hash;
      reader.scrollTop = showCourseGuide ? 0 : Math.max(0, activePosition);
      if (target) {
        revealTarget(target);
        reader.scrollTo({ top: readerPosition(target), behavior: 'auto' });
        markToc(target.id);
        if (focusHeading) focusTarget(target);
      }
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(positionActive));
  };

  const activateFromHash = () => {
    const encoded = location.hash.slice(1);
    const raw = decodeHash(encoded);
    const direct = raw ? document.getElementById(raw) : null;
    const current = activeView || views[0];
    if (direct && !direct.closest('.session-view')) {
      activate(current.id, '', false, false);
      return;
    }
    const known = !raw || Boolean(direct) || sessionIds.includes(raw);
    if (!known) {
      history.replaceState(null, '', `#${views[0].id}`);
      activate(views[0].id, '', false, false);
      return;
    }
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
  document.querySelector('.cs329a-skip')?.addEventListener('click', event => {
    event.preventDefault();
    const target = document.getElementById('reader-main');
    focusTarget(target);
  });

  const mobileQuery = window.matchMedia('(max-width: 780px)');
  let drawerOpen = false;
  const updateDrawerA11y = () => {
    const mobile = mobileQuery.matches;
    if (sidebar) {
      sidebar.setAttribute('aria-hidden', mobile && !drawerOpen ? 'true' : 'false');
      if ('inert' in sidebar) sidebar.inert = mobile && !drawerOpen;
    }
  };
  const closeDrawer = restore => {
    drawerOpen = false;
    body.classList.remove('cs329a-drawer-open');
    if (menu) {
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', '打开课程导航');
    }
    updateDrawerA11y();
    if (restore && returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
  };
  const openDrawer = () => {
    if (!menu) return;
    returnFocus = document.activeElement;
    drawerOpen = true;
    body.classList.add('cs329a-drawer-open');
    menu.setAttribute('aria-expanded', 'true');
    menu.setAttribute('aria-label', '关闭课程导航');
    updateDrawerA11y();
    sidebar?.querySelector('a[href], button, input, select')?.focus();
  };
  mobileQuery.addEventListener?.('change', updateDrawerA11y);
  updateDrawerA11y();
  menu?.addEventListener('click', () => drawerOpen ? closeDrawer(false) : openDrawer());
  scrim?.addEventListener('click', () => closeDrawer(true));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drawerOpen) {
      closeDrawer(true);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (drawerOpen) closeDrawer(false);
      search?.focus();
      return;
    }
    if (event.key === 'Tab' && drawerOpen && sidebar) {
      const focusable = [...sidebar.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(node => !node.disabled);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
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
      searchIndex.push({ viewId: view.id, headingId: heading.id, title: heading.textContent.trim(), body: headingExcerpt(heading) });
    });
  });
  const clearResults = () => {
    searchResults.replaceChildren();
    searchResults.hidden = true;
    search?.setAttribute('aria-expanded', 'false');
  };
  const runSearch = () => {
    const query = search.value.trim().toLocaleLowerCase();
    if (!query) { clearResults(); text(searchStatus, '搜索已清除。'); return; }
    const hits = searchIndex.filter(item => `${item.title} ${item.body}`.toLocaleLowerCase().includes(query)).slice(0, 30);
    searchResults.replaceChildren();
    hits.forEach(hit => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cs329a-search-result';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', 'false');
      const meta = document.createElement('span'); meta.className = 'cs329a-result-meta'; meta.textContent = `SESSION ${numberOf(document.getElementById(hit.viewId))}`;
      const heading = document.createElement('span'); heading.className = 'cs329a-result-heading'; heading.textContent = hit.title;
      const snippet = document.createElement('span'); snippet.className = 'cs329a-result-snippet'; snippet.textContent = hit.body;
      button.append(meta, heading, snippet);
      button.addEventListener('click', () => { activate(hit.viewId, hit.headingId, true, true); clearResults(); search.value = ''; });
      searchResults.append(button);
    });
    searchResults.hidden = hits.length === 0;
    search?.setAttribute('aria-expanded', hits.length ? 'true' : 'false');
    text(searchStatus, hits.length ? `找到 ${hits.length} 个匹配标题。` : `没有找到“${query}”的讲次或小节。`);
  };
  search?.addEventListener('input', runSearch);
  search?.addEventListener('keydown', event => { if (event.key === 'Escape') { search.value = ''; clearResults(); search.blur(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.cs329a-search-wrap')) clearResults(); });

  activateFromHash();
})();
