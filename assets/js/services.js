/* Service pages. No framework, no external requests. */
(function () {
  'use strict';
  var page = document.querySelector('.s-page');
  if (!page) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  page.querySelectorAll('.s-clients--row').forEach(function (row) {
    var viewport = row.querySelector('.s-logo-marquee');
    var group = row.querySelector('.s-logo-group');
    function measure() {
      row.classList.toggle('s-is-overflowing', group.scrollWidth > viewport.clientWidth + 1);
    }
    measure();
    if (document.fonts) document.fonts.ready.then(measure);
    if ('ResizeObserver' in window) {
      var observer = new ResizeObserver(measure);
      observer.observe(viewport);
      observer.observe(group);
    } else window.addEventListener('resize', measure);
  });

  page.querySelectorAll('[data-s-order]').forEach(function (button) {
    button.addEventListener('click', function (event) {
      var request = page.querySelector('#request');
      var task = request && request.querySelector('textarea[name="text"]');
      if (!task) return;
      event.preventDefault();
      var label = 'Хочу заказать: ' + button.getAttribute('data-s-order').replace(/\u00a0/g, ' ');
      var rest = task.value.replace(/^Хочу заказать: [^\n]*\n?/, ''); // набранное не затираем, прежнюю строку «Хочу заказать» меняем (суд 17.11, K4)
      task.value = rest ? label + '\n' + rest : label;
      task.dispatchEvent(new Event('input', { bubbles: true }));
      request.scrollIntoView({ behavior: reduce.matches ? 'instant' : 'smooth', block: 'start' });
      task.focus({ preventScroll: true });
    });
  });

  page.querySelectorAll('[data-s-showcase]').forEach(function (showcase) {
    var tabs = Array.from(showcase.querySelectorAll('[data-s-mode]'));
    var panels = Array.from(showcase.querySelectorAll('[data-s-panel]'));
    var positions = panels.map(function () { return 0; });
    var mode = Number(showcase.getAttribute('data-s-active-mode')) || 0;
    var count = showcase.querySelector('[data-s-count]');
    var pause = showcase.querySelector('[data-s-pause]');
    var caseLink = showcase.querySelector('[data-s-case-link]');
    var caseName = showcase.querySelector('[data-s-case-name]');
    var paused = reduce.matches, hovering = false, visible = true, timer;

    function sync() {
      clearInterval(timer);
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute('aria-label', paused ? 'Включить смену работ' : 'Приостановить смену работ');
      pause.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
      if (paused || reduce.matches || hovering || !visible || document.hidden || showcase.contains(document.activeElement)) return;
      timer = setInterval(function () { show(positions[mode] + 1); }, 8000);
    }
    function show(index) {
      var works = Array.from(panels[mode].querySelectorAll('[data-s-work]'));
      positions[mode] = (index + works.length) % works.length;
      works.forEach(function (work, i) {
        var current = i === positions[mode];
        work.classList.toggle('s-is-current', current);
        work.setAttribute('aria-hidden', String(!current));
      });
      var work = works[positions[mode]];
      caseLink.href = work.getAttribute('data-s-url');
      caseName.textContent = work.getAttribute('data-s-name');
      count.textContent = (positions[mode] + 1) + ' / ' + works.length;
    }
    function select(index, focus) {
      mode = index;
      tabs.forEach(function (tab, i) {
        var active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      show(positions[mode]);
      if (focus) tabs[index].focus();
      sync();
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { paused = true; select(i, false); });
      tab.addEventListener('keydown', function (event) {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) < 0) return;
        event.preventDefault();
        var next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
        paused = true; select(next, true);
      });
    });
    showcase.querySelector('[data-s-prev]').addEventListener('click', function () { paused = true; show(positions[mode] - 1); sync(); });
    showcase.querySelector('[data-s-next]').addEventListener('click', function () { paused = true; show(positions[mode] + 1); sync(); });
    pause.addEventListener('click', function () { paused = !paused; sync(); });
    showcase.addEventListener('mouseenter', function () { hovering = true; sync(); });
    showcase.addEventListener('mouseleave', function () { hovering = false; sync(); });
    showcase.addEventListener('focusin', sync);
    showcase.addEventListener('focusout', function () { setTimeout(sync, 0); });
    document.addEventListener('visibilitychange', sync);
    reduce.addEventListener('change', function () { if (reduce.matches) paused = true; sync(); });
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting; sync();
      }, { threshold: 0.1 });
      observer.observe(showcase);
    }
    select(mode, false);
  });

  page.querySelectorAll('[data-s-ai]').forEach(function (toggle) {
    var section = toggle.closest('.s-price');
    toggle.addEventListener('change', function () {
      section.querySelectorAll('.s-price-label, .s-price-amounts').forEach(function (group) {
        var alternate = group.querySelector('[data-s-ai-value]');
        var standard = group.querySelector('[data-s-standard]');
        if (!alternate || !standard) return;
        alternate.hidden = !toggle.checked;
        standard.hidden = toggle.checked;
      });
    });
  });

  page.querySelectorAll('[data-s-rail]').forEach(function (rail) {
    var track = rail.querySelector('[data-s-rail-track]');
    function move(direction) {
      track.scrollBy({ left: direction * (track.clientWidth * 0.8), behavior: reduce.matches ? 'auto' : 'smooth' });
    }
    var previous = rail.querySelector('[data-s-rail-prev]');
    var next = rail.querySelector('[data-s-rail-next]');
    if (previous) previous.addEventListener('click', function () { move(-1); });
    if (next) next.addEventListener('click', function () { move(1); });
  });

  page.querySelectorAll('.s-faq-list').forEach(function (list) {
    list.querySelectorAll('details').forEach(function (entry) {
      entry.addEventListener('toggle', function () {
        if (entry.open) list.querySelectorAll('details').forEach(function (other) {
          if (other !== entry) other.open = false;
        });
      });
    });
  });
})();
