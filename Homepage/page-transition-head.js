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
    const fallback = window.setTimeout(showWithFinalFonts, 1800);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        window.clearTimeout(fallback);
        showWithFinalFonts();
      }, showWithFinalFonts);
    } else {
      window.clearTimeout(fallback);
      showWithFinalFonts();
    }
  }, { once: true });

  try {
    if (sessionStorage.getItem('wc_internal_transition') === '1') {
      sessionStorage.removeItem('wc_internal_transition');
      document.documentElement.classList.add('wc-route-return');
    }
  } catch (e) {}
})();
