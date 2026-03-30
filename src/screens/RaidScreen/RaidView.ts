import Konva from "konva";
import type { View } from "../../types";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants";
import { TILE_TYPE, MAZE_WIDTH, MAZE_HEIGHT } from "./RaidModel";
import {
	createMinigameBackdrop,
	createMinigameButton,
	createMinigameGlow,
	createMinigameKeycap,
	createMinigamePanel,
	createMinigameHudLabel,
	MINIGAME_UI_THEME,
} from "../minigameUi";

// Calculate the size of each tile to fit the stage
const TILE_WIDTH = STAGE_WIDTH / MAZE_WIDTH;
const RAID_HUD_HEIGHT = 88;
const TILE_HEIGHT = Math.floor((STAGE_HEIGHT - RAID_HUD_HEIGHT) / MAZE_HEIGHT);
const MAZE_PIXEL_HEIGHT = TILE_HEIGHT * MAZE_HEIGHT;
const MAZE_START_Y = RAID_HUD_HEIGHT;

export class RaidView implements View {
	private group: Konva.Group;
	private timerText: Konva.Text;
	private eggCountText: Konva.Text;
	private player: Konva.Rect;
	private mazeGroup: Konva.Group;
	private hudBanner: Konva.Rect;
	
	// Popups
	private popupGroup: Konva.Group;
	private popupText: Konva.Text;
	private popupBg: Konva.Rect;

	// Intro Screen
	private introGroup: Konva.Group;

	constructor(onIntroStartClick: () => void) {
		this.group = new Konva.Group({ visible: false });
		this.mazeGroup = new Konva.Group();
		this.group.add(this.mazeGroup);

		this.hudBanner = new Konva.Rect({
			x: 0,
			y: 0,
			width: STAGE_WIDTH,
			height: RAID_HUD_HEIGHT,
			fill: MINIGAME_UI_THEME.hudBg,
			stroke: MINIGAME_UI_THEME.hudBorder,
			strokeWidth: 1,
		});
		this.group.add(this.hudBanner);

		// Timer UI
		this.timerText = createMinigameHudLabel(STAGE_WIDTH - 150, 18, "Time: 30", 22, "right");
		this.group.add(this.timerText);

		// Egg Count UI
		this.eggCountText = createMinigameHudLabel(20, 18, "Eggs: 0", 22, "left");
		this.group.add(this.eggCountText);

		// Player
		this.player = new Konva.Rect({
			x: 0,
			y: 0,
			width: TILE_WIDTH * 0.7,
			height: TILE_HEIGHT * 0.7,
			fill: "#4169E1",
		});
		this.group.add(this.player);

		// --- End Game Popup Group ---
		this.popupGroup = new Konva.Group({
			x: STAGE_WIDTH / 2 - 200,
			y: STAGE_HEIGHT / 2 - 100,
			visible: false,
		});
		this.popupBg = new Konva.Rect({
			width: 400,
			height: 200,
			fillLinearGradientStartPoint: { x: 0, y: 0 },
			fillLinearGradientEndPoint: { x: 0, y: 200 },
			fillLinearGradientColorStops: [0, MINIGAME_UI_THEME.panelTop, 1, MINIGAME_UI_THEME.panelBottom],
			stroke: MINIGAME_UI_THEME.panelBorder,
			strokeWidth: 2,
			cornerRadius: 20,
			shadowColor: "black",
			shadowBlur: 16,
			shadowOpacity: 0.3,
		});
		this.popupText = new Konva.Text({
			width: 400,
			height: 200,
			text: "",
			fontSize: 24,
			fontFamily: "Georgia",
			fill: MINIGAME_UI_THEME.body,
			align: "center",
			verticalAlign: "middle",
			padding: 20,
		});
		this.popupGroup.add(this.popupBg);
		this.popupGroup.add(this.popupText);
		this.group.add(this.popupGroup);

		// --- Intro Screen Group ---
		this.introGroup = new Konva.Group({ visible: false });
		this.introGroup.add(createMinigameBackdrop());
		this.introGroup.add(createMinigameGlow());

		const [introShadow, introPanel] = createMinigamePanel(88, 68, 624, 564);
		this.introGroup.add(introShadow);
		this.introGroup.add(introPanel);

		const introTitle = new Konva.Text({
			x: STAGE_WIDTH / 2,
			y: 110,
			width: 420,
			text: "NIGHT RAID BRIEFING",
			fontSize: 32,
			fontFamily: "Georgia",
			fill: MINIGAME_UI_THEME.title,
			align: "center",
			fontStyle: "bold",
		});
		introTitle.offsetX(introTitle.width() / 2);
		this.introGroup.add(introTitle);

		const introDivider = new Konva.Line({
			points: [150, 182, STAGE_WIDTH - 150, 182],
			stroke: "rgba(108, 83, 48, 0.34)",
			strokeWidth: 2,
			listening: false,
		});
		this.introGroup.add(introDivider);

		const objective = new Konva.Text({
			x: 150,
			y: 204,
			text: "MISSION",
			fontSize: 14,
			fontFamily: "Arial",
			fill: MINIGAME_UI_THEME.accent,
			fontStyle: "bold",
			letterSpacing: 2,
		});
		this.introGroup.add(objective);

		const objectiveText = new Konva.Text({
			x: 150,
			y: 226,
			width: 500,
			text: "Break through walls, gather eggs, and escape through the red exit before the timer hits zero.",
			fontSize: 22,
			fontFamily: "Georgia",
			fill: MINIGAME_UI_THEME.body,
			lineHeight: 1.35,
		});
		this.introGroup.add(objectiveText);

		const controlsLabel = new Konva.Text({
			x: 150,
			y: 342,
			text: "CONTROLS",
			fontSize: 14,
			fontFamily: "Arial",
			fill: MINIGAME_UI_THEME.accent,
			fontStyle: "bold",
			letterSpacing: 2,
		});
		this.introGroup.add(controlsLabel);

		this.introGroup.add(createMinigameKeycap(150, 374, 250, "W A S D : MOVE"));
		this.introGroup.add(createMinigameKeycap(150, 420, 300, "SPACE : BREAK WALLS"));

		const startBtn = createMinigameButton(
			STAGE_WIDTH / 2 - 110,
			STAGE_HEIGHT - 104,
			220,
			60,
			"START RAID",
			onIntroStartClick,
		);
		this.introGroup.add(startBtn);
		this.group.add(this.introGroup);
	}

	drawMaze(layout: number[][]): void {
		this.mazeGroup.destroyChildren();
		for (let y = 0; y < layout.length; y++) {
			for (let x = 0; x < layout[y].length; x++) {
				const type = layout[y][x];
				let color = type === TILE_TYPE.WALL ? "#348C31" : "#8B4513";
				if (type === TILE_TYPE.START) color = "#90EE90";
				if (type === TILE_TYPE.EXIT) color = "#FF6347";
				
				this.mazeGroup.add(new Konva.Rect({
					x: x * TILE_WIDTH,
					y: MAZE_START_Y + y * TILE_HEIGHT,
					width: TILE_WIDTH,
					height: TILE_HEIGHT,
					fill: color,
				}));

				if (type === TILE_TYPE.EGG) {
					this.mazeGroup.add(new Konva.Ellipse({
						x: x * TILE_WIDTH + TILE_WIDTH / 2,
						y: MAZE_START_Y + y * TILE_HEIGHT + TILE_HEIGHT / 2,
						radiusX: TILE_WIDTH / 4,
						radiusY: TILE_HEIGHT / 3,
						fill: "#FFFACD",
					}));
				}
			}
		}
		// Night overlay
		this.mazeGroup.add(new Konva.Rect({
			width: STAGE_WIDTH,
			y: MAZE_START_Y,
			height: MAZE_PIXEL_HEIGHT,
			fill: "#191970",
			opacity: 0.3,
			listening: false
		}));
		this.mazeGroup.getLayer()?.draw();
	}

	updatePlayerPosition(x: number, y: number): void {
		this.player.x(x * TILE_WIDTH + (TILE_WIDTH - this.player.width()) / 2);
		this.player.y(MAZE_START_Y + y * TILE_HEIGHT + (TILE_HEIGHT - this.player.height()) / 2);
		this.group.getLayer()?.draw();
	}

	updateTimer(t: number): void {
		this.timerText.text(`Time: ${t}`);
		this.group.getLayer()?.draw();
	}

	updateEggCount(c: number): void {
		this.eggCountText.text(`Eggs: ${c}`);
		this.group.getLayer()?.draw();
	}

	showEndPopup(message: string): void {
		this.popupText.text(message);
		this.popupGroup.visible(true);
		this.popupGroup.moveToTop();
		this.group.getLayer()?.draw();
	}

	// --- Intro Screen Methods ---
	showIntro(): void {
		this.introGroup.visible(true);
		this.introGroup.moveToTop();
		this.group.getLayer()?.draw();
	}

	hideIntro(): void {
		this.introGroup.visible(false);
		this.group.getLayer()?.draw();
	}

	show(): void {
		this.group.visible(true);
		this.popupGroup.visible(false);
		this.group.moveToTop();
		this.group.getLayer()?.draw();
	}

	hide(): void {
		this.group.visible(false);
		this.group.getLayer()?.draw();
	}

	getGroup(): Konva.Group {
		return this.group;
	}
}
