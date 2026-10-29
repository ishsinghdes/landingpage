# Ish — cinematic intro layer

Added to the existing local portfolio on 30 October 2026. The underlying page content, stylesheet, main script, and scene renderer are unchanged. The HTML has three optional resource hooks. No hosted website was deployed.

## Turn it on or off

In `intro-config.js`, change `enabled: true` to `enabled: false`.

- `?intro=play` replays the sequence, even after it has been seen.
- `?intro=off` bypasses this layer without changing the configuration.
- Normal arrivals play once per browser session.
- Reduced-motion preferences and direct section links bypass the sequence.
- Skip or Escape immediately restores the original page.

## The sequence

Three seconds maximum of playback, including the homepage reveal. Four displaced image surfaces transition through procedural paper burns: atoms → piping → roots → Earth → the existing live galaxy. The first title hits immediately; the second enters around 1.95 seconds; foreground homepage content returns from 2.64 seconds, with the entire overlay removed by 3 seconds.

WebGL renders tessellated 3D image surfaces with luminance-driven relief, perspective rotation, automatic camera motion, pointer parallax, moving diffuse/specular lighting, and film grain. The images remain conceptual render assets mapped onto these surfaces; they are not complete volumetric models of atoms or roots. Each sheet burns through a noisy, irregular front with curling geometry, a carbonized border, emissive orange/white edges and sparks, revealing the next sheet below. The final Earth sheet burns through to the actual live background.

The type uses oversized condensed uppercase lettering, staggered perspective entrances, an impact scale animation, metallic highlights and an extruded shadow. The layer uses the same three HTML hooks and the same on/off switch as before. WebGL-unavailable devices bypass the intro and show the normal website.

Four photorealistic conceptual assets were made using the built-in image-generation tool; they are not documentary photographs. The exact prompts are in `asset-prompts.json`. Assets are optimized WebP images totaling about 1.1 MB. Image decoding must finish before playback; after a 2.2-second timeout, failures reveal the normal site. A separate watchdog prevents a stuck cover.

## Installation elsewhere

Copy the `intro-layer` folder beside your portfolio's `index.html`. Add these lines in the head, after the site's existing initial intro script:

```html
<link rel="stylesheet" href="intro-layer/intro.css">
<script src="intro-layer/intro-config.js"></script>
<script src="intro-layer/intro.js" defer></script>
```

Remove those three lines and this folder for complete removal.

The layer is designed for this portfolio's existing body structure. Do not assume the foreground-hiding selectors fit unrelated websites.

## Art-direction stills

For inspection only: `?intro=play&intro-at=500` freezes the opening at 500 ms. Any value from 0 to 2999 works. Skip exits the still. Normal playback URLs omit `intro-at`.

## Verification

Checked the WebGL shader on desktop (1280 × 720) and mobile (390 × 844), title fit and burn-through rendering, final scene handoff, full playback cleanup, Skip, URL bypass, and opening My Works after completion. No browser console errors were observed. Seven isolated boot checks passed, covering first arrival, repeat visits, replay, bypass, reduced motion, deep links, and the disabled setting. Removing the three resource hooks restores the original HTML byte for byte.

Concept coded by Ish Singh, 2026. Skill-building / portfolio concept; not affiliated with any real product. Commercial adaptations should credit relevant creators and rights holders.

Designed with love, designed with a heart, by Ish.
