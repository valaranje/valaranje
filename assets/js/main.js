(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- слова «О себе»: разбиваем на span для проявления при скролле ---------- */
  const words = $('#aboutText');
  const wordEls = [];
  if (words) {
    const frag = document.createDocumentFragment();
    const walk = (node, key) => {
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'w' + (key ? ' k' : '');
            s.textContent = part;
            frag.appendChild(s);
            wordEls.push(s);
          });
        } else if (n.nodeName === 'B') walk(n, true);
      });
    };
    walk(words, false);
    words.textContent = '';
    words.appendChild(frag);
  }

  /* ---------- счётчики ---------- */
  const runCount = el => {
    const to = +el.dataset.to;
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now(), d = 1500;
    const step = t => {
      const p = clamp((t - t0) / d);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  /* ---------- график «Путь» ---------- */
  const chart = $('#chart');
  const drawChart = () => {
    if (!chart) return;
    const w = chart.clientWidth, h = chart.clientHeight;
    const svg = $('svg', chart);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const pts = $$('.pt', chart).map(p => {
      p.style.setProperty('--x', p.dataset.x);
      p.style.setProperty('--y', p.dataset.y);
      return { x: parseFloat(p.dataset.x) / 100 * w, y: parseFloat(p.dataset.y) / 100 * h };
    });
    const P = a => a.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
    $('.area', svg).setAttribute('d', `M${P(pts)} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`);
    const l1 = $('.l1', svg), l2 = $('.l2', svg);
    l1.setAttribute('d', 'M' + P(pts.slice(0, 3)));
    l2.setAttribute('d', 'M' + P(pts.slice(2)));
    [l1, l2].forEach(l => l.style.setProperty('--len', Math.ceil(l.getTotalLength()) + 2));
  };
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(drawChart, 120); });
  drawChart();

  /* ---------- появление блоков ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const t = e.target;
      t.classList.add('in');
      if (t.classList.contains('count')) runCount(t);
      $$('.count', t).forEach(runCount);
      io.unobserve(t);
    });
  }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });

  /* ---------- скролл: прогресс, плиты, слова ---------- */
  const prog = $('.progress');
  const plates = $('#plates'), stack = plates && $('.stack', plates);
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const vh = innerHeight;
    const max = root.scrollHeight - vh;
    prog.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    if (plates) {
      const r = plates.getBoundingClientRect();
      const t = clamp((vh - r.top) / (vh + r.height));
      stack.style.setProperty('--gap', (8 + 30 * t).toFixed(1) + 'px');
      stack.style.setProperty('--rz', (-52 + 26 * t).toFixed(1) + 'deg');
    }
    if (words && wordEls.length) {
      const r = words.getBoundingClientRect();
      const start = vh * .82, end = vh * .4;
      const p = clamp((start - r.top) / (start - end + r.height * .6));
      const n = Math.floor(p * (wordEls.length + 1));
      wordEls.forEach((w, i) => w.classList.toggle('on', i < n));
    }
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- параллакс фото ---------- */
  const photo = $('.hero-photo');
  if (photo && !reduce && matchMedia('(pointer:fine)').matches) {
    addEventListener('pointermove', e => {
      photo.style.setProperty('--px', ((e.clientX / innerWidth - .5) * -22).toFixed(1) + 'px');
      photo.style.setProperty('--py', ((e.clientY / innerHeight - .5) * -22).toFixed(1) + 'px');
    });
  }

  /* ---------- загрузка ---------- */
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    root.classList.add('ready');
    drawChart();
    $$('.rv, .chart').forEach(el => io.observe(el));
  };

  if (!root.classList.contains('js')) return;
  const ldNum = $('#ldNum'), ldBar = $('#ldBar');
  const D = reduce ? 0 : 1100, t0 = performance.now();
  const tick = t => {
    const p = D ? clamp((t - t0) / D) : 1;
    ldNum.textContent = Math.round(p * 100);
    ldBar.style.transform = `scaleX(${p})`;
    if (p < 1) requestAnimationFrame(tick);
    else setTimeout(start, reduce ? 0 : 250);
  };
  requestAnimationFrame(tick);
  setTimeout(start, 4000); // страховка
})();
