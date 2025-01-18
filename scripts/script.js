// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Ground setup
const groundHeight = 50;
const groundY = canvas.height - groundHeight;

// Player setup
const player = {
  x: canvas.width / 4,
  y: groundY - 128, // Starting position above the ground
  width: 256,
  height: 256,
  dx: 2, // Movement speed
  dy: 0, // Vertical speed for jumping
  gravity: 0.2,
  isJumping: false,
  isCrouching: false,
  state: "idle", // Current animation state
  health: 100,
  direction: "right", // Player's current facing direction
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

// Clamp function to constrain values within a range
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Draw the ground
function drawGround() {
  const gradient = ctx.createLinearGradient(0, groundY, 0, canvas.height);
  gradient.addColorStop(0, "darkgreen");
  gradient.addColorStop(1, "brown");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, groundY, canvas.width, groundHeight);
}

// Draw health bars
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

// Visual feedback timers
let playerHurtTimer = 0;
let aiHurtTimer = 0;

// Constants for feedback duration (in milliseconds)
const HIT_FEEDBACK_DURATION = 200;

// Draw the player
function drawPlayer() {
  const currentTime = performance.now();

  // Change the frame for animation
  if (currentTime - lastPlayerFrameChange > 125) {
    playerFrame = (playerFrame + 1) % spriteSheets[player.state].frameCount;
    lastPlayerFrameChange = currentTime;
  }

  const spriteSheet = loadedSpriteSheets[player.state];
  const { frameWidth, frameHeight } = spriteSheets[player.state];

  ctx.save();

  // Apply visual feedback for being hurt
  if (playerHurtTimer > 0) {
    ctx.filter = "brightness(1.5)"; // Brightness effect for visual feedback
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

  if (playerHurtTimer > 0) playerHurtTimer -= 16.67; // Approximate frame duration in milliseconds
}

// Draw the AI
function drawAI() {
  const currentTime = performance.now();

  // Change the frame for animation
  if (currentTime - lastAIFrameChange > 125) {
    aiFrame = (aiFrame + 1) % spriteSheets[ai.state].frameCount;
    lastAIFrameChange = currentTime;
  }

  const spriteSheet = loadedSpriteSheets[ai.state];
  const { frameWidth, frameHeight } = spriteSheets[ai.state];

  ctx.save();

  // Apply visual feedback for being hurt
  if (aiHurtTimer > 0) {
    ctx.filter = "brightness(1.5)"; // Brightness effect for visual feedback
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

  if (aiHurtTimer > 0) aiHurtTimer -= 16.67; // Approximate frame duration in milliseconds
}

// Update player position and handle gravity
function updatePlayer() {
  if (playerAttackCooldown > 0) playerAttackCooldown--;

  if (player.state === "attack") {
    return; // Prevent actions during an attack
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
      player.direction = "left"; // Face left when moving left
    }
    if (keys["d"]) {
      player.x += player.dx;
      player.direction = "right"; // Face right when moving right
    }
  } else {
    player.state = "idle";
  }
}

// Input handling
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

    // Check for collision and apply damage
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

// AI setup
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

  // Gravity and ground collision
  ai.dy += ai.gravity;
  ai.y += ai.dy;
  if (ai.y + ai.height >= groundY) {
    ai.y = groundY - ai.height;
    ai.dy = 0;
    ai.isJumping = false;
  }

  // Retreat if health is low
  if (ai.health < 20 && Math.random() < 0.1) {
    ai.state = "retreat";
    if (player.x < ai.x) {
      ai.direction = "right";
      ai.x += ai.dx * 1.5; // Retreat faster
    } else {
      ai.direction = "left";
      ai.x -= ai.dx * 1.5;
    }
    return;
  }

  // AI decision-making
  if (distanceToPlayer > 150) {
    // Approach the player
    ai.state = "walk";
    if (player.x < ai.x) {
      ai.direction = "left";
      ai.x -= ai.dx;
    } else {
      ai.direction = "right";
      ai.x += ai.dx;
    }
  } else if (distanceToPlayer <= 150 && distanceToPlayer > 70) {
    // Random jump or idle
    if (Math.random() < 0.05 && !ai.isJumping) {
      ai.dy = -10;
      ai.isJumping = true;
      ai.state = "jump";
    } else {
      ai.state = "strafe";
      ai.x += ai.direction === "right" ? ai.dx : -ai.dx;
    }
  } else if (distanceToPlayer <= 70) {
    // Close combat behavior
    if (ai.attackCooldown <= 0) {
      ai.state = "attack";
      ai.attackCooldown = 100 + Math.random() * 50; // Variable cooldown

      ai.direction = ai.x < player.x ? "right" : "left";

      setTimeout(() => {
        ai.state = "idle";
      }, spriteSheets.attack.frameCount * 125);

      if (
        ai.x + ai.width > player.x &&
        ai.x < player.x + player.width &&
        ai.y + ai.height > player.y &&
        ai.y < player.y + player.height
      ) {
        player.health -= 10;
        playerHurtTimer = HIT_FEEDBACK_DURATION;
      }
    } else {
      // Dodge or maintain distance
      ai.state = "dodge";
      ai.x += ai.direction === "right" ? -ai.dx : ai.dx;
    }
  }

  // Occasional crouch
  if (Math.random() < 0.01 && !ai.isJumping && ai.state !== "attack") {
    ai.state = "crouch";
    setTimeout(() => {
      ai.state = "idle";
    }, 500);
  }

  // Boundary check
  ai.x = clamp(ai.x, 0, canvas.width - ai.width);

  // Reduce attack cooldown
  if (ai.attackCooldown > 0) ai.attackCooldown--;
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
  ctx.fillText(`Player: ${playerScore}`, 50, 50);
  ctx.fillText(`AI: ${aiScore}`, canvas.width - 150, 50);
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
  ctx.fillText(`FPS: ${fps}`, 100, 70);
}

let gameRunning = false;
let gamePaused = false;

function animate() {
  const currentTime = performance.now();
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
  // drawFPS();
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

  if (playerHurtTimer > 0) playerHurtTimer -= currentTime - lastRenderTime;
  if (aiHurtTimer > 0) aiHurtTimer -= currentTime - lastRenderTime;

  const isCollision = (
    player.x + player.width * 0.8 > ai.x + ai.width * 0.2 &&
    player.x + player.width * 0.2 < ai.x + ai.width * 0.8 &&
    player.y + player.height * 0.8 > ai.y + ai.height * 0.2 &&
    player.y + player.height * 0.2 < ai.y + ai.height * 0.8
  );

  if (!checkGameOver()) {
    updatePlayer();
    drawPlayer();
    updateAI();
    drawAI();
    requestAnimationFrame(animate);
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
        // Continue the next round
        resetGame();
        animate();
      }
    }
  }
  if (e.key === "r") {
    // Restart the entire match
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
