// Gateway Trainer - Remote Viewing Targets
// =========================================
// 15 targets with rich metadata for AI scoring
// Based on actual Stargate target categories

const TARGETS = [
  {
    id: 'mountain',
    name: 'Snow-Capped Mountain',
    description: 'A majestic snow-covered mountain peak against blue sky',
    image: 'assets/targets/mountain.jpg',
    keywords: ['mountain', 'snow', 'peak', 'tall', 'cold', 'white', 'nature', 'ancient', 'massive', 'rocky'],
    traits: { 
      natural: true, 
      hasWater: false, 
      indoor: false, 
      living: false, 
      large: true 
    },
    colors: ['white', 'blue', 'gray', 'brown'],
    textures: ['rocky', 'icy', 'rough', 'jagged'],
    emotions: ['awe', 'peace', 'solitude', 'majesty']
  },
  {
    id: 'beach',
    name: 'Tropical Beach',
    description: 'Palm trees on a sandy beach with turquoise water',
    image: 'assets/targets/beach.jpg',
    keywords: ['beach', 'ocean', 'palm', 'sand', 'tropical', 'water', 'warm', 'waves', 'paradise', 'coast'],
    traits: { 
      natural: true, 
      hasWater: true, 
      indoor: false, 
      living: true, 
      large: true 
    },
    colors: ['blue', 'green', 'tan', 'white', 'turquoise'],
    textures: ['sandy', 'smooth', 'wet', 'grainy'],
    emotions: ['relaxation', 'warmth', 'peace', 'freedom']
  },
  {
    id: 'pyramid',
    name: 'Egyptian Pyramid',
    description: 'Ancient pyramid rising from the desert sands',
    image: 'assets/targets/pyramid.jpg',
    keywords: ['pyramid', 'egypt', 'ancient', 'stone', 'desert', 'triangle', 'sand', 'pharaoh', 'tomb', 'monument'],
    traits: { 
      natural: false, 
      hasWater: false, 
      indoor: false, 
      living: false, 
      large: true 
    },
    colors: ['tan', 'gold', 'brown', 'blue', 'beige'],
    textures: ['rough', 'stone', 'sandy', 'geometric'],
    emotions: ['mystery', 'awe', 'ancient', 'power']
  },
  {
    id: 'bridge',
    name: 'Suspension Bridge',
    description: 'Large red suspension bridge spanning water',
    image: 'assets/targets/bridge.jpg',
    keywords: ['bridge', 'metal', 'cables', 'water', 'tall', 'red', 'structure', 'span', 'engineering', 'iconic'],
    traits: { 
      natural: false, 
      hasWater: true, 
      indoor: false, 
      living: false, 
      large: true 
    },
    colors: ['red', 'blue', 'gray', 'orange'],
    textures: ['metal', 'smooth', 'cable', 'rigid'],
    emotions: ['connection', 'strength', 'achievement', 'passage']
  },
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    description: 'White lighthouse on rocky coast at sunset',
    image: 'assets/targets/lighthouse.jpg',
    keywords: ['lighthouse', 'coast', 'ocean', 'rocks', 'white', 'tower', 'light', 'beacon', 'guide', 'shore'],
    traits: { 
      natural: false, 
      hasWater: true, 
      indoor: false, 
      living: false, 
      large: false 
    },
    colors: ['white', 'red', 'blue', 'orange', 'gray'],
    textures: ['smooth', 'rocky', 'wet', 'painted'],
    emotions: ['guidance', 'safety', 'solitude', 'hope']
  },
  {
    id: 'cathedral',
    name: 'Gothic Cathedral',
    description: 'Interior of a Gothic cathedral with stained glass windows',
    image: 'assets/targets/cathedral.jpg',
    keywords: ['cathedral', 'church', 'gothic', 'stained glass', 'stone', 'tall', 'sacred', 'arches', 'light', 'holy'],
    traits: { 
      natural: false, 
      hasWater: false, 
      indoor: true, 
      living: false, 
      large: true 
    },
    colors: ['gold', 'red', 'blue', 'purple', 'gray'],
    textures: ['stone', 'glass', 'smooth', 'ornate'],
    emotions: ['reverence', 'awe', 'peace', 'spiritual']
  },
  {
    id: 'elephant',
    name: 'Elephant',
    description: 'African elephant in golden savanna',
    image: 'assets/targets/elephant.jpg',
    keywords: ['elephant', 'animal', 'gray', 'large', 'africa', 'trunk', 'ears', 'savanna', 'wildlife', 'mammal'],
    traits: { 
      natural: true, 
      hasWater: false, 
      indoor: false, 
      living: true, 
      large: true 
    },
    colors: ['gray', 'brown', 'gold', 'tan'],
    textures: ['wrinkled', 'rough', 'leathery', 'dusty'],
    emotions: ['wisdom', 'strength', 'gentle', 'ancient']
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    description: 'White sailboat on calm blue water',
    image: 'assets/targets/sailboat.jpg',
    keywords: ['boat', 'sail', 'water', 'ocean', 'white', 'peaceful', 'floating', 'wind', 'travel', 'freedom'],
    traits: { 
      natural: false, 
      hasWater: true, 
      indoor: false, 
      living: false, 
      large: false 
    },
    colors: ['white', 'blue', 'tan', 'silver'],
    textures: ['smooth', 'canvas', 'wet', 'wooden'],
    emotions: ['freedom', 'peace', 'adventure', 'solitude']
  },
  {
    id: 'forest',
    name: 'Forest Path',
    description: 'Sunlit path through a dense green forest',
    image: 'assets/targets/forest.jpg',
    keywords: ['forest', 'trees', 'green', 'path', 'nature', 'shade', 'peaceful', 'sunlight', 'woods', 'trail'],
    traits: { 
      natural: true, 
      hasWater: false, 
      indoor: false, 
      living: true, 
      large: true 
    },
    colors: ['green', 'brown', 'gold', 'yellow'],
    textures: ['bark', 'leaves', 'soft', 'dappled'],
    emotions: ['peace', 'mystery', 'calm', 'alive']
  },
  {
    id: 'desert',
    name: 'Desert Dunes',
    description: 'Rolling golden sand dunes under blue sky',
    image: 'assets/targets/desert.jpg',
    keywords: ['desert', 'sand', 'dunes', 'hot', 'dry', 'golden', 'waves', 'vast', 'empty', 'arid'],
    traits: { 
      natural: true, 
      hasWater: false, 
      indoor: false, 
      living: false, 
      large: true 
    },
    colors: ['tan', 'gold', 'orange', 'blue', 'beige'],
    textures: ['sandy', 'smooth', 'rippled', 'grainy'],
    emotions: ['solitude', 'vastness', 'heat', 'timeless']
  },
  {
    id: 'citynight',
    name: 'City at Night',
    description: 'Glittering city skyline at night',
    image: 'assets/targets/citynight.jpg',
    keywords: ['city', 'skyline', 'night', 'lights', 'buildings', 'urban', 'modern', 'skyscrapers', 'glow', 'busy'],
    traits: { 
      natural: false, 
      hasWater: false, 
      indoor: false, 
      living: false, 
      large: true 
    },
    colors: ['black', 'gold', 'blue', 'white', 'yellow'],
    textures: ['glass', 'metal', 'smooth', 'reflective'],
    emotions: ['energy', 'excitement', 'alive', 'busy']
  },
  {
    id: 'waterfall',
    name: 'Waterfall',
    description: 'Powerful waterfall cascading into misty pool',
    image: 'assets/targets/waterfall.jpg',
    keywords: ['waterfall', 'water', 'jungle', 'mist', 'rocks', 'powerful', 'loud', 'cascade', 'spray', 'flow'],
    traits: { 
      natural: true, 
      hasWater: true, 
      indoor: false, 
      living: true, 
      large: true 
    },
    colors: ['white', 'green', 'blue', 'brown', 'gray'],
    textures: ['wet', 'misty', 'rocky', 'foamy'],
    emotions: ['power', 'awe', 'energy', 'cleansing']
  },
  {
    id: 'castle',
    name: 'Medieval Castle',
    description: 'Ancient stone castle with towers on hilltop',
    image: 'assets/targets/castle.jpg',
    keywords: ['castle', 'medieval', 'stone', 'towers', 'old', 'fortress', 'walls', 'ancient', 'royal', 'defense'],
    traits: { 
      natural: false, 
      hasWater: false, 
      indoor: false, 
      living: false, 
      large: true 
    },
    colors: ['gray', 'brown', 'green', 'beige'],
    textures: ['stone', 'rough', 'mossy', 'weathered'],
    emotions: ['history', 'power', 'mystery', 'protection']
  },
  {
    id: 'tree',
    name: 'Ancient Oak',
    description: 'Single massive oak tree in golden field',
    image: 'assets/targets/tree.jpg',
    keywords: ['tree', 'oak', 'large', 'old', 'branches', 'leaves', 'nature', 'alone', 'standing', 'ancient'],
    traits: { 
      natural: true, 
      hasWater: false, 
      indoor: false, 
      living: true, 
      large: true 
    },
    colors: ['green', 'brown', 'gold', 'yellow'],
    textures: ['bark', 'leaves', 'rough', 'gnarled'],
    emotions: ['wisdom', 'strength', 'peace', 'timeless']
  },
  {
    id: 'moon',
    name: 'Moon Over Ocean',
    description: 'Full moon reflecting on calm ocean water',
    image: 'assets/targets/moon.jpg',
    keywords: ['moon', 'ocean', 'night', 'reflection', 'silver', 'peaceful', 'water', 'glow', 'tide', 'calm'],
    traits: { 
      natural: true, 
      hasWater: true, 
      indoor: false, 
      living: false, 
      large: true 
    },
    colors: ['silver', 'blue', 'black', 'white', 'gray'],
    textures: ['smooth', 'rippled', 'glowing', 'dark'],
    emotions: ['peace', 'mystery', 'romance', 'wonder']
  }
];

// Get random targets for a session
function getRandomTargets(count) {
  const shuffled = [...TARGETS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, TARGETS.length));
}

// Get target by ID
function getTargetById(id) {
  return TARGETS.find(t => t.id === id);
}

// Get all target IDs
function getAllTargetIds() {
  return TARGETS.map(t => t.id);
}
