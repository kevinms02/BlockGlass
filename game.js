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
    currentGradient: null // Store the color for the trail
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
    },
    place: (frequency = 440) => {
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
    },
    clear: () => {
        // Bubbly clear sound - Pitch scaling removed per user request
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
        // Deep explosion with rumble
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
    },
    fail: () => {
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
    { cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], gradient: 1 }
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

    // Create ghost element for power-up
    createPowerupGhost(type, e.clientX, e.clientY);
}

function createPowerupGhost(type, x, y) {
    dragState.ghostElement = document.createElement('div');
    dragState.ghostElement.className = 'drag-ghost powerup-ghost';

    if (type === 'bomb') {
        // 5x5 diamond pattern
        const pattern = [
            [0, 0, 1, 0, 0],
            [0, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 0, 1, 0, 0]
        ];

        let gridHtml = '<div class="ghost-grid bomb-grid">';
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                // Add active class if part of pattern
                const activeClass = pattern[r][c] ? 'bomb-cell active' : 'bomb-cell-empty';
                gridHtml += `<div class="ghost-cell ${activeClass}"></div>`;
            }
        }
        gridHtml += '</div>';
        dragState.ghostElement.innerHTML = gridHtml;

    } else if (type === 'fill') {
        // Single cell for fill
        dragState.ghostElement.innerHTML = `
            <div class="ghost-grid fill-grid">
                <div class="ghost-cell fill-cell active"></div>
            </div>
        `;
    }

    document.body.appendChild(dragState.ghostElement);
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

                    // Small liquid sound for each block
                    sounds.clear();
                    destroyedCount++;
                }
            }, d * 80);
        }
    });

    gameState.powerups.bomb--;
    updateUI();
    updatePowerupUI();

    // Check game over only after animation finishes roughly
    setTimeout(() => {
        checkAndClearLines(centerRow, centerCol);
        checkGameOver();
    }, 400);
}

function executeFill(row, col) {
    if (gameState.powerups.fill <= 0) return;
    if (gameState.grid[row][col] !== null) return;

    saveUndoState();

    if (navigator.vibrate) navigator.vibrate(50);

    const gradient = Math.floor(Math.random() * 7) + 1;
    gameState.grid[row][col] = gradient;

    const cell = getCellElement(row, col);
    cell.classList.add('filled');
    cell.style.background = `var(--gradient-${gradient})`;

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

    for (let attempt = 0; attempt < 50; attempt++) {
        // Pick 3 random
        const candidateSet = [];
        for (let i = 0; i < 3; i++) {
            const randomShape = BLOCK_SHAPES[Math.floor(Math.random() * BLOCK_SHAPES.length)];
            candidateSet.push({ ...randomShape }); // Clone
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

    // Assign IDs to the chosen set
    gameState.availableBlocks = bestSet.map((block, i) => ({
        ...block,
        id: Date.now() + i,
        used: false
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
        dragState.sourceElement.style.opacity = '0';
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

    createBlockGhost(block, e.clientX, e.clientY);
}

function createBlockGhost(block, x, y) {
    const { rows, cols } = getBlockDimensions(block.cells);

    dragState.ghostElement = document.createElement('div');
    dragState.ghostElement.className = 'drag-ghost';

    const ghostGrid = document.createElement('div');
    ghostGrid.className = 'ghost-grid';
    ghostGrid.style.gridTemplateColumns = `repeat(${cols}, 38px)`;
    ghostGrid.style.gridTemplateRows = `repeat(${rows}, 38px)`;
    ghostGrid.style.gap = '3px';

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'ghost-cell';

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

function getBlockDimensions(cells) {
    const rows = Math.max(...cells.map(([r]) => r)) + 1;
    const cols = Math.max(...cells.map(([, c]) => c)) + 1;
    return { rows, cols };
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

    // Find cell under pointer
    const cell = getCellUnderPointer(e.clientX, e.clientY);
    if (cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        // Calculate target origin (top-left) of the block based on the offset
        let targetRow = row;
        let targetCol = col;

        if (dragState.blockIndex !== null) {
            targetRow -= dragState.dragOffsetRow;
            targetCol -= dragState.dragOffsetCol;
            highlightPlacement(targetRow, targetCol);
        } else if (dragState.powerupType === 'bomb') {
            // For bomb, highlight center
            highlightPlacement(row, col);
        } else if (dragState.powerupType === 'fill') {
            highlightPlacement(row, col);
        }
    } else {
        clearGridHighlights();
    }
}

function handlePointerUp(e) {
    if (!dragState.isDragging) return;

    const cell = getCellUnderPointer(e.clientX, e.clientY);
    if (cell) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        let targetRow = row;
        let targetCol = col;

        if (dragState.blockIndex !== null) {
            targetRow -= dragState.dragOffsetRow;
            targetCol -= dragState.dragOffsetCol;
            placeBlock(targetRow, targetCol, dragState.blockIndex);
        } else if (dragState.powerupType === 'bomb') {
            executeBomb(row, col);
        } else if (dragState.powerupType === 'fill') {
            executeFill(row, col);
        }
    }

    endDrag();
}

function endDrag() {
    // Restore opacity of source element
    if (dragState.sourceElement) {
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

    clearGridHighlights();
}

function updateGhostPosition(x, y) {
    if (!dragState.ghostElement) return;

    const ghost = dragState.ghostElement;
    const rect = ghost.getBoundingClientRect();

    // Center the ghost on pointer
    const targetX = x - rect.width / 2;
    const targetY = y - rect.height / 2;

    ghost.style.left = targetX + 'px';
    ghost.style.top = targetY + 'px';

    // Spawn trail particles if moving
    if (!dragState.lastTrailSpawn || Date.now() - dragState.lastTrailSpawn > 10) {
        spawnTrailParticle(x, y, dragState.currentGradient);
        dragState.lastTrailSpawn = Date.now();
    }
}

function spawnTrailParticle(x, y, gradient) {
    const trail = document.createElement('div');
    trail.className = 'drag-trail';

    if (gradient) {
        trail.style.background = `var(--gradient-${gradient})`;
        trail.style.boxShadow = `0 0 10px white, 0 0 20px var(--gradient-${gradient})`;
    }

    trail.style.left = x + 'px';
    trail.style.top = y + 'px';

    document.body.appendChild(trail);
    setTimeout(() => trail.remove(), 500);
}

let cachedGridCells = null;

function getCellUnderPointer(x, y) {
    // Cache grid cells to avoid querySelectorAll in high-frequency loop
    if (!cachedGridCells) {
        cachedGridCells = Array.from(document.querySelectorAll('.grid-cell'));
    }

    // Slight tolerance for gaps
    const HIT_TOLERANCE = 5;

    for (const cell of cachedGridCells) {
        const rect = cell.getBoundingClientRect();

        // Point-in-rect check
        if (x >= rect.left - HIT_TOLERANCE &&
            x <= rect.right + HIT_TOLERANCE &&
            y >= rect.top - HIT_TOLERANCE &&
            y <= rect.bottom + HIT_TOLERANCE) {
            return cell;
        }
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
function checkAndClearLines(sourceRow, sourceCol) {
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
        sounds.clear();
    }

    return linesToClear.length;
}

function clearLines(lines, sourceRow = 4, sourceCol = 4) {
    lines.forEach(line => {
        if (line.type === 'row') {
            const row = line.index;
            for (let col = 0; col < GRID_SIZE; col++) {
                // Calculate delay based on distance from sourceCol
                const distance = Math.abs(col - sourceCol);
                const delay = distance * 40;

                setTimeout(() => {
                    if (gameState.grid[row][col] !== null) {
                        createParticles(row, col);
                        gameState.grid[row][col] = null;
                        const cell = getCellElement(row, col);
                        if (cell) {
                            cell.classList.remove('filled');
                            cell.style.background = '';
                        }
                    }
                }, delay);
            }
        } else {
            const col = line.index;
            for (let row = 0; row < GRID_SIZE; row++) {
                // Calculate delay based on distance from sourceRow
                const distance = Math.abs(row - sourceRow);
                const delay = distance * 40;

                setTimeout(() => {
                    if (gameState.grid[row][col] !== null) {
                        createParticles(row, col);
                        gameState.grid[row][col] = null;
                        const cell = getCellElement(row, col);
                        if (cell) {
                            cell.classList.remove('filled');
                            cell.style.background = '';
                        }
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
        gameOver();
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
