import Konva from "konva";
import type { View } from "../../types";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants";
import {
  createMinigameBackdrop,
  createMinigameBody,
  createMinigameButton,
  createMinigameGlow,
  createMinigamePanel,
  MINIGAME_UI_THEME,
} from "../minigameUi";

export class HuntingEndScreenView implements View {
  private group: Konva.Group;
  private titleText: Konva.Text;
  private messageText: Konva.Text;
  private emusKilledText: Konva.Text;

  constructor(onContinue: () => void) {
    this.group = new Konva.Group({ visible: false });

    this.group.add(createMinigameBackdrop());
    this.group.add(createMinigameGlow());

    const [shadow, panel] = createMinigamePanel(84, 80, 632, 540);
    this.group.add(shadow);
    this.group.add(panel);

    this.titleText = new Konva.Text({
      x: STAGE_WIDTH / 2,
      y: 118,
      text: "MISSION REPORT",
      fontSize: 38,
      fontFamily: "Georgia",
      fill: MINIGAME_UI_THEME.title,
      align: "center",
      fontStyle: "bold",
    });
    this.titleText.offsetX(this.titleText.width() / 2);
    this.group.add(this.titleText);

    this.messageText = new Konva.Text({
      x: STAGE_WIDTH / 2,
      y: 176,
      text: "",
      fontSize: 22,
      fontFamily: "Georgia",
      fill: MINIGAME_UI_THEME.body,
      align: "center",
      lineHeight: 1.3,
    });
    this.messageText.offsetX(this.messageText.width() / 2);
    this.group.add(this.messageText);

    this.emusKilledText = new Konva.Text({
      x: STAGE_WIDTH / 2,
      y: 276,
      text: "Emus Killed: 0",
      fontSize: 34,
      fontFamily: "Arial",
      fill: MINIGAME_UI_THEME.accent,
      fontStyle: "bold",
      align: "center",
    });
    this.emusKilledText.offsetX(this.emusKilledText.width() / 2);
    this.group.add(this.emusKilledText);

    const detailCard = new Konva.Rect({
      x: STAGE_WIDTH / 2 - 184,
      y: 366,
      width: 368,
      height: 72,
      fill: "rgba(255, 255, 255, 0.16)",
      stroke: "rgba(108, 83, 48, 0.18)",
      strokeWidth: 1,
      cornerRadius: 18,
    });
    this.group.add(detailCard);

    const detailText = createMinigameBody(
      "You can continue once you are ready to head back to the farm.",
      STAGE_WIDTH / 2 - 150,
      384,
      300,
      17,
    );
    this.group.add(detailText);

    const continueBtn = createMinigameButton(
      STAGE_WIDTH / 2 - 110,
      STAGE_HEIGHT - 108,
      220,
      60,
      "CONTINUE",
      onContinue,
    );
    this.group.add(continueBtn);
  }

  updateEmusKilled(count: number, reason: "ammo" | "time" | "victory"): void {
    this.titleText.text(reason === "victory" ? "MISSION COMPLETE" : "MISSION FAILED");
    if (reason === "ammo") {
      this.messageText.text("You ran out of ammo before clearing the field.");
    } else if (reason === "time") {
      this.messageText.text("Time expired before the last emu went down.");
    } else {
      this.messageText.text("Every emu was defeated. Clean execution.");
    }
    this.messageText.offsetX(this.messageText.width() / 2);
    this.titleText.offsetX(this.titleText.width() / 2);
    this.emusKilledText.text(`Emus Killed: ${count}`);
    this.emusKilledText.offsetX(this.emusKilledText.width() / 2);
    this.group.getLayer()?.draw();
  }

  show(): void {
    this.group.visible(true);
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
