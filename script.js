(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const introRoot = document.documentElement;
  const heroIntroStart = introRoot.classList.contains('intro-pending') && !reduced ? performance.now() : null;
  const startHeroIntro = () => {
    if (heroIntroStart === null) return;
    const copy = document.querySelector('.hero-copy');
    let lines = [], typingFrame = 0, previousSizes = '', finished = false, measuredSize = '';
    const typingDelay = 1120, typingDuration = 1580;
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    // Measure the native wrapped lines once. The original text, links, line breaks
    // and centering remain untouched throughout the reveal: no clone or reflow.
    const measureLines = (force = false) => {
      if (!copy || finished) return;
      const bounds = copy.getBoundingClientRect();
      const size = `${bounds.width}:${bounds.height}`;
      if (force !== true && size === measuredSize) return;
      measuredSize = size;
      const lineHeight = parseFloat(getComputedStyle(copy).lineHeight);
      const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
      const range = document.createRange(), rows = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        let offset = 0;
        for (const character of node.nodeValue) {
          range.setStart(node, offset);
          offset += character.length;
          range.setEnd(node, offset);
          const rect = range.getBoundingClientRect();
          if (rect.width < .01 || rect.height < .01) continue;
          let row = rows.find(row => Math.abs(row.top - rect.top) < 2);
          if (!row) { row = {top:rect.top, bottom:rect.bottom, characters:[]}; rows.push(row); }
          row.bottom = Math.max(row.bottom, rect.bottom);
          row.characters.push({left:rect.left-bounds.left,right:rect.right-bounds.left});
        }
      }
      lines = rows.sort((a,b)=>a.top-b.top).map(row => {
        row.characters.sort((a,b)=>a.left-b.left);
        const left = row.characters[0].left;
        const top = row.top-bounds.top-(lineHeight-(row.bottom-row.top))/2;
        return {left, top, height:lineHeight+.5, characters:row.characters};
      });
      // Multiple opaque mask rectangles reveal one line each, from its own start.
      const layers = lines.map(()=>'linear-gradient(#000,#000)').join(',');
      const positions = lines.map(line=>`${line.left}px ${line.top}px`).join(',');
      copy.style.maskImage = copy.style.webkitMaskImage = layers;
      copy.style.maskPosition = copy.style.webkitMaskPosition = positions;
      copy.style.maskRepeat = copy.style.webkitMaskRepeat = 'no-repeat';
      previousSizes = '';
    };
    const resizeObserver = copy ? new ResizeObserver(measureLines) : null;
    const clearMask = () => {
      if (!copy) return;
      for (const property of ['mask-image','mask-position','mask-repeat','mask-size','-webkit-mask-image','-webkit-mask-position','-webkit-mask-repeat','-webkit-mask-size']) copy.style.removeProperty(property);
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(typingFrame);
      clearTimeout(window.__heroIntroFallback);
      resizeObserver?.disconnect();
      clearMask();
      introRoot.classList.remove('intro-pending', 'intro-playing');
      removeEventListener('pagehide', finish);
      motionPreference.removeEventListener('change', onMotionChange);
    };
    const onMotionChange = event => { if (event.matches) finish(); };
    const revealLines = progress => {
      if (!copy || !lines.length) return;
      const sizes = lines.map(line => {
        const count = progress > 0 ? Math.max(1,Math.floor(progress*line.characters.length)) : 0;
        const right = count ? line.characters[Math.min(count,line.characters.length)-1].right : line.left;
        return `${Math.max(0,right-line.left+.35*(count>0))}px ${line.height}px`;
      }).join(',');
      if (sizes !== previousSizes) {
        copy.style.maskSize = copy.style.webkitMaskSize = sizes;
        previousSizes = sizes;
      }
    };
    measureLines(); revealLines(0);
    resizeObserver?.observe(copy);
    document.fonts.ready.then(() => {
      if (!finished) {
        measureLines(true);
        revealLines(Math.min(1,Math.max(0,(performance.now()-heroIntroStart-typingDelay)/typingDuration)));
      }
    });
    motionPreference.addEventListener('change', onMotionChange);
    addEventListener('pagehide', finish, {once:true});
    const tick = now => {
      const elapsed = now - heroIntroStart;
      revealLines(Math.min(1,Math.max(0,(elapsed-typingDelay)/typingDuration)));
      if (elapsed >= 4100) finish();
      else typingFrame = requestAnimationFrame(tick);
    };
    introRoot.classList.remove('intro-pending');
    introRoot.classList.add('intro-playing');
    typingFrame = requestAnimationFrame(tick);
  };
  startHeroIntro();
  const themeTrigger = document.querySelector('.hero-theme-trigger');
  const blueprintShadow = document.querySelector('.blueprint-ground-shadow');
  const themes = ['galaxy', 'cloud', 'anime', 'mural', 'blueprint', 'underwater', 'bauhaus', 'urban'];
  const themeLabels = {
    galaxy: 'Galaxy', cloud: 'Cloud sky', anime: 'Anime sky', mural: 'Mumbai mural',
    blueprint: 'Blueprint', underwater: 'Underwater', bauhaus: 'Bauhaus', urban: 'Urban city'
  };
  const themeBackgrounds = {
    cloud: {
      src: 'assets/themes/cloud-sky.jpg',
      image: 'linear-gradient(180deg,rgba(3,9,17,.38),rgba(3,8,14,.56)),url("assets/themes/cloud-sky.jpg")'
    },
    anime: {
      src: 'assets/themes/anime-sky.jpg',
      image: 'linear-gradient(180deg,rgba(3,5,17,.38),rgba(3,5,15,.5)),url("assets/themes/anime-sky.jpg")'
    },
    mural: {
      src: 'assets/themes/mumbai-mural.png',
      image: 'linear-gradient(180deg,rgba(31,7,13,.38),rgba(17,4,9,.54)),url("assets/themes/mumbai-mural.png")'
    },
    blueprint: {
      src: 'assets/themes/blueprint-grid.png',
      image: 'linear-gradient(180deg,rgba(9,35,84,.08),rgba(7,28,72,.18)),url("assets/themes/blueprint-grid.png")'
    },
    underwater: {
      src: 'assets/themes/underwater.png',
      image: 'linear-gradient(180deg,rgba(0,34,48,.18),rgba(0,15,27,.42)),url("assets/themes/underwater.png")'
    },
    bauhaus: {
      src: 'assets/themes/bauhaus.svg',
      image: 'linear-gradient(180deg,rgba(20,19,22,.05),rgba(20,19,22,.12)),url("assets/themes/bauhaus.svg")'
    },
    urban: {
      src: 'assets/themes/urban-city.png',
      image: 'linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.28)),url("assets/themes/urban-city.png")'
    }
  };
  let themeIndex = 0;
  let themeTimer = 0;
  let themeRequest = 0;
  let activeThemeBackdrop = null;
  let radialReveal = null;
  let startGalaxyAnimation = () => {};
  const revealThemeAt = (target, point) => {
    if (!target?.animate || reduced || !point) return;
    radialReveal?.cancel();
    const bounds = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(bounds.width, point.x - bounds.left));
    const y = Math.max(0, Math.min(bounds.height, point.y - bounds.top));
    const radius = Math.ceil(Math.hypot(Math.max(x, bounds.width - x), Math.max(y, bounds.height - y)) * 1.08);
    try {
      radialReveal = target.animate([
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${radius}px at ${x}px ${y}px)` }
      ], { duration: 1450, easing: 'cubic-bezier(.45,0,.2,1)' });
      radialReveal.onfinish = () => {
        radialReveal?.cancel();
        radialReveal = null;
      };
    } catch {
      radialReveal = null;
    }
  };
  const applyTheme = (revealPoint = null) => {
    const request = ++themeRequest;
    const theme = themes[themeIndex];
    const commit = () => {
      if (request !== themeRequest) return;
      const previousBackdrop = activeThemeBackdrop;
      const nextBackdrop = theme === 'galaxy'
        ? document.getElementById('sky')
        : document.querySelector(`.theme-backdrop--${theme}`);
      if (theme !== 'galaxy' && nextBackdrop) nextBackdrop.style.backgroundImage = themeBackgrounds[theme].image;
      const themeFill = document.querySelector('.hero-theme-fill');
      if (themeFill) themeFill.style.backgroundImage = theme === 'anime' ? `url("${themeBackgrounds.anime.src}")` : 'none';
      document.body.dataset.theme = theme;
      themeTrigger?.setAttribute('aria-label', `Change visual theme. Current theme: ${themeLabels[theme]}.`);
      if (theme === 'galaxy') startGalaxyAnimation();
      activeThemeBackdrop = theme === 'galaxy' ? null : nextBackdrop;
      if (previousBackdrop && previousBackdrop !== activeThemeBackdrop) {
        window.setTimeout(() => {
          if (activeThemeBackdrop !== previousBackdrop) previousBackdrop.style.backgroundImage = '';
        }, 750);
      }
    };
    // Assign the selected image only when its theme becomes active. The browser
    // can fetch/decode it while the radial reveal is already moving.
    commit();
  };
  const scheduleThemeChange = () => {
    window.clearTimeout(themeTimer);
    if (reduced || document.hidden || !themeTrigger) return;
    themeTimer = window.setTimeout(() => {
      themeIndex = (themeIndex + 1) % themes.length;
      applyTheme();
      scheduleThemeChange();
    }, 10000);
  };
  if (themeTrigger) {
    applyTheme();
    themeTrigger.addEventListener('click', event => {
      themeIndex = (themeIndex + 1) % themes.length;
      const bounds = themeTrigger.getBoundingClientRect();
      const point = event.clientX || event.clientY
        ? { x: event.clientX, y: event.clientY }
        : { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
      applyTheme(point);
      scheduleThemeChange();
    });
    scheduleThemeChange();
    document.addEventListener('visibilitychange', scheduleThemeChange);
  }
  const canvas = document.getElementById('sky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const glassPhrase = document.querySelector('.hero-content h1 em');
  if (glassPhrase) {
    const updateGlassPosition = event => {
      const bounds = glassPhrase.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
      const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
      glassPhrase.style.setProperty('--glass-x', `${x}%`);
      glassPhrase.style.setProperty('--glass-y', `${y}%`);
    };
    glassPhrase.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse') return;
      updateGlassPosition(event);
      glassPhrase.classList.add('is-glass-lit');
    });
    glassPhrase.addEventListener('pointermove', event => {
      if (event.pointerType === 'mouse') updateGlassPosition(event);
    });
    glassPhrase.addEventListener('pointerleave', () => glassPhrase.classList.remove('is-glass-lit'));
  }
  const contactSection = document.querySelector('.contact-section');
  let width = 0, height = 0, stars = [], elapsed = 0;
  let pointer = {x: innerWidth / 2, y: innerHeight / 2};
  let fieldPointer = {...pointer};
  let pointerInside = false, pointerVelocity = {x: 0, y: 0}, previousPointer = null;
  let lastFrame = 0, animationFrame = 0, galaxyAngle = 0, spinImpulse = 0, spinButtonTimer = 0;
  let targetScrollTurn = 0, scrollTurn = 0;
  let cursorSparks = [], clickWaves = [], shootingStars = [], clickHistory = [], lastTrailAt = 0;

  // Keep white dominant, with occasional champagne, silver, rose, violet and cyan glints.
  const makeSprite = (draw) => {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const brush = sprite.getContext('2d');
    draw(brush);
    return sprite;
  };
  const starPalette = [
    {rgb:[255,255,255], css:'#ffffff'},
    {rgb:[218,228,242], css:'#dae4f2'},
    {rgb:[232,198,151], css:'#e8c697'},
    {rgb:[223,163,178], css:'#dfa3b2'},
    {rgb:[187,174,239], css:'#bbaeed'},
    {rgb:[130,226,255], css:'#82e2ff'}
  ];
  const starSprites = starPalette.map(({rgb:[red,green,blue]}) => makeSprite(brush => {
    const glow = brush.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(.045, 'rgba(255,255,255,1)');
    glow.addColorStop(.11, `rgba(${red},${green},${blue},.88)`);
    glow.addColorStop(.22, `rgba(${red},${green},${blue},.43)`);
    glow.addColorStop(.42, `rgba(${red},${green},${blue},.14)`);
    glow.addColorStop(.7, `rgba(${red},${green},${blue},.035)`);
    glow.addColorStop(1, `rgba(${red},${green},${blue},0)`);
    brush.fillStyle = glow;
    brush.fillRect(0, 0, 64, 64);
  }));
  const iridescentSprite = makeSprite(brush => {
    const glow = brush.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(.045, 'rgba(255,255,255,.95)');
    glow.addColorStop(.13, 'rgba(234,205,164,.56)');
    glow.addColorStop(.27, 'rgba(224,160,190,.34)');
    glow.addColorStop(.42, 'rgba(181,164,239,.21)');
    glow.addColorStop(.59, 'rgba(123,223,255,.1)');
    glow.addColorStop(.78, 'rgba(220,230,246,.035)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    brush.fillStyle = glow;
    brush.fillRect(0, 0, 64, 64);
  });
  const weightedTone = value => value < .61 ? 0 : value < .79 ? 1 : value < .88 ? 2 : value < .95 ? 3 : value < .985 ? 4 : 5;

  const beginGalaxySpin = () => { spinImpulse = Math.min(spinImpulse + Math.PI * 2, Math.PI * 8); };
  const emitClickWave = (x, y) => {
    const now = performance.now();
    clickWaves.push({x, y, strength: 1, born: now, life: 1250});
    for (let index = 0; index < 12; index++) {
      const angle = Math.random() * Math.PI * 2;
      const startRadius = 12 + Math.random() * 22;
      const speed = 18 + Math.random() * 46;
      cursorSparks.push({
        x: x + Math.cos(angle) * startRadius,
        y: y + Math.sin(angle) * startRadius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: .35 + Math.random() ** 3 * .8,
        tone: weightedTone(Math.random()),
        born: now,
        life: 760 + Math.random() * 420
      });
    }
    cursorSparks = cursorSparks.slice(-240);
  };
  const emitShootingStar = (x, y) => {
    const tone = 2 + Math.floor(Math.random() * 4);
    const direction = -Math.PI / 4 + (Math.random() - .5) * 1.8;
    const speed = 330 + Math.random() * 170;
    const now = performance.now();
    shootingStars.push({
      x, y, vx: Math.cos(direction) * speed, vy: Math.sin(direction) * speed,
      tone, length: 52 + Math.random() * 24, born: now, life: 680 + Math.random() * 180
    });
    shootingStars = shootingStars.slice(-4);
    for (let index = 0; index < 5; index++) {
      const lag = .08 + index * .075;
      cursorSparks.push({
        x: x - Math.cos(direction) * speed * lag,
        y: y - Math.sin(direction) * speed * lag,
        vx: Math.cos(direction) * speed * .12,
        vy: Math.sin(direction) * speed * .12,
        size: .28 + Math.random() * .38,
        tone, born: now + index * 28, life: 440 + Math.random() * 160
      });
    }
  };
  const registerBackgroundClick = (x, y) => {
    const now = performance.now();
    const nearbyClicks = clickHistory.filter(click => now - click.time < 2600
      && Math.hypot(click.x - x, click.y - y) < 88);
    nearbyClicks.push({x, y, time: now});
    if (nearbyClicks.length >= 3) {
      emitShootingStar(x, y);
      clickHistory = [];
    } else clickHistory = nearbyClicks;
  };
  const emitCursorTrail = (x, y) => {
    const now = performance.now();
    for (let index = 0; index < 3; index++) {
      const angle = Math.random() * Math.PI * 2;
      const offset = Math.random() * 35;
      const speed = 3 + Math.random() * 10;
      cursorSparks.push({
        x: x + Math.cos(angle) * offset,
        y: y + Math.sin(angle) * offset,
        vx: Math.cos(angle) * speed - pointerVelocity.y * .08,
        vy: Math.sin(angle) * speed + pointerVelocity.x * .08,
        size: .4 + Math.random() ** 3 * 1.6,
        tone: weightedTone(Math.random()),
        born: now,
        life: 1500 + Math.random() * 1500
      });
    }
    cursorSparks = cursorSparks.slice(-240);
  };

  const projection = {flattening: .38, tilt: -.24};
  projection.cos = Math.cos(projection.tilt);
  projection.sin = Math.sin(projection.tilt);
  const distanceOnOrbitPlane = (x, y, centerX, centerY) => {
    const dx = x - centerX, dy = y - centerY;
    const orbitX = dx * projection.cos + dy * projection.sin;
    const orbitY = (-dx * projection.sin + dy * projection.cos) / projection.flattening;
    return Math.hypot(orbitX, orbitY);
  };
  const resize = () => {
    width = innerWidth; height = innerHeight;
    const pixelRatio = Math.min(devicePixelRatio || 1, 1.75, Math.sqrt(3200000 / Math.max(1, width * height)));
    canvas.width = Math.round(width * pixelRatio); canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    // Build a perspective-flattened three-arm galaxy, with a sparse scatter
    // beyond it so the arms dissolve naturally into the surrounding sky.
    const centerX = width / 2, centerY = height * .45;
    const innerRadius = Math.max(260, Math.min(width * .58, height * .85));
    const cornerReach = Math.max(
      distanceOnOrbitPlane(0, 0, centerX, centerY),
      distanceOnOrbitPlane(width, 0, centerX, centerY),
      distanceOnOrbitPlane(0, height, centerX, centerY),
      distanceOnOrbitPlane(width, height, centerX, centerY)
    );
    const outerRadius = Math.max(260, cornerReach * 1.12 - 65);
    const count = Math.min(3600, Math.max(1200, Math.round(width * height / 450)));
    let seed = 419;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    stars = Array.from({length: count}, (_, index) => {
      const inArms = index % 5 < 2;
      const radius = 65 + Math.pow(random(), .65) * (inArms ? innerRadius : outerRadius);
      const angle = index % (inArms ? 7 : 4) === 0
        ? random() * Math.PI * 2
        : (index % 3) * Math.PI * 2 / 3 + radius / innerRadius * 4.8
          + (random() - .5) * (inArms ? .7 : 1.4);
      const orbitX = Math.cos(angle) * radius;
      const orbitY = Math.sin(angle) * radius;
      return {
        orbitX, orbitY, radius,
        size: .4 + Math.pow(random(), 5) * 1.9,
        tone: weightedTone(random()),
        phase: random() * Math.PI * 2,
        shimmer: .5 + random() * 1.3,
        offsetX: 0, offsetY: 0, velocityX: 0, velocityY: 0, light: 0
      };
    });
  };

  const updateScrollTurn = () => {
    if (!contactSection) return;
    const top = contactSection.getBoundingClientRect().top;
    targetScrollTurn = Math.max(0, Math.min(1, 1 - top / Math.max(1, innerHeight * .78)));
  };
  const updateThemeParallax = () => {
    if (reduced) return;
    const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, scrollY / scrollRange));
    document.documentElement.style.setProperty('--theme-parallax', `${(-progress * 26).toFixed(2)}px`);
    document.documentElement.style.setProperty('--underwater-parallax', `${(-progress * 42).toFixed(2)}px`);
    document.documentElement.style.setProperty('--underwater-bubble-parallax', `${(-progress * 24).toFixed(2)}px`);
    document.documentElement.style.setProperty('--blueprint-rotation', `${(progress * 2.5).toFixed(3)}deg`);
    document.documentElement.style.setProperty('--bauhaus-rotation', `${(progress * 1.2).toFixed(3)}deg`);
    document.documentElement.style.setProperty('--urban-parallax', `${(-progress * 58).toFixed(2)}px`);
    document.documentElement.style.setProperty('--urban-scale', `${(1 + progress * .12).toFixed(3)}`);
  };
  updateScrollTurn();
  updateThemeParallax();
  addEventListener('scroll', updateScrollTurn, {passive: true});
  addEventListener('scroll', updateThemeParallax, {passive: true});

  const drawSprite = (sprite, x, y, radius, alpha) => {
      const spriteSize = radius * 16;
      ctx.globalAlpha = alpha;
      ctx.drawImage(sprite, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
    };

  const draw = (now = 0) => {
    animationFrame = 0;
    const galaxyActive = document.body.dataset.theme === 'galaxy';
    if (!galaxyActive || document.hidden) {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
      lastFrame = 0;
      return;
    }

    const dt = lastFrame ? Math.min(now - lastFrame, 50) : 16;
    lastFrame = now;
    const seconds = dt / 1000;
    elapsed += seconds;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    if (!reduced) {
      const follow = 1 - Math.exp(-dt / 190);
      fieldPointer.x += (pointer.x - fieldPointer.x) * follow;
      fieldPointer.y += (pointer.y - fieldPointer.y) * follow;
      pointerVelocity.x *= Math.exp(-dt / 175);
      pointerVelocity.y *= Math.exp(-dt / 175);

      galaxyAngle += .05225 * seconds;
      const remainingSpin = spinImpulse * Math.exp(-seconds * 2.28);
      galaxyAngle += spinImpulse - remainingSpin;
      spinImpulse = remainingSpin;
      scrollTurn += (targetScrollTurn - scrollTurn) * (1 - Math.exp(-dt / 420));
    }

    const centerX = width / 2, centerY = height * .45;
    const arrival = heroIntroStart === null ? 1 : Math.min(1, Math.max(0,(now-heroIntroStart)/1850));
    const settling = (1-arrival) ** 3;
    const fieldScale = 1 + settling * .16;
    const angle = reduced || !galaxyActive ? 0 : galaxyAngle + scrollTurn * (6 * Math.PI / 180) - settling * .72;
    const spinCos = Math.cos(angle), spinSin = Math.sin(angle);
    const influenceRadius = Math.min(245, width * .55);
    const lightDecay = Math.exp(-dt / 820);
    clickWaves = clickWaves.filter(wave => now - wave.born < wave.life);



    stars.forEach(star => {
      const orbitX = (star.orbitX * spinCos - star.orbitY * spinSin) * fieldScale;
      const orbitY = (star.orbitX * spinSin + star.orbitY * spinCos) * fieldScale;
      // Inline projection avoids allocating an object for every star on every frame.
      const baseX = centerX + orbitX * projection.cos - orbitY * projection.flattening * projection.sin;
      const baseY = centerY + orbitX * projection.sin + orbitY * projection.flattening * projection.cos;
      const dx = fieldPointer.x - baseX, dy = fieldPointer.y - baseY;
      const distance = pointerInside && !reduced ? Math.hypot(dx,dy) : Infinity;
      const influence = pointerInside && !reduced
        ? Math.pow(Math.max(0, 1 - distance / influenceRadius), 1.5) : 0;
      star.light = Math.max(influence, star.light * lightDecay);
      const targetX = dx * influence * .085 - pointerVelocity.y * influence * .006;
      const targetY = dy * influence * .085 + pointerVelocity.x * influence * .006;
      if (!reduced) {
        star.velocityX = (star.velocityX + (targetX - star.offsetX) * .026) * .9;
        star.velocityY = (star.velocityY + (targetY - star.offsetY) * .026) * .9;
        star.offsetX += star.velocityX;
        star.offsetY += star.velocityY;
      }

      let waveLight = 0, waveOffsetX = 0, waveOffsetY = 0;
      for (const wave of clickWaves) {
        const progress = Math.min(1, (now - wave.born) / wave.life);
        const vx = baseX + star.offsetX - wave.x, vy = baseY + star.offsetY - wave.y;
        const radialDistance = Math.hypot(vx, vy);
        const ringRadius = progress * Math.min(width, height) * .56;
        const strength = Math.exp(-((radialDistance - ringRadius) ** 2) / (2 * 32 * 32))
          * (1 - progress) * wave.strength;
        waveLight = Math.max(waveLight, strength);
        if (radialDistance > 1) {
          waveOffsetX += vx / radialDistance * strength * 5;
          waveOffsetY += vy / radialDistance * strength * 5;
        }
      }
      star.light = Math.max(star.light, waveLight * .82);
      const x = baseX + star.offsetX + waveOffsetX;
      const y = baseY + star.offsetY + waveOffsetY;
      const depth = Math.max(.2, Math.min(1, .2 + .8 * (.5 + .5 * orbitY / Math.max(1, star.radius))));
      const twinkle = reduced ? .85 : .7 + Math.sin(elapsed * star.shimmer + star.phase) * .3;
      const light = star.light;
      const alpha = Math.min(1, (.12 + depth * .46) * twinkle * (1 + scrollTurn * .14) + light * .72);
      const radius = star.size * (.65 + depth * .65) * (1 + light * .4);
      drawSprite(starSprites[star.tone], x, y, radius, alpha * (1 - light * .42));
      if (light > .025) drawSprite(iridescentSprite, x, y, radius * 1.12, alpha * light * .46);

      const glint = star.size > 1.2 ? Math.max(0, Math.sin(elapsed * .65 + star.phase)) ** 24 : 0;
      if (glint > .045) {
        const length = radius * (2.1 + glint * 2.2);
        ctx.globalAlpha = Math.min(.28, alpha * glint * .36);
        ctx.strokeStyle = starPalette[star.tone].css;
        ctx.lineWidth = .4 + glint * .35;
        ctx.beginPath();
        ctx.moveTo(x - length, y); ctx.lineTo(x + length, y);
        ctx.moveTo(x, y - length); ctx.lineTo(x, y + length);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    });

    if (!reduced && cursorSparks.length) {
      cursorSparks = cursorSparks.filter(spark => now - spark.born < spark.life);
      for (const spark of cursorSparks) {
        spark.x += spark.vx * seconds;
        spark.y += spark.vy * seconds;
        spark.vx *= Math.exp(-seconds * .8);
        spark.vy *= Math.exp(-seconds * .8);
        const progress = Math.max(0, Math.min(1, (now - spark.born) / spark.life));
        const fade = Math.min(1, progress * 12) * (1 - progress) ** 1.5;
        const radius = spark.size * (4.4 + fade * 2);
        drawSprite(starSprites[spark.tone], spark.x, spark.y, radius / 8, fade * .9);
      }
      ctx.globalAlpha = 1;
    }

    if (!reduced && shootingStars.length) {
      shootingStars = shootingStars.filter(star => now - star.born < star.life);
      for (const star of shootingStars) {
        const progress = Math.max(0, Math.min(1, (now - star.born) / star.life));
        const fade = Math.min(1, progress * 10) * (1 - progress) ** 1.25;
        const headX = star.x + star.vx * progress * star.life / 1000;
        const headY = star.y + star.vy * progress * star.life / 1000;
        const directionX = star.vx / Math.hypot(star.vx, star.vy);
        const directionY = star.vy / Math.hypot(star.vx, star.vy);
        const tailX = headX - directionX * star.length;
        const tailY = headY - directionY * star.length;
        const trail = ctx.createLinearGradient(tailX, tailY, headX, headY);
        trail.addColorStop(0, 'rgba(255,255,255,0)');
        trail.addColorStop(.45, starPalette[star.tone].css + '88');
        trail.addColorStop(1, 'rgba(255,255,255,.95)');
        ctx.globalAlpha = fade;
        ctx.strokeStyle = trail;
        ctx.lineWidth = 1.1;
        ctx.lineCap = 'round';
        ctx.shadowColor = starPalette[star.tone].css;
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.stroke();
        ctx.shadowBlur = 0;
        drawSprite(starSprites[star.tone], headX, headY, .8, fade);
      }
      ctx.globalAlpha = 1;
    }

    if (!reduced && scrollTurn > .01) {
      ctx.globalCompositeOperation = 'screen';
      const lowerGlow = ctx.createRadialGradient(width * .55, height * .92, 0, width * .55, height * .92, Math.max(width, height) * .66);
      lowerGlow.addColorStop(0, `rgba(93,157,211,${.085 * scrollTurn})`);
      lowerGlow.addColorStop(.45, `rgba(125,129,204,${.035 * scrollTurn})`);
      lowerGlow.addColorStop(1, 'rgba(93,157,211,0)');
      ctx.fillStyle = lowerGlow;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.globalCompositeOperation = 'source-over';
    if (!reduced && galaxyActive) animationFrame = requestAnimationFrame(draw);
  };

  startGalaxyAnimation = () => {
    if (!reduced && !document.hidden && document.body.dataset.theme === 'galaxy' && !animationFrame) {
      animationFrame = requestAnimationFrame(draw);
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      lastFrame = 0;
    } else startGalaxyAnimation();
  });
  resize();
  if (reduced) draw();
  else startGalaxyAnimation();
  let resizeFrame = 0;
  addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      resize(); updateScrollTurn(); updateThemeParallax();
      if (reduced) draw();
    });
  }, {passive:true});
  addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' && event.buttons === 0) return;
    if (blueprintShadow && event.pointerType === 'mouse') {
      blueprintShadow.style.left = `${event.clientX}px`;
      blueprintShadow.style.top = `${event.clientY + 24}px`;
      blueprintShadow.classList.toggle('is-visible', document.body.dataset.theme === 'blueprint');
    }
    const now = performance.now();
    if (previousPointer) {
      pointerVelocity.x = Math.max(-24, Math.min(24, event.clientX - previousPointer.x));
      pointerVelocity.y = Math.max(-24, Math.min(24, event.clientY - previousPointer.y));
    }
    pointer = {x: event.clientX, y: event.clientY};
    pointerInside = true;
    previousPointer = pointer;
    if (!reduced && document.body.dataset.theme === 'galaxy' && event.pointerType === 'mouse' && now - lastTrailAt > 24
      && !event.target?.closest?.('a, button')) {
      emitCursorTrail(event.clientX, event.clientY);
      lastTrailAt = now;
    }
  }, {passive: true});
  addEventListener('pointerleave', () => {
    pointerInside = false;
    previousPointer = null;
    pointerVelocity = {x: 0, y: 0};
    blueprintShadow?.classList.remove('is-visible');
  }, {passive: true});
  addEventListener('pointerdown', event => {
    if (reduced || document.body.dataset.theme !== 'galaxy' || event.button !== 0 || event.target?.closest?.('a, button')) return;
    pointer = {x: event.clientX, y: event.clientY};
    pointerInside = true;
    emitClickWave(event.clientX, event.clientY);
    registerBackgroundClick(event.clientX, event.clientY);
  }, {passive: true});
  addEventListener('pointerup', event => {
    if (event.pointerType !== 'mouse') pointerInside = false;
  }, {passive: true});

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  const galaxyButton = document.querySelector('.galaxy-spin');
  if (galaxyButton) {
    if (reduced) {
      galaxyButton.disabled = true;
      galaxyButton.setAttribute('aria-label', 'Galaxy animation disabled by motion preference');
    } else {
      galaxyButton.addEventListener('click', () => {
        beginGalaxySpin();
        window.clearTimeout(spinButtonTimer);
        galaxyButton.classList.remove('is-spinning');
        void galaxyButton.offsetWidth;
        galaxyButton.classList.add('is-spinning');
        spinButtonTimer = window.setTimeout(() => galaxyButton.classList.remove('is-spinning'), 3000);
      });
    }
  }
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('open', open);
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open navigation');
    }));
  }
  const clock = document.querySelector('#live-clock');
  if (clock) {
    const clockValue = clock.querySelector('.clock-value');
    const formatter = new Intl.DateTimeFormat('en-IN', {timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
    const updateClock = () => {
      const now = new Date();
      if (clockValue) clockValue.textContent = formatter.format(now);
      clock.dateTime = now.toISOString();
    };
    updateClock();
    window.setInterval(updateClock, 15000);
  }
  const profileCard = document.querySelector('#profile-card');
  const cardFaces = profileCard ? [...profileCard.querySelectorAll('.business-face')] : [];
  let cardRotation = 0, cardPointer = null;
  const setCardFace = back => {
    if (!profileCard) return;
    profileCard.dataset.face = back ? 'back' : 'front';
    profileCard.classList.toggle('is-back-facing', back);
    profileCard.setAttribute('aria-label', back ? "Ish Singh's Spotify QR code business card" : 'Ish Singh, Product Designer business card');
    cardFaces.forEach((face, index) => {
      const isBack = index === 1;
      face.setAttribute('aria-hidden', String(isBack !== back));
      if (isBack === back) face.removeAttribute('inert');
      else face.setAttribute('inert', '');
    });
  };
  const turnCard = () => {
    cardRotation += 180;
    profileCard?.style.setProperty('--card-rotation', `${cardRotation}deg`);
    setCardFace(profileCard?.dataset.face !== 'back');
  };
  if (profileCard) {
    const cardStage = profileCard.closest('.card-stage');
    const stopCardInvitation = () => cardStage?.classList.add('has-card-interaction');
    if (!reduced && cardStage && 'IntersectionObserver' in window) {
      const cardObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !cardStage.classList.contains('has-card-interaction')) cardStage.classList.add('is-card-visible');
          else cardStage.classList.remove('is-card-visible');
        });
      }, {threshold: .28});
      cardObserver.observe(cardStage);
    }
    profileCard.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      stopCardInvitation();
      turnCard();
    });
    profileCard.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) return;
      if (event.target.closest('a,button')) return;
      stopCardInvitation();
      cardPointer = {id:event.pointerId,x:event.clientX,y:event.clientY,startRotation:cardRotation,moved:false};
      profileCard.classList.add('is-dragging');
      profileCard.setPointerCapture?.(event.pointerId);
    });
    profileCard.addEventListener('pointermove', event => {
      if (!cardPointer || cardPointer.id !== event.pointerId) return;
      const dx = event.clientX - cardPointer.x, dy = event.clientY - cardPointer.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) cardPointer.moved = true;
      if (!cardPointer.moved) return;
      cardRotation = cardPointer.startRotation + dx * .72;
      profileCard.style.setProperty('--card-rotation', `${cardRotation}deg`);
      profileCard.style.setProperty('--card-tilt-x', `${Math.max(-13,Math.min(13,-dy * .12))}deg`);
      const faceAngle = ((cardRotation % 360) + 360) % 360;
      setCardFace(faceAngle > 90 && faceAngle < 270);
    });
    const finishCardDrag = event => {
      if (!cardPointer || cardPointer.id !== event.pointerId) return;
      const {moved} = cardPointer;
      cardPointer = null;
      profileCard.classList.remove('is-dragging');
      profileCard.style.setProperty('--card-tilt-x','0deg');
      if (!moved) turnCard();
    };
    profileCard.addEventListener('pointerup', finishCardDrag);
    profileCard.addEventListener('pointercancel', event => {
      if (!cardPointer || cardPointer.id !== event.pointerId) return;
      cardPointer = null;
      profileCard.classList.remove('is-dragging');
      profileCard.style.setProperty('--card-tilt-x','0deg');
    });
    profileCard.addEventListener('pointerleave', () => {
      if (!cardPointer) profileCard.style.setProperty('--card-tilt-x','0deg');
    });
  }
  const stage = document.querySelector('#landing-stage');
  const backgroundTargets = [
    document.querySelector('.topbar'),
    document.querySelector('.landing-stage>.hero'),
    document.querySelector('.contact-section')
  ].filter(Boolean);
  const panels = {
    work: document.querySelector('#work-panel'),
    education: document.querySelector('#education-panel')
  };
  const panelClose = document.querySelector('.panel-close-global');
  let activePanelTrigger = null;
  const projectDetail = document.querySelector('#project-detail');
  const projectDetailContent = document.querySelector('#project-detail-content');
  const projectDetailDialog = projectDetail?.querySelector('.project-detail-dialog');
  let projectDetailOrigin = null;
  let panelCloseWasHidden = true;
  const projectBriefs = {
  "16": {"aim": "Create useful, meaningful vehicle analytics dashboards with intuitive interactions and an interface that works across devices.", "direction": "Make vehicle KPIs and analytics clear and easy to explore, using responsive dashboards and considered micro-interactions.", "tools": "Code, data visualisation and interactive prototyping.", "media": ["assets/project-overviews/16-01.jpg", "assets/project-overviews/16-02.jpg", "assets/project-overviews/16-03.jpg", "assets/project-overviews/16-04.jpg", "assets/project-overviews/16-05.jpg", "assets/project-overviews/16-06.jpg", "assets/project-overviews/16-07.jpg"], "tags": ["UI/UX", "AUTOMOTIVE", "DATA DESIGN"]},
  "01": {
    "aim": "Create a modern finance app for tracking money, finances, applications and cards, with personalised settings and a simple, modern experience.",
    "direction": "Clear, legible and accessible, with straightforward interactions, zero clutter and no ads.",
    "tools": "Figma, Codex, HTML, Java, image rendering, prompt engineering, AI methodologies and data analysis.",
    "media": [
      "assets/project-overviews/01-01.png",
      "assets/project-overviews/01-02.png",
      "assets/project-overviews/01-03.png",
      "assets/project-overviews/01-04.png"
    ],
    "tags": [
      "AI",
      "B2C",
      "ENTERPRISE"
    ]
  },
  "02": {
    "aim": "Create a modern crypto news experience that helps newcomers understand and explore a complex subject.",
    "direction": "A modern, glassy interface with familiar, understandable information.",
    "tools": "AI, Figma, ChatGPT Codex, sketching, iteration and prompt engineering.",
    "media": [
      "assets/project-overviews/02-01.png",
      "assets/project-overviews/02-02.png",
      "assets/project-overviews/02-03.png",
      "assets/project-overviews/02-04.png",
      "assets/project-overviews/02-05.png"
    ],
    "tags": []
  },
  "03": {
    "aim": "Explore the possibilities of AI and data through an interactive historical tsunami tracker, where visitors can examine events and their scale.",
    "direction": "A location-focused globe and interactive timeline make tsunami history easy to explore.",
    "tools": "Figma, AI, WebGL, JavaScript and CSS, combining map research with a public tsunami data repository.",
    "media": [
      "assets/project-overviews/03-01.png",
      "assets/project-overviews/03-02.png",
      "assets/project-overviews/03-03.png",
      "assets/project-overviews/03-04.png",
      "assets/project-overviews/03-05.png"
    ],
    "tags": []
  },
  "04": {
    "aim": "Enhance the Maruti Suzuki Nexa digital experience. At frog design, Capgemini Invent, I worked with a team of seven to eight designers throughout the journey from zero to one.",
    "direction": "Following discussions with stakeholders in Japan and India, the direction balanced simplicity with the legacy of the brand and its large audience.",
    "tools": "Figma, Miro, Adobe Photoshop, Lightroom, animation, sketching and user research.",
    "media": [
      "assets/project-overviews/04-01.png",
      "assets/project-overviews/04-02.png",
      "assets/project-overviews/04-03.png",
      "assets/project-overviews/04-04.png"
    ],
    "tags": []
  },
  "05": {
    "aim": "Uplift Maruti Suzuki Arena’s digital experience as a client project, making it easier for people to discover vehicles and take the next step.",
    "direction": "A simple, accessible automotive journey shaped by client and stakeholder discussions, with clear vehicle information and actions.",
    "tools": "Figma, Miro, Adobe Photoshop, Lightroom, animation, sketching and user research.",
    "media": [
      "assets/project-overviews/05-01.png",
      "assets/project-overviews/05-02.png",
      "assets/project-overviews/05-03.png",
      "assets/project-overviews/05-04.png"
    ],
    "tags": []
  },
  "06": {
    "aim": "Create an engaging test experience with clear progress, intuitive movement between questions and a satisfying conclusion.",
    "direction": "Simple and educational for children and adults, with a human-centred approach.",
    "tools": "Online research, IQ test research papers, existing tests, Figma and AI tools.",
    "media": [
      "assets/project-overviews/06-01.png",
      "assets/project-overviews/06-02.png",
      "assets/project-overviews/06-03.png"
    ],
    "tags": [
      "EDUTECH",
      "AI USAGE"
    ]
  },
  "07": {
    "aim": "Design an internal TCS crisis management tool that helps employees communicate and follow protocols, with potential for use by clients worldwide.",
    "direction": "An informative enterprise experience with dashboard patterns, designed for Android and iOS.",
    "tools": "Adobe XD, Figma, Miro, prototyping, animation and AI.",
    "media": [
      "assets/project-overviews/07-01.png",
      "assets/project-overviews/07-02.png",
      "assets/project-overviews/07-03.png",
      "assets/project-overviews/07-04.png",
      "assets/project-overviews/07-05.png",
      "assets/project-overviews/07-06.png"
    ],
    "tags": [
      "CRISIS MANAGEMENT",
      "ENTERPRISE",
      "B2B",
      "B2C APP"
    ]
  },
  "08": {
    "aim": "Create an application for exploring analytics about solar energy and the green energy movement.",
    "direction": "Simple, educational and informative, with a visual language inspired by the Earth and greenery.",
    "tools": "AI-assisted energy research, Figma, internet research, AI agents and data analysis.",
    "media": [
      "assets/project-overviews/08-01.png",
      "assets/project-overviews/08-02.png",
      "assets/project-overviews/08-03.png",
      "assets/project-overviews/08-04.png"
    ],
    "tags": [
      "ENERGY TECH",
      "GREEN ENERGY",
      "AI"
    ]
  },
  "09": {
    "aim": "Research and design a hiring and interview experience, moving from UX research into visual and interface design.",
    "direction": "A simple, playful experience designed primarily for freshers.",
    "tools": "Adobe XD, Photoshop, Figma, Miro and online collaboration in a team of three designers.",
    "media": [
      "assets/project-overviews/09-01.png",
      "assets/project-overviews/09-02.png",
      "assets/project-overviews/09-03.png",
      "assets/project-overviews/09-04.png",
      "assets/project-overviews/09-05.png",
      "assets/project-overviews/09-06.png"
    ],
    "tags": [
      "UX RESEARCH",
      "UX DESIGN",
      "UX METHODOLOGY"
    ]
  },
  "10": {
    "aim": "Develop a data organisation and sharing app through UX research, user testing, card sorting and exploration. This research was undertaken after college with a batchmate.",
    "direction": "An educational, academic and informative experience that makes information easy to access.",
    "tools": "Photoshop, Figma, Adobe XD, collaboration, card sorting and sketching.",
    "media": [
      "assets/project-overviews/10-01.png",
      "assets/project-overviews/10-02.png",
      "assets/project-overviews/10-03.png",
      "assets/project-overviews/10-04.png",
      "assets/project-overviews/10-05.png",
      "assets/project-overviews/10-06.png"
    ],
    "tags": []
  },
  "11": {
    "aim": "Explore mixed reality and virtual reality as tools for understanding socio-technical systems and urban planning, including the different layers of a city and communication.",
    "direction": "A research-led Siemens case study to develop ideas and conclusions for future product iterations.",
    "tools": "MR/VR research and studies, prototyping, Microsoft VR and Xbox Kinect.",
    "media": [
      "assets/project-overviews/11-01.png",
      "assets/project-overviews/11-02.png",
      "assets/project-overviews/11-03.png",
      "assets/project-overviews/11-04.png"
    ],
    "tags": [
      "AUGMENTED REALITY",
      "UX RESEARCH",
      "TELECOM RESEARCH",
      "ARCHITECTURE"
    ]
  },
  "12": {
    "aim": "Explain and self-evaluate my design process.",
    "direction": "A tabular presentation with a scroll wheel interaction.",
    "tools": "AI, Vite, CSS and Figma.",
    "media": [],
    "tags": []
  },
  "13": {
    "aim": "Explore AI, coding and whiteboarding by creating a game to share with friends and keep track of high scores.",
    "direction": "A pirate theme, subtle animations, ocean sounds and visuals that are understandable to children and adults.",
    "tools": "AI research, AI design, game design, Figma and Adobe.",
    "media": [
      "assets/project-overviews/13-01.png",
      "assets/project-overviews/13-02.png"
    ],
    "tags": []
  },
  "14": {
    "aim": "Create a visual representation of an AI agent that makes agentic and human behaviour more understandable through human-computer interaction.",
    "direction": "Playful, simple and adventurous, inspired by Pokémon.",
    "tools": "AI and Figma.",
    "media": [
      "assets/thumbnails/wolfy.png",
      "assets/project-overviews/14-01.png",
      "assets/project-overviews/14-02.png",
      "assets/project-overviews/14-03.png"
    ],
    "tags": [
      "ANIMATION",
      "MOTION DESIGN",
      "GRAPHICS"
    ]
  } ,
  "15": {
    "aim": "Create a modern audio visualizer and a space for artists to share their music and creative work.",
    "direction": "A modern, space-inspired experience built around immersive audio and visuals.",
    "tools": "Figma, Codex, AI, Java, image rendering, prompt engineering and AI methodologies.",
    "media": ["assets/project-overviews/15-01.jpg", "assets/project-overviews/15-02.jpg", "assets/project-overviews/15-03.jpg", "assets/project-overviews/15-04.jpg"],
    "tags": []
  }
};
  const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const renderProjectDetail = card => {
    const index = card.querySelector('.project-index')?.textContent.trim() || '';
    const originalTitle = card.querySelector('h3')?.textContent.trim() || 'Selected project';
    const title = ({'07':'TCS Crisis Management Application','11':'Siemens MR/VR — Socio-Technical Systems','12':'Eesh self grading his design process','14':'Wolfie Daily AI Agent Companion'})[index] || originalTitle;
    // Keep the project name and its descriptor distinct, like the work heading.
    const titleParts = title.split(/\s+[—–]\s+/);
    const titleSplits = {
      '05': ['Maruti Suzuki', 'Arena'],
      '07': ['TCS Crisis Management', 'Application'],
      '10': ['Data & App', 'Organiser'],
      '12': ['Eesh self grading', 'his design process'],
      '14': ['Wolfie Daily', 'AI Agent Companion']
    };
    const [titleStart, titleEnd] = titleSplits[index] || (titleParts.length > 1
      ? [titleParts[0], titleParts.slice(1).join(' ')] : [title, '']);
    const summary = card.querySelector('.project-caption p')?.textContent.trim() || '';
    const tags = [...card.querySelectorAll('.project-tags span')].map(tag => tag.textContent.trim());
    const brief = projectBriefs[index] || {};
    tags.push(...(brief.tags || []));
    const fullDesignUrl = card.getAttribute('href');
    const sections = [['Aim', brief.aim], ['Design direction', brief.direction], ['Tools & methods', brief.tools]];
    const media = brief.media || [];
    const gallery = media.map((src, slot) => `
      <div class="project-media-placeholder project-media-image" role="group" aria-roledescription="slide" aria-label="${slot + 1} of ${media.length}: ${escapeHTML(title)}">
        <img src="${escapeHTML(src)}" alt="${escapeHTML(title)} project image ${slot + 1}" loading="lazy">
      </div>`).join('');
    projectDetailContent.innerHTML = `
      <section class="project-detail-heading">
        <div class="project-detail-heading-main">
          <h1 id="project-detail-title">${escapeHTML(titleStart)}${titleEnd ? ` <em>${escapeHTML(titleEnd)}</em>` : ''}</h1>
        </div>
        <div class="project-detail-actions">
          <a class="project-detail-primary" href="${escapeHTML(fullDesignUrl)}" target="_blank" rel="noopener noreferrer" title="Opens in a new tab">View full design <span aria-hidden="true">↗</span></a>
        </div>
      </section>
      <section class="project-detail-gallery" aria-label="Project media gallery" ${media.length ? "" : "hidden"}>
        <div class="project-media-carousel" role="region" aria-roledescription="carousel" aria-label="Project images and videos for ${escapeHTML(title)}" tabindex="0">
          <div class="project-media-viewport"><div class="project-media-track">${gallery}</div></div>
          <div class="project-media-controls">
            <button class="project-media-arrow" type="button" data-media-prev aria-label="Previous media">←</button>
            <div class="project-media-pagination" role="group" aria-label="Choose a media slide">
              ${Array.from({length: media.length}, (_, slot) => `<button class="project-media-marker${slot === 0 ? ' is-active' : ''}" type="button" data-media-index="${slot}" aria-label="Show media ${slot + 1} of ${media.length}" aria-pressed="${slot === 0}"><span></span></button>`).join('')}
            </div>
            <button class="project-media-arrow" type="button" data-media-next aria-label="Next media">→</button>
            <span class="project-media-status" aria-live="polite">Media 1 of ${media.length}</span>
          </div>
        </div>
        <div class="project-detail-tags">${tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join('')}</div>
      </section>
      <section class="project-detail-overview">
        <p class="project-detail-summary">${escapeHTML(summary)}</p>
        <div class="project-detail-brief-grid">${sections.map(([label, copy]) => `
          <article class="project-detail-brief"><h2>${escapeHTML(label)}</h2><p>${escapeHTML(copy || summary)}</p></article>`).join('')}

        </div>
      </section>
      `;
    const mobileLink = projectDetailDialog.querySelector('.project-detail-mobile-link');
    if (mobileLink) mobileLink.href = fullDesignUrl;

    const carousel = projectDetailContent.querySelector('.project-media-carousel');
    const track = carousel?.querySelector('.project-media-track');
    const viewport = carousel?.querySelector('.project-media-viewport');
    const slides = [...(track?.children || [])];
    const markers = [...(carousel?.querySelectorAll('[data-media-index]') || [])];
    const previous = carousel?.querySelector('[data-media-prev]');
    const next = carousel?.querySelector('[data-media-next]');
    const status = carousel?.querySelector('.project-media-status');
    let activeSlide = 0;
    const showSlide = requestedIndex => {
      activeSlide = Math.max(0, Math.min(slides.length - 1, requestedIndex));
      if (track) track.style.transform = `translate3d(-${activeSlide * 100}%, 0, 0)`;
      slides.forEach((slide, slideIndex) => slide.setAttribute('aria-hidden', String(slideIndex !== activeSlide)));
      markers.forEach((marker, slideIndex) => {
        const active = slideIndex === activeSlide;
        marker.classList.toggle('is-active', active);
        marker.setAttribute('aria-pressed', String(active));
      });
      if (previous) previous.disabled = activeSlide === 0;
      if (next) next.disabled = activeSlide === slides.length - 1;
      if (status) status.textContent = `Media ${activeSlide + 1} of ${slides.length}`;
    };
    previous?.addEventListener('click', () => showSlide(activeSlide - 1));
    next?.addEventListener('click', () => showSlide(activeSlide + 1));
    markers.forEach(marker => marker.addEventListener('click', () => showSlide(Number(marker.dataset.mediaIndex))));
    carousel?.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); showSlide(activeSlide - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); showSlide(activeSlide + 1); }
    });
    let lastWheelChange = 0;
    carousel?.addEventListener('wheel', event => {
      if (Math.abs(event.deltaX) < 12 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (performance.now() - lastWheelChange > 450) {
        showSlide(activeSlide + (event.deltaX > 0 ? 1 : -1));
        lastWheelChange = performance.now();
      }
    }, { passive: false });
    let pointerStartX = null;
    viewport?.addEventListener('pointerdown', event => { pointerStartX = event.clientX; });
    viewport?.addEventListener('pointerup', event => {
      if (pointerStartX === null) return;
      const distance = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(distance) > 44) showSlide(activeSlide + (distance < 0 ? 1 : -1));
    });
    viewport?.addEventListener('pointercancel', () => { pointerStartX = null; });
    showSlide(0);
  };
  const openProjectDetail = card => {
    if (!projectDetail || !projectDetailContent || !projectDetailDialog) return;
    projectDetailOrigin = card;
    panelCloseWasHidden = panelClose?.hidden ?? true;
    if (panelClose) panelClose.hidden = true;
    renderProjectDetail(card);
    projectDetail.hidden = false;
    projectDetail.removeAttribute('inert');
    projectDetail.setAttribute('aria-hidden', 'false');
    stage?.setAttribute('inert', '');
    document.documentElement.classList.add('project-detail-open');
    document.body.classList.add('project-detail-open');
    projectDetailContent.scrollTop = 0;
    requestAnimationFrame(() => projectDetail.querySelector('.project-detail-back-bottom')?.focus());
  };
  const closeProjectDetail = () => {
    if (!projectDetail || projectDetail.hidden) return;
    projectDetail.setAttribute('aria-hidden', 'true');
    projectDetail.setAttribute('inert', '');
    projectDetail.hidden = true;
    stage?.removeAttribute('inert');
    document.documentElement.classList.remove('project-detail-open');
    document.body.classList.remove('project-detail-open');
    if (panelClose) panelClose.hidden = panelCloseWasHidden;
    const origin = projectDetailOrigin;
    projectDetailOrigin = null;
    origin?.focus();
  };
  document.querySelectorAll('.work-panel .project-card:not(.project-more-card)').forEach(card => {
    card.setAttribute('aria-haspopup', 'dialog');
    const title = card.querySelector('h3')?.textContent.trim();
    if (title) card.setAttribute('aria-label', `Open project overview for ${title}`);
  });
  document.querySelector('.project-grid')?.addEventListener('click', event => {
    if (event.currentTarget.classList.contains('is-reordering')) { event.preventDefault(); return; }
    const card = event.target.closest('.project-card:not(.project-more-card)');
    if (!card || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openProjectDetail(card);
  });
  projectDetail?.addEventListener('click', event => {
    if (event.target.closest('[data-detail-close]')) closeProjectDetail();
  });
  const panelTriggers = [...document.querySelectorAll('[data-open-panel]')];
  const setPanel = (name, trigger = null) => {
    const nextName = stage?.dataset.panel === name ? '' : (panels[name] ? name : '');
    stage?.classList.toggle('is-panel-open', Boolean(nextName));
    stage?.classList.toggle('is-work-open', nextName === 'work');
    stage?.classList.toggle('is-education-open', nextName === 'education');
    if (stage) stage.dataset.panel = nextName;
    document.body.classList.toggle('panel-open', Boolean(nextName));
    document.documentElement.classList.toggle('panel-open', Boolean(nextName));
    backgroundTargets.forEach(element => {
      if (nextName) {
        element.setAttribute('inert', '');
        element.setAttribute('aria-hidden', 'true');
      } else {
        element.removeAttribute('inert');
        element.removeAttribute('aria-hidden');
      }
    });
    Object.entries(panels).forEach(([panelName, panel]) => {
      if (!panel) return;
      const open = panelName === nextName;
      panel.setAttribute('aria-hidden', String(!open));
      if (open) panel.removeAttribute('inert');
      else panel.setAttribute('inert', '');
    });
    if (panelClose) {
      panelClose.hidden = !nextName;
      panelClose.setAttribute('aria-label', nextName === 'education' ? 'Close education and experience panel' : 'Close selected work panel');
    }
    panelTriggers.forEach(button => button.setAttribute('aria-expanded', String(button.dataset.openPanel === nextName)));
    if (nav?.classList.contains('open')) {
      nav.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      toggle?.setAttribute('aria-label', 'Open navigation');
    }
    if (nextName) {
      activePanelTrigger = trigger || activePanelTrigger;
      panelClose?.focus();
    } else {
      activePanelTrigger?.focus();
      activePanelTrigger = null;
    }
  };
  panelTriggers.forEach(button => button.addEventListener('click', () => setPanel(button.dataset.openPanel, button)));
  document.querySelector('[data-contact-jump]')?.addEventListener('click', event => {
    event.preventDefault();
    setPanel('');
    const contactCard = document.querySelector('#contact');
    if (!contactCard) return;
    history.replaceState(null, '', '#contact');
    contactCard.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start'
    });
  });
  document.querySelectorAll('.panel-close').forEach(button => button.addEventListener('click', () => setPanel('')));
  document.addEventListener('keydown', event => {
    if (projectDetail && !projectDetail.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeProjectDetail();
        return;
      }
      if (event.key === 'Tab') {
        const focusable = [...projectDetail.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')]
          .filter(element => !element.closest('[inert]') && element.getClientRects().length);
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }
      return;
    }
    if (event.key === 'Escape' && stage?.dataset.panel) setPanel('');
    if (event.key === 'Tab' && stage?.dataset.panel) {
      const activePanel = panels[stage.dataset.panel];
      const panelControls = [...activePanel.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')];
      const focusable = [panelClose, ...panelControls].filter(Boolean)
        .filter(element => !element.closest('[inert]') && element.getClientRects().length);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
  });
  const setupAccordion = (buttons, rowSelector, initialOpenIndex = -1) => {
    const setOpen = (button, open) => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      button.setAttribute('aria-expanded', String(open));
      const row = button.closest(rowSelector);
      if (row) row.dataset.expanded = String(open);
      if (!panel) return;
      panel.setAttribute('aria-hidden', String(!open));
      if (open) panel.removeAttribute('inert');
      else panel.setAttribute('inert', '');
    };
    buttons.forEach((button, index) => setOpen(button, index === initialOpenIndex));
    buttons.forEach(button => button.addEventListener('click', () => {
      const shouldOpen = button.getAttribute('aria-expanded') !== 'true';
      buttons.forEach(other => setOpen(other, other === button && shouldOpen));
    }));
  };
  setupAccordion([...document.querySelectorAll('.role-toggle')], '.role');
  const timeline = document.querySelector('.project-grid');
  if (timeline) {
    const timelineRows = [...timeline.querySelectorAll('.project-card')];
    timeline.addEventListener('pointermove', event => {
      timelineRows.forEach(row => {
        const bounds = row.getBoundingClientRect();
        const distance = Math.abs(event.clientY - (bounds.top + bounds.height / 2));
        const magnification = Math.exp(-(distance * distance) / (2 * 92 * 92));
        row.style.setProperty('--marker-scale', (1 + magnification * .78).toFixed(3));
      });
    }, {passive: true});
    timeline.addEventListener('pointerleave', () => {
      timelineRows.forEach(row => row.style.removeProperty('--marker-scale'));
    }, {passive: true});
  }
  const revealTargets = document.querySelectorAll('.contact-section');
  revealTargets.forEach(el => el.classList.add('reveal'));
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold: .08});
    revealTargets.forEach(el => observer.observe(el));
  } else revealTargets.forEach(el => el.classList.add('visible'));
})();

// Reveal each project as it enters the works panel.
if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const worksPanel = document.querySelector('#work-panel');
  if (worksPanel) {
    const projectObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('project-revealed'); projectObserver.unobserve(entry.target); }
    }), {root: worksPanel, threshold: 0.08});
    worksPanel.querySelectorAll('.project-card').forEach(card => { card.classList.add('project-reveal'); projectObserver.observe(card); });
  }
}

// Project order is a personal browser preference; opening projects stays unchanged outside arrange mode.
(() => {
  const grid = document.querySelector('.work-panel .project-grid');
  const toggle = document.querySelector('.reorder-toggle');
  const help = document.querySelector('.reorder-help');
  const status = document.querySelector('.reorder-status');
  if (!grid || !toggle) return;
  const originalParent = toggle.parentElement;
  const closeButton = document.querySelector('.panel-close-global');
  const mobileLayout = window.matchMedia('(max-width: 760px)');
  const placeToggle = () => {
    if (mobileLayout.matches && closeButton) closeButton.insertAdjacentElement('afterend', toggle);
    else originalParent.appendChild(toggle);
  };
  placeToggle();
  mobileLayout.addEventListener('change', placeToggle);
  const cards = [...grid.querySelectorAll('.project-card:not(.project-more-card)')];
  const more = grid.querySelector('.project-more-card');
  const key = 'portfolio-project-order-v2';
  const id = card => card.querySelector('.project-index')?.textContent.trim();
  const save = () => { try { localStorage.setItem(key, JSON.stringify(cardsInOrder().map(id))); } catch (_) {} };
  const cardsInOrder = () => [...grid.querySelectorAll('.project-card:not(.project-more-card)')];
  try {
    const order = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(order)) { const sorted = order.map(value => cards.find(item => id(item) === value)).filter(Boolean); cards.filter(card => !sorted.includes(card)).forEach(card => sorted.push(card)); sorted.forEach(card => grid.insertBefore(card, more)); }
  } catch (_) {}
  const announce = card => { const list = cardsInOrder(); status.textContent = `${card.querySelector('h3')?.textContent.trim()} moved to position ${list.indexOf(card) + 1} of ${list.length}.`; };
  toggle.addEventListener('click', () => {
    const editing = !grid.classList.contains('is-reordering');
    grid.classList.toggle('is-reordering', editing);
    toggle.setAttribute('aria-pressed', String(editing));
    toggle.textContent = editing ? 'Done' : 'Arrange works';
    help.hidden = !editing;
    cards.forEach(card => { card.draggable = false; });
    if (!editing) save();
  });
  let dragged = null, target = null, startX = 0, startY = 0, moved = false;
  grid.addEventListener('pointerdown', event => {
    if (!grid.classList.contains('is-reordering') || event.button !== 0) return;
    const card = event.target.closest('.project-card:not(.project-more-card)');
    if (!card) return;
    dragged = card; target = null; moved = false; startX = event.clientX; startY = event.clientY;
    card.setPointerCapture(event.pointerId);
  });
  grid.addEventListener('pointermove', event => {
    if (!dragged) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) < 8 && !moved) return;
    moved = true; dragged.classList.add('is-dragging');
    const candidate = document.elementFromPoint(event.clientX, event.clientY)?.closest('.project-card:not(.project-more-card)');
    if (target) target.classList.remove('is-drop-target');
    target = candidate && candidate !== dragged ? candidate : null;
    target?.classList.add('is-drop-target');
  });
  const finish = () => {
    if (!dragged) return;
    if (moved && target) { const list = cardsInOrder(); grid.insertBefore(dragged, list.indexOf(dragged) < list.indexOf(target) ? target.nextElementSibling : target); save(); announce(dragged); }
    dragged.classList.remove('is-dragging'); target?.classList.remove('is-drop-target'); dragged = null; target = null;
  };
  grid.addEventListener('pointerup', finish);
  grid.addEventListener('pointercancel', () => { if (dragged) dragged.classList.remove('is-dragging'); target?.classList.remove('is-drop-target'); dragged = null; target = null; });
  grid.addEventListener('keydown', event => {
    if (!grid.classList.contains('is-reordering')) return;
    const card = event.target.closest('.project-card:not(.project-more-card)');
    if (!card) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); return; }
    if (!['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(event.key)) return;
    event.preventDefault(); const list = cardsInOrder(); const index = list.indexOf(card);
    const step = ['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 1;
    const neighbor = list[index + step]; if (!neighbor) return;
    grid.insertBefore(card, step < 0 ? neighbor : neighbor.nextElementSibling); card.focus(); save(); announce(card);
  });
})();
