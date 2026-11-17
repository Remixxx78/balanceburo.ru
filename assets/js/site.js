/* Balance Buro — поведение страниц: шапка, меню, слайдеры, появление блоков, формы заявок. */
(function () {
  var d = document, root = d.documentElement;
  root.classList.remove('no-js');

  // Cookie: отказ хранилища не мешает закрыть плашку в текущем сеансе.
  var cookieBanner = d.querySelector('[data-cookie-banner]');
  if (cookieBanner) {
    var accepted = false;
    try { accepted = localStorage.getItem('bb-cookie-ok') === '1'; } catch (e) {}
    cookieBanner.hidden = accepted;
    cookieBanner.querySelector('[data-cookie-accept]').addEventListener('click', function () {
      try { localStorage.setItem('bb-cookie-ok', '1'); } catch (e) {}
      cookieBanner.hidden = true;
    });
  }

  // шапка: фон после прокрутки
  var hdr = d.querySelector('.hdr');
  function onScroll() { if (hdr) hdr.classList.toggle('is-scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // меню
  var menu = d.getElementById('menu');
  d.querySelectorAll('[data-menu-open]').forEach(function (b) {
    b.addEventListener('click', function () { menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false'); b.setAttribute('aria-expanded', 'true'); });
  });
  d.querySelectorAll('[data-menu-close]').forEach(function (b) {
    b.addEventListener('click', function () { menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true'); });
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu) menu.classList.remove('is-open'); });

  // слайдеры
  d.querySelectorAll('.slider').forEach(function (s) {
    var t = s.querySelector('.slider__track'), n = t.children.length, dots = s.querySelector('.slider__dots');
    function idx() { return Math.round(t.scrollLeft / t.clientWidth); }
    function go(i) { t.scrollTo({ left: Math.max(0, Math.min(n - 1, i)) * t.clientWidth, behavior: 'smooth' }); }
    var p = s.querySelector('.slider__nav--prev'), x = s.querySelector('.slider__nav--next');
    if (p) p.addEventListener('click', function () { go(idx() - 1); });
    if (x) x.addEventListener('click', function () { go(idx() + 1); });
    if (dots) {
      for (var i = 0; i < n; i++) (function (i) {
        var b = d.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Слайд ' + (i + 1));
        b.addEventListener('click', function () { go(i); }); dots.appendChild(b);
      })(i);
      var mark = function () { var k = idx(); Array.prototype.forEach.call(dots.children, function (b, j) { b.setAttribute('aria-current', j === k ? 'true' : 'false'); }); };
      t.addEventListener('scroll', function () { window.requestAnimationFrame(mark); }, { passive: true }); mark();
    }
  });

  // появление блоков
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    d.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  } else d.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });

  // цели аналитики
  function goal(name, params) {
    try { if (window.ym) (window.YM_IDS || [window.YM_ID]).forEach(function (id) { if (id) window.ym(id, 'reachGoal', name, params || {}); }); } catch (e) {}
    try { if (window.gtag) window.gtag('event', name, params || {}); } catch (e) {}
  }
  window.bbGoal = goal;
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a'); if (!a) return;
    var h = a.getAttribute('href') || '';
    if (h.indexOf('t.me/') > -1) goal('click_telegram');
    else if (h.indexOf('mailto:') === 0) goal('click_email');
    else if (h.indexOf('tel:') === 0) goal('click_phone');
    else if (h === '/brif' || h === '/brif/') goal('click_brief');
    else if (a.hasAttribute('data-pdf')) goal('click_presentation');
  });

  // формы заявок → свой обработчик (Telegram + почта)
  var EP = window.BB_FORM_ENDPOINT || '';
  d.querySelectorAll('form[data-lead]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var st = f.querySelector('.status, .qform__ok');
      if (!st && f.nextElementSibling && f.nextElementSibling.matches('.qform__ok')) st = f.nextElementSibling; // в подвале статус стоит после формы
      if (f.querySelector('.hp input') && f.querySelector('.hp input').value) return; // бот
      if (!f.reportValidity()) return; // novalidate снимает только нативную проверку при submit, обязательные поля и согласие проверяем сами
      var data = {}; new FormData(f).forEach(function (v, k) { if (typeof v !== 'string') return; data[k] = data[k] ? data[k] + ', ' + v : v; });
      var lp = String(f.getAttribute('data-lead') || '').split(':'), lead = lp[0];
      data.form = lead === 'services' ? 'service' : lead; if (lp[1]) data.service = lp[1]; // воркер режет form до 20 знаков: услугу шлём отдельным полем (суд 17.11, K3)
      data.page = location.pathname; data.ref = d.referrer || '';
      var q = location.search; if (q) data.utm = q.slice(1);
      var btn = f.querySelector('[type=submit]'); if (btn) btn.disabled = true;
      if (st) st.textContent = 'Отправляем…';
      var done = function (code) {
        if (btn) btn.disabled = false;
        if (code >= 200 && code < 300) { if (st) st.textContent = 'Спасибо! Мы свяжемся с вами в ближайшее время.'; f.reset(); goal(lead === 'service' || lead === 'services' ? 'lead_service' : 'lead_' + lead, lp[1] ? { service: lp[1] } : undefined); }
        else if (st) st.innerHTML = code === 400 ? 'Проверьте контакт: нужен e-mail или номер телефона.'
          : code === 429 ? 'Слишком много отправок подряд. Напишите нам на info@balanceburo.ru.'
          : 'Не получилось отправить. Напишите нам на info@balanceburo.ru.';
      };
      if (!EP) { done(0); return; }
      fetch(EP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { done(r.status); }).catch(function () { done(0); });
    });
  });
})();
