document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES ---
    const DIFFICULTIES = {
        FÁCIL: 'fácil',
        MEDIO: 'medio',
        DIFÍCIL: 'difícil',
        EXPERTO: 'experto'
    };
    const CELLS_TO_REMOVE = {
        [DIFFICULTIES.FÁCIL]: 40,
        [DIFFICULTIES.MEDIO]: 50,
        [DIFFICULTIES.DIFÍCIL]: 60,
        [DIFFICULTIES.EXPERTO]: 65
    };

    // --- ESTADO DEL JUEGO ---
    const gameState = {
        solution: [],
        puzzleBoard: [],
        lives: 3,
        selectedTile: null,
        currentDifficulty: DIFFICULTIES.MEDIO,
        streaks: { fácil: 0, medio: 0, difícil: 0, experto: 0 },
        totalWins: { fácil: 0, medio: 0, difícil: 0, experto: 0 }
    };

    // --- ELEMENTOS DEL DOM ---
    const screens = {
        start: document.getElementById('start-screen'),
        game: document.getElementById('game-screen'),
        gameOver: document.getElementById('game-over-screen'),
        instructions: document.getElementById('instructions-screen'),
        about: document.getElementById('about-screen')
    };
    const boardElement = document.getElementById('board');
    const keypadElement = document.getElementById('keypad');
    const livesCounter = document.getElementById('lives-counter');
    const backToMenuBtn = document.getElementById('back-to-menu');
    const restartBtn = document.getElementById('restart-button');
    const gameOverMsg = document.getElementById('game-over-message');
    const difficultyButtonsContainer = document.getElementById('difficulty-buttons');
    const totalStreakDisplay = document.getElementById('total-streak-display');
    const flashMessage = document.getElementById('flash-message');
    const ingameStreakDisplay = document.getElementById('ingame-streak-display');
    const infoIcon = document.getElementById('info-icon');
    const mainMenuLogo = document.getElementById('main-menu-logo');

    // --- LÓGICA DE INICIO ---
    function initialize() {
        loadStreaks();
        loadTotalWins();
        createDifficultyButtons();
        updateStreakDisplay();
        addEventListeners();
    }

    function addEventListeners() {
        backToMenuBtn.addEventListener('click', goHome);
        restartBtn.addEventListener('click', restartGame);
        infoIcon.addEventListener('click', () => showOverlay('instructions', true));
        mainMenuLogo.addEventListener('click', () => showOverlay('about', true));
        document.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', () => {
            showOverlay('instructions', false);
            showOverlay('about', false);
        }));
        boardElement.addEventListener('click', handleBoardClick);
        keypadElement.addEventListener('click', handleKeypadClick);
    }

    function createDifficultyButtons() {
        difficultyButtonsContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        const difficultyLevels = [
            { key: 'fácil', name: 'Fácil', unlockCondition: () => true },
            { key: 'medio', name: 'Medio', unlockCondition: () => gameState.totalWins.fácil >= 1, requirementText: 'Gana 1 en Fácil' },
            { key: 'difícil', name: 'Difícil', unlockCondition: () => gameState.totalWins.medio >= 5, requirementText: 'Gana 5 en Medio' },
            { key: 'experto', name: 'Experto', unlockCondition: () => gameState.totalWins.difícil >= 10, requirementText: 'Gana 10 en Difícil' }
        ];

        difficultyLevels.forEach(level => {
            const button = document.createElement('button');
            button.className = 'difficulty-btn';
            button.dataset.difficulty = level.key;

            const textSpan = document.createElement('span');
            textSpan.textContent = level.name;
            button.appendChild(textSpan);

            const isUnlocked = level.unlockCondition();

            if (isUnlocked) {
                button.classList.add(`btn-${level.key}`);
                const streak = gameState.streaks[level.key];
                if (streak > 0) {
                    const streakSpan = document.createElement('span');
                    streakSpan.className = 'streak-display-menu';
                    streakSpan.textContent = `👑 ${streak}`;
                    button.appendChild(streakSpan);
                }
            } else {
                button.classList.add('locked');
                const legendSpan = document.createElement('span');
                legendSpan.className = 'unlock-criteria';
                legendSpan.textContent = `🔒 ${level.requirementText}`;
                button.appendChild(legendSpan);
            }
            fragment.appendChild(button);
        });

        difficultyButtonsContainer.appendChild(fragment);
        difficultyButtonsContainer.addEventListener('click', handleDifficultyClick);
    }

    function startGame(difficulty) {
        gameState.currentDifficulty = difficulty;
        gameState.lives = 3;
        gameState.selectedTile = null;

        let baseBoard = generateEmptyBoard();
        generateSolution(baseBoard);
        gameState.solution = JSON.parse(JSON.stringify(baseBoard));
        gameState.puzzleBoard = createPuzzle(baseBoard, difficulty);

        updateLivesDisplay();
        updateIngameStreakDisplay();
        renderBoard();
        renderKeypad();
        
        showScreen('game');
    }

    // --- MANEJADORES DE EVENTOS ---
    function handleDifficultyClick(event) {
        const button = event.target.closest('.difficulty-btn');
        if (button && !button.classList.contains('locked')) {
            startGame(button.dataset.difficulty);
        }
    }

    function handleBoardClick(event) {
        const tile = event.target.closest('.tile');
        if (!tile) return;

        if (gameState.selectedTile) {
            gameState.selectedTile.classList.remove('selected');
        }
        gameState.selectedTile = tile;
        gameState.selectedTile.classList.add('selected');
        
        // Esta función se asegura de que el resaltado ocurra siempre al hacer clic
        highlightTilesFromBoard(tile.dataset.row, tile.dataset.col);
    }
    
    function handleKeypadClick(event) {
        const key = event.target.closest('.keypad-number');
        if (key) {
            const num = parseInt(key.textContent);
            highlightNumbersFromKeypad(num);
            
            if (!key.classList.contains('disabled')) {
                placeNumber(num);
            }
        }
    }

    // --- LÓGICA DEL JUEGO ---
    function placeNumber(num) {
        if (!gameState.selectedTile || gameState.selectedTile.classList.contains('hint')) return;

        const row = parseInt(gameState.selectedTile.dataset.row);
        const col = parseInt(gameState.selectedTile.dataset.col);

        gameState.puzzleBoard[row][col] = num;
        gameState.selectedTile.textContent = num;
        gameState.selectedTile.classList.add('user-filled');

        highlightTilesFromBoard(row, col);

        if (gameState.solution[row][col] === num) {
            if (checkWin()) {
                endGame(true);
            }
        } else {
            gameState.lives--;
            updateLivesDisplay();
            showFlashMessage("Número equivocado");
            if (gameState.lives <= 0) {
                endGame(false);
            }
        }
        updateKeypad();
    }
    
    function endGame(isWin) {
        if (isWin) {
            gameState.streaks[gameState.currentDifficulty]++;
            gameState.totalWins[gameState.currentDifficulty]++;
            saveTotalWins();
            
            gameOverMsg.textContent = '¡FELICITACIONES!';
            gameOverMsg.className = 'win';
        } else {
            gameState.streaks[gameState.currentDifficulty] = 0;
            gameOverMsg.textContent = 'Game Over';
            gameOverMsg.className = 'lose';
        }
        saveStreaks();
        showOverlay('gameOver', true);
    }
    
    function restartGame() {
        showOverlay('gameOver', false);
        startGame(gameState.currentDifficulty);
    }

    function goHome() {
        showOverlay('gameOver', false);
        showScreen('start');
        createDifficultyButtons();
        updateStreakDisplay();
    }

    // --- RENDERIZADO Y UI ---
    function showScreen(screenKey) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenKey].classList.add('active');
    }

    function showOverlay(overlayKey, show) {
        screens[overlayKey].classList.toggle('active', show);
    }

    function renderBoard() {
        boardElement.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                if (c === 2 || c === 5) tile.classList.add('tile-border-right');
                if (r === 2 || r === 5) tile.classList.add('tile-border-bottom');

                if (gameState.puzzleBoard[r][c] !== 0) {
                    tile.textContent = gameState.puzzleBoard[r][c];
                    tile.classList.add('hint');
                }
                tile.dataset.row = r;
                tile.dataset.col = c;
                fragment.appendChild(tile);
            }
        }
        boardElement.appendChild(fragment);
    }
    
    function renderKeypad() {
        keypadElement.innerHTML = '';
        const fragment = document.createDocumentFragment();
        for (let i = 1; i <= 9; i++) {
            const key = document.createElement('button');
            key.className = 'keypad-number';
            key.textContent = i;
            fragment.appendChild(key);
        }
        keypadElement.appendChild(fragment);
        updateKeypad();
    }

    function updateLivesDisplay() {
        livesCounter.textContent = '❤️'.repeat(gameState.lives);
    }

    function updateIngameStreakDisplay() {
        const streak = gameState.streaks[gameState.currentDifficulty];
        ingameStreakDisplay.innerHTML = streak > 0 ? `👑 <span class="ingame-streak-number">${streak}</span>` : '';
    }

    function showFlashMessage(message) {
        flashMessage.textContent = message;
        flashMessage.classList.add('show');
        setTimeout(() => flashMessage.classList.remove('show'), 1500);
    }

    // --- LÓGICA DE RESALTADO ---
    function clearAllHighlights() {
        document.querySelectorAll('.tile').forEach(t => {
            t.classList.remove('highlight', 'keypad-highlight');
        });
    }

    function highlightTilesFromBoard(row, col) {
        clearAllHighlights();
        
        const num = gameState.puzzleBoard[row][col];
        
        for (let i = 0; i < 9; i++) {
            boardElement.children[row * 9 + i].classList.add('highlight');
            boardElement.children[i * 9 + col].classList.add('highlight');
        }

        if (num !== 0) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (gameState.puzzleBoard[r][c] === num) {
                        boardElement.children[r * 9 + c].classList.add('highlight');
                    }
                }
            }
        }
    }

    function highlightNumbersFromKeypad(num) {
        clearAllHighlights();
        
        if (num > 0) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (gameState.puzzleBoard[r][c] === num) {
                        boardElement.children[r * 9 + c].classList.add('keypad-highlight');
                    }
                }
            }
        }
    }


    // --- LÓGICA DE RACHAS Y VICTORIAS (localStorage) ---
    function saveStreaks() {
        localStorage.setItem('sudokuStreaks', JSON.stringify(gameState.streaks));
    }
    function loadStreaks() {
        const saved = localStorage.getItem('sudokuStreaks');
        if (saved) gameState.streaks = JSON.parse(saved);
    }
    function saveTotalWins() {
        localStorage.setItem('sudokuTotalWins', JSON.stringify(gameState.totalWins));
    }
    function loadTotalWins() {
        const saved = localStorage.getItem('sudokuTotalWins');
        if (saved) {
            const loadedWins = JSON.parse(saved);
            gameState.totalWins = { ...gameState.totalWins, ...loadedWins };
        }
    }
    function updateStreakDisplay() {
        const total = Object.values(gameState.streaks).reduce((s, v) => s + v, 0);
        totalStreakDisplay.textContent = total > 0 ? `Racha Total: ${total}` : '';
    }

    // --- GENERADOR DE SUDOKU Y HELPERS ---
    function getNumberCounts() {
        const counts = {};
        for (let i = 1; i <= 9; i++) counts[i] = 0;
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (gameState.puzzleBoard[r][c] !== 0) {
                    counts[gameState.puzzleBoard[r][c]]++;
                }
            }
        }
        return counts;
    }

    function updateKeypad() {
        const counts = getNumberCounts();
        document.querySelectorAll('.keypad-number').forEach(key => {
            const num = parseInt(key.textContent);
            key.classList.toggle('disabled', counts[num] >= 9);
        });
    }

    function checkWin() {
        return gameState.puzzleBoard.every(row => row.every(cell => cell !== 0));
    }

    function generateEmptyBoard() {
        return Array(9).fill(0).map(() => Array(9).fill(0));
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function findEmpty(board) {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) return [r, c];
            }
        }
        return null;
    }

    function isValid(board, num, pos) {
        const [row, col] = pos;
        for (let i = 0; i < 9; i++) {
            if (board[row][i] === num && col !== i) return false;
            if (board[i][col] === num && row !== i) return false;
        }
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (board[i][j] === num && (i !== row || j !== col)) return false;
            }
        }
        return true;
    }

    function generateSolution(board) {
        const emptySpot = findEmpty(board);
        if (!emptySpot) return true;
        const [row, col] = emptySpot;
        const numbers = shuffle(Array.from({ length: 9 }, (_, i) => i + 1));

        for (const num of numbers) {
            if (isValid(board, num, [row, col])) {
                board[row][col] = num;
                if (generateSolution(board)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    function createPuzzle(board, difficulty) {
        const puzzle = JSON.parse(JSON.stringify(board));
        let cellsToRemove = CELLS_TO_REMOVE[difficulty] || 50;
        let attempts = 0;
        
        while (cellsToRemove > 0 && attempts < 200) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (puzzle[row][col] !== 0) {
                puzzle[row][col] = 0;
                cellsToRemove--;
            }
            attempts++;
        }
        return puzzle;
    }

    initialize();
});