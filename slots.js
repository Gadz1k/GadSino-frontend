// =======================================================
//          GADSINO - 30 COINS (slots.js)
// =======================================================

const API_URL = 'https://gadsino.onrender.com';

// --- USTAWIENIA GRY ---
const WIDTH = 800;
const HEIGHT = 600;
const COLS = 5;
const ROWS = 3;
const CELL_SIZE = 120; // Rozmiar pojedynczego pola na siatce
const PADDING = 20;   // Odstęp

// --- INICJALIZACJA APLIKACJI PIXI.JS ---
const app = new PIXI.Application({ width: WIDTH, height: HEIGHT, backgroundColor: 0x1a1a1a });
document.getElementById('game-container').appendChild(app.view);

// --- REFERENCJE DO ELEMENTÓW HTML ---
const spinButton = document.getElementById('spin-button');
const buyBonusButton = document.getElementById('buy-bonus-button'); // Na razie nieaktywny
const balanceDisplay = document.getElementById('balance');

// --- ZMIENNE GLOBALNE STANU GRY ---
let gridCells = [];     // Tablica na wizualne reprezentacje komórek
let isSpinning = false;
let currentUser = null;

// --- ŁADOWANIE GRAFIK ---
PIXI.Loader.shared
    .add('background', 'img/30coins/grid_background.png') // Opcjonalne tło
    .add('cash_infinity', 'img/30coins/cash_infinity.png')
    .load(onAssetsLoaded);

function onAssetsLoaded() {
    // Stworzenie tła
    const background = new PIXI.Sprite(PIXI.Loader.shared.resources.background.texture);
    background.width = WIDTH;
    background.height = HEIGHT;
    app.stage.addChild(background);

    // Stworzenie siatki
    createGrid();

    // Podpięcie przycisków
    spinButton.onclick = () => doSpin();
    buyBonusButton.disabled = true; // Na razie wyłączamy ten przycisk

    // Pobranie stanu użytkownika
    updateUserState();
}

// --- Tworzy wizualną siatkę 5x3 ---
function createGrid() {
    const gridContainer = new PIXI.Container();
    const gridWidth = COLS * (CELL_SIZE + PADDING);
    const gridHeight = ROWS * (CELL_SIZE + PADDING);
    
    // Centrowanie siatki
    gridContainer.x = (WIDTH - gridWidth) / 2 + PADDING;
    gridContainer.y = (HEIGHT - gridHeight) / 2 + PADDING;
    
    app.stage.addChild(gridContainer);

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cellContainer = new PIXI.Container();
            cellContainer.x = col * (CELL_SIZE + PADDING);
            cellContainer.y = row * (CELL_SIZE + PADDING);
            
            // Dodajemy tło dla każdej komórki dla lepszej widoczności
            const cellBg = new PIXI.Graphics();
            cellBg.beginFill(0x000000, 0.3);
            cellBg.drawRoundedRect(0, 0, CELL_SIZE, CELL_SIZE, 15);
            cellBg.endFill();
            cellContainer.addChild(cellBg);

            gridContainer.addChild(cellContainer);
            gridCells.push(cellContainer); // Zapisujemy kontener, aby móc dodawać do niego symbole
        }
    }
}

// --- Aktualizuje siatkę na podstawie danych z serwera ---
function updateGrid(gridData) {
    for (let i = 0; i < gridData.length; i++) {
        const cellContainer = gridCells[i];
        const symbolData = gridData[i];

        // Czyścimy starą zawartość komórki (oprócz tła)
        while (cellContainer.children.length > 1) {
            cellContainer.removeChildAt(1);
        }

        // Jeśli na tym polu jest symbol, rysujemy go
        if (symbolData) {
            if (symbolData.type === 'CASH_INFINITY') {
                const symbolSprite = new PIXI.Sprite(PIXI.Loader.shared.resources.cash_infinity.texture);
                symbolSprite.width = CELL_SIZE;
                symbolSprite.height = CELL_SIZE;

                // Dodajemy tekst z wartością monety
                const valueText = new PIXI.Text(symbolData.value, {
                    fontFamily: 'Arial',
                    fontSize: 48,
                    fill: 'white',
                    stroke: 'black',
                    strokeThickness: 5,
                    fontWeight: 'bold'
                });
                valueText.anchor.set(0.5);
                valueText.position.set(CELL_SIZE / 2, CELL_SIZE / 2);

                cellContainer.addChild(symbolSprite, valueText);
            }
            // Tutaj w przyszłości można dodać obsługę innych symboli
        }
    }
}

// --- Główna funkcja spina dla "30 Coins" ---
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
        updateGrid(data.grid); // Kluczowa funkcja - aktualizuje widok siatki

        if (data.bonusTriggered) {
            // Na razie prosty alert, w przyszłości tu będzie start rundy bonusowej
            alert("BONUS URUCHOMIONY!");
        }

    } catch (error) {
        alert(error.message);
    } finally {
        isSpinning = false;
        toggleControls(true);
    }
}

// --- Funkcje pomocnicze ---
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
