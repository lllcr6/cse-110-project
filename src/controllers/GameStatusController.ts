import { STARTING_EMU_COUNT, GameItem } from "../constants";
import {
    type UpgradableDefenseType,
    type DefenseType,
    MAX_DEFENSE_LEVEL,
    getDefenseUpgradeCost,
} from "../components/DefenseComponent/DefenseModel";

export type Inventory = Record<GameItem, number>;
export type DefenseLevels = Record<UpgradableDefenseType, number>;

type PersistedState = {
    day: number;
    inventory: Inventory;
    emuCount: number;
    score: number;
    defenseLevels: DefenseLevels;
};

const STORAGE_KEY = "game:status";

/**
 * GameStatusController - Coordinates higher game status
 * Holds day progression, money, and simple inventory for morning events.
 */
export class GameStatusController {
    private emuCount!: number;
    private day!: number;
    private inventory!: Inventory;
    private score!: number;
    private defenseLevels!: DefenseLevels;

    constructor() {
        const saved = this.load();
        if (saved) {
            this.day = saved.day;
            this.inventory = saved.inventory;
            this.emuCount = saved.emuCount;
            this.score = saved.score;
            this.defenseLevels = saved.defenseLevels;
        } else {
            this.reset();
        }
    }

    // Persistence
    save(): void {
        const s: PersistedState = {
            day: this.day,
            inventory: this.inventory,
            emuCount: this.emuCount,
            score: this.score,
            defenseLevels: this.defenseLevels,
        };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
    }

    private load(): PersistedState | null {
        try {
            const str = localStorage.getItem(STORAGE_KEY);
            if (!str) return null;
            const parsed = JSON.parse(str) as Partial<PersistedState>;
            return {
                day: parsed.day ?? 1,
                inventory: parsed.inventory as Inventory,
                emuCount: parsed.emuCount ?? STARTING_EMU_COUNT,
                score: parsed.score ?? 0,
                defenseLevels: this.normalizeDefenseLevels(parsed.defenseLevels),
            };
        } catch {
            return null;
        }
    }

    private normalizeDefenseLevels(levels?: Partial<DefenseLevels>): DefenseLevels {
        return {
            barbed_wire: Math.max(1, Math.min(MAX_DEFENSE_LEVEL, levels?.barbed_wire ?? 1)),
            sandbag: Math.max(1, Math.min(MAX_DEFENSE_LEVEL, levels?.sandbag ?? 1)),
            machine_gun: Math.max(1, Math.min(MAX_DEFENSE_LEVEL, levels?.machine_gun ?? 1)),
        };
    }

    // Day progression
    getDay(): number { return this.day; }

    endDay(): void {
        // For now, just increment the day counter.
        this.day = this.day + 1;
        this.save();
    }

    // Money helpers (backward compatible!)
    getMoney(): number { 
        return this.getItemCount(GameItem.Money); 
    }

    addMoney(amount: number): void {
        this.addToInventory(GameItem.Money, amount);
    }

    canAfford(cost: number): boolean { 
        return this.inventory[GameItem.Money] >= cost; 
    }

    spend(cost: number): boolean {
        if (this.inventory[GameItem.Money] < cost) return false;
        this.inventory[GameItem.Money] -= cost;
        this.save();
        return true;
    }

    // Get full inventory (useful for UI)
    getInventory(): Inventory {
        return this.inventory;
    }

    // Inventory helpers (now type-safe!)
    getItemCount(item: GameItem): number {
        return this.inventory[item] ?? 0;
    }

    addToInventory(item: GameItem, qty: number): void {
        const current = this.inventory[item] ?? 0;
        this.inventory[item] = Math.max(0, current + qty);
        this.save();
    }

    removeFromInventory(item: GameItem, qty: number): boolean {
        const current = this.inventory[item] ?? 0;
        if (current < qty) return false;
        this.inventory[item] = current - qty;
        this.save();
        return true;
    }

    incrementScore(score: number = 1): void {
        this.score += score;
        this.save();
    }

    getDefenseLevels(): DefenseLevels {
        return { ...this.defenseLevels };
    }

    getDefenseLevel(type: DefenseType): number {
        if (type === "mine") {
            return 1;
        }
        return this.defenseLevels[type];
    }

    getDefenseUpgradeCost(type: UpgradableDefenseType): number | null {
        const currentLevel = this.defenseLevels[type];
        if (currentLevel >= MAX_DEFENSE_LEVEL) {
            return null;
        }
        return getDefenseUpgradeCost(type, currentLevel);
    }

    upgradeDefenseLevel(type: UpgradableDefenseType): boolean {
        const cost = this.getDefenseUpgradeCost(type);
        if (cost === null || !this.spend(cost)) {
            return false;
        }
        this.defenseLevels[type] = Math.min(MAX_DEFENSE_LEVEL, this.defenseLevels[type] + 1);
        this.save();
        return true;
    }

    /**
     * Get final score (use days survived for now)
     */
    getFinalScore(): number {
        return this.score;
    }

    /**
     * Get final score (use days survived for now)
     */
    getSurvivalDay(): number {
        return this.day;
    }

	/**
	 * Adds collected eggs to the main game's inventory.
	 * Now uses the unified inventory system!
	 */
	public addEmuEggs(amount: number): void {
		this.addToInventory(GameItem.Egg, amount);
		console.log(`Total eggs: ${this.getItemCount(GameItem.Egg)}`);
	}

	/**
	 * Gets the total number of emu eggs.
	 * Now uses the unified inventory system!
	 */
	public getEmuEggCount(): number {
		return this.getItemCount(GameItem.Egg);
	}

	/**
	 * Reset game state for a new game
	 */
	reset(): void {
		this.day = 1;
        this.score = 0;
		this.inventory = {
			[GameItem.Money]: 100,        // Starting money
			[GameItem.Crop]: 0,
			[GameItem.Mine]: 0,
			[GameItem.Egg]: 0,
			[GameItem.BarbedWire]: 0,
			[GameItem.Sandbag]: 0,
			[GameItem.MachineGun]: 0,
		};
        this.defenseLevels = this.normalizeDefenseLevels();
		this.emuCount = STARTING_EMU_COUNT;
		this.save();
	}
}
