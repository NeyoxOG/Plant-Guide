(() => {
  const selector = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let opener = null;

  function visibleItems(root) {
    return [...root.querySelectorAll(selector)].filter(el => el.getClientRects().length && el.getAttribute('aria-hidden') !== 'true');
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-service],#reviewOpen,[data-open],[data-quick]');
    if (trigger) opener = trigger;
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const layer = [...document.querySelectorAll('.modal.show,.sheet:not([hidden])')].at(-1);
    if (!layer) return;
    const items = visibleItems(layer);
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.attributeName === 'hidden' && record.target.classList.contains('sheet')) {
        if (!record.target.hidden) visibleItems(record.target)[0]?.focus();
        else if (![...document.querySelectorAll('.sheet:not([hidden])')].length) opener?.focus();
      }
      if (record.attributeName === 'class' && record.target.classList.contains('modal') && !record.target.classList.contains('show')) opener?.focus();
    }
  });
  document.querySelectorAll('.sheet,.modal').forEach(el => observer.observe(el, {attributes:true, attributeFilter:['hidden','class']}));
})();
