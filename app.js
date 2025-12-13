/*
  app.js - plain JS port of the React/Tailwind UI
  - Replace WHATSAPP_NUMBER with your number (no leading +).
  - Uses GViz JSON endpoint for product list. Make sure the sheet (Sheet2) is published to web.
*/

const WHATSAPP_NUMBER = '917381749483'; // <<< REPLACE with your number (e.g. 919876543210)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1R6ppSREZ6lwhx0PDP5KKKHvyIOi5O2J2i9qnhhuX4ig/gviz/tq?tqx=out:json&sheet=Sheet2';

let PRODUCTS = [];

/* ------------------ Helpers ------------------ */
function escapeHtml(s){ return String(s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function waLink(text){ return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`; }
function throttle(fn, wait=180){ let last=0; return (...args)=>{ const now=Date.now(); if(now-last>=wait){ last=now; fn(...args); } } }

/* ------------------ Load products from Google Sheet (GViz JSON) ------------------ */
async function loadProductsFromSheet(){
  try {
    const res = await fetch(SHEET_URL);
    let txt = await res.text();
    // GViz returns JS wrapper — extract JSON
    txt = txt.substring(txt.indexOf('{'), txt.lastIndexOf('}')+1);
    const json = JSON.parse(txt);
    const rows = json.table.rows || [];
    PRODUCTS = rows.map(r => {
      const c = r.c || [];
      return {
        id: c[0]?.v || '',
        name: c[1]?.v || '',
        price: Number(c[2]?.v || 0),
        category: c[3]?.v || '',
        description: c[4]?.v || '',
        image: c[5]?.v || ''
      };
    }).filter(p => p.name);
    return PRODUCTS;
  } catch (err) {
    console.error('Error loading sheet:', err);
    return [];
  }
}

/* ------------------ Render UI ------------------ */
function renderProducts(list){
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';
  list.forEach(p => {
    const art = document.createElement('article');
    art.className = 'card';
    art.innerHTML = `
      <img src="${escapeHtml(p.image || 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1200&q=80')}" alt="${escapeHtml(p.name)}" />
      <div class="card-body">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.description)}</p>
        <div class="card-row">
          <div class="price">₹${p.price}</div>
          <div class="card-actions">
            <button class="view-btn" data-id="${p.id}">View</button>
            <button class="order-btn" data-id="${p.id}">Order</button>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(art);
  });

  document.getElementById('count').textContent = `${list.length} items`;

  // attach handlers
  grid.querySelectorAll('.view-btn').forEach(b => b.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    openModal(PRODUCTS.find(x => x.id === id));
  }));
  grid.querySelectorAll('.order-btn').forEach(b => b.addEventListener('click', (e) => {
    const id = e.currentTarget.dataset.id;
    openModal(PRODUCTS.find(x => x.id === id));
  }));
}

/* ------------------ Search & Filter ------------------ */
function setupFilters(){
  const search = document.getElementById('search');
  const category = document.getElementById('category');

  // fill categories
  const cats = ['All', ...Array.from(new Set(PRODUCTS.map(p => p.category).filter(Boolean)))];
  category.innerHTML = cats.map(c => `<option>${c}</option>`).join('');

  const apply = () => {
    const q = (search.value||'').trim().toLowerCase();
    const cat = category.value;
    const out = PRODUCTS.filter(p => {
      const txt = (p.name + ' ' + p.description + ' ' + p.category).toLowerCase();
      const matchQ = !q || txt.includes(q);
      const matchC = cat === 'All' || p.category === cat;
      return matchQ && matchC;
    });
    renderProducts(out);
  };

  search.addEventListener('input', throttle(apply, 150));
  category.addEventListener('change', apply);
}

/* ------------------ Modal / WhatsApp ------------------ */
let active = null;
let qty = 1;

function initModal(){
  const modal = document.getElementById('modal');
  const backdrop = document.getElementById('modal-backdrop');
  const close = document.getElementById('modal-close');
  const cancel = document.getElementById('modal-cancel');
  const img = document.getElementById('modal-image');
  const title = document.getElementById('modal-title');
  const desc = document.getElementById('modal-desc');
  const price = document.getElementById('modal-price');
  const qDec = document.getElementById('qty-decrease');
  const qInc = document.getElementById('qty-increase');
  const qVal = document.getElementById('qty-value');
  const bName = document.getElementById('buyer-name');
  const bAddr = document.getElementById('buyer-address');
  const send = document.getElementById('send-whatsapp');

  function open(p){
    active = p;
    qty = 1;
    img.src = p.image || '';
    title.textContent = p.name;
    desc.textContent = p.description;
    price.textContent = `₹${p.price}`;
    qVal.textContent = qty;
    bName.value = '';
    bAddr.value = '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
  }

  function closeModal(){
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden','true');
    active = null;
  }

  // expose openModal
  window.openModal = open;

  close.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);
  cancel.addEventListener('click', closeModal);

  qDec.addEventListener('click', ()=> { qty = Math.max(1, qty-1); qVal.textContent = qty; });
  qInc.addEventListener('click', ()=> { qty += 1; qVal.textContent = qty; });

  send.addEventListener('click', () => {
    if(!active) return;
    const name = (bName.value||'<Your name>');
    const addr = (bAddr.value||'<Delivery address>');
    const total = active.price * qty;
    const msg = `Hello! I'd like to order:\n\nProduct: ${active.name}\nQty: ${qty}\nPrice (each): ₹${active.price}\nTotal: ₹${total}\n\nName: ${name}\nAddress: ${addr}\n\nPlease confirm availability and delivery time.`;
    window.open(waLink(msg), '_blank');
  });
}

/* ------------------ Init ------------------ */
document.addEventListener('DOMContentLoaded', async () => {
  // Set quick whatsapp links
  document.getElementById('whatsapp-top').href = waLink('Hi! I have a question about gifts');
  document.getElementById('whatsapp-footer').href = waLink('Hi! I have a question about gifts');
  document.getElementById('order-cta').href = waLink('Hi! I want to place an order');

  await loadProductsFromSheet();
  if(!PRODUCTS.length){
    document.getElementById('products-grid').innerHTML = '<div style="padding:28px;text-align:center;color:#9aa0a6">No products found — check Sheet2 or publish the sheet to web.</div>';
    return;
  }
  renderProducts(PRODUCTS);
  setupFilters();
  initModal();

  document.getElementById('browse-btn').addEventListener('click', ()=> {
    document.getElementById('products-section').scrollIntoView({behavior:'smooth'});
  });
});
