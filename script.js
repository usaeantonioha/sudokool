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
        totalWins: { fácil: 0, medio: 0, difícil: 0, experto: 0 },
        timerInterval: null,
        secondsElapsed: 0,
        isPaused: false,
        gameInProgress: false,
        // ===== NUEVO: Para guardar la última jugada =====
        lastMove: null // {row, col, prevValue}
    };

    // --- ELEMENTOS DEL DOM ---
    const screens = {
        start: document.getElementById('start-screen'),
        game: document.getElementById('game-screen'),
        gameOver: document.getElementById('game-over-screen'),
        instructions: document.getElementById('instructions-screen'),
        about: document.getElementById('about-screen'),
        pause: document.getElementById('pause-screen')
    };
    const boardElement = document.getElementById('board');
    const keypadElement = document.getElementById('keypad');
    const livesCounter = document.getElementById('lives-counter');
    const backToMenuBtn = document.getElementById('back-to-menu');
    const restartBtn = document.getElementById('restart-button');
    const gameOverMsg = document.getElementById('game-over-message');
    const difficultyButtonsContainer = document.getElementById('difficulty-buttons');
    const flashMessage = document.getElementById('flash-message');
    const ingameStreakDisplay = document.getElementById('ingame-streak-display');
    const infoIcon = document.getElementById('info-icon');
    const mainMenuLogo = document.getElementById('main-menu-logo');
    const timerDisplay = document.getElementById('timer-display');
    const pauseButton = document.getElementById('pause-button');
    const resumeButton = document.getElementById('resume-button');
    const resumeGameBtn = document.getElementById('resume-game-btn');
    const pauseBackToMenuBtn = document.getElementById('pause-back-to-menu');
    const gameOverHomeBtn = document.getElementById('game-over-home-btn');
    // ===== NUEVO: Botón Deshacer =====
    const undoButton = document.getElementById('undo-button');


    // --- LÓGICA DE INICIO ---
    function initialize() {
        loadStreaks();
        loadTotalWins();
        createDifficultyButtons();
        addEventListeners();
    }

    function addEventListeners() {
        backToMenuBtn.addEventListener('click', togglePause);
        restartBtn.addEventListener('click', restartGame);
        infoIcon.addEventListener('click', () => showOverlay('instructions', true));
        mainMenuLogo.addEventListener('click', () => showOverlay('about', true));
        document.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', () => {
            showOverlay('instructions', false);
            showOverlay('about', false);
        }));
        boardElement.addEventListener('click', handleBoardClick);
        keypadElement.addEventListener('click', handleKeypadClick);
        pauseButton.addEventListener('click', togglePause);
        resumeButton.addEventListener('click', togglePause);
        
        resumeGameBtn.addEventListener('click', resumeGame);
        pauseBackToMenuBtn.addEventListener('click', goHomeFromPause);
        gameOverHomeBtn.addEventListener('click', goHome);
        
        // ===== NUEVO: Listener para Deshacer =====
        undoButton.addEventListener('click', undoLastMove);
    }

    function createDifficultyButtons() {
        difficultyButtonsContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();

        const difficultyLevels = [
            { key: 'fácil', name: 'Fácil', unlockCondition: () => true },
            { key: 'medio', name: 'Medio', unlockCondition: () => true },
            { key: 'difícil', name: 'Difícil', unlockCondition: () => true },
            { key: 'experto', name: 'Experto', unlockCondition: () => true }
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
            } 
            
            fragment.appendChild(button);
        });

        difficultyButtonsContainer.appendChild(fragment);
        difficultyButtonsContainer.addEventListener('click', handleDifficultyClick);
    }

    let initialPuzzleForResume = [];

    function startGame(difficulty) {
        gameState.gameInProgress = true;
        resumeGameBtn.style.display = 'none';

        gameState.currentDifficulty = difficulty;
        gameState.lives = 3;
        gameState.selectedTile = null;
        gameState.secondsElapsed = 0;
        gameState.isPaused = false;
        
        // ===== NUEVO: Resetear Deshacer y Errores =====
        gameState.lastMove = null;
        undoButton.style.display = 'none';
        clearAllErrors();
        
        renderTimer();
        startTimer();
        pauseButton.style.display = 'flex';

        let baseBoard = generateEmptyBoard();
        generateSolution(baseBoard);
        gameState.solution = JSON.parse(JSON.stringify(baseBoard));
        gameState.puzzleBoard = createPuzzle(baseBoard, difficulty); 

        updateLivesDisplay();
        updateIngameStreakDisplay();
        renderBoardImproved();
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
        if (gameState.isPaused) return;
        const tile = event.target.closest('.tile');
        if (!tile) return;
        
        gameState.selectedTile = tile; 
        
        highlightTilesFromBoard(tile.dataset.row, tile.dataset.col);
    }
    
    function handleKeypadClick(event) {
        if (gameState.isPaused) return;
        const key = event.target.closest('.keypad-number');
        if (key) {
            const num = parseInt(key.textContent);
            
            if (gameState.selectedTile) {
                 if (!key.classList.contains('disabled')) {
                    placeNumber(num);
                }
            } else {
                highlightNumbersFromKeypad(num);
            }
        }
    }

    // --- LÓGICA DEL JUEGO ---
    
    // ===== MODIFICADO: placeNumber con nueva lógica de error y deshacer =====
    function placeNumber(num) {
        if (!gameState.selectedTile || gameState.selectedTile.classList.contains('hint')) return;

        // Limpia errores de la jugada anterior
        clearErrorHighlights();

        const row = parseInt(gameState.selectedTile.dataset.row);
        const col = parseInt(gameState.selectedTile.dataset.col);
        
        // Guarda el estado *antes* de la jugada
        gameState.lastMove = {
            row: row,
            col: col,
            prevValue: gameState.puzzleBoard[row][col]
        };

        // Pone el número
        gameState.puzzleBoard[row][col] = num;
        gameState.selectedTile.textContent = num;
        gameState.selectedTile.classList.add('user-filled');

        // Resalta la jugada actual
        highlightTilesFromBoard(row, col);
        
        // Muestra el botón deshacer
        undoButton.style.display = 'flex';

        if (gameState.solution[row][col] === num) {
            // JUGADA CORRECTA
            gameState.selectedTile.classList.remove('tile-wrong-number');
            if (checkWin()) {
                endGame(true);
            }
        } else {
            // JUGADA INCORRECTA
            if (navigator.vibrate) {
                navigator.vibrate(200); // Vibración
            }
            // Añade clases de error
            gameState.selectedTile.classList.add('tile-error'); // Flash
            gameState.selectedTile.classList.add('tile-wrong-number'); // Texto rojo
            
            // Resalta el conflicto
            highlightConflicts(row, col, num);
            
            // Quita la animación de flash después de que termine
            setTimeout(() => {
                if(gameState.selectedTile) {
                    gameState.selectedTile.classList.remove('tile-error');
                }
            }, 500);

            // Quita vidas
            gameState.lives--;
            updateLivesDisplay();
            showFlashMessage("Número equivocado");
            if (gameState.lives <= 0) {
                endGame(false);
            }
        }
        updateKeypad();
    }
    
    // ===== NUEVA: Función para deshacer la última jugada =====
    function undoLastMove() {
        if (!gameState.lastMove) return; // No hay nada que deshacer

        const { row, col, prevValue } = gameState.lastMove;
        const tile = boardElement.children[row * 9 + col];

        // Restaura el estado lógico y visual
        gameState.puzzleBoard[row][col] = prevValue;
        tile.textContent = prevValue === 0 ? '' : prevValue;
        
        // Limpia clases de error
        tile.classList.remove('user-filled', 'tile-wrong-number');
        clearErrorHighlights();
        
        // Si el valor anterior era 0, ya no es 'user-filled'
        if (prevValue === 0) {
            tile.classList.remove('user-filled');
        }

        // Reselecciona la celda y resalta
        gameState.selectedTile = tile;
        highlightTilesFromBoard(row, col);
        
        // Oculta el botón y limpia la jugada
        gameState.lastMove = null;
        undoButton.style.display = 'none';
        
        updateKeypad();
    }

    
    function endGame(isWin) {
        stopTimer();
        pauseButton.style.display = 'none';
        gameState.gameInProgress = false;
        resumeGameBtn.style.display = 'none';
        
        // ===== NUEVO: Limpia estado de deshacer y errores =====
        undoButton.style.display = 'none';
        gameState.lastMove = null;
        clearAllErrors();
        
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
        stopTimer();
        pauseButton.style.display = 'none';
        
        gameState.isPaused = false;
        gameState.gameInProgress = false;
        gameState.secondsElapsed = 0;
        resumeGameBtn.style.display = 'none';

        // ===== NUEVO: Limpia estado de deshacer y errores =====
        undoButton.style.display = 'none';
        gameState.lastMove = null;
        clearAllErrors();

        showOverlay('gameOver', false);
        showOverlay('pause', false);
        showScreen('start');
        createDifficultyButtons();
    }
    
    function goHomeFromPause() {
        gameState.isPaused = true;
        gameState.gameInProgress = true;
        
        showOverlay('pause', false);
        showScreen('start');
        
        resumeGameBtn.style.display = 'block';
        pauseButton.style.display = 'none';
        
        // ===== NUEVO: Oculta el botón deshacer en el menú =====
        undoButton.style.display = 'none';
        
        createDifficultyButtons();
    }

    function resumeGame() {
        gameState.isPaused = false;
        renderBoardImproved();
        updateKeypad();
        showScreen('game');
        resumeGameBtn.style.display = 'none';
        pauseButton.style.display = 'flex';
        
        // ===== NUEVO: Muestra el botón deshacer si hay una jugada =====
        if (gameState.lastMove) {
            undoButton.style.display = 'flex';
        }
    }


    // --- RENDERIZADO Y UI ---
    function showScreen(screenKey) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenKey].classList.add('active');
    }

    function showOverlay(overlayKey, show) {
        screens[overlayKey].classList.toggle('active', show);
    }

    function renderBoardImproved() {
        boardElement.innerHTML = '';
        const fragment = document.createDocumentFragment();

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                if (c === 2 || c === 5) tile.classList.add('tile-border-right');
                if (r === 2 || r === 5) tile.classList.add('tile-border-bottom');

                if (initialPuzzleForResume[r][c] !== 0) {
                    tile.textContent = initialPuzzleForResume[r][c];
                    tile.classList.add('hint');
                } 
                else if (gameState.puzzleBoard[r][c] !== 0) {
                    tile.textContent = gameState.puzzleBoard[r][c];
                    tile.classList.add('user-filled');
                    
                    // ===== NUEVO: Vuelve a pintar de rojo si es un error guardado =====
                    if (gameState.solution[r][c] !== gameState.puzzleBoard[r][c]) {
                        tile.classList.add('tile-wrong-number');
                    }
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
        livesCounter.textContent = ❤️'.repeat(gameState.lives);
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
            t.classList.remove('highlight', 'keypad-highlight', 'selected');
        });
    }

    // ===== NUEVO: Limpia solo los resaltados de conflicto =====
    function clearErrorHighlights() {
        document.querySelectorAll('.tile-conflict').forEach(t => {
            t.classList.remove('tile-conflict');
        });
    }

    // ===== NUEVO: Limpia TODOS los errores (para reinicio) =====
    function clearAllErrors() {
        document.querySelectorAll('.tile-conflict, .tile-wrong-number, .tile-error').forEach(t => {
            t.classList.remove('tile-conflict', 'tile-wrong-number', 'tile-error');
        });
    }


    function highlightTilesFromBoard(row, col) {
        const numRow = parseInt(row);
        const numCol = parseInt(col);

        clearAllHighlights(); 
        
        const selectedTileElement = boardElement.children[numRow * 9 + numCol];
        if(selectedTileElement) selectedTileElement.classList.add('selected');

        const num = gameState.puzzleBoard[numRow][numCol];
        
        for (let i = 0; i < 9; i++) {
            boardElement.children[numRow * 9 + i].classList.add('highlight');
            boardElement.children[i * 9 + numCol].classList.add('highlight');
        }

        if (num !== 0) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (gameState.puzzleBoard[r][c] === num) {
                        boardElement.children[r * 9 + c].classList.add('keypad-highlight');
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
    
    // ===== NUEVA: Función para resaltar conflictos =====
    function highlightConflicts(row, col, num) {
        const board = gameState.puzzleBoard;

        // Revisar Fila
        for (let i = 0; i < 9; i++) {
            if (i !== col && board[row][i] === num) {
                boardElement.children[row * 9 + i].classList.add('tile-conflict');
            }
        }
        // Revisar Columna
        for (let i = 0; i < 9; i++) {
            if (i !== row && board[i][col] === num) {
                boardElement.children[i * 9 + col].classList.add('tile-conflict');
            }
        }
        // Revisar Caja 3x3
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (i !== row || j !== col) {
                    if (board[i][j] === num) {
                        boardElement.children[i * 9 + j].classList.add('tile-conflict');
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
    
    // --- LÓGICA DE TIMER Y PAUSA ---
    
    function startTimer() {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = setInterval(updateTimer, 1000);
    }

    function stopTimer() {
        clearInterval(gameState.timerInterval);
    }

    function updateTimer() {
        if (!gameState.isPaused) {
            gameState.secondsElapsed++;
            renderTimer();
        }
    }

    function renderTimer() {
        const minutes = Math.floor(gameState.secondsElapsed / 60).toString().padStart(2, '0');
        const seconds = (gameState.secondsElapsed % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${seconds}`;
    }

    function togglePause() {
        gameState.isPaused = !gameState.isPaused;
        showOverlay('pause', gameState.isPaused);
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
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (gameState.puzzleBoard[r][c] === 0) return false;
            }
        }
        return true;
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
        let attempts = 200;
        
        while (cellsToRemove > 0 && attempts > 0) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (puzzle[row][col] !== 0) {
                puzzle[row][col] = 0;
                cellsToRemove--;
            }
            attempts--;
        }
        initialPuzzleForResume = JSON.parse(JSON.stringify(puzzle));
        return puzzle;
    }

    initialize();
});