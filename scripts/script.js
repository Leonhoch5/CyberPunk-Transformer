const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const groundHeight = 50;
const groundY = canvas.height - groundHeight;

const player = {
  x: canvas.width / 4,
  y: groundY - 128, 
  width: 256,
  height: 256,
  dx: 2, 
  dy: 0, 
  gravity: 0.2,
  isJumping: false,
  isCrouching: false,
  state: "idle", 
  health: 100,
  direction: "right", 
};

const spriteSheets = {
  idle: { src: "../assets/character/Fighter/Idle.png", frameWidth: 128, frameHeight: 128, frameCount: 6 },
  walk: { src: "../assets/character/Fighter/Walk.png", frameWidth: 128, frameHeight: 128, frameCount: 8 },
  jump: { src: "../assets/character/Fighter/Jump.png", frameWidth: 128, frameHeight: 128, frameCount: 10 },
  crouch: { src: "../assets/character/Fighter/Shield.png", frameWidth: 128, frameHeight: 128, frameCount: 2 },
  attack: { src: "../assets/character/Fighter/Attack_3.png", frameWidth: 128, frameHeight: 128, frameCount: 4 },
  hurt: { src: "../assets/character/Fighter/Hurt.png", frameWidth: 128, frameHeight: 128, frameCount: 3 },
};

const loadedSpriteSheets = {};
let playerFrame = 0;
let aiFrame = 0;
let lastPlayerFrameChange = performance.now();
let lastAIFrameChange = performance.now();
let attackTimeout = null;
let playerAttackCooldown = 0;

Object.keys(spriteSheets).forEach((state) => {
  const img = new Image();
  img.src = spriteSheets[state].src;
  img.onerror = () => console.error(`Failed to load ${spriteSheets[state].src}`);
  loadedSpriteSheets[state] = img;
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawGround() {
  const gradient = ctx.createLinearGradient(0, groundY, 0, canvas.height);
  gradient.addColorStop(0, "darkgreen");
  gradient.addColorStop(1, "brown");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, groundY, canvas.width, groundHeight);
}

function drawHealthBars() {
  const playerHealth = clamp(player.health, 0, 100);
  const aiHealth = clamp(ai.health, 0, 150);

  ctx.fillStyle = "red";
  ctx.fillRect(20, 20, (playerHealth / 100) * 200, 20);
  ctx.strokeStyle = "black";
  ctx.strokeRect(20, 20, 200, 20);

  ctx.fillStyle = "red";
  ctx.fillRect(canvas.width - 220, 20, (aiHealth / 150) * 200, 20);
  ctx.strokeRect(canvas.width - 220, 20, 200, 20);
}

let playerHurtTimer = 0;
let aiHurtTimer = 0;

const HIT_FEEDBACK_DURATION = 200;

function drawPlayer() {
  const currentTime = performance.now();

  if (currentTime - lastPlayerFrameChange > 125) {
    playerFrame = (playerFrame + 1) % spriteSheets[player.state].frameCount;
    lastPlayerFrameChange = currentTime;
  }

  const spriteSheet = loadedSpriteSheets[player.state];
  const { frameWidth, frameHeight } = spriteSheets[player.state];

  ctx.save();

  if (playerHurtTimer > 0) {
    ctx.filter = "brightness(1.5)"; 
  }

  if (player.direction === "left") {
    ctx.scale(-1, 1);
    ctx.drawImage(
      spriteSheet,
      playerFrame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      -player.x - player.width,
      player.y,
      player.width,
      player.height
    );
  } else {
    ctx.drawImage(
      spriteSheet,
      playerFrame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      player.x,
      player.y,
      player.width,
      player.height
    );
  }

  ctx.restore();

  if (playerHurtTimer > 0) playerHurtTimer -= 16.67; 
}

function drawAI() {
  const currentTime = performance.now();

  if (currentTime - lastAIFrameChange > 125) {
    aiFrame = (aiFrame + 1) % spriteSheets[ai.state].frameCount;
    lastAIFrameChange = currentTime;
  }

  const spriteSheet = loadedSpriteSheets[ai.state];
  const { frameWidth, frameHeight } = spriteSheets[ai.state];

  ctx.save();

  if (aiHurtTimer > 0) {
    ctx.filter = "brightness(1.5)"; 
  }

  if (ai.direction === "left") {
    ctx.scale(-1, 1);
    ctx.drawImage(
      spriteSheet,
      aiFrame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      -ai.x - ai.width,
      ai.y,
      ai.width,
      ai.height
    );
  } else {
    ctx.drawImage(
      spriteSheet,
      aiFrame * frameWidth,
      0,
      frameWidth,
      frameHeight,
      ai.x,
      ai.y,
      ai.width,
      ai.height
    );
  }

  ctx.restore();

  if (aiHurtTimer > 0) aiHurtTimer -= 16.67; 
}

function updatePlayer() {
  if (playerAttackCooldown > 0) playerAttackCooldown--;

  if (player.state === "attack") {
    return; 
  }

  if (player.y + player.height < groundY) {
    player.dy += player.gravity;
  }

  player.y += player.dy;

  if (player.y + player.height >= groundY) {
    player.dy = 0;
    player.isJumping = false;
    player.y = groundY - player.height;
  }

  if (player.isCrouching) {
    player.state = "crouch";
  } else if (player.isJumping) {
    player.state = "jump";
  } else if (keys["a"] || keys["d"]) {
    player.state = "walk";
    if (keys["a"]) {
      player.x -= player.dx;
      player.direction = "left"; 
    }
    if (keys["d"]) {
      player.x += player.dx;
      player.direction = "right"; 
    }
  } else {
    player.state = "idle";
  }
}

const keys = {};
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (e.key === "w" && !player.isJumping && player.state !== "attack") {
    player.isJumping = true;
    player.dy = -10;
  }

  if (e.key === "s" && player.state !== "attack") {
    player.isCrouching = true;
  }

  if (e.key === "f" && playerAttackCooldown <= 0) {
    player.state = "attack";
    playerFrame = 0;
    clearTimeout(attackTimeout);
    attackTimeout = setTimeout(() => {
      player.state = "idle";
    }, spriteSheets.attack.frameCount * 125);
    playerAttackCooldown = 30;

    if (
      player.x + player.width > ai.x &&
      player.x < ai.x + ai.width &&
      player.y + player.height > ai.y &&
      player.y < ai.y + ai.height
    ) {
      ai.health -= 10;
      aiHurtTimer = HIT_FEEDBACK_DURATION;
    }
  }
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;

  if (e.key === "s") {
    player.isCrouching = false;
  }
});

const ai = {
  x: (canvas.width * 3) / 4,
  y: groundY - 128,
  width: 256,
  height: 256,
  dx: 2.2,
  dy: 0,
  gravity: 0.2,
  state: "idle",
  health: 150,
  attackCooldown: 0,
  direction: "left", 
  isJumping: false,
};

function updateAI() {
  if (ai.health <= 0) return;

  const distanceToPlayer = Math.abs(player.x - ai.x);

  ai.dy += ai.gravity;
  ai.y += ai.dy;

  if (ai.y + ai.height >= groundY) {
    ai.y = groundY - ai.height;
    ai.dy = 0;
    ai.isJumping = false;
  }

  if (distanceToPlayer > 200) {
    ai.state = "walk";
    if (player.x < ai.x) {
      ai.direction = "left";
      ai.x -= ai.dx;
    } else {
      ai.direction = "right";
      ai.x += ai.dx;
    }
  } else if (distanceToPlayer > 50 && distanceToPlayer <= 200) {
    ai.state = "attack";
    if (ai.attackCooldown <= 0) {
      ai.attackCooldown = 100; 
    }
  } else if (distanceToPlayer <= 50) {
    ai.state = "retreat";
    if (player.x < ai.x) {
      ai.direction = "right";
      ai.x += ai.dx;
    } else {
      ai.direction = "left";
      ai.x -= ai.dx;
    }
  }

  if (ai.attackCooldown > 0) {
    ai.attackCooldown--;
  }
}

function drawMenu() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "48px ownFont";
  ctx.textAlign = "center";
  ctx.fillText("Welcome to the Game!", canvas.width / 2, canvas.height / 2 - 100);
  ctx.font = "32px ownFont";
  ctx.fillText("Press 'Enter' to Start", canvas.width / 2, canvas.height / 2);
  ctx.fillText("Move: A/D | Jump: W | Crouch: S | Attack: F", canvas.width / 2, canvas.height / 2 + 100);
}

let playerScore = 0;
let aiScore = 0;
const WINNING_SCORE = 7;

function checkGameOver() {
  if (player.health <= 0) {
    aiScore++;
    if (aiScore >= WINNING_SCORE) {
      drawMatchWinner("ai");
    } else {
      drawRoundWinner("ai");
    }
    return true;
  } else if (ai.health <= 0) {
    playerScore++;
    if (playerScore >= WINNING_SCORE) {
      drawMatchWinner("player");
    } else {
      drawRoundWinner("player");
    }
    return true;
  }
  return false;
}

function drawMatchWinner(winner) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "48px ownFont";
  ctx.textAlign = "center";
  ctx.fillText(
    winner === "player" ? "You Win the Match!" : "AI Wins the Match!",
    canvas.width / 2,
    canvas.height / 2 - 50
  );
  ctx.font = "32px ownFont";
  ctx.fillText("Press 'R' to Restart", canvas.width / 2, canvas.height / 2 + 50);

  gameRunning = false;
}

function resetGame() {
  player.health = 100;
  ai.health = 150;
  player.state = "idle";
  ai.state = "idle";
  playerHurtTimer = 0;
  aiHurtTimer = 0;
  playerAttackCooldown = 0;
  ai.attackCooldown = 0;
  player.x = canvas.width / 4;
  ai.x = (canvas.width * 3) / 4;
    gameRunning = true;
  }

function drawScores() {
  ctx.fillStyle = "white";
  ctx.font = "32px ownFont";
  ctx.fillText(`Player: ${playerScore}`, 125, 75);
  ctx.fillText(`AI: ${aiScore}`, canvas.width -50, 75);
}

function drawRoundWinner(winner) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "48px ownFont";
  ctx.textAlign = "center";
  ctx.fillText(
    winner === "player" ? "You Win the Round!" : "AI Wins the Round!",
    canvas.width / 2,
    canvas.height / 2 - 50
  );
  ctx.font = "32px ownFont";
  ctx.fillText("Press 'Enter' to Continue", canvas.width / 2, canvas.height / 2 + 50);


  gameRunning = false;
}

function drawPauseMenu() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "48px ownFont";
  ctx.textAlign = "center";
  ctx.fillText("Game Paused", canvas.width / 2, canvas.height / 2 - 50);
  ctx.font = "32px ownFont";
  ctx.fillText("Press 'P' to Resume", canvas.width / 2, canvas.height / 2 + 50);
}


let lastRenderTime = performance.now();

function drawFPS() {
  const now = performance.now();
  const fps = Math.round(1000 / (now - lastRenderTime));
  lastRenderTime = now;

  ctx.fillStyle = "white";
  ctx.font = "16px ownFont";
  ctx.fillText(`FPS: ${fps}`, 60, 15);
}

let gameRunning = false;
let gamePaused = false;

function animate(currentTime) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gamePaused) {
    drawPauseMenu();
    return;
  }

  if (!gameRunning) {
    drawMenu();
    return;
  }

  drawGround();
  drawHealthBars();
  drawFPS();
  drawScores();

  player.dy = clamp(player.dy + player.gravity, -10, 10);
  ai.dy = clamp(ai.dy + ai.gravity, -10, 10);

  if (ai.attackCooldown > 0) {
    ai.state = "idle";
  } else if (ai.isJumping) {
    ai.state = "jump";
  } else {
    ai.state = "walk";
  }

  const isCollision = (
    player.x + player.width * 0.8 > ai.x + ai.width * 0.2 &&
    player.x + player.width * 0.2 < ai.x + ai.width * 0.8 &&
    player.y + player.height * 0.8 > ai.y + ai.height * 0.2 &&
    player.y + player.height * 0.2 < ai.y + ai.height * 0.8
  );

  if (isCollision) {
    if (playerHurtTimer <= 0) {
      player.health -= 7.5; 
      playerHurtTimer = HIT_FEEDBACK_DURATION; 
    }
    if (aiHurtTimer <= 0) {
      ai.health -= 10; 
      aiHurtTimer = HIT_FEEDBACK_DURATION; 
    }
  }

  if (playerHurtTimer > 0) playerHurtTimer -= currentTime - lastRenderTime;
  if (aiHurtTimer > 0) aiHurtTimer -= currentTime - lastRenderTime;

  if (!checkGameOver()) {
    updatePlayer();
    drawPlayer();
    updateAI();
    drawAI();
    if (!gamePaused) {
      requestAnimationFrame(animate);
    }
  } else {
    gameRunning = false;
  }

  lastRenderTime = currentTime;
}

// Start the game on Enter
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (!gameRunning) {
      if (playerScore < WINNING_SCORE && aiScore < WINNING_SCORE) {
        resetGame();
        animate();
      }
    }
  }
  if (e.key === "r") {
    playerScore = 0;
    aiScore = 0;
    resetGame();
    animate();
  }
  if (e.key === "p") {
    gamePaused = !gamePaused;
    if (!gamePaused) {
      animate();
    }
  }
});

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  player.y = groundY - player.height;
  ai.y = groundY - ai.height;
});

animate();