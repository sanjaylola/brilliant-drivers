/* Brilliant Drivers — site behaviour (no dependencies) */
(() => {
  'use strict';
  const d = document;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasIO = 'IntersectionObserver' in window;

  /* Sticky header shadow + scroll progress + subtle parallax */
  const header = d.querySelector('.site-header');
  const progressBar = d.querySelector('.scroll-progress');
  const parallaxEls = reduceMotion ? [] : Array.from(d.querySelectorAll('[data-parallax]'));
  let rafId = 0;

  const updateScrollEffects = () => {
    rafId = 0;
    const y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 8);
    if (progressBar) {
      const max = d.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
      progressBar.style.transform = `scaleX(${pct})`;
    }
    if (parallaxEls.length) {
      const vh = window.innerHeight;
      parallaxEls.forEach((el) => {
        const rect = el.parentElement.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < vh) {
          const shift = Math.round((rect.top + rect.height / 2 - vh / 2) * -0.06);
          el.style.transform = `translate3d(0, ${shift}px, 0) scale(1.06)`;
        }
      });
    }
  };

  const onScroll = () => {
    if (!rafId) rafId = requestAnimationFrame(updateScrollEffects);
  };
  updateScrollEffects();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Mobile navigation */
  const toggle = d.querySelector('.nav-toggle');
  const nav = d.getElementById('site-nav');
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    d.addEventListener('click', (e) => { if (!e.target.closest('.site-header')) setOpen(false); });
    window.matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* Subtle scroll reveal with automatic sibling stagger */
  const revealEls = Array.from(d.querySelectorAll('[data-reveal]'));
  revealEls.forEach((el) => {
    if (el.style.getPropertyValue('--d')) return;
    const siblings = Array.from(el.parentElement.children).filter((c) => c.hasAttribute('data-reveal'));
    const i = siblings.indexOf(el);
    if (i > 0) el.style.setProperty('--d', `${Math.min(i, 5) * 90}ms`);
  });
  const show = (el) => el.classList.add('is-visible');
  if (reduceMotion || !hasIO) {
    revealEls.forEach(show);
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  }

  /* Number counters (final value is in the HTML for SEO / no-JS) */
  const counters = d.querySelectorAll('[data-count-to]');
  const runCounter = (el) => {
    const to = Number(el.dataset.countTo);
    const from = Number(el.dataset.countFrom || 0);
    const dur = Number(el.dataset.duration || 1600);
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!reduceMotion && hasIO && counters.length) {
    const co = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { runCounter(entry.target); co.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => { el.textContent = el.dataset.countFrom || '0'; co.observe(el); });
  }

  /* Rate toggle on BDE pricing table (Standard vs Student -$25 INTSTU) */
  d.querySelectorAll('.pricing-wrap').forEach((wrap) => {
    const buttons = wrap.querySelectorAll('.rate-toggle button[data-rate]');
    const prices = wrap.querySelectorAll('[data-price-standard][data-price-student]');
    const links = wrap.querySelectorAll('a[data-base-href]');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const rate = btn.dataset.rate;
        buttons.forEach((b) => {
          const active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
        prices.forEach((el) => {
          el.classList.add('is-swapping');
          setTimeout(() => {
            el.textContent = rate === 'student' ? el.dataset.priceStudent : el.dataset.priceStandard;
            el.classList.remove('is-swapping');
          }, 120);
        });
        links.forEach((a) => {
          const base = a.dataset.baseHref;
          a.href = rate === 'student' ? `${base}&promo=INTSTU` : base;
        });
      });
    });
  });

  /* Pre-select a package & promo code on the registration form: /register/?package=bde-regular&promo=INTSTU */
  const params = new URLSearchParams(window.location.search);
  const pkg = params.get('package');
  if (pkg) {
    const radio = Array.from(d.querySelectorAll('input[name="package"]')).find((r) => r.value === pkg);
    if (radio) radio.checked = true;
  }
  const promo = params.get('promo');
  const promoSelect = d.getElementById('promo_code');
  if (promo && promoSelect) {
    const opt = Array.from(promoSelect.options).find((o) => o.value === promo);
    if (opt) promoSelect.value = promo;
  }

  /* AJAX form submit (progressive enhancement – forms also work without JS) */
  d.querySelectorAll('form[data-ajax]').forEach((form) => {
    const ts = form.querySelector('input[name="_ts"]');
    if (ts) ts.value = String(Date.now());
    const status = form.querySelector('.form-status');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = form.querySelector('[type="submit"]');
      const label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Sending…';
      status.className = 'form-status';
      status.textContent = '';
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.message || '');
        form.reset();
        if (ts) ts.value = String(Date.now());
        status.textContent = data.message || 'Thank you! We will be in touch shortly.';
        status.classList.add('is-success');
      } catch (err) {
        status.textContent = `${err.message || 'Sorry, we could not send your message right now.'} You can also call us at 416-276-2399.`;
        status.classList.add('is-error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
        status.focus({ preventScroll: true });
        status.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }
    });
  });

  /* Current year */
  d.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()); });
})();
