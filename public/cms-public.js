(()=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href='cms.css?v=20260829-cms-1';document.head.appendChild(css);
  const euro=cents=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format((Number(cents)||0)/100);
  const safeHref=value=>{const s=String(value||'').trim();return s.startsWith('/')||s.startsWith('#')||/^https?:\/\//i.test(s)||/^mailto:/i.test(s)||/^tel:/i.test(s)?s:'#'};
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};

  function renderPromotions(items){
    document.querySelector('.cms-promo-wrap')?.remove();
    if(!items?.length)return;
    const wrap=el('div','cms-promo-wrap');
    const shell=el('div','cms-promo-shell');
    const track=el('div','cms-promo-track');
    items.forEach((item,index)=>{
      const card=el('article','cms-promo-card'+(index===0?' is-active':''));
      const badge=el('span','cms-promo-badge',item.badge||'ANGEBOT');
      const copy=el('div','cms-promo-copy');copy.append(el('strong','',item.title),el('span','',item.text||''));
      card.append(badge,copy);
      if(item.button_label&&item.button_url){const a=el('a','cms-promo-action',item.button_label+'  →');a.href=safeHref(item.button_url);card.append(a)}
      track.append(card);
    });
    shell.append(track);
    if(items.length>1){const dots=el('div','cms-promo-dots');items.forEach((_,i)=>{const b=el('button',i===0?'active':'');b.type='button';b.setAttribute('aria-label',`Angebot ${i+1}`);b.addEventListener('click',()=>showPromo(i));dots.append(b)});shell.append(dots)}
    wrap.append(shell);
    document.querySelector('.site-header')?.insertAdjacentElement('afterend',wrap);
    let current=0,timer;
    const cards=[...track.children],dots=[...shell.querySelectorAll('.cms-promo-dots button')];
    function showPromo(i){current=(i+cards.length)%cards.length;cards.forEach((c,n)=>c.classList.toggle('is-active',n===current));dots.forEach((d,n)=>d.classList.toggle('active',n===current))}
    if(cards.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches){timer=setInterval(()=>showPromo(current+1),6500);wrap.addEventListener('mouseenter',()=>clearInterval(timer),{once:true})}
  }

  function renderShop(products){
    document.querySelector('#shop')?.remove();
    if(!products?.length)return;
    const section=el('section','cms-shop section');section.id='shop';
    const container=el('div','container');
    const head=el('header','section-head reveal is-visible');head.append(el('p','eyebrow center','SHOP'),el('h2','','Naturverbunden ausgewählt.'),el('p','','Aktuelle Produkte und Empfehlungen direkt aus der Praxis.'));
    const grid=el('div','cms-shop-grid');
    products.forEach(product=>{
      const card=el('article','cms-product-card reveal is-visible');
      const media=el('div','cms-product-media');
      if(product.image_url){const img=new Image();img.src=product.image_url;img.alt=product.image_alt||product.title;img.loading='lazy';media.append(img)}else{media.append(el('div','cms-product-placeholder','✦'))}
      const body=el('div','cms-product-body');body.append(el('h3','',product.title),el('p','',product.description||''));
      const price=el('div','cms-product-price');price.append(el('strong','',euro(product.price_cents)));if(product.compare_at_cents&&product.compare_at_cents>product.price_cents)price.append(el('s','',euro(product.compare_at_cents)));body.append(price);
      card.append(media,body);grid.append(card);
    });
    container.append(head,grid);section.append(container);
    const offers=document.querySelector('#angebote');if(offers)offers.insertAdjacentElement('afterend',section);else document.querySelector('main')?.append(section);
    const nav=document.querySelector('.desktop-nav');if(nav&&!nav.querySelector('a[href="#shop"]')){const contact=nav.querySelector('a[href="#kontakt"]');const link=el('a','','Shop');link.href='#shop';nav.insertBefore(link,contact||null)}
    const mobile=document.querySelector('.mobile-menu');if(mobile&&!mobile.querySelector('a[href="#shop"]')){const contact=mobile.querySelector('a[href="#kontakt"]');const link=el('a','','Shop');link.href='#shop';mobile.insertBefore(link,contact||null)}
  }

  async function load(){
    try{
      const res=await fetch('/api/public',{headers:{accept:'application/json'}});if(!res.ok)return;
      const data=await res.json();if(!data?.ok)return;
      renderPromotions(data.promotions||[]);renderShop(data.products||[]);
    }catch(err){console.info('Plant Guide CMS ist noch nicht eingerichtet.',err)}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
