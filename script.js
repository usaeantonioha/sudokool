document.addEventListener('DOMContentLoaded', () => {
    // ESTADO
    let selectedTile = null;

    // ELEMENTOS
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const boardElement = document.getElementById('board');
    const keypadElement = document.getElementById('keypad');

    // BOTÓN S (Acerca de)
    document.getElementById('main-menu-logo').addEventListener('click', () => {
        document.getElementById('about-overlay').classList.add('active');
    });

    // BOTÓN TUERCA (Ajustes)
    document.getElementById('settings-btn').addEventListener('click', () => {
        document.getElementById('settings-overlay').classList.add('active');
    });

    // CERRAR VENTANAS
    document.querySelectorAll('.close-overlay').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.overlay').forEach(ov => ov.classList.remove('active'));
        });
    });

    // GENERAR BOTONES DE DIFICULTAD (Centrados y del mismo tamaño)
    function createMenu() {
        const diffContainer = document.getElementById('difficulty-buttons');
        const niveles = ['Fácil', 'Medio', 'Difícil', 'Experto'];
        diffContainer.innerHTML = '';
        
        niveles.forEach(n => {
            const btn = document.createElement('button');
            btn.className = `difficulty-btn btn-${n.toLowerCase()}`;
            btn.textContent = n;
            btn.onclick = () => startGame(n);
            diffContainer.appendChild(btn);
        });
    }

    function startGame(level) {
        startScreen.classList.remove('active');
        gameScreen.classList.add('active');
        initBoard();
    }

    // INICIAR TABLERO (Simplificado para ejemplo, mantén tu lógica de generación)
    function initBoard() {
        boardElement.innerHTML = '';
        for (let i = 0; i < 81; i++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.index = i;
            tile.addEventListener('click', () => selectTile(tile));
            boardElement.appendChild(tile);
        }
        initKeypad();
    }

    function initKeypad() {
        keypadElement.innerHTML = '';
        for (let i = 1; i <= 9; i++) {
            const btn = document.createElement('button');
            btn.className = 'keypad-number';
            btn.textContent = i;
            btn.onclick = () => {
                if (selectedTile) selectedTile.textContent = i;
            };
            keypadElement.appendChild(btn);
        }
    }

    function selectTile(tile) {
        if (selectedTile) selectedTile.classList.remove('selected');
        selectedTile = tile;
        selectedTile.classList.add('selected');
    }

    // Volver al menú
    document.getElementById('back-to-menu').addEventListener('click', () => {
        gameScreen.classList.remove('active');
        startScreen.classList.add('active');
    });

    createMenu();
});
