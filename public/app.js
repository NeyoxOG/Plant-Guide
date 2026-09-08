const qs=(s,p=document)=>p.querySelector(s), qsa=(s,p=document)=>[...p.querySelectorAll(s)];

const menuBtn=qs('.menu-toggle'), mobileMenu=qs('.mobile-menu');
menuBtn?.addEventListener('click',()=>{
  const open=menuBtn.getAttribute('aria-expanded')==='true';
  menuBtn.setAttribute('aria-expanded',String(!open));
  menuBtn.setAttribute('aria-label',open?'Menü öffnen':'Menü schließen');
  mobileMenu.hidden=open;
});
mobileMenu?.addEventListener('click',e=>{if(e.target.closest('a')){mobileMenu.hidden=true;menuBtn?.setAttribute('aria-expanded','false');menuBtn?.setAttribute('aria-label','Menü öffnen')}});

const reveals=qsa('.reveal');
if('IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -40px'});
  reveals.forEach(el=>io.observe(el));
}else reveals.forEach(el=>el.classList.add('is-visible'));

// Follow the section at the reading position, including CMS-added shop content.
let navTicking=false;
function updateNavigation(){
  const sections=qsa('main section[id]');
  const current=sections.filter(s=>s.getBoundingClientRect().top<=150).at(-1)||sections[0];
  qsa('.desktop-nav a,.mobile-menu a').forEach(a=>{
    const active=a.getAttribute('href')===`#${current?.id}`;
    a.classList.toggle('active',active);
    if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');
  });
  navTicking=false;
}
addEventListener('scroll',()=>{if(!navTicking){navTicking=true;requestAnimationFrame(updateNavigation)}},{passive:true});
addEventListener('resize',updateNavigation);
updateNavigation();

qsa('.faq-item').forEach((item,index)=>{
  const btn=qs('button',item),answer=qs('.faq-answer',item),id=`faq-answer-${index+1}`;
  answer.id=id;btn.setAttribute('aria-controls',id);btn.setAttribute('aria-expanded',String(item.classList.contains('open')));
  btn.addEventListener('click',()=>{
    const wasOpen=item.classList.contains('open');
    qsa('.faq-item').forEach(i=>{i.classList.remove('open');qs('button span',i).textContent='+';qs('button',i).setAttribute('aria-expanded','false')});
    if(!wasOpen){item.classList.add('open');qs('button span',item).textContent='−';btn.setAttribute('aria-expanded','true')}
  });
});

const serviceModal=qs('#serviceModal'), serviceTitle=qs('#serviceTitle'), serviceText=qs('#serviceText');
const serviceCopy={
  'Schulter- & Nackenproblematik':'Ein sanfter, persönlicher Termin mit Fokus auf Entspannung, Wahrnehmung und alltagstaugliche Impulse für Schulter und Nacken.',
  'Analyse von Nahrungsergänzungsmitteln':'Wir schauen gemeinsam auf deine vorhandenen Präparate, Ziele und Fragen. Bei medizinischen Indikationen oder Wechselwirkungen ist eine ärztliche bzw. pharmazeutische Rücksprache wichtig.',
  'Fußreflexzonenmassage':'Eine ruhige Auszeit mit Fokus auf Entspannung und Wohlbefinden. Die Anwendung ist als ergänzendes Wellness-Angebot gedacht und ersetzt keine medizinische Behandlung.',
  'Ernährungsberatung / Umstellung':'Persönliche Orientierung für eine alltagstaugliche Ernährung. Bei diagnostizierten Erkrankungen erfolgt die Begleitung ergänzend und sollte mit medizinischem Fachpersonal abgestimmt werden.'
};

function resetHorizontalScroll(){
  document.documentElement.scrollLeft=0;
  document.body.scrollLeft=0;
}
function showModal(modal){
  resetHorizontalScroll();
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
  document.documentElement.classList.add('modal-open');
  document.body.style.overflow='hidden';
  requestAnimationFrame(()=>qs('.modal-close',modal)?.focus({preventScroll:true}));
}
function hideModal(modal){
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden','true');
  document.documentElement.classList.remove('modal-open');
  document.body.style.overflow='';
  requestAnimationFrame(resetHorizontalScroll);
}

qsa('[data-service]').forEach(btn=>btn.addEventListener('click',()=>{const k=btn.dataset.service;serviceTitle.textContent=k;serviceText.textContent=serviceCopy[k]||'';showModal(serviceModal)}));
qsa('[data-close]').forEach(el=>el.addEventListener('click',()=>hideModal(serviceModal)));

addEventListener('keydown',e=>{if(e.key==='Escape'){if(serviceModal?.classList.contains('show'))hideModal(serviceModal);if(mobileMenu&&!mobileMenu.hidden){mobileMenu.hidden=true;menuBtn?.setAttribute('aria-expanded','false');menuBtn?.setAttribute('aria-label','Menü öffnen');menuBtn?.focus()}}});

const stage=qs('.botanical-stage');
if(stage && !matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(pointer:fine)').matches){
  stage.addEventListener('pointermove',e=>{
    const r=stage.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
    qsa('.leaf-cluster',stage).forEach((el,i)=>el.style.translate=`${x*(i?10:-12)}px ${y*(i?10:-8)}px`);
    const disc=qs('.quote-disc',stage); if(disc){disc.style.marginLeft=`${x*10}px`;disc.style.marginTop=`${y*10}px`;}
  });
  stage.addEventListener('pointerleave',()=>{qsa('.leaf-cluster',stage).forEach(el=>el.style.translate='');const disc=qs('.quote-disc',stage);if(disc)disc.style.margin=''});
}

addEventListener('orientationchange',()=>setTimeout(resetHorizontalScroll,120));
const year=qs('#year'); if(year) year.textContent=new Date().getFullYear();

