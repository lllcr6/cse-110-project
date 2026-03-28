import Konva from "konva";
import { PLANTER_HEIGHT, PLANTER_WIDTH } from "../../constants.ts";
import type { CropStage } from "./FarmPlanterModel.ts";
import notGrownSrc from "../../../assets/not_grown.png";
import halfGrownSrc from "../../../assets/half_grown.png";
import fullyGrownSrc from "../../../assets/fully_grown.png";

const createImage = (src: string): HTMLImageElement => {
	if (typeof Image !== "undefined") {
		const image = new Image();
		image.src = src;
		return image;
	}

	const fallback = document.createElement("img") as HTMLImageElement;
	fallback.src = src;
	return fallback;
};

const stageImages: Record<CropStage, HTMLImageElement | null> = {
	[-1]: null, // Empty - no image
	0: createImage(notGrownSrc),
	1: createImage(halfGrownSrc),
	2: createImage(fullyGrownSrc),
};

export class FarmPlanterView {
	private planter: Konva.Rect;
	private crop: Konva.Image;
	private healthBarBg: Konva.Rect;
	private healthBarFill: Konva.Rect;
	private healthText: Konva.Text;
	private isEmptyState: boolean = true;

	constructor(group: Konva.Group, x: number, y: number) {
		this.planter = new Konva.Rect({
			x,
			y,
			width: PLANTER_WIDTH,
			height: PLANTER_HEIGHT,
			fill: "#6d4c41",
			cornerRadius: 6,
			stroke: "#3e2723",
			strokeWidth: 2,
		});
		group.add(this.planter);

		const emptyImage = createImage(notGrownSrc); // Temporary image for initialization
		this.crop = new Konva.Image({
			x,
			y,
			width: PLANTER_WIDTH,
			height: PLANTER_HEIGHT,
			image: emptyImage,
			listening: false,
		});
		group.add(this.crop);

		this.healthBarBg = new Konva.Rect({
			x,
			y: y - 12,
			width: PLANTER_WIDTH,
			height: 5,
			fill: "rgba(0, 0, 0, 0.4)",
			cornerRadius: 3,
			visible: false,
			listening: false,
		});
		group.add(this.healthBarBg);

		this.healthBarFill = new Konva.Rect({
			x,
			y: y - 12,
			width: PLANTER_WIDTH,
			height: 5,
			fill: "#50c878",
			cornerRadius: 3,
			visible: false,
			listening: false,
		});
		group.add(this.healthBarFill);

		this.healthText = new Konva.Text({
			x: x - 4,
			y: y - 28,
			width: PLANTER_WIDTH + 8,
			text: "100 HP",
			fontSize: 10,
			fontFamily: "Arial",
			fill: "#f5f5f5",
			align: "center",
			visible: false,
			listening: false,
		});
		group.add(this.healthText);

		this.setStage(-1); // Start empty
	}

	onClick(handler: () => void): void {
		this.planter.on("click", handler);
	}

	setOnHover(onHover: (isEmpty: boolean) => void, isEmpty: () => boolean): void {
		this.planter.on("mouseenter", () => {
			const empty = isEmpty();
			this.isEmptyState = empty;
			this.updateCursor(true);
			onHover(empty);
		});
		this.planter.on("mouseleave", () => {
			this.updateCursor(false);
			onHover(false);
		});
	}

	setStage(stage: CropStage): void {
		const image = stageImages[stage];
		this.isEmptyState = stage === -1;
		
		if (image === null) {
			// Empty state - hide the crop image
			this.crop.visible(false);
			this.healthBarBg.visible(false);
			this.healthBarFill.visible(false);
			this.healthText.visible(false);
		} else {
			this.crop.visible(true);
			this.healthBarBg.visible(true);
			this.healthBarFill.visible(true);
			this.healthText.visible(true);
			if (!image.complete) {
				image.onload = () => this.crop.getLayer()?.batchDraw();
			}
			this.crop.image(image);
		}
		this.crop.getLayer()?.batchDraw();
	}

	updateHealth(currentHealth: number, maxHealth: number): void {
		if (this.isEmptyState) {
			this.healthBarBg.visible(false);
			this.healthBarFill.visible(false);
			this.healthText.visible(false);
			this.crop.getLayer()?.batchDraw();
			return;
		}

		const clampedMax = Math.max(1, maxHealth);
		const ratio = Math.max(0, Math.min(1, currentHealth / clampedMax));
		this.healthBarBg.visible(true);
		this.healthBarFill.visible(true);
		this.healthText.visible(true);
		this.healthBarFill.width(PLANTER_WIDTH * ratio);
		this.healthBarFill.fill(ratio > 0.5 ? "#50c878" : ratio > 0.25 ? "#f0ad4e" : "#d9534f");
		this.healthText.text(`${Math.ceil(currentHealth)} HP`);
		this.crop.getLayer()?.batchDraw();
	}

	private updateCursor(isHovering: boolean): void {
		const stage = this.planter.getStage();
		if (!stage) return;
		
		const container = stage.container();
		if (isHovering && this.isEmptyState) {
			container.style.cursor = "grab";
		} else {
			container.style.cursor = "default";
		}
	}

	getView(): Konva.Rect | null {
		return this.planter;
	}
}
