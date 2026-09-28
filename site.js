/* Autohuis Premium — gedeelde scripts voor alle pagina's */
(function(){
  const $ = id => document.getElementById(id);

  /* ---------- ruimte onder de vaste balk ---------- */
  function syncTopbar(){
    document.body.style.setProperty('--topbar-h', $('topbar').offsetHeight + 'px');
  }
  syncTopbar();
  addEventListener('resize', syncTopbar);
  addEventListener('load', syncTopbar);

  /* ---------- menu & header ---------- */
  $('burger').onclick = () => $('nav').classList.toggle('open');
  addEventListener('scroll', () => $('hdr').classList.toggle('solid', scrollY > 20), {passive:true});
  $('yr').textContent = new Date().getFullYear();

  /* ---------- scroll reveal ---------- */
  const els = document.querySelectorAll('.rv');
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver(es => es.forEach(e => {
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    }), {rootMargin:'0px 0px -8% 0px'});
    els.forEach(el => io.observe(el));
  } else els.forEach(el => el.classList.add('in'));

  /* ---------- RDW kentekencheck (alleen op home) ---------- */
  const kt = $('kenteken');
  if(kt){
    const out = $('rdwResult');
    const toon = (t, bad) => out.innerHTML = `<div class="msg${bad?' bad':''}">${t}</div>`;
    const datum = s => (s && s.length === 8) ? `${s.slice(6,8)}-${s.slice(4,6)}-${s.slice(0,4)}` : '—';
    kt.addEventListener('input', e => e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g,''));
    kt.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); lookup(); } });
    $('btnKenteken').addEventListener('click', lookup);

    async function lookup(){
      const raw = kt.value.replace(/[^A-Z0-9]/g,'');
      if(raw.length < 6){ toon('Vul een volledig kenteken in, bijvoorbeeld XX-999-X.', true); return; }
      toon('Bezig met opvragen…');
      try{
        const r = await fetch('https://opendata.rdw.nl/resource/m9d7-ebf2.json?$limit=1&kenteken=' + encodeURIComponent(raw));
        if(!r.ok) throw new Error(r.status);
        const d = (await r.json())[0];
        if(!d){ toon('Geen registratie gevonden voor dit kenteken.', true); return; }
        const cellen = [
          ['Merk', d.merk], ['Handelsbenaming', d.handelsbenaming],
          ['Eerste toelating', datum(d.datum_eerste_toelating)], ['APK vervaldatum', datum(d.vervaldatum_apk)],
          ['Brandstof', d.brandstof_omschrijving], ['Massa leeg', d.massa_ledig_voertuig && d.massa_ledig_voertuig + ' kg'],
          ['Kleur', d.eerste_kleur], ['Voertuigsoort', d.voertuigsoort]
        ];
        out.innerHTML = '<div class="rdw-out">' + cellen.map(([k,v]) =>
          `<div><div class="k">${k}</div><div class="v mono">${v || '—'}</div></div>`).join('') + '</div>';
      }catch(e){
        toon(location.protocol === 'file:'
          ? 'De kentekencheck werkt alleen als de site online staat.'
          : 'De RDW-service reageert op dit moment niet. Probeer het zo nog eens.', true);
      }
    }
  }

  /* ---------- contactformulier (alleen op contact) ---------- */
  const send = $('send');
  if(send){
    // pakket vooraf selecteren vanuit ?pakket=...
    const gekozen = new URLSearchParams(location.search).get('pakket');
    if(gekozen){
      const sel = $('f-ond');
      [...sel.options].forEach(o => { if(o.text.toLowerCase() === gekozen.toLowerCase()) sel.value = o.text; });
    }
    send.addEventListener('click', () => {
      const v = id => $(id).value.trim();
      const naam = v('f-naam'), mail = v('f-mail'), tel = v('f-tel'), ond = $('f-ond').value, ber = v('f-ber');
      if(!naam || !mail){ alert('Vul in elk geval uw naam en e-mailadres in.'); return; }
      const body = encodeURIComponent(`Naam: ${naam}\nE-mail: ${mail}\nTelefoon: ${tel || '-'}\nOnderwerp: ${ond}\n\n${ber}`);
      const to = document.querySelector('a[href^="mailto:"]').getAttribute('href').replace('mailto:','');
      location.href = `mailto:${to}?subject=${encodeURIComponent('Aanvraag via website — ' + ond)}&body=${body}`;
      $('formBox').innerHTML = `<div class="sent"><div class="tick">✓</div><h3>Uw mailprogramma is geopend</h3>
        <p class="note" style="max-width:40ch;margin:12px auto 0">Verstuur het bericht om de aanvraag af te ronden.</p></div>`;
    });
  }
})();

/* ============================================================
   IMPORTROUTES-KAART — pijlen groeien mee met het scrollen
   ============================================================ */
(function(){
  const svg = document.getElementById('routeMap');
  if(!svg) return;
  const card = svg.closest('.routecard');
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const routes = [...svg.querySelectorAll('.route')].map(g => {
    const arc = g.querySelector('.arc'), glow = g.querySelector('.arc-glow'), ah = g.querySelector('.ah');
    const L = arc.getTotalLength();
    [arc, glow].forEach(p => { p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
    return {arc, glow, ah, L, start: parseFloat(g.dataset.start) || 0};
  });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function draw(p){
    card.style.setProperty('--p', p.toFixed(3));
    card.style.setProperty('--arrive', clamp((p - .6) / .4).toFixed(3));
    routes.forEach(r => {
      const t = ease(clamp((p - r.start) / .62));
      const len = r.L * t;
      r.arc.style.strokeDashoffset = r.L - len;
      r.glow.style.strokeDashoffset = r.L - len;
      if(t <= .01){ r.ah.style.opacity = 0; return; }
      const a = r.arc.getPointAtLength(len), b = r.arc.getPointAtLength(Math.max(0, len - 2));
      const ang = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
      r.ah.setAttribute('transform', `translate(${a.x.toFixed(1)},${a.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
      r.ah.style.opacity = 1;
    });
  }

  function progress(){
    const top = svg.getBoundingClientRect().top + scrollY;
    const vh = innerHeight;
    const start = Math.max(0, top - vh * .8);
    const span = vh * .5;
    return clamp((scrollY - start) / span);
  }

  if(reduce){ draw(1); return; }
  let ticking = false;
  const onScroll = () => { if(!ticking){ ticking = true; requestAnimationFrame(() => { draw(progress()); ticking = false; }); } };
  addEventListener('scroll', onScroll, {passive:true});
  addEventListener('resize', onScroll);
  draw(progress());
})();
