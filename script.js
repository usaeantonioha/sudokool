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
        theme: 'auto', boardFont: 'Manrope', showHintButton: true, showPencilButton: true, showUndoButton: true,
        useCustomColors: false,
        customColors: {
            '--color-bg': '#f7faff', '--color-grid': '#555555', '--color-text': '#143478',
            '--color-hint': '#3C3C3C', '--color-highlight': 'rgba(0, 174, 239, 0.25)',
            '--color-select': 'rgba(255, 165, 0, 0.4)'
        },
        isMuted: false // Añadido para unificar mute
    };

    // --- ESTADO DEL JUEGO ---
    let gameState = {
        solution: [], puzzleBoard: [], lives: 3, selectedTile: null, currentDifficulty: DIFFICULTIES.MEDIO,
        streaks: { fácil: 0, medio: 0, difícil: 0, experto: 0 },
        totalWins: { fácil: 0, medio: 0, difícil: 0, experto: 0 },
        timerInterval: null, secondsElapsed: 0, isPaused: false, gameInProgress: false, lastMove: null,
        isPencilMode: false, notesBoard: [], isMuted: false, isDailyChallenge: false, hintUsed: false,
        achievements: {}, leaderboards: { daily: [] }, gameStats: { hasUsedUndo: false, notesPlaced: 0 },
        settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) // Copia profunda
    };

    // --- ELEMENTOS DEL DOM ---
    const screens = {
        start: document.getElementById('start-screen'), game: document.getElementById('game-screen'),
        gameOver: document.getElementById('game-over-screen'), instructions: document.getElementById('instructions-screen'),
        about: document.getElementById('about-screen'), pause: document.getElementById('pause-screen'),
        hintOverlay: document.getElementById('hint-overlay-screen'), leaderboard: document.getElementById('leaderboard-screen'),
        settings: document.getElementById('settings-screen')
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
    const settingsButton = document.getElementById('settings-btn');
    const shareDailyResultBtn = document.getElementById('share-daily-result-btn');
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
    // Necesitamos el botón de mute principal para sincronizar
    const muteToggleButton = document.getElementById('mute-toggle-btn');


    // --- LÓGICA DE AUDIO ---
    let audioCtx;
    function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    function playSound(type, freq, duration = 0.1) {
        if (gameState.isMuted || !audioCtx) return;
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        o.type = type; o.frequency.setValueAtTime(freq, audioCtx.currentTime);
        g.gain.setValueAtTime(0.2, audioCtx.currentTime);
        o.start(audioCtx.currentTime); o.stop(audioCtx.currentTime + duration);
    }
    function playClickSound() { playSound('sine', 880, 0.05); }
    function playErrorSound() { playSound('square', 220, 0.15); }
    function playWinSound() { playSound('sine',523,0.1); setTimeout(()=>playSound('sine',659,0.1),120); setTimeout(()=>playSound('sine',783,0.1),240); setTimeout(()=>playSound('sine',1046,0.15),360); }
    function playAchievementSound() { playSound('sawtooth', 660, 0.2); setTimeout(() => playSound('sawtooth', 880, 0.2), 200); }

    // --- LÓGICA DE CONFETI ---
    let confettiCtx = confettiCanvas.getContext('2d');
    let confettiParticles = [];
    let confettiAnimationId;
    function launchConfetti() {
        confettiCanvas.width = window.innerWidth; confettiCanvas.height = window.innerHeight;
        confettiParticles = []; const count = 200; const colors = ['#4285F4','#DB4437','#F4B400','#0F9D58'];
        for (let i = 0; i < count; i++) confettiParticles.push({ x: Math.random()*confettiCanvas.width, y: Math.random()*confettiCanvas.height-confettiCanvas.height, w: Math.random()*10+5, h: Math.random()*10+5, color: colors[Math.floor(Math.random()*colors.length)], speed: Math.random()*3+2, angle: Math.random()*2*Math.PI, tilt: Math.random()*10-5, tiltAngle: 0 });
        animateConfetti();
    }
    function animateConfetti() {
        confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
        confettiParticles.forEach((p,i) => { p.y += p.speed; p.tiltAngle += 0.1; p.x += Math.sin(p.tiltAngle)*0.5; p.tilt = Math.sin(p.tiltAngle)*p.tilt; confettiCtx.fillStyle = p.color; confettiCtx.save(); confettiCtx.translate(p.x+p.w/2, p.y+p.h/2); confettiCtx.rotate(p.tilt); confettiCtx.fillRect(-p.w/2, -p.h/2, p.w, p.h); confettiCtx.restore(); if(p.y > confettiCanvas.height) confettiParticles.splice(i, 1); });
        if(confettiParticles.length > 0) confettiAnimationId = requestAnimationFrame(animateConfetti);
        else confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    }

    // --- LÓGICA DE INICIO ---
    function initialize() {
        loadSettings(); applySettings(); // Config primero
        loadStreaks(); loadTotalWins(); loadAchievements(); loadLeaderboards();
        createDifficultyButtons(); addEventListeners();
    }

    function addEventListeners() {
        document.body.addEventListener('click', initAudio, { once: true });
        backToMenuBtn.addEventListener('click', togglePause);
        restartBtn.addEventListener('click', restartGame);
        infoIcon.addEventListener('click', () => { playClickSound(); showOverlay('instructions', true); });
        mainMenuLogo.addEventListener('click', () => { playClickSound(); renderAchievementsPage(); showOverlay('about', true); });
        settingsButton.addEventListener('click', () => { playClickSound(); setupSettingsScreen(); showOverlay('settings', true); });
        document.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', () => {
            playClickSound(); ['instructions', 'about', 'leaderboard', 'settings'].forEach(id => showOverlay(id, false));
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
        dailyChallengeButton.addEventListener('click', startDailyChallenge);
        hintButton.addEventListener('click', provideHint);
        hintOkButton.addEventListener('click', () => showOverlay('hintOverlay', false));
        leaderboardButton.addEventListener('click', () => { playClickSound(); renderLeaderboardsPage(); showOverlay('leaderboard', true); });
        goToLeaderboardBtn.addEventListener('click', () => { playClickSound(); showOverlay('gameOver', false); renderLeaderboardsPage(); showOverlay('leaderboard', true); });
        shareDailyResultBtn.addEventListener('click', shareDailyResult);
        tabButtons.forEach(btn => btn.addEventListener('click', handleTabClick));
        themeSelect.addEventListener('change', handleThemeChange);
        fontSelect.addEventListener('change', handleFontChange);
        customColorsToggle.addEventListener('change', handleCustomColorToggle);
        colorPickers.forEach(picker => picker.addEventListener('input', handleColorChange));
        resetColorsBtn.addEventListener('click', handleResetColors);
        muteToggleSetting.addEventListener('change', handleMuteChange);
        showHintToggle.addEventListener('change', (e) => handleButtonVisibilityChange('showHintButton', e.target.checked));
        showPencilToggle.addEventListener('change', (e) => handleButtonVisibilityChange('showPencilButton', e.target.checked));
        showUndoToggle.addEventListener('change', (e) => handleButtonVisibilityChange('showUndoButton', e.target.checked));
        // Listener para el botón de mute principal (si se decide mantener)
        muteToggleButton.addEventListener('click', () => {
             const newState = !gameState.isMuted;
             muteToggleSetting.checked = newState; // Sincroniza con el toggle de config
             handleMuteChange({ target: muteToggleSetting }); // Llama a la función de manejo
        });
    }

    function handleTabClick() {
        playClickSound();
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.dataset.tab).classList.add('active');
    }

    // ... (createDifficultyButtons - sin cambios) ...
    function createDifficultyButtons() { /*...*/ }

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
            if (key.style.visibility === 'hidden') return;
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
        undoButton.style.display = 'none';

        if (gameState.solution[row][col] === num) {
            gameState.selectedTile.classList.remove('tile-wrong-number');
            autoCleanNotes(row, col, num);
            if (checkWin()) endGame(true);
        } else {
            playErrorSound(); if (navigator.vibrate) navigator.vibrate(200);
            gameState.selectedTile.classList.add('tile-error', 'tile-wrong-number');
            highlightConflicts(row, col, num);
            setTimeout(() => { if(gameState.selectedTile) gameState.selectedTile.classList.remove('tile-error'); }, 500);
            if (gameState.settings.showUndoButton) undoButton.style.display = 'flex';
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
        applyButtonVisibility();
        if (gameState.lastMove && gameState.settings.showUndoButton) { undoButton.style.display = 'flex'; }
    }

    // --- RENDERIZADO Y UI ---
    // ... (showScreen, showOverlay) ...
    function renderBoardImproved() {
        boardElement.innerHTML = ''; const fragment = document.createDocumentFragment();
        for (let r = 0; r < 9; r++) { for (let c = 0; c < 9; c++) {
            const tile = document.createElement('div'); tile.className = 'tile'; tile.dataset.row = r; tile.dataset.col = c;
            if (c === 2 || c === 5) tile.classList.add('tile-border-right'); if (r === 2 || r === 5) tile.classList.add('tile-border-bottom');
            const numberEl = document.createElement('div'); numberEl.className = 'tile-number';
            const notesGrid = document.createElement('div'); notesGrid.className = 'tile-notes-grid';
            for (let i = 1; i <= 9; i++) { const noteEl = document.createElement('div'); noteEl.className = 'tile-note note-' + i; notesGrid.appendChild(noteEl); }
            if (initialPuzzleForResume[r]?.[c] !== 0) { numberEl.textContent = initialPuzzleForResume[r][c]; tile.classList.add('hint'); }
            else if (gameState.puzzleBoard[r]?.[c] !== 0) { numberEl.textContent = gameState.puzzleBoard[r][c]; tile.classList.add('user-filled'); if (gameState.solution[r]?.[c] !== gameState.puzzleBoard[r][c]) tile.classList.add('tile-wrong-number'); }
            else { const notes = gameState.notesBoard[r]?.[c]; if (notes && notes.size > 0) { tile.classList.add('is-notes'); notes.forEach(num => { const noteEl = notesGrid.querySelector('.note-' + num); if(noteEl) noteEl.textContent = num; }); } }
            tile.appendChild(numberEl); tile.appendChild(notesGrid); fragment.appendChild(tile);
        } } boardElement.appendChild(fragment);
    }
    function renderKeypad() {
        keypadElement.innerHTML = ''; const fragment = document.createDocumentFragment();
        for (let i = 1; i <= 9; i++) { const key = document.createElement('button'); key.className = 'keypad-number'; key.textContent = i; fragment.appendChild(key); }
        keypadElement.appendChild(fragment); updateKeypad(); // Llama a updateKeypad aquí
    }
    function renderTileNotes(row, col) {
        const tile = boardElement.children[row * 9 + col]; if (!tile) return;
        const notesGrid = tile.querySelector('.tile-notes-grid'); if (!notesGrid) return;
        const notes = gameState.notesBoard[row][col];
        tile.classList.toggle('is-notes', notes && notes.size > 0 && gameState.puzzleBoard[row][col] === 0);
        for (let i = 1; i <= 9; i++) { const noteEl = notesGrid.querySelector('.note-' + i); if (noteEl) { noteEl.textContent = notes.has(i) ? i : ''; noteEl.classList.toggle('visible', notes.has(i)); } } // Añade clase 'visible'
    }
    function updateLivesDisplay() { livesCounter.textContent = '❤️'.repeat(gameState.lives); }
    function updateIngameStreakDisplay() { const s=gameState.streaks[gameState.currentDifficulty]; ingameStreakDisplay.innerHTML=s>0?`👑 <span class="ingame-streak-number">${s}</span>`:'';}
    function showFlashMessage(message) { flashMessage.textContent=message; flashMessage.classList.add('show'); setTimeout(()=>flashMessage.classList.remove('show'),1500); }

    // --- LÓGICA DE RESALTADO ---
    // ... (Sin cambios) ...
    function clearAllHighlights(){document.querySelectorAll('.tile').forEach(t=>t.classList.remove('highlight','keypad-highlight','selected'));}
    function clearErrorHighlights(){document.querySelectorAll('.tile-conflict').forEach(t=>t.classList.remove('tile-conflict'));}
    function clearAllErrors(){document.querySelectorAll('.tile-conflict, .tile-wrong-number, .tile-error').forEach(t=>t.classList.remove('tile-conflict','tile-wrong-number','tile-error'));}
    function highlightTilesFromBoard(row,col){const r=parseInt(row),c=parseInt(col);clearAllHighlights();const tile=boardElement.children[r*9+c];if(tile)tile.classList.add('selected');const num=gameState.puzzleBoard[r][c];for(let i=0;i<9;i++){boardElement.children[r*9+i].classList.add('highlight');boardElement.children[i*9+c].classList.add('highlight');}if(num!==0){for(let i=0;i<9;i++)for(let j=0;j<9;j++)if(gameState.puzzleBoard[i][j]===num)boardElement.children[i*9+j].classList.add('keypad-highlight');}}
    function highlightNumbersFromKeypad(num){clearAllHighlights();if(num>0){for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(gameState.puzzleBoard[r][c]===num)boardElement.children[r*9+c].classList.add('keypad-highlight');}}
    function highlightConflicts(row,col,num){const b=gameState.puzzleBoard;for(let i=0;i<9;i++)if(i!==col&&b[row][i]===num)boardElement.children[row*9+i].classList.add('tile-conflict');for(let i=0;i<9;i++)if(i!==row&&b[i][col]===num)boardElement.children[i*9+col].classList.add('tile-conflict');const br=Math.floor(row/3)*3,bc=Math.floor(col/3)*3;for(let i=br;i<br+3;i++)for(let j=bc;j<bc+3;j++)if(i!==row||j!==col)if(b[i][j]===num)boardElement.children[i*9+j].classList.add('tile-conflict');}

    // --- LÓGICA DE GUARDADO (localStorage) ---
    function saveStreaks() { try { localStorage.setItem('sudokuStreaks', JSON.stringify(gameState.streaks)); } catch(e) { console.error("Error saving streaks:", e); } }
    function loadStreaks() { const s=localStorage.getItem('sudokuStreaks'); if(s) try { const p=JSON.parse(s); if(p&&typeof p==='object') gameState.streaks=p; } catch(e) { console.error("Err streaks:", e); localStorage.removeItem('sudokuStreaks'); gameState.streaks={fácil:0,medio:0,difícil:0,experto:0}; } }
    function saveTotalWins() { try { localStorage.setItem('sudokuTotalWins', JSON.stringify(gameState.totalWins)); } catch(e) { console.error("Error saving wins:", e); } }
    function loadTotalWins() { const s=localStorage.getItem('sudokuTotalWins'); if(s) try { const p=JSON.parse(s); if(p&&typeof p==='object') gameState.totalWins={...gameState.totalWins,...p}; } catch(e) { console.error("Err wins:", e); localStorage.removeItem('sudokuTotalWins'); gameState.totalWins={fácil:0,medio:0,difícil:0,experto:0}; } }

    // --- LÓGICA DE TIMER Y PAUSA ---
    function startTimer(){clearInterval(gameState.timerInterval);gameState.timerInterval=setInterval(updateTimer,1000);}
    function stopTimer(){clearInterval(gameState.timerInterval);}
    function updateTimer(){if(!gameState.isPaused){gameState.secondsElapsed++;renderTimer();}}
    function formatTime(s){const m=Math.floor(s/60).toString().padStart(2,'0'),sc=(s%60).toString().padStart(2,'0');return`${m}:${sc}`;}
    function renderTimer(){timerDisplay.textContent=formatTime(gameState.secondsElapsed);}
    function togglePause(){playClickSound();gameState.isPaused=!gameState.isPaused;showOverlay('pause',gameState.isPaused);}

    // --- LÓGICA DE MODO LÁPIZ Y AUTO-LIMPIEZA ---
    function togglePencilMode(){playClickSound();gameState.isPencilMode=!gameState.isPencilMode;pencilToggleButton.classList.toggle('active',gameState.isPencilMode);}
    function toggleNote(num){if(!gameState.selectedTile)return;const r=parseInt(gameState.selectedTile.dataset.row),c=parseInt(gameState.selectedTile.dataset.col);if(gameState.puzzleBoard[r][c]!==0)return;const n=gameState.notesBoard[r][c];if(n.has(num))n.delete(num);else{n.add(num);gameState.gameStats.notesPlaced++;if(gameState.gameStats.notesPlaced>=50)unlockAchievement('thinkingAhead');}renderTileNotes(r,c);}
    function autoCleanNotes(row,col,num){for(let i=0;i<9;i++)if(gameState.notesBoard[row][i]?.has(num)){gameState.notesBoard[row][i].delete(num);renderTileNotes(row,i);}for(let i=0;i<9;i++)if(gameState.notesBoard[i][col]?.has(num)){gameState.notesBoard[i][col].delete(num);renderTileNotes(i,col);}const br=Math.floor(row/3)*3,bc=Math.floor(col/3)*3;for(let i=br;i<br+3;i++)for(let j=bc;j<bc+3;j++)if(gameState.notesBoard[i]?.[j]?.has(num)){gameState.notesBoard[i][j].delete(num);renderTileNotes(i,j);}}

    // --- LÓGICA DE CONFIGURACIÓN ---
    function handleThemeChange(event){const n=event.target.value;saveSetting('theme',n);if(n==='auto')applyDynamicTheme();else document.body.dataset.theme=n;playClickSound();}
    function applyDynamicTheme(){const h=new Date().getHours();let t='light';if(h>=19||h<6)t='dark';else if(h>=16)t='sepia';document.body.dataset.theme=t;}
    function handleFontChange(event){const n=event.target.value;saveSetting('boardFont',n);applyFont(n);playClickSound();}
    function applyFont(f){let ff='var(--font-default)';if(f==='Roboto Slab')ff='var(--font-serif)';else if(f==='Source Code Pro')ff='var(--font-mono)';document.documentElement.style.setProperty('--font-board',ff);}
    function handleMuteChange(event){const m=event.target.checked;saveSetting('isMuted',m);gameState.isMuted=m;muteToggleButton.classList.toggle('muted',m);if(!m)playClickSound();}
    function handleButtonVisibilityChange(key,v){saveSetting(key,v);applyButtonVisibility();playClickSound();}
    function applyButtonVisibility(){if(hintButton)hintButton.style.display=gameState.settings.showHintButton?'flex':'none';if(pencilToggleButton)pencilToggleButton.style.display=gameState.settings.showPencilButton?'flex':'none';if(undoButton&&!gameState.settings.showUndoButton&&undoButton.style.display==='flex')undoButton.style.display='none';}
    function handleCustomColorToggle(event){const u=event.target.checked;saveSetting('useCustomColors',u);customColorsSection.style.display=u?'block':'none';applyCustomColors(u);playClickSound();}
    function handleColorChange(event){const v=event.target.dataset.var,c=event.target.value;if(gameState.settings.useCustomColors)document.documentElement.style.setProperty(v,c);saveSetting(`customColors.${v}`,c);}
    function handleResetColors(){playClickSound();for(const k in DEFAULT_SETTINGS.customColors){const p=document.querySelector(`input[data-var="${k}"]`);if(p){p.value=DEFAULT_SETTINGS.customColors[k];if(gameState.settings.useCustomColors)document.documentElement.style.setProperty(k,DEFAULT_SETTINGS.customColors[k]);saveSetting(`customColors.${k}`,DEFAULT_SETTINGS.customColors[k]);}}}
    function applyCustomColors(use){for(const k in gameState.settings.customColors){if(use)document.documentElement.style.setProperty(k,gameState.settings.customColors[k]);else document.documentElement.style.removeProperty(k);}}
    function setupSettingsScreen(){themeSelect.value=gameState.settings.theme;fontSelect.value=gameState.settings.boardFont;customColorsToggle.checked=gameState.settings.useCustomColors;customColorsSection.style.display=gameState.settings.useCustomColors?'block':'none';for(const k in gameState.settings.customColors){const p=document.querySelector(`input[data-var="${k}"]`);if(p)p.value=gameState.settings.customColors[k];}muteToggleSetting.checked=gameState.isMuted;showHintToggle.checked=gameState.settings.showHintButton;showPencilToggle.checked=gameState.settings.showPencilButton;showUndoToggle.checked=gameState.settings.showUndoButton;}
    function saveSetting(key,value){try{if(key.includes('.')){const k=key.split('.');gameState.settings[k[0]][k[1]]=value;}else{gameState.settings[key]=value;}localStorage.setItem('sudokuSettings',JSON.stringify(gameState.settings));}catch(e){console.error("Error saving setting:",key,e);}}
    function loadSettings() {
        let savedSettings = null;
        const saved = localStorage.getItem('sudokuSettings');
        if (saved) { try { savedSettings = JSON.parse(saved); } catch (e) { console.error("Error parsing settings:", e); localStorage.removeItem('sudokuSettings'); } }
        // Fusiona defaults con guardados, asegurando que todas las claves existan
        gameState.settings = deepMerge(JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), savedSettings || {});
        // Sincroniza isMuted global
        gameState.isMuted = gameState.settings.isMuted;
        muteToggleButton.classList.toggle('muted', gameState.isMuted);
    }
    // Helper para fusionar objetos profundamente (para settings)
    function deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }
    function applySettings() {
        if (gameState.settings.theme === 'auto') applyDynamicTheme(); else document.body.dataset.theme = gameState.settings.theme;
        applyFont(gameState.settings.boardFont); applyCustomColors(gameState.settings.useCustomColors);
        // La visibilidad de botones se aplica en startGame/resumeGame
    }

    // --- LÓGICA DE DESAFÍO DIARIO Y PISTAS ---
    function setSeed(s){randomSeed=s;} function seededRandom(){let x=Math.sin(randomSeed++)*1e4;return x-Math.floor(x);}
    function startDailyChallenge(){playClickSound();cancelAnimationFrame(confettiAnimationId);confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);gameState.gameInProgress=true;gameState.isDailyChallenge=true;resumeGameBtn.style.display='none';goToLeaderboardBtn.style.display='none';shareDailyResultBtn.style.display='none';gameState.currentDifficulty=DIFFICULTIES.MEDIO;gameState.lives=3;gameState.selectedTile=null;gameState.secondsElapsed=0;gameState.isPaused=false;gameState.lastMove=null;undoButton.style.display='none';clearAllErrors();gameState.isPencilMode=false;pencilToggleButton.classList.remove('active');gameState.hintUsed=false;hintButton.classList.remove('disabled');gameState.notesBoard=Array(9).fill(null).map(()=>Array(9).fill(null).map(()=>new Set()));gameState.gameStats={hasUsedUndo:false,notesPlaced:0};applyButtonVisibility();renderTimer();startTimer();pauseButton.style.display='flex';const d=new Date(),s=parseInt(`${d.getFullYear()}${d.getMonth()}${d.getDate()}`);setSeed(s);let b=generateEmptyBoard();generateSolution(b,seededRandom);gameState.solution=JSON.parse(JSON.stringify(b));gameState.puzzleBoard=createPuzzle(b,DIFFICULTIES.MEDIO,seededRandom);updateLivesDisplay();updateIngameStreakDisplay();renderBoardImproved();renderKeypad();showScreen('game');}
    function provideHint(){if(gameState.hintUsed)return;playClickSound();let h=findNakedSingle();if(!h)h=findHiddenSingle();if(h){gameState.hintUsed=true;hintButton.classList.add('disabled');gameState.secondsElapsed+=60;renderTimer();showFlashMessage("Pista usada: +1 minuto");const{row:r,col:c,num:n,logic:l}=h;gameState.puzzleBoard[r][c]=n;initialPuzzleForResume[r][c]=n;gameState.notesBoard[r][c].clear();renderBoardImproved();updateKeypad();const t=boardElement.children[r*9+c];gameState.selectedTile=t;highlightTilesFromBoard(r,c);hintExplanation.innerHTML=l;showOverlay('hintOverlay',true);}else showFlashMessage("No se encontraron pistas simples");}
    function findNakedSingle(){for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(gameState.puzzleBoard[r][c]===0){let p=new Set([1,2,3,4,5,6,7,8,9]);for(let i=0;i<9;i++)if(gameState.puzzleBoard[r][i]!==0)p.delete(gameState.puzzleBoard[r][i]);for(let i=0;i<9;i++)if(gameState.puzzleBoard[i][c]!==0)p.delete(gameState.puzzleBoard[i][c]);const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(let i=br;i<br+3;i++)for(let j=bc;j<bc+3;j++)if(gameState.puzzleBoard[i][j]!==0)p.delete(gameState.puzzleBoard[i][j]);if(p.size===1){const n=p.values().next().value;return{row:r,col:c,num:n,logic:`En la celda <span class="hint-cell">F${r+1}, C${c+1}</span>, el <strong>${n}</strong> es el único posible.`};}}return null;}
    function findHiddenSingle(){for(let r=0;r<9;r++)for(let n=1;n<=9;n++){let co=0,lc=-1;if([...gameState.puzzleBoard[r]].includes(n))continue;for(let c=0;c<9;c++)if(gameState.puzzleBoard[r][c]===0&&isPossible(r,c,n)){co++;lc=c;}if(co===1)return{row:r,col:lc,num:n,logic:`En la <span class="hint-cell">Fila ${r+1}</span>, la celda <span class="hint-cell">C${lc+1}</span> es el único lugar para el <strong>${n}</strong>.`};}/* ... (omitido col/box) ... */ return null;}
    function isPossible(r,c,n){for(let i=0;i<9;i++)if(gameState.puzzleBoard[r][i]===n)return false;for(let i=0;i<9;i++)if(gameState.puzzleBoard[i][c]===n)return false;const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(let i=br;i<br+3;i++)for(let j=bc;j<bc+3;j++)if(gameState.puzzleBoard[i][j]===n)return false;return true;}

    // --- LÓGICA DE LOGROS Y CLASIFICACIÓN ---
    function checkAchievements(){const{currentDifficulty:d,secondsElapsed:t,gameStats:gs,streaks:s}=gameState;if(d===DIFFICULTIES.MEDIO&&t<300)unlockAchievement('speedRacer');if(d===DIFFICULTIES.DIFÍCIL&&!gs.hasUsedUndo)unlockAchievement('perfectionist');const ts=Object.values(s).reduce((sum,v)=>sum+v,0);if(ts>=10)unlockAchievement('streakMaster');if(gameState.isDailyChallenge)unlockAchievement('dailyConqueror');}
    function unlockAchievement(id){if(gameState.achievements[id])return;gameState.achievements[id]=true;saveAchievements();playAchievementSound();showFlashMessage(`¡Logro: ${ACHIEVEMENT_DEFINITIONS[id].title}!`);}
    function saveAchievements(){try{localStorage.setItem('sudokuAchievements',JSON.stringify(gameState.achievements));}catch(e){console.error("Err save achieve:", e);}}
    function loadAchievements(){const s=localStorage.getItem('sudokuAchievements');if(s)try{const p=JSON.parse(s);if(p&&typeof p==='object')gameState.achievements=p;}catch(e){console.error("Err achieve:", e);localStorage.removeItem('sudokuAchievements');gameState.achievements={};}}
    function renderAchievementsPage(){achievementsList.innerHTML='';for(const id in ACHIEVEMENT_DEFINITIONS){const d=ACHIEVEMENT_DEFINITIONS[id],u=gameState.achievements[id];const li=document.createElement('li');li.className='achievement-item';if(!u)li.classList.add('locked');let i=u?(d.title.split(' ')[1]||'🎖️'):'🔒';li.innerHTML=`<div class="achievement-icon">${i}</div><div class="achievement-details"><h3>${d.title}</h3><p>${d.desc}</p></div>`;achievementsList.appendChild(li);}}
    function saveToLeaderboard(t){const score={time:t,date:new Date().toLocaleDateString('es-ES')};let s=gameState.leaderboards.daily||[];s.push(score);s.sort((a,b)=>a.time-b.time);gameState.leaderboards.daily=s.slice(0,5);saveLeaderboards();}
    function saveLeaderboards(){try{localStorage.setItem('sudokuLeaderboards',JSON.stringify(gameState.leaderboards));}catch(e){console.error("Err save leaders:", e);}}
    function loadLeaderboards(){const s=localStorage.getItem('sudokuLeaderboards');if(s)try{const p=JSON.parse(s);if(p&&typeof p==='object')gameState.leaderboards=p;}catch(e){console.error("Err leaders:", e);localStorage.removeItem('sudokuLeaderboards');gameState.leaderboards={daily:[]};}}
    function renderLeaderboardsPage(){leaderboardTableBody.innerHTML='';const s=gameState.leaderboards.daily||[];if(s.length===0){leaderboardTableBody.innerHTML='<tr><td colspan="3">Aún no hay récords. ¡Juega el Desafío Diario!</td></tr>';return;}s.forEach((sc,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td>#${i+1}</td><td>${formatTime(sc.time)}</td><td>${sc.date}</td>`;leaderboardTableBody.appendChild(tr);});}

    // --- LÓGICA PARA COMPARTIR ---
    async function shareDailyResult(){playClickSound();const t=formatTime(gameState.secondsElapsed),d=new Date().toLocaleDateString('es-ES'),tx=`¡Sudoku Pro: Desafío Diario del ${d} completado en ${t}! ¿Puedes superarlo? #SudokuPro`,u=window.location.href;try{if(navigator.share)await navigator.share({title:'Resultado Sudoku Pro',text:tx,url:u});else await navigator.clipboard.writeText(`${tx} ${u}`);showFlashMessage("¡Resultado copiado/compartido!");}catch(e){console.error('Error sharing:',e);try{await navigator.clipboard.writeText(`${tx} ${u}`);showFlashMessage("Error al compartir, copiado al portapapeles.");}catch(ce){showFlashMessage("Error al compartir o copiar.");}}}

    // --- GENERADOR DE SUDOKU Y HELPERS ---
    function getNumberCounts(){const c={};for(let i=1;i<=9;i++)c[i]=0;for(let r=0;r<9;r++)for(let j=0;j<9;j++)if(gameState.puzzleBoard[r][j]!==0)c[gameState.puzzleBoard[r][j]]++;return c;}
    function updateKeypad() {
        const counts = getNumberCounts(); const correctCounts = {};
        for(let i=1;i<=9;i++) correctCounts[i]=0;
        for(let r=0;r<9;r++) for(let c=0;c<9;c++) { const n=gameState.puzzleBoard[r][c]; if(n!==0&&n===gameState.solution[r][c]) correctCounts[n]++; }
        keypadElement.querySelectorAll('.keypad-number').forEach(key=>{
            const num = parseInt(key.textContent); const isComplete = correctCounts[num]===9;
            key.classList.toggle('completed', isComplete);
            const countEl = key.querySelector('.keypad-number-count') || document.createElement('span');
            countEl.className = 'keypad-number-count'; countEl.textContent = `${counts[num]}/9`;
            if(!key.querySelector('.keypad-number-count')) key.appendChild(countEl);
            key.style.visibility = isComplete ? 'hidden' : 'visible';
        });
    }
    function checkWin(){for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(gameState.puzzleBoard[r][c]===0)return false;return true;}
    function generateEmptyBoard(){return Array(9).fill(0).map(()=>Array(9).fill(0));}
    function shuffle(a,rnd=Math.random){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
    function findEmpty(b){for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(b[r][c]===0)return[r,c];return null;}
    function isValid(b,n,p){const[r,c]=p;for(let i=0;i<9;i++){if(b[r][i]===n&&c!==i)return false;if(b[i][c]===n&&r!==i)return false;}const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(let i=br;i<br+3;i++)for(let j=bc;j<bc+3;j++)if(b[i][j]===n&&(i!==r||j!==c))return false;return true;}
    function generateSolution(b,rnd=Math.random){const e=findEmpty(b);if(!e)return true;const[r,c]=e,nums=shuffle(Array.from({length:9},(_,i)=>i+1),rnd);for(const n of nums){if(isValid(b,n,[r,c])){b[r][c]=n;if(generateSolution(b,rnd))return true;b[r][c]=0;}}return false;}
    function createPuzzle(b,d,rnd=Math.random){const p=JSON.parse(JSON.stringify(b));let rem=CELLS_TO_REMOVE[d]||50,att=200;while(rem>0&&att>0){const r=Math.floor(rnd()*9),c=Math.floor(rnd()*9);if(p[r][c]!==0){p[r][c]=0;rem--;}att--;}initialPuzzleForResume=JSON.parse(JSON.stringify(p));return p;}

    initialize();
});