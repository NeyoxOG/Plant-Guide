(()=>{
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Use the supplied Plant Guide logo as a genuinely transparent asset.
  // No white card/background and no blend mode are added around it.
  const brandStyle=document.createElement('style');
  brandStyle.textContent=`
    .supplied-brand{display:flex!important;align-items:center;min-width:0!important;flex:0 0 auto;background:transparent!important}
    .supplied-brand-image{display:block;width:245px;max-width:31vw;height:auto;background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;mix-blend-mode:normal!important;filter:none!important}
    .footer-supplied-brand{width:max-content;max-width:100%;padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important}
    .footer-supplied-brand .supplied-brand-image{width:235px;max-width:100%;filter:drop-shadow(0 6px 16px rgba(0,0,0,.18))!important}
    @media(max-width:1100px){.supplied-brand-image{width:235px;max-width:43vw}}
    @media(max-width:820px){.supplied-brand-image{width:205px;max-width:61vw}}
    @media(max-width:560px){.supplied-brand-image{width:190px;max-width:67vw}}
  `;
  document.head.appendChild(brandStyle);

  const brandHTML='<img class="supplied-brand-image" src="assets/plant-guide-logo.webp" alt="Plant Guide – Natürlich. Ganzheitlich. Für dich.">';
  document.querySelectorAll('.brand').forEach((brand,index)=>{
    brand.classList.add('supplied-brand');
    if(index>0) brand.classList.add('footer-supplied-brand');
    brand.innerHTML=brandHTML;
  });

  // The photography stays exactly as defined in index.html. This restores the
  // previous botanical/wellness photos while keeping the newer motion effects.
  let ticking=false;
  const update=()=>{
    const y=window.scrollY||0;
    const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
    const p=Math.min(1,Math.max(0,y/max));
    root.style.setProperty('--scrollY',y.toFixed(0));
    root.style.setProperty('--scrollP',p.toFixed(4));
    document.querySelectorAll('[data-parallax]').forEach(el=>{
      const speed=parseFloat(el.dataset.parallax||'.08');
      const r=el.getBoundingClientRect();
      const center=r.top+r.height/2-innerHeight/2;
      el.style.setProperty('--py',`${Math.max(-42,Math.min(42,-center*speed))}px`);
    });
    ticking=false;
  };
  const requestUpdate=()=>{if(!ticking){ticking=true;requestAnimationFrame(update)}};
  addEventListener('scroll',requestUpdate,{passive:true});
  addEventListener('resize',requestUpdate,{passive:true});
  update();

  if(!reduce && matchMedia('(pointer:fine)').matches){
    addEventListener('pointermove',e=>{
      root.style.setProperty('--mouseX',`${(e.clientX/innerWidth*100).toFixed(1)}%`);
      root.style.setProperty('--mouseY',`${(e.clientY/innerHeight*100).toFixed(1)}%`);
    },{passive:true});
  }

  const revealEls=[...document.querySelectorAll('.reveal')];
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-visible');io.unobserve(entry.target)}
    }),{threshold:.09,rootMargin:'0px 0px -7%'});
    revealEls.forEach(el=>io.observe(el));
  }else revealEls.forEach(el=>el.classList.add('is-visible'));

  document.querySelectorAll('.benefit-grid .reveal,.offer-grid .reveal').forEach((el,i)=>{
    el.style.transitionDelay=`${Math.min(i%6,5)*70}ms`;
  });
})();
