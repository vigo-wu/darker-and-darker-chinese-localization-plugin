export const RARITY_OPTIONS = [
  { value: '' },
  { value: 'Poor' },
  { value: 'Common' },
  { value: 'Uncommon' },
  { value: 'Rare' },
  { value: 'Epic' },
  { value: 'Legendary' },
  { value: 'Unique' },
  { value: 'Artifact' },
];

export const SLOT_OPTIONS = [
  { value: '' },
  { value: 'Head' },
  { value: 'Chest' },
  { value: 'Legs' },
  { value: 'Hands' },
  { value: 'Foot' },
  { value: 'Back' },
  { value: 'Necklace' },
  { value: 'Ring' },
  { value: 'Primary' },
  { value: 'Secondary' },
  { value: 'Sash' },
  { value: 'Utility' },
  { value: 'Unarmed' },
];

export const TYPE_OPTIONS = [
  { value: '' },
  { value: 'Weapon' },
  { value: 'Armor' },
  { value: 'Accessory' },
  { value: 'Utility' },
  { value: 'Misc' },
];

export const SOLD_OPTIONS = [
  { value: '' },
  { value: 'false' },
  { value: 'true' },
];

export const DEFAULT_HAS_SOLD = 'false';

export function rarityColor(rarity) {
  const map = {
    Poor: '#9d9d9d',
    Common: '#ffffff',
    Uncommon: '#1eff00',
    Rare: '#0070dd',
    Epic: '#a335ee',
    Legendary: '#ff8000',
    Unique: '#e6cc80',
    Artifact: '#ff4b4b',
  };
  return map[rarity] || '#888';
}
