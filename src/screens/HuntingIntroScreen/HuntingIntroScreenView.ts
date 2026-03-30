import Konva from "konva";
import type { View } from "../../types";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../constants";
import {
  createMinigameBackdrop,
  createMinigameBody,
  createMinigameButton,
  createMinigameFooterHint,
  createMinigameGlow,
  createMinigameKeycap,
  createMinigamePanel,
  createMinigameTitle,
  MINIGAME_UI_THEME,
} from "../minigameUi";

export class HuntingIntroScreenView implements View {
  private group: Konva.Group;

  constructor(onStart: () => void) {
    this.group = new Konva.Group({ visible: false });

    this.group.add(createMinigameBackdrop());
    this.group.add(createMinigameGlow());

    const [shadow, panel] = createMinigamePanel(92, 72, 616, 556);
    this.group.add(shadow);
    this.group.add(panel);

    const titleText = createMinigameTitle("EMU HUNT BRIEFING", STAGE_WIDTH / 2 - 240, 112, 480);
    this.group.add(titleText);

    const subtitle = createMinigameBody(
      "Move fast, conserve ammo, and clear the field before the timer hits zero.",
      STAGE_WIDTH / 2 - 250,
      162,
      500,
      18,
    );
    this.group.add(subtitle);

    const divider = new Konva.Line({
      points: [152, 214, STAGE_WIDTH - 152, 214],
      stroke: "rgba(108, 83, 48, 0.34)",
      strokeWidth: 2,
      listening: false,
    });
    this.group.add(divider);

    const objectiveLabel = new Konva.Text({
      x: 152,
      y: 236,
      text: "OBJECTIVE",
      fontSize: 14,
      fontFamily: "Arial",
      fill: MINIGAME_UI_THEME.accent,
      fontStyle: "bold",
      letterSpacing: 2,
    });
    this.group.add(objectiveLabel);

    const objectiveText = new Konva.Text({
      x: 152,
      y: 260,
      width: 496,
      text: "Defeat every emu on the map before you run out of ammo or time.",
      fontSize: 22,
      fontFamily: "Georgia",
      fill: MINIGAME_UI_THEME.body,
      lineHeight: 1.35,
    });
    this.group.add(objectiveText);

    const controlsLabel = new Konva.Text({
      x: 152,
      y: 352,
      text: "CONTROLS",
      fontSize: 14,
      fontFamily: "Arial",
      fill: MINIGAME_UI_THEME.accent,
      fontStyle: "bold",
      letterSpacing: 2,
    });
    this.group.add(controlsLabel);

    this.group.add(createMinigameKeycap(152, 384, 260, "W A S D : MOVE"));
    this.group.add(createMinigameKeycap(152, 430, 260, "SPACE : FIRE"));

    const guidance = new Konva.Text({
      x: 152,
      y: 492,
      width: 496,
      text: "Rocks and bushes block your bullets and give emus places to hide, so avoid bad angles and take clean shots when they step out.",
      fontSize: 18,
      fontFamily: "Georgia",
      fill: MINIGAME_UI_THEME.body,
      align: "left",
      lineHeight: 1.34,
    });
    this.group.add(guidance);

    const footerHint = createMinigameFooterHint(
      152,
      566,
      496,
      "Press START GAME when you're ready to enter the hunt.",
    );
    this.group.add(footerHint);

    const startBtn = createMinigameButton(
      STAGE_WIDTH / 2 - 110,
      STAGE_HEIGHT - 104,
      220,
      60,
      "START GAME",
      onStart,
    );
    this.group.add(startBtn);
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
