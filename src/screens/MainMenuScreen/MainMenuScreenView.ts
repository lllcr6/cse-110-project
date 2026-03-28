import Konva from "konva";
import type { View } from "../../types.ts";
import { STAGE_HEIGHT, STAGE_WIDTH } from "../../constants.ts";
import backgroundSrc from "../../../assets/background.png";

const loadImage = (src: string): HTMLImageElement => {
	if (typeof Image !== "undefined") {
		const image = new Image();
		image.src = src;
		return image;
	}

	const fallback = document.createElement("img") as HTMLImageElement;
	fallback.src = src;
	return fallback;
};

export class MainMenuScreenView implements View {
	private group: Konva.Group;
	private background: Konva.Image;
	private backgroundAnimation: Konva.Animation | null = null;
	private backgroundPhase = 0;

	constructor(
		onNewGameClick: () => void,
		onContinueClick: () => void,
	) {
		this.group = new Konva.Group({ visible: true });

		const bgImage = loadImage(backgroundSrc);
		this.background = new Konva.Image({
			x: -20,
			y: -20,
			width: STAGE_WIDTH + 40,
			height: STAGE_HEIGHT + 40,
			image: bgImage,
			listening: false,
		});
		if (bgImage.complete) {
			this.background.image(bgImage);
		} else {
			bgImage.onload = () => {
				this.background.image(bgImage);
				this.group.getLayer()?.batchDraw();
			};
		}
		this.group.add(this.background);

		const title = new Konva.Text({
			x: STAGE_WIDTH / 2,
			y: 120,
			text: "FARM DEFENSE",
			fontSize: 54,
			fontFamily: "Arial",
			fill: "#ffe082",
			stroke: "#ffb300",
			strokeWidth: 2,
			align: "center",
		});
		title.offsetX(title.width() / 2);
		this.group.add(title);

		const newGameButtonGroup = new Konva.Group();
		const newGameButton = new Konva.Rect({
			x: STAGE_WIDTH / 2 - 100,
			y: 320,
			width: 200,
			height: 60,
			fill: "green",
			cornerRadius: 10,
			stroke: "darkgreen",
			strokeWidth: 3,
		});
		const newGameText = new Konva.Text({
			x: STAGE_WIDTH / 2,
			y: 335,
			text: "NEW GAME",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "white",
			align: "center",
		});
		newGameText.offsetX(newGameText.width() / 2);
		newGameButtonGroup.add(newGameButton);
		newGameButtonGroup.add(newGameText);
		newGameButtonGroup.on("click", onNewGameClick);
		this.group.add(newGameButtonGroup);

		const continueButtonGroup = new Konva.Group();
    	const continueButton = new Konva.Rect({
      		x: STAGE_WIDTH / 2 - 100,
      		y: 400,
			width: 200,
			height: 60,
			fill: "#1565c0",
			cornerRadius: 10,
			stroke: "#0d47a1",
			strokeWidth: 3,
   		 });
   		 const continueText = new Konva.Text({
			x: STAGE_WIDTH / 2,
			y: 415,
			text: "CONTINUE",
			fontSize: 24,
			fontFamily: "Arial",
			fill: "white",
			align: "center",
   		 });
		continueText.offsetX(continueText.width() / 2);
		continueButtonGroup.add(continueButton);
		continueButtonGroup.add(continueText);
		continueButtonGroup.on("click", onContinueClick);
		this.group.add(continueButtonGroup);
	}

	show(): void {
		this.group.visible(true);
		this.startBackgroundAnimation();
		this.group.getLayer()?.draw();
	}

	hide(): void {
		this.group.visible(false);
		this.stopBackgroundAnimation();
		this.group.getLayer()?.draw();
	}

	getGroup(): Konva.Group {
		return this.group;
	}

	private startBackgroundAnimation(): void {
		if (this.backgroundAnimation) return;
		const layer = this.group.getLayer();
		if (!layer) return;

		this.backgroundPhase = 0;
		this.backgroundAnimation = new Konva.Animation((frame) => {
			if (!frame) return;
			this.backgroundPhase += frame.timeDiff * 0.0006;
			const offsetX = Math.sin(this.backgroundPhase) * 10;
			const offsetY = Math.cos(this.backgroundPhase * 0.7) * 6;
			this.background.position({
				x: -20 + offsetX,
				y: -20 + offsetY,
			});
		}, layer);
		this.backgroundAnimation.start();
	}

	private stopBackgroundAnimation(): void {
		this.backgroundAnimation?.stop();
		this.backgroundAnimation = null;
		this.background.position({ x: -20, y: -20 });
	}
}
