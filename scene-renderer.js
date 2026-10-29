(() => {
  'use strict';

  const canvas = document.getElementById('scene-motion');
  const body = document.body;
  if (!canvas || !body) return;
  const ctx = canvas.getContext('2d', {alpha: true});
  if (!ctx) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, value) => {
    const t = clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const seeded = seed => () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  let width = 0;
  let height = 0;
  let dpr = 1;
  let activeTheme = 'galaxy';
  let elapsed = 0;
  let lastFrame = 0;
  let frameId = 0;
  let scrollProgress = 0;
  let rain = [];
  let bubbles = [];
  let dust = [];
  let lightning = [];

  const measurePageScroll = () => {
    const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    scrollProgress = clamp(scrollY / range, 0, 1);
  };

  const resize = () => {
    width = innerWidth;
    height = innerHeight;
    const pixelLimit = 2_500_000;
    dpr = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(pixelLimit / Math.max(1, width * height)));
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    createParticles();
    if (reducedMotion && activeTheme !== 'galaxy') drawScene(0);
  };

  const createParticles = () => {
    const rand = seeded(72031 + width * 3 + height);
    // Keep storm rain sparse and short so it reads as depth, never as a screen-wide grid.
    const rainCount = Math.round(clamp(width * height / 36000, 14, 42));
    rain = Array.from({length: rainCount}, () => ({
      x: rand() * width,
      y: rand() * height,
      depth: .25 + rand() * .75,
      length: 4 + rand() * 11,
      speed: 280 + rand() * 440,
      drift: 9 + rand() * 34,
      alpha: .045 + rand() * .12
    }));
    const bubbleCount = Math.round(clamp(width * height / 23000, 16, 58));
    bubbles = Array.from({length: bubbleCount}, () => ({
      x: rand() * width,
      y: rand() * height * 1.25,
      depth: .22 + rand() * .78,
      radius: 1.2 + rand() * 6.8,
      speed: 4 + rand() * 17,
      sway: 4 + rand() * 22,
      phase: rand() * Math.PI * 2
    }));
    dust = Array.from({length: Math.round(clamp(width * height / 44000, 12, 32))}, () => ({
      x: rand() * width,
      y: rand() * height,
      depth: .2 + rand() * .8,
      radius: .35 + rand() * 1.15,
      speed: 2 + rand() * 8,
      phase: rand() * Math.PI * 2,
      alpha: .08 + rand() * .18
    }));
    lightning = [1.35, 4.95, 8.05].map((time, index) => makeLightning(584 + index * 103, index % 2 === 0, time));
  };

  function makeLightning(seed, fromLeft, time) {
    const rand = seeded(seed);
    const startX = (fromLeft ? .16 : .84) * width;
    const direction = fromLeft ? 1 : -1;
    const path = [{x: startX, y: height * .035}];
    let x = startX;
    let y = height * .035;
    const endY = height * (.4 + rand() * .12);
    while (y < endY) {
      y += height * (.045 + rand() * .065);
      x += direction * width * (.012 + rand() * .034) + (rand() - .5) * width * .024;
      path.push({x, y});
    }
    const branches = [];
    for (let i = 2; i < path.length - 1; i += 2 + Math.floor(rand() * 2)) {
      const origin = path[i];
      const branch = [{x: origin.x, y: origin.y}];
      const side = rand() > .5 ? 1 : -1;
      let bx = origin.x;
      let by = origin.y;
      for (let j = 0; j < 2 + Math.floor(rand() * 3); j++) {
        bx += direction * width * (.008 + rand() * .018) + side * width * (.012 + rand() * .022);
        by += height * (.025 + rand() * .045);
        branch.push({x: bx, y: by});
      }
      branches.push(branch);
    }
    return {time, fromLeft, path, branches};
  }

  function clear() {
    ctx.clearRect(0, 0, width, height);
  }

  function drawScene(time) {
    clear();
    ctx.save();
    switch (activeTheme) {
      case 'cloud': drawCloud(time); break;
      case 'anime': drawAnime(time); break;
      case 'mural': drawMural(time); break;
      case 'blueprint': drawBlueprint(time); break;
      case 'underwater': drawUnderwater(time); break;
      case 'bauhaus': drawBauhaus(time); break;
      case 'urban': drawUrban(time); break;
    }
    ctx.restore();
  }

  function roundRectPath(x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawCloud(time) {
    if (reducedMotion) return;

    // Feathered vapor bands drift at different speeds to suggest wind moving
    // through the photographed cloud layers without adding hard graphic marks.
    const layers = [
      {y: .19, speed: .009, scale: .72, alpha: .048, phase: .4},
      {y: .46, speed: -.006, scale: .96, alpha: .035, phase: 2.2},
      {y: .73, speed: .004, scale: .82, alpha: .042, phase: 4.1}
    ];
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const [index, layer] of layers.entries()) {
      const rawTravel = time * width * layer.speed + scrollProgress * width * .018 + index * width * .58;
      const travel = ((rawTravel % (width * 1.85)) + width * 1.85) % (width * 1.85) - width * .42;
      const centerY = height * layer.y + Math.sin(time * .12 + layer.phase) * height * .012;
      const span = width * layer.scale;
      const feather = Math.max(18, height * .035);
      const glow = ctx.createLinearGradient(travel, centerY - feather, travel + span, centerY + feather);
      glow.addColorStop(0, 'rgba(184,211,237,0)');
      glow.addColorStop(.25, `rgba(185,210,234,${layer.alpha * .35})`);
      glow.addColorStop(.58, `rgba(211,228,245,${layer.alpha})`);
      glow.addColorStop(1, 'rgba(186,213,238,0)');

      ctx.save();
      ctx.filter = `blur(${Math.max(8, height * .018)}px)`;
      ctx.strokeStyle = glow;
      ctx.lineWidth = feather * 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(travel, centerY);
      ctx.bezierCurveTo(
        travel + span * .24, centerY - feather * (.35 + Math.sin(time * .17 + layer.phase) * .15),
        travel + span * .58, centerY + feather * (.55 + Math.sin(time * .13 + layer.phase) * .2),
        travel + span, centerY - feather * .12
      );
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawRain(time) {
    ctx.save();
    ctx.lineCap = 'round';
    for (const drop of rain) {
      const y = (drop.y + time * drop.speed * drop.depth) % (height + 50) - 25;
      const x = (drop.x + time * drop.drift * drop.depth) % (width + 40) - 20;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - drop.length * .18, y + drop.length * drop.depth);
      ctx.strokeStyle = `rgba(190,219,248,${drop.alpha * drop.depth})`;
      ctx.lineWidth = .35 + drop.depth * .65;
      ctx.stroke();
    }
    ctx.restore();
  }

  function strokeLightning(points, opacity, widthScale) {
    if (!points || points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.globalAlpha = opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#bddbff';
    ctx.lineWidth = widthScale;
    ctx.stroke();
  }

  function drawAnime(time) {
    drawRain(time);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const strike of lightning) {
      const age = time - strike.time;
      if (age < -.52 || age > 1.12) continue;

      // A low, broad pre-flash and lingering cloud afterglow establish the storm
      // before the bolt itself appears. Keep the illumination tied to the strike.
      const preflash = age < 0 ? smoothstep(-.52, -.08, age) * (1 - smoothstep(-.035, .05, age)) * .12 : 0;
      const afterglow = age > .48 ? (1 - smoothstep(.48, 1.12, age)) * .13 : 0;
      const pulse = age < 0 ? 0
        : age < .075 ? age / .075
        : age < .15 ? 1
        : age < .23 ? .24
        : age < .31 ? .58
        : age < .43 ? .13
        : age < .51 ? .34
        : 0;
      const cloudLight = Math.max(preflash, afterglow, pulse * .28);
      const strikePoint = strike.path[strike.path.length - 1];
      const glowX = strikePoint.x;
      const glowY = strikePoint.y * .82;

      if (cloudLight > .004) {
        const cloudGlow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, width * .34);
        cloudGlow.addColorStop(0, `rgba(185,216,255,${cloudLight * 1.15})`);
        cloudGlow.addColorStop(.32, `rgba(116,173,244,${cloudLight * .64})`);
        cloudGlow.addColorStop(.72, `rgba(80,130,218,${cloudLight * .22})`);
        cloudGlow.addColorStop(1, 'rgba(62,121,217,0)');
        ctx.fillStyle = cloudGlow;
        ctx.fillRect(0, 0, width, height);
        const horizon = ctx.createLinearGradient(0, glowY - height * .07, 0, glowY + height * .22);
        horizon.addColorStop(0, 'rgba(174,212,255,0)');
        horizon.addColorStop(.58, `rgba(141,191,255,${cloudLight * .22})`);
        horizon.addColorStop(1, 'rgba(122,169,239,0)');
        ctx.fillStyle = horizon;
        ctx.fillRect(0, 0, width, height);
      }

      if (pulse <= .01) continue;
      ctx.save();
      ctx.shadowColor = 'rgba(185,220,255,.96)';
      ctx.shadowBlur = 18 * pulse;
      strokeLightning(strike.path, .66 * pulse, 4.2);
      for (const branch of strike.branches) strokeLightning(branch, .32 * pulse, 2.1);
      ctx.shadowBlur = 0;
      strokeLightning(strike.path, .96 * pulse, 1.05);
      for (const branch of strike.branches) strokeLightning(branch, .48 * pulse, .65);
      ctx.restore();
    }
    ctx.restore();
  }

  function drawMural(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const lightX = width * (.25 + .5 * (.5 + .5 * Math.sin(time * .22)));
    const light = ctx.createRadialGradient(lightX, height * .34, 0, lightX, height * .34, width * .52);
    light.addColorStop(0, 'rgba(255,211,179,.095)');
    light.addColorStop(1, 'rgba(255,163,149,0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, width, height);
    for (const particle of dust) {
      const x = (particle.x + Math.sin(time * .16 + particle.phase) * 13 * particle.depth + scrollProgress * 5) % width;
      const y = (particle.y - time * particle.speed * particle.depth + height) % height;
      ctx.beginPath();
      ctx.arc(x, y, particle.radius * particle.depth, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,224,196,${particle.alpha * (.65 + .35 * Math.sin(time + particle.phase))})`;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBlueprint(time) {
    const x = width * (.08 + .84 * (reducedMotion ? .5 : (time % 10) / 10));
    const drift = scrollProgress * height * .018;
    ctx.save();
    ctx.globalAlpha = .16;
    const scan = ctx.createLinearGradient(x - 50, 0, x + 50, 0);
    scan.addColorStop(0, 'rgba(202,225,255,0)');
    scan.addColorStop(.5, 'rgba(222,239,255,.62)');
    scan.addColorStop(1, 'rgba(202,225,255,0)');
    ctx.fillStyle = scan;
    ctx.fillRect(x - 50, 0, 100, height);
    ctx.globalAlpha = .2;
    ctx.strokeStyle = 'rgba(220,237,255,.72)';
    ctx.lineWidth = .7;
    ctx.setLineDash([2, 9]);
    ctx.beginPath();
    ctx.moveTo(width * .08, height * .2 - drift);
    ctx.lineTo(width * .08, height * .8 - drift);
    ctx.moveTo(width * .92, height * .18 + drift);
    ctx.lineTo(width * .92, height * .82 + drift);
    ctx.stroke();
    ctx.setLineDash([]);
    const nodes = [[.12, .2], [.89, .79], [.8, .22]];
    for (const [nx, ny] of nodes) {
      const px = nx * width;
      const py = ny * height + Math.sin(time * .18 + nx * 7) * 2 - drift * .2;
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(225,241,255,.8)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px - 11, py); ctx.lineTo(px - 4, py);
      ctx.moveTo(px + 4, py); ctx.lineTo(px + 11, py);
      ctx.moveTo(px, py - 11); ctx.lineTo(px, py - 4);
      ctx.moveTo(px, py + 4); ctx.lineTo(px, py + 11);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBubble(bubble, time, index) {
    const rawY = bubble.y - time * bubble.speed - scrollProgress * height * .035;
    const y = ((rawY % (height + 40)) + height + 40) % (height + 40) - 20;
    const x = bubble.x + Math.sin(time * .35 + bubble.phase) * bubble.sway * bubble.depth;
    const radius = bubble.radius * (.42 + bubble.depth * .9);
    const alpha = .16 + bubble.depth * .28;
    ctx.save();
    ctx.globalAlpha = alpha;
    const fill = ctx.createRadialGradient(x - radius * .34, y - radius * .4, 0, x, y, radius * 1.15);
    fill.addColorStop(0, 'rgba(229,253,255,.21)');
    fill.addColorStop(.28, 'rgba(162,236,249,.055)');
    fill.addColorStop(.8, 'rgba(143,230,246,.015)');
    fill.addColorStop(1, 'rgba(190,248,255,.13)');
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    const edge = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    edge.addColorStop(0, 'rgba(232,253,255,.62)');
    edge.addColorStop(.42, 'rgba(167,239,251,.11)');
    edge.addColorStop(1, 'rgba(227,253,255,.46)');
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(.45, radius * .075);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x - radius * .34, y - radius * .38, radius * .16, radius * .09, -.55, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(240,255,255,.65)';
    ctx.fill();
    ctx.restore();
  }

  function drawDiver(x, y, scale, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    const finSwing = Math.sin(time * .85) * 5;
    ctx.shadowColor = 'rgba(64,187,221,.38)';
    ctx.shadowBlur = 14;
    // Fins and lower legs trail behind the swimmer.
    ctx.beginPath();
    ctx.moveTo(-28, 10); ctx.lineTo(-48, 21 + finSwing); ctx.lineTo(-74, 20 + finSwing);
    ctx.lineTo(-60, 8); ctx.lineTo(-40, 3); ctx.closePath();
    const fin = ctx.createLinearGradient(-74, 0, -28, 0);
    fin.addColorStop(0, '#102d3b'); fin.addColorStop(.65, '#326477'); fin.addColorStop(1, '#7eb6c6');
    ctx.fillStyle = fin; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-25, 4); ctx.lineTo(-51, -2 - finSwing); ctx.lineTo(-70, -10 - finSwing);
    ctx.lineTo(-53, 6); ctx.lineTo(-37, 12); ctx.closePath();
    ctx.fillStyle = '#183c4b'; ctx.fill();

    // Tank, harness and torso are shaded separately to read as a diver, not a pictogram.
    const tank = ctx.createLinearGradient(-24, -30, -11, -12);
    tank.addColorStop(0, '#a8c9d1'); tank.addColorStop(.2, '#31596a'); tank.addColorStop(.72, '#102c3a'); tank.addColorStop(1, '#7daeba');
    roundRectPath(-26, -31, 16, 44, 6); ctx.fillStyle = tank; ctx.fill();
    ctx.strokeStyle = 'rgba(189,230,239,.42)'; ctx.lineWidth = 1.2; ctx.stroke();
    roundRectPath(-12, -29, 6, 41, 2); ctx.fillStyle = 'rgba(181,219,227,.6)'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-17, -26); ctx.quadraticCurveTo(-5, -31, 9, -24); ctx.lineTo(20, -14);
    ctx.lineTo(13, 5); ctx.quadraticCurveTo(-2, 15, -20, 5); ctx.closePath();
    const suit = ctx.createLinearGradient(-12, -27, 8, 9);
    suit.addColorStop(0, '#a9cdd6'); suit.addColorStop(.32, '#31596a'); suit.addColorStop(.68, '#102937'); suit.addColorStop(1, '#80b2bf');
    ctx.fillStyle = suit; ctx.fill();
    ctx.strokeStyle = 'rgba(190,229,237,.54)'; ctx.lineWidth = 1; ctx.stroke();

    // Rear arm sweeps back; leading arm reaches toward the open water.
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-9, -20); ctx.quadraticCurveTo(-22, -12, -31, -1);
    ctx.strokeStyle = '#315e6d'; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -20); ctx.quadraticCurveTo(15, -30, 28, -26);
    ctx.lineTo(38, -19);
    ctx.strokeStyle = '#547f8c'; ctx.lineWidth = 5; ctx.stroke();
    ctx.beginPath(); ctx.arc(39, -18, 3, 0, Math.PI * 2); ctx.fillStyle = '#c8e6e9'; ctx.fill();

    // Hood, mask and a small rim-lit lens.
    ctx.beginPath(); ctx.ellipse(17, -31, 13, 12, .12, 0, Math.PI * 2);
    const hood = ctx.createLinearGradient(7, -41, 25, -20);
    hood.addColorStop(0, '#c1dce0'); hood.addColorStop(.28, '#497584'); hood.addColorStop(.8, '#112f3d'); hood.addColorStop(1, '#81aeb9');
    ctx.fillStyle = hood; ctx.fill(); ctx.strokeStyle = 'rgba(211,244,247,.68)'; ctx.lineWidth = 1.1; ctx.stroke();
    roundRectPath(22, -35, 10, 7, 2);
    ctx.fillStyle = 'rgba(107,192,218,.82)'; ctx.fill();
    ctx.strokeStyle = 'rgba(236,255,255,.72)'; ctx.lineWidth = .8; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -42); ctx.quadraticCurveTo(17, -48, 29, -39);
    ctx.strokeStyle = 'rgba(221,247,250,.62)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }

  function drawUnderwater(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const topGlow = ctx.createRadialGradient(width * .5, 0, 0, width * .5, height * .05, height * .75);
    topGlow.addColorStop(0, 'rgba(152,235,255,.085)');
    topGlow.addColorStop(.55, 'rgba(83,195,227,.025)');
    topGlow.addColorStop(1, 'rgba(71,190,224,0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    bubbles.forEach((bubble, index) => drawBubble(bubble, time, index));
    const progress = reducedMotion ? .5 : clamp(time / 10, 0, 1);
    const diverX = width * (.12 + progress * .18);
    const diverY = height * (.82 + Math.sin(time * .7) * .008 - scrollProgress * .018);
    const diverScale = clamp(width * .00068, .28, .74) * (.8 + progress * .12);
    ctx.save();
    ctx.globalAlpha = .58;
    drawDiver(diverX, diverY, diverScale, time);
    ctx.restore();
  }

  function drawBauhaus(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const x = width * (.2 + .6 * (.5 + .5 * Math.sin(time * .16)));
    const y = height * (.28 + .08 * Math.sin(time * .11 + 1.3));
    const glow = ctx.createRadialGradient(x, y, 0, x, y, width * .54);
    glow.addColorStop(0, 'rgba(255,246,208,.13)');
    glow.addColorStop(.48, 'rgba(238,211,162,.055)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  function drawTrafficCar(car, time) {
    const rawProgress = car.start + (car.reverse ? -1 : 1) * time * car.speed / Math.max(1, width);
    const progress = reducedMotion ? car.start : ((rawProgress % 1.12) + 1.12) % 1.12;
    const x = progress * width;
    if (x < -36 || x > width + 36) return;
    const y = height * car.lane + Math.sin(time * .3 + car.start * 5) * 1.1;
    const perspective = .42 + car.lane * .72;
    const size = car.size * perspective;
    const direction = car.reverse ? -1 : 1;
    const front = x + direction * size * 2.6;
    const rear = x - direction * size * 2.4;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = car.alpha;
    const reflection = ctx.createRadialGradient(x, y, 0, x, y, size * 5.4);
    reflection.addColorStop(0, car.reverse ? 'rgba(246,83,73,.14)' : 'rgba(235,244,255,.2)');
    reflection.addColorStop(1, 'rgba(235,244,255,0)');
    ctx.fillStyle = reflection;
    ctx.fillRect(x - size * 5, y - size * 4, size * 10, size * 8);
    ctx.beginPath();
    ctx.moveTo(rear, y); ctx.lineTo(x - direction * size * .6, y - .5 * perspective);
    ctx.lineTo(front, y - .35 * perspective);
    const streak = ctx.createLinearGradient(rear, y, front, y);
    streak.addColorStop(0, 'rgba(220,229,239,0)');
    streak.addColorStop(.6, car.reverse ? 'rgba(246,83,73,.15)' : 'rgba(229,238,248,.16)');
    streak.addColorStop(1, car.reverse ? 'rgba(255,109,99,.04)' : 'rgba(241,248,255,.04)');
    ctx.strokeStyle = streak;
    ctx.lineWidth = Math.max(.6, size * .55);
    ctx.stroke();
    for (const offset of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(front, y + offset * .7 * perspective, Math.max(.65, size * .4), 0, Math.PI * 2);
      ctx.fillStyle = car.reverse ? 'rgba(255,94,84,.74)' : 'rgba(243,249,255,.88)';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = size * 3.3;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawUrban(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const [x, y, radius, alpha] of [
      [.24, .29, .19, .055], [.78, .38, .22, .045], [.52, .82, .25, .035]
    ]) {
      const haze = ctx.createRadialGradient(width * x, height * y, 0, width * x, height * y, width * radius);
      haze.addColorStop(0, `rgba(218,225,233,${alpha})`);
      haze.addColorStop(1, 'rgba(218,225,233,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.restore();
    const cars = [
      {lane: .535, start: .02, speed: 46, reverse: false, alpha: .62, size: 2.2},
      {lane: .565, start: .78, speed: 37, reverse: true, alpha: .46, size: 1.8},
      {lane: .735, start: .46, speed: 62, reverse: false, alpha: .55, size: 2.5},
      {lane: .765, start: .91, speed: 43, reverse: true, alpha: .42, size: 1.7},
      {lane: .84, start: .27, speed: 31, reverse: false, alpha: .31, size: 1.5}
    ];
    cars.forEach(car => drawTrafficCar(car, time));
  }

  function frame(now) {
    frameId = 0;
    if (document.hidden || activeTheme === 'galaxy' || reducedMotion) return;
    if (now - lastFrame < 1000 / 30) {
      frameId = requestAnimationFrame(frame);
      return;
    }
    const delta = lastFrame ? Math.min(.05, (now - lastFrame) / 1000) : 1 / 30;
    lastFrame = now;
    elapsed += delta;
    drawScene(elapsed);
    frameId = requestAnimationFrame(frame);
  }

  function stop() {
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    lastFrame = 0;
  }

  function activate(theme) {
    activeTheme = theme || 'galaxy';
    elapsed = 0;
    stop();
    clear();
    if (activeTheme === 'galaxy' || document.hidden) return;
    createParticles();
    if (reducedMotion) {
      drawScene(0);
      return;
    }
    drawScene(0);
    frameId = requestAnimationFrame(frame);
  }

  const observer = new MutationObserver(() => {
    const theme = body.dataset.theme || 'galaxy';
    if (theme !== activeTheme) activate(theme);
  });
  observer.observe(body, {attributes: true, attributeFilter: ['data-theme']});
  let resizeFrame = 0;
  addEventListener('resize', () => {
    if (resizeFrame) return;
    resizeFrame = requestAnimationFrame(() => {resizeFrame=0;resize();});
  }, {passive:true});
  addEventListener('scroll', measurePageScroll, {passive: true});
  document.addEventListener('visibilitychange', () => {
    stop();
    if (document.hidden || activeTheme === 'galaxy') return;
    if (reducedMotion) drawScene(0);
    else frameId = requestAnimationFrame(frame);
  });
  measurePageScroll();
  resize();
  activate(body.dataset.theme || 'galaxy');
})();
