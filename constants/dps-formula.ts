import { CombatStyle, AttackStyle, GearSlots, MonsterStats, PlayerStats, getTotalStats } from './equipment-slots';
import { getPrayerBonuses } from './prayers';

export interface DPSResult {
  maxHit: number;
  hitChance: number;
  dps: number;
  attacksPerSecond: number;
  expectedDamage: number;
}

function floor(n: number) { return Math.floor(n); }

// Attack style bonuses

function getStyleBonus(style: AttackStyle, combatStyle: CombatStyle): { attackBonus: number; strengthBonus: number } {
  if (combatStyle === 'melee') {
    if (style === 'accurate')   return { attackBonus: 3, strengthBonus: 0 };
    if (style === 'aggressive') return { attackBonus: 0, strengthBonus: 3 };
    if (style === 'controlled') return { attackBonus: 1, strengthBonus: 1 };
  }
  if (combatStyle === 'ranged') {
    if (style === 'accurate')   return { attackBonus: 3, strengthBonus: 0 };
    if (style === 'rapid')      return { attackBonus: 0, strengthBonus: 0 };
  }
  return { attackBonus: 0, strengthBonus: 0 };
}

// Melee DPS

function calcMeleeDPS(
  gear: GearSlots,
  player: PlayerStats,
  prayers: string[],
  attackStyle: AttackStyle,
  monster: MonsterStats,
): DPSResult {
  const stats = getTotalStats(gear);
  const pb = getPrayerBonuses(prayers, 'melee');
  const sb = getStyleBonus(attackStyle, 'melee');

  // Effective strength
  const effStr = floor(player.strengthLevel * pb.strengthBonus) + sb.strengthBonus + 8;
  // Max hit
  const maxHit = floor(0.5 + effStr * (stats.meleeStrength + 64) / 640);

  // Effective attack
  const effAtk = floor(player.attackLevel * pb.attackBonus) + sb.attackBonus + 8;

  // Attack bonus — use best of stab/slash/crush based on style
  let atkBonus = stats.attackSlash;
  if (attackStyle === 'accurate') atkBonus = Math.max(stats.attackStab, stats.attackSlash, stats.attackCrush);

  const attackRoll = effAtk * (atkBonus + 64);

  // Defence roll
  const defLevel = monster.defenceLevel + 9;
  const defRoll = defLevel * (monster.defenceSlash + 64);

  // Hit chance
  let hitChance: number;
  if (attackRoll > defRoll) {
    hitChance = 1 - (defRoll + 2) / (2 * (attackRoll + 1));
  } else {
    hitChance = attackRoll / (2 * (defRoll + 1));
  }

  const attackSpeed = stats.attackSpeed * 0.6; // ticks to seconds
  const dps = hitChance * (maxHit / 2) / attackSpeed;

  return {
    maxHit,
    hitChance: Math.round(hitChance * 1000) / 10,
    dps: Math.round(dps * 100) / 100,
    attacksPerSecond: Math.round((1 / attackSpeed) * 100) / 100,
    expectedDamage: Math.round(hitChance * maxHit / 2 * 100) / 100,
  };
}

// Ranged DPS

function calcRangedDPS(
  gear: GearSlots,
  player: PlayerStats,
  prayers: string[],
  attackStyle: AttackStyle,
  monster: MonsterStats,
): DPSResult {
  const stats = getTotalStats(gear);
  const pb = getPrayerBonuses(prayers, 'ranged');
  const sb = getStyleBonus(attackStyle, 'ranged');

  const speedTick = attackStyle === 'rapid'
    ? Math.max(1, stats.attackSpeed - 1)
    : stats.attackSpeed;

  // Effective ranged level for strength
  const effRngStr = floor(player.rangedLevel * pb.rangedStrengthBonus) + sb.strengthBonus + 8;
  const maxHit = floor(0.5 + effRngStr * (stats.rangedStrength + 64) / 640);

  // Effective ranged level for attack
  const effRngAtk = floor(player.rangedLevel * pb.rangedAttackBonus) + sb.attackBonus + 8;
  const attackRoll = effRngAtk * (stats.attackRanged + 64);

  const defLevel = monster.defenceLevel + 9;
  const defRoll = defLevel * (monster.defenceRanged + 64);

  let hitChance: number;
  if (attackRoll > defRoll) {
    hitChance = 1 - (defRoll + 2) / (2 * (attackRoll + 1));
  } else {
    hitChance = attackRoll / (2 * (defRoll + 1));
  }

  const attackSpeed = speedTick * 0.6;
  const dps = hitChance * (maxHit / 2) / attackSpeed;

  return {
    maxHit,
    hitChance: Math.round(hitChance * 1000) / 10,
    dps: Math.round(dps * 100) / 100,
    attacksPerSecond: Math.round((1 / attackSpeed) * 100) / 100,
    expectedDamage: Math.round(hitChance * maxHit / 2 * 100) / 100,
  };
}

// Magic DPS

function calcMagicDPS(
  gear: GearSlots,
  player: PlayerStats,
  prayers: string[],
  spellMaxHit: number,
  monster: MonsterStats,
): DPSResult {
  const stats = getTotalStats(gear);
  const pb = getPrayerBonuses(prayers, 'magic');

  // Magic damage bonus from gear (e.g. 0.20 for Occult = +20%)
  const dmgBonus = 1 + stats.magicDamage / 100;
  const maxHit = floor(spellMaxHit * dmgBonus * pb.magicDamageBonus);

  const effMag = floor(player.magicLevel * pb.magicAttackBonus) + 9;
  const attackRoll = effMag * (stats.attackMagic + 64);

  const defLevel = monster.defenceLevel + 9;
  const defRoll = defLevel * (monster.defenceMagic + 64);

  let hitChance: number;
  if (attackRoll > defRoll) {
    hitChance = 1 - (defRoll + 2) / (2 * (attackRoll + 1));
  } else {
    hitChance = attackRoll / (2 * (defRoll + 1));
  }

  const attackSpeed = stats.attackSpeed * 0.6;
  const dps = hitChance * (maxHit / 2) / attackSpeed;

  return {
    maxHit,
    hitChance: Math.round(hitChance * 1000) / 10,
    dps: Math.round(dps * 100) / 100,
    attacksPerSecond: Math.round((1 / attackSpeed) * 100) / 100,
    expectedDamage: Math.round(hitChance * maxHit / 2 * 100) / 100,
  };
}

// Public API

export function calculateDPS(
  combatStyle: CombatStyle,
  gear: GearSlots,
  player: PlayerStats,
  prayers: string[],
  attackStyle: AttackStyle,
  monster: MonsterStats,
  spellMaxHit = 30,
): DPSResult {
  switch (combatStyle) {
    case 'melee':  return calcMeleeDPS(gear, player, prayers, attackStyle, monster);
    case 'ranged': return calcRangedDPS(gear, player, prayers, attackStyle, monster);
    case 'magic':  return calcMagicDPS(gear, player, prayers, spellMaxHit, monster);
  }
}

export const DEFAULT_MONSTER: MonsterStats = {
  name: 'Training Dummy',
  defenceLevel: 1,
  defenceStab: 0,
  defenceSlash: 0,
  defenceCrush: 0,
  defenceMagic: 0,
  defenceRanged: 0,
  hitpoints: 100,
};
