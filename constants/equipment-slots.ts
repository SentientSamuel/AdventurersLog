export type SlotKey =
  | 'head' | 'cape' | 'neck' | 'ammo'
  | 'weapon' | 'body' | 'shield'
  | 'legs' | 'gloves' | 'boots' | 'ring';

export type CombatStyle = 'melee' | 'ranged' | 'magic';

export type AttackStyle =
  | 'accurate' | 'aggressive' | 'defensive' | 'controlled'
  | 'rapid' | 'longrange'
  | 'standard' | 'defensive_magic';

export interface EquipmentSlotDef {
  key: SlotKey;
  label: string;
  emoji: string;
}

export const EQUIPMENT_SLOTS: EquipmentSlotDef[] = [
  { key: 'head',   label: 'Head',   emoji: '' },
  { key: 'cape',   label: 'Cape',   emoji: '' },
  { key: 'neck',   label: 'Neck',   emoji: '' },
  { key: 'ammo',   label: 'Ammo',   emoji: '' },
  { key: 'weapon', label: 'Weapon', emoji: '' },
  { key: 'body',   label: 'Body',   emoji: '' },
  { key: 'shield', label: 'Shield', emoji: '' },
  { key: 'legs',   label: 'Legs',   emoji: '' },
  { key: 'gloves', label: 'Gloves', emoji: '' },
  { key: 'boots',  label: 'Boots',  emoji: '' },
  { key: 'ring',   label: 'Ring',   emoji: '' },
];

export interface ItemStats {
  name: string;
  slot?: string; // <--- ADD THIS LINE
  attackStab: number;
  attackSlash: number;
  attackCrush: number;
  attackMagic: number;
  attackRanged: number;
  defenceStab: number;
  defenceSlash: number;
  defenceCrush: number;
  defenceMagic: number;
  defenceRanged: number;
  meleeStrength: number;
  rangedStrength: number;
  magicDamage: number;
  prayer: number;
  attackSpeed: number;
  imageUrl?: string;
}

export interface GearSlots {
  head?: ItemStats;
  cape?: ItemStats;
  neck?: ItemStats;
  ammo?: ItemStats;
  weapon?: ItemStats;
  body?: ItemStats;
  shield?: ItemStats;
  legs?: ItemStats;
  gloves?: ItemStats;
  boots?: ItemStats;
  ring?: ItemStats;
}

export interface MonsterStats {
  name: string;
  defenceLevel: number;
  defenceStab: number;
  defenceSlash: number;
  defenceCrush: number;
  defenceMagic: number;
  defenceRanged: number;
  hitpoints: number;
}

export interface Loadout {
  id: string;
  name: string;
  combatStyle: CombatStyle;
  attackStyle: AttackStyle;
  gear: GearSlots;
  targetMonster?: MonsterStats;
  prayers: string[];
  playerStats: PlayerStats;
  createdAt: number;
  updatedAt: number;
}

export interface PlayerStats {
  attackLevel: number;
  strengthLevel: number;
  defenceLevel: number;
  rangedLevel: number;
  magicLevel: number;
  hitpointsLevel: number;
}

export function defaultPlayerStats(): PlayerStats {
  return {
    attackLevel: 99,
    strengthLevel: 99,
    defenceLevel: 99,
    rangedLevel: 99,
    magicLevel: 99,
    hitpointsLevel: 99,
  };
}

export function emptyGear(): GearSlots {
  return {};
}

export function getTotalStats(gear: GearSlots): ItemStats {
  const total: ItemStats = {
    name: 'Total',
    attackStab: 0, attackSlash: 0, attackCrush: 0,
    attackMagic: 0, attackRanged: 0,
    defenceStab: 0, defenceSlash: 0, defenceCrush: 0,
    defenceMagic: 0, defenceRanged: 0,
    meleeStrength: 0, rangedStrength: 0, magicDamage: 0,
    prayer: 0, attackSpeed: 4,
  };
  Object.values(gear).forEach((item) => {
    if (!item) return;
    total.attackStab     += item.attackStab     ?? 0;
    total.attackSlash    += item.attackSlash    ?? 0;
    total.attackCrush    += item.attackCrush    ?? 0;
    total.attackMagic    += item.attackMagic    ?? 0;
    total.attackRanged   += item.attackRanged   ?? 0;
    total.defenceStab    += item.defenceStab    ?? 0;
    total.defenceSlash   += item.defenceSlash   ?? 0;
    total.defenceCrush   += item.defenceCrush   ?? 0;
    total.defenceMagic   += item.defenceMagic   ?? 0;
    total.defenceRanged  += item.defenceRanged  ?? 0;
    total.meleeStrength  += item.meleeStrength  ?? 0;
    total.rangedStrength += item.rangedStrength ?? 0;
    total.magicDamage    += item.magicDamage    ?? 0;
    total.prayer         += item.prayer         ?? 0;
  });
  if (gear.weapon?.attackSpeed) total.attackSpeed = gear.weapon.attackSpeed;
  return total;
}
