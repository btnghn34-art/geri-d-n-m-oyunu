export enum WasteType {
  PLASTIC = 'PLASTIC',
  GLASS = 'GLASS',
  METAL = 'METAL',
}

export interface WasteItemData {
  id: number;
  type: WasteType;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  speed: number;
  isDragging: boolean;
}

export interface GameConfig {
  duration: number; // seconds
  spawnRate: number; // ms
  gravity: number; // speed multiplier
}
