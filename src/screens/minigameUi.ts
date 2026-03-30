import Konva from "konva";

export const MINIGAME_UI_THEME = {
	backdropTop: "#0e1714",
	backdropMid: "#17241f",
	backdropGlow: "rgba(255, 220, 140, 0.16)",
	panelTop: "#f3e8ca",
	panelBottom: "#d7c093",
	panelBorder: "#6c5330",
	panelShadow: "rgba(0, 0, 0, 0.24)",
	title: "#2d2013",
	body: "#4b3928",
	accent: "#8f2d1f",
	accentSoft: "#d98933",
	action: "#2f5a44",
	actionHover: "#3c7557",
	actionBorder: "#1f3c2f",
	hudBg: "rgba(10, 17, 14, 0.74)",
	hudBorder: "rgba(240, 229, 199, 0.14)",
	hudText: "#f4e7bf",
	hudValue: "#ffd36b",
};

export function createMinigameBackdrop(): Konva.Rect {
	return new Konva.Rect({
		x: 0,
		y: 0,
		width: 800,
		height: 700,
		fillLinearGradientStartPoint: { x: 0, y: 0 },
		fillLinearGradientEndPoint: { x: 800, y: 700 },
		fillLinearGradientColorStops: [0, MINIGAME_UI_THEME.backdropTop, 0.55, MINIGAME_UI_THEME.backdropMid, 1, "#7a5d2c"],
	});
}

export function createMinigameGlow(): Konva.Circle {
	return new Konva.Circle({
		x: 680,
		y: 110,
		radius: 120,
		fillRadialGradientStartPoint: { x: 0, y: 0 },
		fillRadialGradientStartRadius: 10,
		fillRadialGradientEndPoint: { x: 0, y: 0 },
		fillRadialGradientEndRadius: 120,
		fillRadialGradientColorStops: [0, MINIGAME_UI_THEME.backdropGlow, 1, "rgba(255, 220, 140, 0)"],
		listening: false,
	});
}

export function createMinigamePanel(x: number, y: number, width: number, height: number): [Konva.Rect, Konva.Rect] {
	const shadow = new Konva.Rect({
		x: x + 12,
		y: y + 14,
		width,
		height,
		fill: MINIGAME_UI_THEME.panelShadow,
		cornerRadius: 26,
		listening: false,
	});

	const panel = new Konva.Rect({
		x,
		y,
		width,
		height,
		fillLinearGradientStartPoint: { x: 0, y: y },
		fillLinearGradientEndPoint: { x: 0, y: y + height },
		fillLinearGradientColorStops: [0, MINIGAME_UI_THEME.panelTop, 1, MINIGAME_UI_THEME.panelBottom],
		stroke: MINIGAME_UI_THEME.panelBorder,
		strokeWidth: 2,
		cornerRadius: 26,
	});

	return [shadow, panel];
}

export function createMinigameTitle(text: string, x: number, y: number, width: number): Konva.Text {
	return new Konva.Text({
		x,
		y,
		width,
		text,
		fontSize: 32,
		fontStyle: "bold",
		fontFamily: "Georgia",
		fill: MINIGAME_UI_THEME.title,
		align: "center",
		lineHeight: 1.08,
	});
}

export function createMinigameBody(text: string, x: number, y: number, width: number, fontSize = 20): Konva.Text {
	return new Konva.Text({
		x,
		y,
		width,
		text,
		fontSize,
		fontFamily: "Georgia",
		fill: MINIGAME_UI_THEME.body,
		align: "center",
		lineHeight: 1.38,
	});
}

export function createMinigameButton(
	x: number,
	y: number,
	width: number,
	height: number,
	text: string,
	onClick: () => void,
	options: { fill?: string; hoverFill?: string; stroke?: string } = {},
): Konva.Group {
	const group = new Konva.Group();
	const fill = options.fill ?? MINIGAME_UI_THEME.action;
	const hoverFill = options.hoverFill ?? MINIGAME_UI_THEME.actionHover;
	const stroke = options.stroke ?? MINIGAME_UI_THEME.actionBorder;

	const rect = new Konva.Rect({
		x,
		y,
		width,
		height,
		fill,
		cornerRadius: 14,
		stroke,
		strokeWidth: 2,
		shadowColor: "black",
		shadowBlur: 8,
		shadowOffset: { x: 0, y: 4 },
		shadowOpacity: 0.25,
		cursor: "pointer",
	});

	const label = new Konva.Text({
		x: x + width / 2,
		y: y + height / 2 - 12,
		text,
		fontFamily: "Arial",
		fontSize: 24,
		fontStyle: "bold",
		fill: "white",
		align: "center",
	});
	label.offsetX(label.width() / 2);

	group.add(rect);
	group.add(label);
	group.on("click", onClick);
	group.on("mouseenter", () => {
		rect.fill(hoverFill);
		const stage = group.getStage();
		if (stage) stage.container().style.cursor = "pointer";
	});
	group.on("mouseleave", () => {
		rect.fill(fill);
		const stage = group.getStage();
		if (stage) stage.container().style.cursor = "default";
	});

	return group;
}

export function createMinigameKeycap(
	x: number,
	y: number,
	width: number,
	label: string,
	fill = "rgba(12, 19, 16, 0.16)",
	textFill = MINIGAME_UI_THEME.body,
): Konva.Group {
	const group = new Konva.Group();
	const box = new Konva.Rect({
		x,
		y,
		width,
		height: 34,
		fill,
		stroke: "rgba(76, 58, 34, 0.18)",
		strokeWidth: 1,
		cornerRadius: 12,
	});
	const text = new Konva.Text({
		x: x + width / 2,
		y: y + 9,
		width,
		text: label,
		fontSize: 14,
		fontStyle: "bold",
		fontFamily: "Arial",
		fill: textFill,
		align: "center",
	});
	text.offsetX(text.width() / 2);
	group.add(box);
	group.add(text);
	return group;
}

export function createMinigameFooterHint(
	x: number,
	y: number,
	width: number,
	text: string,
): Konva.Text {
	return new Konva.Text({
		x,
		y,
		width,
		text,
		fontSize: 13,
		fontFamily: "Georgia",
		fill: MINIGAME_UI_THEME.body,
		align: "center",
		lineHeight: 1.15,
	});
}

export function createMinigameHudLabel(
	x: number,
	y: number,
	text: string,
	fontSize = 20,
	align: "left" | "center" | "right" = "left",
): Konva.Text {
	const label = new Konva.Text({
		x,
		y,
		text,
		fontSize,
		fontFamily: "Arial",
		fill: MINIGAME_UI_THEME.hudText,
		fontStyle: "bold",
		align,
	});

	if (align === "center") {
		label.offsetX(label.width() / 2);
	}

	if (align === "right") {
		label.offsetX(label.width());
	}

	return label;
}
