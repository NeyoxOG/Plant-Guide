(()=>{
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Use the exact branding and photography supplied in the Plant Guide reference artwork.
  const assetStyle=document.createElement('style');
  assetStyle.textContent=`
    .supplied-brand{display:flex!important;align-items:center;min-width:0!important;flex:0 0 auto}
    .supplied-brand-image{display:block;width:245px;max-width:31vw;height:auto;border-radius:15px;mix-blend-mode:multiply}
    .footer-supplied-brand{width:max-content;max-width:100%;padding:7px 9px;border-radius:18px;background:rgba(255,255,255,.94)}
    .footer-supplied-brand .supplied-brand-image{width:235px;max-width:100%}
    .hero-art.uses-supplied-photo{height:430px}
    .hero-art.uses-supplied-photo .hero-image-wrap{background:#e8eadf}
    .hero-art.uses-supplied-photo .hero-image{object-fit:cover;object-position:center;filter:saturate(.98) contrast(.98) brightness(1.02)}
    .hero-art.uses-supplied-photo .quote-disc,
    .hero-art.uses-supplied-photo .balance-card,
    .hero-art.uses-supplied-photo .leaf-cluster{display:none!important}
    .hero-art.uses-supplied-photo .hero-image-wrap::after{background:linear-gradient(90deg,rgba(246,248,239,.10),transparent 42%,rgba(27,73,32,.05)),linear-gradient(180deg,transparent 70%,rgba(17,56,27,.08))}
    .offer-photo.reference-photo{filter:saturate(.96) contrast(.99) brightness(1.02)}
    .offer-card:hover .offer-photo.reference-photo{transform:scale(1.07);filter:saturate(1.04) contrast(1.01)}
    @media(max-width:1100px){.supplied-brand-image{width:235px;max-width:43vw}}
    @media(max-width:820px){.supplied-brand-image{width:205px;max-width:61vw}.hero-art.uses-supplied-photo{height:380px}}
    @media(max-width:560px){.supplied-brand-image{width:190px;max-width:67vw}.hero-art.uses-supplied-photo{height:300px}.hero-art.uses-supplied-photo .hero-image{object-position:52% center}}
  `;
  document.head.appendChild(assetStyle);

  const brandHTML='<img class="supplied-brand-image" src="assets/plant-guide-logo.webp" alt="Plant Guide – Natürlich. Ganzheitlich. Für dich.">';
  document.querySelectorAll('.brand').forEach((brand,index)=>{
    brand.classList.add('supplied-brand');
    if(index>0) brand.classList.add('footer-supplied-brand');
    brand.innerHTML=brandHTML;
  });

  const heroArt=document.querySelector('.hero-art');
  if(heroArt){
    heroArt.classList.add('uses-supplied-photo');
    const hero=heroArt.querySelector('.hero-image');
    if(hero){
      hero.src='assets/hero-wellness.webp';
      hero.alt='Botanische Wellness-Szene mit Pflanzen, Kräutern und dem Plant-Guide-Leitsatz';
      hero.removeAttribute('srcset');
    }
    heroArt.querySelectorAll('.image-credit').forEach(el=>el.remove());
  }

  const offerAssets=[
    ['assets/offer-stones.webp','Wellness-Steine mit grünen Blättern'],
    ['assets/offer-supplements.webp','Nahrungsergänzungsmittel mit botanischen Elementen'],
    ['assets/offer-reflexology.webp','Fußreflexzonenmassage in warmer Wellness-Atmosphäre'],
    ['assets/offer-nutrition.webp','Frischer Salat mit natürlichen Zutaten']
  ];
  document.querySelectorAll('.offer-photo').forEach((img,index)=>{
    const asset=offerAssets[index];
    if(!asset) return;
    img.src=asset[0];
    img.alt=asset[1];
    img.classList.add('reference-photo');
    img.removeAttribute('srcset');
    img.closest('.offer-visual')?.querySelectorAll('.image-credit').forEach(el=>el.remove());
  });

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
