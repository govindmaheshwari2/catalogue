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
      label.textContent = t && t.dataset.cursor === "-view" ? "VIEW" : "";
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
          $("#collCounter").textContent = `0${idx} / 06 — SCROLL TO TRAVEL`;
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
      <figure class="card__fig"><img src="assets/img/products/${p.img}.webp" alt="${p.model} ${p.type}" loading="lazy"></figure>
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

  // collections → filtered archive
  $$("[data-goto]").forEach(panel => {
    const go = () => { applyFilter(panel.dataset.goto); scrollTo("#archive"); };
    panel.addEventListener("click", go);
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

  addEventListener("load", () => ScrollTrigger.refresh());
})();
