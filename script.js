(() => {
  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0, height = 0, stars = [], frame = 0;
  let pointer = {x: innerWidth / 2, y: innerHeight / 2};
  let fieldPointer = {...pointer};
  let activity = 0, lastMove = 0, previousPointer = null, lastFrame = 0;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    width = innerWidth; height = innerHeight;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(620, Math.round(width * height / 2200));
    let seed = 821;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    stars = Array.from({length: count}, () => ({
      x: random() * width,
      y: random() * height,
      r: .35 + random() * 1.15,
      a: .18 + random() * .55,
      phase: random() * 6.28,
      depth: .15 + random() * .85,
      warm: random() > .86
    }));
  };

  const draw = (now = 0) => {
    ctx.clearRect(0, 0, width, height);
    const nebulaA = ctx.createRadialGradient(width * .18, height * .62, 0, width * .18, height * .62, Math.max(width, height) * .78);
    nebulaA.addColorStop(0, 'rgba(24, 145, 166, .095)');
    nebulaA.addColorStop(.42, 'rgba(15, 70, 105, .045)');
    nebulaA.addColorStop(1, 'rgba(8, 15, 30, 0)');
    ctx.fillStyle = nebulaA;
    ctx.fillRect(0, 0, width, height);
    const nebulaB = ctx.createRadialGradient(width * .84, height * .28, 0, width * .84, height * .28, Math.max(width, height) * .62);
    nebulaB.addColorStop(0, 'rgba(116, 35, 79, .085)');
    nebulaB.addColorStop(.5, 'rgba(65, 26, 69, .035)');
    nebulaB.addColorStop(1, 'rgba(8, 15, 30, 0)');
    ctx.fillStyle = nebulaB;
    ctx.fillRect(0, 0, width, height);
    const dt = lastFrame ? Math.min(now - lastFrame, 50) : 16;
    lastFrame = now;
    if (!reduced) {
      activity *= Math.exp(-dt / 1350);
      const follow = 1 - Math.exp(-dt / 650);
      fieldPointer.x += (pointer.x - fieldPointer.x) * follow;
      fieldPointer.y += (pointer.y - fieldPointer.y) * follow;
    }

    if (activity > .015 && !reduced) {
      const radius = Math.min(220, Math.max(145, width * .15));
      const halo = ctx.createRadialGradient(fieldPointer.x, fieldPointer.y, 0, fieldPointer.x, fieldPointer.y, radius);
      halo.addColorStop(0, `rgba(195,216,255,${activity * .0945})`);
      halo.addColorStop(.28, `rgba(120,158,220,${activity * .0405})`);
      halo.addColorStop(1, 'rgba(80,110,175,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(fieldPointer.x - radius, fieldPointer.y - radius, radius * 2, radius * 2);
    }

    stars.forEach(star => {
      const parallaxX = reduced ? 0 : (width / 2 - pointer.x) * star.depth * .012;
      const parallaxY = reduced ? 0 : (height / 2 - pointer.y) * star.depth * .012;
      const baseX = star.x + parallaxX;
      const scrollParallax = (scrollY * star.depth * .035) % Math.max(height, 1);
      const baseY = (star.y + scrollParallax) % Math.max(height, 1) + parallaxY;
      const dx = fieldPointer.x - baseX;
      const dy = fieldPointer.y - baseY;
      const distance = Math.hypot(dx, dy);
      const attraction = reduced ? 0 : activity * (.72 + star.depth * .28) * Math.exp(-(distance * distance) / (2 * 115 * 115));
      const x = baseX + dx * attraction;
      const y = baseY + dy * attraction;
      const pulse = reduced ? 1 : .78 + Math.sin(frame * .018 + star.phase) * .2;
      const bright = 1 + attraction * 2.4;
      const radius = star.r * (1 + attraction * 1.25);
      const alpha = Math.min(.98, star.a * pulse * bright * .9);

      if (attraction > .12) {
        ctx.beginPath();
        ctx.arc(x, y, radius * 4.6, 0, Math.PI * 2);
        ctx.fillStyle = star.warm ? `rgba(255,207,162,${alpha * attraction * .17})` : `rgba(199,222,255,${alpha * attraction * .18})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = star.warm ? `rgba(255,220,185,${alpha})` : `rgba(239,245,255,${alpha})`;
      ctx.fill();
    });

    if (!reduced) { frame++; requestAnimationFrame(draw); }
  };

  resize();
  if (reduced) draw();
  else requestAnimationFrame(draw);
  addEventListener('resize', resize, {passive: true});
  addEventListener('pointermove', event => {
    pointer = {x: event.clientX, y: event.clientY};
    if (!reduced && previousPointer) {
      const elapsed = Math.max(8, performance.now() - lastMove);
      const distance = Math.hypot(pointer.x - previousPointer.x, pointer.y - previousPointer.y);
      const speed = distance / elapsed;
      if (speed > .08) activity = Math.min(.72, activity + Math.min(.035, speed * .04));
    }
    previousPointer = pointer;
    lastMove = performance.now();
  }, {passive: true});
  addEventListener('pointerleave', () => { activity *= .35; }, {passive: true});

  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#site-nav');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('open', open);
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open navigation');
  }));
  const experienceToggles = [...document.querySelectorAll('.role-toggle')];
  if (experienceToggles.length) {
    const mobileExperience = matchMedia('(max-width: 760px)');
    const setExperienceOpen = (button, open) => {
      const panel = document.getElementById(button.getAttribute('aria-controls'));
      button.setAttribute('aria-expanded', String(open));
      const role = button.closest('.role');
      if (role) role.dataset.expanded = String(open);
      if (!panel) return;
      if (mobileExperience.matches) {
        panel.setAttribute('aria-hidden', String(!open));
        if (open) panel.removeAttribute('inert');
        else panel.setAttribute('inert', '');
      } else {
        panel.removeAttribute('aria-hidden');
        panel.removeAttribute('inert');
      }
    };
    const syncExperienceMode = () => {
      experienceToggles.forEach(button => setExperienceOpen(button, false));
    };
    syncExperienceMode();
    if (mobileExperience.addEventListener) mobileExperience.addEventListener('change', syncExperienceMode);
    else mobileExperience.addListener(syncExperienceMode);
    experienceToggles.forEach(button => button.addEventListener('click', () => {
      if (!mobileExperience.matches) return;
      const shouldOpen = button.getAttribute('aria-expanded') !== 'true';
      experienceToggles.forEach(other => setExperienceOpen(other, other === button && shouldOpen));
    }));
  }
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
  const revealTargets = document.querySelectorAll('.intro,.work,.experience,.contact');
  revealTargets.forEach(el => el.classList.add('reveal'));
  if ('IntersectionObserver' in window && !reduced) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold: .08});
    revealTargets.forEach(el => observer.observe(el));
  } else revealTargets.forEach(el => el.classList.add('visible'));
})();
