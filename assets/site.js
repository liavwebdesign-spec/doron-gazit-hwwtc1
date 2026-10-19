(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* header: hide on scroll down, show on scroll up */
  const head = document.querySelector("[data-head]");
  let lastY = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY;
    head.classList.toggle("is-scrolled", y > 8);
    if (!head.classList.contains("menu-open") && !head.matches(":focus-within")) {
      head.classList.toggle("is-hidden", y > lastY && y > 240);
    }
    lastY = y;
  }, { passive: true });

  /* full-screen menu */
  const btn = head.querySelector(".menu-btn");
  const nav = head.querySelector(".site-nav");
  const setMenu = (open) => {
    head.classList.toggle("menu-open", open);
    btn.setAttribute("aria-expanded", open);
    btn.querySelector(".menu-lbl").textContent = open ? "Close" : "Menu";
    document.documentElement.classList.toggle("is-locked", open);
    if (open) setTimeout(() => nav.querySelector(".nav-list a")?.focus({ preventScroll: true }), reduce ? 0 : 350);
  };
  btn.addEventListener("click", () => setMenu(btn.getAttribute("aria-expanded") !== "true"));
  addEventListener("keydown", (e) => {
    if (!head.classList.contains("menu-open")) return;
    if (e.key === "Escape") { setMenu(false); btn.focus(); }
    // keep Tab inside the open menu: the button that closes it, then the menu links
    if (e.key === "Tab") {
      const f = [btn, ...nav.querySelectorAll("a")];
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* skip link: move focus into the content */
  document.querySelector(".skip")?.addEventListener("click", (e) => {
    const t = document.getElementById("content");
    if (t) { e.preventDefault(); t.focus(); t.scrollIntoView(); }
  });

  /* home index (MV:h8): the word under the pointer, or in focus, chooses the picture */
  const idx = document.querySelector(".idx");
  if (idx) {
    const imgs = [...idx.querySelectorAll(".idx-frame img")];
    const rows = [...idx.querySelectorAll(".idx-row")];
    const capN = idx.querySelector(".idx-cap-n"), capT = idx.querySelector(".idx-cap-t");
    const show = (i) => {
      imgs.forEach((im, k) => im.classList.toggle("on", k === i));
      rows.forEach((r, k) => r.classList.toggle("is-on", k === i));
      capN.textContent = String(i + 1).padStart(2, "0");
      capT.textContent = imgs[i].dataset.t;
    };
    const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    rows.forEach((r, i) => {
      const a = r.querySelector("a");
      if (fine) a.addEventListener("mouseenter", () => show(i));
      a.addEventListener("focus", () => show(i));
    });
  }

  /* images fade in once loaded */
  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    const done = () => img.classList.add("is-loaded");
    img.complete && img.naturalWidth ? done() : (img.addEventListener("load", done), img.addEventListener("error", done));
  });

  /* motion on inner pages (GSAP, from the Motion Vault). Without GSAP everything is simply visible. */
  if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger, ...(typeof SplitText !== "undefined" ? [SplitText] : []));
    const st = (h, a, b) => ({ trigger: h, start: a, end: b, scrub: 1 });
    const mm = gsap.matchMedia();

    /* MV:g04 level a: section titles rise word by word from a mask, with the scroll (level b on phones) */
    if (typeof SplitText !== "undefined") {
      mm.add({ desk: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
               mob: "(max-width: 767px) and (prefers-reduced-motion: no-preference)" }, (ctx) => {
        const { desk, mob } = ctx.conditions;
        if (!desk && !mob) return;
        const splits = [];
        const words = (h) => { const s = new SplitText(h, { type: "words" }); splits.push(s); return s.words; };
        const fade = (h) => gsap.from(words(h), { opacity: .15, stagger: .5, ease: "none", scrollTrigger: st(h, "top 80%", "top 30%") });
        document.querySelectorAll(".t-clip").forEach((h) => {
          if (mob) return fade(h);
          gsap.from(words(h), { clipPath: "inset(100% 0% 0% 0%)", opacity: 0, stagger: .5, ease: "none", scrollTrigger: st(h, "top 80%", "top 30%") });
        });
        return () => splits.forEach((s) => s.revert());
      });
    }

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      /* MV:g02: the cover and standalone photographs paint in from below with the scroll */
      // only what starts below the fold paints; a photo already on screen at load stays whole
      gsap.utils.toArray(".paint").filter((el) => el.getBoundingClientRect().top > innerHeight).forEach((el) => {
        gsap.fromTo(el, { "--reveal": "0%" }, { "--reveal": "100%", ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top 40%", scrub: true } });
      });
      /* MV:g13: cards, gallery images and media rows enter in batches, whatever reaches the screen together rises together */
      const cards = gsap.utils.toArray(".bcard").filter((el) => el.getBoundingClientRect().top > innerHeight);
      gsap.set(cards, { y: 16, opacity: 0 });
      ScrollTrigger.batch(cards, { start: "top 88%", once: true,
        onEnter: (b) => gsap.to(b, { y: 0, opacity: 1, stagger: .08, duration: .5, ease: "power2.out" }) });
    });
  }

  /* YouTube: load the player only on click */
  document.querySelectorAll(".yt").forEach((box) => {
    box.querySelector(".yt-btn").addEventListener("click", () => {
      const f = document.createElement("iframe");
      f.src = `https://www.youtube-nocookie.com/embed/${box.dataset.id}?autoplay=1&rel=0`;
      f.title = "YouTube video";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen";
      f.allowFullscreen = true;
      box.replaceChildren(f);
    });
  });

  /* lightbox */
  const lb = document.querySelector(".lb");
  if (lb && lb.showModal) {
    const img = lb.querySelector("img"), cap = lb.querySelector(".lb-cap"), cnt = lb.querySelector(".lb-count");
    let items = [], idx = 0, opener = null;
    const show = (i) => {
      idx = (i + items.length) % items.length;
      const a = items[idx];
      img.src = a.getAttribute("href");
      img.alt = a.querySelector("img")?.alt || "";
      cap.textContent = a.dataset.caption || "";
      cnt.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
      [items[idx - 1], items[idx + 1]].forEach((n) => n && (new Image().src = n.getAttribute("href")));
    };
    document.addEventListener("click", (e) => {
      const a = e.target.closest("[data-gallery] a[data-index], a[data-open]");
      if (!a || e.metaKey || e.ctrlKey) return;
      const g = a.dataset.open ? document.querySelector(`[data-gallery="${a.dataset.open}"]`) : a.closest("[data-gallery]");
      if (!g) return;
      e.preventDefault();
      opener = a;
      items = [...g.querySelectorAll("a[data-index]")];
      show(a.dataset.open ? +a.dataset.index : items.indexOf(a));
      lb.showModal();
      document.documentElement.classList.add("is-locked");
    });
    lb.querySelector(".lb-prev").onclick = () => show(idx - 1);
    lb.querySelector(".lb-next").onclick = () => show(idx + 1);
    lb.querySelector(".lb-close").onclick = () => lb.close();
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb-fig")) lb.close(); });
    lb.addEventListener("close", () => { document.documentElement.classList.remove("is-locked"); opener && opener.focus(); });
    lb.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") show(idx + 1);
      if (e.key === "ArrowLeft") show(idx - 1);
    });
    let x0 = null;
    lb.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* contact form: validation (sending is wired on the live site) */
  document.querySelectorAll(".form").forEach((f) => {
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = f.querySelector(".form-msg");
      const email = f.querySelector('[type="email"]');
      const ok = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      email?.setAttribute("aria-invalid", ok ? "false" : "true");
      if (!ok) { msg.textContent = "Please enter a valid email address."; email.focus(); return; }
      msg.textContent = "Preview only: the form will be connected when the new design goes live.";
    });
  });
})();
