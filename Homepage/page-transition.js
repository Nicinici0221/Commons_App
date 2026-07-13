(function() {
  const KEY = 'wc_internal_transition';
  const BACK_KEY = 'wc_restore_on_back';
  const SCROLL_KEY_PREFIX = 'wc_scroll_state:';
  const DELAY = 130;
  let navigating = false;

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

  window.addEventListener('pagehide', saveScrollPositions);
  window.addEventListener('pageshow', restoreAfterHistoryReturn);
  restoreAfterHistoryReturn();
})();
