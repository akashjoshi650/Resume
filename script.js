(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- Theme ---------- */
  const storedTheme = (() => { try { return localStorage.getItem("theme"); } catch { return null; } })();
  if (storedTheme) root.dataset.theme = storedTheme;
  else if (matchMedia("(prefers-color-scheme: light)").matches) root.dataset.theme = "light";

  $("#themeBtn").addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    const apply = () => { root.dataset.theme = next; };
    if (document.startViewTransition && !reduceMotion) document.startViewTransition(apply);
    else apply();
    try { localStorage.setItem("theme", next); } catch {}
  });

  $("#printBtn").addEventListener("click", () => {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
    $$(".ring").forEach((el) => el.classList.add("is-on"));
    window.print();
  });

  $("#year").textContent = new Date().getFullYear();

  /* ---------- Split hero name into letters ---------- */
  let charIndex = 0;
  $$("[data-split]").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    [...text].forEach((ch) => {
      const wrap = document.createElement("span");
      wrap.className = "char-wrap";
      const c = document.createElement("span");
      c.className = "char";
      c.textContent = ch;
      c.style.setProperty("--i", charIndex++);
      wrap.appendChild(c);
      el.appendChild(wrap);
    });
  });

  /* ---------- DNA bars stagger ---------- */
  $$(".project__art--dna i").forEach((el, i) => el.style.setProperty("--d", (i * 0.12).toFixed(2)));

  /* ---------- Boot loader ---------- */
  const bootLines = [
    "<b>$</b> init akash.joshi --profile",
    "loading modules: react angular node python",
    "mounting neural_net.weights ... ok",
    "connecting azure://oncehub ... ok",
    "<b>✓</b> ready",
  ];
  const loader = $("#loader");
  const linesEl = $("#bootLines");
  const bar = $("#bootBar");
  document.body.classList.add("is-loading");

  const finishBoot = () => {
    loader.classList.add("is-done");
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
    $$(".hero .reveal").forEach((el, i) => {
      el.style.setProperty("--delay", `${i * 0.1}s`);
      el.classList.add("is-in");
    });
    startTyping();
  };

  if (reduceMotion || sessionStorageGet("booted")) {
    finishBoot();
  } else {
    bootLines.forEach((line, i) => {
      setTimeout(() => {
        const d = document.createElement("div");
        d.innerHTML = line;
        linesEl.appendChild(d);
        bar.style.width = `${((i + 1) / bootLines.length) * 100}%`;
      }, 180 + i * 230);
    });
    setTimeout(() => { sessionStorageSet("booted", "1"); finishBoot(); }, 180 + bootLines.length * 230 + 250);
  }

  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch {} }

  /* ---------- Typewriter ---------- */
  function startTyping() {
    const el = $("#typed");
    const words = [
      "full-stack products.",
      "Angular & React UIs.",
      "Node.js APIs.",
      "models that see.",
      "on Azure & Kubernetes.",
    ];
    if (reduceMotion) { el.textContent = words[0]; return; }
    let w = 0, c = 0, deleting = false;
    const tick = () => {
      const word = words[w];
      c += deleting ? -1 : 1;
      el.textContent = word.slice(0, c);
      let delay = deleting ? 35 : 70;
      if (!deleting && c === word.length) { deleting = true; delay = 1600; }
      else if (deleting && c === 0) { deleting = false; w = (w + 1) % words.length; delay = 300; }
      setTimeout(tick, delay);
    };
    tick();
  }

  /* ---------- Reveal on scroll ---------- */
  const groups = new Map();
  $$(".reveal").forEach((el) => {
    if (el.closest(".hero")) return;
    const parent = el.parentElement;
    const idx = groups.get(parent) || 0;
    groups.set(parent, idx + 1);
    el.style.setProperty("--delay", `${Math.min(idx, 8) * 0.07}s`);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      $$(".ring", e.target).forEach((r) => r.classList.add("is-on"));
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  $$(".reveal").forEach((el) => { if (!el.closest(".hero")) io.observe(el); });

  /* ---------- Counters ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseFloat(el.dataset.count);
      const dec = parseInt(el.dataset.decimals || "0", 10);
      const suffix = el.dataset.suffix || "";
      const dur = reduceMotion ? 0 : 1600;
      const t0 = performance.now();
      const step = (t) => {
        const p = dur ? Math.min((t - t0) / dur, 1) : 1;
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = (target * eased).toFixed(dec) + (p === 1 ? suffix : "");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------- Scroll: progress, nav hide, active link, timeline ---------- */
  const progress = $("#progress");
  const nav = $("#nav");
  const fill = $("#timelineFill");
  const timeline = $("#timeline");
  const links = $$("[data-link]");
  const sections = links.map((a) => $(a.getAttribute("href")));
  let lastY = scrollY, ticking = false;

  const onScroll = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

    if (!$("#navLinks.is-open")) nav.classList.toggle("is-hidden", y > lastY && y > 400);
    lastY = y;

    const r = timeline.getBoundingClientRect();
    const p = Math.min(Math.max((innerHeight * 0.65 - r.top) / r.height, 0), 1);
    fill.style.transform = `scaleY(${p})`;

    let current = null;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) current = i; });
    links.forEach((a, i) => a.classList.toggle("is-active", i === current));
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger");
  const navLinks = $(".nav__links");
  navLinks.id = "navLinks";
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", String(open));
    navLinks.classList.toggle("is-open", open);
  });
  links.forEach((a) => a.addEventListener("click", () => {
    burger.setAttribute("aria-expanded", "false");
    navLinks.classList.remove("is-open");
  }));

  /* ---------- Copy email ---------- */
  const copyBtn = $("#copyEmail");
  copyBtn.addEventListener("click", async () => {
    const email = copyBtn.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
      const t = $("#toast");
      t.classList.add("is-on");
      setTimeout(() => t.classList.remove("is-on"), 1800);
    } catch {
      location.href = `mailto:${email}`;
    }
  });

  /* ---------- Spotlight cards ---------- */
  $$("[data-spot]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  if (!finePointer || reduceMotion) { initNeural(); return; }

  /* ---------- Tilt ---------- */
  $$("[data-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = "transform 0.1s linear, border-color 0.4s";
      el.style.transform = `perspective(900px) rotateX(${(-y * 7).toFixed(2)}deg) rotateY(${(x * 9).toFixed(2)}deg) translateY(-4px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transition = "";
      el.style.transform = "";
    });
  });

  /* ---------- Magnetic ---------- */
  $$("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });

  /* ---------- Cursor + glow ---------- */
  const cursor = $("#cursor"), ring = $("#cursorRing"), glow = $("#glow");
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, gx = mx, gy = my;
  document.body.classList.add("has-cursor");
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  document.addEventListener("pointerover", (e) => {
    ring.classList.toggle("is-hover", !!e.target.closest("a, button, .chips span, [data-tilt]"));
  });
  const loop = () => {
    rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
    gx += (mx - gx) * 0.06; gy += (my - gy) * 0.06;
    cursor.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    glow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  };
  loop();

  initNeural();

  /* ---------- Neural network background ---------- */
  function initNeural() {
    const canvas = $("#neural");
    const ctx = canvas.getContext("2d");
    let w, h, dpr, nodes = [], pulses = [];
    const mouse = { x: -9999, y: -9999 };
    const LINK = 150;

    const colors = () => {
      const cs = getComputedStyle(root);
      return { a: cs.getPropertyValue("--accent").trim(), b: cs.getPropertyValue("--accent-2").trim(), light: root.dataset.theme === "light" };
    };
    let col = colors();
    new MutationObserver(() => { col = colors(); }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = canvas.width = innerWidth * dpr;
      h = canvas.height = innerHeight * dpr;
      const count = Math.round(Math.min(90, (innerWidth * innerHeight) / 16000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr,
        r: (Math.random() * 1.4 + 0.6) * dpr,
      }));
    };
    resize();
    addEventListener("resize", resize);
    addEventListener("pointermove", (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; }, { passive: true });
    addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

    const hexA = (hex, a) => {
      const n = hex.replace("#", "");
      const v = parseInt(n.length === 3 ? n.replace(/./g, "$&$&") : n, 16);
      return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${a})`;
    };

    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const link = LINK * dpr;
      const lineBase = col.light ? 0.16 : 0.12;

      for (const n of nodes) {
        if (!reduceMotion) {
          n.x += n.vx; n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          const dx = mouse.x - n.x, dy = mouse.y - n.y, d = Math.hypot(dx, dy);
          if (d < 180 * dpr) { n.x -= dx * 0.004; n.y -= dy * 0.004; }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) {
            ctx.strokeStyle = hexA(col.b, (1 - d / link) * lineBase * 2);
            ctx.lineWidth = dpr * 0.7;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            if (!reduceMotion && Math.random() < 0.0007 && pulses.length < 14) pulses.push({ a, b, t: 0 });
          }
        }
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (md < 200 * dpr) {
          ctx.strokeStyle = hexA(col.a, (1 - md / (200 * dpr)) * 0.45);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = hexA(md < 200 * dpr ? col.a : col.b, col.light ? 0.5 : 0.6);
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }

      pulses = pulses.filter((p) => {
        p.t += 0.02;
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = hexA(col.a, 0.9 * (1 - Math.abs(p.t - 0.5) * 1.4));
        ctx.beginPath(); ctx.arc(x, y, 2 * dpr, 0, Math.PI * 2); ctx.fill();
        return p.t < 1;
      });

      frame++;
      if (!reduceMotion) requestAnimationFrame(draw);
    };
    draw();
  }
})();
