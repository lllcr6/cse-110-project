import { DefenseModel, type DefenseType } from "./DefenseModel.ts";
import { DefenseView } from "./DefenseView.ts";
import Konva from "konva";

export class DefenseController {
	private model: DefenseModel;
	private view: DefenseView;

	constructor(group: Konva.Group, type: DefenseType, x: number, y: number, level: number = 1) {
		this.model = new DefenseModel(type, x, y, level);
		this.view = new DefenseView(group, type, x, y);
		this.view.updateDurability(this.model.getDurability(), this.model.getMaxDurability());
	}

	getType(): DefenseType {
		return this.model.getType();
	}

	getX(): number {
		return this.model.getX();
	}

	getY(): number {
		return this.model.getY();
	}

	getView(): Konva.Group {
		return this.view.getView();
	}

	isActive(): boolean {
		return this.model.isActive();
	}

	takeDamage(amount: number = 1): void {
		this.model.takeDamage(amount);
		this.view.updateDurability(this.model.getDurability(), this.model.getMaxDurability());
		if (!this.model.isActive()) {
			this.view.remove();
		}
	}

	getDurability(): number {
		return this.model.getDurability();
	}

	getMaxDurability(): number {
		return this.model.getMaxDurability();
	}

	getConfig() {
		return this.model.getConfig();
	}

	remove(): void {
		this.view.remove();
	}

	showAttackEffect(targetX: number, targetY: number): void {
		this.view.showMuzzleFlash(targetX, targetY);
	}

	applyUpgradeLevel(level: number): void {
		this.model.applyLevel(level);
		this.view.updateDurability(this.model.getDurability(), this.model.getMaxDurability());
	}
}
