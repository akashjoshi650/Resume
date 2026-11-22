(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.add("js");

  /* Theme */
  const isDark = () =>
    root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  $("#themeBtn").addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    document.dispatchEvent(new CustomEvent("themechange"));
  });

  /* Print / PDF */
  $("#printBtn").addEventListener("click", () => {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
    window.print();
  });

  $("#year").textContent = new Date().getFullYear();

  /* Mobile menu */
  const burger = $("#burger");
  const links = $("#navLinks");
  const setMenu = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    links.classList.toggle("is-open", open);
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  $$("a", links).forEach((a) => a.addEventListener("click", () => setMenu(false)));

  /* Reveal on scroll (staggered within each parent) */
  const counts = new Map();
  $$(".reveal").forEach((el) => {
    const i = counts.get(el.parentElement) || 0;
    counts.set(el.parentElement, i + 1);
    el.style.setProperty("--d", `${Math.min(i, 6) * 0.06}s`);
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach((el) => io.observe(el));
  } else {
    $$(".reveal").forEach((el) => el.classList.add("is-in"));
  }

  /* Nav: border on scroll + active section */
  const nav = $("#nav");
  const navLinks = $$("a", links);
  const sections = navLinks.map((a) => $(a.getAttribute("href")));
  let ticking = false;
  const onScroll = () => {
    nav.classList.toggle("is-scrolled", scrollY > 8);
    let current = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.35) current = i; });
    navLinks.forEach((a, i) => a.classList.toggle("is-active", i === current));
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* Copy email */
  const copyBtn = $("#copyEmail");
  const toast = $("#toast");
  copyBtn.addEventListener("click", async () => {
    const email = copyBtn.dataset.email;
    try {
      await navigator.clipboard.writeText(email);
      toast.textContent = "Copied ✓";
      setTimeout(() => { toast.textContent = ""; }, 1800);
    } catch {
      location.href = `mailto:${email}`;
    }
  });
})();
