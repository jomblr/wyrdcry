import { useReducer, useEffect, useCallback } from 'react';
import campaignRules from '@site/src/data/campaign-rules.json';
import weaponsData from '@site/src/data/weapons.json';
import itemsData from '@site/src/data/items.json';
import factionsData from '@site/src/data/factions.json';
import fightersData from '@site/src/data/fighters.json';

// crypto.randomUUID() requires a secure context (HTTPS/localhost).
// This fallback works over plain HTTP on a local network.
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatKey = 'move' | 'fight' | 'shoot' | 'defense' | 'health' | 'bravery';

export interface FighterInstance {
  instanceId: string;
  fighterId: string;
  customName: string;
  equipment: string[];
  pendingEquipment: string[];
  isPending: boolean;
  notes: string;
  costOverride: number | null;
  xp: number;
  renown: number;
  statOverrides: Partial<Record<StatKey, number>>;
}

export interface CustomAbility {
  id: string;
  fighter: string;
  type: string;
  ability: string;
}

export interface CustomWeapon {
  id: string;
  name: string;
  range: string;
  attacks: string;
  hit: string;
  crit: string;
  special: string;
}

export interface Warband {
  id: string;
  name: string;
  factionId: string | null;
  favour: number;
  gold: number;
  fighters: FighterInstance[];
  stash: string[]; // item IDs parked in warband stash
  factionNotes: string;
  customWeapons: CustomWeapon[];
  customAbilities: CustomAbility[];
}

interface WarbandState {
  /** The warband currently being edited */
  active: Warband;
  /** IDs of all persisted warbands, in display order */
  savedIds: string[];
}

type Action =
  | { type: 'SET_NAME'; name: string }
  | { type: 'SET_GOLD'; gold: number }
  | { type: 'SET_FACTION'; factionId: string }
  | { type: 'SET_FACTION_NOTES'; notes: string }
  | { type: 'ADD_FIGHTER'; fighter: FighterInstance }
  | { type: 'REMOVE_FIGHTER'; instanceId: string }
  | { type: 'SET_FIGHTER_NAME'; instanceId: string; name: string }
  | { type: 'SET_FIGHTER_XP'; instanceId: string; xp: number }
  | { type: 'SET_FIGHTER_RENOWN'; instanceId: string; renown: number }
  | { type: 'SET_FIGHTER_EQUIPMENT'; instanceId: string; equipment: string[] }
  | { type: 'SET_FIGHTER_PENDING_EQUIPMENT'; instanceId: string; pendingEquipment: string[] }
  | { type: 'PURCHASE_PENDING' }
  | { type: 'SET_FIGHTER_STAT'; instanceId: string; stat: StatKey; value: number }
  | { type: 'SET_FIGHTER_NOTES'; instanceId: string; notes: string }
  | { type: 'SET_FIGHTER_COST_OVERRIDE'; instanceId: string; costOverride: number | null }
  | { type: 'REORDER_FIGHTERS'; fighters: FighterInstance[] }
  | { type: 'TRANSFER_EQUIPMENT'; fromId: string; toId: string; itemId: string; itemIdx: number }
  | { type: 'SEND_TO_STASH'; instanceId: string; itemIdx: number }
  | { type: 'TAKE_FROM_STASH'; instanceId: string; itemId: string }
  | { type: 'REMOVE_FROM_STASH'; itemIdx: number }
  | { type: 'SET_FAVOUR'; favour: number }
  | { type: 'SELL_FROM_STASH'; itemIdx: number; salePrice: number }
  | { type: 'ADD_CUSTOM_WEAPON'; weapon: CustomWeapon }
  | { type: 'UPDATE_CUSTOM_WEAPON'; id: string; patch: Partial<Omit<CustomWeapon, 'id'>> }
  | { type: 'REMOVE_CUSTOM_WEAPON'; id: string }
  | { type: 'ADD_CUSTOM_ABILITY'; ability: CustomAbility }
  | { type: 'UPDATE_CUSTOM_ABILITY'; id: string; patch: Partial<Omit<CustomAbility, 'id'>> }
  | { type: 'REMOVE_CUSTOM_ABILITY'; id: string }
  | { type: 'LOAD_WARBAND'; warband: Warband }
  | { type: 'NEW_WARBAND' }
  | { type: 'REGISTER_WARBAND'; id: string }
  | { type: 'DELETE_WARBAND'; id: string; nextWarband: Warband };

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_INDEX_KEY = 'wyrdcry-warbands';
const storageKey = (id: string) => `wyrdcry-warband-${id}`;

function newWarband(): Warband {
  return {
    id: uuid(),
    name: '',
    factionId: null,
    favour: campaignRules.default_favour,
    gold: campaignRules.warband_budget,
    fighters: [],
    stash: [],
    factionNotes: '',
    customWeapons: [],
    customAbilities: [],
  };
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

function loadIndex(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveIndex(ids: string[]) {
  localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(ids));
}

function loadWarband(id: string): Warband | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const wb = JSON.parse(raw) as Warband;
    if (!wb.stash) wb.stash = [];
    if (wb.factionNotes === undefined) wb.factionNotes = '';
    if (wb.gold === undefined) wb.gold = campaignRules.warband_budget;
    if (!wb.customWeapons) wb.customWeapons = [];
    if (!wb.customAbilities) wb.customAbilities = [];
    // Backwards compat: old fighters won't have statOverrides or notes
    wb.fighters = wb.fighters.map(f => {
      const { specialRules, ...rest } = f as any;
      return { statOverrides: {}, notes: Array.isArray(specialRules) ? specialRules.join(', ') : '', costOverride: null, isPending: false, pendingEquipment: [], ...rest };
    });
    return wb;
  } catch {
    return null;
  }
}

function persistWarband(warband: Warband) {
  localStorage.setItem(storageKey(warband.id), JSON.stringify(warband));
}

function removeWarband(id: string) {
  localStorage.removeItem(storageKey(id));
}

// ─── Derived values ───────────────────────────────────────────────────────────

export function calcReputation(warband: Warband): number {
  return warband.fighters.reduce((sum, f) => sum + f.renown, 0) + warband.favour;
}

export function calcStanding(reputation: number): string {
  const thresholds = campaignRules.standing_thresholds;
  for (const tier of thresholds) {
    if (reputation >= tier.min && reputation <= tier.max) return tier.label;
  }
  return thresholds[thresholds.length - 1]?.label ?? '—';
}

export function getFavourTier(favour: number): { label: string; defaultGold: number } {
  const tiers = campaignRules.favour_tiers;
  for (const tier of tiers) {
    if (favour >= tier.min && favour <= tier.max) return { label: tier.label, defaultGold: tier.default_gold };
  }
  const last = tiers[tiers.length - 1];
  return { label: last.label, defaultGold: last.default_gold };
}

function itemCost(id: string): number {
  const w = weaponsData.find(x => x.id === id);
  if (w) return w.cost;
  return itemsData.find(x => x.id === id)?.cost ?? 0;
}

export function calcValue(warband: Warband, fightersData: { id: string; cost: number }[]): number {
  const fightersCost = warband.fighters.reduce((sum, fi) => {
    if (fi.isPending) return sum;
    const profile = fightersData.find(f => f.id === fi.fighterId);
    const baseCost = fi.costOverride ?? profile?.cost ?? 0;
    const equipCost = fi.equipment.reduce((s, eid, idx) => {
      // First dagger per fighter is free
      const cost = eid === 'dagger' && fi.equipment.indexOf(eid) === idx ? 0 : itemCost(eid);
      return s + cost;
    }, 0);
    return sum + baseCost + equipCost;
  }, 0);
  const stashCost = warband.stash.reduce((s, id) => s + itemCost(id), 0);
  return fightersCost + stashCost;
}

export function calcPendingCost(warband: Warband, fightersData: { id: string; cost: number }[]): number {
  return warband.fighters.reduce((sum, fi) => {
    if (fi.isPending) {
      const profile = fightersData.find(f => f.id === fi.fighterId);
      const baseCost = fi.costOverride ?? profile?.cost ?? 0;
      const equipCost = fi.equipment.reduce((s, eid, idx) => {
        const cost = eid === 'dagger' && fi.equipment.indexOf(eid) === idx ? 0 : itemCost(eid);
        return s + cost;
      }, 0);
      return sum + baseCost + equipCost;
    }
    return sum + fi.pendingEquipment.reduce((s, eid, idx) => {
      const alreadyHasDagger = fi.equipment.includes('dagger');
      const isFreeFirstDagger = eid === 'dagger' && !alreadyHasDagger && fi.pendingEquipment.indexOf('dagger') === idx;
      return s + (isFreeFirstDagger ? 0 : itemCost(eid));
    }, 0);
  }, 0);
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: WarbandState, action: Action): WarbandState {
  switch (action.type) {
    case 'SET_NAME':
      return { ...state, active: { ...state.active, name: action.name } };

    case 'SET_GOLD':
      return { ...state, active: { ...state.active, gold: action.gold } };

    case 'SET_FACTION': {
      const faction = factionsData.find(f => f.id === action.factionId);
      return {
        ...state,
        active: {
          ...state.active,
          factionId: action.factionId,
          fighters: [],
          factionNotes: faction?.special_rules ?? '',
        },
      };
    }

    case 'SET_FACTION_NOTES':
      return { ...state, active: { ...state.active, factionNotes: action.notes } };

    case 'ADD_CUSTOM_WEAPON':
      return { ...state, active: { ...state.active, customWeapons: [...state.active.customWeapons, action.weapon] } };

    case 'UPDATE_CUSTOM_WEAPON':
      return {
        ...state,
        active: {
          ...state.active,
          customWeapons: state.active.customWeapons.map(w =>
            w.id === action.id ? { ...w, ...action.patch } : w,
          ),
        },
      };

    case 'REMOVE_CUSTOM_WEAPON':
      return {
        ...state,
        active: {
          ...state.active,
          customWeapons: state.active.customWeapons.filter(w => w.id !== action.id),
        },
      };

    case 'ADD_CUSTOM_ABILITY':
      return { ...state, active: { ...state.active, customAbilities: [...state.active.customAbilities, action.ability] } };

    case 'UPDATE_CUSTOM_ABILITY':
      return {
        ...state,
        active: {
          ...state.active,
          customAbilities: state.active.customAbilities.map(a =>
            a.id === action.id ? { ...a, ...action.patch } : a,
          ),
        },
      };

    case 'REMOVE_CUSTOM_ABILITY':
      return {
        ...state,
        active: {
          ...state.active,
          customAbilities: state.active.customAbilities.filter(a => a.id !== action.id),
        },
      };

    case 'ADD_FIGHTER':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: [...state.active.fighters, action.fighter],
        },
      };

    case 'REMOVE_FIGHTER': {
      const fi = state.active.fighters.find(f => f.instanceId === action.instanceId);
      let goldDeduct = 0;
      if (fi && !fi.isPending) {
        const profile = fightersData.find(f => f.id === fi.fighterId);
        const baseCost = fi.costOverride ?? profile?.cost ?? 0;
        const equipCost = fi.equipment.reduce((s, eid, idx) => {
          const cost = eid === 'dagger' && fi.equipment.indexOf(eid) === idx ? 0 : itemCost(eid);
          return s + cost;
        }, 0);
        goldDeduct = baseCost + equipCost;
      }
      return {
        ...state,
        active: {
          ...state.active,
          gold: state.active.gold - goldDeduct,
          fighters: state.active.fighters.filter(f => f.instanceId !== action.instanceId),
        },
      };
    }

    case 'SET_FIGHTER_NAME':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: state.active.fighters.map(f =>
            f.instanceId === action.instanceId ? { ...f, customName: action.name } : f,
          ),
        },
      };

    case 'SET_FIGHTER_XP':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: state.active.fighters.map(f => {
            if (f.instanceId !== action.instanceId) return f;
            if (action.xp > 3) return { ...f, xp: 0, renown: f.renown + 1 };
            return { ...f, xp: action.xp };
          }),
        },
      };

    case 'SET_FIGHTER_RENOWN':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: state.active.fighters.map(f =>
            f.instanceId === action.instanceId ? { ...f, renown: action.renown } : f,
          ),
        },
      };

    case 'SET_FIGHTER_EQUIPMENT':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: state.active.fighters.map(f =>
            f.instanceId === action.instanceId ? { ...f, equipment: action.equipment } : f,
          ),
        },
      };

    case 'SET_FIGHTER_PENDING_EQUIPMENT':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: state.active.fighters.map(f =>
            f.instanceId === action.instanceId ? { ...f, pendingEquipment: action.pendingEquipment } : f,
          ),
        },
      };

    case 'PURCHASE_PENDING':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: state.active.fighters.map(fi => ({
            ...fi,
            isPending: false,
            equipment: fi.isPending
              ? fi.equipment
              : [...fi.equipment, ...fi.pendingEquipment],
            pendingEquipment: [],
          })),
        },
      };

    case 'SET_FIGHTER_STAT':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: state.active.fighters.map(f =>
            f.instanceId === action.instanceId
              ? { ...f, statOverrides: { ...f.statOverrides, [action.stat]: action.value } }
              : f,
          ),
        },
      };

    case 'SET_FIGHTER_NOTES':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: state.active.fighters.map(f =>
            f.instanceId === action.instanceId ? { ...f, notes: action.notes } : f,
          ),
        },
      };

    case 'SET_FIGHTER_COST_OVERRIDE':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: state.active.fighters.map(f =>
            f.instanceId === action.instanceId ? { ...f, costOverride: action.costOverride } : f,
          ),
        },
      };

    case 'REORDER_FIGHTERS':
      return { ...state, active: { ...state.active, fighters: action.fighters } };

    case 'TRANSFER_EQUIPMENT':
      return {
        ...state,
        active: {
          ...state.active,
          fighters: state.active.fighters.map(f => {
            if (f.instanceId === action.fromId) {
              return { ...f, equipment: f.equipment.filter((_, i) => i !== action.itemIdx) };
            }
            if (f.instanceId === action.toId) {
              return { ...f, equipment: [...f.equipment, action.itemId] };
            }
            return f;
          }),
        },
      };

    case 'SEND_TO_STASH': {
      const src = state.active.fighters.find(f => f.instanceId === action.instanceId);
      if (!src) return state;
      const itemId = src.equipment[action.itemIdx];
      const updatedFighters = state.active.fighters.map(f =>
        f.instanceId === action.instanceId
          ? { ...f, equipment: f.equipment.filter((_, i) => i !== action.itemIdx) }
          : f,
      );
      // Daggers are discarded, not stashed
      if (itemId === 'dagger') {
        return { ...state, active: { ...state.active, fighters: updatedFighters } };
      }
      return {
        ...state,
        active: { ...state.active, fighters: updatedFighters, stash: [...state.active.stash, itemId] },
      };
    }

    case 'TAKE_FROM_STASH': {
      const idx = state.active.stash.indexOf(action.itemId);
      if (idx === -1) return state;
      return {
        ...state,
        active: {
          ...state.active,
          stash: state.active.stash.filter((_, i) => i !== idx),
          fighters: state.active.fighters.map(f =>
            f.instanceId === action.instanceId
              ? { ...f, equipment: [...f.equipment, action.itemId] }
              : f,
          ),
        },
      };
    }

    case 'REMOVE_FROM_STASH':
      return {
        ...state,
        active: {
          ...state.active,
          stash: state.active.stash.filter((_, i) => i !== action.itemIdx),
        },
      };

    case 'SELL_FROM_STASH': {
      const fullCost = itemCost(state.active.stash[action.itemIdx]);
      return {
        ...state,
        active: {
          ...state.active,
          stash: state.active.stash.filter((_, i) => i !== action.itemIdx),
          gold: state.active.gold + action.salePrice - fullCost,
        },
      };
    }

    case 'SET_FAVOUR':
      return { ...state, active: { ...state.active, favour: action.favour } };

    case 'LOAD_WARBAND':
      return { ...state, active: action.warband };

    case 'NEW_WARBAND':
      return { ...state, active: newWarband() };

    case 'REGISTER_WARBAND':
      if (state.savedIds.includes(action.id)) return state;
      return { ...state, savedIds: [...state.savedIds, action.id] };

    case 'DELETE_WARBAND':
      return {
        active: action.nextWarband,
        savedIds: state.savedIds.filter(id => id !== action.id),
      };

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWarband() {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const savedIds = loadIndex();
    const firstId = savedIds[0];
    const active = firstId ? (loadWarband(firstId) ?? newWarband()) : newWarband();
    return { active, savedIds };
  });

  const { active, savedIds } = state;
  const isSaved = savedIds.includes(active.id);

  // Persist the active warband to localStorage whenever it changes (if named or faction is set).
  // Also register it in savedIds state the first time it qualifies.
  useEffect(() => {
    if (!active.name.trim() && !active.factionId) return;
    persistWarband(active);
    if (!savedIds.includes(active.id)) {
      dispatch({ type: 'REGISTER_WARBAND', id: active.id });
    }
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the localStorage index in sync with savedIds state
  useEffect(() => {
    saveIndex(savedIds);
  }, [savedIds]);

  const savedWarbands: Warband[] = savedIds
    .map(id => (id === active.id ? active : loadWarband(id)))
    .filter(Boolean) as Warband[];

  // ── Actions ──

  const setName = useCallback((name: string) => dispatch({ type: 'SET_NAME', name }), []);
  const setGold = useCallback((gold: number) => dispatch({ type: 'SET_GOLD', gold }), []);
  const setFaction = useCallback((factionId: string) => dispatch({ type: 'SET_FACTION', factionId }), []);
  const setFavour = useCallback((favour: number) => dispatch({ type: 'SET_FAVOUR', favour }), []);
  const setFactionNotes = useCallback((notes: string) => dispatch({ type: 'SET_FACTION_NOTES', notes }), []);

  const addCustomWeapon = useCallback(() =>
    dispatch({ type: 'ADD_CUSTOM_WEAPON', weapon: { id: uuid(), name: 'New weapon', range: '1', attacks: '3', hit: '3', crit: '5', special: '' } }),
  []);
  const updateCustomWeapon = useCallback(
    (id: string, patch: Partial<Omit<CustomWeapon, 'id'>>) =>
      dispatch({ type: 'UPDATE_CUSTOM_WEAPON', id, patch }),
    [],
  );
  const removeCustomWeapon = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_CUSTOM_WEAPON', id }),
    [],
  );

  const addCustomAbility = useCallback(() =>
    dispatch({ type: 'ADD_CUSTOM_ABILITY', ability: { id: uuid(), fighter: '', type: '', ability: '' } }),
  []);
  const updateCustomAbility = useCallback(
    (id: string, patch: Partial<Omit<CustomAbility, 'id'>>) =>
      dispatch({ type: 'UPDATE_CUSTOM_ABILITY', id, patch }),
    [],
  );
  const removeCustomAbility = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_CUSTOM_ABILITY', id }),
    [],
  );

  const addFighter = useCallback((fighterId: string, name: string) => {
    dispatch({
      type: 'ADD_FIGHTER',
      fighter: {
        instanceId: uuid(),
        fighterId,
        customName: name,
        equipment: [],
        pendingEquipment: [],
        isPending: true,
        notes: '',
        costOverride: null,
        xp: 0,
        renown: 0,
        statOverrides: {},
      },
    });
  }, []);

  const removeFighter = useCallback(
    (instanceId: string) => dispatch({ type: 'REMOVE_FIGHTER', instanceId }),
    [],
  );

  const duplicateFighter = useCallback(
    (instanceId: string) => {
      const source = active.fighters.find(f => f.instanceId === instanceId);
      if (!source) return;
      dispatch({
        type: 'ADD_FIGHTER',
        fighter: {
          instanceId: uuid(),
          fighterId: source.fighterId,
          customName: source.customName,
          equipment: [...source.equipment],
          pendingEquipment: [],
          isPending: true,
          notes: source.notes,
          costOverride: source.costOverride,
          xp: 0,
          renown: 0,
          statOverrides: { ...source.statOverrides },
        },
      });
    },
    [active.fighters],
  );

  const setFighterName = useCallback(
    (instanceId: string, name: string) => dispatch({ type: 'SET_FIGHTER_NAME', instanceId, name }),
    [],
  );

  const setFighterXp = useCallback(
    (instanceId: string, xp: number) => dispatch({ type: 'SET_FIGHTER_XP', instanceId, xp }),
    [],
  );

  const setFighterRenown = useCallback(
    (instanceId: string, renown: number) =>
      dispatch({ type: 'SET_FIGHTER_RENOWN', instanceId, renown }),
    [],
  );

  const setFighterStat = useCallback(
    (instanceId: string, stat: StatKey, value: number) =>
      dispatch({ type: 'SET_FIGHTER_STAT', instanceId, stat, value }),
    [],
  );

  const setFighterNotes = useCallback(
    (instanceId: string, notes: string) =>
      dispatch({ type: 'SET_FIGHTER_NOTES', instanceId, notes }),
    [],
  );

  const setFighterCostOverride = useCallback(
    (instanceId: string, costOverride: number | null) =>
      dispatch({ type: 'SET_FIGHTER_COST_OVERRIDE', instanceId, costOverride }),
    [],
  );

  const setFighterEquipment = useCallback(
    (instanceId: string, equipment: string[]) =>
      dispatch({ type: 'SET_FIGHTER_EQUIPMENT', instanceId, equipment }),
    [],
  );

  const setFighterPendingEquipment = useCallback(
    (instanceId: string, pendingEquipment: string[]) =>
      dispatch({ type: 'SET_FIGHTER_PENDING_EQUIPMENT', instanceId, pendingEquipment }),
    [],
  );

  const purchasePending = useCallback(() => dispatch({ type: 'PURCHASE_PENDING' }), []);

  const reorderFighters = useCallback(
    (fighters: FighterInstance[]) => dispatch({ type: 'REORDER_FIGHTERS', fighters }),
    [],
  );

  const transferEquipment = useCallback(
    (fromId: string, toId: string, itemId: string, itemIdx: number) =>
      dispatch({ type: 'TRANSFER_EQUIPMENT', fromId, toId, itemId, itemIdx }),
    [],
  );

  const sendToStash = useCallback(
    (instanceId: string, itemIdx: number) =>
      dispatch({ type: 'SEND_TO_STASH', instanceId, itemIdx }),
    [],
  );

  const takeFromStash = useCallback(
    (instanceId: string, itemId: string) =>
      dispatch({ type: 'TAKE_FROM_STASH', instanceId, itemId }),
    [],
  );

  const sellFromStash = useCallback(
    (itemIdx: number, salePrice: number) =>
      dispatch({ type: 'SELL_FROM_STASH', itemIdx, salePrice }),
    [],
  );

  const removeFromStash = useCallback(
    (itemIdx: number) => dispatch({ type: 'REMOVE_FROM_STASH', itemIdx }),
    [],
  );

  const loadWarband_ = useCallback((id: string) => {
    const wb = id === active.id ? active : loadWarband(id);
    if (wb) dispatch({ type: 'LOAD_WARBAND', warband: wb });
  }, [active]);

  const createNewWarband = useCallback(() => dispatch({ type: 'NEW_WARBAND' }), []);

  const deleteWarband = useCallback(
    (id: string) => {
      removeWarband(id);
      const remainingIds = savedIds.filter(sid => sid !== id);
      const nextId = remainingIds[0];
      const nextWarband = nextId ? loadWarband(nextId) ?? newWarband() : newWarband();
      dispatch({ type: 'DELETE_WARBAND', id, nextWarband });
    },
    [savedIds],
  );

  const importWarband = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = JSON.parse(e.target?.result as string) as Warband;
        if (!wb.id || !wb.name) return;
        wb.stash = wb.stash ?? [];
        wb.factionNotes = wb.factionNotes ?? '';
        wb.gold = wb.gold ?? campaignRules.warband_budget;
        wb.fighters = wb.fighters.map(f => {
          const { specialRules, ...rest } = f as any;
          return { statOverrides: {}, notes: Array.isArray(specialRules) ? specialRules.join(', ') : '', costOverride: null, isPending: false, pendingEquipment: [], ...rest };
        });
        persistWarband(wb);
        dispatch({ type: 'LOAD_WARBAND', warband: wb });
        dispatch({ type: 'REGISTER_WARBAND', id: wb.id });
      } catch {
        // invalid file — ignore
      }
    };
    reader.readAsText(file);
  }, []);

  const exportWarband = useCallback(() => {
    const blob = new Blob([JSON.stringify(active, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${active.name || 'warband'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [active]);

  return {
    active,
    savedWarbands,
    isSaved,
    setName,
    setGold,
    setFaction,
    setFavour,
    setFactionNotes,
    addCustomWeapon,
    updateCustomWeapon,
    removeCustomWeapon,
    addCustomAbility,
    updateCustomAbility,
    removeCustomAbility,
    addFighter,
    removeFighter,
    duplicateFighter,
    setFighterName,
    setFighterXp,
    setFighterRenown,
    setFighterStat,
    setFighterNotes,
    setFighterCostOverride,
    setFighterEquipment,
    setFighterPendingEquipment,
    purchasePending,
    reorderFighters,
    transferEquipment,
    sendToStash,
    takeFromStash,
    removeFromStash,
    sellFromStash,
    loadWarband: loadWarband_,
    createNewWarband,
    deleteWarband,
    importWarband,
    exportWarband,
  };
}
