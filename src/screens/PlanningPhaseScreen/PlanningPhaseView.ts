import Konva from "konva";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants.ts";
import type { DefenseType } from "../../components/DefenseComponent/DefenseModel.ts";
import { getFactByDefenseType } from "../../data/EmuWarFacts.ts";

export interface View {
	getGroup(): Konva.Group;
	show(): void;
	hide(): void;
}

export class PlanningPhaseView implements View {
	private group: Konva.Group;
	private overlay: Konva.Group;
	private tutorialPanel: Konva.Group;
	private defenseSelectionPanel: Konva.Group;
	private startButton: Konva.Group;
	private selectionPanelBackdrop: Konva.Rect | null = null;
	private selectionPanelTitle: Konva.Text | null = null;
	private selectionPanelHint: Konva.Text | null = null;
	private tooltip: Konva.Group | null = null;
	private selectedDefenseType: DefenseType | null = null;
	private defenseButtons: Partial<Record<DefenseType, Konva.Group>> = {};
	private onPlaceDefenses: (() => void) | null = null;
	private onDefenseSelected: ((type: DefenseType | null) => void) | null = null;

	constructor() {
		this.group = new Konva.Group({ visible: false, listening: true });
		this.overlay = new Konva.Group({ listening: true });
		this.tutorialPanel = new Konva.Group({ listening: true });
		this.defenseSelectionPanel = new Konva.Group({ listening: true });
		this.startButton = new Konva.Group({ listening: true });

		this.createOverlay();
		this.createTutorialPanel();
		this.createDefenseSelectionPanel();
		this.createStartButton();

		this.group.add(this.overlay);
		this.group.add(this.tutorialPanel);
		this.group.add(this.defenseSelectionPanel);
		this.group.add(this.startButton);
	}

	private createOverlay(): void {
		// Semi-transparent background
		const bg = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "rgba(0, 0, 0, 0.7)",
			listening: false, // Allow clicks to pass through to the farm for placement
		});
		this.overlay.add(bg);
	}

	private createTutorialPanel(): void {
		const panelWidth = 600;
		const panelHeight = 300;
		const panelX = (STAGE_WIDTH - panelWidth) / 2;
		const panelY = 50;

		const panel = new Konva.Rect({
			x: panelX,
			y: panelY,
			width: panelWidth,
			height: panelHeight,
			fill: "#2c3e50",
			stroke: "#34495e",
			strokeWidth: 3,
			cornerRadius: 10,
		});
		this.tutorialPanel.add(panel);

		const title = new Konva.Text({
			x: panelX,
			y: panelY + 20,
			width: panelWidth,
			text: "Planning Phase - The Great Emu War",
			fontSize: 28,
			fontFamily: "Arial",
			fill: "#ecf0f1",
			align: "center",
			fontStyle: "bold",
		});
		this.tutorialPanel.add(title);

		const instructions = [
			"• Place defenses to protect your crops from emus",
			"• Click on the farm to place selected defenses (costs money)",
			"• Emus will target your crops - defend them!",
			"• Historical context: In 1932, Australian farmers faced",
			"  massive emu invasions destroying wheat crops",
			"• Click 'Start Round' when ready to begin",
		];

		let yOffset = panelY + 70;
		for (const instruction of instructions) {
			const text = new Konva.Text({
				x: panelX + 30,
				y: yOffset,
				text: instruction,
				fontSize: 16,
				fontFamily: "Arial",
				fill: "#bdc3c7",
			});
			this.tutorialPanel.add(text);
			yOffset += 30;
		}
	}

	private createDefenseSelectionPanel(): void {
		const panelWidth = 600;
		const panelHeight = 150;
		const panelX = (STAGE_WIDTH - panelWidth) / 2;
		const panelY = STAGE_HEIGHT - panelHeight - 50;

		this.selectionPanelBackdrop = new Konva.Rect({
			x: panelX,
			y: panelY,
			width: panelWidth,
			height: panelHeight,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: panelHeight },
			fillLinearGradientColorStops: [0, "#3e566b", 1, "#263646"],
			stroke: "#1e2a36",
			strokeWidth: 2,
			cornerRadius: 12,
		});
		this.defenseSelectionPanel.add(this.selectionPanelBackdrop);

		this.selectionPanelTitle = new Konva.Text({
			x: panelX,
			y: panelY + 10,
			width: panelWidth,
			text: "Select a defense:",
			fontSize: 18,
			fontFamily: "Georgia",
			fontStyle: "bold",
			fill: "#f4f1e8",
			align: "center",
		});
		this.defenseSelectionPanel.add(this.selectionPanelTitle);

		this.selectionPanelHint = new Konva.Text({
			x: panelX,
			y: panelY + 32,
			width: panelWidth,
			text: "Select one below, then press P to place it.",
			fontSize: 12,
			fontFamily: "Arial",
			fill: "#d5dde6",
			align: "center",
		});
		this.defenseSelectionPanel.add(this.selectionPanelHint);

		// Defense buttons
		const defenses: DefenseType[] = ["barbed_wire", "sandbag", "machine_gun", "mine"];
		const buttonWidth = 132;
		const buttonHeight = 72;
		const gap = 10;
		const startX = panelX + (panelWidth - (defenses.length * buttonWidth + (defenses.length - 1) * gap)) / 2;
		const buttonY = panelY + 60;

		defenses.forEach((defenseType, index) => {
			const buttonX = startX + index * (buttonWidth + gap);

			const button = new Konva.Group({
				x: buttonX,
				y: buttonY,
				cursor: "pointer",
				listening: true,
			});

			const bg = new Konva.Rect({
				width: buttonWidth,
				height: buttonHeight,
				fill: "#72808a",
				stroke: "#9fb0bc",
				strokeWidth: 2,
				cornerRadius: 8,
				listening: true,
			});
			button.add(bg);

			const name = new Konva.Text({
				x: 5,
				y: 5,
				width: buttonWidth - 10,
				text: defenseType.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()),
				fontSize: 14,
				fontFamily: "Arial",
				fill: "#f4f1e8",
				align: "center",
			});
			button.add(name);

			// Inventory count will be updated when show() is called
			const inventoryText = new Konva.Text({
				x: 5,
				y: 25,
				width: buttonWidth - 10,
				text: "Owned: 0",
				fontSize: 12,
				fontFamily: "Arial",
				fill: "#9fe7a2",
				align: "center",
			});
			button.add(inventoryText);
			// Store reference for updating
			(button as any).inventoryText = inventoryText;

			const effect = new Konva.Text({
				x: 5,
				y: 44,
				width: buttonWidth - 10,
				text: this.getEffectDescription(defenseType),
				fontSize: 10,
				fontFamily: "Arial",
				fill: "#d5dde6",
				align: "center",
			});
			button.add(effect);

			button.on("click", () => {
				// Toggle selection
				if (this.selectedDefenseType === defenseType) {
					this.selectedDefenseType = null;
					bg.fill("#72808a");
					this.onDefenseSelected?.(null);
				} else {
					// Deselect previous
					if (this.selectedDefenseType) {
						const prevButton = this.defenseButtons[this.selectedDefenseType];
						if (prevButton) {
							const prevBg = prevButton.children?.[0] as Konva.Rect;
							if (prevBg) prevBg.fill("#72808a");
						}
					}
					this.selectedDefenseType = defenseType;
					bg.fill("#27ae60");
					this.onDefenseSelected?.(defenseType);
				}
				this.group.getLayer()?.draw();
			});

			// Add hover tooltip with historical fact
			button.on("mouseenter", () => {
				this.showTooltip(defenseType, buttonX, buttonY);
			});

			button.on("mouseleave", () => {
				this.hideTooltip();
			});

			this.defenseButtons[defenseType] = button;
			this.defenseSelectionPanel.add(button);
		});
	}

	setPlacementMode(enabled: boolean): void {
		// In placement mode, keep only the compact defense tray visible so the farm stays bright.
		this.overlay.visible(!enabled);
		this.tutorialPanel.visible(!enabled);
		this.startButton.visible(!enabled);
		this.defenseSelectionPanel.visible(true);
		this.defenseSelectionPanel.y(0);
		if (this.selectionPanelBackdrop) {
			this.selectionPanelBackdrop.fillLinearGradientColorStops(
				enabled
					? [0, "#36515f", 1, "#21313f"]
					: [0, "#3e566b", 1, "#263646"],
			);
		}
		if (this.selectionPanelTitle) {
			this.selectionPanelTitle.text(enabled ? "Place Defenses" : "Select a defense:");
		}
		if (this.selectionPanelHint) {
			this.selectionPanelHint.text(
				enabled
					? "Select one below, then press P to place it."
					: "Select one below, then press P to place it.",
			);
		}
		this.group.getLayer()?.draw();
	}

	private getEffectDescription(type: DefenseType): string {
		switch (type) {
			case "barbed_wire":
				return "Slows emus";
			case "sandbag":
				return "Blocks emus";
			case "machine_gun":
				return "Auto-shoots";
			case "mine":
				return "One-shot blast";
			default:
				return "";
		}
	}

	private createStartButton(): void {
		const buttonWidth = 200;
		const buttonHeight = 50;
		const buttonX = (STAGE_WIDTH - buttonWidth) / 2;
		const buttonY = STAGE_HEIGHT - 235;

		const button = new Konva.Group({
			x: buttonX,
			y: buttonY,
			cursor: "pointer",
		});

		const bg = new Konva.Rect({
			width: buttonWidth,
			height: buttonHeight,
			fill: "#27ae60",
			stroke: "#2ecc71",
			strokeWidth: 3,
			cornerRadius: 8,
		});
		button.add(bg);

		const text = new Konva.Text({
			x: 0,
			y: buttonHeight / 2 - 12,
			width: buttonWidth,
			text: "Place Defenses",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "#ecf0f1",
			align: "center",
			fontStyle: "bold",
		});
		button.add(text);

		button.on("click", () => {
			this.onPlaceDefenses?.();
		});

		this.startButton.add(button);
	}

	setOnPlaceDefenses(handler: () => void): void {
		this.onPlaceDefenses = handler;
	}

	setOnDefenseSelected(handler: (type: DefenseType | null) => void): void {
		this.onDefenseSelected = handler;
	}

	private showTooltip(defenseType: DefenseType, x: number, y: number): void {
		this.hideTooltip();

		const fact = getFactByDefenseType(defenseType);
		if (!fact) return;

		const tooltipWidth = 250;
		const tooltipHeight = 100;
		const tooltipX = Math.min(x, STAGE_WIDTH - tooltipWidth - 10);
		const tooltipY = y - tooltipHeight - 10;

		this.tooltip = new Konva.Group({
			x: tooltipX,
			y: tooltipY,
		});

		const bg = new Konva.Rect({
			width: tooltipWidth,
			height: tooltipHeight,
			fill: "#2c3e50",
			stroke: "#34495e",
			strokeWidth: 2,
			cornerRadius: 5,
			opacity: 0.95,
		});
		this.tooltip.add(bg);

		const title = new Konva.Text({
			x: 10,
			y: 10,
			width: tooltipWidth - 20,
			text: fact.title,
			fontSize: 14,
			fontFamily: "Arial",
			fill: "#ecf0f1",
			fontStyle: "bold",
		});
		this.tooltip.add(title);

		const desc = new Konva.Text({
			x: 10,
			y: 30,
			width: tooltipWidth - 20,
			text: fact.description,
			fontSize: 11,
			fontFamily: "Arial",
			fill: "#bdc3c7",
			wrap: "word",
		});
		this.tooltip.add(desc);

		this.group.add(this.tooltip);
		this.group.getLayer()?.draw();
	}

	private hideTooltip(): void {
		if (this.tooltip) {
			this.tooltip.remove();
			this.tooltip = null;
			this.group.getLayer()?.draw();
		}
	}

	getSelectedDefenseType(): DefenseType | null {
		return this.selectedDefenseType;
	}

	getGroup(): Konva.Group {
		return this.group;
	}

	setDefenseInventory(inventory: Record<string, number>): void {
		// Update inventory counts on defense buttons
		const defenses: DefenseType[] = ["barbed_wire", "sandbag", "machine_gun", "mine"];
		defenses.forEach((defenseType) => {
			const button = this.defenseButtons[defenseType];
			const inventoryText = button ? ((button as any).inventoryText as Konva.Text | undefined) : undefined;
			if (inventoryText) {
				const count = inventory[defenseType] || 0;
				inventoryText.text(`Owned: ${count}`);
			}
		});
		this.group.getLayer()?.draw();
	}

	clearSelection(): void {
		if (this.selectedDefenseType) {
			const button = this.defenseButtons[this.selectedDefenseType];
			if (button) {
				const bg = button.children?.[0] as Konva.Rect;
				if (bg) {
					bg.fill("#7f8c8d");
				}
			}
		}
		this.selectedDefenseType = null;
		this.group.getLayer()?.draw();
		this.onDefenseSelected?.(null);
	}

	show(): void {
		this.group.visible(true);
	}

	hide(): void {
		this.group.visible(false);
	}
}
