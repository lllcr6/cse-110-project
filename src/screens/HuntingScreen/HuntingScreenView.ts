// src/screens/Game2Screen/Game2ScreenView.ts
import Konva from "konva";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants";
import { createMinigameHudLabel, MINIGAME_UI_THEME } from "../minigameUi";

export class HuntingScreenView {
  private group: Konva.Group;
  private hudBanner: Konva.Rect;
  private ammoLabelText: Konva.Text;
  private ammoValueText: Konva.Text;
  private emusLabelText: Konva.Text;
  private emusValueText: Konva.Text;
  private timerText: Konva.Text;

  constructor() {
    this.group = new Konva.Group({ visible: false });

    // HUD Banner - Semi-transparent dark background (outside game area)
    this.hudBanner = new Konva.Rect({
      x: 0,
      y: 0,
      width: STAGE_WIDTH,
      height: 80,
      fill: MINIGAME_UI_THEME.hudBg,
      stroke: MINIGAME_UI_THEME.hudBorder,
      strokeWidth: 1,
    });
    this.group.add(this.hudBanner);

    // Game background - starts below HUD (dark night theme)
    const bg = new Konva.Rect({
      x: 0,
      y: 80,
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT - 80,
      fill: "#17353a",
    });
    this.group.add(bg);

    // Ammo (Left side)
    this.ammoLabelText = createMinigameHudLabel(30, 18, "Ammo", 18, "left");
    this.group.add(this.ammoLabelText);

    this.ammoValueText = createMinigameHudLabel(30, 43, "100", 28, "left");
    this.group.add(this.ammoValueText);

    // Emus Left (Center)
    this.emusLabelText = createMinigameHudLabel(STAGE_WIDTH / 2, 18, "Emus Left", 18, "center");
    this.group.add(this.emusLabelText);

    this.emusValueText = createMinigameHudLabel(STAGE_WIDTH / 2, 43, "0", 28, "center");
    this.group.add(this.emusValueText);

    // Timer (Right side)
    this.timerText = createMinigameHudLabel(STAGE_WIDTH - 30, 32, "01:45", 28, "right");
    this.group.add(this.timerText);
  }

  getGroup() {
    return this.group;
  }

  show() {
    this.group.visible(true);
    this.group.getLayer()?.draw();
  }

  hide() {
    this.group.visible(false);
    this.group.getLayer()?.draw();
  }

  updateAmmo(ammo: number) {
    this.ammoValueText.text(ammo.toString());
    this.group.getLayer()?.draw();
  }

  updateDefeat(emusLeft: number) {
    this.emusValueText.text(emusLeft.toString());
    this.group.getLayer()?.draw();
  }

  updateTimer(secondsRemaining: number) {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = Math.floor(secondsRemaining % 60);
    const secondsStr = seconds.toString().padStart(2, "0");
    this.timerText.text(`${minutes.toString().padStart(2, "0")}:${secondsStr}`);
    this.group.getLayer()?.draw();
  }

  batchDraw() {
    this.group.getLayer()?.batchDraw();
  }
}
