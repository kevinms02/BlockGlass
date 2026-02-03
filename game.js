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
    scoredInCurrentCycle: false // Track if any block in the current 3-block cycle cleared a line
};

// Drag state
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
    cellSize: 0
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
    clear: (count = 1) => {
        // Play game start sound for clear
        if (sounds.buffer.gameStart) {
            const playSound = (offset) => {
                const source = audioCtx.createBufferSource();
                source.buffer = sounds.buffer.gameStart;
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
            // Fallback synth
            const t = audioCtx.currentTime;
            const pitchMultiplier = 1.0;

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
    saveMeBtn: document.getElementById('saveMeBtn')
};

// ========================================
// Initialize Game
// ========================================
function initGame() {
    createGrid();
    addRandomStartBlocks();
    renderGrid(); // Force render to show start blocks
    generateNewBlocks();
    updateUI();
    setupPowerups();
    setupGlobalDragListeners();
    elements.restartBtn.addEventListener('click', restartGame);
    if (elements.saveMeBtn) elements.saveMeBtn.addEventListener('click', handleSaveMe);
}

function handleSaveMe() {
    if (gameState.hasUsedSaveMe) return;

    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

    // Clear center 4x4 area to allow play
    const startIdx = 2; // (8-4)/2
    const endIdx = 6;

    for (let r = startIdx; r < endIdx; r++) {
        for (let c = startIdx; c < endIdx; c++) {
            if (gameState.grid[r][c] !== null) {
                createParticles(r, c);
                gameState.grid[r][c] = null;
                const cell = getCellElement(r, c);
                if (cell) {
                    cell.classList.remove('filled');
                    cell.style.background = '';
                }
            }
        }
    }

    gameState.hasUsedSaveMe = true;
    gameState.isGameOver = false;
    elements.gameOverModal.classList.add('hidden');
    sounds.powerup();

    // Give user a fresh set of blocks if current ones are impossible
    // Actually, just let them try with current blocks first, if they can't they can't.
    // But usually clearing center helps.

    checkGameOver(); // Verify state
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

        const size = dragState.cellSize || 40;
        let gridHtml = `<div class="ghost-grid bomb-grid" style="grid-template-columns: repeat(5, ${size}px); grid-template-rows: repeat(5, ${size}px);">`;
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const activeClass = pattern[r][c] ? 'bomb-cell active' : 'bomb-cell-empty';
                gridHtml += `<div class="ghost-cell ${activeClass}" style="width: ${size}px; height: ${size}px;"></div>`;
            }
        }
        gridHtml += '</div>';
        dragState.ghostElement.innerHTML = gridHtml;

    } else if (type === 'fill') {
        const size = dragState.cellSize || 40;
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
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            elements.gameGrid.appendChild(cell);
        }
    }
}

function renderGrid() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const cell = getCellElement(row, col);
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
}

function executeRoll() {
    if (gameState.powerups.roll <= 0) return;

    saveUndoState();
    generateNewBlocks();
    gameState.powerups.roll--;
    sounds.powerup();

    updatePowerupUI();
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
function generateNewBlocks() {
    gameState.availableBlocks = [];

    // Try to find a set of 3 blocks where ALL 3 can fit into the current grid
    // We attempt this up to 20 times. If we fail, we just fallback to the last random set.
    let bestSet = [];
    let validSetFound = false;

    // Helper to simulate placement on a cloned grid
    const canFitOnGrid = (grid, block) => {
        const { rows, cols } = getBlockDimensions(block.cells);
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                // Inline check logic for speed
                const fits = block.cells.every(([dr, dc]) => {
                    const tr = r + dr;
                    const tc = c + dc;
                    return tr >= 0 && tr < GRID_SIZE && tc >= 0 && tc < GRID_SIZE && grid[tr][tc] === null;
                });
                if (fits) return { r, c };
            }
        }
        return null; // No spot found
    };

    // Recursive solver to check if a sequence of blocks fits
    const solveSequence = (grid, blocks, index) => {
        if (index >= blocks.length) return true;

        const block = blocks[index];
        // Try to place this block anywhere
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                // Check fitting
                let fits = true;
                for (let i = 0; i < block.cells.length; i++) {
                    const [dr, dc] = block.cells[i];
                    const tr = r + dr;
                    const tc = c + dc;
                    // solveSequence uses the LOCAL 'grid' argument (simulation), NOT gameState.grid
                    if (tr < 0 || tr >= GRID_SIZE || tc < 0 || tc >= GRID_SIZE || grid[tr][tc] !== null) {
                        fits = false;
                        break;
                    }
                }

                if (fits) {
                    // Place temp
                    block.cells.forEach(([dr, dc]) => grid[r + dr][c + dc] = 99);
                    // Clear lines simulation omitted for simplicity in generation check 
                    // (strict fitting is harder, so if it fits without clearing it's definitely safe)

                    if (solveSequence(grid, blocks, index + 1)) return true;

                    // Backtrack
                    block.cells.forEach(([dr, dc]) => grid[r + dr][c + dc] = null);
                }
            }
        }
        return false;
    };

    for (let attempt = 0; attempt < 100; attempt++) {
        // Pick 3 random blocks with better variety logic
        const candidateSet = [];

        // Simple bag logic: Try to ensure at least one complex shape if possible, or just pure random
        // but avoid picking the exact same index 3 times in a row purely by chance.
        // For Block Blast style: pure random is surprisingly effective, but let's ensure mixed colors.

        for (let i = 0; i < 3; i++) {
            const randomShape = BLOCK_SHAPES[Math.floor(Math.random() * BLOCK_SHAPES.length)];
            // Clone and assign a random gradient color (1-7) to ensure visual variety
            candidateSet.push({
                ...randomShape,
                gradient: Math.floor(Math.random() * 7) + 1
            });
        }

        // Check if there is ANY permutation of these 3 that fits
        // Actually, checking *one* permutation is usually enough for "at least one way"
        // But for "all 3 blocks can be placed", we need to ensure they can exist together.

        // Deep clone grid for simulation
        const simGrid = gameState.grid.map(row => [...row]);
        if (solveSequence(simGrid, candidateSet, 0)) {
            bestSet = candidateSet;
            validSetFound = true;
            break;
        }

        if (attempt === 0) bestSet = candidateSet; // Keep first guess as fallback
    }

    // MERCY FALLBACK: If no valid set found after 50 attempts, give 1x1 mercy blocks
    if (!validSetFound) {
        console.log("Mercy fallback triggered: Generating 1x1 blocks.");
        bestSet = [
            { ...BLOCK_SHAPES[0], gradient: Math.floor(Math.random() * 7) + 1 },
            { ...BLOCK_SHAPES[0], gradient: Math.floor(Math.random() * 7) + 1 },
            { ...BLOCK_SHAPES[0], gradient: Math.floor(Math.random() * 7) + 1 }
        ];
    }

    // Assign IDs to the chosen set
    gameState.availableBlocks = bestSet.map((block, i) => ({
        ...block,
        id: Date.now() + i,
        used: false,
        isNew: true // Mark as new for animation
    }));

    // Force re-render of all slots
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

    updateGhostPosition(e.clientX, e.clientY);

    // Find cell under pointer using optimized math
    const cellCoords = getCellCoordsAt(e.clientX, e.clientY);

    if (cellCoords) {
        const { row, col } = cellCoords;

        // Sound feedback on new cell
        const cellKey = `${row}-${col}`;
        if (dragState.lastHighlightedCell !== cellKey) {
            sounds.tick();
            dragState.lastHighlightedCell = cellKey;
        }

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
    } else {
        if (dragState.lastHighlightedCell !== null) {
            clearGridHighlights();
            dragState.lastHighlightedCell = null;
        }
    }
}

function handlePointerUp(e) {
    if (!dragState.isDragging) return;

    const cellCoords = getCellCoordsAt(e.clientX, e.clientY);
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
            // placeBlock handles bounds checking internally
            placeBlock(targetRow, targetCol, dragState.blockIndex);
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
    const targetY = y - offsetY;

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

        const isValid = canPlaceBlock(row, col, block);

        block.cells.forEach(([dr, dc]) => {
            const targetRow = row + dr;
            const targetCol = col + dc;

            if (targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE) {
                const cell = getCellElement(targetRow, targetCol);
                if (cell) {
                    cell.classList.add(isValid ? 'highlight-valid' : 'highlight-invalid');
                }
            }
        });
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
    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.classList.remove('highlight-valid', 'highlight-invalid', 'highlight-bomb');
    });
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
    showFloatingScore(block.cells.length * 3, row + lastCell[0], col + lastCell[1]);

    sounds.place(440 + block.cells.length * 20);
    gameState.score += block.cells.length * 3;
    block.used = true;

    const clearedLines = checkAndClearLines(row, col);

    if (clearedLines > 0) {
        // Successful clear: Increase combo and mark cycle as scored
        gameState.comboCount++;
        gameState.scoredInCurrentCycle = true;

        if (gameState.comboCount > 1) {
            showCombo(gameState.comboCount);
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
    updateUI();
    updatePowerupUI();
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
    elements.comboDisplay.style.animation = 'praiseAnimation 1.5s ease-out forwards';

    // Clear previous timeout to handle rapid combo increments
    if (elements.comboDisplay.timeout) clearTimeout(elements.comboDisplay.timeout);

    // Hide after animation finishes
    elements.comboDisplay.timeout = setTimeout(() => {
        elements.comboDisplay.classList.add('hidden');
    }, 1500);
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
            sounds.clear(linesToClear.length);
        }

        // Check for "Clean Slate" (Empty Grid) after clearing
        // We delay slightly to let the clear happen logically
        setTimeout(() => {
            const isEmpty = gameState.grid.every(row => row.every(cell => cell === null));
            if (isEmpty) {
                triggerCleanSlateEffect();
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

    for (let i = 0; i < 8; i++) { // Increased particle count
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

    // Show Save Me button if not used yet
    if (!gameState.hasUsedSaveMe && elements.saveMeBtn) {
        elements.saveMeBtn.style.display = 'block';
    } else if (elements.saveMeBtn) {
        elements.saveMeBtn.style.display = 'none';
    }
}

function restartGame() {
    gameState.grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    gameState.score = 0;
    gameState.linesCleared = 0;
    gameState.isGameOver = false;
    gameState.powerups = { bomb: 2, undo: 2, fill: 2, roll: 2 };
    gameState.activePowerup = null;
    gameState.undoHistory = [];
    gameState.comboCount = 0;
    gameState.hasUsedSaveMe = false;
    gameState.scoredInCurrentCycle = false; // Reset cycle score flag

    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.classList.remove('filled');
        cell.style.background = '';
    });

    elements.gameOverModal.classList.add('hidden');

    generateNewBlocks();
    updateUI();
    updatePowerupUI();
}

function updateUI() {
    elements.score.textContent = gameState.score;
    elements.highScore.textContent = gameState.highScore;
}

// ========================================
// Start Game
// ========================================
initGame();
