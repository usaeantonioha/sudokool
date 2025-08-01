document.addEventListener('DOMContentLoaded', () => {
    // --- VARIABLES GLOBALES ---
    let solution = [];
    let puzzleBoard = [];
    let lives = 3;
    let selectedTile = null;
    let currentDifficulty = 'medio';
    let streaks = { fácil: 0, medio: 0, difícil: 0, experto: 0 };

    // --- ELEMENTOS DEL DOM ---
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const instructionsScreen = document.getElementById('instructions-screen');
    const aboutScreen = document.getElementById('about-screen');
    
    const boardElement = document.getElementById('board');
    const keypadElement = document.getElementById('keypad');
    const livesCounter = document.getElementById('lives-counter');
    const backToMenuBtn = document.getElementById('back-to-menu');
    const restartBtn = document.getElementById('restart-button');
    const gameOverMsg = document.getElementById('game-over-message');
    const difficultyButtonsContainer = document.getElementById('difficulty-buttons');
    const totalStreakDisplay = document.getElementById('total-streak-display');
    const flashMessage = document.getElementById('flash-message');

    // Botones de las nuevas pantallas
    const infoIcon = document.getElementById('info-icon');
    const mainMenuLogo = document.getElementById('main-menu-logo');
    document.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', () => {
        instructionsScreen.classList.remove('active');
        aboutScreen.classList.remove('active');
    }));

    // --- LÓGICA DE INICIO ---
    function initialize() {
        loadStreaks();
        createDifficultyButtons();
        updateStreakDisplay();
        backToMenuBtn.addEventListener('click', goHome);
        restartBtn.addEventListener('click', goHome);
        infoIcon.addEventListener('click', () => instructionsScreen.classList.add('active'));
        mainMenuLogo.addEventListener('click', () => aboutScreen.classList.add('active'));
    }

    function createDifficultyButtons() {
        const difficulties = ['Fácil', 'Medio', 'Difícil', 'Experto'];
        difficultyButtonsContainer.innerHTML = '';
        difficulties.forEach(diff => {
            const button = document.createElement('button');
            button.className = 'difficulty-btn';
            button.textContent = diff;
            button.dataset.difficulty = diff.toLowerCase();
            button.addEventListener('click', () => startGame(diff.toLowerCase()));

            const streak = streaks[diff.toLowerCase()];
            if (streak > 0) {
                const badge = document.createElement('span');
                badge.className = 'streak-badge';
                badge.textContent = streak;
                button.appendChild(badge);
            }
            difficultyButtonsContainer.appendChild(button);
        });
    }
    
    function startGame(difficulty) {
        currentDifficulty = difficulty;
        lives = 3;
        selectedTile = null;
        let baseBoard = generateEmptyBoard();
        generateSolution(baseBoard);
        solution = JSON.parse(JSON.stringify(baseBoard));
        puzzleBoard = createPuzzle(baseBoard, difficulty);

        updateLivesDisplay();
        renderBoard();
        renderKeypad();
        
        startScreen.classList.remove('active');
        gameScreen.classList.add('active');
    }

    // --- LÓGICA DEL JUEGO ---
    function placeNumber(num) {
        if (!selectedTile || selectedTile.classList.contains('hint')) return;

        const row = parseInt(selectedTile.dataset.row);
        const col = parseInt(selectedTile.dataset.col);

        if (solution[row][col] === num) {
            puzzleBoard[row][col] = num;
            selectedTile.textContent = num;
            selectedTile.classList.add('user-filled');
            highlightTiles(row, col);
            if (checkWin()) endGame(true);
        } else {
            lives--;
            updateLivesDisplay();
            showFlashMessage("Número equivocado");
            if (lives <= 0) endGame(false);
        }
        updateKeypad();
    }
    
    function endGame(isWin) {
        if (isWin) {
            streaks[currentDifficulty]++;
            gameOverMsg.textContent = '¡FELICITACIONES!';
            gameOverMsg.className = 'win';
        } else {
            streaks[currentDifficulty] = 0;
            gameOverMsg.textContent = 'Game Over';
            gameOverMsg.className = 'lose';
        }
        saveStreaks();
        gameOverScreen.classList.add('active');
    }
    
    function goHome() {
        gameOverScreen.classList.remove('active');
        gameScreen.classList.remove('active');
        startScreen.classList.add('active');
        createDifficultyButtons();
        updateStreakDisplay();
    }

    // --- RENDERIZADO Y UI ---
    function renderBoard() {
        boardElement.innerHTML = '';
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                if (puzzleBoard[r][c] !== 0) {
                    tile.textContent = puzzleBoard[r][c];
                    tile.classList.add('hint');
                }
                tile.dataset.row = r;
                tile.dataset.col = c;
                tile.addEventListener('click', () => {
                    if (selectedTile) selectedTile.classList.remove('selected');
                    selectedTile = tile;
                    selectedTile.classList.add('selected');
                    highlightTiles(r, c);
                });
                boardElement.appendChild(tile);
            }
        }
    }
    
    function renderKeypad() {
        keypadElement.innerHTML = '';
        for (let i = 1; i <= 9; i++) {
            const key = document.createElement('button');
            key.className = 'keypad-number';
            key.textContent = i;
            key.addEventListener('click', () => placeNumber(i));
            keypadElement.appendChild(key);
        }
        updateKeypad();
    }

    function updateLivesDisplay() {
        livesCounter.innerHTML = '';
        for (let i = 0; i < lives; i++) {
            const lifeBox = document.createElement('div');
            lifeBox.className = 'life-box';
            livesCounter.appendChild(lifeBox);
        }
    }

    function showFlashMessage(message) {
        flashMessage.textContent = message;
        flashMessage.classList.add('show');
        setTimeout(() => {
            flashMessage.classList.remove('show');
        }, 1500);
    }

    function highlightTiles(row, col) {
        row = parseInt(row);
        col = parseInt(col);
        document.querySelectorAll('.tile').forEach(t => t.classList.remove('highlight'));
        
        const num = puzzleBoard[row][col];
        
        for (let i = 0; i < 9; i++) {
            boardElement.children[row * 9 + i].classList.add('highlight');
            boardElement.children[i * 9 + col].classList.add('highlight');
        }
        if (num !== 0) {
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (puzzleBoard[r][c] === num) {
                        boardElement.children[r * 9 + c].classList.add('highlight');
                    }
                }
            }
        }
    }

    // --- LÓGICA DE RACHAS (localStorage) ---
    function saveStreaks() {
        localStorage.setItem('sudokuStreaks', JSON.stringify(streaks));
    }
    function loadStreaks() {
        const savedStreaks = localStorage.getItem('sudokuStreaks');
        if (savedStreaks) streaks = JSON.parse(savedStreaks);
    }
    function updateStreakDisplay() {
        const total = Object.values(streaks).reduce((sum, val) => sum + val, 0);
        totalStreakDisplay.textContent = total > 0 ? `Racha Total: ${total}` : '';
    }

    // --- GENERADOR DE SUDOKU Y HELPERS (sin cambios en la lógica) ---
    function getNumberCounts() {
        const counts = {};
        for(let i = 1; i <= 9; i++) counts[i] = 0;
        for(let r = 0; r < 9; r++) for(let c = 0; c < 9; c++) if(puzzleBoard[r][c] !== 0) counts[puzzleBoard[r][c]]++;
        return counts;
    }
    function updateKeypad() {
        const counts = getNumberCounts();
        document.querySelectorAll('.keypad-number').forEach(key => {
            const num = parseInt(key.textContent);
            if (counts[num] >= 9) key.classList.add('disabled');
            else key.classList.remove('disabled');
        });
    }
    function checkWin() {
        return puzzleBoard.every(row => row.every(cell => cell !== 0));
    }
    function generateEmptyBoard() { return Array(9).fill(0).map(() => Array(9).fill(0)); }
    function generateSolution(board) {
        const find = findEmpty(board);
        if (!find) return true;
        const [row, col] = find;
        const nums = shuffle(Array.from({length: 9}, (_, i) => i + 1));
        for (const num of nums) {
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
        const levels = { 'fácil': 40, 'medio': 50, 'difícil': 60, 'experto': 65 };
        let squaresToRemove = levels[difficulty] || 50;
        let count = 0;
        while (count < squaresToRemove) {
            const row = Math.floor(Math.random() * 9);
            const col = Math.floor(Math.random() * 9);
            if (puzzle[row][col] !== 0) {
                puzzle[row][col] = 0;
                count++;
            }
        }
        return puzzle;
    }
    function findEmpty(board) {
        for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (board[r][c] === 0) return [r, c];
        return null;
    }
    function isValid(board, num, pos) {
        const [r, c] = pos;
        for (let i = 0; i < 9; i++) {
            if (board[r][i] === num && c !== i) return false;
            if (board[i][c] === num && r !== i) return false;
        }
        const boxRow = Math.floor(r / 3) * 3, boxCol = Math.floor(c / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) for (let j = boxCol; j < boxCol + 3; j++) if (board[i][j] === num && (i !== r || j !== c)) return false;
        return true;
    }
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    initialize();
});