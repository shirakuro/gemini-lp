const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const startButton = document.getElementById('start-button');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const NEXT_BLOCK_SIZE = 20;

const COLORS = [null, '#FF0D72', '#0DC2FF', '#0DFF72', '#F538FF', '#FF8E0D', '#FFE138', '#3877FF'];
const SHAPES = [
    [],
    [[1, 1, 1], [0, 1, 0]], // T
    [[2, 2, 2, 2]], // I
    [[3, 3], [3, 3]], // O
    [[4, 0, 0], [4, 4, 4]], // L
    [[0, 0, 5], [5, 5, 5]], // J
    [[0, 6, 6], [6, 6, 0]], // S
    [[7, 7, 0], [0, 7, 7]]  // Z
];
const POINTS = { 1: 100, 2: 300, 3: 500, 4: 800 };

let board, piece, nextPiece, score, lines, level, dropInterval, gameOver, paused;
let animationFrameId;

function init() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    gameOver = false;
    paused = false;
    
    nextPiece = createPiece();
    piece = createPiece();
    
    updateUI();
}

function createPiece() {
    const typeId = Math.floor(Math.random() * (SHAPES.length - 1)) + 1;
    const shape = SHAPES[typeId];
    return {
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
        shape: shape,
        color: COLORS[typeId],
        typeId: typeId
    };
}

function collide(p, b) {
    for (let y = 0; y < p.shape.length; y++) {
        for (let x = 0; x < p.shape[y].length; x++) {
            if (p.shape[y][x] && (b[p.y + y] && b[p.y + y][p.x + x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function freeze() {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                board[piece.y + y][piece.x + x] = piece.typeId;
            }
        });
    });
    clearLines();
    piece = nextPiece;
    nextPiece = createPiece();
    if (collide(piece, board)) {
        gameOver = true;
    }
}

function clearLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(value => value > 0)) {
            linesCleared++;
            board.splice(y, 1);
            board.unshift(Array(COLS).fill(0));
            y++; // Re-check the same row index as it's now a new row
        }
    }
    if (linesCleared > 0) {
        score += POINTS[linesCleared] * level;
        lines += linesCleared;
        if (lines >= level * 10) {
            level++;
            dropInterval = Math.max(200, 1000 - (level - 1) * 100);
        }
        updateUI();
    }
}

function move(dir) {
    piece.x += dir;
    if (checkCollision()) {
        piece.x -= dir;
    }
}

function rotate() {
    const originalShape = piece.shape;
    const rotated = originalShape[0].map((_, colIndex) => originalShape.map(row => row[colIndex]).reverse());
    piece.shape = rotated;

    // Wall kick
    let offset = 1;
    while (checkCollision()) {
        piece.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > piece.shape[0].length) {
            piece.shape = originalShape; // Can't rotate, revert
            return;
        }
    }
}

function drop() {
    piece.y++;
    if (checkCollision()) {
        piece.y--;
        freeze();
    }
    dropCounter = 0;
}

function hardDrop() {
    while (!checkCollision()) {
        piece.y++;
    }
    piece.y--;
    freeze();
}

function checkCollision() {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                let newX = piece.x + x;
                let newY = piece.y + y;
                if (newX < 0 || newX >= COLS || newY >= ROWS || (board[newY] && board[newY][newX])) {
                    return true;
                }
            }
        }
    }
    return false;
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        });
    });
    if (piece) {
        context.fillStyle = piece.color;
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    context.fillRect((piece.x + x) * BLOCK_SIZE, (piece.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });
    }
}

function drawNext() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (nextPiece) {
        nextContext.fillStyle = nextPiece.color;
        const shape = nextPiece.shape;
        const xOffset = (nextCanvas.width - shape[0].length * NEXT_BLOCK_SIZE) / 2;
        const yOffset = (nextCanvas.height - shape.length * NEXT_BLOCK_SIZE) / 2;
        shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    nextContext.fillRect(xOffset + x * NEXT_BLOCK_SIZE, yOffset + y * NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE, NEXT_BLOCK_SIZE);
                }
            });
        });
    }
}

function updateUI() {
    scoreElement.innerText = score;
    linesElement.innerText = lines;
    levelElement.innerText = level;
    drawNext();
}

let dropCounter = 0;
let lastTime = 0;

function gameLoop(time = 0) {
    if (gameOver) {
        context.fillStyle = 'rgba(0, 0, 0, 0.75)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'white';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        startButton.innerText = 'リスタート';
        startButton.disabled = false;
        return;
    }
    if (paused) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (dropCounter > dropInterval) {
        drop();
    }

    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', e => {
    if (gameOver) return;
    if (e.key === 'p' || e.key === 'P') {
        paused = !paused;
        if (paused) {
            context.fillStyle = 'rgba(0, 0, 0, 0.75)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = 'white';
            context.font = '24px Arial';
            context.textAlign = 'center';
            context.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        } else {
            draw();
        }
        return;
    }
    if (paused) return;

    switch (e.key) {
        case 'ArrowLeft': move(-1); break;
        case 'ArrowRight': move(1); break;
        case 'ArrowDown': drop(); break;
        case 'ArrowUp': rotate(); break;
        case ' ': hardDrop(); break; // Space bar
    }
});

function startGame() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    init();
    startButton.innerText = 'プレイ中';
    startButton.disabled = true;
    gameLoop();
}

startButton.addEventListener('click', startGame);

// Initial setup message
context.font = '16px Arial';
context.textAlign = 'center';
context.fillStyle = 'white';
context.fillText('ボタンを押して開始', canvas.width / 2, canvas.height / 2);
