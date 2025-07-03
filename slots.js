// Plik: slots.js (WERSJA TESTOWA)

const app = new PIXI.Application({ width: 800, height: 600, backgroundColor: 0x1a1a1a });
document.getElementById('game-container').appendChild(app.view);

// Sprawdź, czy na pewno masz te pliki w folderze /img/slots/
const ASSETS = {
    wisnia: 'img/slots/wisnia.png',
    dzwon: 'img/slots/dzwon.png',
    siódemka: 'img/slots/siodemka.png',
    BAR: 'img/slots/bar.png'
};

PIXI.Loader.shared
    .add('wisnia', ASSETS.wisnia)
    .add('dzwon', ASSETS.dzwon)
    .add('siódemka', ASSETS.siódemka)
    .add('BAR', ASSETS.BAR)
    .load(onAssetsLoaded);

function onAssetsLoaded() {
    console.log("Grafiki załadowane poprawnie! Rysuję automat...");

    const REEL_WIDTH = 200;
    const SYMBOL_SIZE = 180;
    
    const reelContainer = new PIXI.Container();
    app.stage.addChild(reelContainer);

    for (let i = 0; i < 3; i++) {
        const rc = new PIXI.Container();
        rc.x = i * REEL_WIDTH + 100;
        reelContainer.addChild(rc);

        for (let j = 0; j < 3; j++) {
            // Rysujemy symbole startowe
            const symbol = new PIXI.Sprite(PIXI.Loader.shared.resources['wisnia'].texture);
            symbol.y = j * SYMBOL_SIZE + 30; // proste ułożenie
            symbol.scale.x = symbol.scale.y = Math.min(SYMBOL_SIZE / symbol.width, SYMBOL_SIZE / symbol.height);
            symbol.x = Math.round((SYMBOL_SIZE - symbol.width) / 2);
            rc.addChild(symbol);
        }
    }
    document.getElementById('spin-button').disabled = false;
    document.getElementById('buy-bonus-button').disabled = false;
}

// Obsługa błędów ładowania
PIXI.Loader.shared.onError.add((error, loader, resource) => {
    console.error("Błąd ładowania grafiki:", resource.name, resource.url, error);
    alert(`Nie udało się załadować pliku: ${resource.url}. Sprawdź ścieżkę i nazwę pliku.`);
});
