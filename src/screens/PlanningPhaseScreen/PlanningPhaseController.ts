import { PlanningPhaseView } from "./PlanningPhaseView.ts";
import type { DefenseType } from "../../components/DefenseComponent/DefenseModel.ts";

export class PlanningPhaseController {
	private view: PlanningPhaseView;

	constructor() {
		this.view = new PlanningPhaseView();
	}

	setDefenseInventory(inventory: Record<string, number>): void {
		this.view.setDefenseInventory(inventory);
	}

	getView(): PlanningPhaseView {
		return this.view;
	}

	setOnPlaceDefenses(handler: () => void): void {
		this.view.setOnPlaceDefenses(handler);
	}

	setPlacementMode(enabled: boolean): void {
		this.view.setPlacementMode(enabled);
	}

	setOnDefenseSelected(handler: (type: DefenseType | null) => void): void {
		this.view.setOnDefenseSelected(handler);
	}

	showMinigamePrompt(
		title: string,
		description: string,
		continueLabel: string,
		skipLabel: string,
		onContinue: () => void,
		onSkip: () => void,
	): void {
		this.view.showMinigamePrompt(title, description, continueLabel, skipLabel, onContinue, onSkip);
	}

	hideMinigamePrompt(): void {
		this.view.hideMinigamePrompt();
	}

	getSelectedDefenseType(): DefenseType | null {
		return this.view.getSelectedDefenseType();
	}

	show(): void {
		this.view.show();
	}

	hide(): void {
		this.view.hide();
	}

	clearSelection(): void {
		this.view.clearSelection();
	}
}
