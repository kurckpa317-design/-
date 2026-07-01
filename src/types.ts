export type UnitType = "sword" | "archer" | "tank" | "mage" | "assassin" | "healer";

export interface Unit {
  id: string;
  lane: number; // 0, 1, or 2
  type: UnitType;
  enemy: boolean; // false = player, true = AI/enemy
  x: number; // Position percentage (0 to 100)
  hp: number;
  maxHp: number;
  dmg: number;
  speed: number;
  range: number; // Combat range (percentage of lane)
  isAttacking: boolean;
  lastAttackTime: number; // Timestamp of last hit
}

export interface GameState {
  playerCastleHp: number;
  aiCastleHp: number;
  playerGold: number;
  aiGold: number;
  playerIncome: number;
  aiIncome: number;
  score: number;
  isGameOver: boolean;
  victory: boolean | null;
}

export interface ChatMessage {
  id: string;
  sender: "player" | "advisor" | "overlord" | "system";
  text: string;
  timestamp: string;
}

export interface UnitStats {
  hp: number;
  dmg: number;
  speed: number;
  cost: number;
  range: number;
  name: string;
  emoji: string;
  description: string;
}

export const UNIT_CONFIGS: Record<UnitType, UnitStats> = {
  sword: {
    hp: 120,
    dmg: 20,
    speed: 0.15, // speed percentage per tick
    range: 4,
    cost: 50,
    name: "Рыцарь",
    emoji: "💂‍♂️",
    description: "Надежный воин ближнего боя с хорошим уроном.",
  },
  archer: {
    hp: 75,
    dmg: 12,
    speed: 0.18,
    range: 22, // Shoots from far away
    cost: 75,
    name: "Эльфийская Лучница",
    emoji: "🧝‍♀️",
    description: "Стреляет быстрыми стрелами по врагам издалека. Очень эффективна на дистанции!",
  },
  tank: {
    hp: 300,
    dmg: 15,
    speed: 0.08,
    range: 4,
    cost: 150,
    name: "Защитник",
    emoji: "🛡️",
    description: "Огромное здоровье, сдерживает волны врагов.",
  },
  mage: {
    hp: 90,
    dmg: 35,
    speed: 0.11,
    range: 26,
    cost: 110,
    name: "Маг",
    emoji: "🧙‍♂️",
    description: "Наносит высокий урон магическими снарядами на дистанции.",
  },
  assassin: {
    hp: 100,
    dmg: 45,
    speed: 0.26,
    range: 4,
    cost: 95,
    name: "Убийца",
    emoji: "🥷",
    description: "Сверхскоростной скрытный воин с огромным уроном вблизи.",
  },
  healer: {
    hp: 110,
    dmg: 18, // Healing power amount per combat trigger
    speed: 0.13,
    range: 16,
    cost: 100,
    name: "Целитель",
    emoji: "🧚‍♀️",
    description: "Лечит союзников впереди себя на линии во время боя.",
  },
};
