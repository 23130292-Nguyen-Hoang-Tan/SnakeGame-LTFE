// Đọc cấu hình level
const savedConfig = localStorage.getItem("snakeLevelConfig");
const levelConfig = savedConfig ? JSON.parse(savedConfig) : {
    level: "level1",
    speed: 120,
    lives: 3,
    growSnake: true,
    food10: true,
    obstacles: false
};

// Canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GRID_SIZE = 24;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

// Các biến chính
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = null;
let score = 0;
let lives = levelConfig.lives || 3;
let gameLoop = null;
let gameRunning = true;
let isPaused = false;

// Level 2
let obstacles = [];
let lifeBuff = null;
let lifeBuffSpawned = false;

// Level 3
const MAP_WALL_X = 14;
const PORTAL_HEIGHT = 2;
const PORTAL_TIME = 15;
let portals = [];
let portalTimer = null;
let portalCountdown = PORTAL_TIME;

const portalTimerElement = document.getElementById("portalTimer");
const portalTimeElement = document.getElementById("portalTime");

if (levelConfig.level === "level3") {
    portalTimerElement.style.display = "block";
}

// Level 4
const BULLET_INTERVAL = 1500;
const BULLET_SPEED = 1;
const BULLET_RADIUS = 7;
const BULLET_SPAWN_POINTS = {
    top: [8, 22],
    bottom: [8, 22],
    left: [6, 13],
    right: [6, 13]
};
let bullets = [];
let bulletTimer = null;

// Level 5
let bot = null;
let botSize = 2;
let botScore = 0;
let botTimer = null;
const BOT_NORMAL_INTERVAL = 120;

// Hiển thị level
document.getElementById("levelName").textContent = (levelConfig.level || "level1").toUpperCase();

// ==================== KHỞI TẠO ====================
function initGame() {
    snake = [
        { x: 7, y: 10 },
        { x: 6, y: 10 },
        { x: 5, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    lives = levelConfig.lives || 3;
    gameRunning = true;
    isPaused = false;
    obstacles = [];
    lifeBuff = null;
    lifeBuffSpawned = false;
    portals = [];
    bullets = [];
    bot = null;
    botSize = 2;
    botScore = 0;
    stopPortalTimer();
    stopBulletTimer();
    stopBotTimer();
    createObstacles();

    if (levelConfig.level === "level3") {
        createPortals();
        startPortalTimer();
    }

    if (levelConfig.level === "level4") {
        startBulletTimer();
    }
    createFood();

    if (levelConfig.level === "level5") {
        createBot();
        startBotTimer();
    }
    document.getElementById("gameOver").style.display = "none";
    document.querySelector(".pause-btn").textContent = "⏸ DỪNG GAME";
    updateInfo();
    clearInterval(gameLoop);
    gameLoop = setInterval(updateGame, levelConfig.speed || 120);
    drawGame();
}

function togglePause() {
    if (!gameRunning) return;
    isPaused = !isPaused;
    const pauseButton = document.querySelector(".pause-btn");
    if (isPaused) {
        pauseButton.textContent = "▶ TIẾP TỤC";
    } else {
        pauseButton.textContent = "⏸ DỪNG GAME";
    }
}


// ==================== THỨC ĂN ====================

function createFood() {
    for (let i = 0; i < 1000; i++) {
        const x = Math.floor(Math.random() * COLS);
        const y = Math.floor(Math.random() * ROWS);

        let isOnSnake = false;
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === x && snake[i].y === y) {
                isOnSnake = true;
                break;
            }
        }

        if (isOnSnake) continue;
        if (isObstacleCell(x, y)) continue;
        if (isPortalCell(x, y)) continue;
        if (levelConfig.level === "level5" && botContainsCell(x, y)) continue;
        if (lifeBuff && lifeBuff.x === x && lifeBuff.y === y) continue;

        food = { x: x, y: y, value: 10 };
        return;
    }
}

function createLifeBuff() {
    if (levelConfig.level === "level1" || lifeBuffSpawned) return;

    for (let i = 0; i < 1000; i++) {
        const x = Math.floor(Math.random() * COLS);
        const y = Math.floor(Math.random() * ROWS);

        let isOnSnake = false;
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === x && snake[i].y === y) {
                isOnSnake = true;
                break;
            }
        }
        if (isOnSnake) continue;
        if (isObstacleCell(x, y)) continue;
        if (isPortalCell(x, y)) continue;
        if (food && food.x === x && food.y === y) continue;

        lifeBuff = { x: x, y: y };
        lifeBuffSpawned = true;
        return;
    }
}


// ==================== GAME CHÍNH ====================
function updateGame() {
    if (!gameRunning || isPaused) return;
    updateBullets();
    if (!gameRunning) return;
    direction = nextDirection;
    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };
   // Đụng biên
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        loseLife();
        return;
    }

    // Đụng thân
    let hitSnake = false;
    for (let i = 0; i < snake.length; i++) {
        if (snake[i].x === head.x && snake[i].y === head.y) {
            hitSnake = true;
            break;
        }
    }

    if (hitSnake) {
        loseLife();
        return;
    }
    // Đụng chướng ngại vật
    if (isObstacleCell(head.x, head.y)) {
        loseLife();
        return;
    }
    // Level 3: đường chia giữa map
    if (levelConfig.level === "level3" &&
        head.x === MAP_WALL_X &&
        !isPortalCell(head.x, head.y)) {
        loseLife();
        return;
    }
    snake.unshift(head);
    // Level 5: đầu rắn chạm bot
    if (levelConfig.level === "level5" &&
        botContainsCell(head.x, head.y)) {
        loseLife();
        return;
    }
    // Ăn thức ăn
    if (food && head.x === food.x && head.y === food.y) {
        score += food.value;
        if (levelConfig.level !== "level1" &&
            score >= 100 &&
            !lifeBuffSpawned) {
            createLifeBuff();
        }
        if (score >= 150) {
            checkNextLevel();
            return;
        }
        createFood();
        // Level 4: ăn thức ăn nhưng không dài thêm
        if (levelConfig.level === "level4") {
            snake.pop();
        }
    } else {
        snake.pop();
    }
    // Ăn buff
    if (levelConfig.level !== "level1" &&
        lifeBuff &&
        head.x === lifeBuff.x &&
        head.y === lifeBuff.y) {
        lives++;
        lifeBuff = null;
        updateInfo();
    }
    // Đi qua cổng
    if (levelConfig.level === "level3" && isPortalCell(head.x, head.y)) {
        teleportSnake();
    }
    updateInfo();
    drawGame();
}

function loseLife() {
    lives--;
    updateInfo();
    if (lives <= 0) {
        endGame();
        return;
    }
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };

    createFood();
    drawGame();
}

function endGame() {
    gameRunning = false;
    clearInterval(gameLoop);
    stopPortalTimer();
    stopBulletTimer();
    stopBotTimer();
    document.getElementById("finalScore").textContent = score;
    document.getElementById("gameOver").style.display = "flex";
}


// ==================== LEVEL 2 - CHƯỚNG NGẠI VẬT ====================
function createObstacles() {
    obstacles = [];
    if (!levelConfig.obstacles) return;
    const count = levelConfig.obstacleCount || 4;
    const size = levelConfig.obstacleSize || 4;
    for (let i = 0; i < count * 20 && obstacles.length < count; i++) {
        const x = Math.floor(Math.random() * (COLS - size));
        const y = Math.floor(Math.random() * (ROWS - size));
        const obstacle = {x: x, y: y, width: size, height: size};

        let hitSnake = false;
        for (const part of snake) {
            if (part.x >= x && part.x < x + size && part.y >= y && part.y < y + size) {
                hitSnake = true;
                break;
            }
        }
        if (hitSnake) {
            continue;
        }

        let hitObstacle = false;
        for (const other of obstacles) {
            if (x < other.x + other.width &&
                x + size > other.x &&
                y < other.y + other.height &&
                y + size > other.y) {
                hitObstacle = true;
                break;
            }
        }
        if (hitObstacle) {
            continue;
        }

        obstacles.push(obstacle);
    }
}

function isObstacleCell(x, y) {
    for (let i = 0; i < obstacles.length; i++) {
        if (x >= obstacles[i].x &&
            x < obstacles[i].x + obstacles[i].width &&
            y >= obstacles[i].y &&
            y < obstacles[i].y + obstacles[i].height) {
            return true;
        }
    }

    return false;
}


// ==================== LEVEL 3 - CỔNG ====================

function createPortals() {
    portals = [];
    const y = Math.floor(Math.random() * (ROWS - PORTAL_HEIGHT - 4)) + 2;

    portals.push({
        x: MAP_WALL_X - 1,
        y: y,
        width: 1,
        height: PORTAL_HEIGHT,
        side: "left"
    });

    portals.push({
        x: MAP_WALL_X + 1,
        y: y,
        width: 1,
        height: PORTAL_HEIGHT,
        side: "right"
    });
}

function isPortalCell(x, y) {
    if (levelConfig.level !== "level3") {
        return false;
    }

    for (let i = 0; i < portals.length; i++) {
        if (x >= portals[i].x &&
            x < portals[i].x + portals[i].width &&
            y >= portals[i].y &&
            y < portals[i].y + portals[i].height) {
            return true;
        }
    }
    return false;
}

function getPortalAt(x, y) {
    for (let i = 0; i < portals.length; i++) {
        if (x >= portals[i].x &&
            x < portals[i].x + portals[i].width &&
            y >= portals[i].y &&
            y < portals[i].y + portals[i].height) {
            return portals[i];
        }
    }

    return null;
}

function teleportSnake() {
    if (portals.length < 2) {
        return;
    }
    const current = getPortalAt(snake[0].x, snake[0].y);
    if (!current) {
        return;
    }

    let target = null;
    for (let i = 0; i < portals.length; i++) {
        if (portals[i] !== current) {
            target = portals[i];
            break;
        }
    }
    if (!target) {
        return;
    }

    const offsetY = snake[0].y - current.y;
    let newY = target.y + offsetY;

    if (newY < target.y) {
        newY = target.y;
    }

    if (newY > target.y + target.height - 1) {
        newY = target.y + target.height - 1;
    }

    let hitSnake = false;

    for (let i = 1; i < snake.length; i++) {
        if (snake[i].x === target.x &&
            snake[i].y === newY) {
            hitSnake = true;
            break;
        }
    }

    if (hitSnake) {
        loseLife();
        return;
    }

    snake[0] = {x: target.x, y: newY};
    drawGame();
}

function startPortalTimer() {
    stopPortalTimer();
    portalCountdown = PORTAL_TIME;
    updatePortalTimer();
    portalTimer = setInterval(function () {
        if (!gameRunning || isPaused) return;
        portalCountdown--;

        if (portalCountdown <= 0) {
            createPortals();

            if (food && isPortalCell(food.x, food.y)) {
                createFood();
            }

            if (lifeBuff && isPortalCell(lifeBuff.x, lifeBuff.y)) {
                relocateLifeBuff();
            }

            portalCountdown = PORTAL_TIME;
        }
        updatePortalTimer();
        drawGame();
    }, 1000);
}

function stopPortalTimer() {
    if (portalTimer) {
        clearInterval(portalTimer);
        portalTimer = null;
    }
}

function updatePortalTimer() {
    portalTimeElement.textContent = portalCountdown;
}

function relocateLifeBuff() {
    if (!lifeBuff) {
        return;
    }
    for (let i = 0; i < 1000; i++) {
        const x = Math.floor(Math.random() * COLS);
        const y = Math.floor(Math.random() * ROWS);

        let hitSnake = false;
        for (let j = 0; j < snake.length; j++) {
            if (snake[j].x === x && snake[j].y === y) {
                hitSnake = true;
                break;
            }
        }
        if (hitSnake) {
            continue;
        }
        if (isPortalCell(x, y)) {
            continue;
        }
        if (food && food.x === x && food.y === y) {
            continue;
        }
        lifeBuff = {x: x, y: y};
        return;
    }
}


// ==================== LEVEL 4 - ĐẠN ====================

function startBulletTimer() {
    stopBulletTimer();

    bulletTimer = setInterval(function () {
        if (!gameRunning || isPaused) return;
        createBullet();
    }, BULLET_INTERVAL);
}

function stopBulletTimer() {
    if (bulletTimer) {
        clearInterval(bulletTimer);
        bulletTimer = null;
    }
}

function createBullet() {
    const sides = ["top", "bottom", "left", "right"];
    const side = sides[Math.floor(Math.random() * sides.length)];
    const index = Math.floor(Math.random() * 2);
    let bullet;

    if (side === "top") {
        bullet = {
            x: BULLET_SPAWN_POINTS.top[index],
            y: 0,
            dx: 0,
            dy: BULLET_SPEED
        };
    } else if (side === "bottom") {
        bullet = {
            x: BULLET_SPAWN_POINTS.bottom[index],
            y: ROWS - 1,
            dx: 0,
            dy: -BULLET_SPEED
        };
    } else if (side === "left") {
        bullet = {
            x: 0,
            y: BULLET_SPAWN_POINTS.left[index],
            dx: BULLET_SPEED,
            dy: 0
        };
    } else {
        bullet = {
            x: COLS - 1,
            y: BULLET_SPAWN_POINTS.right[index],
            dx: -BULLET_SPEED,
            dy: 0
        };
    }

    bullets.push(bullet);
}

function updateBullets() {
    if (levelConfig.level !== "level4" || !gameRunning || isPaused) {
        return;
    }

    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        let hitSnake = false;
        for (let j = 0; j < snake.length; j++) {
            if (Math.abs(snake[j].x - bullet.x) < 0.5 &&
                Math.abs(snake[j].y - bullet.y) < 0.5) {
                hitSnake = true;
                break;
            }
        }

        if (hitSnake) {
            bullets.splice(i, 1);
            loseLife();

            if (!gameRunning) {
                return;
            }

            continue;
        }
        if (bullet.x < -1 || bullet.x > COLS ||
            bullet.y < -1 || bullet.y > ROWS) {
            bullets.splice(i, 1);
        }
    }
}

// ==================== LEVEL 5 - BOT ====================

function createBot() {
    const positions = [
        { x: COLS - 4, y: 3 },
        { x: COLS - 5, y: ROWS - 5 },
        { x: 20, y: 3 },
        { x: 20, y: 14 }
    ];
    const position = positions[Math.floor(Math.random() * positions.length)];
    bot = {x: position.x, y: position.y, width: 2, height: 2};
    if (!isBotPositionValid(bot.x, bot.y, bot.width, bot.height)) {
        for (let y = 1; y < ROWS - bot.height; y++) {
            for (let x = 1; x < COLS - bot.width; x++) {
                if (isBotPositionValid(x, y, bot.width, bot.height)) {
                    bot.x = x;
                    bot.y = y;
                    return;
                }
            }
        }
    }
}


function isBotPositionValid(x, y, width, height) {
    // Kiểm tra bot có nằm ngoài bản đồ không
    if (x < 0 || y < 0 || x + width > COLS || y + height > ROWS) {
        return false;
    }

    // Kiểm tra bot có đè lên rắn không
    for (let i = 0; i < snake.length; i++) {
        let part = snake[i];
        if (part.x >= x && part.x < x + width &&
            part.y >= y && part.y < y + height) {
            return false;
        }
    }
    return true;
}


function botContainsCell(x, y) {
    if (!bot) return false;
    return (
        x >= bot.x &&
        x < bot.x + bot.width &&
        y >= bot.y &&
        y < bot.y + bot.height
    );
}

function startBotTimer() {
    stopBotTimer();
    botTimer = setInterval(function () {
        if (gameRunning == false || isPaused == true) {
            return;
        }
        updateBot();
    }, 100);
}


function stopBotTimer() {
    if (botTimer) {
        clearInterval(botTimer);
        botTimer = null;
    }
}

function updateBot() {
    if (!bot || !food) return;
    if (bot.lastMove &&
        Date.now() - bot.lastMove < BOT_NORMAL_INTERVAL) {
        return;
    }
    bot.lastMove = Date.now();
    const path = findBotPath();
    if (path.length >= 2) {
        bot.x = path[1].x;
        bot.y = path[1].y;
    }
    if (botContainsCell(food.x, food.y)) {
        botScore += food.value;
        if (botScore >= 100 && botSize < 4) {
            botSize = 4;
            bot.width = 4;
            bot.height = 4;
        }
        createFood();
    }
    if (botContainsCell(snake[0].x, snake[0].y)) {
        loseLife();
    }
}

// Hàm BFS cho bot tìm thức ăn
function findBotPath() {
    if (!bot || !food) return [];

    const start = { x: bot.x, y: bot.y };
    const target = { x: food.x, y: food.y };
    const queue = [start];
    const visited = new Set();
    const parent = new Map();

    visited.add(start.x + "," + start.y);

    while (queue.length > 0) {
        const current = queue.shift();
        if (current.x === target.x && current.y === target.y) {
            return buildBotPath(parent, start, target);
        }
        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];
        for (const direction of directions) {
            const x = current.x + direction.x;
            const y = current.y + direction.y;
            const key = x + "," + y;
            if (visited.has(key)) continue;
            if (!isBotMoveValid(x, y)) continue;
            visited.add(key);
            parent.set(key, current);
            queue.push({ x: x, y: y });
        }
    }

    return [];
}

function isBotMoveValid(x, y) {
    if (x < 0 || y < 0 ||
        x + bot.width > COLS ||
        y + bot.height > ROWS) {
        return false;
    }
    return true;
}

function buildBotPath(parent, start, target) {
    const path = [target];
    let current = target;
    while (current.x !== start.x || current.y !== start.y) {
        const previous = parent.get(current.x + "," + current.y);
        if (!previous) return [];
        path.unshift(previous);
        current = previous;
    }

    return path;
}


// ==================== VẼ GAME ====================

function drawGame() {
    ctx.fillStyle = "#65a936";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawFood();
    drawObstacles();
    drawLifeBuff();
    drawMapSplit();
    drawPortals();
    drawBulletCannons();
    drawBullets();
    drawBot();
    drawSnake();
}

function drawSnake() {
    for (let i = 0; i < snake.length; i++) {
        let part = snake[i];
        let x = part.x * GRID_SIZE;
        let y = part.y * GRID_SIZE;
        if (i == 0) {
            ctx.fillStyle = "#ffcc00";
        } else {
            ctx.fillStyle = "#ff8c00";
        }

        let padding = 3;
        // Đầu rắn nhỏ hơn một chút
        if (i == 0) {
            padding = 2;
        }
        ctx.fillRect(
            x + padding,
            y + padding,
            GRID_SIZE - padding * 2,
            GRID_SIZE - padding * 2
        );
    }
}

function drawFood() {
    if (!food) return;
    const x = food.x * GRID_SIZE;
    const y = food.y * GRID_SIZE;
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(x + 3, y + 3, GRID_SIZE - 6, GRID_SIZE - 6);
}

function drawObstacles() {
    obstacles.forEach(function (obstacle) {
        const x = obstacle.x * GRID_SIZE;
        const y = obstacle.y * GRID_SIZE;
        const width = obstacle.width * GRID_SIZE;
        const height = obstacle.height * GRID_SIZE;
        ctx.fillStyle = "#8B5A2B";
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = "#4A2A14";
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
    });
}

function drawLifeBuff() {
    if (levelConfig.level === "level1" || !lifeBuff) return;

    const x = lifeBuff.x * GRID_SIZE;
    const y = lifeBuff.y * GRID_SIZE;
    ctx.fillStyle = "#e91e63";
    ctx.fillRect(x + 2, y + 2, GRID_SIZE - 4, GRID_SIZE - 4);
    ctx.fillStyle = "white";
    ctx.font = "bold 18px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("+", x + GRID_SIZE / 2, y + GRID_SIZE / 2);
}

// Level 3
function drawMapSplit() {
    if (levelConfig.level !== "level3") return;
    const wallX = MAP_WALL_X * GRID_SIZE;
    ctx.fillStyle = "#3e2723";
    ctx.fillRect(wallX, 0, 3, canvas.height);
}

function drawPortals() {
    if (levelConfig.level !== "level3") return;
    portals.forEach(function (portal) {
        const x = portal.x * GRID_SIZE;
        const y = portal.y * GRID_SIZE;
        const width = portal.width * GRID_SIZE;
        const height = portal.height * GRID_SIZE;
        ctx.fillStyle = "#7e57c2";
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = "#4a148c";
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
    });
}

function drawBulletCannons() {
    if (levelConfig.level != "level4") {
        return;
    }
    let points = [
        { x: 8, y: 0 },
        { x: 22, y: 0 },
        { x: 8, y: ROWS - 1 },
        { x: 22, y: ROWS - 1 },
        { x: 0, y: 6 },
        { x: 0, y: 13 },
        { x: COLS - 1, y: 6 },
        { x: COLS - 1, y: 13 }
    ];

    for (let i = 0; i < points.length; i++) {
        let point = points[i];
        let x = point.x * GRID_SIZE + GRID_SIZE / 2;
        let y = point.y * GRID_SIZE + GRID_SIZE / 2;
        ctx.fillStyle = "#4a2a14";
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#8b5a2b";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBullets() {
    if (levelConfig.level !== "level4") return;
    bullets.forEach(function (bullet) {
        const x = bullet.x * GRID_SIZE + GRID_SIZE / 2;
        const y = bullet.y * GRID_SIZE + GRID_SIZE / 2;
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(x, y, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff5722";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBot() {
    if (levelConfig.level !== "level5" || !bot) return;
    const x = bot.x * GRID_SIZE;
    const y = bot.y * GRID_SIZE;
    const width = bot.width * GRID_SIZE;
    const height = bot.height * GRID_SIZE;
    ctx.fillStyle = "#7b1fa2";
    ctx.fillRect(x + 2, y + 2, width - 4, height - 4);
    ctx.strokeStyle = "#4a148c";
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
}

// ==================== ĐIỀU KHIỂN ====================
document.addEventListener("keydown", function (event) {
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "w") {
        if (direction.y !== 1) {
            nextDirection = { x: 0, y: -1 };
        }
    } else if (key === "arrowdown" || key === "s") {
        if (direction.y !== -1) {
            nextDirection = { x: 0, y: 1 };
        }
    } else if (key === "arrowleft" || key === "a") {
        if (direction.x !== 1) {
            nextDirection = { x: -1, y: 0 };
        }
    } else if (key === "arrowright" || key === "d") {
        if (direction.x !== -1) {
            nextDirection = { x: 1, y: 0 };
        }
    }
});


// ==================== CHUYỂN LEVEL ====================
function checkNextLevel() {
    if (score < 150) return;

    if (levelConfig.level === "level1") {
        window.location.href = "level2.html";
    } else if (levelConfig.level === "level2") {
        window.location.href = "level3.html";
    } else if (levelConfig.level === "level3") {
        window.location.href = "level4.html";
    } else if (levelConfig.level === "level4") {
        window.location.href = "level5.html";
    } else {
        gameRunning = false;
        clearInterval(gameLoop);
        stopPortalTimer();
        stopBulletTimer();
        stopBotTimer();
        document.getElementById("winModal").style.display = "flex";
    }
}

function updateInfo() {
    document.getElementById("score").textContent = score;
    document.getElementById("lives").textContent = "❤️".repeat(lives);
}

function restartGame() {
    initGame();
}

function goHome() {
    window.location.href = "home.html";
}

initGame();