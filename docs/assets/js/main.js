/* ═══════════════════════════════════════════════════════════
   Q-SEVEN — interaction engine
   GSAP + ScrollTrigger + Lenis. Three.js hero lives in hero3d.js
   ═══════════════════════════════════════════════════════════ */
(() => {
  "use strict";
  gsap.registerPlugin(ScrollTrigger);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ───────── smooth scroll ───────── */
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1.0 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollTo = target => {
    if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.4 });
    else document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener("click", e => {
    if (a.closest(".mmenu") || a.classList.contains("skip-link")) return; // handled separately
    const id = a.getAttribute("href");
    if (id.length > 1 && $(id)) { e.preventDefault(); scrollTo(id); }
  }));

  /* ───────── split helpers ───────── */
  const splitChars = el => {
    const text = el.textContent;
    el.textContent = "";
    [...text].forEach(ch => {
      const s = document.createElement("span");
      s.className = "ch";
      s.innerHTML = ch === " " ? "&nbsp;" : ch;
      el.appendChild(s);
    });
    return $$(".ch", el);
  };
  const splitWords = el => {
    const frag = document.createDocumentFragment();
    [...el.childNodes].forEach(node => {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          const w = document.createElement("span"); w.className = "w";
          const i = document.createElement("i"); i.textContent = part;
          w.appendChild(i); frag.appendChild(w);
        });
      } else frag.appendChild(node.cloneNode(true));
    });
    el.innerHTML = ""; el.appendChild(frag);
    return $$(".w > i", el);
  };

  /* ───────── custom cursor ───────── */
  const cursor = $("#cursor");
  if (cursor && matchMedia("(pointer:fine)").matches) {
    const xTo = gsap.quickTo(cursor, "x", { duration: 0.16, ease: "power3" });
    const yTo = gsap.quickTo(cursor, "y", { duration: 0.16, ease: "power3" });
    addEventListener("mousemove", e => { xTo(e.clientX); yTo(e.clientY); });
    const label = $(".cursor__label", cursor);
    document.addEventListener("mouseover", e => {
      const t = e.target.closest("[data-cursor]");
      cursor.className = "cursor" + (t ? " " + t.dataset.cursor.split(" ").join(" ") : "");
      label.textContent = t ? ({ "-view": "VIEW", "-drag": "DRAG" }[t.dataset.cursor] || "") : "";
    });
  } else if (cursor) cursor.style.display = "none";

  /* ───────── scroll progress + nav ───────── */
  gsap.to("#progress i", {
    scaleX: 1, ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.3 }
  });
  ScrollTrigger.create({
    start: 60, end: "max",
    onToggle: st => $("#nav").classList.toggle("is-scrolled", st.isActive)
  });

  /* ───────── preloader → hero intro ───────── */
  const pre = $("#preloader");
  const heroChars = $$("[data-split]").map(el => splitChars(el));
  const intro = () => {
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.to(pre, { autoAlpha: 0, duration: 0.7, ease: "power2.inOut" })
      .add(() => pre.remove())
      .fromTo(".hero__eyebrow span", { y: "120%" }, { y: 0, duration: 0.9 }, "-=0.35");
    heroChars.forEach((chars, i) => {
      tl.to(chars, { y: 0, duration: 1.1, stagger: 0.028, ease: "expo.out" }, 0.15 + i * 0.12);
    });
    // serif line animates as one block: per-char transforms break background-clip:text in Chrome
    tl.fromTo(".hero__word--serif", { yPercent: 115 },
      { yPercent: 0, duration: 1.2, ease: "expo.out", clearProps: "transform" }, 0.45);
    tl.fromTo(".hero__side, .hero__foot", { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, "-=0.7");
    return tl;
  };
  if (reduced) {
    pre.remove();
    heroChars.flat().forEach(c => c.style.transform = "none");
    gsap.set(".hero__eyebrow span", { y: 0 });
  } else {
    gsap.set(".hero__word--serif", { yPercent: 115 });
    const count = { v: 0 };
    const tl = gsap.timeline({ onComplete: intro });
    tl.to(".preloader__logo span", { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: "expo.out" })
      .to(count, {
        v: 100, duration: 1.6, ease: "power2.inOut",
        onUpdate: () => $("#preCount").textContent = String(Math.round(count.v)).padStart(2, "0")
      }, 0.2)
      .to(".preloader__line i", { scaleX: 1, duration: 1.6, ease: "power2.inOut" }, 0.2)
      .to(".preloader__logo span", { y: "-120%", opacity: 0, duration: 0.6, stagger: 0.04, ease: "expo.in" }, "+=0.15");
    gsap.set(".hero__side, .hero__foot", { autoAlpha: 0 });
  }

  /* ───────── hero parallax on scroll ───────── */
  gsap.to(".hero__title", {
    yPercent: 28, autoAlpha: 0.15, ease: "none",
    scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true }
  });

  /* ───────── marquee (scroll-reactive) ───────── */
  const track = $("#marqueeTrack");
  if (track && !reduced) {
    let pos = 0, speed = 0.6, boost = 0;
    ScrollTrigger.create({
      onUpdate: self => { boost = gsap.utils.clamp(-14, 14, self.getVelocity() / 90); }
    });
    gsap.ticker.add(() => {
      pos -= (speed + Math.abs(boost));
      boost *= 0.92;
      const half = track.scrollWidth / 2;
      if (-pos >= half) pos += half;
      track.style.transform = `translate3d(${pos}px,0,0)`;
    });
  }

  /* ───────── section titles ───────── */
  $$("[data-split-words]").forEach(el => {
    const words = splitWords(el);
    gsap.to(words, {
      y: 0, duration: 1.05, stagger: 0.05, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 86%" }
    });
  });
  // .w > i start translated via CSS only inside .sec-title; ensure others
  gsap.set(".sec-title .w > i", { y: "110%" });
  ScrollTrigger.refresh();

  /* ───────── manifesto word-scrub + counters ───────── */
  const mt = $("#manifestoText");
  if (mt) {
    const words = mt.textContent.split(/\s+/).filter(Boolean);
    mt.innerHTML = words.map(w => `<span class="wd">${w}</span>`).join(" ");
    gsap.to($$(".wd", mt), {
      opacity: 1, stagger: 0.06, ease: "none",
      scrollTrigger: { trigger: mt, start: "top 78%", end: "bottom 46%", scrub: 0.4 }
    });
  }
  $$(".stat b").forEach(b => {
    const target = +b.dataset.count;
    ScrollTrigger.create({
      trigger: b, start: "top 88%", once: true,
      onEnter: () => gsap.fromTo(b, { textContent: 0 }, {
        textContent: target, duration: 1.6, ease: "power2.out", snap: { textContent: 1 }
      })
    });
  });

  /* ───────── collections horizontal scroll ───────── */
  const cTrack = $("#collectionsTrack");
  const cPin = $("#collectionsPin");
  if (cTrack) {
    const getDist = () => cTrack.scrollWidth - innerWidth + 2 * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pad") || 40);
    const horiz = gsap.to(cTrack, {
      x: () => -(cTrack.scrollWidth - innerWidth + 40),
      ease: "none",
      scrollTrigger: {
        trigger: "#collections", pin: cPin, scrub: 0.6,
        start: "top top",
        end: () => "+=" + (cTrack.scrollWidth - innerWidth + 400),
        invalidateOnRefresh: true,
        onUpdate: self => {
          const idx = Math.min(6, Math.max(1, Math.round(self.progress * 5) + 1));
          $("#collCounter").textContent = `0${idx} / 06 — DRAG OR SCROLL`;
        }
      }
    });
    void getDist; void horiz;
  }

  /* ───────── finishes wardrobe ───────── */
  const FIN = window.QSEVEN_FINISHES;
  const chipsWrap = $("#finishChips");
  const orb = $("#finishOrb");
  const finName = $("#finishName");
  const orbStops = {
    // approximate light/dark stops per finish for the blurred orb
    fallback: ["#f0d488", "#8a6420"]
  };
  const stopsFromGradient = g => {
    const cols = g.match(/#[0-9a-fA-F]{3,6}/g) || orbStops.fallback;
    return [cols[1] || cols[0], cols[0]];
  };
  Object.entries(FIN).forEach(([name, g], i) => {
    const b = document.createElement("button");
    b.className = "fchip" + (i === 0 ? " is-active" : "");
    b.style.setProperty("--g", g);
    b.setAttribute("data-cursor", "-sm");
    b.innerHTML = `<i></i>${name}`;
    b.addEventListener("mouseenter", () => setFinish(name, g, b));
    b.addEventListener("focus", () => setFinish(name, g, b));
    b.addEventListener("click", () => setFinish(name, g, b));
    chipsWrap.appendChild(b);
  });
  function setFinish(name, g, btn) {
    $$(".fchip", chipsWrap).forEach(c => c.classList.remove("is-active"));
    btn.classList.add("is-active");
    gsap.fromTo(finName, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" });
    finName.innerHTML = name.replace(/ /g, "&nbsp;");
    finName.style.setProperty("--big-g", g);
    finName.style.background = g;
    finName.style.webkitBackgroundClip = "text";
    finName.style.backgroundClip = "text";
    const [a, b] = stopsFromGradient(g);
    orb.style.setProperty("--orb-a", a);
    orb.style.setProperty("--orb-b", b);
  }

  /* ───────── archive: filters + grid ───────── */
  const PRODUCTS = window.QSEVEN_PRODUCTS;
  const CATS = window.QSEVEN_CATEGORIES;
  const grid = $("#grid");
  const filters = $("#filters");
  let current = "all";
  let visible = [];

  const chipEl = (id, label, count, active) => {
    const b = document.createElement("button");
    b.className = "chip" + (active ? " is-active" : "");
    b.dataset.filter = id;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", String(!!active));
    b.setAttribute("data-cursor", "-sm");
    b.innerHTML = `${label} <sup>${count}</sup>`;
    b.addEventListener("click", () => applyFilter(id));
    return b;
  };
  filters.appendChild(chipEl("all", "All", PRODUCTS.length, true));
  CATS.forEach(c => {
    const n = PRODUCTS.filter(p => p.cat === c.id).length;
    filters.appendChild(chipEl(c.id, c.label, n, false));
  });

  const cardEl = (p, idx) => {
    const el = document.createElement("article");
    el.className = "card";
    el.setAttribute("data-cursor", "-view");
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", `${p.model} — ${p.series}`);
    const dots = p.finishes.slice(0, 3).map(f =>
      `<i style="--g:${FIN[f] || FIN.SS}" title="${f}"></i>`).join("");
    const more = p.finishes.length > 3 ? `<em>+${p.finishes.length - 3}</em>` : "";
    el.innerHTML = `
      <figure class="card__fig"><img src="assets/img/products/${p.img}.webp" alt="${p.model} ${p.type}" loading="lazy" decoding="async"></figure>
      <div class="card__meta">
        <div><div class="card__model">${p.model}</div><div class="card__series">${p.series}</div></div>
        <div class="card__dots">${dots}${more}</div>
      </div>`;
    const open = () => openModal(idx);
    el.addEventListener("click", open);
    el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    return el;
  };

  function renderGrid(filter) {
    grid.innerHTML = "";
    visible = PRODUCTS.map((p, i) => ({ p, i })).filter(({ p }) => filter === "all" || p.cat === filter);
    visible.forEach(({ p, i }) => grid.appendChild(cardEl(p, i)));
    requestAnimationFrame(() => {
      $$(".card", grid).forEach((c, k) => {
        setTimeout(() => c.classList.add("is-in"), Math.min(k, 14) * 55);
      });
      ScrollTrigger.refresh();
    });
  }
  function applyFilter(id) {
    if (id === current) return;
    current = id;
    $$(".chip", filters).forEach(c => {
      const on = c.dataset.filter === id;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-selected", String(on));
    });
    renderGrid(id);
  }
  renderGrid("all");

  // collections → filtered archive, through the brass wipe
  $$("[data-goto]").forEach(panel => {
    panel.addEventListener("click", () => wipeTo(() => {
      applyFilter(panel.dataset.goto);
      const y = $("#archive").getBoundingClientRect().top + (lenis ? lenis.scroll : scrollY) - 70;
      if (lenis) lenis.scrollTo(y, { immediate: true });
      else window.scrollTo(0, y);
      ScrollTrigger.update();
    }));
  });

  /* ───────── modal ───────── */
  const modal = $("#modal");
  const mImg = $("#modalImg");
  let modalIdx = -1, lastFocus = null;

  function openModal(idx) {
    const p = PRODUCTS[idx];
    if (!p) return;
    modalIdx = idx;
    lastFocus = document.activeElement;
    mImg.src = `assets/img/products/${p.img}.webp`;
    mImg.alt = `${p.model} — ${p.type}`;
    $("#modalSeries").textContent = `${p.series} — ${CATS.find(c => c.id === p.cat)?.label || ""}`;
    $("#modalModel").textContent = p.model;
    $("#modalDesc").textContent = p.desc;
    $("#modalMaterial").textContent = p.material;
    $("#modalSize").textContent = p.size;
    $("#modalType").textContent = p.type;
    $("#modalFinishes").innerHTML = p.finishes.map(f =>
      `<span class="swatch"><i style="--g:${FIN[f] || FIN.SS}"></i>${f}</span>`).join("");
    $("#modalPdf").href = `catalog.pdf#page=${p.page}`;
    modal.hidden = false;
    window.QS_SOUND?.click();
    if (lenis) lenis.stop();
    document.body.style.overflow = "hidden";
    gsap.fromTo(".modal__backdrop", { opacity: 0 }, { opacity: 1, duration: 0.35 });
    gsap.fromTo(".modal__card", { y: 44, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: "expo.out" });
    $(".modal__close").focus();
  }
  function closeModal() {
    gsap.to(".modal__card", { y: 24, opacity: 0, duration: 0.28, ease: "power2.in" });
    gsap.to(".modal__backdrop", {
      opacity: 0, duration: 0.3, onComplete: () => {
        modal.hidden = true;
        document.body.style.overflow = "";
        if (lenis) lenis.start();
        lastFocus?.focus?.();
      }
    });
  }
  function step(dir) {
    if (modalIdx < 0) return;
    const list = visible.length ? visible.map(v => v.i) : PRODUCTS.map((_, i) => i);
    const pos = list.indexOf(modalIdx);
    const next = list[(pos + dir + list.length) % list.length];
    openModal(next);
  }
  $$("[data-close]", modal).forEach(el => el.addEventListener("click", closeModal));
  $("#modalPrev").addEventListener("click", () => step(-1));
  $("#modalNext").addEventListener("click", () => step(1));
  addEventListener("keydown", e => {
    if (modal.hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
  // objets open by model name
  $$("[data-open]").forEach(el => el.addEventListener("click", () => {
    const idx = PRODUCTS.findIndex(p => p.model === el.dataset.open);
    if (idx > -1) openModal(idx);
  }));

  /* ───────── parallax images / story ───────── */
  $$(".parallax-img img").forEach(img => {
    gsap.fromTo(img, { yPercent: -10 }, {
      yPercent: 10, ease: "none",
      scrollTrigger: { trigger: img.closest("section"), start: "top bottom", end: "bottom top", scrub: true }
    });
  });
  gsap.fromTo(".objet", { y: 60, opacity: 0 }, {
    y: 0, opacity: 1, duration: 1, stagger: 0.15, ease: "expo.out",
    scrollTrigger: { trigger: ".objets__duo", start: "top 80%" }
  });

  /* ───────── footer giant type ───────── */
  gsap.to(".footer__giant span", {
    y: 0, ease: "none",
    scrollTrigger: { trigger: ".footer", start: "top 80%", end: "bottom bottom", scrub: 0.4 }
  });

  /* ───────── magnetic buttons ───────── */
  if (matchMedia("(pointer:fine)").matches && !reduced) {
    $$(".btn-magnetic").forEach(btn => {
      const xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" });
      const yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });
      btn.addEventListener("mousemove", e => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.35);
        yTo((e.clientY - r.top - r.height / 2) * 0.45);
      });
      btn.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ───────── scroll cue hides after hero ───────── */
  ScrollTrigger.create({
    trigger: "#hero", start: "40% top",
    onEnter: () => gsap.to("#scrollCue", { autoAlpha: 0, duration: 0.4 }),
    onLeaveBack: () => gsap.to("#scrollCue", { autoAlpha: 1, duration: 0.4 })
  });

  /* ───────── sound design (synthesized, zero assets, opt-in) ───────── */
  const Sound = (() => {
    let ctx = null, on = false;
    const ensure = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());
    const env = (node, t0, peak, dur) => {
      node.gain.setValueAtTime(0.0001, t0);
      node.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
      node.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    };
    const noiseBuf = () => {
      const b = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return b;
    };
    function click() { // small metallic tick
      if (!on) return; ensure();
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.setValueAtTime(2100, t);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.045);
      env(g, t, 0.055, 0.05);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.07);
      const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), ng = ctx.createGain();
      n.buffer = noiseBuf(); f.type = "bandpass"; f.frequency.value = 4200; f.Q.value = 2;
      env(ng, t, 0.04, 0.035);
      n.connect(f).connect(ng).connect(ctx.destination); n.start(t); n.stop(t + 0.05);
    }
    function thunk() { // the latch — for pressing the handle
      if (!on) return; ensure();
      const t = ctx.currentTime;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(210, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.11);
      env(g, t, 0.22, 0.13);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.16);
      const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), ng = ctx.createGain();
      n.buffer = noiseBuf(); f.type = "lowpass"; f.frequency.value = 900;
      env(ng, t + 0.005, 0.09, 0.07);
      n.connect(f).connect(ng).connect(ctx.destination); n.start(t); n.stop(t + 0.09);
    }
    function whoosh() { // filtered sweep — menu / wipe
      if (!on) return; ensure();
      const t = ctx.currentTime;
      const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      const b = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      n.buffer = b; f.type = "bandpass"; f.Q.value = 1.1;
      f.frequency.setValueAtTime(280, t);
      f.frequency.exponentialRampToValueAtTime(1900, t + 0.32);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      n.connect(f).connect(g).connect(ctx.destination); n.start(t); n.stop(t + 0.4);
    }
    return {
      click, thunk, whoosh,
      get on() { return on; },
      set(v) { on = v; if (v) { ensure(); ctx.resume?.(); } }
    };
  })();
  window.QS_SOUND = Sound;
  const soundBtn = $("#soundToggle");
  const setSound = v => {
    Sound.set(v);
    soundBtn.setAttribute("aria-pressed", String(v));
    try { localStorage.setItem("qs-sound", v ? "1" : "0"); } catch (e) {}
    if (v) Sound.click();
  };
  soundBtn.addEventListener("click", () => setSound(!Sound.on));
  // sound is opt-in: never auto-enable, only restore an explicit previous "on"
  try { if (localStorage.getItem("qs-sound") === "1") { soundBtn.setAttribute("aria-pressed", "true"); Sound.set(true); } } catch (e) {}
  // wire ticks into existing interactions
  $$(".fdot").forEach(d => d.addEventListener("click", () => Sound.click()));
  chipsWrap.addEventListener("click", e => { if (e.target.closest(".fchip")) Sound.click(); });
  filters.addEventListener("click", e => { if (e.target.closest(".chip")) Sound.click(); });

  /* ───────── mobile menu ───────── */
  const burger = $("#burger");
  const mmenu = $("#mobileMenu");
  let menuOpen = false, menuAnim = false;
  const menuTl = gsap.timeline({ paused: true })
    .to(".mmenu__bg", { y: 0, duration: 0.6, ease: "expo.inOut" }, 0)
    .fromTo(".mmenu__link span", { y: "120%" }, { y: 0, duration: 0.7, stagger: 0.06, ease: "expo.out" }, 0.25)
    .fromTo(".mmenu__inner .mono-label, .mmenu__base", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.4);
  gsap.set(".mmenu__bg", { y: "-101%" });
  function toggleMenu(open) {
    if (menuAnim || open === menuOpen) return;
    menuOpen = open; menuAnim = true;
    burger.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    mmenu.setAttribute("aria-hidden", String(!open));
    Sound.whoosh();
    if (open) {
      mmenu.classList.add("is-open");
      if (lenis) lenis.stop();
      menuTl.timeScale(1).play().eventCallback("onComplete", () => menuAnim = false);
    } else {
      menuTl.timeScale(1.6).reverse().eventCallback("onReverseComplete", () => {
        mmenu.classList.remove("is-open");
        if (lenis) lenis.start();
        menuAnim = false;
      });
    }
  }
  burger.addEventListener("click", () => toggleMenu(!menuOpen));
  $$(".mmenu__link").forEach(a => a.addEventListener("click", e => {
    const id = a.getAttribute("href");
    if (id.startsWith("#")) {
      e.preventDefault();
      toggleMenu(false);
      setTimeout(() => scrollTo(id), 480);
    } else toggleMenu(false);
  }));
  addEventListener("keydown", e => { if (e.key === "Escape" && menuOpen) toggleMenu(false); });

  /* ───────── page wipe (collections → archive) ───────── */
  const wipe = $("#wipe");
  function wipeTo(mid) {
    if (reduced) { mid(); return; }
    Sound.whoosh();
    const panels = $$("i", wipe);
    gsap.timeline()
      .set(wipe, { pointerEvents: "auto" })
      .set(panels, { transformOrigin: "50% 100%", scaleY: 0 })
      .to(panels, { scaleY: 1, duration: 0.5, stagger: 0.09, ease: "expo.inOut" })
      .add(() => mid())
      .set(panels, { transformOrigin: "50% 0%" })
      .to(panels, { scaleY: 0, duration: 0.55, stagger: -0.09, ease: "expo.inOut" }, "+=0.12")
      .set(wipe, { pointerEvents: "none" });
  }

  /* ───────── collections: drag to travel ───────── */
  const collTrack = $("#collectionsTrack");
  if (collTrack && !reduced) {
    // no pointer capture: capturing retargets the click event to the track,
    // which would swallow panel clicks entirely
    let dragging = false, moved = 0, lastX = 0, vel = 0;
    collTrack.addEventListener("pointerdown", e => {
      if (e.pointerType === "touch") return; // native vertical scroll on touch
      dragging = true; moved = 0; lastX = e.clientX; vel = 0;
    });
    addEventListener("pointermove", e => {
      if (!dragging) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      moved += Math.abs(dx); vel = dx;
      const y = lenis ? lenis.scroll : scrollY;
      if (lenis) lenis.scrollTo(y - dx * 1.6, { immediate: true });
      else window.scrollTo(0, y - dx * 1.6);
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(vel) > 4 && lenis) { // inertia glide
        lenis.scrollTo(lenis.scroll - vel * 22, { duration: 1.1 });
      }
    };
    addEventListener("pointerup", endDrag);
    addEventListener("pointercancel", endDrag);
    // suppress panel click only after a real drag
    collTrack.addEventListener("click", e => {
      if (moved > 8) { e.stopPropagation(); e.preventDefault(); }
      moved = 0;
    }, true);
  }

  /* ───────── easter egg: lucky seven ───────── */
  const toast = $("#toast");
  let toastT = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove("is-on"), 2600);
  }
  let eggBusy = false;
  addEventListener("keydown", e => {
    if (e.key !== "7" || eggBusy || modalOpenState() || menuOpen) return;
    eggBusy = true;
    scrollTo("#top");
    const dots = $$(".fdot");
    dots.forEach((d, i) => setTimeout(() => d.click(), 600 + i * 520));
    setTimeout(() => { showToast("Lucky seven — one handle, every finish."); eggBusy = false; }, 600 + dots.length * 520);
  });
  function modalOpenState() { return !modal.hidden; }

  /* ───────── modal focus trap + sounds ───────── */
  modal.addEventListener("keydown", e => {
    if (e.key !== "Tab") return;
    const focusables = $$("button, a[href]", modal).filter(el => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  addEventListener("load", () => ScrollTrigger.refresh());
})();
