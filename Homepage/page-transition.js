(function() {
  const KEY = 'wc_internal_transition';
  const BACK_KEY = 'wc_restore_on_back';
  const SCROLL_KEY_PREFIX = 'wc_scroll_state:';
  const DELAY = 130;
  let navigating = false;
  const primaryRoutes = ['Homepage.html', 'Community.html', 'Projekte.html', 'Analytics.html'];
  const isInstalledApp = navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    document.documentElement.classList.contains('pwa-runtime') ||
    location.search.includes('embed=1');
  const prefetchedRoutes = new Set();

  const scrollSelectors = [
    '.scroll-content',
    '.page-scroll',
    '.settings-scroll',
    '.detail-scroll',
    '.create-form-scroll',
    '.ed-scroll',
    '.bt-scroll',
    '.sheet-body',
    '.comment-list',
    '.destination-source'
  ];

  function scrollStateKey() {
    return SCROLL_KEY_PREFIX + window.location.pathname + window.location.search;
  }

  function getScrollTargets() {
    const targets = [];
    scrollSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        if (!targets.some((item) => item.element === element)) {
          targets.push({ key: `${selector}:${index}`, element });
        }
      });
    });
    return targets;
  }

  function saveScrollPositions() {
    const state = {};
    getScrollTargets().forEach(({ key, element }) => {
      state[key] = { top: element.scrollTop, left: element.scrollLeft };
    });
    try { sessionStorage.setItem(scrollStateKey(), JSON.stringify(state)); } catch (e) {}
  }

  function restoreScrollPositions() {
    let state;
    try { state = JSON.parse(sessionStorage.getItem(scrollStateKey()) || 'null'); } catch (e) {}
    if (!state) return;
    getScrollTargets().forEach(({ key, element }) => {
      const position = state[key];
      if (!position) return;
      element.scrollTop = position.top || 0;
      element.scrollLeft = position.left || 0;
    });
  }

  function isHistoryReturn(event) {
    let flagged = false;
    try { flagged = sessionStorage.getItem(BACK_KEY) === '1'; } catch (e) {}
    const navigation = performance.getEntriesByType?.('navigation')?.[0];
    return flagged || Boolean(event?.persisted) || navigation?.type === 'back_forward';
  }

  function restoreAfterHistoryReturn(event) {
    if (!isHistoryReturn(event)) return;
    requestAnimationFrame(() => requestAnimationFrame(restoreScrollPositions));
    window.setTimeout(restoreScrollPositions, 180);
    try { sessionStorage.removeItem(BACK_KEY); } catch (e) {}
  }

  function markInternalTransition() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
  }

  function isInternalHtmlUrl(url) {
    return url.origin === window.location.origin && /\.html(?:$|[?#])/.test(url.href);
  }

  function prefetchRoute(target, urgent = false) {
    const url = new URL(target, window.location.href);
    if (url.href === window.location.href || prefetchedRoutes.has(url.href) || !isInternalHtmlUrl(url)) return;
    prefetchedRoutes.add(url.href);
    if (urgent && isInstalledApp) {
      fetch(url.href, { credentials: 'same-origin', cache: 'force-cache' }).catch(() => {});
      return;
    }
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url.href;
    document.head.appendChild(link);
  }

  function prefetchPrimaryRoutes() {
    primaryRoutes.forEach((target) => prefetchRoute(target));
  }

  function schedulePrimaryPrefetch() {
    if (!isInstalledApp) {
      prefetchPrimaryRoutes();
      return;
    }
    const run = () => {
      if ('requestIdleCallback' in window) window.requestIdleCallback(prefetchPrimaryRoutes, { timeout: 1500 });
      else window.setTimeout(prefetchPrimaryRoutes, 650);
    };
    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run, { once: true });
  }

  function smoothNavigate(target) {
    if (!target || navigating) return;
    const url = new URL(target, window.location.href);
    if (!isInternalHtmlUrl(url)) {
      window.location.href = url.href;
      return;
    }
    navigating = true;
    saveScrollPositions();
    markInternalTransition();
    document.documentElement.classList.add('wc-route-exit');
    window.setTimeout(() => { window.location.href = url.href; }, DELAY);
  }

  function smoothBack() {
    if (navigating) return;
    navigating = true;
    saveScrollPositions();
    try { sessionStorage.setItem(BACK_KEY, '1'); } catch (e) {}
    markInternalTransition();
    document.documentElement.classList.add('wc-route-exit');
    window.setTimeout(() => { history.back(); }, DELAY);
  }

  window.smoothNavigate = smoothNavigate;
  window.smoothBack = smoothBack;

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    // Nach dem mobilen Onboarding wird die Homepage zunächst in einem
    // gleich-originären iframe dargestellt. Interne Ziele müssen die äußere
    // App navigieren, sonst entstehen ein zweiter PWA-Rahmen und ein kaputter
    // iframe-Verlauf beim Zurückgehen.
    if (isInstalledApp && window.self !== window.top &&
        document.documentElement.classList.contains('is-embedded-document')) {
      const embeddedTarget = event.target.closest?.('[data-href], a[href]');
      const rawTarget = embeddedTarget?.getAttribute('data-href') || embeddedTarget?.getAttribute('href');
      if (rawTarget && !rawTarget.startsWith('#') && !rawTarget.startsWith('javascript:')) {
        const embeddedUrl = new URL(rawTarget, window.location.href);
        if (isInternalHtmlUrl(embeddedUrl)) {
          if (embeddedUrl.pathname.endsWith('/Einstellungen.html') && !embeddedUrl.searchParams.has('from')) {
            embeddedUrl.searchParams.set('from', 'Homepage.html');
          }
          event.preventDefault();
          event.stopPropagation();
          try {
            if (typeof window.parent.smoothNavigate === 'function') {
              window.parent.smoothNavigate(embeddedUrl.href);
              return;
            }
          } catch (error) {}
          window.top.location.href = embeddedUrl.href;
          return;
        }
      }
    }

    const dataTarget = event.target.closest('[data-href]');
    if (dataTarget) {
      const target = dataTarget.getAttribute('data-href');
      if (target && /\.html(?:$|[?#])/.test(target)) {
        event.preventDefault();
        event.stopPropagation();
        smoothNavigate(target);
        return;
      }
    }

    const link = event.target.closest('a[href]');
    if (!link || link.target && link.target !== '_self' || link.hasAttribute('download')) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

    const url = new URL(href, window.location.href);
    if (!isInternalHtmlUrl(url)) return;

    if (link.classList.contains('detail-back')) {
      event.preventDefault();
      event.stopPropagation();
      if (window.history.length > 1) smoothBack();
      else smoothNavigate(url.href);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    smoothNavigate(url.href);
  }, true);

  if (isInstalledApp) {
    document.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      const targetElement = event.target.closest?.('[data-href], a[href]');
      if (!targetElement) return;
      const target = targetElement.getAttribute('data-href') || targetElement.getAttribute('href');
      if (!target || target.startsWith('#') || target.startsWith('javascript:')) return;
      prefetchRoute(target, true);
    }, { passive: true, capture: true });
  }

  window.addEventListener('pagehide', saveScrollPositions);
  window.addEventListener('pageshow', restoreAfterHistoryReturn);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedulePrimaryPrefetch, { once: true });
  else schedulePrimaryPrefetch();
  restoreAfterHistoryReturn();
})();
