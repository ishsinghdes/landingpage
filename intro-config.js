/* Concept coded by Ish Singh, 2026. Portfolio/skill-building concept; not affiliated
   with any real product. Commercial adaptations should credit relevant creators
   and rights holders. Photorealistic imagery is AI-generated conceptual imagery. */
window.ISH_INTRO_CONFIG = {
  enabled: false,                 // THE ON/OFF SWITCH. false restores the original site.
  oncePerSession: true,          // Use ?intro=play to replay; ?intro=off to bypass.
  duration: 3000,
  preloadTimeout: 2200
};
(() => {
  const config = window.ISH_INTRO_CONFIG;
  const mode = new URLSearchParams(location.search).get('intro');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seen = false;
  try { seen = sessionStorage.getItem('ish-cinematic-intro-v1') === 'seen'; } catch {}
  config.shouldPlay = config.enabled && mode !== 'off' && !reduced && !location.hash &&
    (mode === 'play' || !config.oncePerSession || !seen);
  if (!config.shouldPlay) return;
  document.documentElement.classList.add('ish-intro-active');
  // Fail open even if the stylesheet, module, or an image fails to load.
  window.__ishIntroWatchdog = setTimeout(() => {
    if (window.IshIntro) window.IshIntro.skip();
    else document.documentElement.classList.remove('ish-intro-active');
  }, config.preloadTimeout + config.duration + 1200);
})();
