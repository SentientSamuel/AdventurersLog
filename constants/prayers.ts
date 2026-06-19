import { CombatStyle } from './equipment-slots';

export interface Prayer {
  key: string;
  name: string;
  combatStyle: CombatStyle | 'all';
  attackBonus?: number;    // multiplier e.g. 1.15
  strengthBonus?: number;  // multiplier
  defenceBonus?: number;   // multiplier
  rangedAttackBonus?: number;
  rangedStrengthBonus?: number;
  magicAttackBonus?: number;
  magicDamageBonus?: number;
  requires?: string;       // prayer that this overrides
}

export const PRAYERS: Prayer[] = [
  // Melee
  {
    key: 'clarity_of_thought',
    name: 'Clarity of Thought',
    combatStyle: 'melee',
    attackBonus: 1.05,
  },
  {
    key: 'improved_reflexes',
    name: 'Improved Reflexes',
    combatStyle: 'melee',
    attackBonus: 1.10,
    requires: 'clarity_of_thought',
  },
  {
    key: 'incredible_reflexes',
    name: 'Incredible Reflexes',
    combatStyle: 'melee',
    attackBonus: 1.15,
    requires: 'improved_reflexes',
  },
  {
    key: 'burst_of_strength',
    name: 'Burst of Strength',
    combatStyle: 'melee',
    strengthBonus: 1.05,
  },
  {
    key: 'superhuman_strength',
    name: 'Superhuman Strength',
    combatStyle: 'melee',
    strengthBonus: 1.10,
    requires: 'burst_of_strength',
  },
  {
    key: 'ultimate_strength',
    name: 'Ultimate Strength',
    combatStyle: 'melee',
    strengthBonus: 1.15,
    requires: 'superhuman_strength',
  },
  {
    key: 'chivalry',
    name: 'Chivalry',
    combatStyle: 'melee',
    attackBonus: 1.15,
    strengthBonus: 1.18,
    defenceBonus: 1.20,
    requires: 'incredible_reflexes',
  },
  {
    key: 'piety',
    name: 'Piety',
    combatStyle: 'melee',
    attackBonus: 1.20,
    strengthBonus: 1.23,
    defenceBonus: 1.25,
    requires: 'chivalry',
  },

  // Ranged
  {
    key: 'sharp_eye',
    name: 'Sharp Eye',
    combatStyle: 'ranged',
    rangedAttackBonus: 1.05,
    rangedStrengthBonus: 1.05,
  },
  {
    key: 'hawk_eye',
    name: 'Hawk Eye',
    combatStyle: 'ranged',
    rangedAttackBonus: 1.10,
    rangedStrengthBonus: 1.10,
    requires: 'sharp_eye',
  },
  {
    key: 'eagle_eye',
    name: 'Eagle Eye',
    combatStyle: 'ranged',
    rangedAttackBonus: 1.15,
    rangedStrengthBonus: 1.15,
    requires: 'hawk_eye',
  },
  {
    key: 'rigour',
    name: 'Rigour',
    combatStyle: 'ranged',
    rangedAttackBonus: 1.20,
    rangedStrengthBonus: 1.23,
    defenceBonus: 1.25,
    requires: 'eagle_eye',
  },

  // Magic
  {
    key: 'mystic_will',
    name: 'Mystic Will',
    combatStyle: 'magic',
    magicAttackBonus: 1.05,
    magicDamageBonus: 1.01,
  },
  {
    key: 'mystic_lore',
    name: 'Mystic Lore',
    combatStyle: 'magic',
    magicAttackBonus: 1.10,
    magicDamageBonus: 1.02,
    requires: 'mystic_will',
  },
  {
    key: 'mystic_might',
    name: 'Mystic Might',
    combatStyle: 'magic',
    magicAttackBonus: 1.15,
    magicDamageBonus: 1.04,
    requires: 'mystic_lore',
  },
  {
    key: 'augury',
    name: 'Augury',
    combatStyle: 'magic',
    magicAttackBonus: 1.25,
    magicDamageBonus: 1.04,
    defenceBonus: 1.25,
    requires: 'mystic_might',
  },
];

export function getPrayerBonuses(prayerKeys: string[], combatStyle: CombatStyle) {
  let attackBonus = 1;
  let strengthBonus = 1;
  let defenceBonus = 1;
  let rangedAttackBonus = 1;
  let rangedStrengthBonus = 1;
  let magicAttackBonus = 1;
  let magicDamageBonus = 1;

  prayerKeys.forEach((key) => {
    const prayer = PRAYERS.find((p) => p.key === key);
    if (!prayer) return;
    if (prayer.combatStyle !== 'all' && prayer.combatStyle !== combatStyle) return;
    if (prayer.attackBonus)          attackBonus = Math.max(attackBonus, prayer.attackBonus);
    if (prayer.strengthBonus)        strengthBonus = Math.max(strengthBonus, prayer.strengthBonus);
    if (prayer.defenceBonus)         defenceBonus = Math.max(defenceBonus, prayer.defenceBonus);
    if (prayer.rangedAttackBonus)    rangedAttackBonus = Math.max(rangedAttackBonus, prayer.rangedAttackBonus);
    if (prayer.rangedStrengthBonus)  rangedStrengthBonus = Math.max(rangedStrengthBonus, prayer.rangedStrengthBonus);
    if (prayer.magicAttackBonus)     magicAttackBonus = Math.max(magicAttackBonus, prayer.magicAttackBonus);
    if (prayer.magicDamageBonus)     magicDamageBonus = Math.max(magicDamageBonus, prayer.magicDamageBonus);
  });

  return { attackBonus, strengthBonus, defenceBonus, rangedAttackBonus, rangedStrengthBonus, magicAttackBonus, magicDamageBonus };
}
