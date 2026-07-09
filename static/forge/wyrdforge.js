// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════
// Mode: LOCAL (author, full CRUD + export) vs PUBLIC (add-only, canonical read-only).
// Detected by hostname; ?mode=public forces public locally for testing.
const _urlParams = new URLSearchParams(location.search);
const IS_LOCAL  = _urlParams.get('mode')!=='public' && ['localhost','127.0.0.1',''].includes(location.hostname);
const IS_PUBLIC = !IS_LOCAL;

// Working arrays used throughout the app. In PUBLIC these hold canonical + user overlay (rebuilt at init).
let factions=[], fighters=[], weapons=[], weaponRules=[], items=[], abilities=[];
let keywords = {race:[], archetype:[]};

// Metadata per entity kind: localStorage key, repo data filename, and accessors on the globals above.
const KINDS = {
  factions:    { ls:'wyrdforge_factions',     file:'factions.json',     get:()=>factions,    set:v=>{factions=v;} },
  fighters:    { ls:'wyrdforge_fighters',     file:'fighters.json',     get:()=>fighters,    set:v=>{fighters=v;} },
  weapons:     { ls:'wyrdforge_weapons',      file:'weapons.json',      get:()=>weapons,     set:v=>{weapons=v;} },
  weaponRules: { ls:'wyrdforge_weapon_rules', file:'weapon-rules.json', get:()=>weaponRules, set:v=>{weaponRules=v;} },
  items:       { ls:'wyrdforge_items',        file:'items.json',        get:()=>items,       set:v=>{items=v;} },
  abilities:   { ls:'wyrdforge_abilities',    file:'abilities.json',    get:()=>abilities,   set:v=>{abilities=v;} },
};
// Canonical (repo) data in PUBLIC mode, and the id sets that mark rows as read-only.
const canonical = {};
const canonicalIds = { factions:new Set(), fighters:new Set(), weapons:new Set(), weaponRules:new Set(), items:new Set(), abilities:new Set() };
/** True if the given row may be edited/deleted: always in local, only non-canonical rows in public. */
function canEdit(kind, id){ return IS_LOCAL || !canonicalIds[kind].has(String(id)); }

const _defaultCP = { base:40, move:15, fight:10, shoot:10, defense:10, health:10, bravery:10 };
const _defaultWCP = { base:15, range:10, attacks:15, hit:10, crit:5 };
const _defaultWB_melee  = { range:1, attacks:3, hit:2, crit:3 };
const _defaultWB_ranged = { range:6, attacks:3, hit:2, crit:3 };
const _defaultFB  = { move:5, fight:3, shoot:3, defense:3, health:8, bravery:5 };
let COST_PROFILE          = {..._defaultCP};
let WEAPON_COST_PROFILE   = {..._defaultWCP};
let WEAPON_BASELINE_MELEE = {..._defaultWB_melee};
let WEAPON_BASELINE_RANGED= {..._defaultWB_ranged};
let FIGHTER_BASELINE      = {..._defaultFB};
// Keep a unified alias for code that doesn't need type distinction (overridden per-calculation)
let WEAPON_BASELINE = WEAPON_BASELINE_MELEE;

function toSlug(s) { return s.toLowerCase().trim().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''); }

function normalizeKeywords(kw){
  if(!kw || typeof kw!=='object' || Array.isArray(kw)) return {race:[],archetype:[]};
  return { race:Array.isArray(kw.race)?kw.race:[], archetype:Array.isArray(kw.archetype)?kw.archetype:[] };
}
function mergeKeywords(a,b){
  a=normalizeKeywords(a); b=normalizeKeywords(b);
  return { race:[...new Set([...a.race,...b.race])], archetype:[...new Set([...a.archetype,...b.archetype])] };
}

/** persist() saves the full set in local; in public it saves only the user-added (non-canonical) rows. */
function persist() {
  if(IS_LOCAL){
    for(const k in KINDS) localStorage.setItem(KINDS[k].ls, JSON.stringify(KINDS[k].get()));
    localStorage.setItem('wyrdforge_keywords', JSON.stringify(keywords));
  } else {
    for(const k in KINDS){
      const ids=canonicalIds[k];
      localStorage.setItem('wyrdforge_user_'+k, JSON.stringify(KINDS[k].get().filter(x=>!ids.has(String(x.id)))));
    }
    localStorage.setItem('wyrdforge_user_keywords', JSON.stringify(keywords));
  }
}
function persistCostProfiles(){
  localStorage.setItem('wyrdforge_cp_fighter', JSON.stringify(COST_PROFILE));
  localStorage.setItem('wyrdforge_cp_weapon',  JSON.stringify(WEAPON_COST_PROFILE));
  localStorage.setItem('wyrdforge_wb_melee',   JSON.stringify(WEAPON_BASELINE_MELEE));
  localStorage.setItem('wyrdforge_wb_ranged',  JSON.stringify(WEAPON_BASELINE_RANGED));
  localStorage.setItem('wyrdforge_fb',         JSON.stringify(FIGHTER_BASELINE));
}

// ── Repo data seeding ──────────────────────────────────────────────────────
async function fetchDataFile(file){
  try{
    const r = await fetch('./data/'+file, {cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  } catch(e){
    console.warn('WyrdForge: could not load data/'+file+' (this is expected on file://)', e);
    return null;
  }
}
async function seedFromRepo(){
  const files=['factions.json','fighters.json','weapons.json','weapon-rules.json','items.json','abilities.json','keywords.json','cost-profiles.json'];
  const [factionsD,fightersD,weaponsD,wrD,itemsD,abilitiesD,keywordsD,cpD] = await Promise.all(files.map(fetchDataFile));
  return {factions:factionsD,fighters:fightersD,weapons:weaponsD,weaponRules:wrD,items:itemsD,abilities:abilitiesD,keywords:keywordsD,costProfiles:cpD};
}
function normalizeSeededAbilities(list){
  return (list||[]).map(a=>{
    if(!a||typeof a!=='object') return a;
    let c=a.category;
    if(c==='specialization') c='strength';
    if(c==='faction') c='unique';
    return {...a, category:c};
  });
}
function normalizeSeededFighters(list){
  return (list||[]).map(f=> (f&&typeof f==='object') ? {fighter_type:f.fighter_type||'regular', ...f} : f);
}
/** Apply a cost-profiles.json object (same shape as the export) into the live profile globals. */
function applyCostProfilesFromFile(cp){
  if(!cp) return;
  if(cp.fighter){
    COST_PROFILE   = {..._defaultCP, base:cp.fighter.base_cost ?? _defaultCP.base, ...(cp.fighter.costs||{})};
    FIGHTER_BASELINE = {..._defaultFB, ...(cp.fighter.baselines||{})};
  }
  if(cp.weapon){
    WEAPON_COST_PROFILE   = {..._defaultWCP, base:cp.weapon.base_cost ?? _defaultWCP.base, ...(cp.weapon.costs||{})};
    WEAPON_BASELINE_MELEE = {..._defaultWB_melee,  ...(cp.weapon.baselines_melee||{})};
    WEAPON_BASELINE_RANGED= {..._defaultWB_ranged, ...(cp.weapon.baselines_ranged||{})};
  }
  WEAPON_BASELINE = WEAPON_BASELINE_MELEE;
}
/** PUBLIC only: recompose the working arrays from canonical data + the user overlay in localStorage. */
function rebuild(){
  if(IS_LOCAL) return;
  for(const k in KINDS){
    const user=JSON.parse(localStorage.getItem('wyrdforge_user_'+k)||'[]');
    KINDS[k].set([...(canonical[k]||[]), ...user]);
  }
}

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
function showView(name) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('view-'+name).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>{
    const navName = n.textContent.trim().toLowerCase().replace(/\s+/g,'-');
    if(navName===name) n.classList.add('active');
  });
  closeAllPanels();
  if(name!=='weapons') mh_reset();
  if(name==='fighters'){ fighters_populateFactionFilter(); fighters_render(); }
  if(name==='factions') factions_render();
  if(name==='weapons')  weapons_render();
  if(name==='weapon-rules') wr_render();
  if(name==='items') items_render();
  if(name==='abilities'){ abilities_populateCategoryFilter(); abilities_render(); }
  if(name==='cost-profiles') cp_load();
}
function closeAllPanels() {
  document.getElementById('overlay').classList.remove('open');
  document.getElementById('faction-panel').classList.remove('open');
  document.getElementById('fighter-panel').classList.remove('open');
  document.getElementById('weapon-panel').classList.remove('open');
  document.getElementById('wr-panel').classList.remove('open');
  document.getElementById('items-panel').classList.remove('open');
  document.getElementById('abilities-panel').classList.remove('open');
}
document.getElementById('overlay').addEventListener('click', closeAllPanels);

/** Toggle a panel between editable and read-only (view) mode. Disables inputs and hides the save footer. */
function panel_setReadonly(panelId, ro){
  const panel=document.getElementById(panelId);
  if(!panel) return;
  panel.classList.toggle('readonly', !!ro);
  panel.querySelectorAll('.panel-body input, .panel-body select, .panel-body textarea, .panel-body button').forEach(el=>{ el.disabled=!!ro; });
  const footer=panel.querySelector('.panel-footer');
  if(footer) footer.style.display = ro ? 'none' : '';
}
document.querySelectorAll('.nav-item')[0].classList.add('active');

// ══════════════════════════════════════════
// FACTIONS
// ══════════════════════════════════════════
let f_editingId=null, f_saveTimer=null, f_abilityIds=[];

function factions_renderAbilityTags(){
  const wrap=document.getElementById('f-ability-wrap');
  if(!wrap) return;
  Array.from(wrap.querySelectorAll('.tag')).forEach(t=>t.remove());
  const anchor=wrap.lastElementChild;
  f_abilityIds.forEach((id,i)=>{
    const ab=abilities.find(a=>String(a.id)===String(id));
    const typStr=ab&&ABILITY_TYPES[ab.ability_type]?`[${ABILITY_TYPES[ab.ability_type]}] `:'';
    const name=ab?(typStr+(ab.name||id)):id;
    const span=document.createElement('span');
    span.className='tag';
    span.innerHTML=`${name}<button class="tag-remove" onmousedown="event.preventDefault();factions_removeAbilityTag(${i})">✕</button>`;
    wrap.insertBefore(span,anchor);
  });
}
function factions_removeAbilityTag(idx){
  f_abilityIds.splice(idx,1);
  factions_renderAbilityTags(); factions_scheduleSave();
}
function factions_abilityKeydown(e){
  if(e.key==='Backspace'&&!e.target.value&&f_abilityIds.length){
    f_abilityIds.pop();
    factions_renderAbilityTags(); factions_scheduleSave();
  }
}
function factions_abilityAutocomplete(input){
  const val=input.value.trim().toLowerCase();
  const factionId=document.getElementById('f-id')?.value.trim()||'';
  const list=factionId?fighters_factionAbilitiesForFaction(factionId):[];
  const matches=list.filter(a=>{
    if(f_abilityIds.includes(a.id)) return false;
    return !val||(a.name||'').toLowerCase().includes(val);
  });
  const ac=document.getElementById('f-ability-ac');
  if(!matches.length){ac.style.display='none';return;}
  ac.style.display='block';
  ac.innerHTML=matches.map(a=>{
    const typStr=ABILITY_TYPES[a.ability_type]||a.ability_type||'';
    const display=(typStr?`[${typStr}] `:'')+(a.name||a.id);
    return `<div class="autocomplete-item" onmousedown="factions_selectAbility('${a.id}')">${display}</div>`;
  }).join('');
  ac.classList.toggle('drop-up',window.innerHeight-input.getBoundingClientRect().bottom<160);
}
function factions_selectAbility(id){
  if(!f_abilityIds.includes(id)) f_abilityIds.push(id);
  factions_renderAbilityTags();
  document.getElementById('f-ability-input').value='';
  factions_hideAbilityAc(); factions_scheduleSave();
}
function factions_hideAbilityAc(){
  const ac=document.getElementById('f-ability-ac');
  if(ac) ac.style.display='none';
}

function factions_render() {
  const tbody = document.getElementById('factions-tbody');
  if(!factions.length){
    tbody.innerHTML=`<tr><td colspan="4"><div class="empty-state"><span style="font-size:24px">⚑</span><p>No factions yet. Add one to get started.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=sortedList(factions,'factions').map(f=>{
    const fighterCount = fighters.filter(fi=>fi.faction===f.id).length;
    const equip = f.equipment||{};
    const weaponCount = Object.values(equip).filter(v=>v==='all'||v==='hero').length;
    const ro = IS_PUBLIC && canonicalIds.factions.has(String(f.id));
    return `<tr>
      <td>
        <div class="fighter-name faction-open-link" data-id="${f.id}" style="cursor:pointer">${f.name||'Untitled'}</div>
        <div class="fighter-id">${f.id||'—'}</div>
      </td>
      <td><span class="count${!fighterCount?' zero':''}">${fighterCount||'○'}</span></td>
      <td><span class="count${!weaponCount?' zero':''}">${weaponCount||'○'}</span></td>
      <td><div class="row-actions">${ro?'':`
        <button class="icon-btn faction-open-link" data-id="${f.id}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn danger faction-delete-btn" data-id="${f.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>`}
      </div></td>
    </tr>`;
  }).join('');
}

// Event delegation for factions table
document.getElementById('factions-tbody').addEventListener('click', e => {
  const openEl = e.target.closest('.faction-open-link');
  if(openEl){ const id=openEl.dataset.id; factions_openPanel(factions.find(f=>f.id===id), !canEdit('factions',id)); return; }
  const delEl = e.target.closest('.faction-delete-btn');
  if(delEl) factions_delete(delEl.dataset.id);
});

function factions_openPanel(faction, readOnly=false) {
  f_editingId = faction?.id||null;
  document.getElementById('f-name').value         = faction?.name||'';
  document.getElementById('f-id').value           = faction?.id||'';
  document.getElementById('f-desc').value         = faction?.description||'';
  document.getElementById('f-warband-size').value = faction?.warband_size ?? '';
  document.getElementById('f-rules').value        = faction?.special_rules||'';
  f_abilityIds=[...(faction?.faction_ability_ids||[])].map(String).filter(Boolean);
  factions_renderAbilityTags();
  document.getElementById('f-save-ind').textContent='';
  factions_renderFightersTab(f_editingId||'');
  factions_renderEquipmentTab(f_editingId||'');
  factions_switchTab('information');
  document.getElementById('overlay').classList.add('open');
  document.getElementById('faction-panel').classList.add('open');
  panel_setReadonly('faction-panel', readOnly);
  if(!readOnly) setTimeout(()=>document.getElementById('f-name').focus(),250);
}
function factions_renderFightersTab(factionId){
  const list = fighters.filter(f=>f.faction===factionId);
  const el = document.getElementById('ftab-fig-list');
  if(!list.length){
    el.innerHTML=`<div class="tab-empty">No fighters assigned yet.<br>Assign a faction to a fighter in the Fighters section.</div>`;
    return;
  }
  el.innerHTML=list.map(f=>`
    <div class="faction-fighter-item" onclick="factions_viewFighter('${f.id}')">
      <span class="faction-fighter-name">${f.name||'Untitled'}</span>
      <span class="eye-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </span>
    </div>`).join('');
}

function factions_viewFighter(fighterId){
  closeAllPanels();
  showView('fighters');
  setTimeout(()=>{
    fighters_openPanel(fighters.find(f=>f.id===fighterId));
  }, 280);
}
function factions_edit(id){ factions_openPanel(factions.find(f=>f.id===id)); }
function factions_newAbility(){
  if(f_saveTimer){ clearTimeout(f_saveTimer); f_saveTimer=null; }
  factions_save();
  const fid=f_editingId;
  if(!fid) return;
  showView('abilities');
  setTimeout(()=>{ abilities_openPanel({category: fid}); }, 280);
}
function factions_onNameInput(val){
  if(!f_editingId) document.getElementById('f-id').value=toSlug(val);
  factions_scheduleSave();
}
function factions_switchTab(name){
  document.querySelectorAll('#faction-panel .tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#faction-panel .tab').forEach(t=>t.classList.remove('active'));
  const tabMap={'information':'information','fig':'fig','weap':'weap'};
  document.getElementById('ftab-'+name).classList.add('active');
  document.querySelectorAll('#faction-panel .tab').forEach(t=>{
    const txt=t.textContent.trim();
    if((name==='information'&&txt==='Information')||(name==='fig'&&txt==='Fighters')||(name==='weap'&&txt==='Equipment'))
      t.classList.add('active');
  });
}
// wire tab buttons manually
document.querySelectorAll('#faction-panel .tab')[0].onclick=()=>factions_switchTab('information');
document.querySelectorAll('#faction-panel .tab')[1].onclick=()=>{ factions_renderFightersTab(f_editingId||''); factions_switchTab('fig'); };
document.querySelectorAll('#faction-panel .tab')[2].onclick=()=>{ factions_renderEquipmentTab(f_editingId||''); factions_switchTab('weap'); };

function factions_renderEquipmentTab(factionId){
  const faction = factions.find(f=>f.id===factionId);
  const equip   = faction?.equipment || {};
  const el      = document.getElementById('ftab-weap-list');

  const alpha = (a,b) => (a.name||'').localeCompare(b.name||'');
  const meleeWeapons   = weapons.filter(w=>w.type==='melee').sort(alpha);
  const naturalWeapons = weapons.filter(w=>w.type==='natural').sort(alpha);
  const rangedWeapons  = weapons.filter(w=>w.type==='ranged').sort(alpha);
  const armourItems   = items.filter(i=>i.type==='armour').sort(alpha);

  if(!meleeWeapons.length && !naturalWeapons.length && !rangedWeapons.length && !armourItems.length){
    el.innerHTML=`<div class="tab-empty">No weapons or armour items yet.<br>Add weapons in the Weapons section or armour in the Items section.</div>`;
    return;
  }

  const makeRow = (key, name, iconName, state) => {
    const stateClass = state==='all'?'state-all': state==='hero'?'state-hero':'';
    const stateLabel = state==='all'?'All fighters': state==='hero'?'HERO only':'Not available';
    return `<div class="equip-item ${stateClass}" onclick="factions_cycleEquip('${factionId}','${key}')">
      <span class="equip-item-icon"><i data-lucide="${iconName}" style="width:16px;height:16px;pointer-events:none"></i></span>
      <span class="equip-item-name">${name}</span>
      <span class="equip-item-status">${stateLabel}</span>
    </div>`;
  };

  let html = '';
  if(meleeWeapons.length){
    html += `<div class="equip-section-label">Melee</div>`;
    html += meleeWeapons.map(w=>makeRow(w.id, w.name||'Untitled', 'sword', equip[w.id]||'none')).join('');
  }
  if(naturalWeapons.length){
    html += `<div class="equip-section-label">Natural</div>`;
    html += naturalWeapons.map(w=>makeRow(w.id, w.name||'Untitled', 'feather', equip[w.id]||'none')).join('');
  }
  if(rangedWeapons.length){
    html += `<div class="equip-section-label">Ranged</div>`;
    html += rangedWeapons.map(w=>makeRow(w.id, w.name||'Untitled', 'bow-arrow', equip[w.id]||'none')).join('');
  }
  if(armourItems.length){
    html += `<div class="equip-section-label">Armour</div>`;
    html += armourItems.map(it=>makeRow('item:'+it.id, it.name||'Untitled', 'shield', equip['item:'+it.id]||'none')).join('');
  }
  el.innerHTML = html;
  lucide.createIcons({nodes: el.querySelectorAll('[data-lucide]')});
}

function factions_cycleEquip(factionId, weaponId){
  if(!canEdit('factions', factionId)) return;
  const idx = factions.findIndex(f=>f.id===factionId);
  if(idx===-1) return;
  if(!factions[idx].equipment) factions[idx].equipment={};
  const current = factions[idx].equipment[weaponId]||'none';
  const next = current==='none'?'all': current==='all'?'hero':'none';
  if(next==='none') delete factions[idx].equipment[weaponId];
  else factions[idx].equipment[weaponId]=next;
  persist();
  factions_render();
  factions_renderEquipmentTab(factionId);
}

function factions_scheduleSave(){ clearTimeout(f_saveTimer); f_saveTimer=setTimeout(factions_save,300); }
function factions_save(){
  if(f_editingId && !canEdit('factions', f_editingId)) return;
  const name=document.getElementById('f-name').value.trim();
  const id=document.getElementById('f-id').value.trim()||toSlug(name)||'untitled-'+Date.now();
  if(!name&&!id) return;
  const wbSize = parseInt(document.getElementById('f-warband-size').value);
  const data={id,name,description:document.getElementById('f-desc').value,warband_size:isNaN(wbSize)||wbSize<1?null:wbSize,special_rules:document.getElementById('f-rules').value,faction_ability_ids:[...f_abilityIds],fighters:[],weapons:[],equipment:{}};
  if(f_editingId){
    const idx=factions.findIndex(f=>f.id===f_editingId);
    if(idx!==-1){data.fighters=factions[idx].fighters||[];data.weapons=factions[idx].weapons||[];data.equipment=factions[idx].equipment||{};factions[idx]=data;}
  } else { factions.push(data); f_editingId=data.id; }
  persist(); factions_render();
  const ind=document.getElementById('f-save-ind');
  ind.textContent='✓ Saved'; setTimeout(()=>ind.textContent='',2000);
}
function factions_delete(id){
  if(!canEdit('factions', id)) return;
  if(!confirm('Delete this faction?')) return;
  factions=factions.filter(f=>f.id!==id); persist(); factions_render();
}
function factions_export(){
  const blob=new Blob([JSON.stringify(factions,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='factions.json';a.click();
}

// ══════════════════════════════════════════
// FIGHTERS
// ══════════════════════════════════════════
let fi_editingId=null, fi_saveTimer=null, fi_idTouched=false;
let fi_stats={move:5,fight:3,shoot:3,defense:3,health:10,bravery:5};
let fi_raceTags=[], fi_kwTags=[], fi_recruitableTags=[], fi_power=0;
let fi_factionAbilityIds=[];
let fi_limit=null; // null = unlimited, number = max per roster
let fi_defaultEquipment=[]; // array of "weapon:id" or "item:id" strings
let fi_fighterType='regular';
let fi_hiredCost=0;

const STAT_LIMITS={move:[1,20],fight:[1,10],shoot:[1,10],defense:[1,10],health:[2,30],bravery:[2,6]};

function stepStat(stat,dir){
  const [min,max]=STAT_LIMITS[stat];
  const step = stat==='health' ? 2 : 1;
  fi_stats[stat]=Math.max(min,Math.min(max,fi_stats[stat]+dir*step));
  renderStats(); fighters_updateCost();
}
function renderStats(){
  document.getElementById('stat-move').textContent    = fi_stats.move+'"';
  document.getElementById('stat-fight').textContent   = fi_stats.fight;
  document.getElementById('stat-shoot').textContent   = fi_stats.shoot;
  document.getElementById('stat-defense').textContent = fi_stats.defense;
  document.getElementById('stat-health').textContent  = fi_stats.health;
  document.getElementById('stat-bravery').textContent = fi_stats.bravery + '+';
}

function calcCost(){
  // Baselines — base cost covers these exact values, you only pay for deviation
  const BASELINE = FIGHTER_BASELINE;
  const moveDelta    = fi_stats.move    - BASELINE.move;
  const fightDelta   = fi_stats.fight   - BASELINE.fight;
  const shootDelta   = fi_stats.shoot   - BASELINE.shoot;
  const defenseDelta = fi_stats.defense - BASELINE.defense;
  const healthDelta  = fi_stats.health  - BASELINE.health;
  // bravery: lower index = better = more expensive. baseline index 3 (5+). negative delta = cheaper.
  const braveryDelta = BASELINE.bravery - fi_stats.bravery; // positive when fighter is better than baseline

  const rows=[
    {label:'Base cost',                                        value:COST_PROFILE.base},
    {label:`Move (${fi_stats.move}", base ${BASELINE.move}")`, value:moveDelta    * COST_PROFILE.move},
    {label:`Fight (${fi_stats.fight}, base ${BASELINE.fight})`,value:fightDelta   * COST_PROFILE.fight},
    {label:`Shoot (${fi_stats.shoot}, base ${BASELINE.shoot})`,value:shootDelta   * COST_PROFILE.shoot},
    {label:`Defense (${fi_stats.defense}, base ${BASELINE.defense})`, value:defenseDelta * COST_PROFILE.defense},
    {label:`Health (${fi_stats.health}, base ${BASELINE.health})`,    value:(healthDelta/2)*COST_PROFILE.health},
    {label:`Bravery (${fi_stats.bravery}+, base ${BASELINE.bravery}+)`, value:braveryDelta*COST_PROFILE.bravery},
    {label:'Power level adjustment',                           value:fi_power},
  ];
  const total=Math.max(0,rows.reduce((s,r)=>s+r.value,0));
  return {rows,total};
}
function fighters_updateCost(){
  if(fi_fighterType==='hired-sword') return;
  const {rows,total}=calcCost();
  document.getElementById('cost-total-label').textContent=`Recruitment Cost: ${total}gc`;
  document.getElementById('cost-breakdown').innerHTML=
    rows.map(r=>`<div class="cost-row"><span>${r.label}</span><span>${r.value>=0?'+':''}${r.value}gc</span></div>`).join('')+
    `<div class="cost-row"><span>Total</span><span>${total}gc</span></div>`;
}
function fighters_onPowerChange(val){
  fi_power=Math.round(parseInt(val)/5)*5;
  document.getElementById('pl-badge').textContent=(fi_power>=0?'+':'')+fi_power;
  fighters_updateCost();
}

// TAG INPUTS
function focusTagInput(id){ document.getElementById(id).focus(); }
function renderTags(type){
  const arr  = type==='race' ? fi_raceTags : fi_kwTags;
  const wrap = document.getElementById(type==='race' ? 'race-wrap' : 'kw-wrap');
  if(!wrap) return;
  // Remove existing tag spans
  Array.from(wrap.querySelectorAll('.tag')).forEach(t=>t.remove());
  // The last child is the contents div (holds input + autocomplete) — insert tags before it
  const anchor = wrap.lastElementChild;
  arr.forEach((t,i)=>{
    const span=document.createElement('span');
    span.className='tag';
    span.innerHTML=`${t}<button class="tag-remove" onmousedown="event.preventDefault();removeTag('${type}',${i})">✕</button>`;
    wrap.insertBefore(span, anchor);
  });
}
function removeTag(type,idx){
  if(type==='race') fi_raceTags.splice(idx,1); else fi_kwTags.splice(idx,1);
  renderTags(type);
}
function fighters_tagKeydown(e,type){
  if(e.key==='Enter'||e.key===','){
    e.preventDefault();
    const val=e.target.value.trim().toUpperCase();
    if(!val) return;
    if(type==='race'&&!fi_raceTags.includes(val)) fi_raceTags.push(val);
    else if(type!=='race'&&!fi_kwTags.includes(val)) fi_kwTags.push(val);
    e.target.value=''; renderTags(type); hideAutocomplete(type);
    try{ addKnownKeyword(type==='race'?'race':'archetype', val); }catch(_){}
  }
  if(e.key==='Backspace'&&!e.target.value){
    if(type==='race'&&fi_raceTags.length){fi_raceTags.pop();renderTags(type);}
    if(type==='kw'  &&fi_kwTags.length)  {fi_kwTags.pop();  renderTags(type);}
  }
}
function fighters_tagAutocomplete(input,type){
  const val=input.value.trim().toUpperCase();
  const pool=type==='race'?keywords.race:keywords.archetype;
  const existing=type==='race'?fi_raceTags:fi_kwTags;
  const matches=pool.filter(k=>k.startsWith(val)&&!existing.includes(k));
  const ac=document.getElementById(type==='race'?'race-ac':'kw-ac');
  if(!matches.length){ac.style.display='none';return;}
  ac.style.display='block';
  ac.innerHTML=matches.map(m=>`<div class="autocomplete-item" onmousedown="selectAutocomplete('${type}','${m}')">${m}</div>`).join('');
  ac.classList.toggle('drop-up', window.innerHeight - input.getBoundingClientRect().bottom < 160);
}
function selectAutocomplete(type,val){
  if(type==='race'){if(!fi_raceTags.includes(val))fi_raceTags.push(val);renderTags('race');document.getElementById('race-input').value='';hideAutocomplete('race');}
  else             {if(!fi_kwTags.includes(val))  fi_kwTags.push(val);  renderTags('kw');  document.getElementById('kw-input').value='';  hideAutocomplete('kw');}
}
function hideAutocomplete(type){ document.getElementById(type==='race'?'race-ac':'kw-ac').style.display='none'; }
function addKnownKeyword(cat,val){ if(!keywords[cat].includes(val)){keywords[cat].push(val);persist();} }

// FACTION DROPDOWNS
function fighters_populateFactionFilter(){
  const sel=document.getElementById('fighters-faction-filter');
  const cur=sel.value;
  sel.innerHTML='<option value="">All Factions</option>'+
    factions.map(f=>{
      const has=fighters.some(fi=>fi.faction===f.id);
      return `<option value="${f.id}"${cur===f.id?' selected':''}${!has?' disabled':''}>${f.name}</option>`;
    }).join('');
}
function fighters_populateFactionSelect(curVal){
  const sel=document.getElementById('fi-faction');
  sel.innerHTML='<option value="">— Select faction —</option>'+
    factions.map(f=>`<option value="${f.id}"${curVal===f.id?' selected':''}>${f.name}</option>`).join('');
}

function fighters_defaultEquipLabel(prefixedId){
  if(prefixedId.startsWith('weapon:')){
    const w=weapons.find(w=>w.id===prefixedId.slice(7));
    return w?`[Weapon] ${w.name||w.id}`:prefixedId;
  }
  if(prefixedId.startsWith('item:')){
    const it=items.find(i=>i.id===prefixedId.slice(5));
    return it?`[Item] ${it.name||it.id}`:prefixedId;
  }
  return prefixedId;
}
function fighters_renderDefaultEquipTags(){
  const wrap=document.getElementById('default-equip-wrap');
  if(!wrap) return;
  Array.from(wrap.querySelectorAll('.tag')).forEach(t=>t.remove());
  const anchor=wrap.lastElementChild;
  fi_defaultEquipment.forEach((pid,i)=>{
    const span=document.createElement('span');
    span.className='tag';
    span.innerHTML=`${fighters_defaultEquipLabel(pid)}<button class="tag-remove" onmousedown="event.preventDefault();fighters_removeDefaultEquip(${i})">✕</button>`;
    wrap.insertBefore(span,anchor);
  });
}
function fighters_removeDefaultEquip(idx){
  fi_defaultEquipment.splice(idx,1);
  fighters_renderDefaultEquipTags();
}
function fighters_defaultEquipKeydown(e){
  if(e.key==='Backspace'&&!e.target.value&&fi_defaultEquipment.length){
    fi_defaultEquipment.pop();
    fighters_renderDefaultEquipTags();
  }
}
function fighters_defaultEquipAutocomplete(input){
  const val=input.value.trim().toLowerCase();
  const allOptions=[
    ...weapons.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(w=>({pid:`weapon:${w.id}`,label:`[Weapon] ${w.name||w.id}`})),
    ...items.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).map(it=>({pid:`item:${it.id}`,label:`[Item] ${it.name||it.id}`})),
  ].filter(x=>!fi_defaultEquipment.includes(x.pid)&&(!val||x.label.toLowerCase().includes(val)));
  const ac=document.getElementById('default-equip-ac');
  if(!allOptions.length){ac.style.display='none';return;}
  ac.style.display='block';
  ac.innerHTML=allOptions.map(x=>`<div class="autocomplete-item" onmousedown="fighters_selectDefaultEquip('${x.pid}')">${x.label}</div>`).join('');
  ac.classList.toggle('drop-up',window.innerHeight-input.getBoundingClientRect().bottom<160);
}
function fighters_selectDefaultEquip(pid){
  if(!fi_defaultEquipment.includes(pid)) fi_defaultEquipment.push(pid);
  fighters_renderDefaultEquipTags();
  document.getElementById('default-equip-input').value='';
  fighters_hideDefaultEquipAc();
}
function fighters_hideDefaultEquipAc(){
  const ac=document.getElementById('default-equip-ac');
  if(ac) ac.style.display='none';
}

function fighters_onFighterTypeChange(){
  fi_fighterType=document.getElementById('fi-fighter-type').value;
  const isHired=fi_fighterType==='hired-sword';
  document.getElementById('fi-regular-fields').style.display=isHired?'none':'';
  document.getElementById('fi-hired-cost-wrap').style.display=isHired?'':'none';
  document.getElementById('fi-recruitable-wrap').style.display=isHired?'':'none';
}

function fighters_renderRecruitableTags(){
  const wrap=document.getElementById('recruitable-wrap');
  if(!wrap) return;
  Array.from(wrap.querySelectorAll('.tag')).forEach(t=>t.remove());
  const anchor=wrap.lastElementChild;
  fi_recruitableTags.forEach((id,i)=>{
    const name=factions.find(f=>f.id===id)?.name||id;
    const span=document.createElement('span');
    span.className='tag';
    span.innerHTML=`${name}<button class="tag-remove" onmousedown="event.preventDefault();fighters_removeRecruitableTag(${i})">✕</button>`;
    wrap.insertBefore(span,anchor);
  });
}
function fighters_removeRecruitableTag(idx){
  fi_recruitableTags.splice(idx,1);
  fighters_renderRecruitableTags();
}
function fighters_recruitableKeydown(e){
  if(e.key==='Backspace'&&!e.target.value&&fi_recruitableTags.length){
    fi_recruitableTags.pop();
    fighters_renderRecruitableTags();
  }
}
function fighters_recruitableAutocomplete(input){
  const val=input.value.trim().toLowerCase();
  const matches=factions.filter(f=>!fi_recruitableTags.includes(f.id)&&(!val||f.name.toLowerCase().includes(val)));
  const ac=document.getElementById('recruitable-ac');
  if(!matches.length){ac.style.display='none';return;}
  ac.style.display='block';
  ac.innerHTML=matches.map(f=>`<div class="autocomplete-item" onmousedown="fighters_selectRecruitable('${f.id}')">${f.name}</div>`).join('');
  ac.classList.toggle('drop-up',window.innerHeight-input.getBoundingClientRect().bottom<160);
}
function fighters_selectRecruitable(id){
  if(!fi_recruitableTags.includes(id)) fi_recruitableTags.push(id);
  fighters_renderRecruitableTags();
  document.getElementById('recruitable-input').value='';
  document.getElementById('recruitable-ac').style.display='none';
}
function fighters_onHiredCostChange(val){
  fi_hiredCost=Math.max(0,parseInt(val)||0);
}

/** Abilities whose category equals this faction id, plus all unique abilities */
function fighters_factionAbilitiesForFaction(factionId){
  const fid=factionId?String(factionId):null;
  return abilities
    .filter(a=>String(a.category)==='unique'||(fid&&String(a.category)===fid))
    .sort((a,b)=>(a.name||'').localeCompare(b.name||''));
}

function fighters_renderAbilityTags(){
  const wrap=document.getElementById('ability-wrap');
  if(!wrap) return;
  const hint=document.getElementById('fi-faction-abilities-hint');
  const factionId=document.getElementById('fi-faction')?.value||'';
  if(hint) hint.textContent='All abilities are available.';
  Array.from(wrap.querySelectorAll('.tag')).forEach(t=>t.remove());
  const anchor=wrap.lastElementChild;
  fi_factionAbilityIds.forEach((id,i)=>{
    const ab=abilities.find(a=>String(a.id)===String(id));
    const typStr=ab&&ABILITY_TYPES[ab.ability_type]?`[${ABILITY_TYPES[ab.ability_type]}] `:'';
    const name=ab?(typStr+(ab.name||id)):id;
    const span=document.createElement('span');
    span.className='tag';
    span.innerHTML=`${name}<button class="tag-remove" onmousedown="event.preventDefault();fighters_removeAbilityTag(${i})">✕</button>`;
    wrap.insertBefore(span,anchor);
  });
  const input=document.getElementById('ability-input');
  if(input) input.disabled=false;
}
function fighters_removeAbilityTag(idx){
  fi_factionAbilityIds.splice(idx,1);
  fighters_renderAbilityTags();
}
function fighters_abilityKeydown(e){
  if(e.key==='Backspace'&&!e.target.value&&fi_factionAbilityIds.length){
    fi_factionAbilityIds.pop();
    fighters_renderAbilityTags();
  }
}
function fighters_abilityAutocomplete(input){
  const val=input.value.trim().toLowerCase();
  const list=[...abilities].sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const matches=list.filter(a=>{
    if(fi_factionAbilityIds.includes(a.id)) return false;
    return !val||(a.name||'').toLowerCase().includes(val);
  });
  const ac=document.getElementById('ability-ac');
  if(!matches.length){ac.style.display='none';return;}
  ac.style.display='block';
  ac.innerHTML=matches.map(a=>{
    const typStr=ABILITY_TYPES[a.ability_type]||a.ability_type||'';
    const display=(typStr?`[${typStr}] `:'')+(a.name||a.id);
    return `<div class="autocomplete-item" onmousedown="fighters_selectAbility('${a.id}')">${display}</div>`;
  }).join('');
  ac.classList.toggle('drop-up',window.innerHeight-input.getBoundingClientRect().bottom<160);
}
function fighters_selectAbility(id){
  if(!fi_factionAbilityIds.includes(id)) fi_factionAbilityIds.push(id);
  fighters_renderAbilityTags();
  document.getElementById('ability-input').value='';
  fighters_hideAbilityAc();
}
function fighters_hideAbilityAc(){
  const ac=document.getElementById('ability-ac');
  if(ac) ac.style.display='none';
}

function fighters_onFactionChange(){
  const fid=document.getElementById('fi-faction')?.value||'';
  const valid=new Set(fighters_factionAbilitiesForFaction(fid).map(a=>a.id));
  fi_factionAbilityIds=fi_factionAbilityIds.filter(id=>valid.has(id));
  fighters_renderAbilityTags();
}

// RENDER TABLE
function fighters_render(){
  const filterFaction=document.getElementById('fighters-faction-filter')?.value||'';
  const search=(document.getElementById('fighters-search')?.value||'').trim().toLowerCase();
  const tbody=document.getElementById('fighters-tbody');
  let list=fighters;
  if(filterFaction) list=list.filter(f=>f.faction===filterFaction);
  if(search) list=list.filter(f=>(f.name||'').toLowerCase().includes(search)||(f.id||'').toLowerCase().includes(search));
  list=sortedList(list,'fighters');
  if(!list.length){
    tbody.innerHTML=`<tr><td colspan="10"><div class="empty-state"><span style="font-size:24px">⚔</span><p>No fighters yet. Add one to get started.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=list.map(f=>{
    const raceTags = Array.isArray(f?.race) ? f.race : (typeof f?.race === 'string' ? f.race.split(',').map(v=>v.trim()) : []);
    const kwTags   = Array.isArray(f?.keywords) ? f.keywords : (typeof f?.keywords === 'string' ? f.keywords.split(',').map(v=>v.trim()) : []);
    const factionId = f?.faction == null ? '' : String(f.faction);
    const factionLabel = factionId
      ? (factions.find(fa=>String(fa.id)===factionId)?.name || factionId).toUpperCase()
      : '';
    const allKw=[...raceTags, factionLabel, ...kwTags].filter(Boolean);
    const limitLabel = f.limit != null ? ` · max ${f.limit}` : '';
    const ro = IS_PUBLIC && canonicalIds.fighters.has(String(f.id));
    return `<tr>
      <td>
        <div class="fighter-name fighter-open-link" data-id="${f.id}" style="cursor:pointer">${f.name||'Untitled'}</div>
        <div class="fighter-id">${f.id||'—'}${limitLabel}</div>
      </td>
      <td class="stat-cell">${f.move??'—'}"</td>
      <td class="stat-cell">${f.fight??'—'}</td>
      <td class="stat-cell">${f.shoot??'—'}</td>
      <td class="stat-cell">${f.defense??'—'}</td>
      <td class="stat-cell">${f.health??'—'}</td>
      <td class="stat-cell">${(f.bravery??5)}+</td>
      <td class="cost-cell">${f.cost??'—'}gc</td>
      <td class="keywords-cell">${allKw.join(', ')}</td>
      <td><div class="row-actions">${ro?'':`
        <button class="icon-btn fighter-open-link" data-id="${f.id}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn danger fighter-delete-btn" data-id="${f.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>`}
      </div></td>
    </tr>`;
  }).join('');
}

// Event delegation for fighters table
document.getElementById('fighters-tbody').addEventListener('click', e => {
  const openEl = e.target.closest('.fighter-open-link');
  if(openEl) {
    const f = fighters.find(f=>f.id===openEl.dataset.id);
    if(f) fighters_openPanel(f, !canEdit('fighters', f.id));
    return;
  }
  const delEl = e.target.closest('.fighter-delete-btn');
  if(delEl) fighters_delete(delEl.dataset.id);
});

// OPEN PANEL
function fighters_openPanel(fighter, readOnly=false){
  fi_editingId=fighter?.id||null;
  fi_idTouched=!!fighter;
  fi_stats={
    move:    fighter?.move    ??5,
    fight:   fighter?.fight   ??3,
    shoot:   fighter?.shoot   ??3,
    defense: fighter?.defense ??3,
    health:  fighter?.health  ??10,
    bravery: fighter?.bravery ??5,
  };
  fi_raceTags=[...(fighter?.race||[])];
  fi_kwTags  =[...(fighter?.keywords||[])];
  fi_recruitableTags=[...(fighter?.recruitable_by||[])];
  fi_power   =fighter?.power_level??0;
  // default equipment: prefer new field, fall back to legacy natural_weapon
  let rawEquip=fighter?.default_equipment;
  if(!Array.isArray(rawEquip)||!rawEquip.length){
    const nw=(fighter?.natural_weapon||'').toString().trim();
    rawEquip=nw?[`weapon:${nw}`]:[];
  }
  fi_defaultEquipment=rawEquip.map(String).filter(Boolean);
  fi_fighterType=fighter?.fighter_type||'regular';
  fi_hiredCost=fighter?.fighter_type==='hired-sword'?(fighter?.cost??0):0;

  document.getElementById('fi-name').value     =fighter?.name||'';
  document.getElementById('fi-id').value       =fighter?.id||'';
  document.getElementById('fi-desc').value     =fighter?.description||'';
  document.getElementById('fi-fighter-type').value=fi_fighterType;
  const isHired=fi_fighterType==='hired-sword';
  document.getElementById('fi-regular-fields').style.display=isHired?'none':'';
  document.getElementById('fi-hired-cost-wrap').style.display=isHired?'':'none';
  document.getElementById('fi-recruitable-wrap').style.display=isHired?'':'none';
  document.getElementById('fi-hired-cost').value=fi_hiredCost;
  document.getElementById('fi-abilities').value=fighter?.ability_preamble||'';
  fi_factionAbilityIds=[...(fighter?.faction_ability_ids||[])].map(String).filter(Boolean);
  document.getElementById('fi-power').value    =fi_power;
  document.getElementById('pl-badge').textContent=(fi_power>=0?'+':'')+fi_power;
  fi_limit = fighter?.limit ?? null;
  document.getElementById('fi-limit-type').value = fi_limit != null ? 'limited' : 'unlimited';
  document.getElementById('fi-limit-num-wrap').style.display = fi_limit != null ? 'flex' : 'none';
  document.getElementById('fi-limit-val').textContent = fi_limit ?? 1;
  fighters_renderDefaultEquipTags();
  fighters_renderRecruitableTags();
  renderStats(); renderTags('race'); renderTags('kw');
  const defaultFaction = fighter?.faction || document.getElementById('fighters-faction-filter')?.value || '';
  fighters_populateFactionSelect(defaultFaction);
  fighters_renderAbilityTags();
  fighters_updateCost();
  document.getElementById('fi-save-ind').textContent='';
  fighters_switchTab('characteristics');
  document.getElementById('overlay').classList.add('open');
  document.getElementById('fighter-panel').classList.add('open');
  panel_setReadonly('fighter-panel', readOnly);
  if(!readOnly) setTimeout(()=>document.getElementById('fi-name').focus(),250);
}

function fighters_edit(id){ fighters_openPanel(fighters.find(f=>f.id===id)); }
function fighters_onNameInput(val){
  if(!fi_idTouched) document.getElementById('fi-id').value=toSlug(val);
}
function fighters_onLimitTypeChange(){
  const limited = document.getElementById('fi-limit-type').value === 'limited';
  document.getElementById('fi-limit-num-wrap').style.display = limited ? 'flex' : 'none';
  fi_limit = limited ? (fi_limit ?? 1) : null;
  document.getElementById('fi-limit-val').textContent = fi_limit ?? 1;
}
function fighters_stepLimit(dir){
  fi_limit = Math.max(1, (fi_limit ?? 1) + dir);
  document.getElementById('fi-limit-val').textContent = fi_limit;
}

// SAVE
function fighters_scheduleSave(){ clearTimeout(fi_saveTimer); fi_saveTimer=setTimeout(fighters_save,300); }
function fighters_save(){
  if(fi_editingId && !canEdit('fighters', fi_editingId)) return;
  const name=document.getElementById('fi-name').value.trim();
  const id  =document.getElementById('fi-id').value.trim()||toSlug(name)||'fighter-'+Date.now();
  if(!name&&!id) return;
  const isHired=fi_fighterType==='hired-sword';
  const costVal=isHired?fi_hiredCost:calcCost().total;
  const data={
    id,name,
    fighter_type:fi_fighterType,
    description: document.getElementById('fi-desc').value,
    move:fi_stats.move, fight:fi_stats.fight, shoot:fi_stats.shoot,
    defense:fi_stats.defense, health:fi_stats.health, bravery:fi_stats.bravery,
    power_level:isHired?0:fi_power, cost:costVal,
    ability_preamble:document.getElementById('fi-abilities').value,
    faction_ability_ids:[...fi_factionAbilityIds],
    default_equipment:[...fi_defaultEquipment],
    race:fi_raceTags,
    faction:document.getElementById('fi-faction').value,
    keywords:fi_kwTags,
    recruitable_by:isHired?[...fi_recruitableTags]:[],
    limit:isHired?null:fi_limit,
  };
  if(fi_editingId){
    const idx=fighters.findIndex(f=>f.id===fi_editingId);
    if(idx!==-1) fighters[idx]=data;
    else fighters.push(data);
  } else { fighters.push(data); }
  fi_editingId=data.id;
  persist(); fighters_render(); factions_render();
  const ind=document.getElementById('fi-save-ind');
  ind.textContent='✓ Saved'; setTimeout(()=>ind.textContent='',2000);
}

// DELETE
function fighters_delete(id){
  if(!canEdit('fighters', id)) return;
  if(!confirm('Delete this fighter?')) return;
  fighters=fighters.filter(f=>f.id!==id); persist(); fighters_render();
}
function fighters_export(){
  const out=fighters.map(({fighter_type,...rest})=>rest);
  const blob=new Blob([JSON.stringify(out,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='fighters.json';a.click();
}

// ══════════════════════════════════════════
// MATHHAMMER
// ══════════════════════════════════════════
let mh_active = false;
let mh_atk = 3, mh_def = 3, mh_bonus = 0;

function mh_reset(){
  if(!mh_active) return;
  mh_active=false;
  document.getElementById('mh-toggle-btn')?.classList.remove('btn-mh-active');
  document.getElementById('mh-controls').style.display='none';
  // restore cost/rules headers if they were swapped
  ['wth-mh-miss','wth-mh-hit','wth-mh-crit','wth-mh-avg','wth-mh-max'].forEach(id=>document.getElementById(id)?.remove());
  const costTh=document.getElementById('wth-cost');
  if(costTh) costTh.style.display='';
  if(!document.getElementById('wth-rules')){
    const newTh=document.createElement('th');
    newTh.id='wth-rules'; newTh.style.width='26%'; newTh.textContent='Weapon Rules';
    costTh?.insertAdjacentElement('afterend',newTh);
  }
  sortState.weapons={col:null,dir:1};
}

function mh_toggle(){
  mh_active = !mh_active;
  const btn     = document.getElementById('mh-toggle-btn');
  const controls= document.getElementById('mh-controls');
  const costTh  = document.getElementById('wth-cost');
  const rulesTh = document.getElementById('wth-rules');
  btn.classList.toggle('btn-mh-active', mh_active);
  controls.style.display = mh_active ? 'flex' : 'none';
  if(mh_active){
    costTh.style.display = 'none';
    rulesTh.outerHTML = `
      <th id="wth-mh-miss" class="sortable" data-table="weapons" data-sort="mh-miss" style="width:7%;text-align:center;font-size:10px;color:var(--text-muted)">Miss</th>
      <th id="wth-mh-hit"  class="sortable" data-table="weapons" data-sort="mh-hit"  style="width:7%;text-align:center;font-size:10px;color:var(--accent)">Hit</th>
      <th id="wth-mh-crit" class="sortable" data-table="weapons" data-sort="mh-crit" style="width:7%;text-align:center;font-size:10px;color:#c17900">Crit</th>
      <th id="wth-mh-avg"  class="sortable" data-table="weapons" data-sort="mh-avg"  style="width:7%;text-align:center;font-size:10px;color:var(--text)">Avg</th>
      <th id="wth-mh-max"  class="sortable" data-table="weapons" data-sort="mh-max"  style="width:7%;text-align:center;font-size:10px;color:var(--text-muted)">Max</th>`;
    mh_updateAtkLabel();
  } else {
    ['wth-mh-miss','wth-mh-hit','wth-mh-crit','wth-mh-avg','wth-mh-max'].forEach(id=>{
      document.getElementById(id)?.remove();
    });
    sortState.weapons = {col:null, dir:1};
    costTh.style.display = '';
    if(!document.getElementById('wth-rules')){
      const newTh = document.createElement('th');
      newTh.id = 'wth-rules';
      newTh.style.width = '26%';
      newTh.textContent = 'Weapon Rules';
      costTh.insertAdjacentElement('afterend', newTh);
    }
  }
  weapons_render();
}

function mh_step(which, dir){
  if(which==='atk')   mh_atk   = Math.max(1, Math.min(10, mh_atk+dir));
  else if(which==='def')   mh_def   = Math.max(1, Math.min(10, mh_def+dir));
  else if(which==='bonus') mh_bonus = Math.max(-10, Math.min(10, mh_bonus+dir));
  document.getElementById('mh-atk-val').textContent   = mh_atk;
  document.getElementById('mh-def-val').textContent   = mh_def;
  document.getElementById('mh-bonus-val').textContent = (mh_bonus>0?'+':'')+mh_bonus;
  mh_updateAtkLabel();
  weapons_render();
}

function mh_updateAtkLabel(){
  // label depends on the type filter — if ranged filter active, say Shoot
  const filter = document.getElementById('weapons-type-filter')?.value;
  const label  = filter==='ranged' ? 'Shoot' : 'Fight'; // natural & melee use Fight for Mathhammer
  document.getElementById('mh-atk-label').textContent = label;
}

// ══════════════════════════════════════════
// DAMAGE MATRIX
// ══════════════════════════════════════════
let wx_active = false, wx_atk = 3, wx_sortDef = null, wx_sortDir = -1;
const WX_DEF_COLS = [1,2,3,4,5,6];

function wx_toggle(){
  wx_active = !wx_active;
  document.getElementById('wx-toggle-btn').classList.toggle('btn-mh-active', wx_active);
  const tableWrap = document.querySelector('#view-weapons .table-wrap');
  const matrixWrap = document.getElementById('weapon-matrix-wrap');
  tableWrap.style.display = wx_active ? 'none' : '';
  matrixWrap.style.display = wx_active ? 'block' : 'none';
  if(wx_active) wx_render();
}

function wx_stepAtk(dir){
  wx_atk = Math.max(1, Math.min(10, wx_atk + dir));
  document.getElementById('wx-atk-val').textContent = wx_atk;
  wx_render();
}

function wx_sortBy(def){
  if(wx_sortDef === def) wx_sortDir *= -1;
  else { wx_sortDef = def; wx_sortDir = -1; }
  wx_render();
}

function wx_render(){
  if(!wx_active) return;
  const typeFilter = document.getElementById('weapons-type-filter')?.value||'';
  let list = weapons.filter(w=> !typeFilter || w.type===typeFilter);

  // Pre-compute avg per weapon per def (applying fight_shoot rule bonuses per weapon)
  const avgs = new Map();
  list.forEach(w=>{
    const atkBonus = (w.special_rules||[]).reduce((s,rid)=>{
      const r = weaponRules.find(r=>r.id===rid);
      if(r?.effect?.characteristic!=='fight_shoot') return s;
      return s + (r.effect.bonus||0);
    }, 0);
    const effectiveAtk = Math.max(1, wx_atk + atkBonus);
    const row = {};
    WX_DEF_COLS.forEach(def=>{
      const c = prob_chances(effectiveAtk, def);
      row[def] = w.attacks * (c.hit*(w.hit||0) + c.crit*(w.crit||0));
    });
    avgs.set(w.id, row);
  });

  // Sort if a column is selected
  if(wx_sortDef !== null){
    list = [...list].sort((a,b)=> wx_sortDir * (avgs.get(a.id)[wx_sortDef] - avgs.get(b.id)[wx_sortDef]));
  }

  const maxAvg = Math.max(...[...avgs.values()].flatMap(r=>Object.values(r)), 0.01);

  function heatColor(val){
    const t = Math.min(val / maxAvg, 1);
    const r = Math.round(232 - t*(232-45));
    const g = Math.round(228 - t*(228-106));
    const b = Math.round(220 - t*(220-63));
    return `rgb(${r},${g},${b})`;
  }
  function textColor(val){ return (val/maxAvg) > 0.55 ? '#fff' : 'var(--text)'; }

  const sortArrow = dir => dir === -1 ? ' ↓' : ' ↑';
  const defHeaders = WX_DEF_COLS.map(d=>{
    const active = wx_sortDef === d;
    return `<th onclick="wx_sortBy(${d})" style="text-align:center;min-width:64px;cursor:pointer;user-select:none;${active?'color:var(--accent);font-weight:600':'color:var(--text-muted);font-weight:400'}">Def ${d}${active?sortArrow(wx_sortDir):''}</th>`;
  }).join('');

  const controlsRow = `<tr><td colspan="${WX_DEF_COLS.length+3}" style="padding:10px 0 14px;border-bottom:1px solid var(--border)">
    <div style="display:flex;align-items:center;gap:16px">
      <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text-muted)">
        <span>Fight / Shoot:</span>
        <div class="stepper" style="height:28px">
          <button class="stepper-btn" onclick="wx_stepAtk(-1)">−</button>
          <div class="stepper-val" id="wx-atk-val" style="min-width:28px;font-size:13px">${wx_atk}</div>
          <button class="stepper-btn" onclick="wx_stepAtk(1)">+</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-muted)">
        <span style="width:10px;height:10px;border-radius:2px;background:#e8e4dc;display:inline-block"></span>Low
        <span style="width:10px;height:10px;border-radius:2px;background:#2d6a3f;display:inline-block;margin-left:6px"></span>High
      </div>
      <span style="font-size:11px;color:var(--text-muted)">Click a column header to sort</span>
    </div>
  </td></tr>`;

  const thead = `<thead>
    ${controlsRow}
    <tr>
      <th style="text-align:left;min-width:180px">Weapon</th>
      <th style="text-align:center;min-width:48px;color:var(--text-muted);font-weight:400">Atk</th>
      <th style="text-align:center;min-width:64px;color:var(--text-muted);font-weight:400">Hit/Crit</th>
      ${defHeaders}
    </tr>
  </thead>`;

  const rows = list.map(w=>{
    const wAvgs = avgs.get(w.id);
    const cells = WX_DEF_COLS.map(def=>{
      const val = wAvgs[def];
      const bg  = heatColor(val);
      const fg  = textColor(val);
      const bold = wx_sortDef === def ? 'font-weight:700' : 'font-weight:500';
      return `<td style="text-align:center;background:${bg};color:${fg};${bold};border-radius:3px;padding:6px 4px">${val.toFixed(1)}</td>`;
    }).join('');
    return `<tr>
      <td style="padding:6px 12px 6px 0"><div style="font-weight:500">${w.name||'Untitled'}</div><div style="font-size:10px;color:var(--text-muted)">${WEAPON_TYPE_LABELS[w.type]||w.type||''}</div></td>
      <td style="text-align:center;color:var(--text-muted)">${w.attacks??'—'}</td>
      <td style="text-align:center;color:var(--text-muted)">${w.hit??'—'}/${w.crit??'—'}</td>
      ${cells}
    </tr>`;
  }).join('');

  document.getElementById('wx-table').innerHTML = thead +
    `<tbody>${rows||`<tr><td colspan="${WX_DEF_COLS.length+3}" style="text-align:center;color:var(--text-muted);padding:32px">No weapons to display.</td></tr>`}</tbody>`;
}

// ══════════════════════════════════════════
// WEAPONS
// ══════════════════════════════════════════
let w_editingId=null, w_saveTimer=null;
let w_stats={range:1, min_range:0, attacks:3, hit:2, crit:3};
let w_type='melee';
let w_power=0;
/** Ranged uses ranged baselines & 6" steps; melee and natural use melee baselines & 1" steps */
function weaponIsRanged(t){ return t==='ranged'; }
function parseWeaponRange(r){ // returns {min, max}
  if(typeof r==='string'&&r.includes('-')){const p=r.split('-').map(Number);return{min:p[0]||0,max:p[1]||1};}
  return{min:0,max:typeof r==='number'?r:(parseInt(r)||1)};
}
function formatWeaponRange(r){ const {min,max}=parseWeaponRange(r); return min>0?`${min}"-${max}"`:max+'"'; }
const WEAPON_TYPE_LABELS={ melee:'Melee', ranged:'Ranged', natural:'Natural' };
let w_appliedRules=[];
let w_breakdownOpen=false;
let pinnedWeapons = new Set(JSON.parse(localStorage.getItem('wyrdforge_pinned_weapons')||'[]'));

function weapons_togglePin(id){
  if(pinnedWeapons.has(id)) pinnedWeapons.delete(id);
  else pinnedWeapons.add(id);
  localStorage.setItem('wyrdforge_pinned_weapons', JSON.stringify([...pinnedWeapons]));
  weapons_render();
}


// ── PROBABILITY SIMULATOR ──────────────────────
let prob_atk=3, prob_def=3;

function prob_updateLabel(){
  const el = document.getElementById('prob-atk-label');
  if(el) el.textContent = w_type==='ranged' ? 'Shoot' : 'Fight';
}

function prob_step(which, dir){
  if(which==='atk') prob_atk = Math.max(1, Math.min(10, prob_atk+dir));
  else              prob_def = Math.max(1, Math.min(10, prob_def+dir));
  document.getElementById('prob-atk-val').textContent = prob_atk;
  document.getElementById('prob-def-val').textContent = prob_def;
  prob_render();
}

// Returns {missChance, hitChance, critChance} as fractions out of 6
function prob_chances(atk, def){
  if      (atk * 2 <= def) return { miss:4/6, hit:2/6, crit:0    }; // half or less — no crits
  else if (atk < def)      return { miss:4/6, hit:1/6, crit:1/6  }; // less than
  else if (atk === def)    return { miss:3/6, hit:2/6, crit:1/6  }; // equal
  else if (atk < def * 2)  return { miss:2/6, hit:3/6, crit:1/6  }; // greater
  else                     return { miss:2/6, hit:2/6, crit:2/6  }; // twice or more
}

function pct(f){ return Math.round(f*100)+'%'; }

function prob_expectedDamage(attacks, atk, def, hitDmg, critDmg){
  const c = prob_chances(atk, def);
  const avgPerDie = c.hit*hitDmg + c.crit*critDmg;
  return (attacks * avgPerDie).toFixed(2);
}

function prob_maxDamage(attacks, atk, def, hitDmg, critDmg){
  const c = prob_chances(atk, def);
  // max = all dice are crits (if crit possible) else all hits
  if(c.crit > 0) return attacks * critDmg;
  if(c.hit  > 0) return attacks * hitDmg;
  return 0;
}

function prob_render(){
  const wrap = document.getElementById('prob-table-wrap');
  if(!wrap) return;

  // Use current weapon stats from the panel
  const attacks = w_stats.attacks;
  const hitDmg  = w_stats.hit;
  const critDmg = w_stats.crit;
  const targetDef = prob_def;

  // Show a range of defense values centred on target: target-2 to target+2
  const defRange = [];
  for(let d = Math.max(1, targetDef-2); d <= Math.min(10, targetDef+2); d++) defRange.push(d);

  const rows = defRange.map(def=>{
    const c   = prob_chances(prob_atk, def);
    const avg = prob_expectedDamage(attacks, prob_atk, def, hitDmg, critDmg);
    const max = prob_maxDamage(attacks, prob_atk, def, hitDmg, critDmg);
    const highlight = def === targetDef;
    return `<tr${highlight?' class="prob-highlight"':''}>
      <td class="prob-def">${def}</td>
      <td>${pct(c.miss)}</td>
      <td>${pct(c.hit)}</td>
      <td>${c.crit>0?pct(c.crit):'—'}</td>
      <td>${avg}</td>
      <td>${max}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `
    <div style="border:1px solid var(--border);border-radius:4px;overflow:hidden;background:var(--panel-bg)">
      <table class="prob-table">
        <thead>
          <tr>
            <th>Def</th>
            <th>Miss</th>
            <th>Hit</th>
            <th>Crit</th>
            <th>Avg</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="font-size:10px;color:var(--text-muted);margin-top:8px">
      ${attacks} attack${attacks!==1?'s':''} · ${hitDmg}/${critDmg} dmg · Attacker ${prob_atk} vs highlighted Defense ${targetDef}
    </div>`;
}

function weapons_rangeStep(){ return weaponIsRanged(w_type) ? 6 : 1; }

function stepWeaponStat(stat,dir){
  const step=stat==='range'||stat==='min_range'?weapons_rangeStep():1;
  const mins={range:weapons_rangeStep(),attacks:1,hit:1,crit:1,min_range:0};
  const maxs={range:weaponIsRanged(w_type)?48:12,attacks:10,hit:10,crit:10,min_range:Math.max(0,w_stats.range-weapons_rangeStep())};
  w_stats[stat]=Math.max(mins[stat],Math.min(maxs[stat],w_stats[stat]+dir*step));
  weapons_renderStats(); weapons_updateCost();
}

function weapons_renderStats(){
  const isRanged = weaponIsRanged(w_type);
  document.getElementById('wstat-range').textContent   = w_stats.range+'"';
  document.getElementById('wstat-attacks').textContent = w_stats.attacks;
  document.getElementById('wstat-hit').textContent     = w_stats.hit;
  document.getElementById('wstat-crit').textContent    = w_stats.crit;
  document.getElementById('w-range-label').textContent = isRanged ? 'Max Range' : 'Range';
  const minGroup = document.getElementById('wstat-min-range-group');
  if(minGroup) minGroup.style.display = isRanged ? '' : 'none';
  const minSel = document.getElementById('wstat-min-range');
  if(minSel){ const v=String(w_stats.min_range||0); minSel.value=[...minSel.options].some(o=>o.value===v)?v:'0'; }
}

function weapons_onTypeChange(){
  w_type=document.getElementById('w-type').value;
  const step=weapons_rangeStep();
  w_stats.range=Math.max(step,Math.round(w_stats.range/step)*step||step);
  if(!weaponIsRanged(w_type)) w_stats.min_range=0;
  weapons_renderStats(); weapons_updateCost();
  prob_updateLabel();
}

function calcWeaponCost(){
  const ruleCost=w_appliedRules.reduce((s,rid)=>{
    const r=weaponRules.find(r=>r.id===rid); return s+(r?.cost||0);
  },0);
  const WB = weaponIsRanged(w_type) ? WEAPON_BASELINE_RANGED : WEAPON_BASELINE_MELEE;
  const rangeIncrement = weaponIsRanged(w_type) ? 6 : 1;
  const rangeIncrements = w_stats.range / rangeIncrement;
  const baselineIncrements = WB.range / rangeIncrement;
  const rangeCost = (rangeIncrements - baselineIncrements) * WEAPON_COST_PROFILE.range;
  const rows=[
    {label:'Base cost', value:WEAPON_COST_PROFILE.base},
    {label:`Range (${w_stats.range}", base ${WB.range}", ${rangeIncrement}" increments)`, value:rangeCost},
    {label:`Attacks (${w_stats.attacks}, base ${WB.attacks})`, value:(w_stats.attacks-WB.attacks)*WEAPON_COST_PROFILE.attacks},
    {label:`Hit damage (${w_stats.hit}, base ${WB.hit})`,      value:(w_stats.hit-WB.hit)*WEAPON_COST_PROFILE.hit},
    {label:`Crit damage (${w_stats.crit}, base ${WB.crit})`,   value:(w_stats.crit-WB.crit)*WEAPON_COST_PROFILE.crit},
    {label:`Weapon rules (${w_appliedRules.length})`,          value:ruleCost},
    {label:'Power level adjustment',                            value:w_power},
  ];
  const total=Math.max(0,rows.reduce((s,r)=>s+r.value,0));
  return {rows,total};
}

function weapons_updateCost(){
  const {rows,total}=calcWeaponCost();
  document.getElementById('w-cost-total-label').textContent=`Weapon Cost: ${total}gc`;
  document.getElementById('w-cost-breakdown').innerHTML=
    rows.map(r=>`<div class="cost-row"><span>${r.label}</span><span>${r.value>=0?'+':''}${r.value}gc</span></div>`).join('')+
    `<div class="cost-row"><span>Total</span><span>${total}gc</span></div>`;
}

function weapons_onPowerChange(val){
  w_power=Math.round(parseInt(val)/5)*5;
  document.getElementById('w-pl-badge').textContent=(w_power>=0?'+':'')+w_power;
  weapons_updateCost();
}

function toggleWeaponCostBreakdown(){
  w_breakdownOpen=!w_breakdownOpen;
  document.getElementById('w-cost-breakdown').classList.toggle('open',w_breakdownOpen);
  document.getElementById('w-cost-toggle-label').textContent=w_breakdownOpen?'▼ Hide breakdown':'▲ Show breakdown';
}

function weapons_renderAppliedRules(){
  const el=document.getElementById('w-rules-applied');
  el.innerHTML=w_appliedRules.map((rid,i)=>{
    const r=weaponRules.find(r=>r.id===rid);
    return `<span class="tag">${r?.name||rid}<button class="tag-remove" onclick="weapons_removeRule(${i})">✕</button></span>`;
  }).join('');
}
function weapons_removeRule(idx){
  w_appliedRules.splice(idx,1);
  weapons_renderAppliedRules(); weapons_updateCost();
}
function weapons_populateRulesSelect(){
  const sel=document.getElementById('w-rules-select');
  if(!weaponRules.length){ sel.innerHTML='<option value="">No weapon rules available</option>'; sel.disabled=true; return; }
  sel.disabled=false;
  sel.innerHTML='<option value="">Add a rule...</option>'+
    weaponRules.map(r=>`<option value="${r.id}">${r.name}${r.cost?` (${r.cost>=0?'+':''}${r.cost}gc)`:''}</option>`).join('');
  sel.onchange=()=>{
    const val=sel.value; if(!val) return;
    if(!w_appliedRules.includes(val)){ w_appliedRules.push(val); weapons_renderAppliedRules(); weapons_updateCost(); }
    sel.value='';
  };
}

function weapons_openPanel(weapon, readOnly=false){
  w_editingId=weapon?.id||null;
  w_type=weapon?.type||'melee';
  const rangeRaw=weapon?.range;
  let maxRange=1, minRange=0;
  if(typeof rangeRaw==='string'&&rangeRaw.includes('-')){
    const parts=rangeRaw.split('-').map(Number);
    minRange=parts[0]||0; maxRange=parts[1]||6;
  } else {
    maxRange=typeof rangeRaw==='number'?rangeRaw:(parseInt(rangeRaw)||1);
  }
  w_stats={range:maxRange, min_range:minRange, attacks:weapon?.attacks??3, hit:weapon?.hit??2, crit:weapon?.crit??3};
  w_appliedRules=[...(weapon?.special_rules||[])];
  w_power=weapon?.power_level??0;
  w_breakdownOpen=false;
  document.getElementById('w-cost-breakdown').classList.remove('open');
  document.getElementById('w-cost-toggle-label').textContent='▲ Show breakdown';
  document.getElementById('w-name').value=weapon?.name||'';
  document.getElementById('w-id').value  =weapon?.id||'';
  document.getElementById('w-type').value=w_type;
  document.getElementById('w-exclusive').checked=weapon?.exclusive==='yes';
  document.getElementById('w-power').value=w_power;
  document.getElementById('w-pl-badge').textContent=(w_power>=0?'+':'')+w_power;
  document.getElementById('w-save-ind').textContent='';
  weapons_renderStats(); weapons_renderAppliedRules(); weapons_populateRulesSelect(); weapons_updateCost();
  prob_updateLabel();
  document.getElementById('overlay').classList.add('open');
  document.getElementById('weapon-panel').classList.add('open');
  panel_setReadonly('weapon-panel', readOnly);
  if(!readOnly) setTimeout(()=>document.getElementById('w-name').focus(),250);
}
function weapons_onNameInput(val){
  if(!w_editingId) document.getElementById('w-id').value=toSlug(val);
}
function weapons_scheduleSave(){ clearTimeout(w_saveTimer); w_saveTimer=setTimeout(weapons_save,300); }
function weapons_save(){
  if(w_editingId && !canEdit('weapons', w_editingId)) return;
  const name=document.getElementById('w-name').value.trim();
  const id  =document.getElementById('w-id').value.trim()||toSlug(name)||'weapon-'+Date.now();
  if(!name&&!id) return;
  const {total}=calcWeaponCost();
  const rangeOut=w_stats.min_range>0?`${w_stats.min_range}-${w_stats.range}`:w_stats.range;
  const data={id,name,type:document.getElementById('w-type').value,
    exclusive:document.getElementById('w-exclusive').checked?'yes':'no',
    range:rangeOut,attacks:w_stats.attacks,hit:w_stats.hit,crit:w_stats.crit,
    special_rules:[...w_appliedRules],power_level:w_power,cost:total};
  if(w_editingId){
    const idx=weapons.findIndex(w=>w.id===w_editingId);
    if(idx!==-1) weapons[idx]=data;
    else weapons.push(data);
  } else {
    weapons.push(data);
  }
  w_editingId=id; // always sync to the current ID
  persist(); weapons_render();
  const ind=document.getElementById('w-save-ind');
  ind.textContent='✓ Saved'; setTimeout(()=>ind.textContent='',2000);
}

function weapons_render(){
  const filterType=document.getElementById('weapons-type-filter')?.value||'';
  const search=(document.getElementById('weapons-search')?.value||'').trim().toLowerCase();
  const tbody=document.getElementById('weapons-tbody');
  let list=weapons;
  if(filterType) list=list.filter(w=>w.type===filterType);
  if(search) list=list.filter(w=>(w.name||'').toLowerCase().includes(search));
  list=sortedList(list,'weapons');
  // pinned always float to top, preserving sort order within each group
  list=[...list.filter(w=>pinnedWeapons.has(w.id)), ...list.filter(w=>!pinnedWeapons.has(w.id))];
  if(!list.length){
    tbody.innerHTML=`<tr><td colspan="8"><div class="empty-state"><span style="font-size:24px">⚔</span><p>No weapons yet. Add one to get started.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=list.map(w=>{
    const ruleNames=(w.special_rules||[]).map(rid=>{
      const r=weaponRules.find(r=>r.id===rid);
      if(!r) return '';
      const tooltip = r.description||'';
      return `<span class="rule-pill" title="${tooltip.replace(/"/g,'&quot;')}">${r.name}</span>`;
    }).join('');

    let col5, col6;
    if(mh_active){
      // Sum Fight/Shoot bonuses only — Defense rules don't affect attack rolls
      const atkBonus = (w.special_rules||[]).reduce((sum, rid)=>{
        const r = weaponRules.find(r=>r.id===rid);
        if(r?.effect?.characteristic!=='fight_shoot') return sum;
        return sum + (r.effect.bonus||0);
      }, 0);
      const effectiveAtk = Math.max(1, mh_atk + atkBonus);
      const effectiveAttacks = Math.max(0, (w.attacks??0) + mh_bonus);
      const c   = prob_chances(effectiveAtk, mh_def);
      const avg = (effectiveAttacks * (c.hit*(w.hit??0) + c.crit*(w.crit??0))).toFixed(2);
      const max = c.crit>0 ? effectiveAttacks*(w.crit??0) : (c.hit>0 ? effectiveAttacks*(w.hit??0) : 0);
      col5 = '';
      col6 = `
        <td class="stat-cell mh-miss">${pct(c.miss)}</td>
        <td class="stat-cell mh-hit">${pct(c.hit)}</td>
        <td class="stat-cell mh-crit">${c.crit>0?pct(c.crit):'—'}</td>
        <td class="stat-cell mh-avg">${avg}</td>
        <td class="stat-cell mh-max">${max}</td>`;
    } else {
      col5 = `<td class="cost-cell">${w.cost??'—'}gc</td>`;
      col6 = `<td>${ruleNames||'<span style="color:var(--text-muted);font-size:11px">—</span>'}</td>`;
    }

    return `<tr${pinnedWeapons.has(w.id)?' class="pinned-row"':''}>
      <td>
        <div class="fighter-name weapon-open-link" data-id="${w.id}" style="cursor:pointer">${w.name||'Untitled'}</div>
        <div class="fighter-id">${w.id||'—'}</div>
      </td>
      <td style="font-size:12px;color:var(--text-muted)">${WEAPON_TYPE_LABELS[w.type]||w.type||'—'}</td>
      <td class="stat-cell">${formatWeaponRange(w.range)}</td>
      <td class="stat-cell">${w.attacks??'—'}</td>
      <td class="stat-cell">${w.hit??'—'}/${w.crit??'—'}</td>
      ${col5}
      ${col6}
      <td><div class="row-actions">
        <button class="icon-btn pin-btn${pinnedWeapons.has(w.id)?' pinned':''} weapon-pin-btn" data-id="${w.id}" title="${pinnedWeapons.has(w.id)?'Unpin':'Pin'}">
          <i data-lucide="pin" style="width:16px;height:16px;pointer-events:none"></i>
        </button>${(IS_PUBLIC && canonicalIds.weapons.has(String(w.id)))?'':`
        <button class="icon-btn weapon-open-link" data-id="${w.id}" title="Edit">
          <i data-lucide="square-pen" style="width:16px;height:16px;pointer-events:none"></i>
        </button>
        <button class="icon-btn danger weapon-delete-btn" data-id="${w.id}" title="Delete">
          <i data-lucide="trash-2" style="width:16px;height:16px;pointer-events:none"></i>
        </button>`}
      </div></td>
    </tr>`;
  }).join('');
  lucide.createIcons({nodes: Array.from(document.querySelectorAll('#weapons-tbody [data-lucide]'))});
  wx_render();
}

document.getElementById('weapons-tbody').addEventListener('click',e=>{
  const pinEl=e.target.closest('.weapon-pin-btn');
  if(pinEl){ weapons_togglePin(pinEl.dataset.id); return; }
  const openEl=e.target.closest('.weapon-open-link');
  if(openEl){ const w=weapons.find(w=>w.id===openEl.dataset.id); if(w) weapons_openPanel(w, !canEdit('weapons', w.id)); return; }
  const delEl=e.target.closest('.weapon-delete-btn');
  if(delEl) weapons_delete(delEl.dataset.id);
});

function weapons_delete(id){
  if(!canEdit('weapons', id)) return;
  if(!confirm('Delete this weapon?')) return;
  weapons=weapons.filter(w=>w.id!==id); persist(); weapons_render();
}
function weapons_export(){
  const blob=new Blob([JSON.stringify(weapons,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='weapons.json';a.click();
}

// ══════════════════════════════════════════
// WEAPON RULES
// ══════════════════════════════════════════
let wr_editingId=null, wr_saveTimer=null, wr_bonus=0, wr_cost=0;

function wr_onNameInput(val){
  if(!wr_editingId) document.getElementById('wr-id').value=toSlug(val);
}
function wr_stepBonus(dir){
  wr_bonus = Math.max(-10, Math.min(10, wr_bonus + dir));
  document.getElementById('wr-bonus-val').textContent = (wr_bonus>0?'+':'')+wr_bonus;
}
function wr_onCostChange(val){
  wr_cost = parseInt(val);
  document.getElementById('wr-cost-badge').textContent = (wr_cost>=0?'+':'')+wr_cost;
}

function wr_openPanel(rule, readOnly=false){
  wr_editingId = rule?.id||null;
  wr_bonus = rule?.effect?.bonus||0;
  wr_cost  = rule?.cost||0;
  document.getElementById('wr-name').value        = rule?.name||'';
  document.getElementById('wr-id').value          = rule?.id||'';
  document.getElementById('wr-desc').value        = rule?.description||'';
  document.getElementById('wr-char').value        = rule?.effect?.characteristic||'';
  document.getElementById('wr-conditional').checked = rule?.effect?.conditional||false;
  document.getElementById('wr-bonus-val').textContent = (wr_bonus>0?'+':'')+wr_bonus;
  document.getElementById('wr-cost-slider').value = wr_cost;
  document.getElementById('wr-cost-badge').textContent = (wr_cost>=0?'+':'')+wr_cost;
  document.getElementById('wr-save-ind').textContent='';
  document.getElementById('overlay').classList.add('open');
  document.getElementById('wr-panel').classList.add('open');
  panel_setReadonly('wr-panel', readOnly);
  if(!readOnly) setTimeout(()=>document.getElementById('wr-name').focus(),250);
}

function wr_scheduleSave(){ clearTimeout(wr_saveTimer); wr_saveTimer=setTimeout(wr_save,300); }
function wr_save(){
  if(wr_editingId && !canEdit('weaponRules', wr_editingId)) return;
  const name=document.getElementById('wr-name').value.trim();
  const id  =document.getElementById('wr-id').value.trim()||toSlug(name)||'rule-'+Date.now();
  if(!name&&!id) return;
  const char=document.getElementById('wr-char').value;
  const data={
    id, name,
    description: document.getElementById('wr-desc').value,
    effect: char ? {
      characteristic: char,
      bonus: wr_bonus,
      conditional: document.getElementById('wr-conditional').checked,
    } : null,
    cost: wr_cost,
  };
  if(wr_editingId){
    const idx=weaponRules.findIndex(r=>r.id===wr_editingId);
    if(idx!==-1) weaponRules[idx]=data;
    else weaponRules.push(data);
  } else {
    weaponRules.push(data);
  }
  wr_editingId=id; // always sync to current ID
  // Recalculate cost of every weapon that references this rule
  weapons.forEach((w,i)=>{
    if((w.special_rules||[]).includes(wr_editingId||data.id)){
      const WB = weaponIsRanged(w.type) ? WEAPON_BASELINE_RANGED : WEAPON_BASELINE_MELEE;
      const ruleCost = (w.special_rules||[]).reduce((s,rid)=>{
        const r=weaponRules.find(r=>r.id===rid); return s+(r?.cost||0);
      },0);
      const base = WEAPON_COST_PROFILE.base;
      const rangeIncrement = weaponIsRanged(w.type) ? 6 : 1;
      const statCost =
        ((w.range / rangeIncrement) - WB.range/rangeIncrement) * WEAPON_COST_PROFILE.range +
        (w.attacks - WB.attacks) * WEAPON_COST_PROFILE.attacks +
        (w.hit     - WB.hit)     * WEAPON_COST_PROFILE.hit +
        (w.crit    - WB.crit)    * WEAPON_COST_PROFILE.crit;
      weapons[i] = {...w, cost: Math.max(0, base + statCost + ruleCost)};
    }
  });
  persist(); wr_render(); weapons_render();
  // refresh weapons panel rule select if open
  if(document.getElementById('weapon-panel').classList.contains('open')) weapons_populateRulesSelect();
  const ind=document.getElementById('wr-save-ind');
  ind.textContent='✓ Saved'; setTimeout(()=>ind.textContent='',2000);
}

function wr_render(){
  const search=(document.getElementById('wr-search')?.value||'').trim().toLowerCase();
  const tbody=document.getElementById('wr-tbody');
  let weaponRulesList=weaponRules;
  if(search) weaponRulesList=weaponRulesList.filter(r=>(r.name||'').toLowerCase().includes(search)||(r.description||'').toLowerCase().includes(search));
  if(!weaponRulesList.length){
    tbody.innerHTML=`<tr><td colspan="5"><div class="empty-state"><span style="font-size:24px">✦</span><p>No weapon rules yet. Add one to get started.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=sortedList(weaponRulesList,'wr').map(r=>{
    const charLabel = r.effect?.characteristic==='fight_shoot' ? 'Fight/Shoot' : r.effect?.characteristic==='defense' ? 'Defense' : r.effect?.characteristic||'';
    const effectStr = r.effect?.characteristic
      ? `${charLabel} ${r.effect.bonus>0?'+':''}${r.effect.bonus}${r.effect.conditional?' *':''}`
      : '—';
    const costStr = r.cost===0 ? '0gc' : (r.cost>0?'+':'')+r.cost+'gc';
    const ro = IS_PUBLIC && canonicalIds.weaponRules.has(String(r.id));
    return `<tr>
      <td>
        <div class="fighter-name wr-open-link" data-id="${r.id}" style="cursor:pointer">${r.name||'Untitled'}</div>
        <div class="fighter-id">${r.id||'—'}</div>
      </td>
      <td style="font-size:12px;color:var(--text-muted)">${r.description||'—'}</td>
      <td style="font-size:12px">${effectStr}</td>
      <td class="cost-cell">${costStr}</td>
      <td><div class="row-actions">${ro?'':`
        <button class="icon-btn wr-open-link" data-id="${r.id}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn danger wr-delete-btn" data-id="${r.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>`}
      </div></td>
    </tr>`;
  }).join('');
}

document.getElementById('wr-tbody').addEventListener('click',e=>{
  const openEl=e.target.closest('.wr-open-link');
  if(openEl){ const id=openEl.dataset.id; wr_openPanel(weaponRules.find(r=>r.id===id), !canEdit('weaponRules',id)); return; }
  const delEl=e.target.closest('.wr-delete-btn');
  if(delEl) wr_delete(delEl.dataset.id);
});

function wr_delete(id){
  if(!canEdit('weaponRules', id)) return;
  if(!confirm('Delete this weapon rule?')) return;
  weaponRules=weaponRules.filter(r=>r.id!==id); persist(); wr_render();
}
function wr_export(){
  const blob=new Blob([JSON.stringify(weaponRules,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='weapon-rules.json';a.click();
}

// ══════════════════════════════════════════
// SORTING
// ══════════════════════════════════════════
const sortState = { factions:{col:null,dir:1}, fighters:{col:null,dir:1}, weapons:{col:null,dir:1}, wr:{col:null,dir:1}, items:{col:null,dir:1}, abilities:{col:null,dir:1} };

function sortedList(list, table){
  const {col,dir} = sortState[table];
  if(!col) return list;
  return [...list].sort((a,b)=>{
    let av = a[col], bv = b[col];
    // special derived fields
    if(table==='factions'&&col==='fighters') { av=fighters.filter(f=>f.faction===a.id).length; bv=fighters.filter(f=>f.faction===b.id).length; }
    if(table==='factions'&&col==='weapons')  { av=Object.values(a.equipment||{}).filter(v=>v==='all'||v==='hero').length; bv=Object.values(b.equipment||{}).filter(v=>v==='all'||v==='hero').length; }
    if(table==='wr'&&col==='effect')    { av=a.effect?.characteristic||''; bv=b.effect?.characteristic||''; }
    if(table==='items'&&col==='effect') { av=a.effect?.characteristic||''; bv=b.effect?.characteristic||''; }
    // mathhammer derived fields
    if(col.startsWith('mh-')){
      const getRuleBonus = w => (w.special_rules||[]).reduce((s,rid)=>{
        const r=weaponRules.find(r=>r.id===rid);
        if(r?.effect?.characteristic!=='fight_shoot') return s;
        return s+(r.effect.bonus||0);
      },0);
      const getVals = w => {
        const effectiveAtk = Math.max(1, mh_atk + getRuleBonus(w));
        const effectiveAttacks = Math.max(0, (w.attacks||0) + mh_bonus);
        const c = prob_chances(effectiveAtk, mh_def);
        const avg = effectiveAttacks * (c.hit*(w.hit||0) + c.crit*(w.crit||0));
        const max = c.crit>0 ? effectiveAttacks*(w.crit||0) : (c.hit>0 ? effectiveAttacks*(w.hit||0) : 0);
        return { 'mh-miss':c.miss, 'mh-hit':c.hit, 'mh-crit':c.crit, 'mh-avg':avg, 'mh-max':max };
      };
      av = getVals(a)[col]; bv = getVals(b)[col];
    }
    if(av==null) av=''; if(bv==null) bv='';
    if(typeof av==='number'&&typeof bv==='number') return (av-bv)*dir;
    return String(av).localeCompare(String(bv))*dir;
  });
}

function sort_setHeader(table, col){
  const st = sortState[table];
  if(st.col===col) st.dir*=-1;
  else { st.col=col; st.dir=1; }
  // update th classes
  document.querySelectorAll(`th[data-table="${table}"]`).forEach(th=>{
    th.classList.remove('sort-asc','sort-desc');
    if(th.dataset.sort===col) th.classList.add(st.dir===1?'sort-asc':'sort-desc');
  });
}

// Wire all sortable headers via delegation
document.addEventListener('click', e=>{
  const th = e.target.closest('th.sortable');
  if(!th) return;
  const table = th.dataset.table;
  const col   = th.dataset.sort;
  sort_setHeader(table, col);
  if(table==='factions') factions_render();
  if(table==='fighters') fighters_render();
  if(table==='weapons')  weapons_render();
  if(table==='wr')       wr_render();
  if(table==='items')    items_render();
  if(table==='abilities') abilities_render();
});

// ══════════════════════════════════════════
// ITEMS
// ══════════════════════════════════════════
let it_editingId=null, it_saveTimer=null, it_bonus=0;

function items_onNameInput(val){
  if(!it_editingId) document.getElementById('it-id').value=toSlug(val);
}
function items_stepBonus(dir){
  it_bonus=Math.max(-10,Math.min(10,it_bonus+dir));
  document.getElementById('it-bonus-val').textContent=(it_bonus>0?'+':'')+it_bonus;
}
function items_openPanel(item, readOnly=false){
  it_editingId=item?.id||null;
  it_bonus=item?.effect?.bonus||0;
  document.getElementById('it-name').value  = item?.name||'';
  document.getElementById('it-id').value    = item?.id||'';
  document.getElementById('it-type').value  = item?.type||'armour';
  document.getElementById('it-desc').value  = item?.description||'';
  document.getElementById('it-char').value  = item?.effect?.characteristic||'';
  document.getElementById('it-cost').value  = item?.cost??'';
  document.getElementById('it-rare').checked = item?.rare||false;
  document.getElementById('it-bonus-val').textContent=(it_bonus>0?'+':'')+it_bonus;
  document.getElementById('it-save-ind').textContent='';
  document.getElementById('overlay').classList.add('open');
  document.getElementById('items-panel').classList.add('open');
  panel_setReadonly('items-panel', readOnly);
  if(!readOnly) setTimeout(()=>document.getElementById('it-name').focus(),250);
}
function items_scheduleSave(){ clearTimeout(it_saveTimer); it_saveTimer=setTimeout(items_save,300); }
function items_save(){
  if(it_editingId && !canEdit('items', it_editingId)) return;
  const name=document.getElementById('it-name').value.trim();
  const id  =document.getElementById('it-id').value.trim()||toSlug(name)||'item-'+Date.now();
  if(!name&&!id) return;
  const char=document.getElementById('it-char').value;
  const data={
    id, name,
    type: document.getElementById('it-type').value,
    description: document.getElementById('it-desc').value,
    effect: char ? { characteristic:char, bonus:it_bonus } : null,
    cost: parseInt(document.getElementById('it-cost').value)||0,
    rare: document.getElementById('it-rare').checked,
  };
  if(it_editingId){
    const idx=items.findIndex(i=>i.id===it_editingId);
    if(idx!==-1) items[idx]=data; else items.push(data);
  } else { items.push(data); }
  it_editingId=id;
  persist(); items_render();
  const ind=document.getElementById('it-save-ind');
  ind.textContent='✓ Saved'; setTimeout(()=>ind.textContent='',2000);
}
function items_render(){
  const search=(document.getElementById('items-search')?.value||'').trim().toLowerCase();
  const tbody=document.getElementById('items-tbody');
  let itemsList=items;
  if(search) itemsList=itemsList.filter(it=>(it.name||'').toLowerCase().includes(search)||(it.description||'').toLowerCase().includes(search));
  if(!itemsList.length){
    tbody.innerHTML=`<tr><td colspan="6"><div class="empty-state"><span style="font-size:24px">◈</span><p>No items yet. Add one to get started.</p></div></td></tr>`;
    return;
  }
  const typeLabel={armour:'Armour',miscellaneous:'Miscellaneous','single-use':'Single-Use'};
  tbody.innerHTML=sortedList(itemsList,'items').map(it=>{
    const charLabel=it.effect?.characteristic==='fight_shoot'?'Fight/Shoot':it.effect?.characteristic==='defense'?'Defense':'';
    const effectStr=it.effect?.characteristic?`${charLabel} ${it.effect.bonus>0?'+':''}${it.effect.bonus}`:'—';
    const ro = IS_PUBLIC && canonicalIds.items.has(String(it.id));
    return `<tr>
      <td>
        <div class="fighter-name item-open-link" data-id="${it.id}" style="cursor:pointer">${it.name||'Untitled'}${it.rare?` <span style="font-size:9px;color:#c17900;font-weight:600;letter-spacing:0.04em">RARE</span>`:''}</div>
        <div class="fighter-id">${it.id||'—'}</div>
      </td>
      <td style="font-size:12px;color:var(--text-muted)">${typeLabel[it.type]||it.type}</td>
      <td style="font-size:12px;color:var(--text-muted)">${it.description||'—'}</td>
      <td style="font-size:12px">${effectStr}</td>
      <td class="cost-cell">${it.cost??0}gc</td>
      <td><div class="row-actions">${ro?'':`
        <button class="icon-btn item-open-link" data-id="${it.id}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn danger item-delete-btn" data-id="${it.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>`}
      </div></td>
    </tr>`;
  }).join('');
}
document.getElementById('items-tbody').addEventListener('click',e=>{
  const openEl=e.target.closest('.item-open-link');
  if(openEl){ const id=openEl.dataset.id; items_openPanel(items.find(i=>i.id===id), !canEdit('items',id)); return; }
  const delEl=e.target.closest('.item-delete-btn');
  if(delEl) items_delete(delEl.dataset.id);
});
function items_delete(id){
  if(!canEdit('items', id)) return;
  if(!confirm('Delete this item?')) return;
  items=items.filter(i=>i.id!==id); persist(); items_render();
}
function items_export(){
  const blob=new Blob([JSON.stringify(items,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='items.json';a.click();
}

// ══════════════════════════════════════════
// ABILITIES
// ══════════════════════════════════════════
const ABILITY_STAT_KEYS = ['strength','toughness','agility','perception','wits'];
const ABILITY_STAT_LABELS = { strength:'Strength', toughness:'Toughness', agility:'Agility', perception:'Perception', wits:'Wits' };
const ABILITY_TYPES = { trait:'Trait', reaction:'Reaction', double:'Double', triple:'Triple', quad:'Quad' };

let ab_editingId=null, ab_saveTimer=null;

function abilityCategoryLabel(cat){
  if(!cat) return '—';
  if(cat==='unique') return 'Unique';
  if(ABILITY_STAT_LABELS[cat]) return ABILITY_STAT_LABELS[cat];
  const f=factions.find(x=>x.id===cat);
  if(f) return f.name||f.id;
  return cat;
}

/** Rebuild category dropdown: Unique, specialization stats, then one option per faction */
function abilities_populateCategorySelect(selected){
  const sel=document.getElementById('ab-category');
  if(!sel) return;
  sel.innerHTML='';
  const addOpt=(val,text)=>{ const o=document.createElement('option'); o.value=val; o.textContent=text; sel.appendChild(o); };
  addOpt('unique','Unique');
  const ogSp=document.createElement('optgroup');
  ogSp.label='Specialization';
  ABILITY_STAT_KEYS.forEach(k=>{
    const o=document.createElement('option');
    o.value=k; o.textContent=ABILITY_STAT_LABELS[k];
    ogSp.appendChild(o);
  });
  sel.appendChild(ogSp);
  const ogFa=document.createElement('optgroup');
  ogFa.label='Factions';
  [...factions].sort((a,b)=>(a.name||'').localeCompare(b.name||'')).forEach(f=>{
    const o=document.createElement('option');
    o.value=f.id;
    o.textContent=f.name||f.id;
    ogFa.appendChild(o);
  });
  sel.appendChild(ogFa);
  if(selected && ![...sel.options].some(o=>o.value===selected)){
    const o=document.createElement('option');
    o.value=selected;
    o.textContent=abilityCategoryLabel(selected)+' (unlinked)';
    ogFa.appendChild(o);
  }
  sel.value=[...sel.options].some(o=>o.value===selected) ? selected : 'unique';
}

function abilities_onNameInput(val){
  if(!ab_editingId) document.getElementById('ab-id').value=toSlug(val);
}
function abilities_openPanel(a, readOnly=false){
  ab_editingId=a?.id||null;
  abilities_populateCategorySelect(a?.category);
  document.getElementById('ab-name').value        = a?.name||'';
  document.getElementById('ab-id').value          = a?.id||'';
  document.getElementById('ab-ability-type').value= a?.ability_type&&ABILITY_TYPES[a.ability_type] ? a.ability_type : 'trait';
  document.getElementById('ab-desc').value        = a?.description||'';
  document.getElementById('ab-save-ind').textContent='';
  document.getElementById('overlay').classList.add('open');
  document.getElementById('abilities-panel').classList.add('open');
  panel_setReadonly('abilities-panel', readOnly);
  setTimeout(()=>{
    if(!readOnly) document.getElementById('ab-name').focus();
    lucide.createIcons({nodes: document.querySelectorAll('#abilities-panel [data-lucide]')});
  },250);
}
function abilities_scheduleSave(){ clearTimeout(ab_saveTimer); ab_saveTimer=setTimeout(abilities_save,300); }
function abilities_save(){
  if(ab_editingId && !canEdit('abilities', ab_editingId)) return;
  const name=document.getElementById('ab-name').value.trim();
  const id  =document.getElementById('ab-id').value.trim()||toSlug(name)||'ability-'+Date.now();
  if(!name&&!id) return;
  const data={
    id,
    name,
    category: document.getElementById('ab-category').value,
    ability_type: document.getElementById('ab-ability-type').value,
    description: document.getElementById('ab-desc').value,
  };
  if(ab_editingId){
    const idx=abilities.findIndex(x=>x.id===ab_editingId);
    if(idx!==-1) abilities[idx]=data; else abilities.push(data);
  } else { abilities.push(data); }
  ab_editingId=id;
  persist(); abilities_populateCategoryFilter(); abilities_render();
  const ind=document.getElementById('ab-save-ind');
  ind.textContent='✓ Saved'; setTimeout(()=>ind.textContent='',2000);
}
function abilities_populateCategoryFilter(){
  const sel=document.getElementById('abilities-category-filter');
  if(!sel) return;
  const cur=sel.value;
  sel.innerHTML='<option value="">All Categories</option>';
  const usedCats=new Set(abilities.map(a=>a.category).filter(Boolean));
  if(usedCats.has('unique')){
    const o=document.createElement('option'); o.value='unique'; o.textContent='Unique'; sel.appendChild(o);
  }
  const ogSp=document.createElement('optgroup'); ogSp.label='Specialization';
  ABILITY_STAT_KEYS.forEach(k=>{ if(usedCats.has(k)){ const o=document.createElement('option'); o.value=k; o.textContent=ABILITY_STAT_LABELS[k]; ogSp.appendChild(o); } });
  if(ogSp.children.length) sel.appendChild(ogSp);
  const ogFa=document.createElement('optgroup'); ogFa.label='Factions';
  [...factions].sort((a,b)=>(a.name||'').localeCompare(b.name||'')).forEach(f=>{ if(usedCats.has(f.id)){ const o=document.createElement('option'); o.value=f.id; o.textContent=f.name||f.id; ogFa.appendChild(o); } });
  if(ogFa.children.length) sel.appendChild(ogFa);
  if([...sel.options].some(o=>o.value===cur)) sel.value=cur;
}
function abilities_render(){
  const filterType=document.getElementById('abilities-type-filter')?.value||'';
  const filterCat=document.getElementById('abilities-category-filter')?.value||'';
  const search=(document.getElementById('abilities-search')?.value||'').trim().toLowerCase();
  const tbody=document.getElementById('abilities-tbody');
  let displayList=abilities;
  if(filterType) displayList=displayList.filter(x=>x.ability_type===filterType);
  if(filterCat)  displayList=displayList.filter(x=>x.category===filterCat);
  if(search) displayList=displayList.filter(x=>(x.name||'').toLowerCase().includes(search)||(x.description||'').toLowerCase().includes(search));
  if(!displayList.length){
    tbody.innerHTML=`<tr><td colspan="4"><div class="empty-state"><span style="font-size:24px">✦</span><p>No abilities yet. Add one to get started.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=sortedList(displayList,'abilities').map(x=>{
    const cat=abilityCategoryLabel(x.category);
    const typStr=ABILITY_TYPES[x.ability_type]||x.ability_type||'';
    const typPrefix=typStr?`[${typStr}] `:'';
    const desc=(x.description||'').trim();
    const descShort=desc.length>120?desc.slice(0,120)+'…':desc;
    const ro = IS_PUBLIC && canonicalIds.abilities.has(String(x.id));
    return `<tr>
      <td>
        <div class="fighter-name ability-open-link" data-id="${x.id}" style="cursor:pointer">${typPrefix}${x.name||'Untitled'}</div>
        <div class="fighter-id">${x.id||'—'}</div>
      </td>
      <td style="font-size:12px;color:var(--text-muted)">${cat}</td>
      <td style="font-size:12px;color:var(--text-muted)">${descShort||'—'}</td>
      <td><div class="row-actions">${ro?'':`
        <button class="icon-btn ability-open-link" data-id="${x.id}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="icon-btn danger ability-delete-btn" data-id="${x.id}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" pointer-events="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>`}
      </div></td>
    </tr>`;
  }).join('');
}
document.getElementById('abilities-tbody').addEventListener('click',e=>{
  const openEl=e.target.closest('.ability-open-link');
  if(openEl){ const id=openEl.dataset.id; abilities_openPanel(abilities.find(x=>x.id===id), !canEdit('abilities',id)); return; }
  const delEl=e.target.closest('.ability-delete-btn');
  if(delEl) abilities_delete(delEl.dataset.id);
});
function abilities_delete(id){
  if(!canEdit('abilities', id)) return;
  if(!confirm('Delete this ability?')) return;
  abilities=abilities.filter(x=>x.id!==id); persist(); abilities_populateCategoryFilter(); abilities_render();
}
function abilities_export(){
  const lines=['<?xml version="1.0" encoding="UTF-8"?>','<abilities>'];
  abilities.forEach(a=>{
    const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    lines.push(`  <ability id="${esc(a.id)}" category="${esc(a.category)}" type="${esc(a.ability_type)}">`);
    lines.push(`    <name>${esc(a.name)}</name>`);
    lines.push(`    <description>${esc(a.description)}</description>`);
    lines.push(`  </ability>`);
  });
  lines.push('</abilities>');
  const blob=new Blob([lines.join('\n')],{type:'application/xml'});
  const el=document.createElement('a');el.href=URL.createObjectURL(blob);el.download='abilities.xml';el.click();
}
function abilities_import(input){
  if(IS_PUBLIC) return;
  const file=input.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const parser=new DOMParser();
      const doc=parser.parseFromString(e.target.result,'application/xml');
      if(doc.querySelector('parsererror')) throw new Error('Invalid XML');
      const imported=[...doc.querySelectorAll('ability')].map(n=>({
        id:        n.getAttribute('id')||'',
        name:      n.querySelector('name')?.textContent||'',
        category:  n.getAttribute('category')||'unique',
        ability_type: n.getAttribute('type')||'trait',
        description: n.querySelector('description')?.textContent||'',
      })).filter(a=>a.id&&a.name);
      if(!imported.length) throw new Error('No abilities found in file');
      abilities=imported;
      persist(); abilities_populateCategoryFilter(); abilities_render();
      alert(`Imported ${imported.length} abilities.`);
    } catch(err){ alert('Import failed: '+err.message); }
    input.value='';
  };
  reader.readAsText(file);
}

// ══════════════════════════════════════════
// COST PROFILES
// ══════════════════════════════════════════
function cp_val(id){ return parseFloat(document.getElementById(id)?.value)||0; }

function cp_load(){
  // Fighter profile
  document.getElementById('cp-f-base').value      = COST_PROFILE.base;
  document.getElementById('cp-f-move').value      = COST_PROFILE.move;
  document.getElementById('cp-f-fight').value     = COST_PROFILE.fight;
  document.getElementById('cp-f-shoot').value     = COST_PROFILE.shoot;
  document.getElementById('cp-f-defense').value   = COST_PROFILE.defense;
  document.getElementById('cp-f-health').value    = COST_PROFILE.health;
  document.getElementById('cp-f-bravery').value   = COST_PROFILE.bravery;
  document.getElementById('cp-f-bl-move').value    = FIGHTER_BASELINE.move;
  document.getElementById('cp-f-bl-fight').value   = FIGHTER_BASELINE.fight;
  document.getElementById('cp-f-bl-shoot').value   = FIGHTER_BASELINE.shoot;
  document.getElementById('cp-f-bl-defense').value = FIGHTER_BASELINE.defense;
  document.getElementById('cp-f-bl-health').value  = FIGHTER_BASELINE.health;
  document.getElementById('cp-f-bl-bravery').value = FIGHTER_BASELINE.bravery;
  // Weapon profile
  document.getElementById('cp-w-base').value       = WEAPON_COST_PROFILE.base;
  document.getElementById('cp-w-range').value      = WEAPON_COST_PROFILE.range;
  document.getElementById('cp-w-attacks').value    = WEAPON_COST_PROFILE.attacks;
  document.getElementById('cp-w-hit').value        = WEAPON_COST_PROFILE.hit;
  document.getElementById('cp-w-crit').value       = WEAPON_COST_PROFILE.crit;
  document.getElementById('cp-w-bl-range-melee').value    = WEAPON_BASELINE_MELEE.range;
  document.getElementById('cp-w-bl-attacks-melee').value  = WEAPON_BASELINE_MELEE.attacks;
  document.getElementById('cp-w-bl-hit-melee').value      = WEAPON_BASELINE_MELEE.hit;
  document.getElementById('cp-w-bl-crit-melee').value     = WEAPON_BASELINE_MELEE.crit;
  document.getElementById('cp-w-bl-range-ranged').value   = WEAPON_BASELINE_RANGED.range;
  document.getElementById('cp-w-bl-attacks-ranged').value = WEAPON_BASELINE_RANGED.attacks;
  document.getElementById('cp-w-bl-hit-ranged').value     = WEAPON_BASELINE_RANGED.hit;
  document.getElementById('cp-w-bl-crit-ranged').value    = WEAPON_BASELINE_RANGED.crit;
  if(IS_PUBLIC) document.querySelectorAll('#view-cost-profiles input').forEach(el=>{ el.disabled=true; });
}

function cp_save(which){
  if(IS_PUBLIC) return;
  if(!which||which==='fighter'){
    COST_PROFILE.base    = cp_val('cp-f-base');
    COST_PROFILE.move    = cp_val('cp-f-move');
    COST_PROFILE.fight   = cp_val('cp-f-fight');
    COST_PROFILE.shoot   = cp_val('cp-f-shoot');
    COST_PROFILE.defense = cp_val('cp-f-defense');
    COST_PROFILE.health  = cp_val('cp-f-health');
    COST_PROFILE.bravery = cp_val('cp-f-bravery');
    FIGHTER_BASELINE.move    = cp_val('cp-f-bl-move');
    FIGHTER_BASELINE.fight   = cp_val('cp-f-bl-fight');
    FIGHTER_BASELINE.shoot   = cp_val('cp-f-bl-shoot');
    FIGHTER_BASELINE.defense = cp_val('cp-f-bl-defense');
    FIGHTER_BASELINE.health  = cp_val('cp-f-bl-health');
    FIGHTER_BASELINE.bravery = cp_val('cp-f-bl-bravery');
    localStorage.setItem('wyrdforge_cp_fighter', JSON.stringify(COST_PROFILE));
    localStorage.setItem('wyrdforge_fb',          JSON.stringify(FIGHTER_BASELINE));
    cp_recalcAllFighterCosts();
    const ind=document.getElementById('cp-f-saved');
    if(ind){ ind.textContent='✓ Saved'; setTimeout(()=>ind.textContent='',2000); }
  }
  if(!which||which==='weapon'){
    WEAPON_COST_PROFILE.base    = cp_val('cp-w-base');
    WEAPON_COST_PROFILE.range   = cp_val('cp-w-range');
    WEAPON_COST_PROFILE.attacks = cp_val('cp-w-attacks');
    WEAPON_COST_PROFILE.hit     = cp_val('cp-w-hit');
    WEAPON_COST_PROFILE.crit    = cp_val('cp-w-crit');
    WEAPON_BASELINE_MELEE.range   = cp_val('cp-w-bl-range-melee');
    WEAPON_BASELINE_MELEE.attacks = cp_val('cp-w-bl-attacks-melee');
    WEAPON_BASELINE_MELEE.hit     = cp_val('cp-w-bl-hit-melee');
    WEAPON_BASELINE_MELEE.crit    = cp_val('cp-w-bl-crit-melee');
    WEAPON_BASELINE_RANGED.range   = cp_val('cp-w-bl-range-ranged');
    WEAPON_BASELINE_RANGED.attacks = cp_val('cp-w-bl-attacks-ranged');
    WEAPON_BASELINE_RANGED.hit     = cp_val('cp-w-bl-hit-ranged');
    WEAPON_BASELINE_RANGED.crit    = cp_val('cp-w-bl-crit-ranged');
    localStorage.setItem('wyrdforge_cp_weapon',  JSON.stringify(WEAPON_COST_PROFILE));
    localStorage.setItem('wyrdforge_wb_melee',   JSON.stringify(WEAPON_BASELINE_MELEE));
    localStorage.setItem('wyrdforge_wb_ranged',  JSON.stringify(WEAPON_BASELINE_RANGED));
    cp_recalcAllWeaponCosts();
    const ind=document.getElementById('cp-w-saved');
    if(ind){ ind.textContent='✓ Saved'; setTimeout(()=>ind.textContent='',2000); }
  }
}

function cp_recalcAllFighterCosts(){
  fighters=fighters.map(f=>{
    if(f.fighter_type==='hired-sword') return f;
    const B=FIGHTER_BASELINE;
    const braveryDelta=B.bravery-( f.bravery??B.bravery);
    const total=Math.max(0,
      COST_PROFILE.base+
      ((f.move   ??B.move)   -B.move)   *COST_PROFILE.move+
      ((f.fight  ??B.fight)  -B.fight)  *COST_PROFILE.fight+
      ((f.shoot  ??B.shoot)  -B.shoot)  *COST_PROFILE.shoot+
      ((f.defense??B.defense)-B.defense)*COST_PROFILE.defense+
      (((f.health??B.health) -B.health)/2)*COST_PROFILE.health+
      braveryDelta*COST_PROFILE.bravery+
      (f.power_level??0)
    );
    return {...f, cost:total};
  });
  persist(); fighters_render();
  if(document.getElementById('fighter-panel').classList.contains('open')) fighters_updateCost();
}

function cp_recalcAllWeaponCosts(){
  weapons.forEach((w,i)=>{
    const WB = weaponIsRanged(w.type) ? WEAPON_BASELINE_RANGED : WEAPON_BASELINE_MELEE;
    const rangeIncrement = weaponIsRanged(w.type) ? 6 : 1;
    const ruleCost = (w.special_rules||[]).reduce((s,rid)=>{
      const r=weaponRules.find(r=>r.id===rid); return s+(r?.cost||0);
    },0);
    const maxRange = parseWeaponRange(w.range).max;
    const statCost =
      ((maxRange/rangeIncrement) - WB.range/rangeIncrement) * WEAPON_COST_PROFILE.range +
      (w.attacks - WB.attacks) * WEAPON_COST_PROFILE.attacks +
      (w.hit     - WB.hit)     * WEAPON_COST_PROFILE.hit +
      (w.crit    - WB.crit)    * WEAPON_COST_PROFILE.crit;
    weapons[i] = {...w, cost: Math.max(0, WEAPON_COST_PROFILE.base + statCost + ruleCost)};
  });
  persist(); weapons_render();
  if(document.getElementById('weapon-panel').classList.contains('open')) weapons_updateCost();
}

function cp_export(){
  const data={
    fighter:{ base_cost:COST_PROFILE.base, baselines:FIGHTER_BASELINE, costs:{ move:COST_PROFILE.move, fight:COST_PROFILE.fight, shoot:COST_PROFILE.shoot, defense:COST_PROFILE.defense, health:COST_PROFILE.health, bravery:COST_PROFILE.bravery } },
    weapon:{ base_cost:WEAPON_COST_PROFILE.base, baselines_melee:WEAPON_BASELINE_MELEE, baselines_ranged:WEAPON_BASELINE_RANGED, costs:{ range:WEAPON_COST_PROFILE.range, attacks:WEAPON_COST_PROFILE.attacks, hit:WEAPON_COST_PROFILE.hit, crit:WEAPON_COST_PROFILE.crit } },
  };
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cost-profiles.json';a.click();
}

// ══════════════════════════════════════════
// DATA EXPORT / IMPORT (ZIP)
// ══════════════════════════════════════════
async function data_exportAll(){
  const date = new Date().toISOString().slice(0,10);
  const name = prompt('Export name:', `wyrdforge-${date}`);
  if(name===null) return;
  const zip = new JSZip();
  zip.file('factions.json',     JSON.stringify(factions,     null,2));
  zip.file('fighters.json',     JSON.stringify(fighters.map(({fighter_type,...rest})=>rest), null,2));
  zip.file('weapons.json',      JSON.stringify(weapons,      null,2));
  zip.file('weapon-rules.json', JSON.stringify(weaponRules,  null,2));
  zip.file('items.json',        JSON.stringify(items,        null,2));
  zip.file('abilities.json',    JSON.stringify(abilities,    null,2));
  zip.file('keywords.json',     JSON.stringify(keywords,     null,2));
  zip.file('cost-profiles.json', JSON.stringify({
    fighter:        { base_cost:COST_PROFILE.base,        baselines:FIGHTER_BASELINE,       costs:{ move:COST_PROFILE.move, fight:COST_PROFILE.fight, shoot:COST_PROFILE.shoot, defense:COST_PROFILE.defense, health:COST_PROFILE.health, bravery:COST_PROFILE.bravery } },
    weapon:         { base_cost:WEAPON_COST_PROFILE.base, baselines_melee:WEAPON_BASELINE_MELEE, baselines_ranged:WEAPON_BASELINE_RANGED, costs:{ range:WEAPON_COST_PROFILE.range, attacks:WEAPON_COST_PROFILE.attacks, hit:WEAPON_COST_PROFILE.hit, crit:WEAPON_COST_PROFILE.crit } },
  }, null, 2));
  const blob = await zip.generateAsync({type:'blob'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name||`wyrdforge-${date}`}.zip`;
  a.click();
}

async function data_importAll(input){
  if(IS_PUBLIC) return;
  const file = input.files[0]; if(!file) return;
  try {
    const zip = await JSZip.loadAsync(file);
    const files = Object.values(zip.files).filter(f=>!f.dir);
    const fileIndex = new Map(
      files.map(f => [
        f.name.split('/').pop().toLowerCase(),
        f
      ])
    );
    const read = async (...names) => {
      for(const name of names){
        const f = fileIndex.get(name.toLowerCase());
        if(!f) continue;
        return JSON.parse(await f.async('string'));
      }
      return null;
    };
    const asArray = (data) => {
      if(Array.isArray(data)) return data;
      if(data && typeof data === 'object') return Object.values(data);
      return null;
    };
    const normalizeTags = (val) => {
      if(Array.isArray(val)) return val.map(v=>String(v).trim()).filter(Boolean);
      if(typeof val === 'string') return val.split(',').map(v=>v.trim()).filter(Boolean);
      return [];
    };
    const normalizeFighter = (fi) => {
      if(!fi || typeof fi !== 'object') return null;
      let defaultEquipment=fi.default_equipment;
      if(!Array.isArray(defaultEquipment)||!defaultEquipment.length){
        const nw=(fi.natural_weapon??'').toString().trim();
        defaultEquipment=nw?[`weapon:${nw}`]:[];
      }
      return {
        ...fi,
        id: (fi.id ?? '').toString(),
        name: (fi.name ?? 'Untitled').toString(),
        fighter_type: fi.fighter_type==='hired-sword'?'hired-sword':'regular',
        faction: (fi.faction ?? '').toString(),
        default_equipment: defaultEquipment,
        race: normalizeTags(fi.race),
        keywords: normalizeTags(fi.keywords),
        faction_ability_ids: normalizeTags(fi.faction_ability_ids),
      };
    };
    if(!confirm('This will replace all current data with the imported files. Continue?')) { input.value=''; return; }
    factions    = asArray(await read('factions.json')) || factions;
    const importedFighters = asArray(await read('fighters.json', 'fighter-types.json'));
    fighters    = importedFighters ? importedFighters.map(normalizeFighter).filter(Boolean) : fighters;
    weapons     = asArray(await read('weapons.json')) || weapons;
    weaponRules = asArray(await read('weapon-rules.json', 'weaponrules.json')) || weaponRules;
    items       = asArray(await read('items.json')) || items;
    const importedAbilities = asArray(await read('abilities.json'));
    const normalizeAbilityCategory = (cat) => {
      const s = typeof cat === 'string' ? cat : '';
      if(s === 'specialization') return 'strength';
      if(s === 'faction') return 'unique';
      if(s === 'unique' || ABILITY_STAT_KEYS.includes(s)) return s;
      if(factions.some(f=>f.id===s)) return s;
      return 'unique';
    };
    const normalizeAbility = (a) => {
      if(!a || typeof a !== 'object') return null;
      const t = a.ability_type;
      const ability_type = ['trait','reaction','double','triple','quad'].includes(t) ? t : 'trait';
      return {
        id: (a.id ?? '').toString(),
        name: (a.name ?? 'Untitled').toString(),
        category: normalizeAbilityCategory(a.category),
        ability_type,
        description: (a.description ?? '').toString(),
      };
    };
    abilities   = importedAbilities ? importedAbilities.map(normalizeAbility).filter(Boolean) : abilities;
    const kw = await read('keywords.json');
    if (kw && typeof kw === 'object' && !Array.isArray(kw)) {
      keywords = {race: Array.isArray(kw.race) ? kw.race : [], archetype: Array.isArray(kw.archetype) ? kw.archetype : []};
    }
    const cp    = await read('cost-profiles.json');
    if(cp){
      if(cp.fighter) { Object.assign(COST_PROFILE, cp.fighter.costs||{}); Object.assign(FIGHTER_BASELINE, cp.fighter.baselines||{}); COST_PROFILE.base=cp.fighter.base_cost??COST_PROFILE.base; }
      if(cp.weapon)  { Object.assign(WEAPON_COST_PROFILE, cp.weapon.costs||{}); Object.assign(WEAPON_BASELINE_MELEE, cp.weapon.baselines_melee||{}); Object.assign(WEAPON_BASELINE_RANGED, cp.weapon.baselines_ranged||{}); WEAPON_COST_PROFILE.base=cp.weapon.base_cost??WEAPON_COST_PROFILE.base; }
    }
    pinnedWeapons = new Set();
    persist();
    showView('factions');
    input.value='';
  } catch(err) {
    alert('Import failed: '+err.message);
    input.value='';
  }
}

// ══════════════════════════════════════════
// INIT
// ══════════════════════════════════════════
const savedTheme = localStorage.getItem('wyrdforge_theme');
if(savedTheme==='dark') applyTheme('dark');

function applyTheme(theme){
  document.body.classList.toggle('dark', theme==='dark');
  document.getElementById('theme-icon-moon').style.display = theme==='dark' ? 'none' : '';
  document.getElementById('theme-icon-sun').style.display  = theme==='dark' ? '' : 'none';
}
function toggleTheme(){
  const isDark = document.body.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  localStorage.setItem('wyrdforge_theme', next);
  applyTheme(next);
}

async function init(){
  document.body.classList.toggle('public-mode', IS_PUBLIC);
  if(IS_LOCAL){
    // Load the author's working copy from localStorage.
    for(const k in KINDS) KINDS[k].set(JSON.parse(localStorage.getItem(KINDS[k].ls)||'[]'));
    keywords = normalizeKeywords(JSON.parse(localStorage.getItem('wyrdforge_keywords')||'null'));
    COST_PROFILE           = {..._defaultCP,       ...JSON.parse(localStorage.getItem('wyrdforge_cp_fighter')||'{}')};
    WEAPON_COST_PROFILE    = {..._defaultWCP,      ...JSON.parse(localStorage.getItem('wyrdforge_cp_weapon')||'{}')};
    WEAPON_BASELINE_MELEE  = {..._defaultWB_melee, ...JSON.parse(localStorage.getItem('wyrdforge_wb_melee')||'{}')};
    WEAPON_BASELINE_RANGED = {..._defaultWB_ranged,...JSON.parse(localStorage.getItem('wyrdforge_wb_ranged')||'{}')};
    FIGHTER_BASELINE       = {..._defaultFB,       ...JSON.parse(localStorage.getItem('wyrdforge_fb')||'{}')};
    WEAPON_BASELINE = WEAPON_BASELINE_MELEE;
    // One-time migrations (repo JSON is already migrated at export time, so public skips these).
    if(!localStorage.getItem('wyrdforge_abilities_cat_v2')){
      abilities = normalizeSeededAbilities(abilities);
      localStorage.setItem('wyrdforge_abilities', JSON.stringify(abilities));
      localStorage.setItem('wyrdforge_abilities_cat_v2','1');
    }
    if(!localStorage.getItem('wyrdforge_v2_bravery')){
      if(typeof FIGHTER_BASELINE.bravery==='number' && FIGHTER_BASELINE.bravery<=4) FIGHTER_BASELINE.bravery+=2;
      localStorage.setItem('wyrdforge_fb', JSON.stringify(FIGHTER_BASELINE));
      localStorage.setItem('wyrdforge_v2_bravery','1');
    }
    if(!localStorage.getItem('wyrdforge_bravery_reset')){
      fighters = fighters.map(f=>({...f, bravery:5}));
      localStorage.setItem('wyrdforge_fighters', JSON.stringify(fighters));
      localStorage.setItem('wyrdforge_bravery_reset','1');
    }
    // Seed from repo data on a completely fresh install.
    const empty = !factions.length && !fighters.length && !weapons.length && !weaponRules.length && !items.length && !abilities.length;
    if(empty){
      const seed = await seedFromRepo();
      if(seed.factions)    factions    = seed.factions;
      if(seed.fighters)    fighters    = normalizeSeededFighters(seed.fighters);
      if(seed.weapons)     weapons     = seed.weapons;
      if(seed.weaponRules) weaponRules = seed.weaponRules;
      if(seed.items)       items       = seed.items;
      if(seed.abilities)   abilities   = normalizeSeededAbilities(seed.abilities);
      if(seed.keywords)    keywords    = mergeKeywords(keywords, seed.keywords);
      applyCostProfilesFromFile(seed.costProfiles);
      persist(); persistCostProfiles();
    }
  } else {
    // PUBLIC: canonical data comes fresh from the repo each load; user additions overlay it.
    const seed = await seedFromRepo();
    canonical.factions    = seed.factions    || [];
    canonical.fighters    = normalizeSeededFighters(seed.fighters);
    canonical.weapons     = seed.weapons     || [];
    canonical.weaponRules = seed.weaponRules || [];
    canonical.items       = seed.items       || [];
    canonical.abilities   = normalizeSeededAbilities(seed.abilities);
    for(const k in KINDS) canonicalIds[k] = new Set((canonical[k]||[]).map(x=>String(x.id)));
    applyCostProfilesFromFile(seed.costProfiles);
    keywords = mergeKeywords(seed.keywords, JSON.parse(localStorage.getItem('wyrdforge_user_keywords')||'null'));
    rebuild();
  }
  factions_render();
  lucide.createIcons();
}
init();

// Fighter tab switching
function fighters_switchTab(name){
  document.querySelectorAll('#fighter-panel .tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('#fighter-panel .tab').forEach(t=>t.classList.remove('active'));
  document.getElementById('fitab-'+name).classList.add('active');
  document.getElementById('fitab-btn-'+name).classList.add('active');
}
document.getElementById('fitab-btn-characteristics').onclick=()=>fighters_switchTab('characteristics');
document.getElementById('fitab-btn-keywords').onclick=()=>fighters_switchTab('keywords');
document.getElementById('fitab-btn-abilities').onclick=()=>fighters_switchTab('abilities');

// Race & Keywords tag inputs
(function(){
  const race = document.getElementById('race-input');
  race.addEventListener('keydown', e => fighters_tagKeydown(e, 'race'));
  race.addEventListener('input',   () => fighters_tagAutocomplete(race, 'race'));
  race.addEventListener('focus',   () => fighters_tagAutocomplete(race, 'race'));
  race.addEventListener('blur',    () => setTimeout(() => hideAutocomplete('race'), 150));

  const kw = document.getElementById('kw-input');
  kw.addEventListener('keydown', e => fighters_tagKeydown(e, 'kw'));
  kw.addEventListener('input',   () => fighters_tagAutocomplete(kw, 'kw'));
  kw.addEventListener('focus',   () => fighters_tagAutocomplete(kw, 'kw'));
  kw.addEventListener('blur',    () => setTimeout(() => hideAutocomplete('kw'), 150));
})();
