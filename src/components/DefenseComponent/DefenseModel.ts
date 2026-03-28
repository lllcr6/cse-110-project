/**
 * DefenseModel - Manages defense state
 */
export type DefenseType = "barbed_wire" | "sandbag" | "machine_gun" | "mine";
export type UpgradableDefenseType = Exclude<DefenseType, "mine">;
export const MAX_DEFENSE_LEVEL = 10;

export const UPGRADABLE_DEFENSE_TYPES: UpgradableDefenseType[] = [
	"barbed_wire",
	"sandbag",
	"machine_gun",
];

export interface DefenseConfig {
	cost: number;
	durability: number;
	maxDurability: number;
	effectiveness: number; // 0-1, where 1 is strongest
}

export const DEFENSE_CONFIGS: Record<DefenseType, DefenseConfig> = {
	barbed_wire: {
		cost: 10,
		durability: 30,
		maxDurability: 30,
		effectiveness: 0.3, // Slows emus by 50%
	},
	sandbag: {
		cost: 25,
		durability: 3, // Can be destroyed after 3 hits
		maxDurability: 3,
		effectiveness: 0.5, // Blocks emus temporarily
	},
	machine_gun: {
		cost: 50,
		durability: 50, // Limited ammo
		maxDurability: 50,
		effectiveness: 0.7, // Auto-shoots nearby emus
	},
	mine: {
		cost: 0, // Special - only from quizzes
		durability: 1, // One-time use
		maxDurability: 1,
		effectiveness: 1.0, // Instant kill
	},
};

export function clampDefenseLevel(level: number): number {
	return Math.max(1, Math.min(MAX_DEFENSE_LEVEL, Math.floor(level)));
}

export function getDefenseUpgradeCost(type: UpgradableDefenseType, currentLevel: number): number {
	const safeLevel = clampDefenseLevel(currentLevel);
	return DEFENSE_CONFIGS[type].cost * (2 ** (safeLevel - 1));
}

export function getDefenseStats(type: DefenseType, level: number = 1): DefenseConfig {
	const base = DEFENSE_CONFIGS[type];
	if (type === "mine") {
		return { ...base };
	}

	const safeLevel = clampDefenseLevel(level);
	const durabilityScale = 1 + (safeLevel - 1) * 0.4;
	const maxDurability = Math.round(base.maxDurability * durabilityScale);

	return {
		...base,
		durability: maxDurability,
		maxDurability,
	};
}

export class DefenseModel {
	private type: DefenseType;
	private x: number;
	private y: number;
	private durability: number;
	private maxDurability: number;
	private active: boolean;

	constructor(type: DefenseType, x: number, y: number, level: number = 1) {
		this.type = type;
		this.x = x;
		this.y = y;
		const config = getDefenseStats(type, level);
		this.maxDurability = config.maxDurability;
		this.durability = config.maxDurability;
		this.active = true;
	}

	getType(): DefenseType {
		return this.type;
	}

	getX(): number {
		return this.x;
	}

	getY(): number {
		return this.y;
	}

	getDurability(): number {
		return this.durability;
	}

	getMaxDurability(): number {
		return this.maxDurability;
	}

	isActive(): boolean {
		return this.active && (this.durability === Infinity || this.durability > 0);
	}

	takeDamage(amount: number = 1): void {
		if (this.durability === Infinity) {
			return; // Indestructible
		}
		this.durability = Math.max(0, this.durability - amount);
		if (this.durability <= 0) {
			this.active = false;
		}
	}

	getConfig(): DefenseConfig {
		return {
			...DEFENSE_CONFIGS[this.type],
			durability: this.durability,
			maxDurability: this.maxDurability,
		};
	}

	applyLevel(level: number): void {
		if (this.type === "mine") {
			return;
		}
		const upgraded = getDefenseStats(this.type, level);
		const damageTaken = Math.max(0, this.maxDurability - this.durability);
		this.maxDurability = upgraded.maxDurability;
		this.durability = Math.max(0, this.maxDurability - damageTaken);
		if (this.durability > 0) {
			this.active = true;
		}
	}
}
