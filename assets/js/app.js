// ===== Lagoon Resort — interactions =====
(function () {
  'use strict';

  // ===== i18n: RU is the default; /en/ pages set <html lang="en"> =====
  const LANG = (document.documentElement.lang || 'ru').toLowerCase().slice(0, 2) === 'en' ? 'en' : 'ru';
  const STR = {
    ru: {
      close: 'Закрыть',
      title: 'Получить инвестиционную презентацию',
      sub: 'Презентация с ценами, планировками и фин. моделью Cushman & Wakefield. Ответим в удобном мессенджере.',
      name: 'Имя', namePh: 'Ваше имя', phone: 'Телефон', email: 'Email',
      msgLabel: 'Удобный мессенджер', chipCall: 'Звонок',
      submit: 'Получить презентацию',
      ok: 'Спасибо! Заявка отправлена — менеджер свяжется с вами в ближайшее время.',
      phoneInvalid: 'Проверьте номер телефона',
      unitTitle: 'Цены и планировки',
      unitSub: 'Пришлём прайс по этой планировке и расчёт доходности под ваш бюджет.',
      pricesTitle: 'Получить цены и планировки',
      pricesSub: 'Актуальный прайс по всем планировкам и этажам + фин. модель.',
      locale: 'ru-RU'
    },
    en: {
      close: 'Close',
      title: 'Get the investment presentation',
      sub: 'The presentation with prices, floor plans and the Cushman & Wakefield financial model. We’ll reply on your preferred messenger.',
      name: 'Name', namePh: 'Your name', phone: 'Phone', email: 'Email',
      msgLabel: 'Preferred messenger', chipCall: 'Call',
      submit: 'Get the presentation',
      ok: 'Thank you! Your request has been sent — a manager will contact you shortly.',
      phoneInvalid: 'Please check the phone number',
      unitTitle: 'Prices & floor plans',
      unitSub: 'We’ll send pricing for this layout and a return calculation for your budget.',
      pricesTitle: 'Get prices & floor plans',
      pricesSub: 'Current pricing for every layout and floor, plus the financial model.',
      locale: 'en-US'
    }
  };
  const T = STR[LANG];

  // sticky header shadow
  const header = document.getElementById('header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 20);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // mobile drawer
  const burger = document.getElementById('burger');
  const drawer = document.getElementById('drawer');
  const drawerClose = document.getElementById('drawerClose');
  const closeDrawer = () => drawer.classList.remove('open');
  burger && burger.addEventListener('click', () => drawer.classList.add('open'));
  drawerClose && drawerClose.addEventListener('click', closeDrawer);
  drawer && drawer.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });
  drawer && drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));

  // financial model tabs
  const tabs = document.querySelectorAll('.fin .tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.fin__panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.getElementById('tab-' + tab.dataset.tab);
      panel && panel.classList.add('active');
    });
  });

  // reveal on scroll
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  // animated counters
  const counters = document.querySelectorAll('[data-count]');
  const fmt = (n) => n.toLocaleString(T.locale);
  const animate = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1400; const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = Math.round(target * eased);
      el.textContent = fmt(val) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { animate(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach(c => cio.observe(c));
  }

  // FAQ — single open at a time
  const faqs = document.querySelectorAll('.faq-list details');
  faqs.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) faqs.forEach(o => { if (o !== d) o.open = false; });
  }));

  // ===== phone input — country code + mask (intl-tel-input) =====
  // visitor country is detected once by IP geo, cached in localStorage, and can
  // be overridden manually via the flag dropdown. We try several free providers
  // in turn so one being down/rate-limited doesn't drop everyone to the default.
  // Last-resort fallback: Georgia ('ge'). The fallback is never cached, so the
  // next visit retries detection.
  let geoPromise;
  const GEO_PROVIDERS = [
    { url: 'https://api.country.is/',                 pick: (d) => d.country },
    { url: 'https://ipwho.is/',                       pick: (d) => d.country_code },
    { url: 'https://get.geojs.io/v1/ip/country.json', pick: (d) => d.country },
    { url: 'https://ipapi.co/json/',                  pick: (d) => d.country_code }
  ];
  const fetchJson = (url, ms) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .finally(() => clearTimeout(t));
  };
  const lookupCountry = () => {
    if (geoPromise) return geoPromise;
    let cached = null;
    try { cached = localStorage.getItem('lagoon_iso'); } catch (e) {}
    if (cached) { geoPromise = Promise.resolve(cached); return geoPromise; }
    geoPromise = (async () => {
      for (let i = 0; i < GEO_PROVIDERS.length; i++) {
        try {
          const d = await fetchJson(GEO_PROVIDERS[i].url, 3500);
          const cc = GEO_PROVIDERS[i].pick(d);
          if (cc && /^[a-z]{2}$/i.test(cc)) {
            const iso = cc.toLowerCase();
            try { localStorage.setItem('lagoon_iso', iso); } catch (e) {}
            return iso;
          }
        } catch (e) { /* provider failed — try the next one */ }
      }
      return 'ge'; // every provider failed → sensible default, not cached
    })();
    return geoPromise;
  };
  const itiMap = {};
  const initPhone = (input) => {
    if (!input || !window.intlTelInput || itiMap[input.id]) return null;
    const iti = window.intlTelInput(input, {
      initialCountry: 'auto',
      geoIpLookup: (cb) => lookupCountry().then(cb),
      strictMode: true,        // restricts typing to a valid number + length
      countrySearch: true,     // searchable country list for manual choice
      separateDialCode: true,  // shows the +code next to the flag
      dropdownContainer: document.body
    });
    itiMap[input.id] = iti;
    return iti;
  };
  const preparePhone = (id) => {
    const iti = itiMap[id], el = document.getElementById(id);
    if (!iti || !el) return;
    el.setCustomValidity(el.value.trim() && !iti.isValidNumber() ? T.phoneInvalid : '');
  };
  const normalizePhone = (id) => {
    const iti = itiMap[id], el = document.getElementById(id);
    if (iti && el) el.value = iti.getNumber() || el.value;
  };
  initPhone(document.getElementById('phone'));

  // lead form (prototype — no backend)
  const form = document.getElementById('leadForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      preparePhone('phone');
      if (!form.checkValidity()) { form.reportValidity(); return; }
      normalizePhone('phone');
      form.querySelectorAll('.field, .msg-choice, button[type=submit]').forEach(el => el.style.display = 'none');
      const ok = document.getElementById('formOk');
      if (ok) ok.style.display = 'block';
      // here a real integration would POST: name, phone (E.164), email, msg channel
    });
  }

  // ===== lead capture modal (contextual popup for every CTA) =====
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'leadModal';
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML =
    '<div class="modal__overlay" data-close></div>' +
    '<div class="modal__box">' +
      '<button class="modal__close" data-close aria-label="' + T.close + '">×</button>' +
      '<form class="form" id="leadFormModal" novalidate>' +
        '<input type="hidden" name="source" id="leadSource" value="">' +
        '<h3 id="modalTitle">' + T.title + '</h3>' +
        '<p class="fsub" id="modalSub">' + T.sub + '</p>' +
        '<div class="field"><label for="m_name">' + T.name + '</label><input type="text" id="m_name" name="name" placeholder="' + T.namePh + '" required></div>' +
        '<div class="field"><label for="m_phone">' + T.phone + '</label><input type="tel" id="m_phone" name="phone" required></div>' +
        '<div class="field"><label for="m_email">' + T.email + '</label><input type="email" id="m_email" name="email" placeholder="you@email.com" required></div>' +
        '<label style="display:block;font-size:13px;font-weight:700;color:var(--ink-soft);margin-bottom:6px">' + T.msgLabel + '</label>' +
        '<div class="msg-choice">' +
          '<label><input type="radio" name="msg" value="whatsapp" checked><span class="chip">WhatsApp</span></label>' +
          '<label><input type="radio" name="msg" value="telegram"><span class="chip">Telegram</span></label>' +
          '<label><input type="radio" name="msg" value="call"><span class="chip">' + T.chipCall + '</span></label>' +
        '</div>' +
        '<button type="submit" class="btn btn--gold btn--block btn--lg">' + T.submit + '</button>' +
        '<div class="form__ok" id="formOkModal">' + T.ok + '</div>' +
      '</form>' +
    '</div>';
  document.body.appendChild(modal);

  const mTitle = modal.querySelector('#modalTitle');
  const mSub = modal.querySelector('#modalSub');
  const mSource = modal.querySelector('#leadSource');
  const mForm = modal.querySelector('#leadFormModal');
  initPhone(modal.querySelector('#m_phone'));

  const ctxFor = (el) => {
    const unit = el.closest('.unit');
    if (unit) {
      const u = (unit.querySelector('h3') || {}).textContent || '';
      return { title: T.unitTitle + (u ? ' · ' + u.trim() : ''),
               sub: T.unitSub,
               source: 'unit:' + u.trim() };
    }
    const t = (el.textContent || '').toLowerCase();
    if (t.indexOf('планировк') > -1 || t.indexOf('цены') > -1 ||
        t.indexOf('price') > -1 || t.indexOf('plan') > -1 || t.indexOf('floor') > -1)
      return { title: T.pricesTitle,
               sub: T.pricesSub,
               source: 'cta-prices' };
    const sec = el.closest('section[id]');
    return { title: T.title,
             sub: T.sub,
             source: sec ? sec.id : 'cta' };
  };

  const openModal = (ctx) => {
    mTitle.textContent = ctx.title;
    mSub.textContent = ctx.sub;
    mSource.value = ctx.source;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setTimeout(() => { const n = modal.querySelector('#m_name'); n && n.focus(); }, 60);
  };
  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  };
  modal.addEventListener('click', (e) => { if (e.target.hasAttribute('data-close')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

  // every CTA pointing at the footer form now opens the contextual popup
  document.querySelectorAll('a[href="#lead"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (drawer) drawer.classList.remove('open');
      openModal(ctxFor(a));
    });
  });

  mForm.addEventListener('submit', (e) => {
    e.preventDefault();
    preparePhone('m_phone');
    if (!mForm.checkValidity()) { mForm.reportValidity(); return; }
    normalizePhone('m_phone');
    Array.prototype.forEach.call(mForm.children, (c) => { if (c.id !== 'formOkModal') c.style.display = 'none'; });
    const ok = modal.querySelector('#formOkModal'); if (ok) ok.style.display = 'block';
    // real integration would POST: name, phone, email, msg, source
  });
})();
