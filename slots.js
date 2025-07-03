// =======================================================
//          GADSINO - SLOTS.JS (WERSJA FINALNA)
// =======================================================
// --- STAŁA Z ADRESEM SERWERA ---
const API_URL = 'https://gadsino.onrender.com';
// --- USTAWIENIA GRY ---
const WIDTH = 800;
const HEIGHT = 600;
const REEL_WIDTH = 200;
const SYMBOL_SIZE = 180;
const BET_AMOUNT = 10; // Domyślna stawka za spin

// --- INICJALIZACJA APLIKACJI PIXI.JS ---
const app = new PIXI.Application({ width: WIDTH, height: HEIGHT, backgroundColor: 0x1a1a1a });
document.getElementById('game-container').appendChild(app.view);

// --- REFERENCJE DO ELEMENTÓW HTML ---
const spinButton = document.getElementById('spin-button');
const buyBonusButton = document.getElementById('buy-bonus-button');
const balanceDisplay = document.getElementById('balance');

// --- ZMIENNE GLOBALNE STANU GRY ---
let reels = [];
let isSpinning = false;
let currentUser = null;

// --- ŁADOWANIE GRAFIK ---
PIXI.Loader.shared
    .add('wisnia', 'img/slots/wisnia.png')
    .add('dzwon', 'img/slots/dzwon.png')
    .add('siódemka', 'img/slots/siodemka.png')
    .add('BAR', 'img/slots/bar.png')
    .load(onAssetsLoaded);

// --- GŁÓWNA FUNKCJA URUCHAMIANA PO ZAŁADOWANIU GRAFIK ---
function onAssetsLoaded() {
    const reelContainer = new PIXI.Container();
    app.stage.addChild(reelContainer);

    // Stworzenie bębnów i wypełnienie ich startowymi symbolami
    for (let i = 0; i < 3; i++) {
        const rc = new PIXI.Container();
        rc.x = i * REEL_WIDTH + 100;
        reelContainer.addChild(rc);

        const reel = {
            container: rc,
            symbols: [],
            position: 0,
            previousPosition: 0,
            blur: new PIXI.filters.BlurFilter()
        };
        reel.blur.blurX = 0;
        reel.blur.blurY = 0;
        rc.filters = [reel.blur];

        for (let j = 0; j < 4; j++) {
            const symbol = new PIXI.Sprite(PIXI.Loader.shared.resources['wisnia'].texture);
            symbol.y = j * SYMBOL_SIZE;
            symbol.scale.x = symbol.scale.y = Math.min(SYMBOL_SIZE / symbol.width, SYMBOL_SIZE / symbol.height);
            symbol.x = Math.round((SYMBOL_SIZE - symbol.width) / 2);
            reel.symbols.push(symbol);
            rc.addChild(symbol);
        }
        reels.push(reel);
    }
    
    // Ustawienie maski, żeby symbole nie wychodziły poza obszar
    const margin = 50;
    const slotMask = new PIXI.Graphics();
    slotMask.beginFill(0xFFFFFF);
    slotMask.drawRect(margin, margin, WIDTH - margin * 2, HEIGHT - margin * 2);
    slotMask.endFill();
    reelContainer.mask = slotMask;

    // Podpięcie przycisków
    spinButton.onclick = () => doSpin();
    buyBonusButton.onclick = () => doBuyBonus();

    // Pobranie stanu użytkownika i salda
    updateUserState();
}

// --- LOGIKA UŻYTKOWNIKA I SALDA ---
async function updateUserState() {
    const userFromStorage = JSON.parse(localStorage.getItem('user'));
    
    if (!userFromStorage || !userFromStorage.username) {
        balanceDisplay.textContent = "Niezalogowany";
        toggleControls(false);
        return;
    }
    
    currentUser = userFromStorage;

    try {
        // POPRAWKA TUTAJ: Dodano API_URL
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

// --- GŁÓWNA FUNKCJA SPINA ---
async function doSpin() {
    if (isSpinning) return;
    isSpinning = true;
    toggleControls(false);

    try {
        const response = await fetch(`${API_URL}/slots/spin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username, bet: BET_AMOUNT })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Błąd serwera!');
        }
        
        const data = await response.json();
        balanceDisplay.textContent = `${data.newBalance} żetonów`;
        startReelAnimation(data.reels, data.winAmount);

    } catch (error) {
        alert(error.message); // Pokaż błąd użytkownikowi
        isSpinning = false;
        toggleControls(true);
    }
}

// --- FUNKCJA ZAKUPU BONUSA ---
async function doBuyBonus() {
    if (isSpinning) return;
    isSpinning = true;
    toggleControls(false);

    try {
        const response = await fetch(`${API_URL}/slots/buy-bonus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username, bet: BET_AMOUNT })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Błąd serwera przy zakupie bonusu!');
        }

        const data = await response.json();
        balanceDisplay.textContent = `${data.newBalance} żetonów`;
        startReelAnimation(data.reels, data.winAmount);

    } catch (error) {
        alert(error.message); // Pokaż błąd użytkownikowi
        isSpinning = false;
        toggleControls(true);
    }
}

// --- LOGIKA ANIMACJI BĘBNÓW ---
function startReelAnimation(finalReels, winAmount) {
    for (let i = 0; i < reels.length; i++) {
        const reel = reels[i];
        const extra = Math.floor(Math.random() * 3);
        const target = reel.position + 10 + i * 5 + extra;
        const time = 2500 + i * 600;
        
        tweenTo(reel, 'position', target, time, backout(0.5), null, i === reels.length - 1 ? () => reelsComplete(finalReels, winAmount) : null);
    }
}

function reelsComplete(finalReels, winAmount) {
    // Ustawienie finalnych symboli na środkowej pozycji, żeby były dobrze widoczne
    for(let i = 0; i < reels.length; i++) {
        const finalSymbolName = finalReels[i];
        const centerSymbol = reels[i].symbols[1]; // Środkowy symbol w widoku
        centerSymbol.texture = PIXI.Loader.shared.resources[finalSymbolName].texture;
        
        // Zaktualizuj też sąsiadujące symbole, żeby wyglądało to spójnie
        const topSymbol = reels[i].symbols[0];
        const bottomSymbol = reels[i].symbols[2];
        topSymbol.texture = PIXI.Loader.shared.resources[Object.keys(PIXI.Loader.shared.resources)[Math.floor(Math.random()*4)]].texture;
        bottomSymbol.texture = PIXI.Loader.shared.resources[Object.keys(PIXI.Loader.shared.resources)[Math.floor(Math.random()*4)]].texture;
    }

    if (winAmount > 0) {
        console.log(`WYGRANA: ${winAmount}`);
        // Tutaj można dodać animację wygranej, np. podświetlenie symboli
    }

    isSpinning = false;
    toggleControls(true);
}

// Pętla animacji (ticker) - odpowiada za płynny ruch
app.ticker.add(() => {
    for (const reel of reels) {
        reel.blur.blurY = (reel.position - reel.previousPosition) * 8;
        reel.previousPosition = reel.position;

        for (let j = 0; j < reel.symbols.length; j++) {
            const symbol = reel.symbols[j];
            const prevY = symbol.y;
            symbol.y = ((reel.position + j) % reel.symbols.length) * SYMBOL_SIZE - SYMBOL_SIZE;
            if (symbol.y < 0 && prevY > SYMBOL_SIZE) {
                // Symbol przeskoczył na górę, zmień jego teksturę na losową
                const randomSymbol = Object.keys(PIXI.Loader.shared.resources)[Math.floor(Math.random() * 4)];
                symbol.texture = PIXI.Loader.shared.resources[randomSymbol].texture;
            }
        }
    }
});

// --- FUNKCJE POMOCNICZE ---
function toggleControls(enabled) {
    spinButton.disabled = !enabled;
    buyBonusButton.disabled = !enabled;
}

const tweening = [];
function tweenTo(object, property, target, time, easing, onchange, oncomplete) {
    const tween = { object, property, target, easing, oncomplete, time, start: Date.now() };
    tweening.push(tween);
    return tween;
}

app.ticker.add(() => {
    const now = Date.now();
    const remove = [];
    for (const t of tweening) {
        const phase = Math.min(1, (now - t.start) / t.time);
        t.object[t.property] = (t.target - t.object[t.property]) * t.easing(phase) + t.object[t.property];
        if (phase === 1) {
            t.object[t.property] = t.target;
            if (t.oncomplete) t.oncomplete(t);
            remove.push(t);
        }
    }
    for (const t of remove) {
        tweening.splice(tweening.indexOf(t), 1);
    }
});

function backout(amount) {
    return (t) => (--t * t * ((amount + 1) * t + amount) + 1);
}
