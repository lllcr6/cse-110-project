import Konva from "konva";
import type { View } from "../../types.ts";
import {STAGE_WIDTH, STAGE_HEIGHT, PLANTER_WIDTH, HUD_HEIGHT} from "../../constants.ts";
import {FarmPlanterController} from "../../components/FarmPlanterComponent/FarmPlanterController.ts";
import {FarmEmuController} from "../../components/FarmEmuComponent/FarmEmuController.ts";
import mineSrc from "../../../assets/mine.png";
import flagSrc from "../../../assets/flag.png";
import chevronSrc from "../../../assets/chevron.png";
import pauseSrc from "../../../assets/pause.png";

const createImage = (src: string): HTMLImageElement => {
	if (typeof Image !== "undefined") {
		const image = new Image();
		image.src = src;
		return image;
	}

	const fallback = document.createElement("img") as HTMLImageElement;
	fallback.src = src;
	return fallback;
};

const mineImage = createImage(mineSrc);
const flagImage = createImage(flagSrc);
const chevronImage = createImage(chevronSrc);
const pauseImage = createImage(pauseSrc);
const MINE_SIZE = 42;

/**
 * GameScreenView - Renders the game UI using Konva
 */
export class FarmScreenView implements View {
	private group: Konva.Group;
	private hudGroup: Konva.Group;
	private hudBanner: Konva.Rect;
	private scoreText: Konva.Text;
	private cropText: Konva.Text;
	private mineText: Konva.Text;
	private menuOverlay: Konva.Group;
	private huntMenuOverlay: Konva.Group;
	private eggMenuOverlay: Konva.Group;
	private replantOverlay: Konva.Group;
	private replantOverlayTitle: Konva.Text;
	private replantOverlayMessage: Konva.Text;
	private minesLayer: Konva.Group;
	private defensesLayer: Konva.Group;
	private mines: Konva.Image[] = [];
	private menuButtonHandler: (() => void) | null = null;
	private onDefensePlaceClick: ((x: number, y: number) => void) | null = null;
	private menuSaveHandler: (() => void) | null = null;
	private menuBackHandler: (() => void) | null = null;
	private startRoundHandler: (() => void) | null = null;
	//Event handlers for skip/continue functionality for hunt/egg minigames:
	private huntContinueHandler: (() => void) | null = null;
	private huntSkipHandler: (() => void) | null = null;
	private eggContinueHandler: (() => void) | null = null;
	private eggSkipHandler: (() => void) | null = null;
	private registerEmu: ((emu: FarmEmuController) => void) | null = null;
	private removeEmus: (() => void) | null = null;
	private timerText: Konva.Text;
	private roundText: Konva.Text;
	private mineInstructionText: Konva.Text;
	private hudTooltipGroup: Konva.Group;
	private hudTooltipBackground: Konva.Rect;
	private hudTooltipText: Konva.Text;
	private startRoundGroup: Konva.Group;
	private startDayBackground: Konva.Rect;
	private startDayButton: Konva.Image;
	private startRoundButtonEnabled: boolean = false;
	private startRoundTooltipMessage = "Start this round after placing defenses";
	private mouseX: number = 0;
	private mouseY: number = 0;
	private placementHintDefault = "Click emus to attack.";

	constructor(
		handleKeydown: (event: KeyboardEvent) => void,
		handleEndGame: () => void,
		registerEmu: (emu: FarmEmuController) => void,
		removeEmus: () => void,
		registerPlanter: (planter: FarmPlanterController) => void,
	) {
		this.registerEmu = registerEmu;
		this.removeEmus = removeEmus;

		window.addEventListener("keydown", (event) => {
			const keyboardEvent = event as KeyboardEvent;
			handleKeydown(keyboardEvent);
		});

		this.group = new Konva.Group({ visible: false });

		// Background
		const bg = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "#009900", // Sky blue
		});
		this.group.add(bg);

		// Track mouse position for mine placement
		this.group.on("mousemove", (e) => {
			const stage = e.target.getStage();
			if (stage) {
				const pointerPos = stage.getPointerPosition();
				if (pointerPos) {
					this.mouseX = pointerPos.x;
					this.mouseY = pointerPos.y;
				}
			}
		});

		this.minesLayer = new Konva.Group({ listening: false });
		this.group.add(this.minesLayer);

		this.defensesLayer = new Konva.Group({ listening: false }); // Disabled by default, enabled during planning phase
		
		// Add a transparent rect to capture clicks anywhere on the stage for defense placement
		const defenseClickCatcher = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "transparent",
		});
		this.defensesLayer.add(defenseClickCatcher);
		
		this.group.add(this.defensesLayer);

		// Add click handler for defense placement during planning phase
		this.defensesLayer.on("click", (e) => {
			if (this.onDefensePlaceClick) {
				const pos = e.target.getStage()?.getPointerPosition();
				if (pos) {
					this.onDefensePlaceClick(pos.x, pos.y);
				}
			}
		});
		this.minesLayer = new Konva.Group({ listening: false });
		this.group.add(this.minesLayer);

		/**
		 * Create improved HUD with dark banner at top
		 */
		this.hudGroup = new Konva.Group({ listening: true });
		
		// Dark banner background
		this.hudBanner = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: HUD_HEIGHT,
			fill: "rgba(0, 0, 0, 0.6)",
		});
		this.hudGroup.add(this.hudBanner);

		// Score display (left side, stacked)
		this.scoreText = new Konva.Text({
			x: 10,
			y: 10,
			text: "Score: 0",
			fontSize: 14,
			fontFamily: "Arial",
			fill: "white",
		});
		this.hudGroup.add(this.scoreText);

		this.cropText = new Konva.Text({
			x: 10,
			y: 25,
			text: "Crop Seeds: 0",
			fontSize: 14,
			fontFamily: "Arial",
			fill: "white",
		});
		this.hudGroup.add(this.cropText);

		this.mineText = new Konva.Text({
			x: 10,
			y: 40,
			text: "Mines: 0",
			fontSize: 14,
			fontFamily: "Arial",
			fill: "white",
		});
		this.hudGroup.add(this.mineText);

		this.mineInstructionText = new Konva.Text({
			x: 10,
			y: 60,
			text: this.placementHintDefault,
			fontSize: 12,
			fontFamily: "Arial",
			fill: "#cccccc",
		});
		this.hudGroup.add(this.mineInstructionText);

		this.hudTooltipGroup = new Konva.Group({ visible: false, listening: false });
		this.hudTooltipBackground = new Konva.Rect({
			x: 0,
			y: 0,
			width: 10,
			height: 10,
			fill: "rgba(20, 20, 20, 0.92)",
			cornerRadius: 6,
			stroke: "#d0d0d0",
			strokeWidth: 1,
		});
		this.hudTooltipText = new Konva.Text({
			x: 0,
			y: 0,
			text: "",
			fontSize: 12,
			fontFamily: "Arial",
			fill: "white",
			padding: 8,
		});
		this.hudTooltipGroup.add(this.hudTooltipBackground);
		this.hudTooltipGroup.add(this.hudTooltipText);
		this.hudGroup.add(this.hudTooltipGroup);

		// Three buttons on right side (exact layout from market-options)
		
		// 1. Pause button (grey)
		const pauseGroup = new Konva.Group({ cursor: "pointer", listening: true });
		const pauseBackground = new Konva.Rect({
			x: STAGE_WIDTH - 180,
			y: 20,
			width: 40,
			height: 40,
			fill: "grey",
			cornerRadius: 8,
			listening: true,
		});
		const pauseButton = new Konva.Image({
			x: STAGE_WIDTH - 175,
			y: 25,
			width: 30,
			height: 30,
			image: pauseImage,
			listening: true,
		});
		// Attach event to the GROUP so background doesn't block clicks
		pauseGroup.on("mouseup", () => this.menuButtonHandler?.());
		pauseGroup.on("click", () => this.menuButtonHandler?.());
		this.attachHudTooltip(pauseGroup, "Pause and open the menu");
		pauseGroup.add(pauseBackground);
		pauseGroup.add(pauseButton);
		this.hudGroup.add(pauseGroup);

		// 2. Start Day button (green)
		this.startRoundGroup = new Konva.Group({ cursor: "pointer", listening: true });
		this.startDayBackground = new Konva.Rect({
			x: STAGE_WIDTH - 120,
			y: 20,
			width: 40,
			height: 40,
			fill: "green",
			cornerRadius: 8,
			listening: true,
		});
		this.startDayButton = new Konva.Image({
			x: STAGE_WIDTH - 115,
			y: 25,
			width: 30,
			height: 30,
			image: chevronImage,
			listening: true,
		});
		// Attach event to the GROUP so background doesn't block clicks
		this.startRoundGroup.on("click", () => {
			if (!this.startRoundButtonEnabled) {
				return;
			}
			this.startRoundHandler?.();
		});
		this.startRoundGroup.on("mouseenter", () => this.showHudTooltip(this.startRoundGroup, this.startRoundTooltipMessage));
		this.startRoundGroup.on("mouseleave", () => this.hideHudTooltip());
		this.startRoundGroup.add(this.startDayBackground);
		this.startRoundGroup.add(this.startDayButton);
		this.hudGroup.add(this.startRoundGroup);
		this.setStartRoundButtonEnabled(false);

		// 3. End Game button (red) - RIGHTMOST button
		const endGameGroup = new Konva.Group({ cursor: "pointer", listening: true });
		const endGameBackground = new Konva.Rect({
			x: STAGE_WIDTH - 60,
			y: 20,
			width: 40,
			height: 40,
			fill: "red",
			cornerRadius: 8,
			listening: true,
		});
		const endGameButton = new Konva.Image({
			x: STAGE_WIDTH - 55,
			y: 25,
			width: 30,
			height: 30,
			image: flagImage,
			listening: true,
		});
		// Attach event to the GROUP so background doesn't block clicks
		endGameGroup.on("mouseup", handleEndGame);
		endGameGroup.on("click", handleEndGame);
		this.attachHudTooltip(endGameGroup, "End the run and go to the results screen");
		endGameGroup.add(endGameBackground);
		endGameGroup.add(endGameButton);
		this.hudGroup.add(endGameGroup);

		this.group.add(this.hudGroup);

		this.menuOverlay = new Konva.Group({ visible: false });

		const overlayBackground = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "rgba(0, 0, 0, 0.55)",
		});
		overlayBackground.on("mouseup", (evt) => {
			evt.cancelBubble = true;
		});

		const panelWidth = 420;
		const panelHeight = 260;
		const panelX = (STAGE_WIDTH - panelWidth) / 2;
		const panelY = (STAGE_HEIGHT - panelHeight) / 2;

		const overlayPanel = new Konva.Rect({
			x: panelX,
			y: panelY,
			width: panelWidth,
			height: panelHeight,
			fill: "#f5f5f5",
			stroke: "#333333",
			strokeWidth: 2,
			cornerRadius: 12,
		});

		const overlayTitle = new Konva.Text({
			x: panelX,
			y: panelY + 24,
			width: panelWidth,
			text: "Pause Menu",
			fontSize: 32,
			fontFamily: "Arial",
			fill: "#333333",
			align: "center",
		});

		const saveButton = new Konva.Group({
			x: panelX + 40,
			y: panelY + 100,
			cursor: "pointer",
		});

		const saveRect = new Konva.Rect({
			width: panelWidth - 80,
			height: 56,
			fill: "#2e7d32",
			cornerRadius: 10,
		});

		const saveText = new Konva.Text({
			text: "Save and Exit",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "white",
			width: panelWidth - 80,
			y: 14,
			align: "center",
		});

		saveButton.add(saveRect);
		saveButton.add(saveText);
		saveButton.on("mouseup", () => {
			this.menuSaveHandler?.();
		});

		const backButton = new Konva.Group({
			x: panelX + 40,
			y: panelY + 170,
			cursor: "pointer",
		});

		const backRect = new Konva.Rect({
			width: panelWidth - 80,
			height: 56,
			fill: "#c62828",
			cornerRadius: 10,
		});

		const backText = new Konva.Text({
			text: "Back to Game",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "white",
			width: panelWidth - 80,
			y: 14,
			align: "center",
		});

		backButton.add(backRect);
		backButton.add(backText);
		backButton.on("mouseup", () => {
			this.menuBackHandler?.();
		});

		this.menuOverlay.add(overlayBackground);
		this.menuOverlay.add(overlayPanel);
		this.menuOverlay.add(overlayTitle);
		this.menuOverlay.add(saveButton);
		this.menuOverlay.add(backButton);

		//Hunting Menu overlay:
		this.huntMenuOverlay = this.createOverlay(
			"Hunt Opportunity",
			"Track the emus for bonus rewards before the farm raid begins.",
			"Continue",
			"Skip Minigame",
			() => this.huntContinueHandler?.(),
			() => this.huntSkipHandler?.()
		);
		this.group.add(this.huntMenuOverlay);

		//Egg Menu overlay:
		this.eggMenuOverlay = this.createOverlay(
			"Egg Raid Opportunity",
			"Sneak into emu territory and grab eggs before you return to defend the farm.",
			"Continue",
			"Skip Minigame",
			() => this.eggContinueHandler?.(),
			() => this.eggSkipHandler?.()
		);
		this.group.add(this.eggMenuOverlay);
		this.replantOverlay = new Konva.Group({ visible: false, listening: false });
		const replantPanelWidth = 520;
		const replantPanelHeight = 110;
		const replantPanelX = (STAGE_WIDTH - replantPanelWidth) / 2;
		const replantPanelY = STAGE_HEIGHT - replantPanelHeight - 24;
		const replantShadow = new Konva.Rect({
			x: replantPanelX + 6,
			y: replantPanelY + 8,
			width: replantPanelWidth,
			height: replantPanelHeight,
			fill: "rgba(45, 24, 16, 0.22)",
			cornerRadius: 18,
			listening: false,
		});
		const replantFrame = new Konva.Rect({
			x: replantPanelX,
			y: replantPanelY,
			width: replantPanelWidth,
			height: replantPanelHeight,
			fill: "#6d4c41",
			stroke: "#4e342e",
			strokeWidth: 2,
			cornerRadius: 18,
			listening: false,
		});
		const replantPanel = new Konva.Rect({
			x: replantPanelX + 10,
			y: replantPanelY + 10,
			width: replantPanelWidth - 20,
			height: replantPanelHeight - 20,
			fill: "rgba(235, 214, 157, 0.98)",
			stroke: "#c49a52",
			strokeWidth: 2,
			cornerRadius: 14,
			shadowColor: "black",
			shadowBlur: 6,
			shadowOpacity: 0.08,
			shadowOffset: { x: 0, y: 2 },
			listening: false,
		});
		const replantDivider = new Konva.Line({
			points: [
				replantPanelX + 42,
				replantPanelY + 48,
				replantPanelX + replantPanelWidth - 42,
				replantPanelY + 48,
			],
			stroke: "#b9823b",
			strokeWidth: 2,
			opacity: 0.75,
			listening: false,
		});
		this.replantOverlayTitle = new Konva.Text({
			x: replantPanelX + 24,
			y: replantPanelY + 13,
			width: replantPanelWidth - 48,
			text: "All crops harvested",
			fontSize: 23,
			fontFamily: "Georgia",
			fontStyle: "bold",
			fill: "#4a2c1d",
			align: "center",
			listening: false,
		});
		this.replantOverlayMessage = new Konva.Text({
			x: replantPanelX + 32,
			y: replantPanelY + 58,
			width: replantPanelWidth - 64,
			text: "Plant at least one crop to continue the round.",
			fontSize: 17,
			fontFamily: "Georgia",
			fill: "#5d4037",
			align: "center",
			lineHeight: 1.35,
			listening: false,
		});
		this.replantOverlay.add(replantShadow);
		this.replantOverlay.add(replantFrame);
		this.replantOverlay.add(replantPanel);
		this.replantOverlay.add(replantDivider);
		this.replantOverlay.add(this.replantOverlayTitle);
		this.replantOverlay.add(this.replantOverlayMessage);
		this.group.add(this.replantOverlay);

		// Planters
		for (let x = (STAGE_WIDTH / 8) + (PLANTER_WIDTH / 2); x < STAGE_WIDTH; x += (7 * STAGE_WIDTH) / 32 - PLANTER_WIDTH / 8) {
			for (let y = 200; y < 500; y += 100) {
				const planter = new FarmPlanterController(this.group, x, y);
				registerPlanter(planter);
			}
		}

		// Add menu overlay last so it appears on top of everything
		this.group.add(this.menuOverlay);
		//Timer display:
		this.timerText = new Konva.Text({
			x: STAGE_WIDTH - 380,
			y: 20,
			text: "Time: 60",
			fontSize: 32,
			fontFamily: "Arial",
			fill: "white",
		});
		this.group.add(this.timerText);

		//Round display:
		this.roundText = new Konva.Text({
			x: STAGE_WIDTH - 540,
			y: 20,
			text: "Day: 1",
			fontSize: 32,
			fontFamily: "Arial",
			fill: "white",
		});
		this.group.add(this.roundText);
	}

	//For adding overlays to access minigames:
	private createOverlay(
		title: string,
		description: string,
		continueLabel: string,
		skipLabel: string,
		continueHandler: (() => void) | null,
		skipHandler: (() => void) | null,
	) {

		const overlay = new Konva.Group({ visible: false });
		const panelWidth = 520;
		const panelHeight = 350;
		const panelX = (STAGE_WIDTH - panelWidth) / 2;
		const panelY = (STAGE_HEIGHT - panelHeight) / 2;

		const overlayBackground = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: STAGE_HEIGHT,
			fill: "rgba(8, 12, 10, 0.8)",
		});
		overlayBackground.on("mouseup", (evt) => {
			evt.cancelBubble = true;
		});

		const shadow = new Konva.Rect({
			x: panelX + 8,
			y: panelY + 10,
			width: panelWidth,
			height: panelHeight,
			fill: "rgba(0, 0, 0, 0.22)",
			cornerRadius: 24,
		});

		const panelFrame = new Konva.Rect({
			x: panelX,
			y: panelY,
			width: panelWidth,
			height: panelHeight,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: panelHeight },
			fillLinearGradientColorStops: [0, "#6f4b34", 1, "#4a2f20"],
			stroke: "#2e1d14",
			strokeWidth: 2,
			cornerRadius: 24,
		});

		const innerPanel = new Konva.Rect({
			x: panelX + 12,
			y: panelY + 12,
			width: panelWidth - 24,
			height: panelHeight - 24,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: panelHeight - 24 },
			fillLinearGradientColorStops: [0, "#f4e5c8", 1, "#e6cf9e"],
			stroke: "#c18f42",
			strokeWidth: 2,
			cornerRadius: 18,
		});

		const badge = new Konva.Label({
			x: panelX + 28,
			y: panelY + 26,
		});
		badge.add(new Konva.Tag({
			fill: "#274e3c",
			cornerRadius: 999,
			padding: 0,
			pointerDirection: "none",
		}));
		badge.add(new Konva.Text({
			text: "MINIGAME EVENT",
			fontSize: 12,
			fontFamily: "Georgia",
			fontStyle: "bold",
			fill: "#f8f0df",
			padding: 10,
			letterSpacing: 1.2,
		}));

		const overlayTitle = new Konva.Text({
			x: panelX + 28,
			y: panelY + 72,
			width: panelWidth - 56,
			text: title,
			fontSize: 32,
			fontFamily: "Georgia",
			fontStyle: "bold",
			fill: "#3a2418",
			align: "center",
		});

		const divider = new Konva.Line({
			points: [
				panelX + 52,
				panelY + 122,
				panelX + panelWidth - 52,
				panelY + 122,
			],
			stroke: "#b9823b",
			strokeWidth: 2,
			opacity: 0.8,
		});

		const descriptionText = new Konva.Text({
			x: panelX + 44,
			y: panelY + 140,
			width: panelWidth - 88,
			text: `${description}\nChoose whether to play the minigame or skip it and start the round immediately.`,
			fontSize: 17,
			fontFamily: "Georgia",
			fill: "#5d4030",
			align: "center",
			lineHeight: 1.45,
		});

		const skipButton = new Konva.Group({
			x: panelX + 34,
			y: panelY + 278,
			cursor: "pointer",
		});

		const skipRectShadow = new Konva.Rect({
			x: 0,
			y: 4,
			width: 180,
			height: 44,
			fill: "rgba(69, 51, 35, 0.18)",
			cornerRadius: 14,
		});

		const skipRect = new Konva.Rect({
			width: 180,
			height: 44,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: 44 },
			fillLinearGradientColorStops: [0, "#d2b98d", 1, "#b79668"],
			stroke: "#7d6441",
			strokeWidth: 2,
			cornerRadius: 14,
		});

		const skipText = new Konva.Text({
			text: skipLabel,
			fontSize: 16,
			fontFamily: "Arial",
			fontStyle: "bold",
			fill: "#3b2a1d",
			width: 180,
			y: 13,
			align: "center",
		});

		skipButton.add(skipRectShadow);
		skipButton.add(skipRect);
		skipButton.add(skipText);
		skipButton.on("mouseenter", () => {
			skipRect.fillLinearGradientColorStops([0, "#ddc79f", 1, "#c3a270"]);
			overlay.getLayer()?.draw();
		});
		skipButton.on("mouseleave", () => {
			skipRect.fillLinearGradientColorStops([0, "#d2b98d", 1, "#b79668"]);
			overlay.getLayer()?.draw();
		});
		skipButton.on("mouseup", () => {
			skipHandler?.();
		});

		const continueButton = new Konva.Group({
			x: panelX + panelWidth - 214,
			y: panelY + 278,
			cursor: "pointer",
		});

		const continueRectShadow = new Konva.Rect({
			x: 0,
			y: 4,
			width: 180,
			height: 44,
			fill: "rgba(69, 27, 11, 0.24)",
			cornerRadius: 14,
		});

		const continueRect = new Konva.Rect({
			width: 180,
			height: 44,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: 44 },
			fillLinearGradientColorStops: [0, "#c45d35", 1, "#923317"],
			stroke: "#5f1f10",
			strokeWidth: 2,
			cornerRadius: 14,
		});

		const continueText = new Konva.Text({
			text: continueLabel,
			fontSize: 16,
			fontFamily: "Arial",
			fontStyle: "bold",
			fill: "#fff7ea",
			width: 180,
			y: 13,
			align: "center",
		});

		continueButton.add(continueRectShadow);
		continueButton.add(continueRect);
		continueButton.add(continueText);
		continueButton.on("mouseenter", () => {
			continueRect.fillLinearGradientColorStops([0, "#d9784d", 1, "#a73e1f"]);
			overlay.getLayer()?.draw();
		});
		continueButton.on("mouseleave", () => {
			continueRect.fillLinearGradientColorStops([0, "#c45d35", 1, "#923317"]);
			overlay.getLayer()?.draw();
		});
		continueButton.on("mouseup", () => {
			continueHandler?.();
		});

		overlay.add(overlayBackground);
		overlay.add(shadow);
		overlay.add(panelFrame);
		overlay.add(innerPanel);
		overlay.add(badge);
		overlay.add(overlayTitle);
		overlay.add(divider);
		overlay.add(descriptionText);
		overlay.add(skipButton);
		overlay.add(continueButton);

		return overlay;
	}

	spawnEmus(n: number): void {
		if (!this.registerEmu) return;

		for (let i = 0; i < n; i++) {
			const side = Math.floor(Math.random() * 4);
			let location = [0, 0];
			switch (side) {
			case 0: location = [0, Math.random() * STAGE_HEIGHT]; break;
			case 1: location = [Math.random() * STAGE_WIDTH, 0]; break;
			case 2: location = [STAGE_WIDTH, Math.random() * STAGE_HEIGHT]; break;
			case 3: location = [Math.random() * STAGE_WIDTH, STAGE_HEIGHT]; break;
			}

			const emu = new FarmEmuController(this.group, location[0], location[1], () => {
				emu.remove();
				emu.setActive(false);
			});
			this.registerEmu(emu);
		}
	}

	clearEmus(): void {
		if (!this.removeEmus) return;
		this.removeEmus();
		/**
		 * Should remove all emu objects from the game
		 * Is called when the timer ends
		 */
	}

	/**
	 * Update score display
	 */
	updateScore(score: number): void {
		this.scoreText.text(`Score: ${score}`);
		this.group.getLayer()?.draw();
	}

	updateCropCount(count: number): void {
		this.cropText.text(`Crop Seeds: ${count}`);
		this.group.getLayer()?.draw();
	}

	updateMineCount(count: number): void {
		this.mineText.text(`Mines: ${count}`);
		this.group.getLayer()?.draw();
	}

	setMenuButtonHandler(handler: () => void): void {
		this.menuButtonHandler = handler;
	}

	setMenuOptionHandlers(onExit: () => void, onBack: () => void): void {
		this.menuSaveHandler = onExit;
		this.menuBackHandler = onBack;
	}

	setStartRoundHandler(handler: () => void): void {
		this.startRoundHandler = handler;
	}

	//For hunting minigame:
	setHuntMenuOptionHandlers(onSkip: () => void, onCont: () => void){
		this.huntSkipHandler = onSkip;
		this.huntContinueHandler = onCont;
	}

	//For egg collection minigame:

	setEggMenuOptionHandlers(onSkip: () => void, onCont: () => void){
		this.eggSkipHandler = onSkip;
		this.eggContinueHandler = onCont;
	}

	showMenuOverlay(): void {
		this.menuOverlay.moveToTop();
		this.menuOverlay.visible(true);
		this.group.getLayer()?.draw();
	}

	hideMenuOverlay(): void {
		this.menuOverlay.visible(false);
		this.group.getLayer()?.draw();
	}

	//Hide and Show hunt menu:

	showHuntMenuOverlay(): void {
		this.huntMenuOverlay.moveToTop();
		this.huntMenuOverlay.visible(true);
		this.group.getLayer()?.draw();
	}

	hideHuntMenuOverlay(): void {
		this.huntMenuOverlay.visible(false);
		this.group.getLayer()?.draw();
	}

	//Hide and Show egg menu:

	showEggMenuOverlay(): void {
		this.eggMenuOverlay.moveToTop();
		this.eggMenuOverlay.visible(true);
		this.group.getLayer()?.draw();
	}

	hideEggMenuOverlay(): void {
		this.eggMenuOverlay.visible(false);
		this.group.getLayer()?.draw();
	}

	showReplantOverlay(title: string, message: string): void {
		this.replantOverlayTitle.text(title);
		this.replantOverlayMessage.text(message);
		this.replantOverlay.moveToTop();
		this.replantOverlay.visible(true);
		this.group.getLayer()?.draw();
	}

	hideReplantOverlay(): void {
		this.replantOverlay.visible(false);
		this.group.getLayer()?.draw();
	}

	deployMineAtMouse(): { node: Konva.Image; size: number } | null {
		return this.deployMineAt(this.mouseX, this.mouseY);
	}

	deployMineAt(centerX: number, centerY: number): { node: Konva.Image; size: number } | null {
		const mine = new Konva.Image({
			x: centerX - MINE_SIZE / 2,
			y: centerY - MINE_SIZE / 2,
			width: MINE_SIZE,
			height: MINE_SIZE,
			image: mineImage,
			listening: false,
		});
		this.minesLayer.add(mine);
		this.mines.push(mine);
		this.group.getLayer()?.draw();
		return { node: mine, size: MINE_SIZE };
	}

	removeMineSprite(node: Konva.Image): void {
		const idx = this.mines.indexOf(node);
		if (idx >= 0) {
			this.mines.splice(idx, 1);
		}
		node.destroy();
		this.group.getLayer()?.draw();
	}

	clearMines(): void {
		this.mines.forEach((mine) => mine.destroy());
		this.mines = [];
		this.minesLayer.destroyChildren();
		this.group.getLayer()?.draw();
	}

	/**
	 * Update timer display
	 */
	updateTimer(timeRemaining: number): void {
		this.timerText.text(`Time: ${timeRemaining}`);
		this.group.getLayer()?.draw();
	}

	/**
	 * Update round display (now shows day)
	 */
	updateRound(day: number): void {
		this.roundText.text(`Day: ${day}`);
		this.group.getLayer()?.draw();
	}

	setDefensePlaceClickHandler(handler: (x: number, y: number) => void): void {
		this.onDefensePlaceClick = handler;
	}

	setPlanningPhaseMode(enabled: boolean): void {
		// Enable/disable defense placement clicks
		this.defensesLayer.listening(enabled);
	}

	setStartRoundButtonEnabled(enabled: boolean): void {
		this.startRoundButtonEnabled = enabled;
		this.startRoundGroup.listening(true);
		this.startRoundGroup.opacity(enabled ? 1 : 0.35);
		this.startDayBackground.fill(enabled ? "green" : "#5f6a6a");
		this.startDayBackground.listening(true);
		this.startDayButton.listening(true);
		this.group.getLayer()?.draw();
	}

	setStartRoundTooltip(message: string): void {
		this.startRoundTooltipMessage = message;
	}

	private attachHudTooltip(target: Konva.Group, message: string): void {
		target.on("mouseenter", () => this.showHudTooltip(target, message));
		target.on("mouseleave", () => this.hideHudTooltip());
	}

	private showHudTooltip(target: Konva.Group, message: string): void {
		const bounds = target.getClientRect({ relativeTo: this.hudGroup });
		this.hudTooltipText.text(message);
		this.hudTooltipBackground.width(this.hudTooltipText.width());
		this.hudTooltipBackground.height(this.hudTooltipText.height());

		const tooltipX = Math.max(8, Math.min(bounds.x + bounds.width / 2 - this.hudTooltipBackground.width() / 2, STAGE_WIDTH - this.hudTooltipBackground.width() - 8));
		const tooltipY = Math.max(8, bounds.y + bounds.height + 8);

		this.hudTooltipGroup.position({ x: tooltipX, y: tooltipY });
		this.hudTooltipGroup.visible(true);
		this.hudTooltipGroup.moveToTop();
		this.hudGroup.getLayer()?.draw();
	}

	private hideHudTooltip(): void {
		if (!this.hudTooltipGroup.visible()) {
			return;
		}
		this.hudTooltipGroup.visible(false);
		this.hudGroup.getLayer()?.draw();
	}

	addDefense(defenseGroup: Konva.Group): void {
		this.defensesLayer.add(defenseGroup);
		this.group.getLayer()?.draw();
	}

	clearDefenses(): void {
		this.defensesLayer.destroyChildren();
		this.group.getLayer()?.draw();
	}

	getDefensesLayer(): Konva.Group {
		return this.defensesLayer;
	}

	/**
	 * Show the screen
	 */
	show(): void {
		this.group.visible(true);
		this.group.getLayer()?.draw();
	}

	setPlacementHint(text?: string): void {
		this.mineInstructionText.text(text ?? this.placementHintDefault);
		this.group.getLayer()?.draw();
	}

	setPlacementCursor(enabled: boolean): void {
		const stage = this.group.getStage();
		if (stage) {
			stage.container().style.cursor = enabled ? "pointer" : "default";
		}
	}

	getMousePosition(): { x: number; y: number } | null {
		const stage = this.group.getStage();
		if (!stage) {
			return null;
		}
		const pointer = stage.getPointerPosition();
		if (!pointer) {
			return null;
		}
		return { x: pointer.x, y: pointer.y };
	}

	/**
	 * Hide the screen
	 */
	hide(): void {
		this.group.visible(false);
		this.group.getLayer()?.draw();
	}

	getGroup(): Konva.Group {
		return this.group;
	}
}
