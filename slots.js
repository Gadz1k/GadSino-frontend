// =======================================================
//          GADSINO - 30 COINS (slots.js - WERSJA 3.1)
// =======================================================

const API_URL = 'https://gadsino.onrender.com';

// --- USTAWIENIA GRY ---
const WIDTH = 800, HEIGHT = 960;
const COLS = 5, ROWS = 6;
const CELL_SIZE = 120, PADDING = 10;
const BET_LEVELS = [10, 20, 40, 80, 160];
let currentBetIndex = 0;
let isInBonusMode = false;
let reSpinsLeft = 3;

// --- INICJALIZACJA APLIKACJI PIXI.JS ---
const app = new PIXI.Application({ width: WIDTH, height: HEIGHT, backgroundColor: 0x1a1a1a });
document.getElementById('game-container').appendChild(app.view);

// --- REFERENCJE DO ELEMENTÓW HTML ---
const spinButton = document.getElementById('spin-button');
const buyBonusButton = document.getElementById('buy-bonus-button');
const balanceDisplay = document.getElementById('balance');
const betUpBtn = document.getElementById('bet-up-btn');
const betDownBtn = document.getElementById('bet-down-btn');
const betDisplay = document.getElementById('bet-display');
const buyBonusModal = document.getElementById('buy-bonus-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const bonusOptionsContainer = document.querySelector('.bonus-options');
const reSpinCounterElement = document.getElementById('respin-counter'); // Upewnij się, że masz to w HTML

// --- ZMIENNE GLOBALNE STANU GRY ---
let gridCells = [];
let isSpinning = false;
let currentUser = null;

// --- ŁADOWANIE GRAFIK ---
PIXI.Loader.shared
    .add('background', 'img/30coins/grid_background.png') // POPRAWIONA ŚCIEŻKA
    .add('cash_infinity', 'img/30coins/cash_infinity.png')
    .add('mystery', 'img/30coins/mystery.png')
    .add('mini_jackpot', 'img/30coins/mini_jackpot.png')
    .add('minor_jackpot', 'img/30coins/minor_jackpot.png')
    .load(onAssetsLoaded);

PIXI.Loader.shared.onError.add((error, loader, resource) => {
    console.error("BŁĄD ŁADOWANIA GRAFIKI:", resource.url, error);
    alert(`Nie udało się załadować pliku: ${resource.url}. Sprawdź, czy plik na pewno istnieje w tej lokalizacji i czy nazwa jest poprawna.`);
});


// --- GŁÓWNA FUNKCJA URUCHAMIANA PO ZAŁADOWANIU GRAFIK ---
function onAssetsLoaded() {
    if (PIXI.Loader.shared.resources.background.texture) {
        const background = new PIXI.Sprite(PIXI.Loader.shared.resources.background.texture);
        background.width = WIDTH;
        background.height = HEIGHT;
        app.stage.addChild(background);
    }
    
    createGrid();
    
    spinButton.onclick = () => doSpin();
    buyBonusButton.onclick = () => showBuyBonusModal();
    closeModalBtn.onclick = () => hideBuyBonusModal();
    betUpBtn.onclick = () => updateBet(1);
    betDownBtn.onclick = () => updateBet(-1);
    bonusOptionsContainer.onclick = (e) => {
        if (e.target.tagName === 'BUTTON') {
            const option = e.target.closest('.bonus-option');
            const bonusType = option.dataset.bonusType;
            doBuyBonus(bonusType);
        }
    };
    
    updateBet(0);
    updateUserState();
}

// --- FUNKCJE TWORZENIA I AKTUALIZACJI SIATKI ---
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
            const isActiveZone = (row >= 1 && row <= 3) && (col >= 1 && col <= 3);
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

// POPRAWIONA LOGIKA AKTUALIZACJI SIATKI
function updateGrid(gridData) {
    for (let i = 0; i < gridData.length; i++) {
        const cellContainer = gridCells[i];
        const newSymbolData = gridData[i];

        // 1. Czyść tylko jeśli pole nie jest lepkie
        if (!cellContainer.isSticky) {
            while (cellContainer.children.length > 1) { cellContainer.removeChildAt(1); }
            cellContainer.symbolData = null;
        }

        // 2. Rysuj nowy symbol, jeśli go nie ma
        if (newSymbolData && !cellContainer.symbolData) {
            cellContainer.symbolData = newSymbolData;
            cellContainer.isSticky = newSymbolData.sticky;

            let textureName = '';
            switch (newSymbolData.type) {
                case 'CASH_INFINITY': textureName = 'cash_infinity'; break;
                case 'MYSTERY': textureName = 'mystery'; break;
                case 'MINI_JACKPOT': textureName = 'mini_jackpot'; break;
                case 'MINOR_JACKPOT': textureName = 'minor_jackpot'; break;
            }

            if (textureName && PIXI.Loader.shared.resources[textureName]) {
                const symbolSprite = new PIXI.Sprite(PIXI.Loader.shared.resources[textureName].texture);
                symbolSprite.width = CELL_SIZE;
                symbolSprite.height = CELL_SIZE;
                symbolSprite.y = -CELL_SIZE;
                const targetY = 0;
                cellContainer.addChild(symbolSprite);

                const delay = i * 25;
                setTimeout(() => {
                    tweenTo(symbolSprite, 'y', targetY, 500, backout(0.5));
                }, delay);

                if (newSymbolData.type === 'CASH_INFINITY' && newSymbolData.value) {
                    const valueText = new PIXI.Text(newSymbolData.value, { fontFamily: 'Arial', fontSize: 48, fill: 'white', stroke: 'black', strokeThickness: 5, fontWeight: 'bold' });
                    valueText.anchor.set(0.5);
                    valueText.position.set(CELL_SIZE / 2, CELL_SIZE / 2);
                    valueText.alpha = 0;
                    cellContainer.addChild(valueText);
                    setTimeout(() => {
                        tweenTo(valueText, 'alpha', 1, 300, t => t);
                    }, delay + 400);
                }
            }
        }
    }
}


// --- GŁÓWNE FUNKCJE GRY ---
function doSpin() {
    if (isSpinning) return;
    if (isInBonusMode) { doBonusSpin(); } 
    else { doBaseGameSpin(); }
}

async function doBaseGameSpin() {
    isSpinning = true;
    toggleControls(false);
    try {
        const currentBet = BET_LEVELS[currentBetIndex]; // POPRAWKA: wysyłanie stawki
        const response = await fetch(`${API_URL}/30coins/spin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username, bet: currentBet })
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Błąd serwera!');
        }
        const data = await response.json();
        balanceDisplay.textContent = `${data.newBalance} żetonów`;
        updateGrid(data.grid);

        if (data.bonusTriggered) {
            const bonusSymbols = [];
            for (let i = 0; i < data.grid.length; i++) {
                if (data.grid[i] && gridCells[i].children[1]) {
                    bonusSymbols.push(gridCells[i].children[1]);
                }
            }
            bonusSymbols.forEach((sprite) => {
                const originalScale = sprite.scale.x;
                tweenTo(sprite.scale, 'x', originalScale * 1.15, 200, backout(0.5), null, () => {
                    tweenTo(sprite.scale, 'x', originalScale, 400, backout(0.5));
                });
                tweenTo(sprite.scale, 'y', originalScale * 1.15, 200, backout(0.5), null, () => {
                    tweenTo(sprite.scale, 'y', originalScale, 400, backout(0.5));
                });
            });
            setTimeout(() => startBonusMode(data.grid), 1500); // POPRAWKA: opóźnienie startu bonusu
        } else {
            isSpinning = false;
            toggleControls(true);
        }
    } catch (error) {
        alert(error.message);
        isSpinning = false;
        toggleControls(true);
    }
}

function startBonusMode(initialGrid) {
    console.log("URUCHAMIAM TRYB BONUSOWY!");
    isInBonusMode = true;
    reSpinsLeft = 3;
    reSpinCounterElement.classList.remove('hidden');
    reSpinCounterElement.querySelector('span').textContent = reSpinsLeft;
    buyBonusButton.disabled = true;
    setTimeout(() => doBonusSpin(), 1000);
}

async function doBonusSpin() {
    isSpinning = true;
    toggleControls(false, true); // Blokuj wszystko oprócz licznika
    try {
        const currentGridState = gridCells.map(cell => cell.symbolData || null);
        const response = await fetch(`${API_URL}/30coins/bonus-spin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username, grid: currentGridState })
        });
        const data = await response.json();
        updateGrid(data.grid);
        if (data.hasLandedNewSymbol) {
            reSpinsLeft = 3;
        } else {
            reSpinsLeft--;
        }
        reSpinCounterElement.querySelector('span').textContent = reSpinsLeft;
        if (reSpinsLeft <= 0 || data.bonusEnded) {
            endBonusMode(data.grid);
        } else {
            setTimeout(() => doBonusSpin(), 1000);
        }
    } catch (error) {
        alert(error.message);
        endBonusMode(gridCells.map(cell => cell.symbolData || null));
    }
}

function endBonusMode(finalGrid) {
    isInBonusMode = false;
    isSpinning = false;
    reSpinCounterElement.classList.add('hidden');
    toggleControls(true);
    let totalWin = 0;
    finalGrid.forEach(symbol => {
        if (symbol && symbol.type === 'CASH_INFINITY') {
            totalWin += symbol.value;
        }
    });
    alert(`Koniec bonusu! Wygrałeś: ${totalWin} żetonów!`);
    updateUserState();
}

async function doBuyBonus(bonusType) {
    hideBuyBonusModal();
    console.log(`Próba zakupu bonusu typu: ${bonusType} za stawkę ${BET_LEVELS[currentBetIndex]}`);
    alert(`Logika zakupu bonusu '${bonusType}' nie została jeszcze zaimplementowana na backendzie.`);
}


// --- FUNKCJE POMOCNICZE I UI ---
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

function updateBet(direction) {
    currentBetIndex += direction;
    if (currentBetIndex < 0) currentBetIndex = 0;
    if (currentBetIndex >= BET_LEVELS.length) currentBetIndex = BET_LEVELS.length - 1;
    betDisplay.textContent = BET_LEVELS[currentBetIndex];
}

function showBuyBonusModal() {
    buyBonusModal.classList.remove('hidden');
}

function hideBuyBonusModal() {
    buyBonusModal.classList.add('hidden');
}

function toggleControls(enabled, isBonusSpin = false) {
    spinButton.disabled = !enabled;
    betUpBtn.disabled = !enabled || isBonusSpin;
    betDownBtn.disabled = !enabled || isBonusSpin;
    buyBonusButton.disabled = !enabled || isInBonusMode;
}


// =======================================================
//          FUNKCJE POMOCNICZE DO ANIMACJI (TWEENING)
// =======================================================
const tweening = [];
function tweenTo(object, property, target, time, easing, onchange, oncomplete) {
    const tween = { object, property, target, easing, oncomplete, time, start: Date.now() };
    tweening.push(tween);
    return tween;
}
app.ticker.add(() => {
    const now = Date.now();
    const remove = [];
    for (let i = 0; i < tweening.length; i++) {
        const t = tweening[i];
        const phase = Math.min(1, (now - t.start) / t.time);
        t.object[t.property] = t.object[t.property] + (t.target - t.object[t.property]) * t.easing(phase);
        if (t.onchange) { t.onchange(t); }
        if (phase === 1) {
            t.object[t.property] = t.target;
            if (t.oncomplete) { t.oncomplete(t); }
            remove.push(t);
        }
    }
    for (let i = 0; i < remove.length; i++) {
        tweening.splice(tweening.indexOf(remove[i]), 1);
    }
});
function backout(amount) {
    return (t) => (--t * t * ((amount + 1) * t + amount) + 1);
}
