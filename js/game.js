// Interface Constants (in px)
const canvasWidth = 1000;
const canvasHeight = 540;
const playerWidth = 19;
const playerHeight = 24;
const playerX = 160;
const playerInitialPos = (canvasHeight - playerHeight) / 2;
const fuelBarHeight = 190;
const buildingImg = new Image();
const fuelImg = new Image();
buildingImg.src = "img/building.png";
fuelImg.src = "img/fuel.png";

/*
GAME LOGIC CONSTANTS

The helicoter has a stronger upwards acceleration compared to the downwards gravity force.
Which means: making it go up while it's falling will be faster than letting it fall while going up.
On the other hand, max upwards speed is lower than downwards, so it will make the helicopter "feel" heavy to the player.
*/

const fps = 60; // 60 FPS will get best results
const px2mRatio = 0.1; // How many game "meters" does one pixel represent
const heliAcceleration = -1; // The upwards acceleration constant (px per frame per frame)
const gravity = 1.08; // The downwards acceleration constant (px per frame per frame)
const maxUpSpeed = -6; // px per frame
const maxDownSpeed = 10; // px per frame
const gameStartingSpeed = 8; // px per frame
const gameSpeedIncreaseRatio = 1500; // The less, the faster the game will get on each render

// Game Variables
let ctx;
let highScoreElement; //HTML Element
let scoreElement; // HTML Element
let fuelBar; // HTML Element
let speedElement; // HTML Element
let startButton; // HTML Element
let score; // px travelled in X axis
let highScore = 0;
let fuel; // Percentage
let xSpeed = 1;
let ySpeed = 1.2;
let playerPos = playerInitialPos; //Player Y position
let renderCount = 0; // how many frames have been drawn since game started
let obstacles = []; // Array of obstacles the player interacts with
let gamePaused = false;
let gameEnded = false;
let playerGoingUp = false;

//Link variables to actual DOM elements as soon as the HTML is fully loaded and setup start listener
function setupGame() {
  scoreElement = document.querySelector("#score > span");
  speedElement = document.querySelector("#speed > span");
  highScoreElement = document.getElementById("highScore");
  fuelBar = document.getElementById("fuelAmount");
  startButton = document.getElementById("startGameBtn");
  gameCanvas = document.getElementById("gameCanvas");
  ctx = gameCanvas.getContext("2d");

  startButton.addEventListener("click", startGame);
}

/* GAME OBSTACLES */

function checkColisionWithPlayer(obstacle) {
  return (
    playerX - playerWidth < obstacle[1] + obstacle[3] &&
    playerX + playerWidth > obstacle[1] &&
    playerPos - playerHeight < obstacle[2] + obstacle[4] &&
    playerPos + playerHeight > obstacle[2]
  );
}

function addBuildingObstacle() {
  let buildingHeight = 100 + Math.floor(Math.random() * 250);

  //Create a random greyish-blue or greyish-green color
  let colorBase = 4 + Math.floor(Math.random() * 2); // Red
  let colorBase2 = colorBase + Math.floor(Math.random() * 2); // Green
  let colorBase3 = colorBase + Math.floor(Math.random() * 2); // Blue
  let color = `#${colorBase}${colorBase2}${colorBase3}`; //Put a # before it, so it becomes a color

  obstacles.push([
    1, // Type (0 is fuel, 1 is building, 2 is birds)
    1000, // X
    canvasHeight - buildingHeight, // Y
    120 + Math.floor(Math.random() * 40), // Width
    buildingHeight, // Height,
    color,
  ]);
}

function addBirdObstacle() {
  obstacles.push([
    2, // Type (0 is fuel, 1 is building, 2 is birds)
    1000, // X
    10 + Math.floor(Math.random() * 100), // Y
    30, // Width
    10, // Height
  ]);
}

function addFuelTank() {
  obstacles.push([
    0, // Type (0 is fuel, 1 is building, 2 is birds)
    1000, // X
    120 + Math.floor(Math.random() * 70), // Y
    30, // Width
    40, // Height
  ]);
}

/* GAME EVENT HANDLERS */

function handleInGameKeyDown(e) {
  switch (e.code) {
    case "ArrowUp":
      playerGoingUp = true;
      break;
    case "Space":
      gamePaused = !gamePaused;
      break;
    default:
      break;
  }
}

function handleInGameKeyUp(e) {
  switch (e.code) {
    case "ArrowUp":
      playerGoingUp = false;
      break;
    default:
      break;
  }
}

/* GAME STATE CONTROLLER FUNCTIONS */

function startGame() {
  startButton.style.display = "none";
  resetGame();

  // Setup game events
  gameCanvas.addEventListener("mousedown", () => (playerGoingUp = true));
  gameCanvas.addEventListener("mouseup", () => (playerGoingUp = false));
  document.addEventListener("keydown", handleInGameKeyDown);
  document.addEventListener("keyup", handleInGameKeyUp);

  // Start game Loop
  loop();
}

function resetGame() {
  //Restore all game variables to their inicial state and update
  fuel = 100;
  score = 0;
  startTime = undefined;
  gamePaused = false;
  playerPos = playerInitialPos;
  gameEnded = false;
  xSpeed = 1;
  ySpeed = 1.2;
  playerGoingUp = false;
  renderCount = 0;
  obstacles = [];
}

function gameOver() {
  gameEnded = true;

  // Remove in-game events
  gameCanvas.removeEventListener("mousedown", () => (playerGoingUp = true));
  gameCanvas.removeEventListener("mouseup", () => (playerGoingUp = false));
  document.removeEventListener("keydown", handleInGameKeyDown);
  document.removeEventListener("keyup", handleInGameKeyUp);

  startButton.innerText = "Play Again";
  startButton.style.display = "block";
}

/* MAIN GAME DRAWING FUNCTION, CALLS OUT ALL OTHER DRAWING FUNCTIONS */

function drawGame() {
  // Clean Previous Draw
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw Canvas Game Elements
  drawPlayer();

  obstacles.forEach((obs) => {
    if (obs[0] === 1) {
      drawBuilding(obs[1], obs[2], obs[3], obs[4], obs[5]);
    } else if (obs[0] === 2) {
      drawBird(obs[1], obs[2], obs[3], obs[4]);
    } else {
      drawFuel(obs[1], obs[2], obs[3], obs[4]);
    }
  });

  // Update non-canvas elements
  updateDisplays();
}

/* ELEMENT DRAWING FUNCTIONS */

function updateDisplays() {
  //Add left as many zeros as necessary so there are always 5 characters + m
  scoreElement.innerText = `0000${parseInt(score)}m`.substr(-6);

  highScoreElement.innerText = `High Score: ${parseInt(highScore)}m`;

  //Add left as many zeros as necessary so there are always 3 characters + m/s
  speedElement.innerText = `00${parseInt(
    xSpeed / px2mRatio // Transform from px to m
  )}m/s`.substr(-6);

  fuelBar.style.height = `${fuelBarHeight - fuel * (fuelBarHeight / 100)}px`;
}

function drawPlayer() {
  //Make helicoter heli appear to rotate by increasing and reducing its size
  var heliWidth = ((renderCount * xSpeed * 2) % 100) + 1; //Multiply by speed so it will rotate faster according to player
  heliWidth = heliWidth > 50 ? heliWidth - 2 * (heliWidth - 50) : heliWidth;
  heliWidth = (heliWidth / 50) * 26; // 26 is the blade size multiplier

  ctx.save();
  ctx.beginPath();

  // Draw rotating blades
  ctx.lineWidth = 3;
  ctx.strokeStyle = "green";
  ctx.fillStyle = "#003333";
  ctx.moveTo(playerX - heliWidth, playerPos - 20);
  ctx.lineTo(playerX + heliWidth, playerPos - 20);
  ctx.stroke();

  // Draw blade middle piece
  ctx.moveTo(playerX, playerPos - 24);
  ctx.lineTo(playerX, playerPos - 12);
  // Draw tail
  ctx.moveTo(playerX, playerPos);
  ctx.lineTo(playerX - 25, playerPos);
  // Draw landing gear
  ctx.moveTo(playerX - 3, playerPos + 7);
  ctx.lineTo(playerX - 3, playerPos + 17);
  ctx.moveTo(playerX + 3, playerPos + 7);
  ctx.lineTo(playerX + 3, playerPos + 17);
  ctx.moveTo(playerX - 8, playerPos + 17);
  ctx.lineTo(playerX + 8, playerPos + 17);

  ctx.stroke();

  // Draw helicopter body
  ctx.moveTo(playerX, playerPos);
  ctx.arc(playerX, playerPos, 12, 0, Math.PI * 2, true);
  ctx.fill();

  //Find out by how much to rotate the tail blades
  var rotationDegree = gameStartingSpeed * xSpeed * ((renderCount % 36) + 1);

  //Save canvas before rotation so I can restore it's regular state later
  ctx.save();
  ctx.translate(playerX - 24, playerPos); // +1px from end of tail to account for the stroke width
  ctx.rotate((rotationDegree * Math.PI) / 180);

  // Draw the tail rotor blade
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(8, 0);
  ctx.stroke();

  // Restore context back to normal state
  ctx.restore();

  ctx.closePath();
  ctx.restore();
}

function drawBuilding(x, y, w, h, c) {
  ctx.save();
  ctx.beginPath();

  ctx.fillStyle = c;
  ctx.rect(x, y, w, h);
  ctx.fill();

  ctx.drawImage(buildingImg, x, y, w, h);

  ctx.closePath();
  ctx.restore();
}

function drawBird(x, y, w, h) {
  ctx.save();
  ctx.beginPath();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#222";

  //Figure out where to draw wings in order to simulate flying
  var wingState = (renderCount % 16) + 1;
  wingState = wingState > 8 ? wingState - 2 * (wingState - 8) : wingState;

  ctx.moveTo(x + w / 2, y + h / 2);
  ctx.lineTo(x, y + h / 2 + 3 * (wingState - 4));
  ctx.moveTo(x + w / 2, y + h / 2);
  ctx.lineTo(x + w, y + h / 2 + 3 * (wingState - 4));

  ctx.stroke();

  ctx.closePath();
  ctx.restore();
}

function drawFuel(x, y, w, h) {
  ctx.save();
  ctx.beginPath();

  ctx.drawImage(fuelImg, x - w / 2, y - h / 2, w, h);

  ctx.closePath();
  ctx.restore();
}

/* MAIN GAME LOOP */

function loop() {
  // Check if game is paused, if not proceed to regular game loop
  if (!gamePaused) {
    // Keep count of how many times the main game loop has run
    renderCount++;

    // Calculate increasing horizontal speed according to how long player has been alive
    xSpeed = gameStartingSpeed + renderCount / gameSpeedIncreaseRatio;

    //Limit helicopter speed to about 115 m/s (396km/h)
    xSpeed = xSpeed / px2mRatio > 115 ? 115 * px2mRatio : xSpeed;

    // Increase score with the distance travelled on this render
    // Divide by the fps and then transform it from px to m
    score += xSpeed / px2mRatio / fps;

    //If score higher than previous high, replace it
    highScore = score > highScore ? score : highScore;

    // Apply acceleration to player current Y Speed
    // Only allow going up if player has fuel
    ySpeed = ySpeed + (playerGoingUp && fuel > 0 ? heliAcceleration : gravity);

    // Limit max Y Speed
    ySpeed = ySpeed < maxUpSpeed ? maxUpSpeed : ySpeed;
    ySpeed = ySpeed > maxDownSpeed ? maxDownSpeed : ySpeed;

    playerPos = playerPos + ySpeed;

    // Reduce fuel if player is pressing up arrow
    if (playerGoingUp) fuel -= 0.1;

    //Check if it's time to introduce elements to the screen
    let shouldAddBuilding =
      renderCount % parseInt(250 / parseInt(xSpeed)) === 0;
    let shouldAddBird = renderCount % parseInt(500 / parseInt(xSpeed)) === 0;
    let shouldAddFuel = renderCount % parseInt(2000 / parseInt(xSpeed)) === 0;

    // Add a new obstacle every few renders
    // A building and a fuel tank will be added as soon as the game starts
    if (shouldAddBuilding || renderCount === 1) addBuildingObstacle();
    if (shouldAddBird) addBirdObstacle();
    if (shouldAddFuel || renderCount === 1) addFuelTank();

    // Move elements, remove them if they are out of screen and detects colision
    var tempObstacles = [];
    obstacles.forEach((obstacle) => {
      //If elements are out of the screen on the left side, remove them. If not, move them left
      //Also remove the fuel element if player has caught it
      if (obstacle[1] > 0 - obstacle[3]) {
        obstacle[1] = obstacle[1] - xSpeed;
        //Check if one of those elements touched the player
        if (checkColisionWithPlayer(obstacle)) {
          if (obstacle[0] === 0) {
            fuel += 20;
            fuel = fuel > 100 ? 100 : fuel; // Limit fuel to 100%
          } else {
            tempObstacles.push(obstacle);
            gameOver();
          }
        } else {
          tempObstacles.push(obstacle);
        }
      }
    });
    obstacles = tempObstacles;

    // Update screen
    drawGame();

    /* 
    DEBUG: Log key values every second
    if (renderCount % fps === 0) {
      console.log({
        renderCount,
        score: score.toFixed(2),
        xSpeed,
        fuel: `${fuel.toFixed(1)}%`,
      });
    }
    */

    // Check if user lost the game, and if so, stop the loop
    if (playerPos > 540 || playerPos < 0) gameOver();
    if (gameEnded) return;
  }

  setTimeout(loop, 1000 / fps);
}
