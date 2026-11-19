export type SceneryKind =
  | 'city'
  | 'desert'
  | 'frost'
  | 'jungle'
  | 'candy'
  | 'lava'
  | 'neon'
  | 'pirate'
  | 'space'
  | 'kingdom';

export interface WorldTheme {
  id: string;
  order: number;
  name: string;
  tagline: string;
  mechanic: string;
  scenery: SceneryKind;
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundAlt: string;
  road: string;
  roadEdge: string;
  accent: string;
  accentDeep: string;
  glow: string;
  uiFrom: string;
  uiTo: string;
}

export const WORLD_THEMES: WorldTheme[] = [
  {
    id: 'green-city',
    order: 0,
    name: 'Green City',
    tagline: 'Where every run begins',
    mechanic: 'Swinging hammers',
    scenery: 'city',
    skyTop: '#8fe3ff',
    skyBottom: '#d6f7ff',
    ground: '#57c98a',
    groundAlt: '#3fae73',
    road: '#8fd8b0',
    roadEdge: '#e9fff2',
    accent: '#2fbf71',
    accentDeep: '#126b41',
    glow: '#c7ffd9',
    uiFrom: '#3ed18a',
    uiTo: '#1f9c6a',
  },
  {
    id: 'desert-dash',
    order: 1,
    name: 'Desert Dash',
    tagline: 'Hot sand, hotter streaks',
    mechanic: 'Sliding walls',
    scenery: 'desert',
    skyTop: '#ffb35c',
    skyBottom: '#ffe6b8',
    ground: '#e8b46a',
    groundAlt: '#d29a4d',
    road: '#f6d29a',
    roadEdge: '#fff3dd',
    accent: '#e78a2e',
    accentDeep: '#8a4a10',
    glow: '#ffe0a8',
    uiFrom: '#ffbf5a',
    uiTo: '#e0872a',
  },
  {
    id: 'frost-peak',
    order: 2,
    name: 'Frost Peak',
    tagline: 'Slide past the saws',
    mechanic: 'Ice saws',
    scenery: 'frost',
    skyTop: '#8ad4ff',
    skyBottom: '#e8f8ff',
    ground: '#cfe9ff',
    groundAlt: '#a9d3f2',
    road: '#e7f4ff',
    roadEdge: '#ffffff',
    accent: '#4aa8e8',
    accentDeep: '#1f5d94',
    glow: '#d6f2ff',
    uiFrom: '#79c9ff',
    uiTo: '#3d87d8',
  },
  {
    id: 'jungle-jam',
    order: 3,
    name: 'Jungle Jam',
    tagline: 'Vines, traps and treasure',
    mechanic: 'Spike traps',
    scenery: 'jungle',
    skyTop: '#79e2a4',
    skyBottom: '#d9ffd0',
    ground: '#2f9b5d',
    groundAlt: '#237a49',
    road: '#6fcb8c',
    roadEdge: '#d8ffdf',
    accent: '#1fbf6a',
    accentDeep: '#0a5a34',
    glow: '#b8ffc8',
    uiFrom: '#4fd68c',
    uiTo: '#1c8f5a',
  },
  {
    id: 'candy-land',
    order: 4,
    name: 'Candy Land',
    tagline: 'Sweet gates, sour traps',
    mechanic: 'Rolling barriers',
    scenery: 'candy',
    skyTop: '#ffb5dc',
    skyBottom: '#fff0f9',
    ground: '#ff9ecb',
    groundAlt: '#f07ab3',
    road: '#ffd6ea',
    roadEdge: '#fff9fd',
    accent: '#ff5fa8',
    accentDeep: '#a3245e',
    glow: '#ffe3f1',
    uiFrom: '#ff8fc4',
    uiTo: '#e34f92',
  },
  {
    id: 'lava-land',
    order: 5,
    name: 'Lava Land',
    tagline: 'Keep the crowd cool',
    mechanic: 'Lava crushers',
    scenery: 'lava',
    skyTop: '#4a1a2a',
    skyBottom: '#a83a2a',
    ground: '#5c2c26',
    groundAlt: '#44201c',
    road: '#7d3a2c',
    roadEdge: '#ffb37a',
    accent: '#ff6b35',
    accentDeep: '#a02a10',
    glow: '#ffc46b',
    uiFrom: '#ff8a4f',
    uiTo: '#c73d16',
  },
  {
    id: 'neon-city',
    order: 6,
    name: 'Neon City',
    tagline: 'Run the night grid',
    mechanic: 'Neon barriers',
    scenery: 'neon',
    skyTop: '#1b1040',
    skyBottom: '#3b1b63',
    ground: '#231447',
    groundAlt: '#180f33',
    road: '#3a2160',
    roadEdge: '#7dfbf0',
    accent: '#39f0e0',
    accentDeep: '#0e7e86',
    glow: '#b0fff8',
    uiFrom: '#4df4e6',
    uiTo: '#2a7ce0',
  },
  {
    id: 'pirate-island',
    order: 7,
    name: 'Pirate Island',
    tagline: 'Plunder the coin lanes',
    mechanic: 'Anchor swings',
    scenery: 'pirate',
    skyTop: '#57c7e8',
    skyBottom: '#d8f6ff',
    ground: '#e3cb8f',
    groundAlt: '#c9ad6b',
    road: '#f0dfae',
    roadEdge: '#fffbe8',
    accent: '#e0a52c',
    accentDeep: '#7b5310',
    glow: '#ffe9a8',
    uiFrom: '#f4cf62',
    uiTo: '#c58a1b',
  },
  {
    id: 'space-run',
    order: 8,
    name: 'Space Run',
    tagline: 'Gravity is optional',
    mechanic: 'Orbiting hazards',
    scenery: 'space',
    skyTop: '#0a0f33',
    skyBottom: '#241a52',
    ground: '#161a40',
    groundAlt: '#0e1230',
    road: '#2a2a66',
    roadEdge: '#9a8bff',
    accent: '#8c7bff',
    accentDeep: '#3b2a99',
    glow: '#cfc8ff',
    uiFrom: '#9d8dff',
    uiTo: '#5a3fd6',
  },
  {
    id: 'kingdom',
    order: 9,
    name: 'Kingdom',
    tagline: 'The final coronation',
    mechanic: 'Royal gauntlet',
    scenery: 'kingdom',
    skyTop: '#7fb7ff',
    skyBottom: '#fff1c9',
    ground: '#6fbf73',
    groundAlt: '#54a35a',
    road: '#d8cba7',
    roadEdge: '#fff8e1',
    accent: '#e5b93c',
    accentDeep: '#8a5f0d',
    glow: '#ffe9a1',
    uiFrom: '#ffd86b',
    uiTo: '#d29a18',
  },
];

export function getWorldTheme(worldId: string): WorldTheme | undefined {
  return WORLD_THEMES.find((theme) => theme.id === worldId);
}
