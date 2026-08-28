(()=>{
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
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
