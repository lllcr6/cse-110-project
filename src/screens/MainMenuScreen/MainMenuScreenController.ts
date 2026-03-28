import { ScreenController } from "../../types.ts";
import type { ScreenSwitcher } from "../../types.ts";
import type { GameStatusController } from "../../controllers/GameStatusController.ts";
import { MainMenuScreenView } from "./MainMenuScreenView.ts";

/**
 * MenuScreenController - Handles menu interactions
 */
export class MainMenuScreenController extends ScreenController {
	private view: MainMenuScreenView;
	private screenSwitcher: ScreenSwitcher;
    private status: GameStatusController;

	constructor(screenSwitcher: ScreenSwitcher, status: GameStatusController) {
		super();
		this.screenSwitcher = screenSwitcher;
        this.status = status;
		this.view = new MainMenuScreenView(
            () => this.handleNewGameClick(),
            () => this.handleContinueClick(),
        );
	}

	/**
	 * Handle start button click
	 */
	private handleNewGameClick(): void {
		this.screenSwitcher.switchToScreen({type: "game_intro"})
	}

	private handleContinueClick(): void {
        if (!this.status.hasSavedGame()) {
		    this.screenSwitcher.switchToScreen({type: "game_intro"});
            return;
        }
		this.screenSwitcher.switchToScreen({type: "farm", newgame: false});
	}

	/**
	 * Get the view
	 */
	getView(): MainMenuScreenView {
		return this.view;
	}
}
