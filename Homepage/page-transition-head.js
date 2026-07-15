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

  try {
    if (sessionStorage.getItem('wc_internal_transition') === '1') {
      sessionStorage.removeItem('wc_internal_transition');
      document.documentElement.classList.add('wc-route-return');
    }
  } catch (e) {}
})();
