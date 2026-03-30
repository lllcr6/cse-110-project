import Konva from "konva";
import type { Image as KonvaImage } from "konva/lib/shapes/Image";
import type { Rect as KonvaRect } from "konva/lib/shapes/Rect";
import { DefenseController } from "../../components/DefenseComponent/DefenseController.ts";
import type { DefenseType } from "../../components/DefenseComponent/DefenseModel.ts";
import { FarmEmuController } from "../../components/FarmEmuComponent/FarmEmuController.ts";
import type { FarmPlanterController } from "../../components/FarmPlanterComponent/FarmPlanterController.ts";
import { CROP_HARVEST_REWARD, GAME_DURATION, GameItem } from "../../constants.ts";
import { GameStatusController } from "../../controllers/GameStatusController.ts";
import { AudioManager } from "../../services/AudioManager.ts";
import type { ScreenSwitcher } from "../../types.ts";
import { ScreenController } from "../../types.ts";
import type { MorningEventsScreenController } from "../MorningEventsScreen/MorningEventsScreenController.ts";
import { PlanningPhaseController } from "../PlanningPhaseScreen/PlanningPhaseController.ts";
import { FarmScreenModel } from "./FarmScreenModel.ts";
import { FarmScreenView } from "./FarmScreenView.ts";

// Helper: Map DefenseType to GameItem
function defenseTypeToGameItem(type: DefenseType): GameItem {
	const mapping: Record<DefenseType, GameItem> = {
		'barbed_wire': GameItem.BarbedWire,
		'sandbag': GameItem.Sandbag,
		'machine_gun': GameItem.MachineGun,
		'mine': GameItem.Mine,
	};
	return mapping[type];
}

type MinigamePrompt = "hunt" | "egg";

/**
 * GameScreenController - Coordinates game logic between Model and View
 */
export class FarmScreenController extends ScreenController {
	private model: FarmScreenModel;
	private view: FarmScreenView;
	private gameTimer: number | null = null;
	private lastTickTime: number = 0;
	private timeRemaining: number = GAME_DURATION;
	private isMenuPaused: boolean = false;

	private status: GameStatusController;
	private audio: AudioManager;
	private emus: FarmEmuController[] = [];
	private emuTargets = new Map<FarmEmuController, FarmPlanterController | null>;
	private numStillStanding: number = 0;
	private planters: FarmPlanterController[] = [];
	private morning: MorningEventsScreenController | null = null;
	private planningPhase: PlanningPhaseController | null = null;
	private screenSwitcher: ScreenSwitcher;
	private defenses: DefenseController[] = [];
	private isGameOver: boolean = false;
	private isWaitingForMinigameChoice: boolean = false;
	private pendingMinigame: MinigamePrompt | null = null;
	private selectedDefenseType: DefenseType | null = null;
	private readonly hudHintDefault = "Click emus to attack.";
	private readonly replantHint = "Plant at least one crop to continue the round.";

	private activeMines: ActiveMine[] = [];
	private gunCooldowns = new Map<DefenseController, number>();
	private skipNextGrowthAdvance: boolean = false;
	private isWaitingForReplant: boolean = false;

	// private squeezeSound: HTMLAudioElement;

	constructor(_screenSwitcher: ScreenSwitcher, status: GameStatusController, audio: AudioManager) {
		super();
		this.status = status;
		this.audio = audio;
		this.screenSwitcher = _screenSwitcher;

		this.model = new FarmScreenModel(this.status);
		this.view = new FarmScreenView(
			(event: KeyboardEvent) => this.handleKeydown(event),
			() => this.handleEndGame(),
			(emu: FarmEmuController) => this.registerEmu(emu),
			() => this.removeEmus(),
			(planter: FarmPlanterController) => this.registerPlanter(planter),
		);
		this.view.setMenuButtonHandler(() => this.handleMenuButton());
		this.view.setMenuOptionHandlers(
			() => this.handleMenuSaveAndExit(),
			() => this.handleMenuResume(),
		);
		this.view.setStartRoundHandler(() => this.handleRoundActionButton());

		// Initialize planning phase
		this.planningPhase = new PlanningPhaseController();
		this.planningPhase.setOnPlaceDefenses(() => this.handlePlaceDefenses());
		this.planningPhase.setOnDefenseSelected((type) => {
			this.handleDefenseSelection(type);
		});

		// Set up defense placement click handler
		this.view.setDefensePlaceClickHandler((x, y) => this.handleDefensePlaceClick(x, y));
		//For the hunting menu:
		this.view.setHuntMenuOptionHandlers(
			() => this.handleSkipHunt(),
			() => this.handleHuntCont()
		)

		//For the egg menu:
		this.view.setEggMenuOptionHandlers(
			() => this.handleSkipEgg(),
			() => this.handleEggCont()
		)

		requestAnimationFrame(this.gameLoop);
	}

	setMorningController(controller: MorningEventsScreenController): void {
		this.morning = controller;
	}

	private gameLoop = (timestamp: number): void => {
		if (this.isGameOver) {
			return;
		}

		if (this.isMenuPaused) {
			this.lastTickTime = timestamp;
			requestAnimationFrame(this.gameLoop);
			return;
		}

		const deltaTime: number = (timestamp - this.lastTickTime) * 0.001;
		this.lastTickTime = timestamp;

		if (this.isWaitingForReplant) {
			this.updateRoundActionButtonState();
			requestAnimationFrame(this.gameLoop);
			return;
		}

		this.checkMineCollisions();
		this.checkEmuCropCollisions(deltaTime);
		this.checkDefenseEmuInteractions(deltaTime);
		this.checkForCropLoss();
		this.assignTargetsToAllEmus();
		this.updateRoundActionButtonState();

		if (this.lastTickTime == null){
			this.lastTickTime = timestamp;
		}

		// Request the next frame
		requestAnimationFrame(this.gameLoop);
	}

	private ensureGameLoopRunning(): void {
		if (!this.isGameOver) {
			requestAnimationFrame(this.gameLoop);
		}
	}

	/**
	 * Start the game
	 */
	startGame(newgame: boolean, returnFromMinigame: boolean = false): void {	
		const wasGameOver = this.isGameOver;
		this.isGameOver = false;
		if (wasGameOver) {
			this.ensureGameLoopRunning();
		}
		if (newgame) {	
			// Reset model state
			this.status.reset();
			this.model.reset();
			this.timeRemaining = GAME_DURATION;
			this.defenses = [];
			this.gunCooldowns.clear();
			this.view.clearDefenses();
			this.view.clearEmus();
			this.selectedDefenseType = null;
			this.isWaitingForMinigameChoice = false;
			this.pendingMinigame = null;
			this.skipNextGrowthAdvance = true;
			this.isWaitingForReplant = false;

			// Reset all planters to empty state
			this.planters.forEach((planter) => {
				// Reset planter to empty if it has a crop
				if (!planter.isEmpty()) {
					planter.destroyCrop();
				}
			});
			this.planters.forEach((planter) => {
				planter.plantForNewGame();
			});
		}
		// Update view
		this.view.updateScore(this.status.getFinalScore());
		this.view.hideMenuOverlay();
		this.resetMines();
		this.view.updateTimer(this.timeRemaining);
		this.updateCropDisplay();
		this.view.show();
		this.showDefenseTray();

		if (returnFromMinigame) {
			this.view.hideMenuOverlay();
			this.view.hideReplantOverlay();
			this.planningPhase?.hideMinigamePrompt();
			this.pendingMinigame = null;
			this.isWaitingForMinigameChoice = false;
			this.syncHudForUpcomingRound();
			this.activateRound();
			return;
		}

		// Show morning screen first, then planning phase
		this.handleOpenMarket(() => this.prepareFirstRound());
	}

	private prepareFirstRound(): void {
		// After morning screen closes, prepare for round 1
		if (this.skipNextGrowthAdvance) {
			this.skipNextGrowthAdvance = false;
		} else {
			this.planters.forEach((planter) => planter.advanceDay());
		}
		this.model.updateSpawn();
		this.resetMines();
		this.updateCropDisplay();
		this.showDefenseTray();
		this.activateRound();
	}

	private handlePlaceDefenses(): void {
		this.showDefenseTray();
	}

	private handleDefensePlaceClick(x: number, y: number): void {
		if (!this.selectedDefenseType) {
			return;
		}
		if (this.placeDefenseAt(this.selectedDefenseType, x - 15, y - 15)) {
			this.onDefensePlaced();
		}
	}

	private handleDefenseSelection(type: DefenseType | null): void {
		if (type && this.status.getItemCount(defenseTypeToGameItem(type)) <= 0) {
			this.planningPhase?.clearSelection();
			this.view.setPlacementHint(`No ${this.formatDefenseName(type)} remaining. Buy more in the shop.`);
			this.view.setPlacementCursor(false);
			this.selectedDefenseType = null;
			return;
		}

		this.selectedDefenseType = type;
		this.view.setPlacementCursor(Boolean(type));
		this.view.setPlacementHint(type ? `${this.formatDefenseName(type)} selected.` : this.hudHintDefault);
	}

	private attemptDefensePlacementAtCursor(): void {
		if (!this.selectedDefenseType) {
			return;
		}
		const pointer = this.view.getMousePosition();
		if (!pointer) {
			return;
		}
		if (this.placeDefenseAt(this.selectedDefenseType, pointer.x - 15, pointer.y - 15)) {
			this.onDefensePlaced();
		}
	}

	private cancelDefensePlacement(): void {
		if (!this.selectedDefenseType) {
			return;
		}
		this.selectedDefenseType = null;
		this.view.setPlacementCursor(false);
		this.view.setPlacementHint(this.hudHintDefault);
		this.planningPhase?.clearSelection();
	}

	private placeDefenseAt(type: DefenseType, x: number, y: number): boolean {
		if (type === "mine") {
			return this.placeMineAt(x + 15, y + 15);
		}
		const item = defenseTypeToGameItem(type);
		if (this.status.getItemCount(item) <= 0) {
			return false;
		}
		const defenseLevel = this.status.getDefenseLevel(type);

		const defense = new DefenseController(
			this.view.getDefensesLayer(),
			type,
			x,
			y,
			defenseLevel
		);

		if (this.status.removeFromInventory(item, 1)) {
			this.defenses.push(defense);
			this.view.addDefense(defense.getView());
			this.updatePlanningInventoryDisplay();
			return true;
		}

		defense.remove();
		return false;
	}

	private onDefensePlaced(): void {
		if (!this.selectedDefenseType) {
			this.view.setPlacementCursor(false);
			this.view.setPlacementHint(this.hudHintDefault);
			return;
		}

		const item = defenseTypeToGameItem(this.selectedDefenseType);
		if (this.status.getItemCount(item) <= 0) {
			this.selectedDefenseType = null;
			this.view.setPlacementCursor(false);
			this.planningPhase?.clearSelection();
			this.view.setPlacementHint("No more defenses of this type. Select another defense.");
			return;
		}

		this.view.setPlacementHint(`${this.formatDefenseName(this.selectedDefenseType)} selected.`);
	}

	private updatePlanningInventoryDisplay(): void {
		if (!this.planningPhase) {
			return;
		}
		const defenseInventory: Record<string, number> = {
			barbed_wire: this.status.getItemCount(GameItem.BarbedWire),
			sandbag: this.status.getItemCount(GameItem.Sandbag),
			machine_gun: this.status.getItemCount(GameItem.MachineGun),
			mine: this.status.getItemCount(GameItem.Mine),
		};
		this.planningPhase.setDefenseInventory(defenseInventory);
	}

	private showDefenseTray(): void {
		this.selectedDefenseType = null;
		this.view.setPlanningPhaseMode(true);
		this.view.setPlacementCursor(false);
		this.view.setPlacementHint(this.hudHintDefault);
		this.planningPhase?.setPlacementMode(true);
		if (this.planningPhase) {
			this.planningPhase.clearSelection();
			this.planningPhase.show();
			this.updatePlanningInventoryDisplay();
		}
		this.updateRoundActionButtonState();
	}

	showPlanningPhase(): void {
		this.stopTimer();
		this.refreshDefenseUpgradeLevels();
		this.showDefenseTray();
		this.syncHudForUpcomingRound();
	}

	private activateRound(): void {
		const wasGameOver = this.isGameOver;
		this.isGameOver = false;
		if (wasGameOver) {
			this.ensureGameLoopRunning();
		}

		this.isWaitingForReplant = false;
		this.isWaitingForMinigameChoice = false;
		this.pendingMinigame = null;
		this.selectedDefenseType = null;
		this.view.setPlacementCursor(false);
		this.view.setPlacementHint(this.hudHintDefault);
		this.view.hideReplantOverlay();
		this.view.hideMenuOverlay();
		this.view.hideHuntMenuOverlay();
		this.view.hideEggMenuOverlay();
		this.planningPhase?.clearSelection();
		this.view.updateScore(this.status.getFinalScore());
		this.updateCropDisplay();
		this.timeRemaining = GAME_DURATION;
		this.view.updateTimer(this.timeRemaining);
		this.view.updateRound(this.status.getDay());
		this.view.show();

		this.spawnEmusForCurrentRound();
		this.startTimer();
		this.updateRoundActionButtonState();
	}

	/**
	 * Start the round
	 */
	startRound(): void {
		this.activateRound();
	}

	private handleRoundActionButton(): void {
		if (this.hasActiveRound() && this.getActiveEmuCount() === 0) {
			this.endRound();
		}
	}

	/**
	 * Handle player movement
	 */
	private handleKeydown(event: KeyboardEvent): void {
		const key = event.key;
		switch (key) {
			case "p": this.attemptDefensePlacementAtCursor(); break;
			case "Escape": this.cancelDefensePlacement(); break;
        }
        event.preventDefault();
    }

	private handleEndGame(): void {
		// End game button - reuse the same cleanup path as a natural game over
		this.endGame();
	}

	/**
	 * Start the countdown timer
	 */
	private startTimer(): void {
		this.stopTimer();
		const timerId = setInterval(() => {
			if (this.timeRemaining <= 0) {
				this.endRound();
				return;
			}
			this.timeRemaining = Math.max(0, this.timeRemaining - 1);
			this.view.updateTimer(this.timeRemaining);
			if (this.timeRemaining <= 0) {
				this.endRound();
			}
		}, 1000) as unknown as number;
		this.gameTimer = timerId;
	}

	/**
	 * Stop the timer
	 */
	private stopTimer(): void {
		if (!this.gameTimer) {
			return;
		}
		clearInterval(this.gameTimer);
		this.gameTimer = null;
	}

	/**
	 * End the game
	 */
	private endRound(): void {
        this.stopTimer();
		this.isWaitingForReplant = false;
		this.isWaitingForMinigameChoice = false;
		this.pendingMinigame = null;
		this.setEmusPaused(false);
		this.view.hideReplantOverlay();
        this.view.clearEmus();
        this.status.endDay();
		this.status.incrementScore(10);
		this.view.updateScore(this.status.getFinalScore());
        const newDay = this.status.getDay();
        this.morning?.setDisplayDayOverride(newDay);
		this.updateRoundActionButtonState();
        this.handleOpenMarket(() => this.prepareNextRound());
    }

    private prepareNextRound(): void {
		this.planters.forEach((planter) => planter.advanceDay());
		this.model.updateSpawn();
		this.resetMines();
		this.updateCropDisplay();
		this.refreshDefenseUpgradeLevels();
		this.showDefenseTray();
		this.syncHudForUpcomingRound();

		const prompt = this.getMinigamePrompt(this.status.getDay());
		if (prompt) {
			this.presentMinigameChoice(prompt);
			return;
		}

		this.activateRound();
    }

	private registerEmu(emu: FarmEmuController): void {
		const originalRemove = emu.remove.bind(emu);
		emu.remove = () => {
			const wasActive = emu.isActive();
			originalRemove();
			if (wasActive) {
				this.handleEmuDefeated(emu);
			}
		};
		this.emus.push(emu);
		this.emuTargets.set(emu, null);
	}

	private handleEmuDefeated(emu: FarmEmuController): void {
		this.emuTargets.delete(emu);
		this.emus = this.emus.filter((candidate) => candidate !== emu);
		this.updateRoundActionButtonState();
	}

	private removeEmus(): void {
		while(this.emus.length > 0){
			const emu = this.emus.pop();
			if (emu){
				emu.remove();
			}
		}
		this.emuTargets.clear();
	}

	private registerPlanter(planter: FarmPlanterController): void {
		this.planters.push(planter);
		planter.setStatus(this.status);
		planter.setOnHarvest(() => {
			this.status.addToInventory(GameItem.Crop, CROP_HARVEST_REWARD);
			this.status.incrementScore(50);
			this.view.updateScore(this.status.getFinalScore());
			this.audio.playSfx("harvest");
			this.updateCropDisplay();
			this.clearTargetsForPlanter(planter);
			if (this.hasActiveRound() && !this.getPlantersWithCrop().length) {
				this.pauseRoundForReplant();
				return;
			}
			this.assignTargetsToAllEmus();
		});
		planter.setOnPlant(() => {
			this.updateCropDisplay();
			if (this.isWaitingForReplant && this.getPlantersWithCrop().length) {
				this.resumeRoundAfterReplant();
				return;
			}
			this.assignTargetsToAllEmus();
		});
	}

	//For Emu crop interactions:

	private getPlantersWithCrop(): FarmPlanterController[] {
		return this.planters.filter(p => !p.isEmpty());
	}

	private getActiveEmuCount(): number {
		return this.emus.filter((emu) => emu.isActive()).length;
	}

	private hasActiveRound(): boolean {
		return this.gameTimer !== null && !this.isWaitingForReplant;
	}

	private checkForCropLoss(): void {
		if (!this.hasActiveRound() || this.isWaitingForReplant) {
			return;
		}

		if (!this.getPlantersWithCrop().length) {
			this.endGame();
		}
	}

	private assignTargetToEmu(emu: FarmEmuController): void {
		const candidates = this.getPlantersWithCrop();
		if (!candidates.length) {
			emu.clearTarget();
			this.emuTargets.set(emu, null);
			return;
		}

		const planter = candidates[Math.floor(Math.random() * candidates.length)];
		const target = planter.getView();
		if (target) {
			emu.setTarget(target);
			this.emuTargets.set(emu, planter);
		}
	}

	private assignTargetsToAllEmus(): void {
		const candidates = this.getPlantersWithCrop();
		if (!candidates.length) {
			for (const emu of this.emus){
				emu.clearTarget();
				this.emuTargets.set(emu, null);
			}
			return;
		}

		for (const emu of this.emus) {
			const currentTarget = this.emuTargets.get(emu);
			if (currentTarget && currentTarget.isEmpty()) {
				emu.clearTarget();
				this.emuTargets.set(emu, null);
			}

			if (emu.hasTarget()) {
				continue;
			}

			const planter = candidates[Math.floor(Math.random() * candidates.length)];
			const target = planter.getView();
			if (target) {
				emu.setTarget(target);
				this.emuTargets.set(emu, planter);
			}
		}
	}

	private clearTargetsForPlanter(planter: FarmPlanterController): void {
		for (const emu of this.emus) {
			if (this.emuTargets.get(emu) !== planter) {
				continue;
			}
			emu.clearTarget();
			this.emuTargets.set(emu, null);
		}
	}

	private checkEmuCropCollisions(deltaTime: number): void {
		if (!this.emus.length || !this.planters.length) {
			return;
		}

		for (const emu of this.emus) {
			if (!emu.isActive()) {
				continue;
			}

			const emuShape = emu.getView();
			if (!emuShape) {
				continue;
			}

			const emuX = emuShape.x();
			const emuY = emuShape.y();
			const emuWidth = emuShape.width();
			const emuHeight = emuShape.height();

			for (const planter of this.planters) {
				if (planter.isEmpty()) {
					continue;
				}

				const planterRect = planter.getView();
				if (!planterRect) {
					continue;
				}

				const planterX = planterRect.x();
				const planterY = planterRect.y();
				const planterWidth = planterRect.width();
				const planterHeight = planterRect.height();

				const isColliding =
					emuX < planterX + planterWidth &&
					emuX + emuWidth > planterX &&
					emuY < planterY + planterHeight &&
					emuY + emuHeight > planterY;

				if (!isColliding) {
					continue;
				}

				//Emu is “attacking” this crop
				const dps = emu.getDamage();
				const damageThisFrame = dps * deltaTime;

				const cropDied = planter.takeDamage(damageThisFrame);

				if (cropDied) {
					this.audio.playSfx("harvest");
					this.updateCropDisplay();
					this.numStillStanding--;
					this.clearTargetsForPlanter(planter);
					if (!this.getPlantersWithCrop().length) {
						this.endGame();
						return;
					}
					//Retarget all emus targeted on this crop to the next non-destroyed crop
					for (const otherEmu of this.emus){
						const target = this.emuTargets.get(otherEmu);
						if (target === planter){
							this.assignTargetToEmu(otherEmu);
						}
					}
				}

				break;
			}
		}
	}


	private handleMenuButton(): void {
		this.isMenuPaused = true;
		this.stopTimer();
		this.setEmusPaused(true);
		this.view.showMenuOverlay();
	}

	//Handling options in the hunt menu:
	private handleHuntCont(): void {
		this.status.save();
		this.pendingMinigame = null;
		this.isWaitingForMinigameChoice = false;
		this.planningPhase?.hideMinigamePrompt();
		this.screenSwitcher.switchToScreen({ type: "minigame2_intro" });
	}

	//Handling options in the egg menu:
	private handleEggCont(): void {
		this.status.save();
		this.pendingMinigame = null;
		this.isWaitingForMinigameChoice = false;
		this.planningPhase?.hideMinigamePrompt();
		this.screenSwitcher.switchToScreen({ type: "minigame1_raid" });
	}

	//Skip for both hunt and egg games are the same:
	private handleSkipHunt(): void {
		this.planningPhase?.hideMinigamePrompt();
		this.pendingMinigame = null;
		this.isWaitingForMinigameChoice = false;
		this.activateRound();
	}

	private handleSkipEgg(): void {
		this.planningPhase?.hideMinigamePrompt();
		this.pendingMinigame = null;
		this.isWaitingForMinigameChoice = false;
		this.activateRound();
	}

	private handleMenuSaveAndExit(): void {
        this.status.save();
		this.hidePlanningUi();
		this.screenSwitcher.switchToScreen({ type: "main_menu" });
	}

	private handleMenuResume(): void {
		this.view.hideMenuOverlay();
		this.isMenuPaused = false;
		if (this.isWaitingForReplant) {
			this.view.setPlacementHint(this.replantHint);
			return;
		}
		if (this.isWaitingForMinigameChoice) {
			return;
		}
		this.setEmusPaused(false);
		if (this.timeRemaining <= 0) {
			this.endRound();
			return;
		}
		this.view.updateTimer(this.timeRemaining);
		this.startTimer();
	}

	private handleOpenMarket(onClose?: () => void): void {
		if (!this.morning) {
			this.handleCloseMarket(onClose);
			return;
		}
		this.audio.playBgm("morning");
		this.morning.showOverlay(() => this.handleCloseMarket(onClose));
	}

	private handleCloseMarket(onClosed?: () => void): void {
		this.audio.playBgm("farm");
		this.updateCropDisplay();
		onClosed?.();
	}

	private spawnEmusForCurrentRound(): void {
		this.view.clearEmus();
		this.view.spawnEmus(this.model.getSpawn());
		if (!this.planters.length) {
			return;
		}
		this.assignTargetsToAllEmus();
	}

	private getMinigamePrompt(day: number): MinigamePrompt | null {
		if (day % 4 === 1 || day % 3 === 2) {
			return "hunt";
		}
		if (day % 3 === 1) {
			return "egg";
		}
		return null;
	}

	private presentMinigameChoice(prompt: MinigamePrompt): void {
		this.stopTimer();
		this.isWaitingForMinigameChoice = true;
		this.pendingMinigame = prompt;
		this.view.setPlacementCursor(false);
		if (prompt === "hunt") {
			this.planningPhase?.showMinigamePrompt(
				"Hunt Opportunity",
				"Track the emus for bonus rewards before the farm raid begins.\nChoose whether to play the minigame or skip it and start the round immediately.",
				"Continue",
				"Skip Minigame",
				() => this.handleHuntCont(),
				() => this.handleSkipHunt(),
			);
			return;
		}
		this.planningPhase?.showMinigamePrompt(
			"Egg Raid Opportunity",
			"Sneak into emu territory and collect eggs before returning to defend the farm.\nChoose whether to play the minigame or skip it and start the round immediately.",
			"Continue",
			"Skip Minigame",
			() => this.handleEggCont(),
			() => this.handleSkipEgg(),
		);
	}


    private updateCropDisplay(): void {
        this.view.updateCropCount(this.status.getItemCount(GameItem.Crop));
        this.view.updateMineCount(this.status.getItemCount(GameItem.Mine));
    }

	private checkMineCollisions(): void {
		if (!this.activeMines.length || !this.emus.length) {
			return;
		}

		const survivingEmus: FarmEmuController[] = [];
		const triggeredMines = new Set<ActiveMine>();

		for (const emu of this.emus) {
			const emuShape = emu.getView();
			if (!emuShape) {
				continue;
			}

			const mine = this.findCollidingMine(emuShape);
			if (mine) {
				triggeredMines.add(mine);
				emu.remove();
			} else {
				survivingEmus.push(emu);
			}
		}

		if (!triggeredMines.size) {
			return;
		}

		this.emus = survivingEmus;
		const remainingMines: ActiveMine[] = [];
		for (const mine of this.activeMines) {
			if (triggeredMines.has(mine)) {
				this.view.removeMineSprite(mine.node);
			} else {
				remainingMines.push(mine);
			}
		}

		this.activeMines = remainingMines;
	}

	private findCollidingMine(emuShape: KonvaRect | KonvaImage): ActiveMine | null {
		for (const mine of this.activeMines) {
			if (this.rectsOverlap(emuShape, mine)) {
				return mine;
			}
		}
		return null;
	}

	private rectsOverlap(emuShape: KonvaRect | KonvaImage, mine: ActiveMine): boolean {
		const mineX = mine.node.x();
		const mineY = mine.node.y();
		const mineSize = mine.size;
		const emuX = emuShape.x();
		const emuY = emuShape.y();
		const emuWidth = emuShape.width();
		const emuHeight = emuShape.height();

		return !(
			emuX + emuWidth < mineX ||
			emuX > mineX + mineSize ||
			emuY + emuHeight < mineY ||
			emuY > mineY + mineSize
		);
	}


	private checkDefenseEmuInteractions(deltaTime: number): void {
		if (!this.defenses.length || !this.emus.length || this.isWaitingForReplant || this.isWaitingForMinigameChoice) {
			return;
		}

		for (const emu of this.emus) {
			emu.setSpeedModifier(1.0);
			emu.setBlocked(false);
		}

		const activeDefenses: DefenseController[] = [];
		const emusToRemove: FarmEmuController[] = [];

		for (const defense of this.defenses) {
			if (!defense.isActive()) continue;
			activeDefenses.push(defense);

			const defenseView = defense.getView();
			if (!defenseView) continue;

			const defenseX = defenseView.x();
			const defenseY = defenseView.y();
			const defenseSize = 30;
			const defenseType = defense.getType();

			if (defenseType === "machine_gun") {
				const defenseCenterX = defenseX + defenseSize / 2;
				const defenseCenterY = defenseY + defenseSize / 2;
				const machineGunRange = 220;
				const lastShot = this.gunCooldowns.get(defense) || 0;
				if (lastShot <= 0) {
					let closestEmu: FarmEmuController | null = null;
					let closestDist = machineGunRange;

					for (const emu of this.emus) {
						const emuShape = emu.getView();
						if (!emuShape) continue;

						const emuCenterX = emuShape.x() + emuShape.width() / 2;
						const emuCenterY = emuShape.y() + emuShape.height() / 2;
						const dx = emuCenterX - defenseCenterX;
						const dy = emuCenterY - defenseCenterY;
						const dist = Math.sqrt(dx * dx + dy * dy);

						if (dist < closestDist) {
							closestEmu = emu;
							closestDist = dist;
						}
					}

					if (closestEmu && closestDist <= machineGunRange) {
						const emuShape = closestEmu.getView();
						if (emuShape) {
							defense.showAttackEffect(
								emuShape.x() + emuShape.width() / 2,
								emuShape.y() + emuShape.height() / 2
							);
							closestEmu.reduceHealth(40);
						}
						defense.takeDamage(1);
						this.gunCooldowns.set(defense, 0.5);
						if (!defense.isActive()) {
							defense.remove();
							this.gunCooldowns.delete(defense);
						}
					}
				} else {
					this.gunCooldowns.set(defense, Math.max(0, lastShot - deltaTime));
				}
				continue;
			}

			for (const emu of this.emus) {
				const emuShape = emu.getView();
				if (!emuShape) continue;

				const emuX = emuShape.x();
				const emuY = emuShape.y();
				const emuW = emuShape.width();
				const emuH = emuShape.height();

				if (emuX < defenseX + defenseSize && emuX + emuW > defenseX &&
					emuY < defenseY + defenseSize && emuY + emuH > defenseY) {
					
					if (defenseType === "barbed_wire") {
						emu.setSpeedModifier(0.3);
						defense.takeDamage(0.35 * deltaTime);
						if (!defense.isActive()) {
							defense.remove();
						}
					} else if (defenseType === "sandbag") {
						emu.setBlocked(true);
						defense.takeDamage(1 * deltaTime);
						if (!defense.isActive()) {
							defense.remove();
							emu.setBlocked(false);
						}
					}
				}
			}
		}

		for (const emu of emusToRemove) {
			const idx = this.emus.indexOf(emu);
			if (idx > -1) {
				this.emus.splice(idx, 1);
			}
		}

		this.defenses = activeDefenses.filter(d => d.isActive());
		for (const defense of Array.from(this.gunCooldowns.keys())) {
			if (!this.defenses.includes(defense)) {
				this.gunCooldowns.delete(defense);
			}
		}
	}

	private resetMines(): void {
		this.activeMines = [];
		this.view.clearMines();
	}

	private refreshDefenseUpgradeLevels(): void {
		for (const defense of this.defenses) {
			const type = defense.getType();
			if (type === "mine") {
				continue;
			}
			defense.applyUpgradeLevel(this.status.getDefenseLevel(type));
		}
	}

	private syncHudForUpcomingRound(): void {
		this.timeRemaining = GAME_DURATION;
		this.view.updateTimer(this.timeRemaining);
		this.view.updateRound(this.status.getDay());
	}

	private updateRoundActionButtonState(): void {
		if (this.isWaitingForReplant) {
			this.view.setStartRoundButtonEnabled(false);
			this.view.setStartRoundTooltip("Plant at least one crop before the round can continue");
			return;
		}

		if (this.isWaitingForMinigameChoice) {
			this.view.setStartRoundButtonEnabled(false);
			this.view.setStartRoundTooltip(
				this.pendingMinigame === "egg"
					? "Choose whether to skip or continue the egg minigame first"
					: "Choose whether to skip or continue the hunt minigame first",
			);
			return;
		}

		if (this.hasActiveRound() && this.getActiveEmuCount() === 0) {
			this.view.setStartRoundButtonEnabled(true);
			this.view.setStartRoundTooltip("All emus defeated. Click to skip to the next phase");
			return;
		}

		this.view.setStartRoundButtonEnabled(false);
		this.view.setStartRoundTooltip("Defeat all emus to skip the remaining timer");
	}

	private formatDefenseName(type: DefenseType): string {
		return type.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
	}

	/**
	 * Get final score
	 */
	getFinalScore(): number {
		return this.status.getFinalScore();
	}

	show(): void {
		super.show();
	}

	hide(): void {
		this.view.hideReplantOverlay();
		super.hide();
	}

	/**
	 * Get the view group
	 */
    getView(): FarmScreenView {
        return this.view;
    }

	/**
	 * Get the planning phase view group
	 */
	getPlanningPhaseView(): Konva.Group | null {
		return this.planningPhase?.getView().getGroup() || null;
	}

	getReplantOverlayView(): Konva.Group {
		return this.view.getReplantOverlayGroup();
	}

	handleDeployMine(): void {
		const pointer = this.view.getMousePosition();
		if (!pointer) {
			return;
		}
		this.placeMineAt(pointer.x, pointer.y);
	}

	private placeMineAt(centerX: number, centerY: number): boolean {
		if (this.status.getItemCount(GameItem.Mine) <= 0) {
			return false;
		}
		const placement = this.view.deployMineAt(centerX, centerY);
		if (!placement) {
			return false;
		}
		if (!this.status.removeFromInventory(GameItem.Mine, 1)) {
			this.view.removeMineSprite(placement.node);
			return false;
		}
		this.activeMines.push(placement);
		this.updateCropDisplay();
		return true;
	}

	/**
	 * End the game (called when player's crops are taken out)
	 * Should be called in game loop
	 */
	endGame(): void {
		if (this.isGameOver) {
			return;
		}
		this.isGameOver = true;
		this.isWaitingForReplant = false;
		this.isWaitingForMinigameChoice = false;
		this.pendingMinigame = null;
		this.stopTimer();
		this.view.hideReplantOverlay();
        this.view.clearEmus();
		this.hidePlanningUi();
		this.emuTargets.clear();
		this.updateRoundActionButtonState();
		this.screenSwitcher.switchToScreen({ 
			type: "game_over", 
			survivalDays: this.status.getDay(),
			score: this.getFinalScore() 
		});
	}

	private hidePlanningUi(): void {
		this.isWaitingForMinigameChoice = false;
		this.pendingMinigame = null;
		this.selectedDefenseType = null;
		this.view.setPlacementCursor(false);
		this.view.setPlacementHint();
		this.planningPhase?.setPlacementMode(false);
		this.planningPhase?.clearSelection();
		this.planningPhase?.hide();
	}

	private pauseRoundForReplant(): void {
		if (this.isWaitingForReplant) {
			return;
		}
		this.isWaitingForReplant = true;
		this.stopTimer();
		this.setEmusPaused(true);
		this.view.setPlacementHint(this.replantHint);
		this.view.showReplantOverlay("All crops harvested", "Plant at least one crop to continue the round.");
		this.updateRoundActionButtonState();
	}

	private resumeRoundAfterReplant(): void {
		if (!this.isWaitingForReplant) {
			return;
		}
		this.isWaitingForReplant = false;
		this.setEmusPaused(false);
		this.view.setPlacementHint();
		this.view.hideReplantOverlay();
		this.assignTargetsToAllEmus();
		this.startTimer();
		this.updateRoundActionButtonState();
	}

	private setEmusPaused(paused: boolean): void {
		for (const emu of this.emus) {
			emu.setBlocked(paused);
			if (paused) {
				emu.clearTarget();
				this.emuTargets.set(emu, null);
			}
		}
	}
}

type ActiveMine = {
	node: KonvaImage;
	size: number;
};
