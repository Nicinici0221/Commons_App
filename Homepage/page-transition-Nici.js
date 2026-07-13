(function() {
  const KEY = 'wc_internal_transition';
  const DELAY = 130;
  let navigating = false;

  function markInternalTransition() {
    try { sessionStorage.setItem(KEY, '1'); } catch (e) {}
  }

  function isInternalHtmlUrl(url) {
    return url.origin === window.location.origin && /\.html(?:$|[?#])/.test(url.href);
  }

  function smoothNavigate(target) {
    if (!target || navigating) return;
    // If running inside an iframe (e.g. embedded by onboarding), delegate to top-level window
    if (window.top !== window) {
      const url = new URL(target, window.location.href);
      try {
        if (typeof window.top.smoothNavigate === 'function') {
          window.top.smoothNavigate(url.href);
        } else {
          window.top.location.href = url.href;
        }
      } catch (e) {
        try { window.top.location.href = url.href; } catch (e2) {
          window.location.href = url.href;
        }
      }
      return;
    }
    const url = new URL(target, window.location.href);
    if (!isInternalHtmlUrl(url)) {
      window.location.href = url.href;
      return;
    }
    navigating = true;
    markInternalTransition();
    document.documentElement.classList.add('wc-route-exit');
    window.setTimeout(() => { window.location.href = url.href; }, DELAY);
  }

  function smoothBack() {
    if (navigating) return;
    navigating = true;
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

    event.preventDefault();
    event.stopPropagation();
    smoothNavigate(url.href);
  }, true);
})();
