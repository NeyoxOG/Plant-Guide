(()=>{
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /*
   * Compact brand treatment for the supplied transparent Plant Guide artwork.
   * The uploaded logo is square/stacked, so using it as a 245px-wide image made
   * the navigation extremely tall on iPad. We now isolate its circular emblem
   * and pair it with a clean horizontal wordmark. This keeps the supplied logo
   * artwork while avoiding the corrupted/oversized lower wordmark raster.
   */
  const brandStyle=document.createElement('style');
  brandStyle.textContent=`
    .supplied-brand{
      display:flex!important;
      align-items:center!important;
      gap:10px!important;
      min-width:0!important;
      flex:0 0 auto!important;
      background:transparent!important;
      padding:0!important;
      overflow:visible!important;
    }
    .supplied-mark{
      position:relative;
      display:block;
      flex:0 0 64px;
      width:64px;
      height:64px;
      overflow:hidden;
      border-radius:50%;
      background:transparent;
      filter:drop-shadow(0 5px 12px rgba(26,65,30,.12));
    }
    .supplied-mark img{
      position:absolute;
      width:104px;
      height:104px;
      max-width:none!important;
      left:50%;
      top:-1px;
      transform:translateX(-50%);
      object-fit:contain;
      object-position:center top;
      clip-path:circle(30.5% at 50% 32%);
      -webkit-clip-path:circle(30.5% at 50% 32%);
      background:transparent!important;
      border:0!important;
      box-shadow:none!important;
    }
    .supplied-wordmark{
      display:flex;
      min-width:0;
      flex-direction:column;
      line-height:1;
      white-space:nowrap;
    }
    .supplied-wordmark strong{
      font:italic 2rem/1 Georgia,serif;
      font-weight:500;
      color:#123f20;
      letter-spacing:-.035em;
    }
    .supplied-wordmark small{
      margin-top:6px;
      font-size:.54rem;
      font-weight:700;
      letter-spacing:.075em;
      color:#243b2a;
    }
    .site-header .nav-shell{
      min-height:80px!important;
      padding-top:8px!important;
      padding-bottom:8px!important;
    }
    .site-header .supplied-brand{max-width:245px!important}

    .footer-supplied-brand{
      width:max-content!important;
      max-width:100%!important;
      padding:0!important;
      background:transparent!important;
      border:0!important;
      box-shadow:none!important;
    }
    .footer-supplied-brand .supplied-mark{
      width:72px;
      height:72px;
      flex-basis:72px;
      filter:drop-shadow(0 5px 14px rgba(0,0,0,.22));
    }
    .footer-supplied-brand .supplied-mark img{width:116px;height:116px}
    .footer-supplied-brand .supplied-wordmark strong{color:#f3f0df;font-size:2.05rem}
    .footer-supplied-brand .supplied-wordmark small{color:#d9e4d4}

    @media(max-width:1180px){
      .supplied-mark{width:58px;height:58px;flex-basis:58px}
      .supplied-mark img{width:95px;height:95px}
      .supplied-wordmark strong{font-size:1.75rem}
      .supplied-wordmark small{font-size:.48rem}
      .site-header .supplied-brand{max-width:215px!important}
    }
    @media(max-width:820px){
      .site-header .nav-shell{min-height:68px!important}
      .supplied-mark{width:52px;height:52px;flex-basis:52px}
      .supplied-mark img{width:85px;height:85px}
      .supplied-wordmark strong{font-size:1.5rem}
      .supplied-wordmark small{font-size:.42rem;margin-top:4px}
      .site-header .supplied-brand{max-width:190px!important}
      .footer-supplied-brand .supplied-mark{width:62px;height:62px;flex-basis:62px}
      .footer-supplied-brand .supplied-mark img{width:101px;height:101px}
    }
    @media(max-width:560px){
      .supplied-mark{width:46px;height:46px;flex-basis:46px}
      .supplied-mark img{width:75px;height:75px}
      .supplied-wordmark strong{font-size:1.34rem}
      .supplied-wordmark small{display:none}
      .site-header .supplied-brand{max-width:160px!important}
      .footer-supplied-brand .supplied-wordmark small{display:block}
    }
  `;
  document.head.appendChild(brandStyle);

  const brandHTML=`
    <span class="supplied-mark" aria-hidden="true">
      <img src="assets/plant-guide-logo.webp?v=brand-emblem-20260829-3" alt="">
    </span>
    <span class="supplied-wordmark">
      <strong>Plant Guide</strong>
      <small>NATÜRLICH. GANZHEITLICH. FÜR DICH.</small>
    </span>`;

  document.querySelectorAll('.brand').forEach((brand,index)=>{
    brand.classList.add('supplied-brand');
    if(index>0) brand.classList.add('footer-supplied-brand');
    brand.innerHTML=brandHTML;
  });

  // The photography stays exactly as defined in index.html.
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
