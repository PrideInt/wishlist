const overlay = document.getElementById("overlay");

const title = document.getElementById("modalTitle");
const description = document.getElementById("modalDescription");
const image = document.getElementById("modalImage");

const link = document.getElementById("modalLink");
const closeBtn = document.getElementById("closeBtn");

const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");

const CELL_SIZE = 10;
const UPDATE_INTERVAL = 50;
const MOUSE_PUSH_INTERVAL = 35;

let cols;
let rows;
let grid;
let lastUpdate = 0;
let lastMousePush = 0;

document.querySelectorAll(".item").forEach((item) => {
    item.addEventListener("click", () => {
        title.textContent = item.dataset.title;
        description.textContent = item.dataset.description;

        image.src = item.dataset.image;
        image.alt = item.dataset.title;

        link.href = item.dataset.link;
        link.textContent = item.dataset.linktext;

        overlay.classList.add("show");

        requestAnimationFrame(() => {
            pushCellsFromModal();
        });
    });
});

closeBtn.addEventListener("click", closeModal);

overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
        closeModal();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeModal();
    }
});

window.addEventListener("resize", resize);

window.addEventListener("mousemove", (event) => {
    const now = performance.now();

    if (now - lastMousePush < MOUSE_PUSH_INTERVAL) {
        return;
    }

    pushCellsFromCenter(event.clientX, event.clientY, 10, 3);

    lastMousePush = now;
});

resize();
requestAnimationFrame(loop);

function closeModal() {
    overlay.classList.remove("show");

    pushCellsFromCenter(
        window.innerWidth / 2,
        window.innerHeight / 2,
        18,
        5
    );
}

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    cols = Math.floor(canvas.width / CELL_SIZE);
    rows = Math.floor(canvas.height / CELL_SIZE);

    grid = createSeededGrid();
}

function createEmptyGrid() {
    const arr = new Array(cols);

    for (let x = 0; x < cols; x++) {
        arr[x] = new Array(rows).fill(0);
    }

    return arr;
}

function createSeededGrid() {
    const arr = createEmptyGrid();

    const regionCount = 4 + Math.floor(Math.random() * 4);
    const patternCount = 8 + Math.floor(Math.random() * 8);

    for (let i = 0; i < regionCount; i++) {
        const centerX = Math.floor(Math.random() * cols);
        const centerY = Math.floor(Math.random() * rows);

        const radiusX = 4 + Math.floor(Math.random() * 9);
        const radiusY = 4 + Math.floor(Math.random() * 9);

        const density = 0.1 + Math.random() * 0.12;

        for (let x = centerX - radiusX; x <= centerX + radiusX; x++) {
            for (let y = centerY - radiusY; y <= centerY + radiusY; y++) {
                if (
                    x >= 0 &&
                    x < cols &&
                    y >= 0 &&
                    y < rows
                ) {
                    const dx = (x - centerX) / radiusX;
                    const dy = (y - centerY) / radiusY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance <= 1 && Math.random() < density) {
                        arr[x][y] = 1;
                    }
                }
            }
        }
    }

    for (let i = 0; i < patternCount; i++) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);

        placeRandomPattern(arr, x, y);
    }

    return arr;
}

function placeRandomPattern(arr, offsetX, offsetY) {
    const patterns = [
        [[0, 1, 0], [0, 0, 1], [1, 1, 1]],
        [[1, 1], [1, 1]],
        [[1, 1, 1]],
        [[1, 1, 1], [0, 1, 0], [0, 1, 0]],
        [[1, 1, 0], [0, 1, 1]],
        [[0, 1, 1], [1, 1, 0]]
    ];

    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    for (let y = 0; y < pattern.length; y++) {
        for (let x = 0; x < pattern[y].length; x++) {
            const px = offsetX + x;
            const py = offsetY + y;

            if (
                px >= 0 &&
                px < cols &&
                py >= 0 &&
                py < rows
            ) {
                arr[px][py] = pattern[y][x];
            }
        }
    }
}

function pushCellsFromModal() {
    const modal =
        overlay.querySelector(".modal") ||
        overlay.querySelector(".card-modal") ||
        overlay.firstElementChild;

    if (!modal) {
        pushCellsFromCenter(
            window.innerWidth / 2,
            window.innerHeight / 2,
            22,
            7
        );

        return;
    }

    const rect = modal.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const radius = Math.max(rect.width, rect.height) / CELL_SIZE / 1.5;

    pushCellsFromCenter(centerX, centerY, radius, 8);
}

function pushCellsFromCenter(pixelX, pixelY, radius = 18, strength = 6) {
    if (!grid) {
        return;
    }

    const next = createEmptyGrid();

    const centerX = pixelX / CELL_SIZE;
    const centerY = pixelY / CELL_SIZE;

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (grid[x][y] !== 1) {
                continue;
            }

            const dx = x - centerX;
            const dy = y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > radius || distance === 0) {
                next[x][y] = 1;
                continue;
            }

            const force = (1 - distance / radius) * strength;

            const pushX = Math.round((dx / distance) * force);
            const pushY = Math.round((dy / distance) * force);

            const newX = clamp(x + pushX, 0, cols - 1);
            const newY = clamp(y + pushY, 0, rows - 1);

            next[newX][newY] = 1;
        }
    }

    grid = next;
    draw();
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function countNeighbors(x, y) {
    let sum = 0;

    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) {
                continue;
            }

            const col = (x + i + cols) % cols;
            const row = (y + j + rows) % rows;

            sum += grid[col][row];
        }
    }

    return sum;
}

function update() {
    const next = createEmptyGrid();

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            const neighbors = countNeighbors(x, y);
            const state = grid[x][y];

            if (state === 1 && (neighbors < 2 || neighbors > 3)) {
                next[x][y] = 0;
            } else if (state === 0 && neighbors === 3) {
                next[x][y] = 1;
            } else {
                next[x][y] = state;
            }
        }
    }

    grid = next;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            if (grid[x][y] === 1) {
                ctx.fillRect(
                    x * CELL_SIZE,
                    y * CELL_SIZE,
                    CELL_SIZE - 1,
                    CELL_SIZE - 1
                );
            }
        }
    }
}

function loop(timestamp) {
    if (!lastUpdate) {
        lastUpdate = timestamp;
    }

    const elapsed = timestamp - lastUpdate;

    if (elapsed > UPDATE_INTERVAL) {
        update();
        draw();

        lastUpdate = timestamp;
    }

    requestAnimationFrame(loop);
}