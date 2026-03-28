import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenSwitcher } from "../src/types.ts";
import { GameStatusController } from "../src/controllers/GameStatusController.ts";
import type { AudioManager } from "../src/services/AudioManager.ts";
import type { FarmPlanterController } from "../src/components/FarmPlanterComponent/FarmPlanterController.ts";
import type { FarmEmuController } from "../src/components/FarmEmuComponent/FarmEmuController.ts";
import type { MorningEventsScreenController } from "../src/screens/MorningEventsScreen/MorningEventsScreenController.ts";

class FakeFarmScreenView {
  spawnEmusMock = vi.fn();
  clearEmusMock = vi.fn();
  menuButtonHandler: (() => void) | null = null;
  menuSaveHandler: (() => void) | null = null;
  menuBackHandler: (() => void) | null = null;
  showMenuOverlay = vi.fn();
  hideMenuOverlay = vi.fn();
  deployMineAtMouse = vi.fn();
  clearMines = vi.fn();
  
  // Add missing properties to fix the error
  setHuntMenuOptionHandlers = vi.fn();
  setEggMenuOptionHandlers = vi.fn();
  showHuntMenuOverlay = vi.fn();
  hideHuntMenuOverlay = vi.fn();
  showEggMenuOverlay = vi.fn();
  hideEggMenuOverlay = vi.fn();
  removeMineSprite = vi.fn();
  setDefensePlaceClickHandler = vi.fn();
  setPlanningPhaseMode = vi.fn();
  addDefense = vi.fn();
  clearDefenses = vi.fn();
  setPlacementHint = vi.fn();
  setPlacementCursor = vi.fn();
  setStartRoundButtonEnabled = vi.fn();
  setStartRoundTooltip = vi.fn();
  getDefensesLayer = vi.fn(() => ({
    add: vi.fn(),
    draw: vi.fn(),
  }));
  getMousePosition = vi.fn(() => ({ x: 100, y: 100 }));
  // Add missing method
  setStartRoundHandler = vi.fn();

  constructor(
    _handleKeydown: (event: KeyboardEvent) => void,
    _handleEndGame: () => void,  // Changed from handleStartDay to handleEndGame
    _registerEmu: (emu: FarmEmuController) => void,
    _removeEmus: () => void,
    registerPlanter: (planter: FarmPlanterController) => void,
  ) {
    // This should be called if registerPlanter is a function
    if (typeof registerPlanter === 'function') {
      const planterTarget = { id: "planter" };
      const planter = {
        setOnHarvest: vi.fn(),
        advanceDay: vi.fn(),
        getView: vi.fn(() => planterTarget),
        setStatus: vi.fn(),
        setOnPlant: vi.fn(),
        isEmpty: vi.fn(() => false),
        takeDamage: vi.fn(() => false),
        destroyCrop: vi.fn(),
      };
      registerPlanter(planter as unknown as FarmPlanterController);
    }
  }

  updateScore = vi.fn();
  updateTimer = vi.fn();
  updateRound = vi.fn();
  updateCropCount = vi.fn();
  updateMineCount = vi.fn();
  movePlayerDelta = vi.fn();
  show = vi.fn();

  getGroup(): { getLayer: () => { draw: () => void } } {
    return {
      getLayer: () => ({ draw: vi.fn() }),
    };
  }

  spawnEmus(count: number): void {
    this.spawnEmusMock(count);
  }

  clearEmus(): void {
    this.clearEmusMock();
  }

  setMenuButtonHandler = vi.fn((handler: () => void) => {
    this.menuButtonHandler = handler;
  });

  setMenuOptionHandlers = vi.fn((onSave: () => void, onBack: () => void) => {
    this.menuSaveHandler = onSave;
    this.menuBackHandler = onBack;
  });
}

let latestView: FakeFarmScreenView | null = null;

vi.mock("../src/screens/FarmScreen/FarmScreenView.ts", () => ({
  FarmScreenView: vi.fn((
    handleKeydown: (event: KeyboardEvent) => void,
    handleEndGame: () => void,  // Changed from handleStartDay to handleEndGame
    registerEmu: (emu: FarmEmuController) => void,
    removeEmus: () => void,
    registerPlanter: (planter: FarmPlanterController) => void,
  ) => {
    latestView = new FakeFarmScreenView(
      handleKeydown, 
      handleEndGame,  // Changed from handleStartDay to handleEndGame
      registerEmu, 
      removeEmus, 
      registerPlanter
    );
    return latestView;
  }),
}));

vi.mock("../src/screens/PlanningPhaseScreen/PlanningPhaseController.ts", () => ({
  PlanningPhaseController: vi.fn(() => ({
    getView: vi.fn(() => ({
      getGroup: vi.fn(() => ({
        visible: vi.fn(),
      })),
    })),
    show: vi.fn(),
    hide: vi.fn(),
    setDefenseInventory: vi.fn(),
    setOnDefenseSelected: vi.fn(),
    setOnStartRound: vi.fn(),
    deselectAll: vi.fn(),
    clearSelection: vi.fn(),
    setOnPlaceDefenses: vi.fn(),  // Added missing method
    setPlacementMode: vi.fn(),
  })),
}));

import { FarmScreenController } from "../src/screens/FarmScreen/FarmScreenController.ts";

const createAudioStub = (): AudioManager =>
  ({
    playSfx: vi.fn(),
    playBgm: vi.fn(),
    setBgmPath: vi.fn(),
    setMusicVolume: vi.fn(),
    getMusicVolume: vi.fn(),
    setSfxVolume: vi.fn(),
    getSfxVolume: vi.fn(),
    stopBgm: vi.fn(),
  }) as unknown as AudioManager;

const createController = () => {
  const switcher: ScreenSwitcher = {
    switchToScreen: vi.fn(),
  };
  const status = new GameStatusController();
  const audio = createAudioStub();
  const controller = new FarmScreenController(switcher, status, audio);
  return { controller, status, audio, switcher };
};

describe("FarmScreenController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    latestView = null;
    globalThis.requestAnimationFrame = vi.fn().mockReturnValue(0) as unknown as typeof requestAnimationFrame;
  });

  it("should create controller and view successfully", () => {
    const { controller } = createController();
    expect(controller).toBeDefined();
    expect(latestView).not.toBeNull();
  });

  it("should set morning controller", () => {
    const { controller } = createController();
    const morningStub = {
      showOverlay: vi.fn(),
      setDisplayDayOverride: vi.fn(),
    } as unknown as MorningEventsScreenController;

    controller.setMorningController(morningStub);
    // We can't directly verify this, but at least the method should be callable
    expect(() => controller.setMorningController(morningStub)).not.toThrow();
  });

  it("deploys a mine when handleDeployMine is called and player has mines", () => {
    const { controller, status } = createController();
    
    // Add mine to inventory
    status.addToInventory("mine", 1);

    // Mock deployMineAtMouse to return a valid placement
    const mockPlacement = { 
      node: { 
        x: vi.fn(), 
        y: vi.fn(),
        width: vi.fn(() => 30),
        height: vi.fn(() => 30),
      }, 
      size: 30 
    };
    latestView!.deployMineAtMouse = vi.fn(() => mockPlacement);

    // Test the handleDeployMine method directly
    (controller as any).handleDeployMine();

    expect(status.getItemCount("mine")).toBe(0);
    expect(latestView?.deployMineAtMouse).toHaveBeenCalledTimes(1);
    expect(latestView?.updateMineCount).toHaveBeenCalledWith(0);
  });

  it("saves progress and returns to the main menu when Save and Exit is used", () => {
    const { controller, status, switcher } = createController();

    status.addMoney(25);
    status.addToInventory("sandbag", 2);
    status.upgradeDefenseLevel("sandbag");
    expect(status.hasSavedGame()).toBe(true);

    (controller as any).handleMenuSaveAndExit();

    expect(switcher.switchToScreen).toHaveBeenCalledWith({ type: "main_menu" });

    const reloadedStatus = new GameStatusController();
    expect(reloadedStatus.getMoney()).toBe(status.getMoney());
    expect(reloadedStatus.getItemCount("sandbag")).toBe(2);
    expect(reloadedStatus.getDefenseLevel("sandbag")).toBe(2);
  });

  it("updates round and timer immediately when entering next planning phase", () => {
    const { controller, status } = createController();

    status.endDay();
    (controller as any).timeRemaining = 17;

    (controller as any).showPlanningPhase();

    expect(latestView?.updateRound).toHaveBeenCalledWith(2);
    expect(latestView?.updateTimer).toHaveBeenCalledWith(60);
  });

  it("enables the next-phase button immediately when the last emu is defeated", () => {
    const { controller } = createController();

    const emu = {
      active: true,
      remove() {
        this.active = false;
      },
      isActive() {
        return this.active;
      },
    } as unknown as FarmEmuController;

    (controller as any).registerEmu(emu);
    (controller as any).isPlanningPhase = false;
    (controller as any).isDefensePlacementMode = false;
    (controller as any).gameTimer = 123;

    emu.remove();

    expect(latestView?.setStartRoundButtonEnabled).toHaveBeenLastCalledWith(true);
    expect(latestView?.setStartRoundTooltip).toHaveBeenLastCalledWith(
      "All emus defeated. Click to skip to the next phase",
    );
  });

  it("does not end the game when all crops are gone during defense placement", () => {
    const { controller, switcher } = createController();

    (controller as any).isPlanningPhase = false;
    (controller as any).isDefensePlacementMode = true;
    (controller as any).gameTimer = null;
    (controller as any).planters = [
      {
        isEmpty: vi.fn(() => true),
        getView: vi.fn(),
        takeDamage: vi.fn(),
      },
    ];

    (controller as any).checkForCropLoss();

    expect(switcher.switchToScreen).not.toHaveBeenCalled();
  });

  it("machine gun fires at a nearby emu and consumes durability", () => {
    const { controller } = createController();
    const defense = {
      getType: vi.fn(() => "machine_gun"),
      getView: vi.fn(() => ({
        x: () => 100,
        y: () => 100,
      })),
      isActive: vi.fn(() => true),
      showAttackEffect: vi.fn(),
      takeDamage: vi.fn(),
      remove: vi.fn(),
    } as unknown as {
      getType: () => string;
      getView: () => { x: () => number; y: () => number };
      isActive: () => boolean;
      showAttackEffect: (x: number, y: number) => void;
      takeDamage: (amount?: number) => void;
      remove: () => void;
    };

    const emu = {
      setSpeedModifier: vi.fn(),
      setBlocked: vi.fn(),
      getView: vi.fn(() => ({
        x: () => 260,
        y: () => 100,
        width: () => 36,
        height: () => 36,
      })),
      reduceHealth: vi.fn(),
      getMaxHealth: vi.fn(() => 100),
      remove: vi.fn(),
      isActive: vi.fn(() => true),
    } as unknown as FarmEmuController;

    (controller as any).defenses = [defense];
    (controller as any).emus = [emu];
    (controller as any).isPlanningPhase = false;
    (controller as any).isDefensePlacementMode = false;

    (controller as any).checkDefenseEmuInteractions(0.016);

    expect(defense.showAttackEffect).toHaveBeenCalled();
    expect(emu.reduceHealth).toHaveBeenCalledWith(100);
    expect(emu.remove).toHaveBeenCalled();
    expect(defense.takeDamage).toHaveBeenCalledWith(1);
    expect((controller as any).gunCooldowns.get(defense)).toBeCloseTo(0.5);
  });
});
