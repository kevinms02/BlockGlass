// ========================================
// Game State
// ========================================
const GRID_SIZE = 8;

const gameState = {
    grid: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)),
    score: 0,
    highScore: parseInt(localStorage.getItem('blockglassHighScore')) || 0,
    linesCleared: 0,
    availableBlocks: [],
    isGameOver: false,
    powerups: {
        bomb: 2,
        undo: 2,
        fill: 2,
        roll: 2
    },
    activePowerup: null,
    undoHistory: [],
    comboCount: 0,
    lastClearTime: 0,
    scoredInCurrentCycle: false, // Track if any block in the current 3-block cycle cleared a line
    cellCache: [], // Performance: Cache cell elements
    settings: {
        soundEnabled: true,
        vibrationEnabled: true
    }
};

// Drag state
const VERTICAL_CURSOR_OFFSET = 120; // Increased gap for better visibility during drag

let dragState = {
    isDragging: false,
    blockIndex: null,
    powerupType: null,
    ghostElement: null,
    sourceElement: null,
    dragOffsetRow: 0,
    dragOffsetCol: 0,
    currentGradient: null, // Store the color for the trail
    lastHighlightedCell: null,
    gridRect: null,
    cellSize: 0,
    rafScheduled: false, // Performance: Prevent multiple RAF calls
    lastPointerX: 0,
    lastPointerY: 0
};

// ========================================
// Sound Effects (Web Audio API)
// ========================================
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

const sounds = {
    buffer: {},
    init: function () {
        // Generate noise buffer for explosions/shatters
        const bufferSize = audioCtx.sampleRate * 2; // 2 seconds
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.buffer.noise = buffer;

        // Load custom sounds
        this.loadSound('Assets/SoundEffects/voicebosch-missile-explosion-168600.mp3', 'boom');
        this.loadSound('Assets/SoundEffects/game-start-317318.mp3', 'gameStart');
        this.loadSound('Assets/SoundEffects/video-game-bonus-323603.mp3', 'cleanSlate');
        this.loadSound('Assets/SoundEffects/fail-234710.mp3', 'fail');
        this.loadSound('Assets/SoundEffects/block-placed.mp3', 'place');
        this.loadSound('Assets/SoundEffects/virtual_vibes-pop-tap-click-fx-383733.mp3', 'uiClick');
    },
    loadSound: function (url, key) {
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                this.buffer[key] = audioBuffer;
            })
            .catch(e => console.warn(`Failed to load sound ${key}:`, e));
    },
    place: (frequency = 440) => {
        if (!gameState.settings.soundEnabled) return; // Check sound settings

        if (sounds.buffer.place) {
            const source = audioCtx.createBufferSource();
            source.buffer = sounds.buffer.place;
            source.connect(audioCtx.destination);
            source.start(0);
        } else {
            // Fallback
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = frequency;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.1);
        }
    },
    clear: (count = 1, comboCount = 0) => {
        if (!gameState.settings.soundEnabled) return; // Check sound settings

        // Calculate pitch multiplier based on combo count
        // Start at 1.0, increase by 0.1 for each combo level after 2
        // Cap at 2.0 (combo 10+)
        let pitchMultiplier = 1.0;
        if (comboCount > 2) {
            pitchMultiplier = Math.min(1.0 + ((comboCount - 2) * 0.1), 2.0);
        }

        // Play game start sound for clear
        if (sounds.buffer.gameStart) {
            const playSound = (offset) => {
                const source = audioCtx.createBufferSource();
                source.buffer = sounds.buffer.gameStart;

                // Apply pitch shift using playbackRate
                source.playbackRate.value = pitchMultiplier;

                source.connect(audioCtx.destination);
                // Start 0.4s into the buffer to skip any silence/buildup
                source.start(audioCtx.currentTime + offset, 0.4);
            };

            playSound(0);

            // "Double" the sound for each extra line count
            const extraPlays = Math.min(count - 1, 3);
            for (let i = 0; i < extraPlays; i++) {
                playSound((i + 1) * 0.08); // 80ms stagger
            }
        } else {
            // Fallback synth with pitch multiplier
            const t = audioCtx.currentTime;

            // Low bubbling layer
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(300 * pitchMultiplier, t);
            osc.frequency.linearRampToValueAtTime(600 * pitchMultiplier, t + 0.1);
            osc.frequency.linearRampToValueAtTime(100 * pitchMultiplier, t + 0.2);

            gain.gain.setValueAtTime(0.4, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

            osc.start(t);
            osc.stop(t + 0.3);

            // High "pop" layer
            const popOsc = audioCtx.createOscillator();
            const popGain = audioCtx.createGain();
            popOsc.connect(popGain);
            popGain.connect(audioCtx.destination);

            popOsc.type = 'sine';
            popOsc.frequency.setValueAtTime(800 * pitchMultiplier, t);
            popOsc.frequency.exponentialRampToValueAtTime(1200 * pitchMultiplier, t + 0.1);

            popGain.gain.setValueAtTime(0.3, t);
            popGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

            popOsc.start(t);
            popOsc.stop(t + 0.15);
        }
    },
    powerup: () => {
        if (!gameState.settings.soundEnabled) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
    },
    boom: () => {
        if (!gameState.settings.soundEnabled) return;

        // Play custom missile explosion
        if (sounds.buffer.boom) {
            const source = audioCtx.createBufferSource();
            source.buffer = sounds.buffer.boom;
            source.connect(audioCtx.destination);
            // Start 0.4s into buffer to skip silence, just like clear sound
            source.start(0, 0.4);
            // Crop to 0.5 second duration per user request
            source.stop(audioCtx.currentTime + 0.5);
        } else {
            // Fallback to synth if not loaded
            const t = audioCtx.currentTime;
            const noisesrc = audioCtx.createBufferSource();
            noisesrc.buffer = sounds.buffer.noise;
            const noisegain = audioCtx.createGain();
            const noisefilter = audioCtx.createBiquadFilter();

            noisesrc.connect(noisefilter);
            noisefilter.connect(noisegain);
            noisegain.connect(audioCtx.destination);

            noisefilter.type = 'lowpass';
            noisefilter.frequency.setValueAtTime(800, t);
            noisefilter.frequency.exponentialRampToValueAtTime(100, t + 0.5);

            noisegain.gain.setValueAtTime(0.8, t);
            noisegain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);

            noisesrc.start(t);
            noisesrc.stop(t + 0.8);
        }
    },
    fail: () => {
        if (!gameState.settings.soundEnabled) return;

        // Play custom fail sound
        if (sounds.buffer.fail) {
            const source = audioCtx.createBufferSource();
            source.buffer = sounds.buffer.fail;
            source.connect(audioCtx.destination);
            source.start(0);
        } else {
            const t = audioCtx.currentTime;

            // Dissatisfying descending tones
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.frequency.setValueAtTime(300, t);
            osc.frequency.linearRampToValueAtTime(100, t + 0.6);
            osc.type = 'sawtooth';

            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

            osc.start(t);
            osc.stop(t + 0.6);

            // Fail noise
            const nsrc = audioCtx.createBufferSource();
            nsrc.buffer = sounds.buffer.noise;
            const ngain = audioCtx.createGain();
            const nfilter = audioCtx.createBiquadFilter();

            nsrc.connect(nfilter);
            nfilter.connect(ngain);
            ngain.connect(audioCtx.destination);

            nfilter.type = 'lowpass';
            nfilter.frequency.setValueAtTime(500, t);

            ngain.gain.setValueAtTime(0.2, t);
            ngain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

            nsrc.start(t);
            nsrc.stop(t + 0.5);
        }
    },
    tick: () => {
        if (!gameState.settings.soundEnabled) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.05);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.05);
    },
    bonus: () => {
        if (!gameState.settings.soundEnabled) return;

        if (audioCtx.state === 'suspended') audioCtx.resume();

        if (sounds.buffer.cleanSlate) {
            const source = audioCtx.createBufferSource();
            source.buffer = sounds.buffer.cleanSlate;
            source.connect(audioCtx.destination);
            source.start(0);
        } else {
            // Fallback chime
            const t = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(523.25, t); // C5
            osc.frequency.linearRampToValueAtTime(1046.50, t + 0.3); // C6
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            osc.start(t);
            osc.stop(t + 0.3);
        }
    },
    uiClick: () => {
        if (!gameState.settings.soundEnabled) return;

        if (sounds.buffer.uiClick) {
            const source = audioCtx.createBufferSource();
            source.buffer = sounds.buffer.uiClick;
            const gainNode = audioCtx.createGain();
            gainNode.gain.value = 0.4; // Lower volume for UI sounds
            source.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            source.start(0);
        } else {
            // Fallback click sound
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.value = 800;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.05);
        }
    }
};

// Initialize sound buffers
sounds.init();

// ========================================
// Block Shapes
// ========================================
const BLOCK_SHAPES = [
    { cells: [[0, 0]], gradient: 1 },
    { cells: [[0, 0], [0, 1]], gradient: 2 },
    { cells: [[0, 0], [1, 0]], gradient: 3 },
    { cells: [[0, 0], [0, 1], [0, 2]], gradient: 4 },
    { cells: [[0, 0], [1, 0], [2, 0]], gradient: 5 },
    { cells: [[0, 0], [1, 0], [1, 1]], gradient: 6 },
    { cells: [[0, 1], [1, 0], [1, 1]], gradient: 7 },
    { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], gradient: 1 },
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], gradient: 2 },
    { cells: [[0, 0], [0, 1], [1, 0], [1, 1]], gradient: 3 },
    { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], gradient: 4 },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], gradient: 5 },
    { cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]], gradient: 6 },
    { cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], gradient: 7 },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], gradient: 1 },

    // Shape 1: Large Corner (3x3 L) and rotations
    { cells: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]], gradient: 2 }, // Base
    { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]], gradient: 3 }, // Rot 90
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]], gradient: 4 }, // Rot 180
    { cells: [[0, 2], [1, 2], [2, 0], [2, 1], [2, 2]], gradient: 5 }, // Rot 270

    // Shape 2: Diagonal 2 and rotation
    { cells: [[0, 0], [1, 1]], gradient: 6 }, // Base \
    { cells: [[0, 1], [1, 0]], gradient: 7 }, // Rot /

    // Shape 3: Diagonal 3 and rotations
    // Note: 3x3 diagonal effectively has 2 main directions, but user asked for "all variations"
    // For a centered 3x3 diagonal, rotation 180 is same as 0. 90 is same as 270.
    { cells: [[0, 0], [1, 1], [2, 2]], gradient: 1 }, // Base \
    { cells: [[0, 2], [1, 1], [2, 0]], gradient: 2 },  // Rot /

    // New 3x2 L Variations
    // Note: User reported 111/100 acted like 3x3.
    // Ensure coordinates are tight: rows 0-1, cols 0-2.
    { cells: [[0, 0], [0, 1], [0, 2], [1, 0]], gradient: 3 }, // Long top L (3x2)
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], gradient: 4 }, // Long top J (3x2)
    { cells: [[0, 0], [1, 0], [1, 1], [1, 2]], gradient: 5 }, // Long bottom L (3x2)
    { cells: [[0, 2], [1, 0], [1, 1], [1, 2]], gradient: 6 }, // Long bottom J (3x2)
    { cells: [[0, 0], [1, 0], [2, 0], [0, 1]], gradient: 7 }, // Tall left L (2x3)
    { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], gradient: 1 }, // Tall left J (2x3)
    { cells: [[0, 1], [1, 1], [2, 1], [0, 0]], gradient: 2 }, // Tall right L (2x3)
    { cells: [[0, 1], [1, 1], [2, 1], [2, 0]], gradient: 3 }, // Tall right J (2x3)

    // New 3x2 T Variations
    { cells: [[0, 0], [0, 1], [0, 2], [1, 1]], gradient: 4 }, // T down
    { cells: [[1, 0], [1, 1], [1, 2], [0, 1]], gradient: 5 }, // T up
    { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], gradient: 6 }, // T right
    { cells: [[0, 1], [1, 1], [2, 1], [1, 0]], gradient: 7 }  // T left
];

// ========================================
// DOM Elements
// ========================================
const elements = {
    gameContainer: document.querySelector('.game-container'),
    gameGrid: document.getElementById('gameGrid'),
    availableBlocks: document.getElementById('availableBlocks'),
    score: document.getElementById('score'),
    highScore: document.getElementById('highScore'),
    gameOverModal: document.getElementById('gameOverModal'),
    finalScore: document.getElementById('finalScore'),
    finalLines: document.getElementById('finalLines'),
    restartBtn: document.getElementById('restartBtn'),
    exitBtn: document.getElementById('exitBtn'),
    particleContainer: document.getElementById('particleContainer'),
    newHighScoreContainer: document.getElementById('newHighScoreContainer'),
    bombPowerup: document.getElementById('bombPowerup'),
    undoPowerup: document.getElementById('undoPowerup'),
    fillPowerup: document.getElementById('fillPowerup'),
    bombCount: document.getElementById('bombCount'),
    undoCount: document.getElementById('undoCount'),
    fillCount: document.getElementById('fillCount'),
    rollPowerup: document.getElementById('rollPowerup'),
    rollCount: document.getElementById('rollCount'),
    comboDisplay: document.getElementById('comboDisplay'),
    comboValue: document.getElementById('comboValue'),
    praiseNotification: document.getElementById('praiseNotification'),
    saveMePopup: document.getElementById('saveMePopup'),
    saveMeTimer: document.getElementById('saveMeTimer'),
    saveMeActionBtn: document.getElementById('saveMeActionBtn'),
    countdownCircle: document.getElementById('countdownCircle'),
    footer: document.querySelector('.game-footer')
};

// ========================================
// Initialize Game
// ========================================
// AFK idle timer
let idleTimer = null;
let saveMeCountdownInterval = null;

function resetIdleTimer() {
    clearTimeout(idleTimer);
    // Remove any jump animations
    document.querySelectorAll('.block-preview.hint-jump').forEach(el => {
        el.classList.remove('hint-jump');
    });
    idleTimer = setTimeout(() => triggerIdleHint(), 15000);
}

function triggerIdleHint() {
    const blocks = document.querySelectorAll('.block-preview:not(.dragging)');
    if (blocks.length === 0 || gameState.isGameOver) return;

    let i = 0;
    const jumpNext = () => {
        if (i >= blocks.length) {
            // Restart idle timer after all blocks jumped
            idleTimer = setTimeout(() => triggerIdleHint(), 15000);
            return;
        }
        const block = blocks[i];
        block.classList.add('hint-jump');
        block.addEventListener('animationend', () => {
            block.classList.remove('hint-jump');
        }, { once: true });
        i++;
        setTimeout(jumpNext, 300);
    };
    jumpNext();
}

function initGame() {
    createGrid();
    addRandomStartBlocks();
    renderGrid(); // Force render to show start blocks
    generateNewBlocks();
    updateUI();
    setupPowerups();
    setupGlobalDragListeners();
    elements.restartBtn.addEventListener('click', restartGame);

    // Exit button -> go back to lobby
    if (elements.exitBtn) {
        elements.exitBtn.addEventListener('click', () => {
            elements.gameOverModal.classList.add('hidden');
            document.getElementById('gameContainer').style.display = 'none';
            document.getElementById('lobbyScreen').style.display = '';
        });
    }

    // Save Me action button
    if (elements.saveMeActionBtn) {
        elements.saveMeActionBtn.addEventListener('click', executeSaveMe);
    }

    // AFK idle detection
    document.addEventListener('pointerdown', resetIdleTimer);
    document.addEventListener('pointermove', resetIdleTimer);
    resetIdleTimer();
}

// ========================================
// Save Me Countdown System
// ========================================
function showSaveMeCountdown() {
    let timeLeft = 5;
    const circumference = 2 * Math.PI * 52; // r=52

    elements.saveMePopup.classList.remove('hidden');
    elements.saveMeTimer.textContent = timeLeft;
    elements.countdownCircle.style.strokeDashoffset = '0';

    clearInterval(saveMeCountdownInterval);
    saveMeCountdownInterval = setInterval(() => {
        timeLeft--;
        elements.saveMeTimer.textContent = timeLeft;

        // Animate ring: stroke-dashoffset goes from 0 to circumference
        const progress = (5 - timeLeft) / 5;
        elements.countdownCircle.style.strokeDashoffset = (progress * circumference).toString();

        if (timeLeft <= 0) {
            clearInterval(saveMeCountdownInterval);
            elements.saveMePopup.classList.add('hidden');
            // Time's up - show real game over
            gameState.hasUsedSaveMe = true;
            showFinalGameOver();
        }
    }, 1000);
}

function executeSaveMe() {
    clearInterval(saveMeCountdownInterval);
    elements.saveMePopup.classList.add('hidden');

    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

    // Explode random blocks in a scattered pattern (clear ~12-16 cells)
    let cleared = 0;
    const maxClear = 14;
    const cellsToClear = [];

    // Collect all filled cells
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (gameState.grid[r][c] !== null) {
                cellsToClear.push([r, c]);
            }
        }
    }

    // Shuffle and pick random cells to clear
    for (let i = cellsToClear.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cellsToClear[i], cellsToClear[j]] = [cellsToClear[j], cellsToClear[i]];
    }

    for (const [r, c] of cellsToClear) {
        if (cleared >= maxClear) break;
        createParticles(r, c);
        gameState.grid[r][c] = null;
        const cell = getCellElement(r, c);
        if (cell) {
            cell.classList.remove('filled');
            cell.style.background = '';
        }
        cleared++;
    }

    gameState.hasUsedSaveMe = true;
    gameState.isGameOver = false;
    sounds.powerup();

    // Regenerate solvable blocks for tray
    generateNewBlocks();
    renderGrid();
    updateUI();
    resetIdleTimer();
}

function showFinalGameOver() {
    gameState.isGameOver = true;

    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('blockglassHighScore', gameState.highScore);
        elements.newHighScoreContainer.style.display = 'block';
    } else {
        elements.newHighScoreContainer.style.display = 'none';
    }

    elements.finalScore.textContent = gameState.score;
    elements.finalLines.textContent = gameState.linesCleared;
    elements.gameOverModal.classList.remove('hidden');
    sounds.fail();
}

// ========================================
// Setup Power-ups (Draggable)
// ========================================
function setupPowerups() {
    // Bomb - draggable
    elements.bombPowerup.addEventListener('pointerdown', (e) => startPowerupDrag(e, 'bomb'));

    // Fill - draggable
    elements.fillPowerup.addEventListener('pointerdown', (e) => startPowerupDrag(e, 'fill'));

    // Undo - click only
    elements.undoPowerup.addEventListener('click', () => executeUndo());

    // Roll - click only
    elements.rollPowerup.addEventListener('click', () => executeRoll());
}

function startPowerupDrag(e, type) {
    if (gameState.powerups[type] <= 0) return;
    if (e) e.preventDefault();

    dragState.isDragging = true;
    dragState.powerupType = type;
    dragState.blockIndex = null;

    // Determine gradient for fill tool immediately so ghost matches placement
    if (type === 'fill') {
        dragState.currentGradient = Math.floor(Math.random() * 7) + 1;
    } else {
        dragState.currentGradient = null;
    }

    // Initialize grid metrics for drag calculations
    const gridRect = elements.gameGrid.getBoundingClientRect();
    dragState.gridRect = gridRect;
    dragState.cellSize = gridRect.width / GRID_SIZE;

    // Create ghost element for power-up
    createPowerupGhost(type, e.clientX, e.clientY);
}

function createPowerupGhost(type, x, y) {
    dragState.ghostElement = document.createElement('div');
    dragState.ghostElement.className = 'drag-ghost powerup-ghost';

    if (type === 'bomb') {
        const pattern = [
            [0, 0, 1, 0, 0],
            [0, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 0, 1, 0, 0]
        ];

        // Alignment Fix: Subtract gap from size to match real grid cells
        const fullSize = dragState.cellSize || 40;
        const gap = 3;
        const size = fullSize - gap; // Actual cell visual size

        let gridHtml = `<div class="ghost-grid bomb-grid" style="grid-template-columns: repeat(5, ${size}px); grid-template-rows: repeat(5, ${size}px); gap: ${gap}px;">`;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const activeClass = pattern[r][c] ? 'bomb-cell active' : 'bomb-cell-empty';
                gridHtml += `<div class="ghost-cell ${activeClass}" style="width: ${size}px; height: ${size}px;"></div>`;
            }
        }
        gridHtml += '</div>';
        dragState.ghostElement.innerHTML = gridHtml;

    } else if (type === 'fill') {
        const fullSize = dragState.cellSize || 40;
        const gap = 3;
        const size = fullSize - gap;

        dragState.ghostElement.innerHTML = `
            <div class="ghost-grid" style="grid-template-columns: ${size}px; grid-template-rows: ${size}px;">
                <div class="ghost-cell fill-cell active" style="width: ${size}px; height: ${size}px; background: var(--gradient-${dragState.currentGradient || 4})"></div>
            </div>
        `;
    }

    // Powerups are usually 1x1 or 5x5 centered
    if (type === 'bomb') {
        dragState.dragOffsetRow = 2; // Center of 5x5
        dragState.dragOffsetCol = 2;
    } else {
        dragState.dragOffsetRow = 0; // 1x1
        dragState.dragOffsetCol = 0;
    }

    document.body.appendChild(dragState.ghostElement);

    // Cache size immediately after adding to DOM, then switch to transform movement
    const rect = dragState.ghostElement.getBoundingClientRect();
    dragState.ghostWidth = rect.width;
    dragState.ghostHeight = rect.height;

    updateGhostPosition(x, y);
}

function executeUndo() {
    if (gameState.undoHistory.length === 0) return;
    if (gameState.powerups.undo <= 0) return;

    const lastState = gameState.undoHistory.pop();
    gameState.grid = lastState.grid.map(row => [...row]);
    gameState.score = lastState.score;
    gameState.linesCleared = lastState.linesCleared;
    gameState.scoredInCurrentCycle = lastState.scoredInCurrentCycle;
    gameState.availableBlocks = JSON.parse(JSON.stringify(lastState.availableBlocks));

    gameState.powerups.undo--;
    sounds.powerup();

    renderGrid();
    renderAvailableBlocks();
    updateUI();
    updatePowerupUI();
    saveGameState();
}

function updatePowerupUI() {
    if (elements.bombCount) elements.bombCount.textContent = gameState.powerups.bomb;
    if (elements.undoCount) elements.undoCount.textContent = gameState.powerups.undo;
    if (elements.fillCount) elements.fillCount.textContent = gameState.powerups.fill;
    if (elements.rollCount) elements.rollCount.textContent = gameState.powerups.roll;

    elements.bombPowerup.classList.toggle('disabled', gameState.powerups.bomb <= 0);
    elements.undoPowerup.classList.toggle('disabled', gameState.powerups.undo <= 0 || gameState.undoHistory.length === 0);
    elements.fillPowerup.classList.toggle('disabled', gameState.powerups.fill <= 0);
    elements.rollPowerup.classList.toggle('disabled', gameState.powerups.roll <= 0);
}

// ========================================
// Create Game Grid
// ========================================
function createGrid() {
    elements.gameGrid.innerHTML = '';
    // Performance: Initialize cell cache
    gameState.cellCache = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            elements.gameGrid.appendChild(cell);
            // Cache the cell element
            gameState.cellCache[row][col] = cell;
        }
    }
}

function renderGrid() {
    // Performance: Use cached cells instead of querying DOM
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = gameState.cellCache[row][col];
            if (gameState.grid[row][col] !== null) {
                cell.classList.add('filled');
                cell.style.background = `var(--gradient-${gameState.grid[row][col]})`;
            } else {
                cell.classList.remove('filled');
                cell.style.background = '';
            }
        }
    }
}



// ========================================
// Execute Power-ups
// ========================================
function handlePowerupDrop(row, col) {
    if (dragState.powerupType === 'bomb') {
        executeBomb(row, col);
    } else if (dragState.powerupType === 'fill') {
        executeFill(row, col);
    }
}
function executeBomb(centerRow, centerCol) {
    if (gameState.powerups.bomb <= 0) return;

    saveUndoState();
    sounds.boom();

    // Vibrate device
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

    // Screen shake
    document.body.classList.add('shake-hard');
    setTimeout(() => document.body.classList.remove('shake-hard'), 500);

    // Diamond pattern offsets
    const patternOffsets = [
        { r: -2, c: 0, d: 2 },
        { r: -1, c: -1, d: 1 }, { r: -1, c: 0, d: 1 }, { r: -1, c: 1, d: 1 },
        { r: 0, c: -2, d: 2 }, { r: 0, c: -1, d: 1 }, { r: 0, c: 0, d: 0 }, { r: 0, c: 1, d: 1 }, { r: 0, c: 2, d: 2 },
        { r: 1, c: -1, d: 1 }, { r: 1, c: 0, d: 1 }, { r: 1, c: 1, d: 1 },
        { r: 2, c: 0, d: 2 }
    ];

    let destroyedCount = 0;
    const centerCell = getCellElement(centerRow, centerCol);
    if (centerCell) {
        showFloatingScore(100, centerRow, centerCol, true); // Big score for bomb
    }

    patternOffsets.forEach(({ r, c, d }) => {
        const targetRow = centerRow + r;
        const targetCol = centerCol + c;

        if (targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE) {
            // Progressive destruction based on distance (d)
            setTimeout(() => {
                if (gameState.grid[targetRow][targetCol] !== null) {
                    createParticles(targetRow, targetCol);
                    gameState.grid[targetRow][targetCol] = null;

                    const cell = getCellElement(targetRow, targetCol);
                    cell.classList.remove('filled');
                    cell.style.background = '';

                    // No sound for individual blocks during bomb, let explosion dominate
                    destroyedCount++;
                }
            }, d * 80);
        }
    });

    gameState.powerups.bomb--;
    updatePowerupUI();
    hideStuckPopup();

    // Check game over only after animation finishes roughly
    setTimeout(() => {
        // Suppress sound for lines cleared by bomb
        checkAndClearLines(centerRow, centerCol, true);
        checkGameOver();
        saveGameState();
    }, 400);
}

function executeFill(row, col) {
    if (gameState.powerups.fill <= 0) return;
    if (gameState.grid[row][col] !== null) return;

    saveUndoState();

    if (navigator.vibrate) navigator.vibrate(50);

    // Use the gradient chosen during drag, or random if not dragging (fallback)
    const gradient = dragState.currentGradient || Math.floor(Math.random() * 7) + 1;
    gameState.grid[row][col] = gradient;

    const cell = getCellElement(row, col);
    if (cell) {
        cell.classList.add('filled');
        cell.style.background = `var(--gradient-${gradient})`;
    }

    gameState.powerups.fill--;
    sounds.place(660);
    showFloatingScore(10, row, col);

    const clearedLines = checkAndClearLines(row, col);
    if (clearedLines > 0) {
        const bonus = clearedLines * 100 * (clearedLines > 1 ? clearedLines : 1);
        gameState.score += bonus;
        gameState.linesCleared += clearedLines;
    }

    updateUI();
    updatePowerupUI();
    saveGameState();
}

function executeRoll() {
    if (gameState.powerups.roll <= 0) return;

    saveUndoState();

    // Identify indices of blocks to replace (unused ones)
    const indicesToReplace = [];
    gameState.availableBlocks.forEach((block, index) => {
        if (!block.used) indicesToReplace.push(index);
    });

    if (indicesToReplace.length > 0) {
        // Generate a solvable set for these specific slots
        const newBlocks = getSolvableBlockSet(indicesToReplace.length);

        indicesToReplace.forEach((replaceIndex, i) => {
            const newBlock = newBlocks[i];
            newBlock.used = false;
            newBlock.isNew = true;
            gameState.availableBlocks[replaceIndex] = newBlock;
        });
    }

    gameState.powerups.roll--;
    sounds.powerup();
    hideStuckPopup();

    renderAvailableBlocks();
    checkGameOver();

    updatePowerupUI();
    saveGameState();
}

function saveUndoState() {
    gameState.undoHistory.push({
        grid: gameState.grid.map(row => [...row]),
        score: gameState.score,
        linesCleared: gameState.linesCleared,
        scoredInCurrentCycle: gameState.scoredInCurrentCycle,
        availableBlocks: JSON.parse(JSON.stringify(gameState.availableBlocks))
    });

    if (gameState.undoHistory.length > 5) {
        gameState.undoHistory.shift();
    }
}

// ========================================
// Generate Random Blocks
// ========================================
// ========================================
// Helper to get dimensions of a block shape
// ========================================
function getBlockDimensions(cells) {
    let maxR = 0, maxC = 0;
    cells.forEach(([r, c]) => {
        if (r > maxR) maxR = r;
        if (c > maxC) maxC = c;
    });
    return { rows: maxR + 1, cols: maxC + 1 };
}

// ========================================
// Generate Random Blocks (Smart Algorithm)
// ========================================

// Helper: simulate placing a block on a grid copy and clear completed lines
function simulatePlaceAndClear(grid, block, row, col) {
    const newGrid = grid.map(r => [...r]);
    block.cells.forEach(([dr, dc]) => {
        newGrid[row + dr][col + dc] = 1;
    });
    // Clear completed rows and columns
    for (let r = 0; r < GRID_SIZE; r++) {
        if (newGrid[r].every(cell => cell !== null)) {
            newGrid[r] = new Array(GRID_SIZE).fill(null);
        }
    }
    for (let c = 0; c < GRID_SIZE; c++) {
        if (newGrid.every(row => row[c] !== null)) {
            for (let r = 0; r < GRID_SIZE; r++) {
                newGrid[r][c] = null;
            }
        }
    }
    return newGrid;
}

// Helper: find a valid placement position for a block on a grid
function findPlacement(grid, block) {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            let fits = true;
            for (const [dr, dc] of block.cells) {
                const tr = r + dr, tc = c + dc;
                if (tr < 0 || tr >= GRID_SIZE || tc < 0 || tc >= GRID_SIZE || grid[tr][tc] !== null) {
                    fits = false;
                    break;
                }
            }
            if (fits) return { row: r, col: c };
        }
    }
    return null;
}

// Helper: check if a block can be placed anywhere on a grid
function canFitAnywhere(grid, block) {
    return findPlacement(grid, block) !== null;
}

// Smart solver: check if blocks can be placed in SOME order (with line clears)
function canSolveWithClears(grid, blocks) {
    if (blocks.length === 0) return true;

    // Try each block as the next one to place
    for (let i = 0; i < blocks.length; i++) {
        const placement = findPlacement(grid, blocks[i]);
        if (placement) {
            const newGrid = simulatePlaceAndClear(grid, blocks[i], placement.row, placement.col);
            const remaining = blocks.filter((_, idx) => idx !== i);
            if (canSolveWithClears(newGrid, remaining)) {
                return true;
            }
        }
    }
    return false;
}

// Helper to find a set of blocks that fits the current grid
function getSolvableBlockSet(count) {
    if (count <= 0) return [];

    const grid = gameState.grid;
    const emptyCells = grid.flat().filter(c => c === null).length;
    const isGridTight = emptyCells < 20;
    const isGridVeryTight = emptyCells < 12;

    // Step 1: Find ALL block shapes that can actually fit the current grid
    const fittingShapes = [];
    const smallFittingShapes = []; // Shapes with <= 3 cells

    for (let i = 0; i < BLOCK_SHAPES.length; i++) {
        if (canFitAnywhere(grid, BLOCK_SHAPES[i])) {
            fittingShapes.push(BLOCK_SHAPES[i]);
            if (BLOCK_SHAPES[i].cells.length <= 3) {
                smallFittingShapes.push(BLOCK_SHAPES[i]);
            }
        }
    }

    // Step 2: If nothing fits at all, give mercy 1x1 blocks
    if (fittingShapes.length === 0) {
        console.log("No blocks fit at all — mercy 1x1 blocks");
        const mercySet = [];
        for (let i = 0; i < count; i++) {
            mercySet.push({ ...BLOCK_SHAPES[0], gradient: Math.floor(Math.random() * 7) + 1 });
        }
        return mercySet;
    }

    // Step 3: Try to build a solvable set (with line clear simulation)
    const MAX_ATTEMPTS = 300; // Increased from 150 for better chances on tight grids

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const resultSet = [];

        for (let i = 0; i < count; i++) {
            let pool;

            // On very tight grids, biased heavily towards small pieces
            if (isGridVeryTight && smallFittingShapes.length > 0) {
                // 80% chance for small shapes on very tight grid
                pool = (Math.random() < 0.8) ? smallFittingShapes : fittingShapes;
            } else if (isGridTight && smallFittingShapes.length > 0) {
                // 50% chance for small shapes on tight grid
                pool = (Math.random() < 0.5) ? smallFittingShapes : fittingShapes;
            } else {
                pool = fittingShapes; // Normal distribution
            }

            const shape = pool[Math.floor(Math.random() * pool.length)];
            resultSet.push({
                ...shape,
                gradient: Math.floor(Math.random() * 7) + 1
            });
        }

        // Verify: all 3 blocks can be placed in some order (with line clears between)
        if (canSolveWithClears(grid, resultSet)) {
            return resultSet;
        }
    }

    // Fallback: return small blocks that individually fit
    console.log("Could not find solvable set, falling back to mercy blocks");
    const fallback = [];

    // MERCY RULE: If grid is tight, FORCE a 1x1 block (index 0) if it fits. 
    // This gives the user a fighting chance to clear a line.
    if (isGridTight && canFitAnywhere(grid, BLOCK_SHAPES[0])) {
        fallback.push({ ...BLOCK_SHAPES[0], gradient: Math.floor(Math.random() * 7) + 1 });
    }

    const fallbackPool = smallFittingShapes.length > 0 ? smallFittingShapes : fittingShapes;

    // Fill remaining slots
    while (fallback.length < count) {
        fallback.push({
            ...fallbackPool[Math.floor(Math.random() * fallbackPool.length)],
            gradient: Math.floor(Math.random() * 7) + 1
        });
    }

    return fallback;
}

function generateNewBlocks() {
    gameState.availableBlocks = [];

    // Generate 3 solvable blocks
    const newBlocks = getSolvableBlockSet(3);

    newBlocks.forEach(block => {
        block.isNew = true;
        gameState.availableBlocks.push(block);
    });

    renderAvailableBlocks();
    checkGameOver();
}

// ========================================
// Render Available Blocks
// ========================================
function renderAvailableBlocks() {
    elements.availableBlocks.innerHTML = '';

    gameState.availableBlocks.forEach((block, index) => {
        const blockPreview = document.createElement('div');
        blockPreview.className = 'block-preview';
        blockPreview.dataset.blockIndex = index;

        blockPreview.dataset.blockIndex = index;

        // Staggered Animation: Only if the block is marked as "new"
        if (block.isNew) {
            blockPreview.style.animation = `blockAppear 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`;
            blockPreview.style.animationDelay = `${index * 0.15}s`;
            blockPreview.style.opacity = '0';

            // Remove the flag after render so it doesn't re-animate
            // We use a small timeout to clear it from the state object safely
            setTimeout(() => { block.isNew = false; }, 1000);
        } else {
            // Ensure visibility if not animating
            blockPreview.style.opacity = '1';
        }

        // Always render structure to keep internal size, but hide if used

        // Always render structure to keep internal size, but hide if used
        const { rows, cols } = getBlockDimensions(block.cells);
        const blockGrid = document.createElement('div');
        blockGrid.className = 'block-grid';
        blockGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        blockGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'block-cell';

                const isActive = block.cells.some(([br, bc]) => br === r && bc === c);
                if (isActive) {
                    cell.classList.add('active');
                    cell.style.background = `var(--gradient-${block.gradient})`;
                } else {
                    // Empty cells take space
                    cell.style.visibility = 'hidden';
                }

                blockGrid.appendChild(cell);
            }
        }

        blockPreview.appendChild(blockGrid);

        // If used, make invisible but keep layout (visibility: hidden)
        if (block.used) {
            blockPreview.style.visibility = 'hidden';
            blockPreview.style.pointerEvents = 'none';
        } else {
            // Pointer-based drag
            blockPreview.addEventListener('pointerdown', (e) => startBlockDrag(e, index, block));
        }

        elements.availableBlocks.appendChild(blockPreview);
    });
}

function startBlockDrag(e, index, block) {
    if (e) e.preventDefault();

    // Find and hide source element
    dragState.sourceElement = e.target.closest('.block-preview');
    if (dragState.sourceElement) {
        // Use class instead of inline style to override animation
        dragState.sourceElement.classList.add('dragging');
    }

    dragState.isDragging = true;
    dragState.blockIndex = index;
    dragState.powerupType = null;
    dragState.currentGradient = block.gradient; // Set the gradient for trail light

    // Calculate center offset for grid alignment
    // (rows/2, cols/2) ensures we pick the cell corresponding to the center of the block
    const { rows, cols } = getBlockDimensions(block.cells);
    dragState.dragOffsetRow = Math.floor(rows / 2);
    dragState.dragOffsetCol = Math.floor(cols / 2);

    // Cache grid dimensions for performance
    const gridRect = elements.gameGrid.getBoundingClientRect();
    dragState.gridRect = gridRect;
    dragState.cellSize = gridRect.width / GRID_SIZE;

    createBlockGhost(block, e.clientX, e.clientY);
}

function createBlockGhost(block, x, y) {
    const { rows, cols } = getBlockDimensions(block.cells);

    dragState.ghostElement = document.createElement('div');
    dragState.ghostElement.className = 'drag-ghost';

    // Use dynamic cell size if available, otherwise fallback to 40
    // We do NOT use transform scale here because we are setting explicit pixel sizes below.
    const size = dragState.cellSize || 40;

    const gap = 3; // Match CSS gap if possible, or use 0

    const ghostGrid = document.createElement('div');
    ghostGrid.className = 'ghost-grid';
    ghostGrid.style.gridTemplateColumns = `repeat(${cols}, ${size}px)`;
    ghostGrid.style.gridTemplateRows = `repeat(${rows}, ${size}px)`;
    ghostGrid.style.gap = '2px'; // Slight gap for visual delineation

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'ghost-cell';
            cell.style.width = `${size}px`;
            cell.style.height = `${size}px`;

            const isActive = block.cells.some(([br, bc]) => br === r && bc === c);
            if (isActive) {
                cell.classList.add('active');
                cell.style.background = `var(--gradient-${block.gradient})`;
            }

            ghostGrid.appendChild(cell);
        }
    }

    dragState.ghostElement.appendChild(ghostGrid);
    document.body.appendChild(dragState.ghostElement);
    updateGhostPosition(x, y);
}



// ========================================
// Floating Score
// ========================================
function showFloatingScore(points, row, col, isBig = false) {
    const scoreEl = document.createElement('div');
    scoreEl.className = 'floating-score';

    // Position based on grid cell
    const cell = getCellElement(row, col) || getCellElement(3, 3); // Fallback to center
    if (cell) {
        const rect = cell.getBoundingClientRect();
        scoreEl.style.left = (rect.left + rect.width / 2) + 'px';
        scoreEl.style.top = (rect.top + rect.height / 2) + 'px';
    } else {
        scoreEl.style.left = '50%';
        scoreEl.style.top = '50%';
    }

    scoreEl.innerHTML = `
        <div class="score-main" style="${isBig ? 'font-size: 2.5rem; color: #fbbf24;' : ''}">+${points}</div>
    `;

    document.body.appendChild(scoreEl);
    setTimeout(() => scoreEl.remove(), 1000);
}


function handleDragEnd(e) {
    endDrag();
}

// Global Drag Listeners (Pointer Events)
function setupGlobalDragListeners() {
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);
}

function handlePointerMove(e) {
    if (!dragState.isDragging) return;

    // Store latest position for RAF callback
    dragState.lastPointerX = e.clientX;
    dragState.lastPointerY = e.clientY;

    // Immediate highlight update for better mobile responsiveness
    const adjustedY = e.clientY - VERTICAL_CURSOR_OFFSET;
    const cellCoords = getCellCoordsAt(e.clientX, adjustedY);

    if (cellCoords) {
        const { row, col } = cellCoords;

        // Calculate target origin (top-left) of the block based on the offset
        let targetRow = row;
        let targetCol = col;

        if (dragState.blockIndex !== null) {
            targetRow -= dragState.dragOffsetRow;
            targetCol -= dragState.dragOffsetCol;
            highlightPlacement(targetRow, targetCol);
        } else {
            highlightPlacement(row, col);
        }

        // Sound feedback on new cell
        const cellKey = `${row}-${col}`;
        if (dragState.lastHighlightedCell !== cellKey) {
            sounds.tick();
            dragState.lastHighlightedCell = cellKey;
        }
    } else {
        if (dragState.lastHighlightedCell !== null) {
            clearGridHighlights();
            dragState.lastHighlightedCell = null;
        }
    }

    // Performance: Use requestAnimationFrame only for ghost position updates
    if (!dragState.rafScheduled) {
        dragState.rafScheduled = true;
        requestAnimationFrame(() => {
            dragState.rafScheduled = false;
            updateGhostPosition(dragState.lastPointerX, dragState.lastPointerY);
        });
    }
}

function handlePointerUp(e) {
    if (!dragState.isDragging) return;

    // Fix: Adjust Y coordinate to match where the ghost block visually appears
    const adjustedY = e.clientY - VERTICAL_CURSOR_OFFSET;
    const cellCoords = getCellCoordsAt(e.clientX, adjustedY);

    if (cellCoords) {
        const { row, col } = cellCoords;

        // Alignment Fix: Subtract offset so the block is placed centered on cursor
        // visually and logically.
        let targetRow = row;
        let targetCol = col;

        if (dragState.blockIndex !== null) {
            targetRow -= dragState.dragOffsetRow;
            targetCol -= dragState.dragOffsetCol;
        }

        // Bomb/Fill rely on center point usually, so we keep row/col as is for them
        // unless they also need offset. Bomb logic usually takes "centerRow/Col".

        if (dragState.blockIndex !== null) {
            // Use snapped position if smart snap found a valid spot
            const placeRow = dragState.snappedRow !== null ? dragState.snappedRow : targetRow;
            const placeCol = dragState.snappedCol !== null ? dragState.snappedCol : targetCol;

            // placeBlock handles bounds checking internally
            placeBlock(placeRow, placeCol, dragState.blockIndex);
        } else if (dragState.powerupType) {
            handlePowerupDrop(row, col);
        }
    }

    endDrag();
}

function endDrag() {
    // Restore opacity of source element
    if (dragState.sourceElement) {
        dragState.sourceElement.classList.remove('dragging');
        dragState.sourceElement.style.opacity = '1';
        dragState.sourceElement = null;
    }

    dragState.isDragging = false;
    dragState.blockIndex = null;
    dragState.powerupType = null;
    dragState.currentGradient = null;

    if (dragState.ghostElement) {
        dragState.ghostElement.remove();
        dragState.ghostElement = null;
    }

    dragState.lastHighlightedCell = null;
    dragState.gridRect = null;
    dragState.cellSize = 0;
    dragState.snappedRow = null;
    dragState.snappedCol = null;

    clearGridHighlights();
}

function updateGhostPosition(x, y) {
    if (!dragState.ghostElement) return;

    const size = dragState.cellSize || 40;

    // Alignment Fix:
    // The previous logic used (offset + 0.5) * size, which aligns the ghost's internal "center cell" 
    // to the pointer.
    // Use the exact same offset logic as the placement highlight.
    // The placement logic assumes the pointer is at the top-left of the target cell.
    // But the visual ghost has a width/height.

    // We want the cell under the pointer (in the ghost grid) to be directly under the pointer.
    // dragState.dragOffsetCol is the column index of the cell we grabbed.

    // Position of the ghost's top-left corner relative to the pointer:
    const offsetX = (dragState.dragOffsetCol * size) + (size / 2);
    const offsetY = (dragState.dragOffsetRow * size) + (size / 2);

    const targetX = x - offsetX;
    // Block Blast style: Add vertical offset so block appears above cursor
    const targetY = y - offsetY - VERTICAL_CURSOR_OFFSET;

    dragState.ghostElement.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
}

function getCellCoordsAt(x, y) {
    if (!dragState.gridRect) return null;

    const rect = dragState.gridRect;
    const size = dragState.cellSize;

    // Relative to grid top-left
    const relX = x - rect.left;
    const relY = y - rect.top;

    if (relX < 0 || relX >= rect.width || relY < 0 || relY >= rect.height) {
        return null;
    }

    const col = Math.floor(relX / size);
    const row = Math.floor(relY / size);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        return { row, col };
    }

    return null;
}

function getCellUnderPointer(x, y) {
    const coords = getCellCoordsAt(x, y);
    if (coords) {
        return getCellElement(coords.row, coords.col);
    }
    return null;
}

// ========================================
// Check which lines would be completed by placing block
// ========================================
function getCompletableLines(row, col, block) {
    if (!canPlaceBlock(row, col, block)) return [];

    const linesToComplete = [];

    // Simulate placing the block
    const tempGrid = gameState.grid.map(r => [...r]);

    // Track which rows and columns the block touches
    const touchedRows = new Set();
    const touchedCols = new Set();

    block.cells.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            tempGrid[r][c] = 1; // Mark as filled
            touchedRows.add(r);
            touchedCols.add(c);
        }
    });

    // Only check rows that the block touches
    for (const r of touchedRows) {
        if (tempGrid[r].every(cell => cell !== null)) {
            linesToComplete.push({ type: 'row', index: r });
        }
    }

    // Only check columns that the block touches
    for (const c of touchedCols) {
        if (tempGrid.every(row => row[c] !== null)) {
            linesToComplete.push({ type: 'col', index: c });
        }
    }

    return linesToComplete;
}

// ========================================
// Highlight Placement
// ========================================
function highlightPlacement(row, col) {
    clearGridHighlights();

    if (dragState.blockIndex !== null) {
        const block = gameState.availableBlocks[dragState.blockIndex];
        if (!block || block.used) return;

        // Alignment Fix: 
        // handlePointerMove already subtracts offset before passing row/col here.
        // So 'row' and 'col' are ALREADY the top-left origin.
        // We do NOT subtract again.

        let isValid = canPlaceBlock(row, col, block);
        let finalRow = row;
        let finalCol = col;

        // Smart Snap: If invalid, try to find nearest valid position within 1 cell
        if (!isValid) {
            const offsets = [
                [0, 1], [0, -1], [1, 0], [-1, 0],  // Cardinal directions
                [1, 1], [1, -1], [-1, 1], [-1, -1] // Diagonals
            ];

            for (const [dr, dc] of offsets) {
                const testRow = row + dr;
                const testCol = col + dc;

                if (canPlaceBlock(testRow, testCol, block)) {
                    finalRow = testRow;
                    finalCol = testCol;
                    isValid = true;

                    // Store snapped position for placement
                    dragState.snappedRow = finalRow;
                    dragState.snappedCol = finalCol;
                    break;
                }
            }

            // If still invalid, clear snapped position
            if (!isValid) {
                dragState.snappedRow = null;
                dragState.snappedCol = null;
            }
        } else {
            // Direct placement is valid, use original position
            dragState.snappedRow = row;
            dragState.snappedCol = col;
        }

        block.cells.forEach(([dr, dc]) => {
            const targetRow = finalRow + dr;
            const targetCol = finalCol + dc;

            if (targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE) {
                const cell = getCellElement(targetRow, targetCol);
                if (cell) {
                    cell.classList.add(isValid ? 'highlight-valid' : 'highlight-invalid');
                }
            }
        });

        // Highlight lines that would be completed
        if (isValid) {
            const completableLines = getCompletableLines(finalRow, finalCol, block);
            completableLines.forEach(line => {
                if (line.type === 'row') {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        const cell = getCellElement(line.index, c);
                        if (cell) cell.classList.add('line-glow');
                    }
                } else if (line.type === 'col') {
                    for (let r = 0; r < GRID_SIZE; r++) {
                        const cell = getCellElement(r, line.index);
                        if (cell) cell.classList.add('line-glow');
                    }
                }
            });
        }
    } else if (dragState.powerupType === 'bomb') {
        // Highlight 5x5 diamond area for bomb
        // Distances from center: |r| + |c| <= 2
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                if (Math.abs(dr) + Math.abs(dc) > 2) continue; // Diamond shape check

                const r = row + dr;
                const c = col + dc;
                if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                    const cell = getCellElement(r, c);
                    if (cell) {
                        cell.classList.add('highlight-bomb');
                    }
                }
            }
        }
    } else if (dragState.powerupType === 'fill') {
        const cell = getCellElement(row, col);
        if (cell && gameState.grid[row][col] === null) {
            cell.classList.add('highlight-valid');
        } else if (cell) {
            cell.classList.add('highlight-invalid');
        }
    }
}

function clearGridHighlights() {
    // Performance: Use cached cells instead of querySelectorAll
    if (gameState.cellCache) {
        gameState.cellCache.forEach(row => {
            row.forEach(cell => {
                cell.classList.remove('highlight-valid', 'highlight-invalid', 'highlight-bomb', 'line-glow');
            });
        });
    } else {
        // Fallback
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('highlight-valid', 'highlight-invalid', 'highlight-bomb', 'line-glow');
        });
    }
}

// ========================================
// Check if Block Can Be Placed
// ========================================
function canPlaceBlock(row, col, block) {
    return block.cells.every(([dr, dc]) => {
        const targetRow = row + dr;
        const targetCol = col + dc;

        if (targetRow < 0 || targetRow >= GRID_SIZE || targetCol < 0 || targetCol >= GRID_SIZE) {
            return false;
        }

        return gameState.grid[targetRow][targetCol] === null;
    });
}

// ========================================
// Place Block on Grid
// ========================================
function placeBlock(row, col, blockIndex) {
    const block = gameState.availableBlocks[blockIndex];
    if (!block || block.used) return;

    if (!canPlaceBlock(row, col, block)) return;

    saveUndoState();

    block.cells.forEach(([dr, dc]) => {
        const targetRow = row + dr;
        const targetCol = col + dc;
        gameState.grid[targetRow][targetCol] = block.gradient;

        const cell = getCellElement(targetRow, targetCol);
        if (cell) {
            cell.classList.add('filled');
            cell.style.background = `var(--gradient-${block.gradient})`;
        }
    });

    // Show points for placement at the center of the block
    const lastCell = block.cells[block.cells.length - 1];
    showFloatingScore(block.cells.length * 15, row + lastCell[0], col + lastCell[1]);

    sounds.place(440 + block.cells.length * 20);
    gameState.score += block.cells.length * 15;
    block.used = true;

    const clearedLines = checkAndClearLines(row, col);

    if (clearedLines > 0) {
        // Successful clear: Increase combo and mark cycle as scored
        gameState.comboCount++;
        gameState.scoredInCurrentCycle = true;

        if (gameState.comboCount > 1) {
            showCombo(gameState.comboCount);

            // Add fantastic visual effects for combos
            triggerComboVisualEffects(gameState.comboCount);
        }

        const baseBonus = clearedLines * 100 * (clearedLines > 1 ? clearedLines : 1);
        const bonus = baseBonus * gameState.comboCount;

        gameState.score += bonus;
        gameState.linesCleared += clearedLines;

        showPraise(clearedLines, gameState.comboCount);

        // Show bonus points near the cleared area
        showFloatingScore(bonus, 3, 3, true);
    }

    if (gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('blockglassHighScore', gameState.highScore);
    }

    const allUsed = gameState.availableBlocks.every(b => b.used);
    if (allUsed) {
        // End of cycle: Reset combo if NO blocks in the cycle cleared lines
        if (!gameState.scoredInCurrentCycle) {
            gameState.comboCount = 0;
        }
        gameState.scoredInCurrentCycle = false; // Reset for next cycle

        generateNewBlocks();
    } else {
        renderAvailableBlocks();
        checkGameOver();
    }

    clearGridHighlights();
    clearGridHighlights();
    updateUI();
    updatePowerupUI();
    saveGameState();
}

// ========================================
// Show Combo Display
// ========================================
function showCombo(comboCount) {
    elements.comboValue.textContent = `x${comboCount} `;
    elements.comboDisplay.classList.remove('hidden');

    // Reset animation
    elements.comboDisplay.style.animation = 'none';
    elements.comboDisplay.offsetHeight; /* trigger reflow */
    elements.comboDisplay.style.animation = 'comboSimplePop 1s ease-out forwards';

    // Clear previous timeout to handle rapid combo increments
    if (elements.comboDisplay.timeout) clearTimeout(elements.comboDisplay.timeout);

    // Hide after animation finishes
    elements.comboDisplay.timeout = setTimeout(() => {
        elements.comboDisplay.classList.add('hidden');
    }, 1000);
}

// ========================================
// Trigger Combo Visual Effects
// ========================================
function triggerComboVisualEffects(comboCount) {
    const grid = elements.gameGrid;

    // Remove any existing combo effects
    grid.classList.remove('combo-effect-2', 'combo-effect-3', 'combo-effect-5', 'combo-effect-epic');

    // Apply effect based on combo level
    let effectClass = '';
    let vibrationPattern = [];

    if (comboCount >= 7) {
        effectClass = 'combo-effect-epic';
        vibrationPattern = [100, 50, 100, 50, 100]; // Epic pattern
    } else if (comboCount >= 5) {
        effectClass = 'combo-effect-5';
        vibrationPattern = [80, 40, 80]; // Large pattern
    } else if (comboCount >= 3) {
        effectClass = 'combo-effect-3';
        vibrationPattern = [60, 30, 60]; // Medium pattern
    } else {
        effectClass = 'combo-effect-2';
        vibrationPattern = [40]; // Small pattern
    }

    // Apply visual effect
    if (effectClass) {
        grid.classList.add(effectClass);

        // Vibration feedback if enabled
        if (gameState.settings.vibrationEnabled && navigator.vibrate) {
            navigator.vibrate(vibrationPattern);
        }

        // Remove effect after animation (longest animation is ~1s)
        setTimeout(() => {
            grid.classList.remove(effectClass);
        }, 1200);
    }
}

// ========================================
// Show Praise Notification
// ========================================
function showPraise(linesCleared, combo) {
    let praiseText = '';

    if (combo >= 5) praiseText = 'LEGENDARY!';
    else if (combo >= 3) praiseText = 'AMAZING!';
    else if (linesCleared >= 3) praiseText = 'EXCELLENT!';
    else if (linesCleared === 2) praiseText = 'GREAT!';
    else praiseText = 'GOOD!';

    elements.praiseNotification.textContent = praiseText;
    elements.praiseNotification.classList.remove('hidden');
    setTimeout(() => elements.praiseNotification.classList.add('hidden'), 1500);
}

// ========================================
// Check and Clear Lines
// ========================================
function checkAndClearLines(sourceRow, sourceCol, suppressSound = false) {
    const linesToClear = [];

    for (let row = 0; row < GRID_SIZE; row++) {
        if (gameState.grid[row].every(cell => cell !== null)) {
            linesToClear.push({ type: 'row', index: row });
        }
    }

    for (let col = 0; col < GRID_SIZE; col++) {
        const columnFilled = gameState.grid.every(row => row[col] !== null);
        if (columnFilled) {
            linesToClear.push({ type: 'col', index: col });
        }
    }

    if (linesToClear.length > 0) {
        clearLines(linesToClear, sourceRow, sourceCol);

        // Play sound unless suppressed (e.g., by bomb)
        if (!suppressSound) {
            sounds.clear(linesToClear.length, gameState.comboCount);
        }

        // Check for "Clean Slate" (Empty Grid) after clearing
        // We delay slightly to let the clear happen logically
        setTimeout(async () => {
            const isEmpty = gameState.grid.every(row => row.every(cell => cell === null));
            if (isEmpty) {
                // Trigger the Grid Sweep animation as a celebration
                sounds.cleanSlate();
                await triggerGridSweepAnimation();
            }
        }, 100);
    }

    return linesToClear.length;
}

function triggerCleanSlateEffect() {
    // Visual shake
    elements.gameGrid.classList.add('shake-clean');
    setTimeout(() => elements.gameGrid.classList.remove('shake-clean'), 500);

    // Bonus points
    gameState.score += 500;
    showFloatingScore(500, 3, 3, true);

    // Praise
    showPraise(0, 5);
    elements.praiseNotification.textContent = "CLEAN SLATE!";
    elements.praiseNotification.classList.remove('hidden');
    setTimeout(() => elements.praiseNotification.classList.add('hidden'), 1500);

    // Sound
    if (sounds.buffer.cleanSlate) {
        const source = audioCtx.createBufferSource();
        source.buffer = sounds.buffer.cleanSlate;
        source.connect(audioCtx.destination);
        source.start(0);
    } else {
        sounds.powerup();
    }
}

function addRandomStartBlocks() {
    // Add 2-3 random shapes to start
    const count = Math.floor(Math.random() * 2) + 2;
    let placed = 0;
    let attempts = 0;

    // Use a simplified version of canPlaceBlock for random placement
    const canPlace = (r, c, cells) => {
        return cells.every(([br, bc]) => {
            const tr = r + br;
            const tc = c + bc;
            return tr >= 0 && tr < GRID_SIZE && tc >= 0 && tc < GRID_SIZE && gameState.grid[tr][tc] === null;
        });
    };

    while (placed < count && attempts < 100) {
        // Pick random shape, excluding the single block (index 0)
        // BLOCK_SHAPES[0] is usually the single cell. We want interesting shapes.
        const shapeIndex = Math.floor(Math.random() * (BLOCK_SHAPES.length - 1)) + 1;
        const shape = BLOCK_SHAPES[shapeIndex];

        const r = Math.floor(Math.random() * (GRID_SIZE - 2));
        const c = Math.floor(Math.random() * (GRID_SIZE - 2));

        if (canPlace(r, c, shape.cells)) {
            // Place it
            shape.cells.forEach(([br, bc]) => {
                const tr = r + br;
                const tc = c + bc;
                gameState.grid[tr][tc] = shape.gradient;
            });
            placed++;
        }
        attempts++;
    }
}

function clearLines(lines, sourceRow = 4, sourceCol = 4) {
    lines.forEach(line => {
        if (line.type === 'row') {
            const row = line.index;
            for (let col = 0; col < GRID_SIZE; col++) {
                // Clear logic IMMEDIATELY to prevent double-counting
                gameState.grid[row][col] = null;

                // Calculate delay based on distance from sourceCol
                const distance = Math.abs(col - sourceCol);
                const delay = distance * 40;

                setTimeout(() => {
                    // Update visuals and effects
                    createParticles(row, col);
                    const cell = getCellElement(row, col);
                    if (cell) {
                        cell.classList.remove('filled');
                        cell.style.background = '';
                    }
                }, delay);
            }
        } else {
            const col = line.index;
            for (let row = 0; row < GRID_SIZE; row++) {
                // Clear logic IMMEDIATELY to prevent double-counting
                gameState.grid[row][col] = null;

                // Calculate delay based on distance from sourceRow
                const distance = Math.abs(row - sourceRow);
                const delay = distance * 40;

                setTimeout(() => {
                    // Update visuals and effects
                    createParticles(row, col);
                    const cell = getCellElement(row, col);
                    if (cell) {
                        cell.classList.remove('filled');
                        cell.style.background = '';
                    }
                }, delay);
            }
        }
    });
}

// ========================================
// Create Particle Effects
// ========================================
function createParticles(row, col) {
    const cell = getCellElement(row, col);
    if (!cell) return;

    const rect = cell.getBoundingClientRect();
    const containerRect = elements.particleContainer.getBoundingClientRect();

    // Performance: Reduced to 2 particles for smoother gameplay
    for (let i = 0; i < 2; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 50;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        // Randomize size for droplet effect
        const size = 6 + Math.random() * 10;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        particle.style.left = (rect.left - containerRect.left + rect.width / 2) + 'px';
        particle.style.top = (rect.top - containerRect.top + rect.height / 2) + 'px';
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        const gradient = gameState.grid[row][col] || 1;
        particle.style.background = `var(--gradient-${gradient})`;

        elements.particleContainer.appendChild(particle);
        setTimeout(() => particle.remove(), 600);
    }
}

// ========================================
// Get Cell Element
// ========================================
function getCellElement(row, col) {
    // Performance: Use cached cells instead of DOM query
    if (gameState.cellCache && gameState.cellCache[row] && gameState.cellCache[row][col]) {
        return gameState.cellCache[row][col];
    }
    // Fallback to DOM query if cache not available
    return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

// ========================================
// Check Game Over
// ========================================
function checkGameOver() {
    const canPlaceAny = gameState.availableBlocks.some(block => {
        if (block.used) return false;

        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (canPlaceBlock(row, col, block)) {
                    return true;
                }
            }
        }
        return false;
    });

    if (!canPlaceAny) {
        // If they have Bomb or Roll, show the "Stuck?" popup instead of Game Over
        const hasHelpers = gameState.powerups.bomb > 0 || gameState.powerups.roll > 0;

        if (hasHelpers) {
            showStuckPopup();
        } else {
            gameOver();
        }
    } else {
        hideStuckPopup();
    }
}

function showStuckPopup() {
    if (!elements.stuckPopup) {
        elements.stuckPopup = document.createElement('div');
        elements.stuckPopup.id = 'stuckPopup';
        elements.stuckPopup.className = 'stuck-notification hidden';
        elements.stuckPopup.textContent = 'STUCK? USE A HELPER!';
        document.body.appendChild(elements.stuckPopup);
    }

    elements.stuckPopup.classList.remove('hidden');
}

function hideStuckPopup() {
    if (elements.stuckPopup) {
        elements.stuckPopup.classList.add('hidden');
    }
}

function gameOver() {
    gameState.isGameOver = true;

    // First failure: Show Save Me countdown
    if (!gameState.hasUsedSaveMe) {
        showSaveMeCountdown();
        return;
    }

    // Subsequent failures: Show final game over screen
    showFinalGameOver();
}

// ========================================
// Grid Sweep Animation
// ========================================
async function triggerGridSweepAnimation(addStartBlocks = false) {
    // Temporarily fill the grid visually (not in state)
    const tempGradients = [];

    for (let row = 0; row < GRID_SIZE; row++) {
        tempGradients[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            const gradient = Math.floor(Math.random() * 7) + 1;
            tempGradients[row][col] = gradient;

            const cell = getCellElement(row, col);
            if (cell) {
                cell.classList.add('filled');
                cell.style.background = `var(--gradient-${gradient})`;
            }
        }
    }

    // Short pause to show full grid
    await new Promise(resolve => setTimeout(resolve, 200));

    // Clear from bottom to top
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
        // Play line clear sound (not just tick)
        sounds.clear(1);

        // Clear entire row with particles
        for (let col = 0; col < GRID_SIZE; col++) {
            createParticles(row, col);

            const cell = getCellElement(row, col);
            if (cell) {
                // Stagger the visual clear slightly within the row
                setTimeout(() => {
                    cell.classList.remove('filled');
                    cell.style.background = '';
                }, col * 15);
            }
        }

        // Wait before clearing next row (reduced from 120ms for less lag)
        await new Promise(resolve => setTimeout(resolve, 60));
    }



    // Optionally add random start blocks after sweep with animation
    if (addStartBlocks) {
        // Place blocks in grid state (invisible for now)
        addRandomStartBlocks();

        // Count total blocks for pitch progression
        const totalBlocks = gameState.grid.flat().filter(cell => cell !== null).length;
        let blockCounter = 0;

        // Start reverse sweep after a small delay (250ms) to overlap with main sweep
        setTimeout(async () => {
            // Animate them appearing from bottom to top
            for (let row = GRID_SIZE - 1; row >= 0; row--) {
                for (let col = 0; col < GRID_SIZE; col++) {
                    if (gameState.grid[row][col] !== null) {
                        const cell = getCellElement(row, col);
                        if (cell) {
                            // Progressive pitch: start at 300Hz, end at 600Hz
                            const pitchProgress = blockCounter / Math.max(totalBlocks - 1, 1);
                            const frequency = 300 + (pitchProgress * 300);
                            blockCounter++;

                            // Stagger appearance within the row
                            setTimeout(() => {
                                cell.classList.add('filled');
                                cell.style.background = `var(--gradient-${gameState.grid[row][col]})`;
                                sounds.place(frequency);
                            }, col * 20);
                        }
                    }
                }
                // Wait before revealing next row up
                await new Promise(resolve => setTimeout(resolve, 80));
            }
        }, 250);
    }

    // Wait for the entire animation sequence to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
}

async function restartGame() {
    gameState.grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    gameState.score = 0;
    gameState.linesCleared = 0;
    gameState.isGameOver = false;
    gameState.powerups = { bomb: 2, undo: 2, fill: 2, roll: 2 };
    gameState.activePowerup = null;
    gameState.undoHistory = [];
    gameState.comboCount = 0;
    gameState.hasUsedSaveMe = false;
    gameState.scoredInCurrentCycle = false;

    // Hide modals IMMEDIATELY before animation
    elements.gameOverModal.classList.add('hidden');
    elements.saveMePopup.classList.add('hidden');
    hideStuckPopup();
    clearInterval(saveMeCountdownInterval);

    // Trigger the Grid Sweep animation with start blocks
    await triggerGridSweepAnimation(true);

    generateNewBlocks();
    updateUI();
    updatePowerupUI();
    resetIdleTimer();
}

function updateUI() {
    elements.score.textContent = gameState.score;
    elements.highScore.textContent = gameState.highScore;
}

// ========================================
// Game State Persistence
// ========================================
const SAVE_KEY = 'blockglass_save';
const SAVE_VERSION = '1.3';

function saveGameState() {
    try {
        const saveData = {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            score: gameState.score,
            highScore: gameState.highScore,
            grid: gameState.grid,
            availableBlocks: gameState.availableBlocks,
            powerups: {
                bombs: gameState.powerups.bomb,
                undos: gameState.powerups.undo,
                fills: gameState.powerups.fill,
                rolls: gameState.powerups.roll
            },
            undoHistory: gameState.undoHistory,
            isGameOver: gameState.isGameOver
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (error) {
        console.error('Failed to save game state:', error);
    }
}

function loadGameState() {
    try {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (!savedData) return null;

        const data = JSON.parse(savedData);

        // Version check
        if (data.version !== SAVE_VERSION) {
            console.warn('Save version mismatch, clearing save');
            clearGameState();
            return null;
        }

        return data;
    } catch (error) {
        console.error('Failed to load game state:', error);
        return null;
    }
}

function restoreGameState(data) {
    if (!data) return false;

    try {
        gameState.score = data.score;
        gameState.highScore = data.highScore;
        gameState.grid = data.grid;
        gameState.availableBlocks = data.availableBlocks;
        gameState.undoHistory = data.undoHistory || [];

        // Restore powerups
        // Restore powerups
        gameState.powerups = {
            bomb: data.powerups.bombs,
            undo: data.powerups.undos,
            fill: data.powerups.fills,
            roll: data.powerups.rolls !== undefined ? data.powerups.rolls : 2
        };

        elements.bombCount.textContent = gameState.powerups.bomb;
        elements.undoCount.textContent = gameState.powerups.undo;
        elements.fillCount.textContent = gameState.powerups.fill;
        elements.rollCount.textContent = gameState.powerups.roll;

        renderGrid();
        renderAvailableBlocks();
        updateUI();
        updatePowerupUI();

        return true;
    } catch (error) {
        console.error('Failed to restore game state:', error);
        return false;
    }
}

function clearGameState() {
    localStorage.removeItem(SAVE_KEY);
}

// ========================================
// Lobby & Navigation
// ========================================
// DOM Elements
const gameContainer = document.getElementById('gameContainer');
const gameGrid = document.getElementById('gameGrid');
const lobbyScreen = document.getElementById('lobbyScreen');
const playButton = document.getElementById('playButton');
const backButton = document.getElementById('backButton');
const saveExitBtn = document.getElementById('saveExitBtn');
const optionsMenu = document.getElementById('optionsMenu');
const restartGameBtn = document.getElementById('restartGameBtn');
const cancelOptionsBtn = document.getElementById('cancelOptionsBtn');
const restartConfirmationModal = document.getElementById('restartConfirmationModal');
const confirmRestartBtn = document.getElementById('confirmRestartBtn');
const cancelRestartBtn = document.getElementById('cancelRestartBtn');

function showLobby() {
    lobbyScreen.style.display = 'flex';
    gameContainer.style.display = 'none';

    // Show footer in lobby
    if (elements.footer) {
        elements.footer.classList.remove('hidden');
    }

    // Show High Score in Lobby
    const lobbyHighScore = document.getElementById('lobbyHighScore');
    const lobbyHighScoreValue = document.getElementById('lobbyHighScoreValue');

    // Get high score from save or current state
    let currentHighScore = gameState.highScore;
    if (!currentHighScore && savedGame) {
        currentHighScore = savedGame.highScore || 0;
    } else if (!currentHighScore) {
        // Fallback to localStorage directly if not in gameState yet
        currentHighScore = parseInt(localStorage.getItem('blockglassHighScore')) || 0;
    }

    if (currentHighScore > 0) {
        lobbyHighScoreValue.textContent = currentHighScore;
        lobbyHighScore.classList.remove('hidden');
    } else {
        lobbyHighScore.classList.add('hidden');
    }
}

function showGame() {
    lobbyScreen.style.display = 'none';
    gameContainer.style.display = 'block';

    // Hide footer during gameplay
    if (elements.footer) {
        elements.footer.classList.add('hidden');
    }
}

function showOptionsMenu() {
    optionsMenu.classList.remove('hidden');
}

function hideOptionsMenu() {
    optionsMenu.classList.add('hidden');
}

async function startNewGame() {
    clearGameState();
    await restartGame();
    showGame();
}

async function continueGame() {
    const savedGame = loadGameState();
    if (savedGame) {
        restoreGameState(savedGame);
        showGame();
        // Play sweep animation when entering the game with start blocks
        await triggerGridSweepAnimation(true);
    } else {
        startNewGame();
    }
}

function saveAndExit() {
    saveGameState();
    hideOptionsMenu();
    showLobby();
}

function restartFromMenu() {
    restartConfirmationModal.classList.remove('hidden');
}

// Event Listeners
playButton.addEventListener('click', async () => {
    sounds.bonus();
    // Smart Play: Continue if save exists and not game over, else New Game
    const savedGame = loadGameState();
    if (savedGame && !savedGame.isGameOver) {
        restoreGameState(savedGame);
        showGame();
        // Play sweep animation when entering the game with start blocks
        await triggerGridSweepAnimation(true);
    } else {
        startNewGame();
    }
});
// continueButton removed
backButton.addEventListener('click', showOptionsMenu);
saveExitBtn.addEventListener('click', saveAndExit);
restartGameBtn.addEventListener('click', restartFromMenu);
cancelOptionsBtn.addEventListener('click', hideOptionsMenu);

// Restart Confirmation Listeners
confirmRestartBtn.addEventListener('click', () => {
    clearGameState();
    restartGame();
    restartConfirmationModal.classList.add('hidden');
    hideOptionsMenu();
});
cancelRestartBtn.addEventListener('click', () => {
    restartConfirmationModal.classList.add('hidden');
});
optionsMenu.querySelector('.options-overlay').addEventListener('click', hideOptionsMenu);

// ========================================
// Settings System
// ========================================
const settingsButton = document.getElementById('settingsButton');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const soundToggle = document.getElementById('soundToggle');

function loadSettings() {
    try {
        const saved = localStorage.getItem('blockglassSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            gameState.settings.soundEnabled = settings.soundEnabled !== undefined ? settings.soundEnabled : true;

            // Update UI
            if (soundToggle) {
                soundToggle.checked = gameState.settings.soundEnabled;
            }
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

function saveSettings() {
    try {
        localStorage.setItem('blockglassSettings', JSON.stringify(gameState.settings));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

function showSettings() {
    settingsModal.classList.remove('hidden');
}

function hideSettings() {
    settingsModal.classList.add('hidden');
    settingsModal.style.cssText = ''; // Clear all forced inline styles
}

// Event Listeners
if (settingsButton) {
    settingsButton.addEventListener('click', showSettings);
}

if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', hideSettings);
}

if (settingsModal) {
    settingsModal.querySelector('.options-overlay').addEventListener('click', hideSettings);
}

if (soundToggle) {
    soundToggle.addEventListener('change', (e) => {
        gameState.settings.soundEnabled = e.target.checked;
        saveSettings();

        // Play a test sound if enabled
        if (e.target.checked && audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                sounds.tick();
            });
        }
    });
}

// Vibration Toggle
const vibrationToggle = document.getElementById('vibrationToggle');
if (vibrationToggle) {
    vibrationToggle.addEventListener('change', (e) => {
        gameState.settings.vibrationEnabled = e.target.checked;
        saveSettings();

        // Test vibration if enabled
        if (e.target.checked && navigator.vibrate) {
            navigator.vibrate(40);
        }
    });
}

// Lobby Settings Button - MUST be after showSettings is defined
const lobbySettingsButton = document.getElementById('lobbySettingsButton');
if (lobbySettingsButton) {
    lobbySettingsButton.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Force show settings directly - bypass showSettings() function
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('hidden');
            // !important in .hidden overrides inline styles, so removing class is critical
            // Also force styles as backup
            modal.style.cssText = 'display: flex !important; z-index: 3000 !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; align-items: center !important; justify-content: center !important;';
        }

        // Resume audio context
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    });
} else {
    console.error('lobbySettingsButton not found in DOM!');
}

// ========================================
// Universal Button Click Sound
// ========================================
// Add click sound to all buttons
document.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (button) {
        // Resume audio context if suspended
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        sounds.uiClick();
    }
}, true); // Use capture phase to ensure it fires first

// Auto-save wrapper removed in favor of direct calls

// ========================================
// Start Game
// ========================================
loadSettings(); // Load settings first
initGame();
showLobby();

