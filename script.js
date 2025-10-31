document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES ---
    const DIFFICULTIES = { FÁCIL: 'fácil', MEDIO: 'medio', DIFÍCIL: 'difícil', EXPERTO: 'experto' };
    const CELLS_TO_REMOVE = { fácil: 35, medio: 45, difícil: 53, experto: 58 };
    const ACHIEVEMENT_DEFINITIONS = { 'speedRacer':{title:'Velocista ⚡',desc:'Gana un juego Medio en menos de 5 minutos.'},'perfectionist':{title:'Perfeccionista 🎯',desc:'Gana un juego Difícil sin usar Pistas.'},'streakMaster':{title:'Imparable 🔥',desc:'Alcanza una racha de 10 victorias.'},'thinkingAhead':{title:'Estratega 🧠',desc:'Usa el modo Lápiz para hacer 50 notas.'},'dailyConqueror':{title:'Conquistador Diario 📅',desc:'Gana el Desafío Diario.'} };
    const DEFAULT_SETTINGS = { theme:'auto',boardFont:'Manrope',showHintButton:true,showPencilButton:true,isMuted:false }; // Undo eliminado
    const DEFAULT_STREAKS = { fácil:0,medio:0,difícil:0,experto:0 };
    const DEFAULT_WINS = { fácil:0,medio:0,difícil:0,experto:0 };
    const DEFAULT_ACHIEVEMENTS = {};
    const DEFAULT_LEADERBOARDS = { daily:[] };
    const AVERAGE_TIMES = { fácil:300,medio:600,difícil:1200,experto:1800 };

    // --- ESTADO DEL JUEGO ---
    let gameState = {
        solution:[], puzzleBoard:[], lives:3, selectedTile:null, currentDifficulty:DIFFICULTIES.MEDIO,
        streaks:JSON.parse(JSON.stringify(DEFAULT_STREAKS)), totalWins:JSON.parse(JSON.stringify(DEFAULT_WINS)),
        timerInterval:null, secondsElapsed:0, isPaused:false, gameInProgress:false, /*lastMove:null,*/ // Eliminado
        isPencilMode:false, notesBoard:[], isMuted:false, isDailyChallenge:false, hintUsed:false,
        achievements:JSON.parse(JSON.stringify(DEFAULT_ACHIEVEMENTS)), leaderboards:JSON.parse(JSON.stringify(DEFAULT_LEADERBOARDS)),
        gameStats:{/*hasUsedUndo:false,*/notesPlaced:0, hintUsedThisGame: false },
        settings:JSON.parse(JSON.stringify(DEFAULT_SETTINGS))
    };

    // --- ELEMENTOS DEL DOM ---
    let screens = {}, boardElement, keypadElement, /*livesCounter,*/ backToMenuBtn, restartBtn, gameOverMsg,
        difficultyButtonsContainer, flashMessage, ingameStreakDisplay, /*infoIcon,*/ mainMenuLogo,
        timerDisplay, pauseButton, resumeButton, resumeGameBtn, pauseBackToMenuBtn, gameOverHomeBtn,
        /*undoButton,*/ pencilToggleButton, dailyChallengeButton, hintButton, hintExplanation, hintOkButton,
        confettiCanvas, leaderboardButton, goToLeaderboardBtn, achievementsList, leaderboardTableBody,
        tabButtons, tabContents, settingsButton, shareDailyResultBtn, themeSelect, fontSelect,
        muteToggleSetting, showHintToggle, showPencilToggle, /*showUndoToggle,*/ // Eliminado
        sharePuzzleBtn, timeComparisonElement, eraseButton, errorCounterElement;
        // muteToggleButton fue eliminado

    function getElements() {
        screens = { start: document.getElementById('start-screen'), game: document.getElementById('game-screen'), gameOver: document.getElementById('game-over-screen'), /*instructions: document.getElementById('instructions-screen'),*/ about: document.getElementById('about-screen'), pause: document.getElementById('pause-screen'), hintOverlay: document.getElementById('hint-overlay-screen'), leaderboard: document.getElementById('leaderboard-screen'), settings: document.getElementById('settings-screen') };
        boardElement = document.getElementById('board'); keypadElement = document.getElementById('keypad'); /*livesCounter = document.getElementById('lives-counter');*/ backToMenuBtn = document.getElementById('back-to-menu'); restartBtn = document.getElementById('restart-button'); gameOverMsg = document.getElementById('game-over-message'); difficultyButtonsContainer = document.getElementById('difficulty-buttons'); flashMessage = document.getElementById('flash-message'); ingameStreakDisplay = document.getElementById('ingame-streak-display'); /*infoIcon = document.getElementById('info-icon');*/ mainMenuLogo = document.getElementById('main-menu-logo'); timerDisplay = document.getElementById('timer-display'); pauseButton = document.getElementById('pause-button'); resumeButton = document.getElementById('resume-button'); resumeGameBtn = document.getElementById('resume-game-btn'); pauseBackToMenuBtn = document.getElementById('pause-back-to-menu'); gameOverHomeBtn = document.getElementById('game-over-home-btn'); /*undoButton = document.getElementById('undo-button');*/ pencilToggleButton = document.getElementById('pencil-toggle-btn'); dailyChallengeButton = document.getElementById('daily-challenge-btn'); hintButton = document.getElementById('hint-button'); hintExplanation = document.getElementById('hint-explanation'); hintOkButton = document.getElementById('hint-ok-btn'); confettiCanvas = document.getElementById('confetti-canvas'); leaderboardButton = document.getElementById('leaderboard-btn'); goToLeaderboardBtn = document.getElementById('go-to-leaderboard-btn'); achievementsList = document.getElementById('achievements-list'); leaderboardTableBody = document.querySelector('#leaderboard-table tbody'); tabButtons = document.querySelectorAll('.tab-btn'); tabContents = document.querySelectorAll('.tab-content'); settingsButton = document.getElementById('settings-btn'); shareDailyResultBtn = document.getElementById('share-daily-result-btn'); themeSelect = document.getElementById('theme-select'); fontSelect = document.getElementById('font-select'); muteToggleSetting = document.getElementById('mute-toggle-setting'); showHintToggle = document.getElementById('show-hint-toggle'); showPencilToggle = document.getElementById('show-pencil-toggle'); /*showUndoToggle = document.getElementById('show-undo-toggle');*/ sharePuzzleBtn = document.getElementById('share-puzzle-btn'); timeComparisonElement = document.getElementById('time-comparison'); eraseButton = document.getElementById('erase-button');
        errorCounterElement = document.getElementById('error-counter');
        // exitButton eliminado

        // ===== CORRECCIÓN: Lista de elementos esenciales actualizada =====
        const essentialElements = { boardElement, keypadElement, difficultyButtonsContainer, settingsButton, startScreen: screens.start, gameScreen: screens.game, settingsScreen: screens.settings, themeSelect, fontSelect, muteToggleSetting, eraseButton, errorCounterElement, timerDisplay, backToMenuBtn, mainMenuLogo, dailyChallengeButton, leaderboardButton };
        for (const key in essentialElements) {
            if (!essentialElements[key]) {
                 let expectedId = key.replace(/([A-Z])/g, '-$1').toLowerCase().replace('-element','');
                 if (key.endsWith('Screen')) expectedId = key.replace('Screen','-screen');
                 throw new Error(`Elemento esencial del DOM no encontrado: '${key}' (esperaba ID similar a '${expectedId}'). Verifica el HTML.`);
            }
        }
    }

    // --- LÓGICA DE AUDIO ---
    let audioCtx; function initAudio(){if(!audioCtx)try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){console.warn("Web Audio API no soportada.", e);}}
    function playSound(t,f,d=0.1){if(gameState.isMuted||!audioCtx)return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.type=t;o.frequency.setValueAtTime(f,audioCtx.currentTime);g.gain.setValueAtTime(0.2,audioCtx.currentTime);o.start(audioCtx.currentTime);o.stop(audioCtx.currentTime+d);}catch(e){console.warn("Error al reproducir sonido:", e);}}
    function playClickSound(){playSound('sine',880,0.05);} function playErrorSound(){playSound('square',220,0.15);}
    function playWinSound(){playSound('sine',523,0.1);setTimeout(()=>playSound('sine',659,0.1),120);setTimeout(()=>playSound('sine',783,0.1),240);setTimeout(()=>playSound('sine',1046,0.15),360);}
    function playAchievementSound(){playSound('sawtooth',660,0.2);setTimeout(()=>playSound('sawtooth',880,0.2),200);}

    // --- LÓGICA DE CONFETI ---
    let confettiCtx; let confettiParticles=[]; let confettiAnimationId;
    function setupConfetti(){if(confettiCanvas)confettiCtx=confettiCanvas.getContext('2d');else console.warn("Canvas de confeti no encontrado.");}
    function launchConfetti(){if(!confettiCtx)return;confettiCanvas.width=window.innerWidth;confettiCanvas.height=window.innerHeight;confettiParticles=[];const c=200,o=['#4285F4','#DB4437','#F4B400','#0F9D58'];for(let i=0;i<c;i++)confettiParticles.push({x:Math.random()*confettiCanvas.width,y:Math.random()*confettiCanvas.height-confettiCanvas.height,w:Math.random()*10+5,h:Math.random()*10+5,color:o[Math.floor(Math.random()*o.length)],speed:Math.random()*3+2,angle:Math.random()*2*Math.PI,tilt:Math.random()*10-5,tiltAngle:0});animateConfetti();}
    function animateConfetti(){if(!confettiCtx)return;confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);confettiParticles.forEach((p,i)=>{p.y+=p.speed;p.tiltAngle+=0.1;p.x+=Math.sin(p.tiltAngle)*0.5;p.tilt=Math.sin(p.tiltAngle)*p.tilt;confettiCtx.fillStyle=p.color;confettiCtx.save();confettiCtx.translate(p.x+p.w/2,p.y+p.h/2);confettiCtx.rotate(p.tilt);confettiCtx.fillRect(-p.w/2,-p.h/2,p.w,p.h);confettiCtx.restore();if(p.y>confettiCanvas.height)confettiParticles.splice(i,1);});if(confettiParticles.length>0)confettiAnimationId=requestAnimationFrame(animateConfetti);else confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);}

    // --- LÓGICA DE INICIO ---
    function initialize() {
        getElements(); setupConfetti();
        loadSettings(); loadStreaks(); loadTotalWins(); loadAchievements(); loadLeaderboards();
        applySettings(); createDifficultyButtons(); addEventListeners();
        const urlParams = new URLSearchParams(window.location.search); const puzzleCode = urlParams.get('puzzle');
        if (puzzleCode) setTimeout(() => loadPuzzleFromCode(puzzleCode), 100);
        else showScreen('start');
    }

    function addEventListeners() {
        document.body.addEventListener('click', initAudio, { once: true });
        try {
            // ===== CORRECCIÓN: backToMenuBtn llama a togglePause =====
            backToMenuBtn?.addEventListener('click', togglePause);
            restartBtn?.addEventListener('click', restartGame);
            mainMenuLogo?.addEventListener('click', () => { playClickSound(); renderAchievementsPage(true); showOverlay('about', true); });
            settingsButton?.addEventListener('click', () => { playClickSound(); setupSettingsScreen(); showOverlay('settings', true); });
            document.querySelectorAll('.back-btn').forEach(btn => btn.addEventListener('click', () => { playClickSound(); ['instructions','about','leaderboard','settings'].forEach(id=>showOverlay(id,false)); }));
            boardElement?.addEventListener('click', handleBoardClick);
            keypadElement?.addEventListener('click', handleKeypadClick);
            pauseButton?.addEventListener('click', togglePause);
            resumeButton?.addEventListener('click', togglePause);
            resumeGameBtn?.addEventListener('click', resumeGame);
            pauseBackToMenuBtn?.addEventListener('click', goHomeFromPause);
            gameOverHomeBtn?.addEventListener('click', goHome);
            // undoButton eliminado
            pencilToggleButton?.addEventListener('click', togglePencilMode);
            eraseButton?.addEventListener('click', eraseNumber);
            dailyChallengeButton?.addEventListener('click', startDailyChallenge);
            hintButton?.addEventListener('click', provideHint);
            hintOkButton?.addEventListener('click', () => { clearHintHighlights(); showOverlay('hintOverlay', false); });
            leaderboardButton?.addEventListener('click', () => { playClickSound(); renderLeaderboardsPage(); showOverlay('leaderboard', true); });
            goToLeaderboardBtn?.addEventListener('click', () => { playClickSound(); showOverlay('gameOver', false); renderLeaderboardsPage(); showOverlay('leaderboard', true); });
            shareDailyResultBtn?.addEventListener('click', shareDailyResult);
            sharePuzzleBtn?.addEventListener('click', shareCurrentPuzzle);
            tabButtons?.forEach(btn => btn.addEventListener('click', handleTabClick));
            themeSelect?.addEventListener('change', handleThemeChange);
            fontSelect?.addEventListener('change', handleFontChange);
            muteToggleSetting?.addEventListener('change', handleMuteChange);
            showHintToggle?.addEventListener('change', (e) => handleButtonVisibilityChange('showHintButton', e.target.checked));
            showPencilToggle?.addEventListener('change', (e) => handleButtonVisibilityChange('showPencilButton', e.target.checked));
            // showUndoToggle eliminado
        } catch (e) { console.error("Error asignando event listeners:", e); }
    }

    function handleTabClick(event) {
        if (!event || !event.target || !event.target.dataset.tab) return;
        playClickSound();
        const aboutScreen = event.target.closest('.overlay-box');
        if (!aboutScreen) return;
        const currentTabButtons = aboutScreen.querySelectorAll('.tab-btn');
        const currentTabContents = aboutScreen.querySelectorAll('.tab-content');
        currentTabButtons.forEach(b => b.classList.remove('active'));
        currentTabContents.forEach(c => c.classList.remove('active'));
        event.target.classList.add('active');
        const targetContent = aboutScreen.querySelector(`#${event.target.dataset.tab}`);
        if (targetContent) targetContent.classList.add('active');
    }
    
    function renderAchievementsPage(forceResetTabs = false) {
        if (!achievementsList) return;
        achievementsList.innerHTML = '';
        for (const id in ACHIEVEMENT_DEFINITIONS) {
            const d = ACHIEVEMENT_DEFINITIONS[id], u = gameState.achievements[id];
            const li = document.createElement('li'); li.className = 'achievement-item'; if (!u) li.classList.add('locked');
            let i = u ? (d.title.split(' ')[1] || '🎖️') : '🔒';
            li.innerHTML = `<div class="achievement-icon">${i}</div><div class="achievement-details"><h3>${d.title}</h3><p>${d.desc}</p></div>`;
            achievementsList.appendChild(li);
        }
        if (forceResetTabs) {
            const aboutScreen = document.getElementById('about-screen'); if (!aboutScreen) return;
            const currentTabButtons = aboutScreen.querySelectorAll('.tab-btn');
            const currentTabContents = aboutScreen.querySelectorAll('.tab-content');
            currentTabButtons.forEach(b => b.classList.remove('active'));
            currentTabContents.forEach(c => c.classList.remove('active'));
            const infoTabBtn = aboutScreen.querySelector('.tab-btn[data-tab="info-tab"]');
            const infoTabContent = aboutScreen.querySelector('#info-tab');
            if (infoTabBtn) infoTabBtn.classList.add('active');
            if (infoTabContent) infoTabContent.classList.add('active');
        }
    }


    function createDifficultyButtons() {
        if (!difficultyButtonsContainer) { console.error("difficultyButtonsContainer no encontrado."); return; }
        difficultyButtonsContainer.innerHTML = ''; const f = document.createDocumentFragment();
        const l = [{key:'fácil',name:'Fácil'},{key:'medio',name:'Medio'},{key:'difícil',name:'Difícil'},{key:'experto',name:'Experto'}];
        l.forEach(v=>{const b=document.createElement('button');b.className='difficulty-btn neumorphic';b.dataset.difficulty=v.key;const t=document.createElement('span');t.textContent=v.name;b.appendChild(t);
        b.classList.add(`btn-${v.key}`);
        const s=(gameState.streaks&&typeof gameState.streaks==='object'&&gameState.streaks[v.key])?gameState.streaks[v.key]:0;if(s>0){const sp=document.createElement('span');sp.className='streak-display-menu';sp.textContent=`👑 ${s}`;b.appendChild(sp);}f.appendChild(b);});
        difficultyButtonsContainer.appendChild(f); difficultyButtonsContainer.addEventListener('click', handleDifficultyClick);
    }

    let initialPuzzleForResume = []; let randomSeed = 1;

    function startGame(difficulty, puzzleToLoad = null) {
        try {
            cancelAnimationFrame(confettiAnimationId); if(confettiCtx)confettiCtx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
            gameState.gameInProgress=true; gameState.isDailyChallenge=false;
            if(resumeGameBtn)resumeGameBtn.style.display='none'; if(goToLeaderboardBtn)goToLeaderboardBtn.style.display='none'; if(shareDailyResultBtn)shareDailyResultBtn.style.display='none';
            gameState.currentDifficulty=difficulty; gameState.lives=3; gameState.selectedTile=null;
            gameState.secondsElapsed=0; gameState.isPaused=false;
            gameState.lastMove=null; /*undoButton eliminado*/ clearAllErrors();
            gameState.isPencilMode=false; if(pencilToggleButton)pencilToggleButton.classList.remove('active');
            gameState.hintUsed=false; if(hintButton)hintButton.classList.remove('disabled');
            gameState.notesBoard=Array(9).fill(null).map(()=>Array(9).fill(null).map(()=>new Set()));
            gameState.gameStats={/*hasUsedUndo:false,*/notesPlaced:0, hintUsedThisGame: false};
            applyButtonVisibility();
            renderTimer(); startTimer(); if(pauseButton)pauseButton.style.display='flex';

            if (puzzleToLoad) {
                 gameState.puzzleBoard = puzzleToLoad.map(row => [...row]);
                 initialPuzzleForResume = puzzleToLoad.map(row => [...row]);
                 let solutionBoard = puzzleToLoad.map(row => [...row]);
                 if (!generateSolution(solutionBoard, Math.random)) { throw new Error("No se pudo generar solución para puzzle compartido."); }
                 gameState.solution = solutionBoard;
                 const emptyCells = puzzleToLoad.flat().filter(c => c === 0).length;
                 if (emptyCells > CELLS_TO_REMOVE.experto - 5) gameState.currentDifficulty = DIFFICULTIES.EXPERTO;
                 else if (emptyCells > CELLS_TO_REMOVE.difícil - 5) gameState.currentDifficulty = DIFFICULTIES.DIFÍCIL;
                 else if (emptyCells > CELLS_TO_REMOVE.medio - 5) gameState.currentDifficulty = DIFFICULTIES.MEDIO;
                 else gameState.currentDifficulty = DIFFICULTIES.FÁCIL;
            } else {
                 let b=generateEmptyBoard(); generateSolution(b,Math.random);
                 gameState.solution=JSON.parse(JSON.stringify(b));
                 gameState.puzzleBoard=createPuzzle(b,difficulty,Math.random);
            }

            updateLivesDisplay(); updateIngameStreakDisplay(); renderBoardImproved(); renderKeypad();
            showScreen('game');
        } catch (e) { console.error("Error iniciando juego:", e); showFlashMessage("Error al iniciar la partida."); goHome(); }
    }

    // --- MANEJADORES DE EVENTOS ---
    function handleDifficultyClick(event){const b=event.target.closest('.difficulty-btn');if(b){playClickSound();startGame(b.dataset.difficulty);}}
    function handleBoardClick(event){if(gameState.isPaused||!gameState.gameInProgress)return;const t=event.target.closest('.tile');if(!t)return;gameState.selectedTile=t;clearHintHighlights();clearErrorHighlights(); highlightTilesFromBoard(t.dataset.row,t.dataset.col);}
    function handleKeypadClick(event){if(gameState.isPaused||!gameState.gameInProgress)return;const k=event.target.closest('.keypad-number');if(k){playClickSound();if(k.classList.contains('completed')) return; const numTextEl=k.querySelector('.keypad-number-text');if(!numTextEl)return;const n=parseInt(numTextEl.textContent);if(isNaN(n)||n<1||n>9)return;if(gameState.selectedTile){clearHintHighlights();clearErrorHighlights(); if(gameState.isPencilMode)toggleNote(n);else placeNumber(n);}else{clearHintHighlights();clearErrorHighlights(); highlightNumbersFromKeypad(n);}}}

    // --- LÓGICA DEL JUEGO ---
    function placeNumber(num){if(!gameState.gameInProgress||!gameState.selectedTile||gameState.selectedTile.classList.contains('hint'))return;clearErrorHighlights();clearHintHighlights();const r=parseInt(gameState.selectedTile.dataset.row),c=parseInt(gameState.selectedTile.dataset.col);if(isNaN(r)||isNaN(c)||r<0||r>8||c<0||c>8){console.error("Coords inválidas:",r,c);return;}if(gameState.selectedTile.classList.contains('tile-wrong-number')){playErrorSound();showFlashMessage("Número ya marcado como incorrecto. Bórralo primero.");return;}const nts=gameState.notesBoard?.[r]?.[c]||new Set();
    // No guardar lastMove
    if(nts)nts.clear();renderTileNotes(r,c);
    if(!gameState.puzzleBoard[r])gameState.puzzleBoard[r]=[];gameState.puzzleBoard[r][c]=num;const numEl=gameState.selectedTile.querySelector('.tile-number');if(numEl){numEl.textContent=num.toString();numEl.classList.add('pop-in');setTimeout(()=>numEl.classList.remove('pop-in'),200);}else console.warn("NumEl missing");gameState.selectedTile.classList.add('user-filled');gameState.selectedTile.classList.remove('is-notes');highlightTilesFromBoard(r,c);
    // undoButton eliminado
    if(gameState.solution?.[r]?.[c]===num){gameState.selectedTile.classList.remove('tile-wrong-number');autoCleanNotes(r,c,num);if(checkWin()){gameState.selectedTile.classList.add('last-correct'); setTimeout(() => {gameState.selectedTile?.classList.remove('last-correct'); endGame(true);}, 800);} }else{playErrorSound();if(navigator.vibrate)navigator.vibrate(200);gameState.selectedTile.classList.add('tile-error','tile-wrong-number');highlightConflicts(r,c,num);setTimeout(()=>{if(gameState.selectedTile)gameState.selectedTile.classList.remove('tile-error');},500);
    // undoButton eliminado
    gameState.lives--;updateLivesDisplay();showFlashMessage("Número equivocado");
    // ===== CORRECCIÓN: Lógica de Game Over =====
    if(gameState.lives <= 0) { endGame(false); return; /* Detiene la ejecución aquí */ }
    }updateKeypad();}
    // undoLastMove eliminado
    function eraseNumber(){if(!gameState.gameInProgress||!gameState.selectedTile||gameState.isPaused||gameState.selectedTile.classList.contains('hint'))return;playClickSound();clearHintHighlights();const r=parseInt(gameState.selectedTile.dataset.row),c=parseInt(gameState.selectedTile.dataset.col);if(isNaN(r)||isNaN(c))return;const nts=gameState.notesBoard?.[r]?.[c]||new Set();
    // No guardar lastMove
    if(gameState.puzzleBoard?.[r]?.[c]!==0&&gameState.puzzleBoard?.[r]?.[c]!==undefined){if(!gameState.puzzleBoard[r])gameState.puzzleBoard[r]=[];gameState.puzzleBoard[r][c]=0;const nEl=gameState.selectedTile.querySelector('.tile-number');if(nEl)nEl.textContent='';gameState.selectedTile.classList.remove('user-filled','tile-wrong-number');clearErrorHighlights();updateKeypad();}else if(nts.size>0){nts.clear();renderTileNotes(r,c);}highlightTilesFromBoard(r,c);}
    function endGame(isWin){stopTimer();if(pauseButton)pauseButton.style.display='none';if(pencilToggleButton)pencilToggleButton.style.display='none';if(hintButton)hintButton.style.display='none';gameState.gameInProgress=false;if(resumeGameBtn)resumeGameBtn.style.display='none';/*undoButton eliminado*/gameState.lastMove=null;clearAllErrors();clearHintHighlights();let timeComparisonText='';if(isWin){animateBoardWin(); launchConfetti();playWinSound();gameState.streaks[gameState.currentDifficulty]++;gameState.totalWins[gameState.currentDifficulty]++;saveTotalWins();checkAchievements();if(gameState.isDailyChallenge){saveToLeaderboard(gameState.secondsElapsed);if(goToLeaderboardBtn)goToLeaderboardBtn.style.display='block';if(shareDailyResultBtn)shareDailyResultBtn.style.display='block';}else{const avgTime=AVERAGE_TIMES[gameState.currentDifficulty];if(avgTime){const diff=gameState.secondsElapsed-avgTime;timeComparisonText=diff<=0?`(${Math.abs(diff)}s más rápido que el promedio)`:`(${diff}s más lento que el promedio)`;}}if(gameOverMsg){gameOverMsg.textContent='¡FELICITACIONES!';gameOverMsg.classList.add('win');}else{gameOverMsg.classList.remove('win');}}else{gameState.streaks[gameState.currentDifficulty]=0;if(gameOverMsg){gameOverMsg.textContent='Game Over';gameOverMsg.className='lose';}if(gameOverMsg)gameOverMsg.classList.remove('win');}if(timeComparisonElement)timeComparisonElement.textContent=timeComparisonText;saveStreaks();setTimeout(() => showOverlay('gameOver', true), 600);}
    function restartGame(){playClickSound();showOverlay('gameOver',false);if(goToLeaderboardBtn)goToLeaderboardBtn.style.display='none';if(shareDailyResultBtn)shareDailyResultBtn.style.display='none';startGame(gameState.currentDifficulty);}
    function goHome(){playClickSound();stopTimer();if(pauseButton)pauseButton.style.display='none';if(pencilToggleButton)pencilToggleButton.style.display='none';if(hintButton)hintButton.style.display='none';gameState.isPaused=false;gameState.gameInProgress=false;gameState.secondsElapsed=0;if(resumeGameBtn)resumeGameBtn.style.display='none';if(goToLeaderboardBtn)goToLeaderboardBtn.style.display='none';if(shareDailyResultBtn)shareDailyResultBtn.style.display='none';/*undoButton eliminado*/gameState.lastMove=null;clearAllErrors();clearHintHighlights();showOverlay('gameOver',false);showOverlay('pause',false);showScreen('start');createDifficultyButtons();}
    function goHomeFromPause(){playClickSound();gameState.isPaused=true;gameState.gameInProgress=true;showOverlay('pause',false);showScreen('start');if(resumeGameBtn)resumeGameBtn.style.display='block';if(pauseButton)pauseButton.style.display='none';if(pencilToggleButton)pencilToggleButton.style.display='none';if(hintButton)hintButton.style.display='none';/*undoButton eliminado*/createDifficultyButtons();}
    function resumeGame(){playClickSound();gameState.isPaused=false;renderBoardImproved();updateKeypad();showScreen('game');if(resumeGameBtn)resumeGameBtn.style.display='none';if(pauseButton)pauseButton.style.display='flex';applyButtonVisibility();/*undoButton eliminado*/}

    // --- RENDERIZADO Y UI ---
    // ===== MODIFICADO: showScreen instantáneo =====
    function showScreen(key) {
        Object.values(screens).forEach(s => s?.classList.remove('active'));
        if (screens[key]) {
            screens[key].classList.add('active');
        }
    }
    function showOverlay(key,show){const o=screens[key];if(o)o.classList.toggle('active',show);}
    function renderBoardImproved(){if(!boardElement)return;boardElement.innerHTML='';const f=document.createDocumentFragment();for(let r=0;r<9;r++){for(let c=0;c<9;c++){const t=document.createElement('div');t.className='tile';t.dataset.row=r;t.dataset.col=c;if(c===2||c===5)t.classList.add('tile-border-right');if(r===2||r===5)t.classList.add('tile-border-bottom');const nEl=document.createElement('div');nEl.className='tile-number';const nGrid=document.createElement('div');nGrid.className='tile-notes-grid';for(let i=1;i<=9;i++){const nE=document.createElement('div');nE.className='tile-note note-'+i;nGrid.appendChild(nE);}const initialNum=initialPuzzleForResume?.[r]?.[c];const currentNum=gameState.puzzleBoard?.[r]?.[c];const solutionNum=gameState.solution?.[r]?.[c];if(initialNum!==undefined&&initialNum!==0){nEl.textContent=initialNum.toString();t.classList.add('hint');}else if(currentNum!==undefined&&currentNum!==0){nEl.textContent=currentNum.toString();t.classList.add('user-filled');if(solutionNum!==undefined&&currentNum!==solutionNum)t.classList.add('tile-wrong-number');}else{const nts=gameState.notesBoard?.[r]?.[c];if(nts&&nts.size>0){t.classList.add('is-notes');nts.forEach(num=>{const nE=nGrid.querySelector('.note-'+num);if(nE)nE.textContent=num.toString();});}}t.appendChild(nEl);t.appendChild(nGrid);f.appendChild(t);}}boardElement.appendChild(f);}
    function renderKeypad(){if(!keypadElement)return;keypadElement.innerHTML='';const f=document.createDocumentFragment();for(let i=1;i<=9;i++){const k=document.createElement('button');k.className='keypad-number';const numSpan=document.createElement('span');numSpan.className='keypad-number-text';numSpan.textContent=i.toString();k.appendChild(numSpan);const check=document.createElement('span');check.className='keypad-checkmark';check.innerHTML='✓';k.appendChild(check);f.appendChild(k);}keypadElement.appendChild(f);updateKeypad();}
    function renderTileNotes(r,c){const t=boardElement?.children[r*9+c];if(!t)return;const nG=t.querySelector('.tile-notes-grid');if(!nG)return;const nts=gameState.notesBoard?.[r]?.[c];const showNotes=nts&&nts.size>0&&gameState.puzzleBoard?.[r]?.[c]===0;t.classList.toggle('is-notes',showNotes);for(let i=1;i<=9;i++){const nE=nG.querySelector('.note-'+i);if(nE){const hasNote=nts&&nts.has(i);nE.textContent=hasNote?i.toString():'';nE.classList.toggle('visible',hasNote);if(hasNote){nE.classList.add('pop-in');setTimeout(()=>nE.classList.remove('pop-in'),200);}}}}
    function updateLivesDisplay(){if(errorCounterElement){const errs=3-Math.max(0,gameState.lives);errorCounterElement.textContent=`${errs}/3`;}}
    function updateIngameStreakDisplay(){if(!ingameStreakDisplay)return;const s=(gameState.streaks&&gameState.currentDifficulty)?gameState.streaks[gameState.currentDifficulty]||0:0;ingameStreakDisplay.innerHTML=s>0?`👑 <span class="ingame-streak-number">${s}</span>`:'';}
    function showFlashMessage(m){if(!flashMessage)return;flashMessage.textContent=m;flashMessage.classList.add('show');setTimeout(()=>flashMessage.classList.remove('show'),1500);}

    // --- LÓGICA DE RESALTADO ---
    function clearAllHighlights(){document.querySelectorAll('.tile').forEach(t=>t.classList.remove('highlight','keypad-highlight','selected'));}
    function clearErrorHighlights(){document.querySelectorAll('.tile.tile-conflict').forEach(t=>t.classList.remove('tile-conflict'));}
    function clearAllErrors(){document.querySelectorAll('.tile-conflict, .tile-wrong-number, .tile-error').forEach(t=>t.classList.remove('tile-conflict','tile-wrong-number','tile-error'));}
    function clearHintHighlights(){document.querySelectorAll('.tile-hint-target, .tile-hint-involved').forEach(t=>t.classList.remove('tile-hint-target','tile-hint-involved'));}
    function highlightTilesFromBoard(row,col){if(!boardElement)return;const r=parseInt(row),c=parseInt(col);if(isNaN(r)||isNaN(c))return;clearAllHighlights();const t=boardElement.children[r*9+c];if(t)t.classList.add('selected');const n=gameState.puzzleBoard?.[r]?.[c];if(n===undefined)return;for(let i=0;i<9;i++){const rowTile=boardElement.children[r*9+i];if(rowTile)rowTile.classList.add('highlight');const colTile=boardElement.children[i*9+c];if(colTile)colTile.classList.add('highlight');}if(n!==0){for(let i=0;i<9;i++)for(let j=0;j<9;j++)if(gameState.puzzleBoard?.[i]?.[j]===n){const numTile=boardElement.children[i*9+j];if(numTile)numTile.classList.add('keypad-highlight');}}}
    function highlightNumbersFromKeypad(n){clearAllHighlights();if(n>0){for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(gameState.puzzleBoard?.[r]?.[c]===n){const numTile=boardElement?.children[r*9+c];if(numTile)numTile.classList.add('keypad-highlight');}}}
    function highlightConflicts(r,c,n){const b=gameState.puzzleBoard;for(let i=0;i<9;i++){if(i!==c&&b?.[r]?.[i]===n){const tile=boardElement?.children[r*9+i];if(tile)tile.classList.add('tile-conflict');}if(i!==r&&b?.[i]?.[c]===n){const tile=boardElement?.children[i*9+c];if(tile)tile.classList.add('tile-conflict');}}const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(let i=br;i<br+3;i++)for(let j=bc;j<bc+3;j++)if(i!==r||j!==c)if(b?.[i]?.[j]===n){const tile=boardElement?.children[i*9+j];if(tile)tile.classList.add('tile-conflict');}}
    function highlightHintCells(targetCoords,involvedCoords=[]){clearHintHighlights();const targetTile=boardElement?.children[targetCoords.row*9+targetCoords.col];if(targetTile)targetTile.classList.add('tile-hint-target');involvedCoords.forEach(coords=>{const involvedTile=boardElement?.children[coords.row*9+coords.col];if(involvedTile)involvedTile.classList.add('tile-hint-involved');});}

    // --- LÓGICA DE GUARDADO (localStorage) ---
    // ===== CORRECCIÓN: Funciones de carga robustecidas =====
    function saveStreaks(){try{localStorage.setItem('sudokuStreaks',JSON.stringify(gameState.streaks));}catch(e){console.error("Error saving streaks:",e);}}
    function loadStreaks(){const key='sudokuStreaks'; const defaultVal=JSON.parse(JSON.stringify(DEFAULT_STREAKS)); gameState.streaks = defaultVal; try{const s=localStorage.getItem(key);if(s){const p=JSON.parse(s);if(p&&typeof p==='object'&&Object.keys(DEFAULT_STREAKS).every(k=>typeof p[k]==='number')){gameState.streaks=deepMerge(defaultVal, p);return;}throw new Error("Invalid format");}}catch(e){console.error(`Error loading ${key}:`,e,"Using defaults.");localStorage.removeItem(key);}}
    function saveTotalWins(){try{localStorage.setItem('sudokuTotalWins',JSON.stringify(gameState.totalWins));}catch(e){console.error("Error saving wins:",e);}}
    function loadTotalWins(){const key='sudokuTotalWins'; const defaultVal=JSON.parse