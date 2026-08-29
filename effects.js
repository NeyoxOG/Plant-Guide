(()=>{
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Load the final responsive layer after all existing styles.
  const polish=document.createElement('link');
  polish.rel='stylesheet';
  polish.href='polish.css?v=20260829-mobile-fix-4';
  document.head.appendChild(polish);

  // Clean vector reconstruction of the supplied Plant Guide emblem.
  const emblem=`
    <svg viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      <circle cx="36" cy="36" r="32" fill="#f8f6e9" stroke="#b99a45" stroke-width="1.5"/>
      <circle cx="36" cy="36" r="28.8" fill="none" stroke="#1b5727" stroke-width="2.4"/>
      <path d="M35 56C35 44 37 31 42 18" fill="none" stroke="#b69b54" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M35 55C29 45 22 35 15 26" fill="none" stroke="#b69b54" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M35 55C43 48 51 42 59 37" fill="none" stroke="#b69b54" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M34 53C22 50 15 42 14 28C25 29 34 36 37 48C37 50 36 52 34 53Z" fill="#2e692f" stroke="#174c24" stroke-width=".8"/>
      <path d="M38 49C37 35 43 23 56 16C58 29 53 42 41 51C40 51 39 50 38 49Z" fill="#0f4a24" stroke="#123f20" stroke-width=".8"/>
      <path d="M39 54C45 45 53 41 62 41C60 51 53 57 42 58C40 57 39 56 39 54Z" fill="#7d9f45" stroke="#426a2c" stroke-width=".8"/>
      <path d="M21 43C26 39 30 37 35 36M45 39C49 34 52 29 54 23M46 52C51 49 55 46 59 44" fill="none" stroke="#d8c487" stroke-width="1" stroke-linecap="round"/>
      <circle cx="28" cy="16" r="2.6" fill="#70843f"/><circle cx="38" cy="12.5" r="2.2" fill="#b6923f"/><circle cx="44" cy="19" r="2.1" fill="#557a31"/>
    </svg>`;

  const brandHTML=`
    <span class="brand-emblem">${emblem}</span>
    <span class="brand-lockup">
      <strong>Plant Guide</strong>
      <small>NATÜRLICH. GANZHEITLICH. FÜR DICH.</small>
    </span>`;

  document.querySelectorAll('.brand').forEach((brand,index)=>{
    brand.classList.add('vector-brand');
    brand.classList.remove('supplied-brand');
    if(index>0) brand.classList.add('footer-supplied-brand');
    brand.innerHTML=brandHTML;
  });

  const phoneIcon=`<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 3.8 8.4 3l1.8 4.1-2.1 1.7a15.3 15.3 0 0 0 7.1 7.1l1.7-2.1L21 15.6l-.8 3.2c-.3 1.2-1.4 2-2.6 1.9C10 20 4 14 3.3 6.4c-.1-1.2.7-2.3 1.9-2.6Z"/></svg>`;
  const calendarIcon=`<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2M14 17h2"/></svg>`;
  const leafIcon=`<svg class="ui-leaf" viewBox="0 0 48 48" aria-hidden="true"><path d="M8 38C11 21 23 10 40 7c-2 17-12 29-29 34" fill="#275f2d"/><path d="M11 39c8-11 16-19 27-28" fill="none" stroke="#f4f0d9" stroke-width="2" stroke-linecap="round"/></svg>`;

  document.querySelectorAll('.phone-pill').forEach(el=>{
    const text=el.textContent.replace(/☎/g,'').trim();
    el.innerHTML=`${phoneIcon}<span class="phone-text">${text}</span>`;
  });

  document.querySelectorAll('.btn-icon').forEach(icon=>{
    const link=icon.closest('a');
    icon.innerHTML=link?.getAttribute('href')?.startsWith('tel:')?phoneIcon:calendarIcon;
  });

  document.querySelectorAll('.big-leaf').forEach(el=>el.innerHTML=leafIcon);

  // Updated contact e-mail everywhere on the main page.
  const CONTACT_EMAIL='praxisnaturpur@gmail.com';
  document.querySelectorAll('a[href^="mailto:"]').forEach(link=>{
    link.href=`mailto:${CONTACT_EMAIL}`;
    if(link.textContent.includes('@')) link.textContent=CONTACT_EMAIL;
  });

  // Replace the branded bottle hero photo with a calmer, neutral botanical image.
  const heroImage=document.querySelector('.hero-image');
  if(heroImage){
    heroImage.src='https://images.unsplash.com/photo-1545558509-ebcff83ba6c1?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000';
    heroImage.alt='Ruhige botanische Szene mit Sukkulenten und Natursteinen';
    heroImage.removeAttribute('srcset');
  }
  const heroCredit=document.querySelector('.hero-image-wrap .image-credit');
  if(heroCredit){
    heroCredit.href='https://unsplash.com/photos/green-succulent-beside-gray-stones-CfJH45PU_yc';
    heroCredit.textContent='Foto: Vanessa Bucceri · Unsplash';
  }

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
      el.style.setProperty('--py',`${Math.max(-30,Math.min(30,-center*speed))}px`);
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
      if(entry.isIntersecting){
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    }),{threshold:.09,rootMargin:'0px 0px -7%'});
    revealEls.forEach(el=>io.observe(el));
  }else{
    revealEls.forEach(el=>el.classList.add('is-visible'));
  }

  document.querySelectorAll('.benefit-grid .reveal,.offer-grid .reveal').forEach((el,i)=>{
    el.style.transitionDelay=`${Math.min(i%6,5)*65}ms`;
  });
})();
