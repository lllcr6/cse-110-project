import Konva from "konva";
import type { View } from "../../types.ts";
import { STAGE_HEIGHT, STAGE_WIDTH } from "../../constants.ts";
import {
    MAX_DEFENSE_LEVEL,
    getDefenseStats,
    getDefenseUpgradeCost,
    type UpgradableDefenseType,
} from "../../components/DefenseComponent/DefenseModel.ts";
import backgroundSrc from "../../../assets/background.png";
import stallSrc from "../../../assets/stall.png";

type ButtonSpec = {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    fill: string;
};

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

function makeButton(spec: ButtonSpec, onClick: () => void): Konva.Group {
    const group = new Konva.Group({ cursor: "pointer" });
    const rect = new Konva.Rect({
        x: spec.x,
        y: spec.y,
        width: spec.width,
        height: spec.height,
        fill: spec.fill,
        cornerRadius: 8,
        stroke: "#333",
        strokeWidth: 2,
    });
    const label = new Konva.Text({
        x: spec.x + spec.width / 2,
        y: spec.y + spec.height / 2 - 10,
        text: spec.text,
        fontFamily: "Arial",
        fontSize: 20,
        fill: "white",
        align: "center",
    });
    label.offsetX(label.width() / 2);
    group.add(rect);
    group.add(label);
    group.on("click", onClick);
    group.on("tap", onClick);
    return group;
}

/**
 * MorningEventsScreenView - Renders the morning events UI
 */
export class MorningEventsScreenView implements View {
    private group: Konva.Group;
    private background: Konva.Image;
    private backgroundAnimation: Konva.Animation | null = null;
    private backgroundPhase = 0;
    private headerPanel: Konva.Rect;
    private titleText: Konva.Text;
    private moneyText: Konva.Text;
    private inventoryText: Konva.Text;
    private infoText: Konva.Text;
    private dailyQuizButton: Konva.Group;
    private continueButton: Konva.Group;
    private shopGroup: Konva.Group | null = null;
    private quizGroup: Konva.Group | null = null;
    private quizChoiceHandler: ((index: number) => void) | null = null;
    private shopPurchaseHandler: ((defenseType: string) => void) | null = null;
    private shopUpgradeHandler: ((defenseType: string) => void) | null = null;
    private buyCropHandler: (() => void) | null = null;
    private sellCropHandler: (() => void) | null = null;
    private sellEggHandler: (() => void) | null = null;

    constructor(
        onBuy: () => void,
        onSell: () => void,
        onSellEgg: () => void,
        onContinue: () => void,
        onOpenQuiz?: () => void,
        onSelectQuizChoice?: (index: number) => void,
        onOpenShop?: () => void,
        onPurchaseDefense?: (defenseType: string) => void,
        onUpgradeDefense?: (defenseType: string) => void,
    ) {
        this.group = new Konva.Group({ visible: false });
        this.quizChoiceHandler = onSelectQuizChoice ?? null;
        this.shopPurchaseHandler = onPurchaseDefense ?? null;
        this.shopUpgradeHandler = onUpgradeDefense ?? null;
        this.buyCropHandler = onBuy;
        this.sellCropHandler = onSell;
        this.sellEggHandler = onSellEgg;

        // Background image with subtle float animation
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

        // Market Stall backdrop (LARGE and centered - backdrop for all content)
        const stallImage = loadImage(stallSrc);
        const stallBackdrop = new Konva.Image({
            x: STAGE_WIDTH / 2 - 350,  // Centered
            y: STAGE_HEIGHT / 2 - 250,  // Centered vertically
            width: 700,  // Much bigger to encompass all buttons/text
            height: 500,
            image: stallImage,
            listening: false,
        });
        if (stallImage.complete) {
            stallBackdrop.image(stallImage);
        } else {
            stallImage.onload = () => {
                stallBackdrop.image(stallImage);
                this.group.getLayer()?.batchDraw();
            };
        }
        this.group.add(stallBackdrop);

        this.headerPanel = new Konva.Rect({
            x: STAGE_WIDTH / 2 - 250,
            y: 42,
            width: 500,
            height: 180,
            fill: "rgba(255, 248, 238, 0.78)",
            stroke: "#8d6e63",
            strokeWidth: 3,
            cornerRadius: 22,
            shadowColor: "rgba(0, 0, 0, 0.16)",
            shadowBlur: 12,
            shadowOffset: { x: 0, y: 5 },
        });
        this.group.add(this.headerPanel);

        // Title
        this.titleText = new Konva.Text({
            x: STAGE_WIDTH / 2,
            y: 64,
            text: "Morning Events",
            fontSize: 34,
            fontFamily: "Arial",
            fill: "#3e2723",
            align: "center",
            fontStyle: "bold",
        });
        this.titleText.offsetX(this.titleText.width() / 2);
        this.group.add(this.titleText);

        // Money / Inventory
        this.moneyText = new Konva.Text({
            x: STAGE_WIDTH / 2,
            y: 112,
            text: "Money: $0",
            fontSize: 24,
            fontFamily: "Arial",
            fill: "#2e7d32",
            align: "center",
            fontStyle: "bold",
        });
        this.moneyText.offsetX(this.moneyText.width() / 2);
        this.group.add(this.moneyText);

        this.inventoryText = new Konva.Text({
            x: STAGE_WIDTH / 2,
            y: 148,
            text: "Crops: 0",
            fontSize: 20,
            fontFamily: "Arial",
            fill: "#455a64",
            align: "center",
        });
        this.inventoryText.offsetX(this.inventoryText.width() / 2);
        this.group.add(this.inventoryText);

        const marketPanel = new Konva.Rect({
            x: STAGE_WIDTH / 2 - 235,
            y: 270,
            width: 470,
            height: 220,
            fill: "rgba(255, 248, 232, 0.9)",
            stroke: "#8d6e63",
            strokeWidth: 3,
            cornerRadius: 18,
            shadowColor: "rgba(0, 0, 0, 0.18)",
            shadowBlur: 10,
            shadowOffset: { x: 0, y: 4 },
        });
        this.group.add(marketPanel);

        const marketTitle = new Konva.Text({
            x: STAGE_WIDTH / 2,
            y: 292,
            text: "Market Square",
            fontSize: 24,
            fontFamily: "Arial",
            fill: "#4e342e",
            fontStyle: "bold",
            align: "center",
        });
        marketTitle.offsetX(marketTitle.width() / 2);
        this.group.add(marketTitle);

        const marketSubtitle = new Konva.Text({
            x: STAGE_WIDTH / 2,
            y: 324,
            width: 360,
            text: "Buy crops, sell goods, and stock up on defenses from one place.",
            fontSize: 15,
            fontFamily: "Arial",
            fill: "#6d4c41",
            align: "center",
        });
        marketSubtitle.offsetX(marketSubtitle.width() / 2);
        this.group.add(marketSubtitle);

        const shopBtn = makeButton({ x: STAGE_WIDTH / 2 - 100, y: 368, width: 200, height: 50, text: "Open Shop", fill: "#d97706" }, () => onOpenShop?.());
        const quizBtn = makeButton({ x: STAGE_WIDTH / 2 - 100, y: 425, width: 200, height: 44, text: "Daily Quiz", fill: "#8e24aa" }, () => onOpenQuiz?.());
        quizBtn.visible(false);
        this.dailyQuizButton = quizBtn;
        this.continueButton = makeButton({ x: STAGE_WIDTH / 2 - 100, y: 425, width: 200, height: 50, text: "Continue", fill: "#1565c0" }, onContinue);
        this.group.add(shopBtn);
        this.group.add(quizBtn);
        this.group.add(this.continueButton);

        // Informational text area (facts, quiz result, etc.)
        this.infoText = new Konva.Text({
            x: STAGE_WIDTH / 2,
            y: 182,
            text: "",
            fontSize: 16,
            fontFamily: "Arial",
            fill: "#4e342e",
            align: "center",
            width: 430,
        });
        this.infoText.offsetX(this.infoText.width() / 2);
        this.group.add(this.infoText);
    }

    updateDay(day: number): void {
        this.titleText.text(`Morning - Day ${day}`);
        this.titleText.offsetX(this.titleText.width() / 2);
        this.group.getLayer()?.draw();
    }

    updateMoney(amount: number): void {
        this.moneyText.text(`Money: $${amount}`);
        this.moneyText.offsetX(this.moneyText.width() / 2);
        this.group.getLayer()?.draw();
    }

    updateInventory(cropCount: number, eggCount: number = 0): void {
        this.inventoryText.text(`Crops: ${cropCount} | Eggs: ${eggCount}`);
        this.inventoryText.offsetX(this.inventoryText.width() / 2);
        this.group.getLayer()?.draw();
    }

    setInfoText(text: string, color: string = "#222", fontSize: number = 16): void {
        this.infoText.text(text);
        this.infoText.fill(color);
        this.infoText.fontSize(fontSize);
        this.infoText.offsetX(this.infoText.width() / 2);
        this.group.getLayer()?.draw();
    }

    setDailyQuizButtonVisible(visible: boolean): void {
        this.dailyQuizButton.visible(visible);
        this.setButtonPosition(this.continueButton, STAGE_WIDTH / 2 - 100, visible ? 472 : 425);
        this.group.getLayer()?.draw();
    }

    private setButtonPosition(button: Konva.Group, x: number, y: number): void {
        const rect = button.children?.[0] as Konva.Rect | undefined;
        const label = button.children?.[1] as Konva.Text | undefined;
        if (!rect || !label) {
            return;
        }

        rect.position({ x, y });
        label.position({
            x: x + rect.width() / 2,
            y: y + rect.height() / 2 - 10,
        });
        label.offsetX(label.width() / 2);
    }

    showQuizPopup(question: string, choices: string[]): void {
        if (!this.quizChoiceHandler) return;
        this.hideQuizPopup();
        this.hideShopPopup(); // Close shop if open

        const popup = new Konva.Group();
        const panelWidth = STAGE_WIDTH - 80;
        const choiceHeight = 45;
        const gapY = 48;
        const buttonsHeight = (choices.length * choiceHeight) + Math.max(choices.length - 1, 0) * gapY;
        const panelHeight = 120 + buttonsHeight;
        const panelX = (STAGE_WIDTH - panelWidth) / 2;
        const maxPanelY = STAGE_HEIGHT - panelHeight - 10;
        const panelY = Math.min(maxPanelY, Math.max(220, (STAGE_HEIGHT - panelHeight) / 2));

        const panel = new Konva.Rect({
            x: panelX,
            y: panelY,
            width: panelWidth,
            height: panelHeight,
            fill: "#ffffff",
            stroke: "#4a90e2",
            strokeWidth: 3,
            cornerRadius: 12,
            shadowColor: "rgba(0, 0, 0, 0.25)",
            shadowBlur: 12,
            shadowOffset: { x: 0, y: 4 },
        });
        popup.add(panel);

        const title = new Konva.Text({
            x: STAGE_WIDTH / 2,
            y: panelY + 16,
            text: "Daily Quiz",
            fontSize: 24,
            fontFamily: "Arial",
            fill: "#2c3e50",
            align: "center",
            fontStyle: "bold",
        });
        title.offsetX(title.width() / 2);
        popup.add(title);

        const qText = new Konva.Text({
            x: STAGE_WIDTH / 2,
            y: panelY + 52,
            text: question,
            fontSize: 18,
            fontFamily: "Arial",
            fill: "#34495e",
            width: panelWidth - 40,
            align: "center",
        });
        qText.offsetX(qText.width() / 2);
        popup.add(qText);

        const btnWidth = Math.min(320, panelWidth - 40);
        const baseY = panelY + 90;
        const colors = ["#3498db", "#2ecc71", "#e74c3c", "#f39c12"];

        for (let i = 0; i < choices.length; i++) {
            const x = STAGE_WIDTH / 2 - btnWidth / 2;
            const y = baseY + i * gapY;
            const btnGroup = new Konva.Group({ cursor: "pointer" });

            const rect = new Konva.Rect({
                x,
                y,
                width: btnWidth,
                height: choiceHeight,
                fill: colors[i % colors.length],
                cornerRadius: 10,
                shadowBlur: 6,
                shadowColor: "rgba(0, 0, 0, 0.25)",
                shadowOffset: { x: 0, y: 2 },
            });

            const text = new Konva.Text({
                x: x + btnWidth / 2,
                y: y + choiceHeight / 2 - 10,
                text: choices[i],
                fontSize: 18,
                fontFamily: "Arial",
                fill: "#ffffff",
                align: "center",
            });
            text.offsetX(text.width() / 2);

            btnGroup.add(rect);
            btnGroup.add(text);
            btnGroup.on("click", () => this.quizChoiceHandler?.(i));
            btnGroup.on("tap", () => this.quizChoiceHandler?.(i));
            popup.add(btnGroup);
        }

        this.group.add(popup);
        this.quizGroup = popup;
        this.group.getLayer()?.draw();
    }

    hideQuizPopup(): void {
        if (this.quizGroup) {
            this.quizGroup.destroy();
            this.quizGroup = null;
            this.group.getLayer()?.draw();
        }
    }

    showShopPopup(
        defenseInventory: Record<string, number>,
        currentMoney: number,
        cropCount: number,
        eggCount: number,
        defenseLevels: Record<UpgradableDefenseType, number>
    ): void {
        this.hideShopPopup();
        this.hideQuizPopup(); // Close quiz if open

        const popup = new Konva.Group();
        const panelWidth = STAGE_WIDTH - 110;
        const panelHeight = 610;
        const panelX = (STAGE_WIDTH - panelWidth) / 2;
        const panelY = (STAGE_HEIGHT - panelHeight) / 2;

        const panel = new Konva.Rect({
            x: panelX,
            y: panelY,
            width: panelWidth,
            height: panelHeight,
            fill: "#ffffff",
            stroke: "#c47b22",
            strokeWidth: 3,
            cornerRadius: 16,
            shadowColor: "rgba(0, 0, 0, 0.25)",
            shadowBlur: 12,
            shadowOffset: { x: 0, y: 4 },
        });
        popup.add(panel);

        const title = new Konva.Text({
            x: STAGE_WIDTH / 2,
            y: panelY + 18,
            text: "Town Market",
            fontSize: 30,
            fontFamily: "Arial",
            fill: "#2c3e50",
            align: "center",
            fontStyle: "bold",
        });
        title.offsetX(title.width() / 2);
        popup.add(title);

        const moneyDisplay = new Konva.Text({
            x: STAGE_WIDTH / 2,
            y: panelY + 55,
            text: `Money: $${currentMoney}   |   Crops: ${cropCount}   |   Eggs: ${eggCount}`,
            fontSize: 18,
            fontFamily: "Arial",
            fill: "#27ae60",
            align: "center",
            fontStyle: "bold",
        });
        moneyDisplay.offsetX(moneyDisplay.width() / 2);
        popup.add(moneyDisplay);

        const goodsTitle = new Konva.Text({
            x: panelX + 28,
            y: panelY + 95,
            text: "Farm Goods",
            fontSize: 20,
            fontFamily: "Arial",
            fill: "#5d4037",
            fontStyle: "bold",
        });
        popup.add(goodsTitle);

        const goods = [
            {
                name: "Crop Seeds",
                description: "Plant fresh wheat on an empty field.",
                priceLabel: "Buy for $10",
                priceColor: "#2e7d32",
                ownedLabel: `Owned: ${cropCount}`,
                actionLabel: "Buy",
                actionColor: "#2e7d32",
                actionEnabled: currentMoney >= 10,
                onClick: () => this.buyCropHandler?.(),
            },
            {
                name: "Harvested Crops",
                description: "Sell stored crops for quick cash.",
                priceLabel: "Sell for $5",
                priceColor: "#c62828",
                ownedLabel: `Stored: ${cropCount}`,
                actionLabel: "Sell",
                actionColor: "#c62828",
                actionEnabled: cropCount > 0,
                onClick: () => this.sellCropHandler?.(),
            },
            {
                name: "Emu Eggs",
                description: "Trade stolen eggs for a strong payout.",
                priceLabel: "Sell for $35",
                priceColor: "#c62828",
                ownedLabel: `Stored: ${eggCount}`,
                actionLabel: "Sell",
                actionColor: "#c62828",
                actionEnabled: eggCount > 0,
                onClick: () => this.sellEggHandler?.(),
            },
        ];

        goods.forEach((item, index) => {
            const itemY = panelY + 128 + index * 72;
            const itemGroup = new Konva.Group();

            const itemBg = new Konva.Rect({
                x: panelX + 22,
                y: itemY,
                width: panelWidth - 44,
                height: 60,
                fill: index % 2 === 0 ? "#fff8ef" : "#fdf2e3",
                stroke: "#e0c097",
                strokeWidth: 1.5,
                cornerRadius: 12,
            });
            itemGroup.add(itemBg);

            const nameText = new Konva.Text({
                x: panelX + 36,
                y: itemY + 10,
                text: item.name,
                fontSize: 18,
                fontFamily: "Arial",
                fill: "#3e2723",
                fontStyle: "bold",
            });
            itemGroup.add(nameText);

            const descText = new Konva.Text({
                x: panelX + 36,
                y: itemY + 33,
                text: item.description,
                fontSize: 13,
                fontFamily: "Arial",
                fill: "#6d4c41",
            });
            itemGroup.add(descText);

            const priceText = new Konva.Text({
                x: panelX + 360,
                y: itemY + 12,
                text: item.priceLabel,
                fontSize: 15,
                fontFamily: "Arial",
                fill: item.priceColor,
                fontStyle: "bold",
            });
            itemGroup.add(priceText);

            const ownedText = new Konva.Text({
                x: panelX + 360,
                y: itemY + 34,
                text: item.ownedLabel,
                fontSize: 13,
                fontFamily: "Arial",
                fill: "#455a64",
            });
            itemGroup.add(ownedText);

            const actionBtn = new Konva.Group({
                x: panelX + panelWidth - 126,
                y: itemY + 12,
                cursor: item.actionEnabled ? "pointer" : "not-allowed",
            });
            const actionRect = new Konva.Rect({
                width: 88,
                height: 36,
                fill: item.actionEnabled ? item.actionColor : "#b0bec5",
                cornerRadius: 8,
                stroke: item.actionEnabled ? "#37474f" : "#90a4ae",
                strokeWidth: 1.5,
            });
            const actionText = new Konva.Text({
                x: 44,
                y: 9,
                text: item.actionLabel,
                fontSize: 15,
                fontFamily: "Arial",
                fill: "white",
                align: "center",
                fontStyle: "bold",
            });
            actionText.offsetX(actionText.width() / 2);
            actionBtn.add(actionRect);
            actionBtn.add(actionText);
            if (item.actionEnabled) {
                actionBtn.on("click", item.onClick);
                actionBtn.on("tap", item.onClick);
            }
            itemGroup.add(actionBtn);
            popup.add(itemGroup);
        });

        const defenseTitle = new Konva.Text({
            x: panelX + 28,
            y: panelY + 350,
            text: "Defense Supplies",
            fontSize: 20,
            fontFamily: "Arial",
            fill: "#2c3e50",
            fontStyle: "bold",
        });
        popup.add(defenseTitle);

        const defenses = [
            { type: "barbed_wire", name: "Barbed Wire", cost: 10, description: "Slows emus down" },
            { type: "sandbag", name: "Sandbag Barrier", cost: 25, description: "Blocks emus temporarily" },
            { type: "machine_gun", name: "Machine Gun Nest", cost: 50, description: "Auto-shoots nearby emus" },
        ];

        const cardGap = 12;
        const cardWidth = (panelWidth - 44 - cardGap * 2) / 3;
        const cardHeight = 150;
        const startX = panelX + 22;
        const startY = panelY + 380;

        defenses.forEach((defense, index) => {
            const defenseType = defense.type as UpgradableDefenseType;
            const level = defenseLevels[defenseType];
            const stats = getDefenseStats(defenseType, level);
            const upgradeCost = level >= MAX_DEFENSE_LEVEL ? null : getDefenseUpgradeCost(defenseType, level);
            const canUpgrade = upgradeCost !== null && currentMoney >= upgradeCost;
            const cardX = startX + index * (cardWidth + cardGap);
            const itemGroup = new Konva.Group();

            const itemBg = new Konva.Rect({
                x: cardX,
                y: startY,
                width: cardWidth,
                height: cardHeight,
                fill: index % 2 === 0 ? "#eef5f7" : "#e8f0f4",
                stroke: "#c6d4db",
                strokeWidth: 1.5,
                cornerRadius: 12,
            });
            itemGroup.add(itemBg);

            const nameText = new Konva.Text({
                x: cardX + 14,
                y: startY + 10,
                width: cardWidth - 28,
                text: defense.name,
                fontSize: 15,
                fontFamily: "Arial",
                fill: "#2c3e50",
                fontStyle: "bold",
            });
            itemGroup.add(nameText);

            const descText = new Konva.Text({
                x: cardX + 14,
                y: startY + 32,
                width: cardWidth - 28,
                text: defense.description,
                fontSize: 11,
                fontFamily: "Arial",
                fill: "#7f8c8d",
            });
            itemGroup.add(descText);

            const levelText = new Konva.Text({
                x: cardX + 14,
                y: startY + 58,
                text: `Level ${level}/${MAX_DEFENSE_LEVEL}`,
                fontSize: 12,
                fontFamily: "Arial",
                fill: "#1f3b57",
                fontStyle: "bold",
            });
            itemGroup.add(levelText);

            const durabilityText = new Konva.Text({
                x: cardX + 14,
                y: startY + 76,
                text: `Durability: ${stats.maxDurability}`,
                fontSize: 11,
                fontFamily: "Arial",
                fill: "#455a64",
            });
            itemGroup.add(durabilityText);

            const costText = new Konva.Text({
                x: cardX + 14,
                y: startY + 98,
                text: `Cost: $${defense.cost}`,
                fontSize: 13,
                fontFamily: "Arial",
                fill: currentMoney >= defense.cost ? "#27ae60" : "#e74c3c",
                fontStyle: "bold",
            });
            itemGroup.add(costText);

            const inventoryCount = defenseInventory[defense.type] || 0;
            const inventoryText = new Konva.Text({
                x: cardX + 14,
                y: startY + 116,
                text: `Owned: ${inventoryCount}`,
                fontSize: 11,
                fontFamily: "Arial",
                fill: "#34495e",
            });
            itemGroup.add(inventoryText);

            const buyBtn = new Konva.Group({
                x: cardX + 14,
                y: startY + 114,
                cursor: currentMoney >= defense.cost ? "pointer" : "not-allowed",
            });

            const buyRect = new Konva.Rect({
                width: 76,
                height: 28,
                fill: currentMoney >= defense.cost ? "#27ae60" : "#95a5a6",
                cornerRadius: 7,
                stroke: currentMoney >= defense.cost ? "#229954" : "#7f8c8d",
                strokeWidth: 1.5,
            });
            buyBtn.add(buyRect);

            const buyText = new Konva.Text({
                x: 38,
                y: 6,
                text: "Buy",
                fontSize: 13,
                fontFamily: "Arial",
                fill: "#ffffff",
                align: "center",
                fontStyle: "bold",
            });
            buyText.offsetX(buyText.width() / 2);
            buyBtn.add(buyText);

            if (currentMoney >= defense.cost) {
                buyBtn.on("click", () => {
                    this.shopPurchaseHandler?.(defense.type);
                });
                buyBtn.on("tap", () => {
                    this.shopPurchaseHandler?.(defense.type);
                });
            }

            itemGroup.add(buyBtn);

            const upgradeBtn = new Konva.Group({
                x: cardX + cardWidth - 96,
                y: startY + 114,
                cursor: upgradeCost === null ? "default" : canUpgrade ? "pointer" : "not-allowed",
            });
            const upgradeRect = new Konva.Rect({
                width: 82,
                height: 28,
                fill: upgradeCost === null ? "#78909c" : canUpgrade ? "#7b1fa2" : "#b0bec5",
                cornerRadius: 7,
                stroke: upgradeCost === null ? "#546e7a" : canUpgrade ? "#6a1b9a" : "#90a4ae",
                strokeWidth: 1.5,
            });
            const upgradeText = new Konva.Text({
                x: 41,
                y: 6,
                text: upgradeCost === null ? "Max" : "Upgrade",
                fontSize: 12,
                fontFamily: "Arial",
                fill: "#ffffff",
                align: "center",
                fontStyle: "bold",
            });
            upgradeText.offsetX(upgradeText.width() / 2);
            upgradeBtn.add(upgradeRect);
            upgradeBtn.add(upgradeText);
            if (canUpgrade && upgradeCost !== null) {
                upgradeBtn.on("click", () => {
                    this.shopUpgradeHandler?.(defense.type);
                });
                upgradeBtn.on("tap", () => {
                    this.shopUpgradeHandler?.(defense.type);
                });
            }
            itemGroup.add(upgradeBtn);

            const upgradeCostText = new Konva.Text({
                x: cardX + 96,
                y: startY + 98,
                width: cardWidth - 110,
                text: upgradeCost === null ? "Upgrade cost: MAX" : `Upgrade: $${upgradeCost}`,
                fontSize: 11,
                fontFamily: "Arial",
                fill: upgradeCost === null ? "#607d8b" : canUpgrade ? "#7b1fa2" : "#78909c",
                align: "right",
            });
            itemGroup.add(upgradeCostText);

            popup.add(itemGroup);
        });

        // Close button
        const closeBtn = makeButton(
            { x: STAGE_WIDTH / 2 - 85, y: panelY + panelHeight - 56, width: 170, height: 42, text: "Close Shop", fill: "#607d8b" },
            () => this.hideShopPopup()
        );
        popup.add(closeBtn);

        this.group.add(popup);
        this.shopGroup = popup;
        this.group.getLayer()?.draw();
    }

    hideShopPopup(): void {
        if (this.shopGroup) {
            this.shopGroup.destroy();
            this.shopGroup = null;
            this.group.getLayer()?.draw();
        }
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
