(()=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href='cms.css?v=20260908-cms-2';document.head.appendChild(css);
  const euro=cents=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:2}).format((Number(cents)||0)/100);
  const safeHref=value=>{const s=String(value||'').trim();return s.startsWith('/')||s.startsWith('#')||/^https?:\/\//i.test(s)||/^mailto:/i.test(s)||/^tel:/i.test(s)?s:'#'};
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};

  function renderPromotions(items){
    document.querySelector('.cms-promo-wrap')?.remove();if(!items?.length)return;
    const wrap=el('div','cms-promo-wrap'),shell=el('div','cms-promo-shell'),track=el('div','cms-promo-track');
    items.forEach((item,index)=>{const card=el('article','cms-promo-card'+(index===0?' is-active':'')),badge=el('span','cms-promo-badge',item.badge||'ANGEBOT'),copy=el('div','cms-promo-copy');copy.append(el('strong','',item.title),el('span','',item.text||''));card.append(badge,copy);if(item.button_label&&item.button_url){const a=el('a','cms-promo-action',item.button_label+'  →');a.href=safeHref(item.button_url);card.append(a)}track.append(card)});
    shell.append(track);let current=0,timer;const showPromo=i=>{const cards=[...track.children],dots=[...shell.querySelectorAll('.cms-promo-dots button')];current=(i+cards.length)%cards.length;cards.forEach((c,n)=>c.classList.toggle('is-active',n===current));dots.forEach((d,n)=>d.classList.toggle('active',n===current))};
    if(items.length>1){const dots=el('div','cms-promo-dots');items.forEach((_,i)=>{const b=el('button',i===0?'active':'');b.type='button';b.setAttribute('aria-label',`Botschaft ${i+1}`);b.addEventListener('click',()=>showPromo(i));dots.append(b)});shell.append(dots)}
    wrap.append(shell);document.querySelector('.site-header')?.insertAdjacentElement('afterend',wrap);
    if(items.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches){timer=setInterval(()=>showPromo(current+1),6500);wrap.addEventListener('mouseenter',()=>clearInterval(timer),{once:true})}
  }

  function openService(item){const modal=document.querySelector('#serviceModal');if(!modal)return;document.querySelector('#serviceTitle').textContent=item.title;document.querySelector('#serviceText').textContent=item.detail_text||item.description||'';modal.classList.add('show');modal.setAttribute('aria-hidden','false');document.documentElement.classList.add('modal-open');document.body.style.overflow='hidden';requestAnimationFrame(()=>modal.querySelector('.modal-close')?.focus({preventScroll:true}))}
  function renderServices(items){
    const grid=document.querySelector('#angebote .offer-grid');if(!grid||!Array.isArray(items))return;grid.replaceChildren();
    if(!items.length){grid.append(el('p','cms-empty','Aktuell sind keine Leistungen veröffentlicht. Für persönliche Anfragen erreichst du Nicole direkt über den Kontaktbereich.'));return}
    items.forEach(item=>{const card=el('article','offer-card reveal is-visible'),visual=el('div','offer-visual');if(item.image_url){const img=new Image();img.className='offer-photo';img.src=safeHref(item.image_url);img.alt=item.image_alt||item.title;img.loading='lazy';visual.append(img)}else visual.append(el('span','cms-service-placeholder','❧'));const body=el('div','offer-body'),price=el('div','price');price.append(el('strong','',euro(item.price_cents)));if(item.compare_at_cents&&item.compare_at_cents>item.price_cents)price.append(el('s','',euro(item.compare_at_cents)));const button=el('button','link-btn','Mehr erfahren  →');button.type='button';button.addEventListener('click',()=>openService(item));body.append(el('h3','',item.title),el('p','',item.description||''),price,button);card.append(visual,body);grid.append(card)})
  }

  function applyContent(content){for(const [key,value] of Object.entries(content||{})){const target=document.querySelector(`[data-content="${CSS.escape(key)}"]`);if(target&&value)target.textContent=value}}

  function renderShop(products){
    document.querySelector('#shop')?.remove();if(!products?.length)return;
    const section=el('section','cms-shop section');section.id='shop';const container=el('div','container'),head=el('header','section-head reveal is-visible');head.append(el('p','eyebrow center','SHOP'),el('h2','','Naturverbunden ausgewählt.'),el('p','','Aktuelle Produkte und Empfehlungen direkt aus der Praxis.'));const grid=el('div','cms-shop-grid');
    products.forEach(product=>{const card=el('article','cms-product-card reveal is-visible'),media=el('div','cms-product-media');if(product.image_url){const img=new Image();img.src=product.image_url;img.alt=product.image_alt||product.title;img.loading='lazy';media.append(img)}else media.append(el('div','cms-product-placeholder','✦'));const body=el('div','cms-product-body');body.append(el('h3','',product.title),el('p','',product.description||''));const price=el('div','cms-product-price');price.append(el('strong','',euro(product.price_cents)));if(product.compare_at_cents&&product.compare_at_cents>product.price_cents)price.append(el('s','',euro(product.compare_at_cents)));body.append(price);card.append(media,body);grid.append(card)});
    container.append(head,grid);section.append(container);const offers=document.querySelector('#angebote');if(offers)offers.insertAdjacentElement('afterend',section);else document.querySelector('main')?.append(section);
    for(const nav of [document.querySelector('.desktop-nav'),document.querySelector('.mobile-menu')])if(nav&&!nav.querySelector('a[href="#shop"]')){const contact=nav.querySelector('a[href="#kontakt"]'),link=el('a','','Shop');link.href='#shop';nav.insertBefore(link,contact||null)}
  }

  async function load(){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);try{const res=await fetch('/api/public',{headers:{accept:'application/json'},signal:controller.signal});if(!res.ok)return;const data=await res.json();if(!data?.ok)return;applyContent(data.content);renderPromotions(data.promotions||[]);if(data.configured)renderServices(data.services);renderShop(data.products||[])}catch(err){console.info('Plant Guide CMS ist vorübergehend nicht erreichbar.',err)}finally{clearTimeout(timer)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();

