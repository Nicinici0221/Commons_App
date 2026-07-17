(function() {
  const root = document.documentElement;
  const isInstalledApp = navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    root.classList.contains('ios-standalone') ||
    root.classList.contains('is-embedded-document') ||
    location.search.includes('embed=1');
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover'
    );
  }

  document.addEventListener('gesturestart', (event) => {
    event.preventDefault();
  }, { passive: false });

  if (isInstalledApp) {
    root.classList.add('pwa-runtime');

    const interactionStyle = document.createElement('style');
    interactionStyle.textContent = `
      html.pwa-runtime button,
      html.pwa-runtime a[href],
      html.pwa-runtime [role="button"],
      html.pwa-runtime [data-href] {
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      html.pwa-runtime .pwa-pressed {
        scale: .975;
        filter: brightness(.94);
        transition: scale 80ms ease, filter 80ms ease !important;
      }
    `;
    document.head.appendChild(interactionStyle);

    const interactiveSelector = 'button, a[href], [role="button"], [data-href]';
    const fastTapExclusions = [
      '.leaflet-container',
      '.keyboard',
      '.keyboard-scrim',
      '.avatar-sheet',
      '.avatar-sheet-scrim',
      'input',
      'textarea',
      'select',
      '[contenteditable="true"]',
      '[data-setting="dark-mode"]',
      '[data-pwa-native-touch]'
    ].join(', ');
    let activeTap = null;

    function clearActiveTap(delay = 0) {
      if (!activeTap) return;
      const tap = activeTap;
      activeTap = null;
      window.setTimeout(() => tap.control.classList.remove('pwa-pressed'), delay);
      if (tap.fallbackTimer) window.clearTimeout(tap.fallbackTimer);
    }

    document.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch' || !event.isPrimary) return;
      const control = event.target.closest?.(interactiveSelector);
      if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.closest(fastTapExclusions)) return;
      clearActiveTap();
      activeTap = {
        control,
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        moved: false,
        fallbackTimer: 0
      };
      control.classList.add('pwa-pressed');
    }, { passive: true, capture: true });

    document.addEventListener('pointermove', (event) => {
      if (!activeTap || event.pointerId !== activeTap.pointerId) return;
      if (Math.hypot(event.clientX - activeTap.x, event.clientY - activeTap.y) > 12) {
        activeTap.moved = true;
        clearActiveTap();
      }
    }, { passive: true, capture: true });

    document.addEventListener('pointerup', (event) => {
      if (!activeTap || event.pointerId !== activeTap.pointerId) return;
      const tap = activeTap;
      if (tap.moved) {
        clearActiveTap();
        return;
      }
      tap.fallbackTimer = window.setTimeout(() => {
        if (activeTap === tap && tap.control.isConnected) tap.control.click();
        clearActiveTap(70);
      }, 140);
    }, { passive: true, capture: true });

    document.addEventListener('pointercancel', () => clearActiveTap(), { passive: true, capture: true });
    document.addEventListener('click', (event) => {
      if (!activeTap) return;
      if (activeTap.control === event.target || activeTap.control.contains(event.target)) clearActiveTap(70);
    }, { capture: true });

  }

  // Die vorhandenen, visuell identischen 960px-Varianten reichen selbst fuer
  // die 2x-Darstellung des 440px-App-Rahmens. Sie werden auf Desktop und in
  // der PWA verwendet, damit nicht mehrere Megabyte pro Bild geladen werden.
  const imageFallbacks = new WeakSet();

  function pwaImageSource(source) {
      if (!source || /^(?:data:|blob:|https?:)/i.test(source)) return '';
      const normalized = source.replace(/\\/g, '/');
      const marker = normalized.lastIndexOf('Icons/');
      if (marker < 0 || normalized.includes('Icons/pwa/')) return '';
      const iconPath = normalized.slice(marker + 6).split(/[?#]/)[0];
      if (!iconPath || iconPath.includes('/') || !/\.(?:png|jpe?g)$/i.test(iconPath)) return '';
      const baseName = iconPath.replace(/\.(?:png|jpe?g)$/i, '');
      const extension = /^pb \d+$/i.test(baseName) || /^Rooftop$/i.test(baseName) ? 'png' : 'jpg';
      return `Icons/pwa/${baseName}.${extension}`;
    }

  function prepareImage(image) {
      if (!(image instanceof HTMLImageElement)) return;
      image.decoding = 'async';
      const eager = image.matches('#mainAvatarImg, .hero-card-bg, [data-pwa-eager]') ||
        Boolean(image.closest('.app-header, .topbar, .statusbar, .hero-card, .profile-card'));
      if (!image.hasAttribute('loading')) image.loading = eager ? 'eager' : 'lazy';
      if (eager && !image.hasAttribute('fetchpriority')) image.setAttribute('fetchpriority', 'high');

      if (imageFallbacks.has(image)) return;
      const original = image.getAttribute('src');
      const optimized = pwaImageSource(original);
      if (!optimized) return;
      image.dataset.pwaOriginalSrc = original;
      image.addEventListener('error', () => {
        const fallback = image.dataset.pwaOriginalSrc;
        if (!fallback || imageFallbacks.has(image)) return;
        imageFallbacks.add(image);
        image.src = fallback;
      }, { once: true });
      image.src = optimized;
    }

  const imageObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === 'attributes') {
          prepareImage(record.target);
          return;
        }
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.matches?.('img')) prepareImage(node);
          node.querySelectorAll?.('img').forEach(prepareImage);
        });
      });
    });
  imageObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });

  try {
    if (sessionStorage.getItem('wc_internal_transition') === '1') {
      sessionStorage.removeItem('wc_internal_transition');
      document.documentElement.classList.add('wc-route-return');
    }
  } catch (e) {}
})();
