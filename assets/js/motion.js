/* Balance Buro — движение (Михаил 17.11): мягкое появление блоков, заливка текста,
   /about (шоурил крупнее при прокрутке, кнопка за мышью), главная (кружки B/B падают на заголовок).
   Без библиотек. Всё выключается при prefers-reduced-motion. Подключён до site.js (тот раздаёт .in для .rv). */
(function () {
  var d = document, W = window;
  var calm = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = W.matchMedia && W.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var raf = W.requestAnimationFrame.bind(W);
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // 1. появление: только крупные блоки, соседи лесенкой; в статьях не трогаем (там дизайн Codex)
  if (!calm && !d.querySelector('.art-page')) {
    var sel = 'main .prow, main .card, .ab-svc h2, .ab-svc ul, .princ, .clients .wrap > *, .foot__grid > *, .ct > *, main section > h2';
    d.querySelectorAll(sel).forEach(function (el) {
      if (el.closest('.h-hero, .ab-top')) return;
      el.classList.add('rv');
      var sib = el.parentElement ? [].filter.call(el.parentElement.children, function (x) { return x.classList.contains('rv'); }) : [];
      el.style.setProperty('--i', Math.min(sib.indexOf(el), 5));
    });
    d.querySelectorAll('main .prow__img').forEach(function (el) { el.classList.add('rv-img'); });
    if ('IntersectionObserver' in W) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -10% 0px' });
      d.querySelectorAll('.rv-img').forEach(function (el) { io.observe(el); });
    } else d.querySelectorAll('.rv-img').forEach(function (el) { el.classList.add('in'); });
  }

  // 2. прокрутка — родная браузерная (Михаил 17.11: своя «плавная» ломала прокрутку вверх на трекпаде — не возвращать)

  // 3. заливка текста на чёрном: слова после первой фразы наливаются белым по мере прокрутки
  d.querySelectorAll('[data-fill]').forEach(function (p) {
    var words = [];
    [].slice.call(p.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) return;
      var frag = d.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (t) {
        if (!t) return;
        if (/^\s+$/.test(t)) { frag.appendChild(d.createTextNode(t)); return; }
        var s = d.createElement('span'); s.className = 'fw'; s.textContent = t; frag.appendChild(s); words.push(s);
      });
      p.replaceChild(frag, n);
    });
    if (calm) { words.forEach(function (w) { w.classList.add('on'); }); return; }
    function upd() {
      var r = p.getBoundingClientRect(), vh = W.innerHeight;
      var k = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.25), 0, 1), n = Math.round(k * words.length);
      words.forEach(function (w, i) { w.classList.toggle('on', i < n); });
    }
    W.addEventListener('scroll', upd, { passive: true }); W.addEventListener('resize', upd); upd();
  });

  // 4. /about: шоурил при прокрутке до 1.2 (как на Тильде), кнопка «смотреть» ходит за мышью
  var vid = d.querySelector('.ab-vid__box video'), vbtn = d.querySelector('.ab-vid__box [data-reel]');
  if (vid && !calm) {
    var vt = false;
    var vupd = function () {
      vt = false;
      var r = vid.parentElement.getBoundingClientRect(), k = clamp((W.innerHeight * 0.5 + 50 - r.top) / 400, 0, 1);
      vid.style.transform = 'translateY(' + (-30 * k).toFixed(1) + 'px) scale(' + (1 + 0.2 * k).toFixed(4) + ')';
    };
    W.addEventListener('scroll', function () { if (!vt) { vt = true; raf(vupd); } }, { passive: true }); vupd();
  }
  if (vbtn && fine && !calm) {
    var box = vbtn.parentElement, bx = 0, by = 0, tx = 0, ty = 0, moving = false;
    var bmove = function () {
      bx += (tx - bx) * 0.12; by += (ty - by) * 0.12;
      vbtn.style.transform = 'translate(calc(-50% + ' + bx.toFixed(1) + 'px), calc(-50% + ' + by.toFixed(1) + 'px))';
      if (Math.abs(tx - bx) + Math.abs(ty - by) > 0.3) raf(bmove); else moving = false;
    };
    box.addEventListener('mousemove', function (e) {
      var r = box.getBoundingClientRect();
      tx = clamp(e.clientX - (r.left + r.width / 2), -120, 120); ty = clamp(e.clientY - (r.top + r.height / 2), -120, 120);
      if (!moving) { moving = true; raf(bmove); }
    });
    box.addEventListener('mouseleave', function () { tx = ty = 0; if (!moving) { moving = true; raf(bmove); } });
  }

  // 5. кружки B/B падают и ложатся на текст; при наведении разлетаются.
  //    Главная — на заголовок (Михаил 17.11); статьи — в белую плашку внизу (Михаил 18.11: «чтобы сюда сваливались под разным углом и размером»)
  function bbDrop(drop, host, cfg) {
    var side = cfg.side || 0, balls = [], solids = [], Wd = 0, Hd = 0, floorY = 0, live = false, mx = -1e4, my = -1e4, last = 0, quiet = 0, woke = 0;
    function rectsOf(el, hr, top, bot, inset) {
      var rg = d.createRange(); rg.selectNodeContents(el);
      [].forEach.call(rg.getClientRects(), function (b) {
        solids.push({ x0: b.left - hr.left + inset, x1: b.right - hr.left - inset, y0: b.top - hr.top + b.height * top, y1: b.top - hr.top + b.height * bot });
      });
    }
    function layout() {
      var hr = host.getBoundingClientRect(); Wd = hr.width; Hd = hr.height; solids = [];
      floorY = cfg.layout(hr, rectsOf, function (el) { var r = el.getBoundingClientRect(); solids.push({ x0: r.left - hr.left, x1: r.right - hr.left, y0: r.top - hr.top, y1: r.bottom - hr.top }); });
    }
    function make() {
      layout();
      var n = cfg.count(Wd);
      for (var i = 0; i < n; i++) {
        var dia = cfg.dia(Wd, i), el = d.createElement('span'); el.className = cfg.kinds[i % cfg.kinds.length]; el.textContent = 'B/B';
        el.style.setProperty('--d', dia + 'px'); drop.appendChild(el);
        var sd = solids.length && Math.random() < cfg.onText ? solids[i % solids.length] : null;
        balls.push({ el: el, r: dia / 2, cool: 0, x: sd ? clamp(sd.x0 + Math.random() * (sd.x1 - sd.x0), dia, Wd - dia) : side + dia + Math.random() * (Wd - 2 * side - 2 * dia), y: -dia - i * dia * 0.9 - Math.random() * 120,
          vx: (Math.random() - 0.5) * 60, vy: 0, a: Math.random() * 80 - 40, delay: 0.25 + i * 0.09 });
      }
    }
    function collideRect(b, s) {
      var cx = clamp(b.x, s.x0, s.x1), cy = clamp(b.y, s.y0, s.y1), dx = b.x - cx, dy = b.y - cy, dd = dx * dx + dy * dy;
      if (dd >= b.r * b.r) return;
      var dist = Math.sqrt(dd) || 0.001, nx = dx / dist, ny = dy / dist;
      if (dd === 0) { nx = 0; ny = -1; }
      var pen = b.r - dist; b.x += nx * pen; b.y += ny * pen;
      var vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= 1.3 * vn * nx; b.vy -= 1.3 * vn * ny; b.vx *= 0.985; }
    }
    function tick(t) {
      if (!live) return;
      var dt = Math.min(0.033, (t - (last || t)) / 1000); last = t;
      var awake = false, sub = 3, h = dt / sub;
      for (var s = 0; s < sub; s++) {
        balls.forEach(function (b) {
          if (b.delay > 0) { b.delay -= h; return; }
          var ddx = b.x - mx, ddy = b.y - my, dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (b.cool > 0) b.cool -= h;
          else if (dist < b.r + 30) { var ux = ddx / Math.max(dist, 1), uy = ddy / Math.max(dist, 1); b.vx += ux * 950; b.vy += uy * 500 - cfg.kick; b.cool = 0.35; }
          b.vy += 2400 * h; b.vx *= 0.999; b.x += b.vx * h; b.y += b.vy * h;
          solids.forEach(function (sd) { collideRect(b, sd); });
          if (b.y + b.r > floorY) { b.y = floorY - b.r; if (b.vy > 0) b.vy *= -0.3; b.vx *= 0.96; }
          if (b.x - b.r < side) { b.x = side + b.r; b.vx = Math.abs(b.vx) * 0.5; }
          if (b.x + b.r > Wd - side) { b.x = Wd - side - b.r; b.vx = -Math.abs(b.vx) * 0.5; }
        });
        for (var i = 0; i < balls.length; i++) for (var j = i + 1; j < balls.length; j++) {
          var A = balls[i], B = balls[j]; if (A.delay > 0 || B.delay > 0) continue;
          var dx = B.x - A.x, dy = B.y - A.y, rr = A.r + B.r, dd = dx * dx + dy * dy;
          if (dd >= rr * rr || dd === 0) continue;
          var dist2 = Math.sqrt(dd), nx = dx / dist2, ny = dy / dist2, pen = (rr - dist2) / 2;
          A.x -= nx * pen; A.y -= ny * pen; B.x += nx * pen; B.y += ny * pen;
          var vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
          if (vn < 0) { var jj = -1.3 * vn / 2; A.vx -= jj * nx; A.vy -= jj * ny; B.vx += jj * nx; B.vy += jj * ny; }
        }
      }
      balls.forEach(function (b) {
        if (b.delay > 0 || Math.abs(b.vx) + Math.abs(b.vy) > 30) awake = true;
        b.a += (b.vx * dt / b.r) * 57.3;
        b.el.style.transform = 'translate(' + b.x.toFixed(1) + 'px,' + b.y.toFixed(1) + 'px) rotate(' + b.a.toFixed(1) + 'deg)';
      });
      quiet = awake ? 0 : quiet + dt; if (t - woke > 9000) quiet = 1;
      if (quiet < 0.6) raf(tick); else { live = false; last = 0; }
    }
    function wake() { woke = performance.now(); quiet = 0; if (!live) { live = true; last = 0; raf(tick); } }
    function start() { if (!balls.length) { make(); wake(); } }
    if (cfg.onView && 'IntersectionObserver' in W) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(start, 150); } }, { rootMargin: '0px 0px -20% 0px' });
      io.observe(host);
    } else if (d.readyState === 'complete') setTimeout(start, 150); else W.addEventListener('load', function () { setTimeout(start, 150); });
    host.addEventListener('pointermove', function (e) {
      var r = host.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
      if (balls.some(function (b) { var x = b.x - mx, y = b.y - my; return x * x + y * y < (b.r + 40) * (b.r + 40); })) wake();
    });
    host.addEventListener('pointerleave', function () { mx = my = -1e4; });
    W.addEventListener('resize', function () { if (balls.length) { layout(); balls.forEach(function (b) { b.x = clamp(b.x, b.r, Wd - b.r); }); wake(); } });
  }
  if (!calm) d.querySelectorAll('.bb-drop').forEach(function (drop) {
    var host = drop.parentElement;
    if (drop.classList.contains('bb-drop--cta')) {
      // плашка статьи: кружки чёрные и контурные, разного размера; пролетают за текстом и ложатся на дно плашки (там полоса под них)
      bbDrop(drop, host, { onView: true, onText: 0, side: 22, kick: 900, kinds: ['k', 'w', 'k', 'k', 'w', 'k', 'w', 'k', 'k'],
        count: function (w) { return w < 700 ? 6 : 9; },
        dia: function (w, i) { var base = clamp(w * 0.062, 44, 80); return Math.round(base * [1, .72, 1.2, .85, 1.08, .64, .95, 1.15, .78][i % 9]); },
        layout: function (hr) { return hr.height - 6; } });
    } else {
      var H1 = host.querySelector('h1'), bar = host.querySelector('.h-hero__bar');
      bbDrop(drop, host, { onView: false, onText: 0.65, kick: 1100, kinds: ['o', 'k', 'w', 'o', 'k', 'w', 'k', 'o', 'w', 'k'],
        count: function (w) { return w < 700 ? 6 : 10; },
        dia: function (w) { return clamp(w * 0.062, 46, 104); },
        layout: function (hr, rectsOf) {
          [].forEach.call(H1.children, function (sp) { rectsOf(sp, hr, 0.33, 0.8, 4); });
          return bar ? bar.getBoundingClientRect().top - hr.top - 8 : hr.height;
        } });
    }
  });
})();
