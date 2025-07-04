// =======================================================
//          GADSINO - 30 COINS (slots.js - WERSJA 3.0 FINALNA)
// =======================================================

const API_URL = 'https://gadsino.onrender.com';

// --- USTAWIENIA GRY ---
const WIDTH = 800, HEIGHT = 960;
const COLS = 5, ROWS = 6;
const CELL_SIZE = 120, PADDING = 10;
const BET_LEVELS = [10, 20, 40, 80, 160]; // Dostępne poziomy stawek
let currentBetIndex = 0; // Indeks aktualnie wybranej stawki

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

// --- ZMIENNE GLOBALNE STANU GRY ---
let gridCells = [];
let isSpinning = false;
let currentUser = null;

// --- ŁADOWANIE GRAFIK ---
PIXI.Loader.shared
    .add('background', 'img/slots/grid_background.png')
    .add('cash_infinity', 'img/slots/cash_infinity.png')
    .add('mystery', 'img/slots/mystery.png')
    .add('mini_jackpot', 'img/slots/mini_jackpot.png')
    .add('minor_jackpot', 'img/slots/minor_jackpot.png')
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
    
    // Podpięcie wszystkich przycisków
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
    
    updateBet(0); // Ustawienie początkowej stawki na wyświetlaczu
    updateUserState(); // Pobranie danych gracza
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

            if (textureName && PIXI.Loader.shared.resources[textureName]) {
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

// --- GŁÓWNE FUNKCJE GRY ---
async function doSpin() {
    if (isSpinning) return;
    isSpinning = true;
    toggleControls(false);

    try {
        const currentBet = BET_LEVELS[currentBetIndex]; // Pobranie aktualnej stawki
        const response = await fetch(`${API_URL}/30coins/spin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username, bet: currentBet }) // Wysłanie stawki
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

async function doBuyBonus(bonusType) {
    hideBuyBonusModal();
    console.log(`Próba zakupu bonusu typu: ${bonusType} za stawkę ${BET_LEVELS[currentBetIndex]}`);
    alert(`Logika zakupu bonusu '${bonusType}' nie została jeszcze zaimplementowana na backendzie.`);
    // W przyszłości:
    // isSpinning = true;
    // toggleControls(false);
    // fetch do nowego endpointu /30coins/buy-bonus
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
    if (currentBetIndex < 0) {
        currentBetIndex = 0;
    }
    if (currentBetIndex >= BET_LEVELS.length) {
        currentBetIndex = BET_LEVELS.length - 1;
    }
    betDisplay.textContent = BET_LEVELS[currentBetIndex];
}

function showBuyBonusModal() {
    buyBonusModal.classList.remove('hidden');
}

function hideBuyBonusModal() {
    buyBonusModal.classList.add('hidden');
}

function toggleControls(enabled) {
    spinButton.disabled = !enabled;
    buyBonusButton.disabled = !enabled;
    betUpBtn.disabled = !enabled;
    betDownBtn.disabled = !enabled;
}
