/* Sample inventory. Replace these records and booking URLs with real packages.
   All views use this data; comparison values never come from rendered markup. */
(() => {
  'use strict';
  const BOOKING_URL = '../tailor-made.html';
  const tours = [
    {id:'nile',title:'Luxor & Aswan Nile Cruise',city:'Luxor · Aswan',image:'images/nile.webp',alt:'The Nile and riverside scenery in Aswan',style:'SLOW TRAVEL',badge:'Most popular',featured:true,price:890,rating:4.9,reviews:128,description:'Follow the river between timeless temples and palm-lined shores, with unhurried afternoons on deck and an Egyptologist bringing every stop to life.',days:5,nights:4,group:12,meals:'Full board',stay:'5-star cruise cabin',activities:{guide:true,boat:true,desert:false,snorkel:false},cancellation:'Free until 14 days before',flexibility:'One date change included',pace:1,paceLabel:'Easy',paceDetail:'Short walks, plenty of downtime'},
    {id:'dahab',title:'Dahab Diving & Desert Safari',city:'Dahab · South Sinai',image:'images/diving.jpeg',alt:'Red Sea diving inspiration',style:'SEA & ADVENTURE',badge:'For the adventurous',price:620,rating:4.8,reviews:86,description:'Trade the everyday for coral gardens, desert trails and Bedouin tea. A relaxed coastal base meets a little adventure beneath the surface.',days:6,nights:5,group:8,meals:'Breakfast + 2 dinners',stay:'3-star beach lodge',activities:{guide:true,boat:false,desert:true,snorkel:true},cancellation:'Free until 7 days before',flexibility:'One date change included',pace:3,paceLabel:'Active',paceDetail:'Water activities and desert walking'},
    {id:'siwa',title:'Siwa Oasis Expedition',city:'Siwa · Western Desert',image:'images/desert.webp',alt:'Desert safari landscape in Egypt',style:'OFF THE BEATEN PATH',badge:'A different side of Egypt',price:540,rating:4.9,reviews:64,description:'Slow down among palm groves, explore ancient mud-brick lanes and watch the dunes turn gold. An intimate escape into the Western Desert.',days:4,nights:3,group:8,meals:'Full board',stay:'Boutique eco-lodge',activities:{guide:true,boat:false,desert:true,snorkel:false},cancellation:'Free until 14 days before',flexibility:'Date changes subject to availability',pace:2,paceLabel:'Moderate',paceDetail:'Uneven paths and optional dune walks'},
    {id:'cairo',title:'Cairo & Giza Timeless Treasures',city:'Cairo · Giza',image:'images/giza.webp',alt:'Pyramids rising above the Giza plateau',style:'CULTURE & HISTORY',badge:'Best value',price:295,rating:4.8,reviews:214,description:'Stand beneath the pyramids, discover extraordinary museum collections and wander the old city with a local guide who knows its hidden corners.',days:3,nights:2,group:10,meals:'Breakfast + 2 lunches',stay:'4-star city hotel',activities:{guide:true,boat:false,desert:false,snorkel:false},cancellation:'Free until 7 days before',flexibility:'One date change included',pace:2,paceLabel:'Moderate',paceDetail:'City walks and museum visits'},
    {id:'red-sea',title:'Red Sea Reefs & Island Escape',city:'Hurghada · Giftun Islands',image:'images/red-sea.jpg',alt:'Red Sea holiday scenery near Hurghada',style:'SUN & SLOW DAYS',badge:'Coastal favourite',price:710,rating:4.7,reviews:102,description:'Clear water, island picnics and the freedom to do very little. Discover colourful reefs by day and return to a comfortable seaside retreat.',days:5,nights:4,group:12,meals:'Full board',stay:'5-star beach resort',activities:{guide:true,boat:true,desert:false,snorkel:true},cancellation:'Free until 14 days before',flexibility:'One date change included',pace:1,paceLabel:'Easy',paceDetail:'Gentle swimming, optional reef outings'},
    {id:'alexandria',title:'Alexandria Mediterranean Weekend',city:'Alexandria',image:'images/alexandria.webp',alt:'Mediterranean city scenery in Alexandria',style:'CITY & COAST',badge:'The perfect short escape',price:260,rating:4.7,reviews:73,description:'Sea breezes, storied streets and long lunches by the water. Discover the city’s layered history on a small-group Mediterranean getaway.',days:3,nights:2,group:10,meals:'Breakfast + 2 lunches',stay:'4-star city hotel',activities:{guide:true,boat:false,desert:false,snorkel:false},cancellation:'Free until 7 days before',flexibility:'One date change included',pace:2,paceLabel:'Moderate',paceDetail:'City walks and museum visits'}
  ];
  const LIMIT = 3;
  const STORAGE_KEY = 'egypt-tour-comparison:v1';
  const byId = new Map(tours.map(t => [t.id, t]));
  const $ = id => document.getElementById(id);
  const grid = $('tour-grid');
  const dialog = $('comparison-dialog');
  const switchInput = $('differences');
  const money = value => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let selected = [];
  let toastTimer;
  let restoreFocus = null;

  // Ignore stale/unknown IDs, duplicates and corrupted storage. Private browsing
  // or disabled storage still leaves comparison fully usable in this tab.
  function cleanSelection(value) {
    return Array.isArray(value) ? [...new Set(value)].filter(id => byId.has(id)).slice(0,LIMIT) : [];
  }
  try { selected = cleanSelection(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch (_) { selected = []; }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(selected)); } catch (_) { /* In-memory selection remains available. */ }
  }
  function announce(message) {
    clearTimeout(toastTimer);
    $('toast').textContent = message;
    toastTimer = setTimeout(() => { $('toast').textContent = ''; },4000);
  }
  const booking = tour => `${BOOKING_URL}?tour=${encodeURIComponent(tour.id)}`;
  const duration = tour => `${tour.days} days / ${tour.nights} nights`;

  // Cards are built once. Updating selection only changes the button and border,
  // preserving keyboard focus and avoiding repeated image loads.
  function renderCards() {
    grid.innerHTML = tours.map((tour,index) => `
      <article class="tour-card" data-card="${tour.id}" aria-labelledby="title-${tour.id}">
        <div class="card-photo"><a href="${booking(tour)}" aria-label="Explore ${escape(tour.title)}"><img src="${tour.image}" alt="${escape(tour.alt)}" title="${escape(tour.title)}" width="600" height="380" loading="${index<3?'eager':'lazy'}"></a><span class="card-badge ${tour.featured?'featured':''}">${escape(tour.badge)}</span></div>
        <div class="card-content"><div class="card-kicker"><span>${tour.style}</span><span class="rating" aria-label="Rated ${tour.rating} out of 5">★ ${tour.rating.toFixed(1)} <span>(${tour.reviews})</span></span></div>
          <h3 id="title-${tour.id}"><a href="${booking(tour)}">${escape(tour.title)}</a></h3>
          <p class="card-meta">${duration(tour)} <span aria-hidden="true">·</span> ${escape(tour.city)}</p>
          <p class="card-description">${escape(tour.description)}</p>
          <div class="card-price"><div class="price"><strong>${money(tour.price)}</strong><small>USD / per person</small></div><a class="details-link" href="${booking(tour)}">Explore trip <span aria-hidden="true">↗</span></a></div>
          <button class="compare-toggle" type="button" data-toggle="${tour.id}" aria-pressed="false" aria-label="Add ${escape(tour.title)} to comparison"><span aria-hidden="true">＋</span> Add to compare</button>
        </div>
      </article>`).join('');
  }

  // Comparison rows are data-driven; their complete displayed values determine
  // whether the row differs. A single selected tour cannot have differences.
  const activities = [['guide','Local guide'],['boat','Boat excursion'],['desert','Desert safari'],['snorkel','Diving / snorkelling']];
  const rows = [
    {label:'Duration & group',value:t=>[t.days,t.nights,t.group],html:t=>`<span class="feature-primary">${duration(t)}</span><span class="feature-secondary">Up to ${t.group} travellers</span>`},
    {label:'Meals & comfort',value:t=>[t.meals,t.stay],html:t=>`<span class="feature-primary">${escape(t.meals)}</span><span class="feature-secondary">${escape(t.stay)}</span>`},
    {label:'Included activities',value:t=>activities.map(([key])=>t.activities[key]),html:t=>`<ul class="activity-list">${activities.map(([key,label])=>`<li class="${t.activities[key]?'':'excluded'}"><span class="activity-icon ${t.activities[key]?'':'no'}" aria-hidden="true">${t.activities[key]?'✓':'×'}</span><span><span class="sr-only">${t.activities[key]?'Included:':'Not included:'} </span>${label}</span></li>`).join('')}</ul>`},
    {label:'Cancellation & flexibility',value:t=>[t.cancellation,t.flexibility],html:t=>`<span class="feature-primary">${escape(t.cancellation)}</span><span class="feature-secondary">${escape(t.flexibility)}</span>`},
    {label:'Difficulty & pace',value:t=>[t.pace,t.paceLabel,t.paceDetail],html:t=>`<span class="feature-primary">${escape(t.paceLabel)}</span><div class="pace" aria-hidden="true">${[1,2,3].map(level=>`<i class="${level<=t.pace?'filled':''}"></i>`).join('')}</div><span class="feature-secondary">${escape(t.paceDetail)}</span>`}
  ];
  function renderMatrix() {
    const shortlist = selected.map(id=>byId.get(id));
    // Always distinguish one option, even when the popular cruise is absent.
    const highlight = shortlist.find(t=>t.featured) || shortlist.reduce((best,t)=>!best || t.price<best.price?t:best,null);
    $('comparison-table').style.setProperty('--columns',shortlist.length);
    $('matrix-head').innerHTML = `<tr><th scope="col">Your next adventure<br><span class="feature-secondary">${shortlist.length} ${shortlist.length===1?'journey':'journeys'} selected</span></th>${shortlist.map(t=>`<th scope="col" class="${t===highlight?'featured-column':''}"><div class="matrix-card"><a href="${booking(t)}"><img src="${t.image}" alt="${escape(t.alt)}" title="${escape(t.title)}" width="400" height="230"></a><button class="icon-button column-remove" data-remove="${t.id}" type="button" aria-label="Remove ${escape(t.title)} from comparison">×</button>${t===highlight?`<span class="matrix-badge">${t.featured?'Most popular':'Lowest price in your shortlist'}</span>`:''}<h3><a href="${booking(t)}">${escape(t.title)}</a></h3><div class="price"><strong>${money(t.price)}</strong><small>USD / per person</small></div><span class="rating" aria-label="Rated ${t.rating} out of 5 from ${t.reviews} sample reviews">★ ${t.rating.toFixed(1)} · ${t.reviews} reviews</span><a class="button" href="${booking(t)}" aria-label="Book ${escape(t.title)}">Book now <span aria-hidden="true">↗</span></a></div></th>`).join('')}</tr>`;
    $('matrix-body').innerHTML = rows.map(row=>{
      const differs = shortlist.length>1 && new Set(shortlist.map(t=>JSON.stringify(row.value(t)))).size>1;
      return `<tr class="${differs?'is-different':'is-same'}"><th scope="row">${row.label}</th>${shortlist.map(t=>`<td>${row.html(t)}</td>`).join('')}</tr>`;
    }).join('');
    switchInput.disabled = shortlist.length<2;
    $('comparison-hint').textContent = shortlist.length<2 ? 'Add another journey to highlight differences. You can still explore this package.' : 'Compare the little details before your next big adventure.';
    $('comparison-table').classList.toggle('differences-on',switchInput.checked && shortlist.length>1);
  }
  function sync() {
    grid.querySelectorAll('[data-toggle]').forEach(button=>{
      const active = selected.includes(button.dataset.toggle);
      button.setAttribute('aria-pressed',String(active));
      button.setAttribute('aria-label',`${active?'Remove':'Add'} ${byId.get(button.dataset.toggle).title} ${active?'from':'to'} comparison`);
      button.innerHTML = `<span aria-hidden="true">${active?'✓':'＋'}</span> ${active?'Added to compare':'Add to compare'}`;
      button.closest('.tour-card').classList.toggle('is-selected',active);
    });
    $('selection-count').textContent = `${selected.length} of ${LIMIT} selected`;
    $('bar-count').textContent = `${selected.length} ${selected.length===1?'journey':'journeys'} selected`;
    $('compare-bar').hidden = selected.length===0;
    document.body.classList.toggle('has-selection',selected.length>0);
    $('selected-thumbnails').innerHTML = selected.map(id=>{const t=byId.get(id);return `<button class="thumbnail-button" type="button" data-remove="${id}" aria-label="Remove ${escape(t.title)} from comparison"><img src="${t.image}" alt="${escape(t.title)}" title="${escape(t.title)}" width="43" height="47"><span aria-hidden="true">×</span></button>`;}).join('');
    if (dialog.open) {
      if (!selected.length) closeDialog();
      else renderMatrix();
    }
  }
  function toggle(id) {
    if (!byId.has(id)) return;
    if (selected.includes(id)) { remove(id); return; }
    if (selected.length===LIMIT) { announce('Your shortlist is full. Remove a journey to compare another.'); return; }
    selected.push(id); persist(); sync();
    announce(`${byId.get(id).title} added to your shortlist.`);
  }
  function remove(id) {
    if (!selected.includes(id)) return;
    const index = selected.indexOf(id);
    const inModal = dialog.open;
    const fromThumb = document.activeElement?.closest('.thumbnail-button');
    selected = selected.filter(item=>item!==id); persist(); sync();
    announce(`${byId.get(id).title} removed.`);
    // Rebuilding columns/thumbnail buttons removes their focused element. Move
    // focus to the nearest remaining remove control rather than losing it.
    if (inModal && dialog.open) {
      const buttons=dialog.querySelectorAll('[data-remove]');
      (buttons[Math.min(index,buttons.length-1)] || $('close-dialog')).focus({preventScroll:true});
    } else if (fromThumb) {
      const buttons=$('selected-thumbnails').querySelectorAll('[data-remove]');
      (buttons[Math.min(index,buttons.length-1)] || grid.querySelector(`[data-toggle="${id}"]`)).focus({preventScroll:true});
    }
  }
  function openDialog() {
    if (!selected.length) return;
    restoreFocus = document.activeElement;
    renderMatrix(); dialog.showModal(); document.body.classList.add('modal-open');
    $('matrix-scroll').scrollLeft=0; $('matrix-scroll').scrollTop=0;
    $('close-dialog').focus({preventScroll:true});
  }
  function closeDialog() { if(dialog.open) dialog.close(); }
  dialog.addEventListener('close',()=>{
    document.body.classList.remove('modal-open');
    const target=selected.length && restoreFocus?.isConnected ? restoreFocus : grid.querySelector('[data-toggle]');
    target?.focus({preventScroll:true});
  });
  // Delegation also handles controls rebuilt after removing a column.
  grid.addEventListener('click',event=>{const button=event.target.closest('[data-toggle]');if(button)toggle(button.dataset.toggle);});
  for (const container of [dialog,$('selected-thumbnails')]) container.addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(button)remove(button.dataset.remove);});
  $('clear-all').addEventListener('click',()=>{selected=[];persist();sync();announce('Your shortlist has been cleared.');grid.querySelector('[data-toggle]')?.focus({preventScroll:true});});
  $('compare-now').addEventListener('click',openDialog);
  $('close-dialog').addEventListener('click',closeDialog);
  $('keep-exploring').addEventListener('click',closeDialog);
  switchInput.addEventListener('change',()=>{$('comparison-table').classList.toggle('differences-on',switchInput.checked && selected.length>1);});
  // Close only when both press and release land outside the dialog rectangle.
  let backdropPress=false;
  const outside=event=>{const r=dialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
  dialog.addEventListener('pointerdown',event=>{backdropPress=event.target===dialog && outside(event);});
  dialog.addEventListener('click',event=>{if(backdropPress && event.target===dialog && outside(event))closeDialog();backdropPress=false;});
  // Keep multiple tabs consistent without rewriting the originating tab's state.
  window.addEventListener('storage',event=>{
    if (event.key!==STORAGE_KEY && event.key!==null) return;
    try { selected=cleanSelection(JSON.parse(event.newValue || '[]')); } catch (_) { selected=[]; }
    const hadModalFocus=dialog.open;sync();if(hadModalFocus && dialog.open)$('close-dialog').focus({preventScroll:true});
  });
  renderCards();sync();
})();
