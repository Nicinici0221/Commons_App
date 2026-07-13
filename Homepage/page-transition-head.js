(function() {
  const root = document.documentElement;
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

  root.classList.add('wc-fonts-loading');

  const showWithFinalFonts = () => {
    root.classList.remove('wc-fonts-loading');
    root.classList.add('wc-fonts-ready');
  };

  window.addEventListener('DOMContentLoaded', () => {
    const fallback = window.setTimeout(showWithFinalFonts, 4000);
    const fontsReady = document.fonts?.ready || Promise.resolve();
    const assetsReady = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));

    Promise.all([fontsReady, assetsReady]).then(() => {
      window.clearTimeout(fallback);
      showWithFinalFonts();
    }, showWithFinalFonts);
  }, { once: true });

  try {
    if (sessionStorage.getItem('wc_internal_transition') === '1') {
      sessionStorage.removeItem('wc_internal_transition');
      document.documentElement.classList.add('wc-route-return');
    }
  } catch (e) {}
})();
