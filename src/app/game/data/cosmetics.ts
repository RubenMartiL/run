export type CosmeticCategory = 'crowd' | 'hat' | 'trail' | 'victory';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CosmeticDef {
  id: string;
  name: string;
  category: CosmeticCategory;
  rarity: Rarity;
  description: string;
  priceCoins: number;
  priceGems: number;
  primary: string;
  deep: string;
  style: string;
}

export interface CrowdSkin {
  primary: string;
  deep: string;
  hat: string;
  trail: string;
  victory: string;
}

export const COSMETIC_CATEGORIES: { id: CosmeticCategory; label: string }[] = [
  { id: 'crowd', label: 'Crowd' },
  { id: 'hat', label: 'Hats' },
  { id: 'trail', label: 'Trails' },
  { id: 'victory', label: 'Victory' },
];

export const COSMETICS: CosmeticDef[] = [
  // Crowd colours
  {
    id: 'crowd-classic',
    name: 'Classic Blue',
    category: 'crowd',
    rarity: 'common',
    description: 'The original jelly crowd.',
    priceCoins: 0,
    priceGems: 0,
    primary: '#5b8cff',
    deep: '#3757c9',
    style: 'classic',
  },
  {
    id: 'crowd-lime',
    name: 'Lime Squad',
    category: 'crowd',
    rarity: 'common',
    description: 'Fresh, loud and impossible to miss.',
    priceCoins: 120,
    priceGems: 0,
    primary: '#a3ff4f',
    deep: '#5fa51a',
    style: 'classic',
  },
  {
    id: 'crowd-coral',
    name: 'Coral Crew',
    category: 'crowd',
    rarity: 'common',
    description: 'Sunset energy for every run.',
    priceCoins: 120,
    priceGems: 0,
    primary: '#ff8a76',
    deep: '#b53b30',
    style: 'classic',
  },
  {
    id: 'crowd-mint',
    name: 'Mint Machine',
    category: 'crowd',
    rarity: 'rare',
    description: 'Cool, calm and collected.',
    priceCoins: 320,
    priceGems: 0,
    primary: '#4cf0c0',
    deep: '#1a9c7c',
    style: 'classic',
  },
  {
    id: 'crowd-grape',
    name: 'Grape Galaxy',
    category: 'crowd',
    rarity: 'epic',
    description: 'A crowd from another dimension.',
    priceCoins: 0,
    priceGems: 18,
    primary: '#a78bfa',
    deep: '#6d4ad8',
    style: 'classic',
  },
  {
    id: 'crowd-gold',
    name: 'Golden Horde',
    category: 'crowd',
    rarity: 'legendary',
    description: 'Every member worth their weight in gold.',
    priceCoins: 0,
    priceGems: 45,
    primary: '#ffd447',
    deep: '#b48000',
    style: 'classic',
  },

  // Hats
  {
    id: 'hat-none',
    name: 'No Hat',
    category: 'hat',
    rarity: 'common',
    description: 'Nothing between the crowd and the sky.',
    priceCoins: 0,
    priceGems: 0,
    primary: '#5b8cff',
    deep: '#3757c9',
    style: 'none',
  },
  {
    id: 'hat-cap',
    name: 'Runner Cap',
    category: 'hat',
    rarity: 'common',
    description: 'A tiny cap for a very fast crowd.',
    priceCoins: 140,
    priceGems: 0,
    primary: '#3dd6f5',
    deep: '#166d88',
    style: 'cap',
  },
  {
    id: 'hat-halo',
    name: 'Halo',
    category: 'hat',
    rarity: 'rare',
    description: 'Suspiciously well-behaved runners.',
    priceCoins: 360,
    priceGems: 0,
    primary: '#fff3b0',
    deep: '#c9a41a',
    style: 'halo',
  },
  {
    id: 'hat-horns',
    name: 'Mischief Horns',
    category: 'hat',
    rarity: 'rare',
    description: 'For crowds that enjoy the red gates.',
    priceCoins: 380,
    priceGems: 0,
    primary: '#ff7a6b',
    deep: '#8f2a20',
    style: 'horns',
  },
  {
    id: 'hat-crown',
    name: 'Tiny Crown',
    category: 'hat',
    rarity: 'epic',
    description: 'Royalty, at roughly 1:40 scale.',
    priceCoins: 0,
    priceGems: 20,
    primary: '#ffd447',
    deep: '#a87400',
    style: 'crown',
  },
  {
    id: 'hat-antenna',
    name: 'Signal Antenna',
    category: 'hat',
    rarity: 'epic',
    description: 'Broadcasting pure crowd energy.',
    priceCoins: 900,
    priceGems: 0,
    primary: '#8cf03a',
    deep: '#4c8c12',
    style: 'antenna',
  },

  // Trails
  {
    id: 'trail-none',
    name: 'No Trail',
    category: 'trail',
    rarity: 'common',
    description: 'Clean and focused.',
    priceCoins: 0,
    priceGems: 0,
    primary: '#5b8cff',
    deep: '#3757c9',
    style: 'none',
  },
  {
    id: 'trail-sparkle',
    name: 'Sparkle Dust',
    category: 'trail',
    rarity: 'rare',
    description: 'Leaves glitter in the rear view.',
    priceCoins: 300,
    priceGems: 0,
    primary: '#ffe98a',
    deep: '#c9a41a',
    style: 'sparkle',
  },
  {
    id: 'trail-bubbles',
    name: 'Bubble Pop',
    category: 'trail',
    rarity: 'rare',
    description: 'A trail of cheerful bubbles.',
    priceCoins: 340,
    priceGems: 0,
    primary: '#8be9ff',
    deep: '#1f7c99',
    style: 'bubbles',
  },
  {
    id: 'trail-flame',
    name: 'Turbo Flame',
    category: 'trail',
    rarity: 'epic',
    description: 'Leaves a warm orange streak.',
    priceCoins: 0,
    priceGems: 16,
    primary: '#ff9c4f',
    deep: '#b53b10',
    style: 'flame',
  },
  {
    id: 'trail-rainbow',
    name: 'Rainbow Road',
    category: 'trail',
    rarity: 'legendary',
    description: 'A full spectrum behind the crowd.',
    priceCoins: 0,
    priceGems: 40,
    primary: '#c9a7ff',
    deep: '#6a4bd6',
    style: 'rainbow',
  },

  // Victory effects
  {
    id: 'victory-confetti',
    name: 'Confetti',
    category: 'victory',
    rarity: 'common',
    description: 'The classic win celebration.',
    priceCoins: 0,
    priceGems: 0,
    primary: '#ffd447',
    deep: '#c98f00',
    style: 'confetti',
  },
  {
    id: 'victory-fireworks',
    name: 'Fireworks',
    category: 'victory',
    rarity: 'epic',
    description: 'Big, bright, boss-beating fireworks.',
    priceCoins: 0,
    priceGems: 18,
    primary: '#ff7a6b',
    deep: '#a82818',
    style: 'fireworks',
  },
  {
    id: 'victory-rainbow',
    name: 'Rainbow Burst',
    category: 'victory',
    rarity: 'epic',
    description: 'A full rainbow explodes over the track.',
    priceCoins: 950,
    priceGems: 0,
    primary: '#a78bfa',
    deep: '#6d4ad8',
    style: 'rainbow',
  },
  {
    id: 'victory-coins',
    name: 'Coin Shower',
    category: 'victory',
    rarity: 'legendary',
    description: 'Make it rain on the finish line.',
    priceCoins: 0,
    priceGems: 45,
    primary: '#ffd447',
    deep: '#b48000',
    style: 'coins',
  },
];

export function cosmeticById(id: string): CosmeticDef | undefined {
  return COSMETICS.find((item) => item.id === id);
}

export function cosmeticsByCategory(category: CosmeticCategory): CosmeticDef[] {
  return COSMETICS.filter((item) => item.category === category);
}

const RARITY_ORDER: Record<Rarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

export function rarityRank(rarity: Rarity): number {
  return RARITY_ORDER[rarity];
}

export function skinFromIds(equipped: {
  crowd: string;
  hat: string;
  trail: string;
  victory: string;
}): CrowdSkin {
  const crowd = cosmeticById(equipped.crowd) ?? COSMETICS[0];
  const hat = cosmeticById(equipped.hat) ?? COSMETICS[6];
  const trail = cosmeticById(equipped.trail) ?? COSMETICS[12];
  const victory = cosmeticById(equipped.victory) ?? COSMETICS[17];
  return {
    primary: crowd.primary,
    deep: crowd.deep,
    hat: hat.style,
    trail: trail.style,
    victory: victory.style,
  };
}
