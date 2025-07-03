// =======================================================
//          GADSINO - 30 COINS (slots.js - WERSJA 2.0)
// =======================================================

const API_URL = 'https://gadsino.onrender.com';

const WIDTH = 800, HEIGHT = 960;
const COLS = 5, ROWS = 6;
const CELL_SIZE = 120, PADDING = 10;

const app = new PIXI.Application({ width: WIDTH, height: HEIGHT, backgroundColor: 0x1a1a1a });
document.getElementById('game-container').appendChild(app.view);

const spinButton = document.getElementById('spin-button');
const buyBonusButton = document.getElementById('buy-bonus-button');
const balanceDisplay = document.getElementById('balance');

let gridCells = [];
let isSpinning = false;
let currentUser = null;

PIXI.Loader.shared
    .add('cash_infinity', 'img/30coins/cash_infinity.png')
    .add('mystery', 'img/30coins/mystery.png')
    .add('mini_jackpot', 'img/30coins/mini_jackpot.png')
    .add('minor_jackpot', 'img/30coins/minor_jackpot.png')
    .load(onAssetsLoaded);

function onAssetsLoaded() {
    createGrid();
    spinButton.onclick = () => doSpin();
    buyBonusButton.disabled = true;
    updateUserState();
}

function createGrid() {
    const gridContainer = new PIXI.Container();
    const gridWidth = COLS * (CELL_SIZE + PADDING);
    const gridHeight = ROWS * (CELL_SIZE + PADDING);
    gridContainer.x = (WIDTH - gridWidth) / 2 + PADDING / 2;
    gridContainer.y = (HEIGHT - gridHeight) / 2 + PADDING / 2;
    app.stage.addChild(gridContainer);

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cellContainer = new PIXI.Container();
            cellContainer.x = col * (CELL_SIZE + PADDING);
            cellContainer.y = row * (CELL_SIZE + PADDING);
            
            const cellBg = new PIXI.Graphics();
            const isActiveZone = row >= 1 && row <= 3;
            cellBg.beginFill(0x000000, isActiveZone ? 0.5 : 0.3);
            cellBg.lineStyle(2, isActiveZone ? 0xffa502 : 0x444444, 1);
            cellBg.drawRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 15);
            cellBg.endFill();
            cellContainer.addChild(cellBg);

            gridContainer.addChild(cellContainer);
            gridCells.push(cellContainer);
        }
    }
}

function updateGrid(gridData) {
    for (let i = 0; i < gridData.length; i++) {
        const cellContainer = gridCells[i];
        const symbolData = gridData[i];
        while (cellContainer.children.length > 1) { cellContainer.removeChildAt(1); }

        if (symbolData) {
            let textureName = '';
            switch (symbolData.type) {
                case 'CASH_INFINITY': textureName = 'cash_infinity'; break;
                case 'MYSTERY': textureName = 'mystery'; break;
                case 'MINI_JACKPOT': textureName = 'mini_jackpot'; break;
                case 'MINOR_JACKPOT': textureName = 'minor_jackpot'; break;
            }

            if (textureName) {
                const symbolSprite = new PIXI.Sprite(PIXI.Loader.shared.resources[textureName].texture);
                symbolSprite.width = CELL_SIZE;
                symbolSprite.height = CELL_SIZE;
                cellContainer.addChild(symbolSprite);

                if (symbolData.type === 'CASH_INFINITY' && symbolData.value) {
                    const valueText = new PIXI.Text(symbolData.value, { fontFamily: 'Arial', fontSize: 48, fill: 'white', stroke: 'black', strokeThickness: 5, fontWeight: 'bold' });
                    valueText.anchor.set(0.5);
                    valueText.position.set(CELL_SIZE / 2, CELL_SIZE / 2);
                    cellContainer.addChild(valueText);
                }
            }
        }
    }
}

async function doSpin() {
    if (isSpinning) return;
    isSpinning = true;
    toggleControls(false);

    try {
        const response = await fetch(`${API_URL}/30coins/spin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username })
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Błąd serwera!');
        }
        const data = await response.json();
        balanceDisplay.textContent = `${data.newBalance} żetonów`;
        updateGrid(data.grid);
        if (data.bonusTriggered) {
            setTimeout(() => alert("BONUS URUCHOMIONY!"), 500);
        }
    } catch (error) {
        alert(error.message);
    } finally {
        isSpinning = false;
        toggleControls(true);
    }
}

// Funkcje pomocnicze
async function updateUserState() {
    const userFromStorage = JSON.parse(localStorage.getItem('user'));
    if (!userFromStorage || !userFromStorage.username) {
        balanceDisplay.textContent = "Niezalogowany";
        toggleControls(false);
        return;
    }
    currentUser = userFromStorage;
    try {
        const response = await fetch(`${API_URL}/player/${currentUser.username}`);
        if (!response.ok) throw new Error('Błąd serwera przy pobieraniu salda.');
        const data = await response.json();
        balanceDisplay.textContent = `${data.balance} żetonów`;
        toggleControls(true);
    } catch (error) {
        console.error("Błąd pobierania salda:", error);
        balanceDisplay.textContent = "Błąd salda";
        toggleControls(false);
    }
}

function toggleControls(enabled) {
    spinButton.disabled = !enabled;
}
