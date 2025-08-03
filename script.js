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
    const ingameStreakDisplay = document.getElementById('ingame-streak-display');
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
        restartBtn.addEventListener('click', restartGame);
        infoIcon.addEventListener('click', () => instructionsScreen.classList.add('active'));
        mainMenuLogo.addEventListener('click', () => aboutScreen.classList.add('active'));
    }

    function createDifficultyButtons() {
        const difficulties = ['Fácil', 'Medio', 'Difícil', 'Experto'];
        difficultyButtonsContainer.innerHTML = '';
        difficulties.forEach(diff => {
            const button = document.createElement('button');
            button.className = 'difficulty-btn';
            button.dataset.difficulty = diff.toLowerCase();
            button.addEventListener('click', () => startGame(diff.toLowerCase()));

            const textSpan = document.createElement('span');
            textSpan.textContent = diff;
            button.appendChild(textSpan);

            const streak = streaks[diff.toLowerCase()];
            if (streak > 0) {
                const streakSpan = document.createElement('span');
                streakSpan.className = 'streak-display-menu';
                streakSpan.textContent = streak;
                button.appendChild(streakSpan);
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
        updateIngameStreakDisplay();
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
    
    function restartGame() {
        gameOverScreen.classList.remove('active');
        startGame(currentDifficulty);
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

                if (c === 2 || c === 5) tile.classList.add('tile-border-right');
                if (r === 2 || r === 5) tile.classList.add('tile-border-bottom');

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
        livesCounter.textContent = '❤️'.repeat(lives);
    }

    function updateIngameStreakDisplay() {
        const streak = streaks[currentDifficulty];
        if (streak > 0) {
            ingameStreakDisplay.innerHTML = `👑 <span class="ingame-streak-number">${streak}</span>`;
        } else {
            ingameStreakDisplay.innerHTML = '';
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
    function saveStreaks() { localStorage.setItem('sudokuStreaks', JSON.stringify(streaks)); }
    function loadStreaks() { const saved = localStorage.getItem('sudokuStreaks'); if (saved) streaks = JSON.parse(saved); }
    function updateStreakDisplay() { const total = Object.values(streaks).reduce((s, v) => s + v, 0); totalStreakDisplay.textContent = total > 0 ? `Racha Total: ${total}` : ''; }

    // --- GENERADOR DE SUDOKU Y HELPERS ---
    function getNumberCounts() { const c = {}; for(let i=1;i<=9;i++)c[i]=0; for(let r=0;r<9;r++)for(let col=0;col<9;col++)if(puzzleBoard[r][col]!==0)c[puzzleBoard[r][col]]++; return c; }
    function updateKeypad() { const c = getNumberCounts(); document.querySelectorAll('.keypad-number').forEach(k => { const n=parseInt(k.textContent); if(c[n]>=9)k.classList.add('disabled'); else k.classList.remove('disabled'); }); }
    function checkWin() { return puzzleBoard.every(r => r.every(c => c !== 0)); }
    function generateEmptyBoard() { return Array(9).fill(0).map(() => Array(9).fill(0)); }
    function generateSolution(b) { const f = findEmpty(b); if(!f)return true; const [r,c]=f; const n=shuffle(Array.from({length:9},(_,i)=>i+1)); for(const num of n){ if(isValid(b,num,[r,c])){ b[r][c]=num; if(generateSolution(b))return true; b[r][c]=0; }} return false; }
    function createPuzzle(b, d) { const p=JSON.parse(JSON.stringify(b)); const l={'fácil':40,'medio':50,'difícil':60,'experto':65}; let s=l[d]||50; let count=0; while(count<s){ const r=Math.floor(Math.random()*9); const c=Math.floor(Math.random()*9); if(p[r][c]!==0){ p[r][c]=0; count++; }} return p; }
    function findEmpty(b) { for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(b[r][c]===0)return[r,c]; return null; }
    function isValid(b, n, p) { const [r,c]=p; for(let i=0;i<9;i++){ if(b[r][i]===n&&c!==i)return false; if(b[i][c]===n&&r!==i)return false; } const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3; for(let i=br;i<br+3;i++)for(let j=bc;j<bc+3;j++)if(b[i][j]===n&&(i!==r||j!==c))return false; return true; }
    function shuffle(a) { for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

    initialize();
});