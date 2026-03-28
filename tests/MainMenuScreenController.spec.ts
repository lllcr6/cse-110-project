import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScreenSwitcher } from "../src/types.ts";
import { GameStatusController } from "../src/controllers/GameStatusController.ts";

class FakeMainMenuView {
	show = vi.fn();
	hide = vi.fn();
	getGroup = vi.fn(() => ({ getLayer: () => ({ draw: vi.fn() }) }));
}

vi.mock("../src/screens/MainMenuScreen/MainMenuScreenView.ts", () => ({
	MainMenuScreenView: vi.fn(() => {
		return new FakeMainMenuView();
	}),
}));

import { MainMenuScreenController } from "../src/screens/MainMenuScreen/MainMenuScreenController.ts";

describe("MainMenuScreenController", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorage.clear();
	});

	it("starts a new game from Continue when no save exists", () => {
		const switcher: ScreenSwitcher = {
			switchToScreen: vi.fn(),
		};
		const status = new GameStatusController();
		const controller = new MainMenuScreenController(switcher, status);

		(controller as any).handleContinueClick();

		expect(switcher.switchToScreen).toHaveBeenCalledWith({ type: "game_intro" });
	});

	it("continues the saved game when a save exists", () => {
		const switcher: ScreenSwitcher = {
			switchToScreen: vi.fn(),
		};
		const status = new GameStatusController();
		status.save();
		const controller = new MainMenuScreenController(switcher, status);

		(controller as any).handleContinueClick();

		expect(switcher.switchToScreen).toHaveBeenCalledWith({ type: "farm", newgame: false });
	});
});
