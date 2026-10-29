/* GPU-rendered displaced image surfaces, moving lights and procedural paper burns.
   Concept coded by Ish Singh, 2026. No external runtime dependencies. */
class IshCinematicRenderer {
  constructor(canvas, images) {
    this.canvas = canvas;
    const gl = this.gl = canvas.getContext('webgl', {alpha:true,premultipliedAlpha:false,antialias:false,depth:false,powerPreference:'high-performance'});
    if (!gl) throw new Error('WebGL unavailable');
    const noise = `
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+vec2(4.1,7.3);a*=.5;}return n;}
      float burnField(vec2 uv){return length((uv-vec2(.32,.44))*vec2(1.12,.88))*.67+fbm(uv*8.0)*.34+noise(uv*85.)*.025;}
    `;
    const vertex = `
      precision highp float;
      attribute vec2 aPosition;
      uniform sampler2D uTexture;
      uniform float uAspect,uImageAspect,uZoom,uContain,uBurn,uTime,uDepth;
      uniform vec2 uPan,uRotation;
      varying vec2 vUv,vScreen;
      varying float vLift;
      ${noise}
      void main(){
        vScreen=aPosition*.5+.5;
        vec2 cover=vec2(min(1.,uAspect/uImageAspect),min(1.,uImageAspect/uAspect));
        vec2 contain=vec2(max(1.,uAspect/uImageAspect),max(1.,uImageAspect/uAspect));
        vUv=(vScreen-.5)*mix(cover,contain,uContain)/uZoom+.5+uPan;
        float luminance=dot(texture2D(uTexture,clamp(vUv,0.,1.)).rgb,vec3(.2126,.7152,.0722));
        float field=burnField(vScreen);
        float edge=exp(-abs(field-(uBurn*1.24-.16))*32.)*step(.001,uBurn);
        vLift=edge;
        vec3 p=vec3(aPosition.x*uAspect,aPosition.y,0.);
        p.z=(luminance-.4)*uDepth+edge*.28+sin(aPosition.y*3.+uTime)*.018;
        p.x+=edge*.025*sin(aPosition.y*21.);
        float cx=cos(uRotation.x),sx=sin(uRotation.x),cy=cos(uRotation.y),sy=sin(uRotation.y);
        p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);
        p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);
        float perspective=3.1/(3.1-p.z);
        gl_Position=vec4(p.x/uAspect*perspective*1.09,p.y*perspective*1.09,0.,1.);
      }
    `;
    const fragment = `
      precision highp float;
      uniform sampler2D uTexture;
      uniform float uBurn,uOpacity,uTime,uAspect,uContain;
      uniform vec2 uLight;
      varying vec2 vUv,vScreen;
      varying float vLift;
      ${noise}
      void main(){
        float field=burnField(vScreen),threshold=uBurn*1.24-.16;
        float edge=field-threshold;
        float active=step(.001,uBurn);
        float paper=mix(1.,smoothstep(-.004,.005,edge),active);
        // White-hot core, orange emissive edge, then a wide carbonized margin.
        float ember=exp(-abs(edge)*110.)*active;
        float halo=exp(-abs(edge)*27.)*active;
        float charred=(1.-smoothstep(.008,.055,edge))*active;
        vec2 uv=clamp(vUv,0.,1.);
        vec3 color=texture2D(uTexture,uv).rgb;
        float inside=step(0.,vUv.x)*step(vUv.x,1.)*step(0.,vUv.y)*step(vUv.y,1.);
        color*=inside;
        float h=dot(color,vec3(.2126,.7152,.0722));
        float hx=dot(texture2D(uTexture,clamp(uv+vec2(.003,0.),0.,1.)).rgb,vec3(.2126,.7152,.0722));
        float hy=dot(texture2D(uTexture,clamp(uv+vec2(0.,.003),0.,1.)).rgb,vec3(.2126,.7152,.0722));
        vec3 normal=normalize(vec3((h-hx)*2.1,(h-hy)*2.1,1.));
        vec3 light=normalize(vec3(uLight-(vScreen-.5)*1.2,.7));
        float diffuse=max(0.,dot(normal,light));
        float spec=pow(max(dot(reflect(-light,normal),vec3(0.,0.,1.)),0.),30.);
        float beam=exp(-pow((vScreen.x*.8+vScreen.y*.35)-(sin(uTime*.95)*.6+.45),2.)*18.);
        color*=.68+diffuse*.36+beam*.22;
        color+=vec3(.82,.9,1.)*spec*.16*inside;
        color=mix(vec3(h),color,.83);
        color*=mix(1.,.09,charred);
        vec3 fire=vec3(1.,.24,.025)*halo*1.6+vec3(1.,.88,.52)*ember*2.1;
        color+=fire;
        // Tiny sparks in the wake of the burn, confined to the torn edge.
        float spark=step(.989,hash(floor(vScreen*vec2(620.,360.)+vec2(0.,uTime*20.))));
        float sparks=spark*exp(-abs(edge+.025)*38.)*active;
        color+=vec3(1.,.39,.06)*sparks*2.;
        float vignette=1.-.30*dot((vScreen-.5)*vec2(1.,.7),(vScreen-.5)*vec2(1.,.7));
        color*=vignette;
        color+=(hash(gl_FragCoord.xy+floor(uTime*24.))-.5)*.018;
        float alpha=max(paper,max(halo*.65,sparks)) * uOpacity;
        if(alpha<.003) discard;
        gl_FragColor=vec4(color,clamp(alpha,0.,1.));
      }
    `;
    const compile = (type, source) => {
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {const log=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(log);}
      return shader;
    };
    const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
    const program=this.program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
    gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    this.uniforms={};
    for(const name of ['uTexture','uAspect','uImageAspect','uZoom','uContain','uBurn','uTime','uDepth','uPan','uRotation','uLight','uOpacity']) this.uniforms[name]=gl.getUniformLocation(program,name);
    const vertices=[];const nx=64,ny=40;
    for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
      const l=x/nx*2-1,r=(x+1)/nx*2-1,b=y/ny*2-1,t=(y+1)/ny*2-1;
      vertices.push(l,b,r,b,l,t,l,t,r,b,r,t);
    }
    this.count=vertices.length/2;this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    const attr=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
    gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    this.textures={};
    for(const [name,image] of Object.entries(images)){
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
      this.textures[name]={texture,aspect:image.width/image.height};
    }
    canvas.addEventListener('webglcontextlost',this.onLost=e=>{e.preventDefault();window.IshIntro?.skip();});
  }
  resize(width,height){
    const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1700000/(width*height)));
    this.canvas.width=Math.round(width*ratio);this.canvas.height=Math.round(height*ratio);
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);this.aspect=width/height;
  }
  render(t,pointer){
    const gl=this.gl,u=this.uniforms;
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);
    const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
    const shots=[{name:'atoms',start:0,end:820,burn:550},{name:'pipes',start:550,end:1190,burn:930},{name:'roots',start:930,end:1590,burn:1310},{name:'earth',start:1310,end:2320,burn:1950}];
    const drawShot=(shot)=>{
      const local=Math.max(0,t-shot.start),p=smooth(local/(shot.end-shot.start));
      const isEarth=shot.name==='earth';
      const burn=smooth((t-shot.burn)/(shot.end-shot.burn));
      if(burn>=1)return;
      const texture=this.textures[shot.name];gl.bindTexture(gl.TEXTURE_2D,texture.texture);
      gl.uniform1i(u.uTexture,0);gl.uniform1f(u.uAspect,this.aspect);gl.uniform1f(u.uImageAspect,texture.aspect);
      gl.uniform1f(u.uContain,isEarth?1:0);gl.uniform1f(u.uTime,t/1000);gl.uniform1f(u.uBurn,burn);gl.uniform1f(u.uOpacity,1);
      gl.uniform1f(u.uDepth,isEarth?.025:.16);
      gl.uniform1f(u.uZoom,isEarth?1.5-p*1.25:1.13-p*.08);
      const direction=shot.name==='pipes'?-1:1;
      gl.uniform2f(u.uPan,isEarth?0:(p-.5)*.035*direction+pointer.x*.009,isEarth?.025*p:pointer.y*.007);
      gl.uniform2f(u.uRotation,isEarth?0:Math.sin(t*.0015)*.018+pointer.y*.025,isEarth?0:(p-.5)*.065*direction+pointer.x*.035);
      gl.uniform2f(u.uLight,Math.sin(t*.002)*.7+pointer.x*.3,Math.cos(t*.0017)*.5+pointer.y*.2);
      gl.drawArrays(gl.TRIANGLES,0,this.count);
    };
    // New sheet behind old sheet: burn-through reveals depth and the next image.
    for(let i=shots.length-1;i>=0;i--){const shot=shots[i];if(t>=shot.start&&t<shot.end)drawShot(shot);}
  }
  destroy(){
    const gl=this.gl;this.canvas.removeEventListener('webglcontextlost',this.onLost);
    for(const entry of Object.values(this.textures))gl.deleteTexture(entry.texture);
    gl.deleteBuffer(this.buffer);gl.deleteProgram(this.program);
  }
}

/* A self-contained cinematic overlay. No changes to the existing scene renderer. */
(() => {
  'use strict';
  const config = window.ISH_INTRO_CONFIG || {};
  const root = document.documentElement;
  if (!config.shouldPlay) return;
  const scriptURL = document.currentScript.src;
  const assetURL = name => new URL(`assets/${name}.webp`, scriptURL).href;
  const duration = Math.min(3000, Math.max(1000, Number(config.duration) || 3000));
  // Optional art-direction still: ?intro=play&intro-at=1800 (milliseconds).
  const query = new URLSearchParams(location.search);
  const stillValue = query.get('intro-at');
  const stillAt = query.get('intro') === 'play' && stillValue !== null && Number.isFinite(Number(stillValue)) ? Math.max(0, Math.min(2999, Number(stillValue))) : null;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let overlay, canvas, renderer, frame, finished = false, started = false;
  const pointer = {x:0,y:0}, targetPointer = {x:0,y:0};
  let width, height, startTime, pausedAt = 0;
  const previousFocus = document.activeElement;
  const inertState = new Map();
  let caption, prompt, answer, shade, track;
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const images = {};

  function cleanup(reason = 'complete') {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    renderer?.destroy();
    removeEventListener('pointermove', onPointer);
    clearTimeout(window.__ishIntroWatchdog);
    root.classList.remove('ish-intro-active', 'ish-intro-revealing');
    // Release the site's existing first-visit type-on when this intro is skipped.
    if (root.classList.contains('intro-playing')) {
      root.classList.remove('intro-playing');
      const hero = document.querySelector('.hero');
      if (hero) hero.inert = false;
    }
    for (const [element, inert] of inertState) element.inert = inert;
    overlay?.remove();
    removeEventListener('resize', resize);
    removeEventListener('keydown', onKey, true);
    document.removeEventListener('visibilitychange', visibility);
    motion.removeEventListener('change', onMotion);
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({preventScroll:true});
    window.dispatchEvent(new CustomEvent('ish:intro-end', {detail:{reason}}));
  }
  window.IshIntro = {skip: () => cleanup('skip'), get active() { return !finished; }};
  function resize() {
    width = innerWidth; height = innerHeight;
    renderer?.resize(width,height);
    if (started && stillAt !== null) draw(performance.now());
  }
  function onPointer(event) {
    targetPointer.x = (event.clientX / innerWidth - .5) * 2;
    targetPointer.y = (.5 - event.clientY / innerHeight) * 2;
  }
  function onKey(event) {
    if (event.key === 'Escape') { event.preventDefault(); cleanup('skip'); }
    if (event.key === 'Tab') { event.preventDefault(); overlay?.querySelector('button').focus(); }
  }
  function onMotion() { if (motion.matches) cleanup('reduced-motion'); }
  function visibility() {
    if (!started || finished) return;
    if (document.hidden) { pausedAt = performance.now(); cancelAnimationFrame(frame); }
    else if (pausedAt) {
      startTime += performance.now() - pausedAt; pausedAt = 0;
      frame = requestAnimationFrame(draw);
    }
  }
  function animateTitle(element, t, entry, exit, loud) {
    const progress = clamp((t-entry)/210);
    const fade = 1-ease((t-exit)/140);
    element.style.opacity = ease((t-entry)/65)*fade;
    const overshoot = 1+2.7*Math.pow(progress-1,3)+1.7*Math.pow(progress-1,2);
    element.style.transform = `perspective(1000px) translate3d(${-pointer.x*8}px,${pointer.y*5}px,0) scale(${.86+.14*overshoot}) rotateZ(${loud?(1-progress)*-3:0}deg)`;
    [...element.children].forEach((line,index)=>{
      const p=clamp((t-entry-index*65)/220);
      line.style.transform=`translate3d(0,${(1-p)*65}%,${(1-p)*-100}px) rotateX(${(1-p)*-65}deg)`;
      line.style.opacity=ease(p*2);
      line.style.filter=p<1?`blur(${(1-p)*5}px)`:'none';
    });
    element.style.setProperty('--title-light', `${20+t*.08}%`);
  }
  function draw(now) {
    if (finished) return;
    const t = stillAt === null ? (now-startTime)*3000/duration : stillAt;
    try {
      pointer.x+=(targetPointer.x-pointer.x)*.09;
      pointer.y+=(targetPointer.y-pointer.y)*.09;
      renderer.render(t,pointer);
      animateTitle(prompt,t,0,760,true);
      animateTitle(answer,t,1950,2600,false);
      shade.style.opacity=1-ease((t-1950)/400);
      caption.style.opacity=1-ease((t-2450)/150);
      track.style.transform=`scaleX(${clamp(t/3000)})`;
      overlay.style.opacity=1-ease((t-2680)/320);
      if(t>=2640) root.classList.add('ish-intro-revealing');
      if(t>=3000) cleanup();
      else if(stillAt===null) frame=requestAnimationFrame(draw);
    } catch { cleanup('render-error'); }
  }
  async function preload(name) {
    const image = new Image(); image.decoding = 'async'; image.src = assetURL(name);
    await image.decode(); images[name] = image;
  }
  async function init() {
    try {
      overlay = document.createElement('div');
      overlay.id = 'ish-cinematic-intro';
      overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', 'Portfolio introduction. Gimme problems. I’ll design solutions.');
      overlay.innerHTML = '<canvas class="ish-intro-canvas" aria-hidden="true"></canvas><div class="ish-intro-shade" aria-hidden="true"></div><p class="ish-intro-title" aria-hidden="true"><span>Gimme</span><span>problems.</span></p><p class="ish-intro-title ish-intro-title--answer" aria-hidden="true"><span>I’ll design</span><strong>solutions.</strong></p><span class="ish-intro-caption" aria-hidden="true">Bring the impossible.</span><button class="ish-intro-skip" type="button" aria-label="Skip introduction">Skip ↗</button><div class="ish-intro-track" aria-hidden="true"></div>';
      document.body.append(overlay);
      canvas = overlay.querySelector('canvas');
      [prompt,answer] = overlay.querySelectorAll('.ish-intro-title');
      caption = overlay.querySelector('.ish-intro-caption'); shade = overlay.querySelector('.ish-intro-shade'); track = overlay.querySelector('.ish-intro-track');
      prompt.style.opacity = 0;
      for (const element of document.body.children) {
        if (element === overlay || ['SCRIPT','STYLE','LINK'].includes(element.tagName)) continue;
        inertState.set(element, element.inert); element.inert = true;
      }
      overlay.querySelector('button').addEventListener('click', () => cleanup('skip'));
      addEventListener('keydown', onKey, true); addEventListener('resize', resize);
      addEventListener('pointermove',onPointer,{passive:true});
      document.addEventListener('visibilitychange', visibility);
      motion.addEventListener('change', onMotion);
      resize();
      overlay.style.background = '#000';
      let timer;
      try {
        await Promise.race([
          Promise.all(['atoms','pipes','roots','earth'].map(preload)),
          new Promise((_,reject) => {timer = setTimeout(() => reject(new Error('asset-timeout')), config.preloadTimeout || 2200);})
        ]);
      } finally { clearTimeout(timer); }
      if (finished) return;
      renderer = new IshCinematicRenderer(canvas,images); renderer.resize(width,height);
      overlay.style.background = 'transparent';
      try {sessionStorage.setItem('ish-cinematic-intro-v1', 'seen');} catch {}
      started = true; startTime = performance.now();
      if (stillAt !== null) clearTimeout(window.__ishIntroWatchdog);
      window.dispatchEvent(new CustomEvent('ish:intro-start'));
      frame = requestAnimationFrame(draw);
    } catch { cleanup('asset-error'); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
