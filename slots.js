// --- USTAWIENIA GRY ---
const WIDTH = 800;
const HEIGHT = 600;
const REEL_WIDTH = 200;
const SYMBOL_SIZE = 180;

// --- INICJALIZACJA APLIKACJI PIXI.JS ---
const app = new PIXI.Application({ width: WIDTH, height: HEIGHT, backgroundColor: 0x1a1a1a });
document.getElementById('game-container').appendChild(app.view);

// --- ŁADOWANIE GRAFIK ---
// Upewnij się, że masz te pliki w folderze /img/slots/
PIXI.Loader.shared
    .add('wisnia', 'img/slots/wisnia.png')
    .add('dzwon', 'img/slots/dzwon.png')
    .add('siódemka', 'img/slots/siodemka.png')
    .add('BAR', 'img/slots/bar.png')
    .load(onAssetsLoaded);

const spinButton = document.getElementById('spin-button');
const buyBonusButton = document.getElementById('buy-bonus-button');
const balanceDisplay = document.getElementById('balance');

let reels = [];
let isSpinning = false;
const betAmount = 10; // Przykładowa stawka

function onAssetsLoaded() {
    // Stworzenie kontenerów na bębny
    const reelContainer = new PIXI.Container();
    app.stage.addChild(reelContainer);

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

        // Wypełnienie bębnów symbolami
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

    spinButton.onclick = () => doSpin();
    buyBonusButton.onclick = () => doBuyBonus();

    // TODO: Zaktualizuj saldo gracza przy starcie
    // balanceDisplay.textContent = pobierzSaldoZLocalStorage();
}

// --- GŁÓWNA FUNKCJA SPINA ---
async function doSpin() {
    if (isSpinning) return;
    isSpinning = true;
    toggleControls(false);

    try {
        // Komunikacja z serwerem
        const response = await fetch('/slots/spin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'testuser', bet: betAmount }) // TODO: Pobierz prawdziwą nazwę użytkownika
        });

        if (!response.ok) throw new Error('Błąd serwera!');
        const data = await response.json();
        
        // Mamy wynik od serwera, teraz animujemy
        startReelAnimation(data.reels, data.winAmount);

    } catch (error) {
        console.error(error);
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
        const response = await fetch('/slots/buy-bonus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'testuser', bet: betAmount }) // TODO: Pobierz prawdziwą nazwę użytkownika
        });

        if (!response.ok) throw new Error('Błąd serwera przy zakupie bonusu!');
        const data = await response.json();

        startReelAnimation(data.reels, data.winAmount);

    } catch (error) {
        console.error(error);
        isSpinning = false;
        toggleControls(true);
    }
}


// --- LOGIKA ANIMACJI ---
function startReelAnimation(finalReels, winAmount) {
    // Rozpocznij kręcenie dla każdego bębna
    for (let i = 0; i < reels.length; i++) {
        const reel = reels[i];
        const extra = Math.floor(Math.random() * 3);
        const target = reel.position + 10 + i * 5 + extra; // Losowa długość kręcenia
        const time = 2500 + i * 600; // Czas kręcenia
        
        tweenTo(reel, 'position', target, time, backout(0.5), null, i === reels.length - 1 ? () => reelsComplete(finalReels, winAmount) : null);
    }
}

function reelsComplete(finalReels, winAmount) {
    isSpinning = false;
    toggleControls(true);
    
    // Ustawienie finalnych symboli na środkowej pozycji
    for(let i = 0; i < reels.length; i++) {
        const finalSymbolName = finalReels[i];
        reels[i].symbols[1].texture = PIXI.Loader.shared.resources[finalSymbolName].texture;
    }

    if (winAmount > 0) {
        console.log(`WYGRANA: ${winAmount}`);
        // TODO: Dodaj animację wygranej
    }
    // TODO: Zaktualizuj saldo na ekranie
    // balanceDisplay.textContent = nowesaldo;
}

// Pętla animacji
app.ticker.add((delta) => {
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

function toggleControls(enabled) {
    spinButton.disabled = !enabled;
    buyBonusButton.disabled = !enabled;
}

// --- Funkcje pomocnicze do animacji (tweening) ---
const tweening = [];
function tweenTo(object, property, target, time, easing, onchange, oncomplete) {
    const tween = { object, property, target, time, easing, onchange, oncomplete, start: Date.now() };
    tweening.push(tween);
    return tween;
}
app.ticker.add(() => {
    const now = Date.now();
    const remove = [];
    for (let i = 0; i < tweening.length; i++) {
        const t = tweening[i];
        const phase = Math.min(1, (now - t.start) / t.time);
        t.object[t.property] = lerp(t.object[t.property], t.target, t.easing(phase));
        if (t.onchange) t.onchange(t);
        if (phase === 1) {
            t.object[t.property] = t.target;
            if (t.oncomplete) t.oncomplete(t);
            remove.push(t);
        }
    }
    for (let i = 0; i < remove.length; i++) {
        tweening.splice(tweening.indexOf(remove[i]), 1);
    }
});
function lerp(a1, a2, t) { return a1 * (1 - t) + a2 * t; }
function backout(amount) {
    return (t) => (--t * t * ((amount + 1) * t + amount) + 1);
}
