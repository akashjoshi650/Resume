// Hero visual: a 3D feed-forward neural network running a live "forward pass".
// Signals leave the input layer, travel along weights, and activate neurons layer by layer.

const holder = document.querySelector(".hero__visual");
const canvas = document.getElementById("net");

let THREE;
try {
  THREE = await import("three");
} catch {
  holder.classList.add("no-webgl");
}

if (THREE) start();

function start() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    holder.classList.add("no-webgl");
    return;
  }

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  const net = new THREE.Group();
  scene.add(net);

  /* ---------- Build network ---------- */
  const LAYERS = [4, 6, 6, 6, 3];
  const X_SPAN = 9.6;
  const Y_GAP = 1.15;
  const layers = [];
  const nodes = [];

  const glowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.35, "rgba(255,255,255,0.35)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();

  const nodeGeo = new THREE.SphereGeometry(0.2, 24, 16);
  const kindOf = (l) => (l === 0 ? "in" : l === LAYERS.length - 1 ? "out" : "hid");

  LAYERS.forEach((count, l) => {
    const x = -X_SPAN / 2 + (X_SPAN * l) / (LAYERS.length - 1);
    const layer = [];
    for (let i = 0; i < count; i++) {
      const y = (i - (count - 1) / 2) * Y_GAP;
      const z = Math.sin(i * 1.7 + l * 2.3) * 0.9;
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.set(x, y, z);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.2 }));
      halo.scale.setScalar(1.1);
      mesh.add(halo);
      net.add(mesh);
      const node = { mesh, halo, kind: kindOf(l), layer: l, act: 0 };
      layer.push(node);
      nodes.push(node);
    }
    layers.push(layer);
  });

  // Edges: fully connected between consecutive layers
  const edgePos = [];
  for (let l = 0; l < layers.length - 1; l++) {
    for (const a of layers[l]) for (const b of layers[l + 1]) {
      edgePos.push(...a.mesh.position.toArray(), ...b.mesh.position.toArray());
    }
  }
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePos, 3));
  const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false });
  net.add(new THREE.LineSegments(edgeGeo, edgeMat));

  /* ---------- Pulses (signals) ---------- */
  const pulseGeo = new THREE.SphereGeometry(0.07, 12, 8);
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pulseHaloMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: 0.8 });
  const pool = [];
  const active = [];
  const MAX_PULSES = 140;

  const getPulse = () => {
    let p = pool.pop();
    if (!p) {
      const mesh = new THREE.Mesh(pulseGeo, pulseMat);
      const halo = new THREE.Sprite(pulseHaloMat);
      halo.scale.setScalar(0.5);
      mesh.add(halo);
      p = { mesh };
    }
    net.add(p.mesh);
    return p;
  };

  const send = (from, to) => {
    if (active.length >= MAX_PULSES) return;
    const p = getPulse();
    p.from = from; p.to = to; p.t = 0;
    p.speed = 1.3 + Math.random() * 0.6;
    p.mesh.position.copy(from.mesh.position);
    active.push(p);
  };

  const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

  const fire = (node) => {
    node.act = 1;
    const next = layers[node.layer + 1];
    if (!next) return;
    pick(next, 2 + Math.floor(Math.random() * 2)).forEach((t) => send(node, t));
  };

  const wave = () => pick(layers[0], 2 + Math.floor(Math.random() * 3)).forEach(fire);

  /* ---------- Theme colours ---------- */
  let haloK = 1;
  const applyTheme = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => new THREE.Color(cs.getPropertyValue(n).trim() || "#888");
    const col = { in: v("--accent-2"), hid: v("--accent"), out: v("--accent-3") };
    const dark = (() => {
      const bg = new THREE.Color(cs.getPropertyValue("--bg").trim() || "#fff");
      return bg.r + bg.g + bg.b < 1.2;
    })();
    nodes.forEach((n) => {
      n.mesh.material.color.copy(col[n.kind]);
      n.halo.material.color.copy(col[n.kind]);
    });
    pulseMat.color.copy(dark ? new THREE.Color("#ffffff") : col.hid);
    pulseHaloMat.color.copy(col.hid);
    edgeMat.color.copy(v("--muted"));
    edgeMat.opacity = dark ? 0.16 : 0.22;
    haloK = dark ? 0.55 : 0.6;
    const blend = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
    [pulseHaloMat, ...nodes.map((n) => n.halo.material)].forEach((m) => { m.blending = blend; m.needsUpdate = true; });
  };
  applyTheme();
  document.addEventListener("themechange", applyTheme);
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);

  /* ---------- Sizing ---------- */
  const resize = () => {
    const w = holder.clientWidth, h = holder.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = X_SPAN / 2 + 1.0, halfH = (6 * Y_GAP) / 2 + 0.9;
    camera.position.set(0, 0, Math.max(halfH / tan, halfW / (tan * camera.aspect)));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    if (!running) renderer.render(scene, camera);
  };

  /* ---------- Interaction ---------- */
  const mouse = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  /* ---------- Loop ---------- */
  const clock = new THREE.Clock();
  let running = false, raf = 0, sinceWave = 0, elapsed = 0;

  const update = (dt) => {
    elapsed += dt;
    sinceWave += dt;
    if (sinceWave > 1.1) { sinceWave = 0; wave(); }

    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      p.t += dt * p.speed;
      if (p.t >= 1) {
        net.remove(p.mesh);
        pool.push(p);
        active.splice(i, 1);
        if (p.to.act < 0.35) fire(p.to); else p.to.act = 1;
        continue;
      }
      p.mesh.position.lerpVectors(p.from.mesh.position, p.to.mesh.position, p.t);
    }

    for (const n of nodes) {
      n.act = Math.max(0, n.act - dt * 1.4);
      n.mesh.scale.setScalar(1 + n.act * 0.45);
      n.halo.material.opacity = (0.18 + n.act * 0.7) * haloK;
      n.halo.scale.setScalar(1.1 + n.act * 1.1);
    }

    const targetY = Math.sin(elapsed * 0.25) * 0.45 + mouse.x * 0.35;
    const targetX = -mouse.y * 0.2;
    net.rotation.y += (targetY - net.rotation.y) * 0.05;
    net.rotation.x += (targetX - net.rotation.x) * 0.05;
  };

  const frame = () => {
    update(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  };

  const play = () => {
    if (running || reduceMotion) return;
    running = true;
    clock.getDelta();
    raf = requestAnimationFrame(frame);
  };
  const pause = () => { running = false; cancelAnimationFrame(raf); };

  new ResizeObserver(resize).observe(holder);
  resize();

  if (reduceMotion) {
    // Static frame with a few neurons lit
    net.rotation.y = 0.35;
    nodes.forEach((n, i) => { n.act = i % 3 === 0 ? 0.8 : 0; });
    update(0);
    renderer.render(scene, camera);
    return;
  }

  let onScreen = true;
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    onScreen && !document.hidden ? play() : pause();
  }).observe(holder);
  document.addEventListener("visibilitychange", () => {
    document.hidden || !onScreen ? pause() : play();
  });

  wave();
  play();
}
