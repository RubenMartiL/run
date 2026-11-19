import { UpgradeLevels } from '../../core/save/save.types';

export type UpgradeId = keyof UpgradeLevels;

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  icon: 'target' | 'coin' | 'star' | 'trophy';
  maxLevel: number;
  basePrice: number;
  priceGrowth: number;
  effectPerLevel: number;
  effectUnit: string;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'startingCrowd',
    name: 'Starting Crowd',
    description: 'Begin every run with more characters in your crowd.',
    icon: 'target',
    maxLevel: 10,
    basePrice: 150,
    priceGrowth: 1.32,
    effectPerLevel: 2,
    effectUnit: 'crowd',
  },
  {
    id: 'coinBonus',
    name: 'Coin Bonus',
    description: 'Every coin and coin gate is worth more.',
    icon: 'coin',
    maxLevel: 10,
    basePrice: 200,
    priceGrowth: 1.36,
    effectPerLevel: 5,
    effectUnit: '% coins',
  },
  {
    id: 'gateBonus',
    name: 'Gate Bonus',
    description: 'Positive gates give a little extra crowd.',
    icon: 'star',
    maxLevel: 10,
    basePrice: 250,
    priceGrowth: 1.38,
    effectPerLevel: 3,
    effectUnit: '% gates',
  },
  {
    id: 'luckyReward',
    name: 'Lucky Reward',
    description: 'Level rewards pay out more coins.',
    icon: 'trophy',
    maxLevel: 10,
    basePrice: 300,
    priceGrowth: 1.4,
    effectPerLevel: 6,
    effectUnit: '% rewards',
  },
];

export function upgradeDef(id: UpgradeId): UpgradeDef {
  return UPGRADES.find((upgrade) => upgrade.id === id) ?? UPGRADES[0];
}

export function upgradePrice(id: UpgradeId, currentLevel: number): number {
  const def = upgradeDef(id);
  return Math.round(def.basePrice * Math.pow(def.priceGrowth, Math.max(0, currentLevel)));
}

export function upgradeEffectLabel(id: UpgradeId, level: number): string {
  const def = upgradeDef(id);
  const value = level * def.effectPerLevel;
  if (id === 'startingCrowd') return level === 0 ? '+0 crowd' : `+${value} crowd`;
  return level === 0 ? `+0${def.effectUnit}` : `+${value}${def.effectUnit.replace('%', '%')}`;
}

export interface RunModifiers {
  startingCrowdBonus: number;
  coinMultiplier: number;
  gateBonus: number;
  rewardBonus: number;
}

export function modifiersFromUpgrades(levels: UpgradeLevels): RunModifiers {
  return {
    startingCrowdBonus: levels.startingCrowd * 2,
    coinMultiplier: 1 + levels.coinBonus * 0.05,
    gateBonus: levels.gateBonus * 0.03,
    rewardBonus: levels.luckyReward * 0.06,
  };
}

export const NEUTRAL_MODIFIERS: RunModifiers = {
  startingCrowdBonus: 0,
  coinMultiplier: 1,
  gateBonus: 0,
  rewardBonus: 0,
};
