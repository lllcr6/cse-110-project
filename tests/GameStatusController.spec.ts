import { beforeEach, describe, expect, it } from "vitest";
import { GameStatusController } from "../src/controllers/GameStatusController.ts";
import { GameItem } from "../src/constants.ts";

describe("GameStatusController", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	const createStatus = (): GameStatusController => new GameStatusController();

	it("adds and spends money with floor at zero", () => {
		const status = createStatus();
		const STARTING_MONEY = status.getMoney();
		// Controller now starts with $40
		expect(status.getMoney()).toBe(STARTING_MONEY);
		
		const ADD_AMOUNT_1 = 50;
		status.addMoney(ADD_AMOUNT_1);
		// Calculate the expected value based on the dynamic starting money
		expect(status.getMoney()).toBe(STARTING_MONEY + ADD_AMOUNT_1); // STARTING_MONEY + 50

		const SPEND_AMOUNT_1 = ADD_AMOUNT_1 -20;
		expect(status.spend(SPEND_AMOUNT_1)).toBe(true);
		// Calculate the expected value
		expect(status.getMoney()).toBe(STARTING_MONEY + ADD_AMOUNT_1 - SPEND_AMOUNT_1); 

		const SPEND_AMOUNT_2 = STARTING_MONEY + ADD_AMOUNT_1; // This amount is expected to fail
		// The money should not change after a failed spend
		const CURRENT_MONEY = status.getMoney();
		expect(status.spend(SPEND_AMOUNT_2)).toBe(false);
		expect(status.getMoney()).toBe(CURRENT_MONEY);

		const ADD_AMOUNT_2 = -CURRENT_MONEY-100;
		status.addMoney(ADD_AMOUNT_2);
		// Inventory helpers ensure money floors at 0 when adding a negative amount that exceeds the current total
		expect(status.getMoney()).toBe(0);
	});

	it("manages inventory counts", () => {
		const status = createStatus();
		const CROP_ITEM = GameItem.Crop; 
		
		expect(status.getItemCount(CROP_ITEM)).toBe(0);

		const ADD_QTY = 3;
		status.addToInventory(CROP_ITEM, ADD_QTY);
		expect(status.getItemCount(CROP_ITEM)).toBe(ADD_QTY);

		const REMOVE_QTY_1 = 2;
		expect(status.removeFromInventory(CROP_ITEM, REMOVE_QTY_1)).toBe(true);
		expect(status.getItemCount(CROP_ITEM)).toBe(ADD_QTY - REMOVE_QTY_1); // 1

		const REMOVE_QTY_2 = 5;
		// The inventory count should not change after a failed removal
		const CURRENT_COUNT = status.getItemCount(CROP_ITEM);
		expect(status.removeFromInventory(CROP_ITEM, REMOVE_QTY_2)).toBe(false);
		expect(status.getItemCount(CROP_ITEM)).toBe(CURRENT_COUNT); // Still 1
	});

	it("does not create a save until state is explicitly saved", () => {
		const status = createStatus();

		expect(status.hasSavedGame()).toBe(false);

		status.save();

		expect(status.hasSavedGame()).toBe(true);
	});

	it("persists upgraded defense levels across controller instances", () => {
		const status = createStatus();

		status.addMoney(1000);
		expect(status.upgradeDefenseLevel("barbed_wire")).toBe(true);
		expect(status.upgradeDefenseLevel("barbed_wire")).toBe(true);
		expect(status.getDefenseLevel("barbed_wire")).toBe(3);

		const reloaded = createStatus();

		expect(reloaded.getDefenseLevel("barbed_wire")).toBe(3);
	});

	it("clears the save when requested", () => {
		const status = createStatus();

		status.save();
		expect(status.hasSavedGame()).toBe(true);

		status.clearSave();

		expect(status.hasSavedGame()).toBe(false);
	});
});
