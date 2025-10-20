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
        lastMove: null, // {row, col, prevValue, prevNotes}
        isPencilMode: false,
        notesBoard: [],
        // ===== NUEVOS ESTADOS =====
        isMuted: false,
        isDailyChallenge: false,
        hintUsed: false
    };

    // --- ELEMENTOS DEL DOM ---
    const screens = {
        start: document.getElementById('start-screen'),
        game: document.getElementById('game-screen'),
        gameOver: document.getElementById('game-over-screen'),
        instructions: document.getElementById('instructions-screen'),
        about: document.getElementById('about-screen'),
        pause: document.getElementById('pause-screen'),
        // ===== NUEVOS ELEMENTOS =====
        hintOverlay: document.getElementById('hint-overlay-screen')
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
    const undoButton = document.getElementById('undo-button');
    const pencilToggleButton = document.getElementById('pencil-toggle-btn');
    // ===== NUEVOS ELEMENTOS =====
    const themeToggleButton = document.getElementById('theme-toggle-btn');
    const muteToggleButton = document.getElementById('mute-toggle-btn');
    const dailyChallengeButton = document.getElementById('daily-challenge-btn');
    const hintButton = document.getElementById('hint-button');
    const hintExplanation = document.getElementById('hint-explanation');
    const hintOkButton = document.getElementById('hint-ok-btn');
    const confettiCanvas = document.getElementById('confetti-canvas');


    // --- LÓGICA DE AUDIO (WEB AUDIO API) ---
    let audioCtx;
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    
    function playSound(type, freq, duration = 0.1) {
        if (gameState.isMuted || !audioCtx) return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
        oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime); // Volumen
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + duration);
    }
    
    function playClickSound() { playSound('sine', 880, 0.05); }
    function playErrorSound() { playSound('square', 220, 0.15); }
    function playWinSound() {
        playSound('sine', 523, 0.1);
        setTimeout(() => playSound('sine', 659, 0.1), 120);
        setTimeout(() => playSound('sine', 783, 0.1), 240);
        setTimeout(() => playSound('sine', 1046, 0.15), 360);
    }
    
    // --- LÓGICA DE CONFETI ---
    let confettiCtx = confettiCanvas.getContext('2d');
    let confettiParticles = [];

    function launchConfetti() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        confettiParticles = [];
        const particleCount = 200;
        const colors = ['#4285F4', '#DB4437', '#F4B400', '#0F9D58'];

        for (let i = 0; i < particleCount; i++) {
            confettiParticles.push({
                x: Math.random() * confettiCanvas.width,
                y: Math.random() * confettiCanvas.height - confettiCanvas.height,
                w: Math.random() * 10 + 5,
                h: Math.random() * 10 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: Math.random() * 3 + 2,
                angle: Math.random() * 2 * Math.PI,
                tilt: Math.random() * 10 - 5,
                tiltAngle: 0
            });
        }
        animateConfetti();
    }

    let confettiAnimationId;
    function animateConfetti() {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        
        confettiParticles.forEach((p, index) => {
            p.y += p.speed;
            p.tiltAngle += 0.1;
            p.x += Math.sin(p.tiltAngle) * 0.5;
            p.tilt = Math.sin(p.tiltAngle) * p.tilt;

            confettiCtx.fillStyle = p.color;
            confettiCtx.save();
            confettiCtx.translate(p.x + p.w / 2, p.y + p.h / 2);
            confettiCtx.rotate(p.tilt);
            confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            confettiCtx.restore();

            if (p.y > confettiCanvas.height) {
                confettiParticles.splice(index, 1);
            }
        });

        if (confettiParticles.length > 0) {
            confettiAnimationId = requestAnimationFrame(animateConfetti);
        } else {
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        }
    }
    
    // --- LÓGICA DE INICIO ---
    function initialize() {
        loadMuteState(); // Cargar antes que nada
        loadTheme();
        loadStreaks();
        loadTotalWins();
        createDifficultyButtons();
        addEventListeners();
    }

    function addEventListeners() {
        // Eventos de un solo uso
        document.body.addEventListener('click', initAudio, { once: true });
        
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
        
        undoButton.addEventListener('click', undoLastMove);
        pencilToggleButton.addEventListener('click', togglePencilMode);
        
        // ===== NUEVOS LISTENERS =====
        themeToggleButton.addEventListener('click', toggleTheme);
        muteToggleButton.addEventListener('click', toggleMute);
        dailyChallengeButton.addEventListener('click', startDailyChallenge);
        hintButton.addEventListener('click', provideHint);
        hintOkButton.addEventListener('click', () => showOverlay('hintOverlay', false));
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
    let randomSeed = 1; // Para el PRNG

    function startGame(difficulty) {
        // Detener confeti si estaba activo
        cancelAnimationFrame(confettiAnimationId);
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        
        gameState.gameInProgress = true;
        gameState.isDailyChallenge = false;
        resumeGameBtn.style.display = 'none';

        gameState.currentDifficulty = difficulty;
        gameState.lives = 3;
        gameState.selectedTile = null;
        gameState.secondsElapsed = 0;
        gameState.isPaused = false;
        
        gameState.lastMove = null;
        undoButton.style.display = 'none';
        clearAllErrors();
        
        gameState.isPencilMode = false;
        pencilToggleButton.classList.remove('active');
        pencilToggleButton.style.display = 'flex';
        
        gameState.hintUsed = false;
        hintButton.style.display = 'flex';
        hintButton.classList.remove('disabled');

        gameState.notesBoard = Array(9).fill(null).map(() => 
            Array(9).fill(null).map(() => new Set())
        );
        
        renderTimer();
        startTimer();
        pauseButton.style.display = 'flex';

        let baseBoard = generateEmptyBoard();
        // Usar Math.random() estándar para juegos normales
        generateSolution(baseBoard, Math.random);
        gameState.solution = JSON.parse(JSON.stringify(baseBoard));
        gameState.puzzleBoard = createPuzzle(baseBoard, difficulty, Math.random); 

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
            playClickSound();
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
            playClickSound();
            if (key.classList.contains('disabled')) return; 

            const num = parseInt(key.textContent);
            
            if (gameState.selectedTile) {
                 if (gameState.isPencilMode) {
                    toggleNote(num);
                 } else {
                    placeNumber(num);
                 }
            } else {
                highlightNumbersFromKeypad(num);
            }
        }
    }

    // --- LÓGICA DEL JUEGO ---
    
    function placeNumber(num) {
        if (!gameState.selectedTile || gameState.selectedTile.classList.contains('hint')) return;

        clearErrorHighlights();

        const row = parseInt(gameState.selectedTile.dataset.row);
        const col = parseInt(gameState.selectedTile.dataset.col);
        
        // No permitir sobrescribir un número incorrecto (debe deshacerlo)
        if (gameState.selectedTile.classList.contains('tile-wrong-number')) {
            playErrorSound();
            showFlashMessage("Deshaz tu jugada anterior primero");
            return;
        }

        const notes = gameState.notesBoard[row][col];
        gameState.lastMove = {
            row: row,
            col: col,
            prevValue: gameState.puzzleBoard[row][col],
            prevNotes: new Set(notes)
        };
        
        notes.clear();
        renderTileNotes(row, col);

        gameState.puzzleBoard[row][col] = num;
        gameState.selectedTile.querySelector('.tile-number').textContent = num;
        gameState.selectedTile.classList.add('user-filled');
        
        gameState.selectedTile.classList.remove('is-notes');


        highlightTilesFromBoard(row, col);
        
        undoButton.style.display = 'none'; // Se deshabilita por defecto

        if (gameState.solution[row][col] === num) {
            gameState.selectedTile.classList.remove('tile-wrong-number');
            if (checkWin()) {
                endGame(true);
            }
        } else {
            playErrorSound();
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
            gameState.selectedTile.classList.add('tile-error');
            gameState.selectedTile.classList.add('tile-wrong-number');
            
            highlightConflicts(row, col, num);
            
            setTimeout(() => {
                if(gameState.selectedTile) {
                    gameState.selectedTile.classList.remove('tile-error');
                }
            }, 500);
            
            // Habilitar deshacer solo en error
            undoButton.style.display = 'flex'; 

            gameState.lives--;
            updateLivesDisplay();
            showFlashMessage("Número equivocado");
            if (gameState.lives <= 0) {
                endGame(false);
            }
        }
        updateKeypad();
    }
    
    function undoLastMove() {
        if (!gameState.lastMove) return;
        playClickSound();

        const { row, col, prevValue, prevNotes } = gameState.lastMove;
        const tile = boardElement.children[row * 9 + col];
        const numberEl = tile.querySelector('.tile-number');

        gameState.puzzleBoard[row][col] = prevValue;
        gameState.notesBoard[row][col] = prevNotes;
        
        numberEl.textContent = prevValue === 0 ? '' : prevValue;
        
        tile.classList.remove('user-filled', 'tile-wrong-number');
        clearErrorHighlights();
        
        if (prevValue === 0) {
            tile.classList.remove('user-filled');
        }
        
        renderTileNotes(row, col);

        gameState.selectedTile = tile;
        highlightTilesFromBoard(row, col);
        
        gameState.lastMove = null;
        undoButton.style.display = 'none';
        
        updateKeypad();
    }

    
    function endGame(isWin) {
        stopTimer();
        pauseButton.style.display = 'none';
        pencilToggleButton.style.display = 'none';
        hintButton.style.display = 'none';
        gameState.gameInProgress = false;
        resumeGameBtn.style.display = 'none';
        
        undoButton.style.display = 'none';
        gameState.lastMove = null;
        clearAllErrors();
        
        if (isWin) {
            playWinSound();
            launchConfetti(); // Animación de victoria
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
        playClickSound();
        showOverlay('gameOver', false);
        startGame(gameState.currentDifficulty);
    }

    function goHome() {
        playClickSound();
        stopTimer();
        pauseButton.style.display = 'none';
        pencilToggleButton.style.display = 'none';
        hintButton.style.display = 'none';
        
        gameState.isPaused = false;
        gameState.gameInProgress = false;
        gameState.secondsElapsed = 0;
        resumeGameBtn.style.display = 'none';

        undoButton.style.display = 'none';
        gameState.lastMove = null;
        clearAllErrors();

        showOverlay('gameOver', false);
        showOverlay('pause', false);
        showScreen('start');
        createDifficultyButtons();
    }
    
    function goHomeFromPause() {
        playClickSound();
        gameState.isPaused = true;
        gameState.gameInProgress = true;
        
        showOverlay('pause', false);
        showScreen('start');
        
        resumeGameBtn.style.display = 'block';
        pauseButton.style.display = 'none';
        pencilToggleButton.style.display = 'none';
        hintButton.style.display = 'none';
        
        undoButton.style.display = 'none';
        
        createDifficultyButtons();
    }

    function resumeGame() {
        playClickSound();
        gameState.isPaused = false;
        renderBoardImproved();
        updateKeypad();
        showScreen('game');
        resumeGameBtn.style.display = 'none';
        pauseButton.style.display = 'flex';
        pencilToggleButton.style.display = 'flex';
        hintButton.style.display = 'flex';
        
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
        const overlay = screens[overlayKey];
        if (overlay) {
             overlay.classList.toggle('active', show);
        }
    }

    function renderBoardImproved() {
        boardElement.innerHTML = '';
        const fragment = document.createDocumentFragment();

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.dataset.row = r;
                tile.dataset.col = c;
                
                if (c === 2 || c === 5) tile.classList.add('tile-border-right');
                if (r === 2 || r === 5) tile.classList.add('tile-border-bottom');

                const numberEl = document.createElement('div');
                numberEl.className = 'tile-number';
                
                const notesGrid = document.createElement('div');
                notesGrid.className = 'tile-notes-grid';
                for (let i = 1; i <= 9; i++) {
                    const noteEl = document.createElement('div');
                    noteEl.className = 'tile-note note-' + i;
                    notesGrid.appendChild(noteEl);
                }
                
                if (initialPuzzleForResume[r][c] !== 0) {
                    numberEl.textContent = initialPuzzleForResume[r][c];
                    tile.classList.add('hint');
                } else if (gameState.puzzleBoard[r][c] !== 0) {
                    numberEl.textContent = gameState.puzzleBoard[r][c];
                    tile.classList.add('user-filled');
                    if (gameState.solution[r][c] !== gameState.puzzleBoard[r][c]) {
                        tile.classList.add('tile-wrong-number');
                    }
                } else {
                    const notes = gameState.notesBoard[r][c];
                    if (notes && notes.size > 0) {
                        tile.classList.add('is-notes');
                        notes.forEach(num => {
                            const noteEl = notesGrid.querySelector('.note-' + num);
                            if(noteEl) noteEl.textContent = num;
                        });
                    }
                }
                
                tile.appendChild(numberEl);
                tile.appendChild(notesGrid);
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

    function renderTileNotes(row, col) {
        const tile = boardElement.children[row * 9 + col];
        if (!tile) return; // Seguridad
        const notesGrid = tile.querySelector('.tile-notes-grid');
        if (!notesGrid) return;

        const notes = gameState.notesBoard[row][col];
        
        if (notes && notes.size > 0 && gameState.puzzleBoard[row][col] === 0) {
            tile.classList.add('is-notes');
        } else {
            tile.classList.remove('is-notes');
        }

        for (let i = 1; i <= 9; i++) {
            const noteEl = notesGrid.querySelector('.note-' + i);
            if (noteEl) {
                noteEl.textContent = notes.has(i) ? i : '';
            }
        }
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
            t.classList.remove('highlight', 'keypad-highlight', 'selected');
        });
    }

    function clearErrorHighlights() {
        document.querySelectorAll('.tile-conflict').forEach(t => {
            t.classList.remove('tile-conflict');
        });
    }

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
    
    function highlightConflicts(row, col, num) {
        const board = gameState.puzzleBoard;

        for (let i = 0; i < 9; i++) {
            if (i !== col && board[row][i] === num) {
                boardElement.children[row * 9 + i].classList.add('tile-conflict');
            }
        }
        for (let i = 0; i < 9; i++) {
            if (i !== row && board[i][col] === num) {
                boardElement.children[i * 9 + col].classList.add('tile-conflict');
            }
        }
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
        if (saved) {
            try {
                const parsedStreaks = JSON.parse(saved);
                if (typeof parsedStreaks === 'object' && parsedStreaks !== null) {
                    gameState.streaks = parsedStreaks;
                } else {
                    throw new Error("Loaded streaks is not an object.");
                }
            } catch (e) {
                console.error("Error loading streaks from localStorage:", e);
                localStorage.removeItem('sudokuStreaks');
            }
        }
    }

    function saveTotalWins() {
        localStorage.setItem('sudokuTotalWins', JSON.stringify(gameState.totalWins));
    }

    function loadTotalWins() {
        const saved = localStorage.getItem('sudokuTotalWins');
        if (saved) {
            try {
                const loadedWins = JSON.parse(saved);
                if (typeof loadedWins === 'object' && loadedWins !== null) {
                    gameState.totalWins = { ...gameState.totalWins, ...loadedWins };
                } else {
                    throw new Error("Loaded wins is not an object.");
                }
            } catch (e) {
                console.error("Error loading total wins from localStorage:", e);
                localStorage.removeItem('sudokuTotalWins');
            }
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
        playClickSound();
        gameState.isPaused = !gameState.isPaused;
        showOverlay('pause', gameState.isPaused);
    }
    
    function togglePencilMode() {
        playClickSound();
        gameState.isPencilMode = !gameState.isPencilMode;
        pencilToggleButton.classList.toggle('active', gameState.isPencilMode);
    }
    
    function toggleNote(num) {
        if (!gameState.selectedTile) return;
        const row = parseInt(gameState.selectedTile.dataset.row);
        const col = parseInt(gameState.selectedTile.dataset.col);

        if (gameState.puzzleBoard[row][col] !== 0) return;

        const notes = gameState.notesBoard[row][col];
        if (notes.has(num)) {
            notes.delete(num);
        } else {
            notes.add(num);
        }
        renderTileNotes(row, col);
    }

    // --- LÓGICA DE TEMA Y SONIDO ---
    function toggleTheme() {
        playClickSound();
        const currentTheme = document.body.dataset.theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = newTheme;
        localStorage.setItem('sudokuTheme', newTheme);
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('sudokuTheme');
        if (savedTheme) {
            document.body.dataset.theme = savedTheme;
        }
    }
    
    function toggleMute() {
        gameState.isMuted = !gameState.isMuted;
        muteToggleButton.classList.toggle('muted', gameState.isMuted);
        localStorage.setItem('sudokuMuted', gameState.isMuted.toString());
        if (!gameState.isMuted) {
            playClickSound();
        }
    }
    
    function loadMuteState() {
        const savedMute = localStorage.getItem('sudokuMuted');
        if (savedMute === 'true') {
            gameState.isMuted = true;
            muteToggleButton.classList.add('muted');
        }
    }

    // --- LÓGICA DE DESAFÍO DIARIO Y PISTAS ---
    
    // Generador de números pseudoaleatorio (PRNG)
    function setSeed(seed) {
        randomSeed = seed;
    }
    function seededRandom() {
        let x = Math.sin(randomSeed++) * 10000;
        return x - Math.floor(x);
    }
    
    function startDailyChallenge() {
        playClickSound();
        // Detener confeti si estaba activo
        cancelAnimationFrame(confettiAnimationId);
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        
        gameState.gameInProgress = true;
        gameState.isDailyChallenge = true;
        resumeGameBtn.style.display = 'none';

        gameState.currentDifficulty = DIFFICULTIES.MEDIO; // Fijo
        gameState.lives = 3;
        gameState.selectedTile = null;
        gameState.secondsElapsed = 0;
        gameState.isPaused = false;
        
        gameState.lastMove = null;
        undoButton.style.display = 'none';
        clearAllErrors();
        
        gameState.isPencilMode = false;
        pencilToggleButton.classList.remove('active');
        pencilToggleButton.style.display = 'flex';
        
        gameState.hintUsed = false;
        hintButton.style.display = 'flex';
        hintButton.classList.remove('disabled');

        gameState.notesBoard = Array(9).fill(null).map(() => 
            Array(9).fill(null).map(() => new Set())
        );
        
        renderTimer();
        startTimer();
        pauseButton.style.display = 'flex';

        // Generar semilla basada en la fecha
        const date = new Date();
        const seed = parseInt(`${date.getFullYear()}${date.getMonth()}${date.getDate()}`);
        setSeed(seed);

        let baseBoard = generateEmptyBoard();
        // Usar el PRNG con semilla
        generateSolution(baseBoard, seededRandom); 
        gameState.solution = JSON.parse(JSON.stringify(baseBoard));
        gameState.puzzleBoard = createPuzzle(baseBoard, DIFFICULTIES.MEDIO, seededRandom);

        updateLivesDisplay();
        updateIngameStreakDisplay();
        renderBoardImproved();
        renderKeypad();
        
        showScreen('game');
    }
    
    function provideHint() {
        if (gameState.hintUsed) return;
        playClickSound();
        
        let hint = findNakedSingle();
        if (!hint) {
            hint = findHiddenSingle();
        }

        if (hint) {
            gameState.hintUsed = true;
            hintButton.classList.add('disabled');
            
            // Añadir penalización de tiempo
            gameState.secondsElapsed += 60;
            renderTimer();
            showFlashMessage("Pista usada: +1 minuto");
            
            // Aplicar la pista
            const { row, col, num, logic } = hint;
            gameState.puzzleBoard[row][col] = num;
            
            // Marcar como pista en el tablero de "hints"
            initialPuzzleForResume[row][col] = num; 
            
            // Limpiar notas de esa celda
            gameState.notesBoard[row][col].clear();
            
            // Actualizar la UI
            renderBoardImproved();
            updateKeypad();
            
            // Resaltar la celda y mostrar explicación
            const tile = boardElement.children[row * 9 + col];
            gameState.selectedTile = tile;
            highlightTilesFromBoard(row, col);
            
            hintExplanation.innerHTML = logic;
            showOverlay('hintOverlay', true);

        } else {
            showFlashMessage("No se encontraron pistas simples");
        }
    }
    
    function findNakedSingle() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (gameState.puzzleBoard[r][c] === 0) {
                    let possible = new Set([1,2,3,4,5,6,7,8,9]);
                    
                    // Quitar por fila
                    for (let i = 0; i < 9; i++) {
                        if (gameState.puzzleBoard[r][i] !== 0) {
                            possible.delete(gameState.puzzleBoard[r][i]);
                        }
                    }
                    // Quitar por columna
                    for (let i = 0; i < 9; i++) {
                        if (gameState.puzzleBoard[i][c] !== 0) {
                            possible.delete(gameState.puzzleBoard[i][c]);
                        }
                    }
                    // Quitar por caja
                    const boxRow = Math.floor(r / 3) * 3;
                    const boxCol = Math.floor(c / 3) * 3;
                    for (let i = boxRow; i < boxRow + 3; i++) {
                        for (let j = boxCol; j < boxCol + 3; j++) {
                            if (gameState.puzzleBoard[i][j] !== 0) {
                                possible.delete(gameState.puzzleBoard[i][j]);
                            }
                        }
                    }
                    
                    if (possible.size === 1) {
                        const num = possible.values().next().value;
                        return { 
                            row: r, 
                            col: c, 
                            num: num, 
                            logic: `En la celda <span class="hint-cell">Fila ${r+1}, Col ${c+1}</span>, el número <strong>${num}</strong> es el único valor posible, ya que todos los demás números ya están presentes en su fila, columna o caja.`
                        };
                    }
                }
            }
        }
        return null; // No se encontró
    }
    
    function findHiddenSingle() {
        // Lógica para Hidden Singles (más compleja)
        // Revisar por fila
        for (let r = 0; r < 9; r++) {
            for (let num = 1; num <= 9; num++) {
                let count = 0;
                let lastCol = -1;
                // ¿Este número ya está en la fila?
                if ([...gameState.puzzleBoard[r]].includes(num)) continue;

                for (let c = 0; c < 9; c++) {
                    if (gameState.puzzleBoard[r][c] === 0 && isPossible(r, c, num)) {
                        count++;
                        lastCol = c;
                    }
                }
                if (count === 1) {
                    return { 
                        row: r, 
                        col: lastCol, 
                        num: num, 
                        logic: `En la <span class="hint-cell">Fila ${r+1}</span>, la celda <span class="hint-cell">Col ${lastCol+1}</span> es el único lugar donde puede ir el número <strong>${num}</strong>.`
                    };
                }
            }
        }
        // ... (Se repetiría para columnas y cajas) ...
        return null;
    }
    
    // Helper para findHiddenSingle
    function isPossible(r, c, num) {
        // Chequear fila
        for (let i = 0; i < 9; i++) {
            if (gameState.puzzleBoard[r][i] === num) return false;
        }
        // Chequear columna
        for (let i = 0; i < 9; i++) {
            if (gameState.puzzleBoard[i][c] === num) return false;
        }
        // Chequear caja
        const boxRow = Math.floor(r / 3) * 3;
        const boxCol = Math.floor(c / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) {
            for (let j = boxCol; j < boxCol + 3; j++) {
                if (gameState.puzzleBoard[i][j] === num) return false;
            }
        }
        return true;
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

    function shuffle(array, randFunc = Math.random) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(randFunc() * (i + 1));
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

    function generateSolution(board, randFunc = Math.random) {
        const emptySpot = findEmpty(board);
        if (!emptySpot) return true;
        const [row, col] = emptySpot;
        const numbers = shuffle(Array.from({ length: 9 }, (_, i) => i + 1), randFunc);

        for (const num of numbers) {
            if (isValid(board, num, [row, col])) {
                board[row][col] = num;
                if (generateSolution(board, randFunc)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    function createPuzzle(board, difficulty, randFunc = Math.random) {
        const puzzle = JSON.parse(JSON.stringify(board));
        let cellsToRemove = CELLS_TO_REMOVE[difficulty] || 50;
        let attempts = 200;
        
        while (cellsToRemove > 0 && attempts > 0) {
            const row = Math.floor(randFunc() * 9);
            const col = Math.floor(randFunc() * 9);
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