const canvas = document.getElementById("slam");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const randomBtn = document.getElementById("randomBtn");
const speedInput = document.getElementById("speedInput");
const rayInput = document.getElementById("rayInput");
const speedValue = document.getElementById("speedValue");
const rayValue = document.getElementById("rayValue");

const coverageText = document.getElementById("coverageText");
const obstacleText = document.getElementById("obstacleText");
const pathText = document.getElementById("pathText");

const worldCols = 50;
const worldRows = 30;
const cellW = (canvas.width / 2) / worldCols;
const cellH = canvas.height / worldRows;

let world = [];
let known = [];
let robot = null;
let running = false;

function createWorld() {
  world = Array.from({ length: worldRows }, () => Array(worldCols).fill(0));
  known = Array.from({ length: worldRows }, () => Array(worldCols).fill(-1));

  for (let r = 0; r < worldRows; r += 1) {
    for (let c = 0; c < worldCols; c += 1) {
      const edge = r === 0 || c === 0 || r === worldRows - 1 || c === worldCols - 1;
      world[r][c] = edge ? 1 : 0;
    }
  }

  for (let i = 0; i < 240; i += 1) {
    const r = Math.floor(Math.random() * worldRows);
    const c = Math.floor(Math.random() * worldCols);
    if ((r < 3 && c < 3) || (r < 3 && c > worldCols - 4)) continue;
    world[r][c] = Math.random() < 0.33 ? 1 : world[r][c];
  }

  robot = {
    x: 2.5,
    y: 2.5,
    angle: 0.4,
    distance: 0,
  };
}

function blocked(x, y) {
  const c = Math.floor(x);
  const r = Math.floor(y);
  if (r < 0 || c < 0 || r >= worldRows || c >= worldCols) return true;
  return world[r][c] === 1;
}

function castRays() {
  const rays = Number(rayInput.value);
  const maxDist = 18;

  for (let i = 0; i < rays; i += 1) {
    const a = robot.angle - 1.1 + (i / Math.max(1, rays - 1)) * 2.2;
    let d = 0;
    while (d < maxDist) {
      d += 0.14;
      const x = robot.x + Math.cos(a) * d;
      const y = robot.y + Math.sin(a) * d;
      const c = Math.floor(x);
      const r = Math.floor(y);

      if (r < 0 || c < 0 || r >= worldRows || c >= worldCols) break;
      if (world[r][c] === 1) {
        known[r][c] = 1;
        break;
      }
      known[r][c] = 0;
    }
  }
}

function moveRobot() {
  const speed = Number(speedInput.value) * 0.03;

  const nx = robot.x + Math.cos(robot.angle) * speed;
  const ny = robot.y + Math.sin(robot.angle) * speed;

  if (!blocked(nx, ny)) {
    robot.distance += Math.hypot(nx - robot.x, ny - robot.y);
    robot.x = nx;
    robot.y = ny;
  } else {
    robot.angle += Math.PI * (0.35 + Math.random() * 0.35);
  }

  if (Math.random() < 0.08) {
    robot.angle += (Math.random() - 0.5) * 0.5;
  }
}

function drawGrid(offsetX, grid, revealTruth = false) {
  for (let r = 0; r < worldRows; r += 1) {
    for (let c = 0; c < worldCols; c += 1) {
      let color = "#050b0e";
      const v = grid[r][c];

      if (revealTruth) {
        color = v === 1 ? "#3c595d" : "#0b171c";
      } else {
        if (v === -1) color = "#070f13";
        if (v === 0) color = "#13252b";
        if (v === 1) color = "#c4e6e8";
      }

      ctx.fillStyle = color;
      ctx.fillRect(offsetX + c * cellW, r * cellH, cellW - 0.5, cellH - 0.5);
    }
  }
}

function drawRobot(offsetX, color) {
  const x = offsetX + robot.x * cellW;
  const y = robot.y * cellH;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(robot.angle) * 16, y + Math.sin(robot.angle) * 16);
  ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGrid(0, world, true);
  drawGrid(canvas.width / 2, known, false);

  ctx.fillStyle = "#9fcad0";
  ctx.font = "13px monospace";
  ctx.fillText("Ground Truth", 12, 18);
  ctx.fillText("SLAM Occupancy Map", canvas.width / 2 + 12, 18);

  drawRobot(0, "#ffcd6e");
  drawRobot(canvas.width / 2, "#69f2d6");

  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
}

function updateStats() {
  let knownCells = 0;
  let knownObstacles = 0;

  for (let r = 0; r < worldRows; r += 1) {
    for (let c = 0; c < worldCols; c += 1) {
      if (known[r][c] !== -1) knownCells += 1;
      if (known[r][c] === 1) knownObstacles += 1;
    }
  }

  coverageText.textContent = `${((knownCells / (worldRows * worldCols)) * 100).toFixed(1)}%`;
  obstacleText.textContent = String(knownObstacles);
  pathText.textContent = robot.distance.toFixed(1);
}

function step() {
  if (!running) return;
  moveRobot();
  castRays();
  updateStats();
  draw();
  requestAnimationFrame(step);
}

function syncLabels() {
  speedValue.textContent = Number(speedInput.value).toFixed(1);
  rayValue.textContent = rayInput.value;
}

speedInput.addEventListener("input", syncLabels);
rayInput.addEventListener("input", syncLabels);

startBtn.addEventListener("click", () => {
  if (running) return;
  running = true;
  step();
});

pauseBtn.addEventListener("click", () => {
  running = false;
});

resetBtn.addEventListener("click", () => {
  running = false;
  createWorld();
  castRays();
  updateStats();
  draw();
});

randomBtn.addEventListener("click", () => {
  running = false;
  createWorld();
  castRays();
  updateStats();
  draw();
});

syncLabels();
createWorld();
castRays();
updateStats();
draw();
