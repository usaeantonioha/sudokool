document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES ---
    const DIFFICULTIES = { FÁCIL: 'fácil', MEDIO: 'medio', DIFÍCIL: 'difícil', EXPERTO: 'experto' };
    const CELLS_TO_REMOVE = { fácil: 40, medio: 50, difícil: 60, experto: 65 };
    const ACHIEVEMENT_DEFINITIONS = {
        'speedRacer': { title: 'Velocista ⚡', desc: 'Gana un juego Medio en menos de 5 minutos.' },
        'perfectionist': { title: 'Perfeccionista 🎯', desc: 'Gana un juego Difícil sin usar "Deshacer".' },
        'streakMaster': { title: 'Imparable 🔥', desc: 'Alcanza una racha de 10 victorias (en cualquier dificultad).' },
        'thinkingAhead': { title: 'Estratega 🧠', desc: 'Usa el modo Lápiz para hacer 50 notas en un solo juego.' },
        'dailyConqueror': { title: 'Conquistador Diario 📅', desc: 'Gana el Desafío Diario.' }
    };
    const DEFAULT_SETTINGS = {
        theme: 'auto',
        boardFont: 'Manrope',
        showHintButton: true,
        showPencilButton: true,
        showUndoButton: true,
        useCustomColors: false,
        customColors: { /* Valores por defecto tomados de :root */
            '--color-bg': '#f7faff',
            '--color-grid': '#555555',
            '--color-text': '#143478',
            '--color-hint': '#3C3C3C',
            '--color-highlight': 'rgba(0, 174, 239, 0.25)',
            '--color-select': 'rgba(255, 165, 0, 0.4)'
        }
    };

    // --- ESTADO DEL JUEGO ---
    let gameState = {
        solution: [], puzzleBoard: [], lives: 3, selectedTile: null, currentDifficulty: DIFFICULTIES.MEDIO,
        streaks: { fácil: 0, medio: 0, difícil: 0, experto: 0 },
        totalWins: { fácil: 0, medio: 0, difícil: 0, experto: 0 },
        timerInterval: null, secondsElapsed: 0, isPaused: false, gameInProgress: false, lastMove: null,
        isPencilMode: false, notesBoard: [], isMuted: false, isDailyChallenge: false, hintUsed: false,
        achievements: {}, leaderboards: { daily: [] }, gameStats: { hasUsedUndo: false, notesPlaced: 0 },
        settings: { ...DEFAULT_SETTINGS } // Carga los defaults iniciales
    };

    // --- ELEMENTOS DEL DOM ---
    const screens = {
        start: document.getElementById('start-screen'), game: document.getElementById('game-screen'),
        gameOver: document.getElementById('game-over-screen'), instructions: document.getElementById('instructions-screen'),
        about: document.getElementById('about-screen'), pause: document.getElementById('pause-screen'),
        hintOverlay: document.getElementById('hint-overlay-screen'), leaderboard: document.getElementById('leaderboard-screen'),
        settings: document.getElementById('settings-screen') // Nuevo
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
    // const themeToggleButton = document.getElementById('theme-toggle-btn'); // Movido a settings
    // const muteToggleButton = document.getElementById('mute-toggle-btn'); // Movido a settings
    const dailyChallengeButton = document.getElementById('daily-challenge-btn');
    const hintButton = document.getElementById('hint-button');
    const hintExplanation = document.getElementById('hint-explanation');
    const hintOkButton = document.getElementById('hint-ok-btn');
    const confettiCanvas = document.getElementById('confetti-canvas');
    const leaderboardButton = document.getElementById('leaderboard-btn');
    const goToLeaderboardBtn = document.getElementById('go-to-leaderboard-btn');
    const achievementsList = document.getElementById('achievements-list');
    const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const settingsButton = document.getElementById('settings-btn'); // Nuevo
    const shareDailyResultBtn = document.getElementById('share-daily-result-btn'); // Nuevo

    // --- Elementos de Configuración ---
    const themeSelect = document.getElementById('theme-select');
    const fontSelect = document.getElementById('font-select');
    const customColorsToggle = document.getElementById('custom-colors-toggle');
    const customColorsSection = document.getElementById('custom-colors-section');
    const colorPickers = document.querySelectorAll('#custom-colors-section input[type="color"]');
    const resetColorsBtn = document.getElementById('reset-colors-btn');
    const muteToggleSetting = document.getElementById('mute-toggle-setting');
    const showHintToggle = document.getElementById('show-hint-toggle');
    const showPencilToggle = document.getElementById('show-pencil-toggle');
    const showUndoToggle = document.getElementById('show-undo-toggle');


    // --- LÓGICA DE AUDIO ---
    let audioCtx;
    function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    function playSound(type, freq, duration = 0.1) { /* ... (sin cambios) ... */ }
    function playClickSound() { playSound('sine', 880, 0.05); }
    function playErrorSound() { playSound('square', 220, 0.15); }
    function playWinSound() { /* ... (sin cambios) ... */ }
    function playAchievementSound() { playSound('sawtooth', 660, 0.2); setTimeout(() => playSound('sawtooth', 880, 0.2), 200); }

    // --- LÓGICA DE CONFETI ---
    let confettiCtx = confettiCanvas.getContext('2d');
    let confettiParticles = [];
    let confettiAnimationId;
    function launchConfetti() { /* ... (sin cambios) ... */ }
    function animateConfetti() { /* ... (sin cambios) ... */ }

    // --- LÓGICA DE INICIO ---
    function initialize() {
        loadSettings(); // Cargar config primero
        applySettings(); // Aplicar tema, fuente, etc.
        loadStreaks(); loadTotalWins(); loadAchievements(); loadLeaderboards();
        createDifficultyButtons();
        addEventListeners();
    }

    function addEventListeners() {
        document.body.addEventListener('click', initAudio, { once: true });
        // ... (otros listeners existentes) ...
        backToMenuBtn.addEventListener('click', togglePause);
        restartBtn.addEventListener('click', restartGame);
        infoIcon.addEventListener('click', () => { playClickSound(); showOverlay('instructions', true); });
        mainMenuLogo.addEventListener('click', () => { playClickSound(); renderAchievementsPage(); showOverlay('about', true); });
        settingsButton.addEventListener('click', () => { playClickSound(); setupSettingsScreen(); showOverlay('settings', true); }); // Listener para config
        document.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', () => {
            playClickSound();
            showOverlay('instructions', false); showOverlay('about', false);
            showOverlay('leaderboard', false); showOverlay('settings', false); // Añadido settings
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
        // themeToggleButton.addEventListener('click', toggleTheme); // Movido a settings
        // muteToggleButton.addEventListener('click', toggleMute); // Movido a settings
        dailyChallengeButton.addEventListener('click', startDailyChallenge);
        hintButton.addEventListener('click', provideHint);
        hintOkButton.addEventListener('click', () => showOverlay('hintOverlay', false));
        leaderboardButton.addEventListener('click', () => { playClickSound(); renderLeaderboardsPage(); showOverlay('leaderboard', true); });
        goToLeaderboardBtn.addEventListener('click', () => { playClickSound(); showOverlay('gameOver', false); renderLeaderboardsPage(); showOverlay('leaderboard', true); });
        shareDailyResultBtn.addEventListener('click', shareDailyResult); // Nuevo listener
        tabButtons.forEach(btn => { /* ... (sin cambios) ... */ });

        // --- Listeners de Configuración ---
        themeSelect.addEventListener('change', handleThemeChange);
        fontSelect.addEventListener('change', handleFontChange);
        customColorsToggle.addEventListener('change', handleCustomColorToggle);
        colorPickers.forEach(picker => picker.addEventListener('input', handleColorChange));
        resetColorsBtn.addEventListener('click', handleResetColors);
        muteToggleSetting.addEventListener('change', handleMuteChange);
        showHintToggle.addEventListener('change', (e) => handleButtonVisibilityChange('showHintButton', e.target.checked));
        showPencilToggle.addEventListener('change', (e) => handleButtonVisibilityChange('showPencilButton', e.target.checked));
        showUndoToggle.addEventListener('change', (e) => handleButtonVisibilityChange('showUndoButton', e.target.checked));
    }

    // ... (createDifficultyButtons - sin cambios) ...
    function createDifficultyButtons() {
        difficultyButtonsContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const difficultyLevels = [ { key: 'fácil', name: 'Fácil' }, { key: 'medio', name: 'Medio' }, { key: 'difícil', name: 'Difícil' }, { key: 'experto', name: 'Experto' } ];
        difficultyLevels.forEach(level => {
            const button = document.createElement('button');
            button.className = 'difficulty-btn';
            button.dataset.difficulty = level.key;
            const textSpan = document.createElement('span');
            textSpan.textContent = level.name;
            button.appendChild(textSpan);
            button.classList.add(`btn-${level.key}`);
            const streak = gameState.streaks[level.key];
            if (streak > 0) {
                const streakSpan = document.createElement('span');
                streakSpan.className = 'streak-display-menu';
                streakSpan.textContent = `👑 ${streak}`;
                button.appendChild(streakSpan);
            }
            fragment.appendChild(button);
        });
        difficultyButtonsContainer.appendChild(fragment);
        difficultyButtonsContainer.addEventListener('click', handleDifficultyClick);
    }

    let initialPuzzleForResume = [];
    let randomSeed = 1;

    function startGame(difficulty) {
        cancelAnimationFrame(confettiAnimationId); confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        gameState.gameInProgress = true; gameState.isDailyChallenge = false;
        resumeGameBtn.style.display = 'none'; goToLeaderboardBtn.style.display = 'none'; shareDailyResultBtn.style.display = 'none';
        gameState.currentDifficulty = difficulty; gameState.lives = 3; gameState.selectedTile = null;
        gameState.secondsElapsed = 0; gameState.isPaused = false;
        gameState.lastMove = null; undoButton.style.display = 'none'; clearAllErrors();
        gameState.isPencilMode = false; pencilToggleButton.classList.remove('active');
        gameState.hintUsed = false; hintButton.classList.remove('disabled');
        gameState.notesBoard = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
        gameState.gameStats = { hasUsedUndo: false, notesPlaced: 0 };

        // Aplicar visibilidad de botones según config
        applyButtonVisibility();

        renderTimer(); startTimer(); pauseButton.style.display = 'flex';
        let baseBoard = generateEmptyBoard(); generateSolution(baseBoard, Math.random);
        gameState.solution = JSON.parse(JSON.stringify(baseBoard));
        gameState.puzzleBoard = createPuzzle(baseBoard, difficulty, Math.random);
        updateLivesDisplay(); updateIngameStreakDisplay(); renderBoardImproved(); renderKeypad();
        showScreen('game');
    }

    // --- MANEJADORES DE EVENTOS ---
    function handleDifficultyClick(event) {
        const button = event.target.closest('.difficulty-btn');
        if (button) { playClickSound(); startGame(button.dataset.difficulty); }
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
            if (key.classList.contains('completed') || key.style.visibility === 'hidden') return; // Cambiado de 'disabled'
            const num = parseInt(key.textContent);
            if (gameState.selectedTile) {
                if (gameState.isPencilMode) toggleNote(num); else placeNumber(num);
            } else { highlightNumbersFromKeypad(num); }
        }
    }

    // --- LÓGICA DEL JUEGO ---
    function placeNumber(num) {
        if (!gameState.selectedTile || gameState.selectedTile.classList.contains('hint')) return;
        clearErrorHighlights();
        const row = parseInt(gameState.selectedTile.dataset.row), col = parseInt(gameState.selectedTile.dataset.col);
        if (gameState.selectedTile.classList.contains('tile-wrong-number')) { playErrorSound(); showFlashMessage("Deshaz tu jugada anterior primero"); return; }
        const notes = gameState.notesBoard[row][col];
        gameState.lastMove = { row, col, prevValue: gameState.puzzleBoard[row][col], prevNotes: new Set(notes) };
        notes.clear(); renderTileNotes(row, col);
        gameState.puzzleBoard[row][col] = num;
        gameState.selectedTile.querySelector('.tile-number').textContent = num;
        gameState.selectedTile.classList.add('user-filled');
        gameState.selectedTile.classList.remove('is-notes');
        highlightTilesFromBoard(row, col);
        undoButton.style.display = 'none'; // Ocultar por defecto

        if (gameState.solution[row][col] === num) {
            gameState.selectedTile.classList.remove('tile-wrong-number');
            autoCleanNotes(row, col, num);
            if (checkWin()) endGame(true);
        } else {
            playErrorSound(); if (navigator.vibrate) navigator.vibrate(200);
            gameState.selectedTile.classList.add('tile-error', 'tile-wrong-number');
            highlightConflicts(row, col, num);
            setTimeout(() => { if(gameState.selectedTile) gameState.selectedTile.classList.remove('tile-error'); }, 500);
            if (gameState.settings.showUndoButton) undoButton.style.display = 'flex'; // Mostrar solo si la config lo permite
            gameState.lives--; updateLivesDisplay();
            showFlashMessage("Número equivocado");
            if (gameState.lives <= 0) endGame(false);
        }
        updateKeypad();
    }
    function undoLastMove() {
        if (!gameState.lastMove) return;
        playClickSound();
        gameState.gameStats.hasUsedUndo = true;
        const { row, col, prevValue, prevNotes } = gameState.lastMove;
        const tile = boardElement.children[row * 9 + col];
        const numberEl = tile.querySelector('.tile-number');
        gameState.puzzleBoard[row][col] = prevValue; gameState.notesBoard[row][col] = prevNotes;
        numberEl.textContent = prevValue === 0 ? '' : prevValue;
        tile.classList.remove('user-filled', 'tile-wrong-number'); clearErrorHighlights();
        if (prevValue === 0) tile.classList.remove('user-filled');
        renderTileNotes(row, col);
        gameState.selectedTile = tile; highlightTilesFromBoard(row, col);
        gameState.lastMove = null; undoButton.style.display = 'none';
        updateKeypad();
    }
    function endGame(isWin) {
        stopTimer();
        pauseButton.style.display = 'none'; pencilToggleButton.style.display = 'none'; hintButton.style.display = 'none';
        gameState.gameInProgress = false; resumeGameBtn.style.display = 'none';
        undoButton.style.display = 'none'; gameState.lastMove = null; clearAllErrors();

        if (isWin) {
            playWinSound(); launchConfetti();
            gameState.streaks[gameState.currentDifficulty]++; gameState.totalWins[gameState.currentDifficulty]++;
            saveTotalWins(); checkAchievements();
            if (gameState.isDailyChallenge) { saveToLeaderboard(gameState.secondsElapsed); goToLeaderboardBtn.style.display = 'block'; shareDailyResultBtn.style.display = 'block'; }
            gameOverMsg.textContent = '¡FELICITACIONES!'; gameOverMsg.className = 'win';
        } else {
            gameState.streaks[gameState.currentDifficulty] = 0;
            gameOverMsg.textContent = 'Game Over'; gameOverMsg.className = 'lose';
        }
        saveStreaks();
        showOverlay('gameOver', true);
    }
    function restartGame() {
        playClickSound(); showOverlay('gameOver', false);
        goToLeaderboardBtn.style.display = 'none'; shareDailyResultBtn.style.display = 'none';
        startGame(gameState.currentDifficulty);
    }
    function goHome() {
        playClickSound(); stopTimer();
        pauseButton.style.display = 'none'; pencilToggleButton.style.display = 'none'; hintButton.style.display = 'none';
        gameState.isPaused = false; gameState.gameInProgress = false; gameState.secondsElapsed = 0;
        resumeGameBtn.style.display = 'none'; goToLeaderboardBtn.style.display = 'none'; shareDailyResultBtn.style.display = 'none';
        undoButton.style.display = 'none'; gameState.lastMove = null; clearAllErrors();
        showOverlay('gameOver', false); showOverlay('pause', false); showScreen('start');
        createDifficultyButtons();
    }
    function goHomeFromPause() {
        playClickSound(); gameState.isPaused = true; gameState.gameInProgress = true;
        showOverlay('pause', false); showScreen('start');
        resumeGameBtn.style.display = 'block';
        pauseButton.style.display = 'none'; pencilToggleButton.style.display = 'none'; hintButton.style.display = 'none';
        undoButton.style.display = 'none';
        createDifficultyButtons();
    }
    function resumeGame() {
        playClickSound(); gameState.isPaused = false;
        renderBoardImproved(); updateKeypad(); showScreen('game');
        resumeGameBtn.style.display = 'none'; pauseButton.style.display = 'flex';
        applyButtonVisibility(); // Asegura que se muestren/oculten botones de ayuda
        if (gameState.lastMove && gameState.settings.showUndoButton) { undoButton.style.display = 'flex'; }
    }

    // --- RENDERIZADO Y UI ---
    // ... (showScreen, showOverlay - sin cambios) ...
    function showScreen(screenKey) { /*...*/ }
    function showOverlay(overlayKey, show) { /*...*/ }
    // ... (renderBoardImproved, renderKeypad, renderTileNotes - sin cambios en la lógica principal, solo dependen de CSS ahora) ...
    function renderBoardImproved() { /*...*/ }
    function renderKeypad() { /*...*/ }
    function renderTileNotes(row, col) { /*...*/ }
    // ... (updateLivesDisplay, updateIngameStreakDisplay, showFlashMessage - sin cambios) ...
    function updateLivesDisplay() { /*...*/ }
    function updateIngameStreakDisplay() { /*...*/ }
    function showFlashMessage(message) { /*...*/ }

    // --- LÓGICA DE RESALTADO ---
    // ... (clearAllHighlights, clearErrorHighlights, clearAllErrors - sin cambios) ...
    function clearAllHighlights() { /*...*/ }
    function clearErrorHighlights() { /*...*/ }
    function clearAllErrors() { /*...*/ }
    // ... (highlightTilesFromBoard, highlightNumbersFromKeypad, highlightConflicts - sin cambios) ...
    function highlightTilesFromBoard(row, col) { /*...*/ }
    function highlightNumbersFromKeypad(num) { /*...*/ }
    function highlightConflicts(row, col, num) { /*...*/ }

    // --- LÓGICA DE GUARDADO (localStorage) ---
    // ... (saveStreaks, loadStreaks, saveTotalWins, loadTotalWins - sin cambios) ...
    function saveStreaks() { /*...*/ }
    function loadStreaks() { /*...*/ }
    function saveTotalWins() { /*...*/ }
    function loadTotalWins() { /*...*/ }

    // --- LÓGICA DE TIMER Y PAUSA ---
    // ... (startTimer, stopTimer, updateTimer, formatTime, renderTimer, togglePause - sin cambios) ...
    function startTimer() { /*...*/ }
    function stopTimer() { /*...*/ }
    function updateTimer() { /*...*/ }
    function formatTime(seconds) { /*...*/ }
    function renderTimer() { /*...*/ }
    function togglePause() { /*...*/ }

    // --- LÓGICA DE MODO LÁPIZ Y AUTO-LIMPIEZA ---
    function togglePencilMode() { playClickSound(); gameState.isPencilMode = !gameState.isPencilMode; pencilToggleButton.classList.toggle('active', gameState.isPencilMode); }
    function toggleNote(num) {
        if (!gameState.selectedTile) return;
        const row = parseInt(gameState.selectedTile.dataset.row), col = parseInt(gameState.selectedTile.dataset.col);
        if (gameState.puzzleBoard[row][col] !== 0) return;
        const notes = gameState.notesBoard[row][col];
        if (notes.has(num)) notes.delete(num); else { notes.add(num); gameState.gameStats.notesPlaced++; if(gameState.gameStats.notesPlaced >= 50) unlockAchievement('thinkingAhead'); }
        renderTileNotes(row, col);
    }
    function autoCleanNotes(row, col, num) {
        for (let i = 0; i < 9; i++) if (gameState.notesBoard[row][i].has(num)) { gameState.notesBoard[row][i].delete(num); renderTileNotes(row, i); }
        for (let i = 0; i < 9; i++) if (gameState.notesBoard[i][col].has(num)) { gameState.notesBoard[i][col].delete(num); renderTileNotes(i, col); }
        const boxRow = Math.floor(row / 3) * 3, boxCol = Math.floor(col / 3) * 3;
        for (let i = boxRow; i < boxRow + 3; i++) for (let j = boxCol; j < boxCol + 3; j++) if (gameState.notesBoard[i][j].has(num)) { gameState.notesBoard[i][j].delete(num); renderTileNotes(i, j); }
    }

    // --- LÓGICA DE CONFIGURACIÓN (TEMA, FUENTE, BOTONES, COLORES) ---
    function handleThemeChange(event) {
        const newTheme = event.target.value;
        saveSetting('theme', newTheme);
        if (newTheme === 'auto') {
            applyDynamicTheme();
        } else {
            document.body.dataset.theme = newTheme;
        }
        playClickSound();
    }
    function applyDynamicTheme() {
        const hour = new Date().getHours();
        let dynamicTheme = 'light';
        if (hour >= 19 || hour < 6) dynamicTheme = 'dark';
        else if (hour >= 16) dynamicTheme = 'sepia';
        document.body.dataset.theme = dynamicTheme;
        // No actualiza el icono de tema aquí, solo el body
    }
    function handleFontChange(event) {
        const newFont = event.target.value;
        saveSetting('boardFont', newFont);
        applyFont(newFont);
        playClickSound();
    }
    function applyFont(fontName) {
        let fontFamily = '';
        if (fontName === 'Roboto Slab') fontFamily = 'var(--font-serif)';
        else if (fontName === 'Source Code Pro') fontFamily = 'var(--font-mono)';
        else fontFamily = 'var(--font-default)'; // Manrope o default
        document.documentElement.style.setProperty('--font-board', fontFamily);
    }
    function handleMuteChange(event) {
        const isMuted = event.target.checked;
        saveSetting('isMuted', isMuted);
        gameState.isMuted = isMuted; // Actualiza estado global
        muteToggleButton.classList.toggle('muted', isMuted); // Actualiza icono en cabecera principal
        if (!isMuted) playClickSound();
    }
    function handleButtonVisibilityChange(settingKey, isVisible) {
        saveSetting(settingKey, isVisible);
        applyButtonVisibility();
        playClickSound();
    }
    function applyButtonVisibility() {
        hintButton.style.display = gameState.settings.showHintButton ? 'flex' : 'none';
        pencilToggleButton.style.display = gameState.settings.showPencilButton ? 'flex' : 'none';
        // Undo se maneja dinámicamente, pero respetamos la config
        if (!gameState.settings.showUndoButton && undoButton.style.display === 'flex') {
            undoButton.style.display = 'none';
        }
    }
    function handleCustomColorToggle(event) {
        const useCustom = event.target.checked;
        saveSetting('useCustomColors', useCustom);
        customColorsSection.style.display = useCustom ? 'block' : 'none';
        applyCustomColors(useCustom);
        playClickSound();
    }
    function handleColorChange(event) {
        const variable = event.target.dataset.var;
        const newColor = event.target.value;
        // Aplica inmediatamente si custom está activo
        if (gameState.settings.useCustomColors) {
            document.documentElement.style.setProperty(variable, newColor);
        }
        // Guarda el cambio aunque no esté activo
        saveSetting(`customColors.${variable}`, newColor);
    }
    function handleResetColors() {
        playClickSound();
        // Restaura los pickers a los defaults
        for (const key in DEFAULT_SETTINGS.customColors) {
            const picker = document.querySelector(`input[data-var="${key}"]`);
            if (picker) {
                picker.value = DEFAULT_SETTINGS.customColors[key];
                // Aplica inmediatamente si custom está activo
                if (gameState.settings.useCustomColors) {
                     document.documentElement.style.setProperty(key, DEFAULT_SETTINGS.customColors[key]);
                }
                // Guarda el reset
                saveSetting(`customColors.${key}`, DEFAULT_SETTINGS.customColors[key]);
            }
        }
    }
    function applyCustomColors(useCustom) {
        if (useCustom) {
            for (const key in gameState.settings.customColors) {
                document.documentElement.style.setProperty(key, gameState.settings.customColors[key]);
            }
        } else {
            // Elimina los estilos inline para volver a los del CSS
             for (const key in gameState.settings.customColors) {
                document.documentElement.style.removeProperty(key);
            }
        }
    }
    function setupSettingsScreen() {
        // Sincroniza los controles con el estado actual
        themeSelect.value = gameState.settings.theme;
        fontSelect.value = gameState.settings.boardFont;
        customColorsToggle.checked = gameState.settings.useCustomColors;
        customColorsSection.style.display = gameState.settings.useCustomColors ? 'block' : 'none';
        for (const key in gameState.settings.customColors) {
            const picker = document.querySelector(`input[data-var="${key}"]`);
            if (picker) picker.value = gameState.settings.customColors[key];
        }
        muteToggleSetting.checked = gameState.isMuted;
        showHintToggle.checked = gameState.settings.showHintButton;
        showPencilToggle.checked = gameState.settings.showPencilButton;
        showUndoToggle.checked = gameState.settings.showUndoButton;
    }
    function saveSetting(key, value) {
        // Maneja claves anidadas como 'customColors.--color-bg'
        if (key.includes('.')) {
            const keys = key.split('.');
            gameState.settings[keys[0]][keys[1]] = value;
        } else {
            gameState.settings[key] = value;
        }
        localStorage.setItem('sudokuSettings', JSON.stringify(gameState.settings));
    }
    function loadSettings() {
        const saved = localStorage.getItem('sudokuSettings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (typeof parsed === 'object' && parsed !== null) {
                    // Fusiona los defaults con lo guardado para evitar errores si faltan claves
                    gameState.settings = { ...DEFAULT_SETTINGS, ...parsed };
                    // Asegura que customColors exista y tenga las claves por defecto
                    gameState.settings.customColors = { ...DEFAULT_SETTINGS.customColors, ...(parsed.customColors || {}) };
                }
            } catch (e) {
                console.error("Error loading settings:", e);
                gameState.settings = { ...DEFAULT_SETTINGS }; // Usa defaults si hay error
            }
        }
        // Carga el estado de mute desde la config si existe, si no, usa el antiguo
        if (gameState.settings.isMuted !== undefined) {
             gameState.isMuted = gameState.settings.isMuted;
        } else {
            loadMuteState(); // Carga desde la clave antigua
        }
        muteToggleButton.classList.toggle('muted', gameState.isMuted); // Sincroniza icono principal
    }
    function applySettings() {
        // Aplicar tema
        if (gameState.settings.theme === 'auto') {
            applyDynamicTheme();
        } else {
            document.body.dataset.theme = gameState.settings.theme;
        }
        // Aplicar fuente
        applyFont(gameState.settings.boardFont);
        // Aplicar colores custom si están activos
        applyCustomColors(gameState.settings.useCustomColors);
        // Aplicar visibilidad de botones (se hará al iniciar juego)
    }

    // --- LÓGICA DE DESAFÍO DIARIO Y PISTAS ---
    // ... (setSeed, seededRandom - sin cambios) ...
    function setSeed(seed) { /*...*/ }
    function seededRandom() { /*...*/ }
    function startDailyChallenge() {
        playClickSound(); cancelAnimationFrame(confettiAnimationId); confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        gameState.gameInProgress = true; gameState.isDailyChallenge = true;
        resumeGameBtn.style.display = 'none'; goToLeaderboardBtn.style.display = 'none'; shareDailyResultBtn.style.display = 'none';
        gameState.currentDifficulty = DIFFICULTIES.MEDIO; gameState.lives = 3; gameState.selectedTile = null;
        gameState.secondsElapsed = 0; gameState.isPaused = false;
        gameState.lastMove = null; undoButton.style.display = 'none'; clearAllErrors();
        gameState.isPencilMode = false; pencilToggleButton.classList.remove('active');
        gameState.hintUsed = false; hintButton.classList.remove('disabled');
        gameState.notesBoard = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
        gameState.gameStats = { hasUsedUndo: false, notesPlaced: 0 };
        applyButtonVisibility(); // Aplica visibilidad
        renderTimer(); startTimer(); pauseButton.style.display = 'flex';
        const date = new Date(); const seed = parseInt(`${date.getFullYear()}${date.getMonth()}${date.getDate()}`); setSeed(seed);
        let baseBoard = generateEmptyBoard(); generateSolution(baseBoard, seededRandom);
        gameState.solution = JSON.parse(JSON.stringify(baseBoard));
        gameState.puzzleBoard = createPuzzle(baseBoard, DIFFICULTIES.MEDIO, seededRandom);
        updateLivesDisplay(); updateIngameStreakDisplay(); renderBoardImproved(); renderKeypad();
        showScreen('game');
    }
    function provideHint() { /* ... (sin cambios) ... */ }
    function findNakedSingle() { /* ... (sin cambios) ... */ }
    function findHiddenSingle() { /* ... (sin cambios) ... */ }
    function isPossible(r, c, num) { /* ... (sin cambios) ... */ }

    // --- LÓGICA DE LOGROS Y CLASIFICACIÓN ---
    function checkAchievements() {
        const { currentDifficulty, secondsElapsed, gameStats, streaks } = gameState;
        if (currentDifficulty === DIFFICULTIES.MEDIO && secondsElapsed < 300) unlockAchievement('speedRacer');
        if (currentDifficulty === DIFFICULTIES.DIFÍCIL && !gameStats.hasUsedUndo) unlockAchievement('perfectionist');
        const totalStreak = Object.values(streaks).reduce((sum, s) => sum + s, 0); // Calcula racha total
        if (totalStreak >= 10) unlockAchievement('streakMaster');
        if (gameState.isDailyChallenge) unlockAchievement('dailyConqueror');
    }
    function unlockAchievement(id) {
        if (gameState.achievements[id]) return;
        gameState.achievements[id] = true; saveAchievements(); playAchievementSound();
        showFlashMessage(`¡Logro: ${ACHIEVEMENT_DEFINITIONS[id].title}!`);
    }
    function saveAchievements() { localStorage.setItem('sudokuAchievements', JSON.stringify(gameState.achievements)); }
    function loadAchievements() {
        const saved = localStorage.getItem('sudokuAchievements');
        if (saved) try { const p = JSON.parse(saved); if (p && typeof p === 'object') gameState.achievements = p; } catch (e) { console.error("Err achievements:", e); }
    }
    function renderAchievementsPage() {
        achievementsList.innerHTML = '';
        for (const id in ACHIEVEMENT_DEFINITIONS) {
            const def = ACHIEVEMENT_DEFINITIONS[id]; const isUnlocked = gameState.achievements[id];
            const li = document.createElement('li'); li.className = 'achievement-item'; if (!isUnlocked) li.classList.add('locked');
            let icon = isUnlocked ? (def.title.split(' ')[1] || '🎖️') : '🔒';
            li.innerHTML = `<div class="achievement-icon">${icon}</div><div class="achievement-details"><h3>${def.title}</h3><p>${def.desc}</p></div>`;
            achievementsList.appendChild(li);
        }
    }
    function saveToLeaderboard(timeInSeconds) {
        const score = { time: timeInSeconds, date: new Date().toLocaleDateString('es-ES') };
        let scores = gameState.leaderboards.daily || [];
        scores.push(score); scores.sort((a, b) => a.time - b.time);
        gameState.leaderboards.daily = scores.slice(0, 5);
        saveLeaderboards();
    }
    function saveLeaderboards() { localStorage.setItem('sudokuLeaderboards', JSON.stringify(gameState.leaderboards)); }
    function loadLeaderboards() {
        const saved = localStorage.getItem('sudokuLeaderboards');
        if (saved) try { const p = JSON.parse(saved); if (p && typeof p === 'object') gameState.leaderboards = p; } catch (e) { console.error("Err leaderboards:", e); }
    }
    function renderLeaderboardsPage() {
        leaderboardTableBody.innerHTML = ''; const scores = gameState.leaderboards.daily || [];
        if (scores.length === 0) { leaderboardTableBody.innerHTML = '<tr><td colspan="3">Aún no hay récords. ¡Juega el Desafío Diario!</td></tr>'; return; }
        scores.forEach((score, index) => {
            const tr = document.createElement('tr'); tr.innerHTML = `<td>#${index + 1}</td><td>${formatTime(score.time)}</td><td>${score.date}</td>`;
            leaderboardTableBody.appendChild(tr);
        });
    }

    // --- LÓGICA PARA COMPARTIR ---
    async function shareDailyResult() {
        playClickSound();
        const timeStr = formatTime(gameState.secondsElapsed);
        const dateStr = new Date().toLocaleDateString('es-ES');
        const text = `¡Completé el Desafío Diario de Sudoku Pro en ${timeStr} el ${dateStr}! ¿Puedes superar mi tiempo?`;
        const url = window.location.href; // O una URL específica de tu juego

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'Resultado Sudoku Pro',
                    text: text,
                    url: url
                });
                showFlashMessage("¡Resultado compartido!");
            } else {
                // Fallback para copiar al portapapeles
                await navigator.clipboard.writeText(`${text} ${url}`);
                showFlashMessage("¡Resultado copiado al portapapeles!");
            }
        } catch (err) {
            console.error('Error al compartir:', err);
            // Fallback si todo falla (ej: copiar manualmente)
            try {
                 await navigator.clipboard.writeText(`${text} ${url}`);
                 showFlashMessage("Error al compartir, copiado al portapapeles.");
            } catch (copyErr) {
                 showFlashMessage("Error al compartir o copiar.");
            }
        }
    }

    // --- GENERADOR DE SUDOKU Y HELPERS ---
    // ... (getNumberCounts - sin cambios) ...
    function getNumberCounts() { /*...*/ }
    // ... (updateKeypad - modificado para resaltar completados) ...
    function updateKeypad() {
        const counts = getNumberCounts();
        const correctCounts = {}; // Contará solo los correctos
        for (let i = 1; i <= 9; i++) correctCounts[i] = 0;

        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                const num = gameState.puzzleBoard[r][c];
                if (num !== 0 && num === gameState.solution[r][c]) {
                    correctCounts[num]++;
                }
            }
        }

        document.querySelectorAll('.keypad-number').forEach(key => {
            const num = parseInt(key.textContent);
            const isComplete = correctCounts[num] === 9;
            key.classList.toggle('completed', isComplete);
             // Añade/actualiza el contador visual
            const countDisplay = key.querySelector('.keypad-number-count') || document.createElement('span');
            countDisplay.className = 'keypad-number-count';
            countDisplay.textContent = `${counts[num]}/9`;
            if (!key.querySelector('.keypad-number-count')) {
                key.appendChild(countDisplay);
            }
             // Usa visibility hidden si está completo, en lugar de disabled class
            key.style.visibility = isComplete ? 'hidden' : 'visible';
        });
    }
    // ... (checkWin, generateEmptyBoard, shuffle, findEmpty, isValid, generateSolution, createPuzzle - sin cambios) ...
    function checkWin() { /*...*/ }
    function generateEmptyBoard() { /*...*/ }
    function shuffle(array, randFunc = Math.random) { /*...*/ }
    function findEmpty(board) { /*...*/ }
    function isValid(board, num, pos) { /*...*/ }
    function generateSolution(board, randFunc = Math.random) { /*...*/ }
    function createPuzzle(board, difficulty, randFunc = Math.random) { /*...*/ }

    initialize();
});