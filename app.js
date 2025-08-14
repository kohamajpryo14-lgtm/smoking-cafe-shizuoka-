const STATE = { shops: [], filtered: [], area: '', query: '', onlyFullSmoke: false, hasWifi: false, hasPower: false, hasParking: false, sort: 'score', };
const els = { area: document.getElementById('area'), query: document.getElementById('query'), onlyFullSmoke: document.getElementById('onlyFullSmoke'), hasWifi: document.getElementById('hasWifi'), hasPower: document.getElementById('hasPower'), hasParking: document.getElementById('hasParking'), sort: document.getElementById('sort'), reset: document.getElementById('reset'), cards: document.getElementById('cards'), count: document.getElementById('count'), tpl: document.getElementById('card-tpl') };
document.getElementById('year').textContent = new Date().getFullYear();
let map, markers;
function initMap(center=[35.12,138.92], zoom=11){
  if(map) return;
  map = L.map('map').setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution:'&copy; OpenStreetMap'}).addTo(map);
  markers = L.layerGroup().addTo(map);
}
function updateMap(list){
  if(!map) initMap();
  markers.clearLayers();
  let bounds = [];
  list.forEach(s => {
    if(typeof s.lat === 'number' && typeof s.lng === 'number'){
      const m = L.marker([s.lat, s.lng]).addTo(markers);
      m.bindPopup(`<b>${s.name}</b><br>${s.area}｜${s.station||''}<br><a href='${s.mapUrl}' target='_blank' rel='noopener'>Googleマップ</a>`);
      bounds.push([s.lat, s.lng]);
    }
  });
  if(bounds.length){
    map.fitBounds(bounds, {padding:[30,30]});
  }
}
async function boot(){
  const res = await fetch('./data/shops.json');
  const json = await res.json();
  STATE.shops = json.shops || [];
  populateAreas();
  // AREA_PRESET from page or query parameter
  const urlParams = new URLSearchParams(location.search);
  const preset = window.AREA_PRESET || urlParams.get('area') || '';
  if(preset){
    STATE.area = preset;
    if(els.area){ els.area.value = preset; }
  }
  render();
  bindEvents();
  initMap();
}
function populateAreas(){
  const areas = Array.from(new Set(STATE.shops.map(s => s.area))).sort();
  for(const a of areas){
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    els.area.appendChild(opt);
  }
}
function bindEvents(){
  els.area.addEventListener('change', e => { STATE.area = e.target.value; render(); });
  els.query.addEventListener('input', e => { STATE.query = e.target.value.trim(); render(); });
  els.onlyFullSmoke.addEventListener('change', e => { STATE.onlyFullSmoke = e.target.checked; render(); });
  els.hasWifi.addEventListener('change', e => { STATE.hasWifi = e.target.checked; render(); });
  els.hasPower.addEventListener('change', e => { STATE.hasPower = e.target.checked; render(); });
  els.hasParking.addEventListener('change', e => { STATE.hasParking = e.target.checked; render(); });
  els.sort.addEventListener('change', e => { STATE.sort = e.target.value; render(); });
  els.reset.addEventListener('click', () => {
    STATE.area = ''; STATE.query=''; STATE.onlyFullSmoke=false; STATE.hasWifi=false; STATE.hasPower=false; STATE.hasParking=false; STATE.sort='score';
    els.area.value = ''; els.query.value=''; els.onlyFullSmoke.checked=false; els.hasWifi.checked=false; els.hasPower.checked=false; els.hasParking.checked=false; els.sort.value='score';
    render();
  });
}
function render(){
  const q = STATE.query.toLowerCase();
  let list = STATE.shops.filter(s => {
    if(STATE.area && s.area !== STATE.area) return false;
    if(STATE.onlyFullSmoke && s.smoking !== '全面喫煙可') return false;
    if(STATE.hasWifi && !(s.features||[]).includes('Wi-Fi')) return false;
    if(STATE.hasPower && !(s.features||[]).includes('電源')) return false;
    if(STATE.hasParking && !(s.features||[]).includes('駐車場')) return false;
    if(q){
      const hay = [s.name, s.area, s.station, s.desc, s.smoking, ...(s.features||[])].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  const sortKey = STATE.sort;
  list.sort((a,b) => {
    if(sortKey === 'rating') return (b.rating||0) - (a.rating||0);
    if(sortKey === 'reviews') return (b.reviews||0) - (a.reviews||0);
    if(sortKey === 'updated') return new Date(b.updated||0) - new Date(a.updated||0);
    const sa = (a.rating||0)*2 + (a.reviews||0)/50 + (a.smoking === '全面喫煙可' ? 1 : 0);
    const sb = (b.rating||0)*2 + (b.reviews||0)/50 + (b.smoking === '全面喫煙可' ? 1 : 0);
    return sb - sa;
  });
  STATE.filtered = list;
  els.count.textContent = `該当 ${list.length} 件`;
  els.cards.innerHTML = '';
  for(const s of list) els.cards.appendChild(card(s));
  updateMap(list);
}
function card(s){
  const node = els.tpl.content.cloneNode(true);
  const root = node.querySelector('.shop');
  const badge = node.querySelector('[data-smoking]');
  const img = node.querySelector('img');
  const name = node.querySelector('.name');
  const area = node.querySelector('.area');
  const rating = node.querySelector('.rating');
  const features = node.querySelector('.features');
  const desc = node.querySelector('.desc');
  const map = node.querySelector('.map');
  const site = node.querySelector('.site');
  const coffee = node.querySelector('.coffee');
  const ashtray = node.querySelector('.ashtray');
  const thumb = node.querySelector('.thumb');
  badge.dataset.smoking = s.smoking; badge.textContent = s.smoking;
  name.textContent = s.name;
  area.textContent = `${s.area}｜${s.station||'最寄り不明'}`;
  rating.textContent = `★${s.rating?.toFixed(1) ?? '–'}（${s.reviews ?? 0}件）`;
  features.textContent = (s.features||[]).join('・');
  desc.textContent = s.desc || '';
  if(s.photo){ img.src = s.photo; img.alt = `${s.name}の外観または内観写真`; }else{ img.alt = `${s.name}の画像`; }
  map.href = s.mapUrl;
  if (s.siteUrl){ site.href = s.siteUrl; } else { site.style.display = 'none'; }
  coffee.href = (s.aff && s.aff.coffee) ? s.aff.coffee : `https://www.amazon.co.jp/s?k=%E3%82%B3%E3%83%BC%E3%83%92%E3%83%BC%E8%B1%86&tag=${window.ASSOC||''}`;
  ashtray.href = (s.aff && s.aff.ashtray) ? s.aff.ashtray : `https://www.amazon.co.jp/s?k=%E6%90%BA%E5%B8%AF%E7%81%AB%E7%AE%A1&tag=${window.ASSOC||''}`;
  thumb.addEventListener('click', () => window.open(s.mapUrl, '_blank', 'noopener'));
  return root;
}
boot();