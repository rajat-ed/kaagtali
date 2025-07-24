// script.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score-display');
const messageBox = document.getElementById('message-box');
const messageTitle = document.getElementById('message-title');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const backgroundImageElement = document.getElementById('background-image');

// Game settings (native resolution)
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

let gameRunning = false;
let score = 0;
let frames = 0;

// Tweakable background image transparency (0.0 to 1.0)
let backgroundOpacity = 0.3; // Default transparency
backgroundImageElement.style.opacity = backgroundOpacity;

// Kaagtali (Crow) properties
const crow = {
    x: 50,
    y: GAME_HEIGHT / 2,
    width: 40,
    height: 30,
    velocity: 0,
    gravity: 0.45, // Slightly reduced gravity for easier control
    lift: -7.5, // Slightly less lift for finer control
    flapState: 0,
    flapSpeed: 5,

    draw: function() {
        ctx.fillStyle = '#2c3e50'; // Dark color for the crow body
        ctx.strokeStyle = '#1a242f'; // Darker outline

        // Save context state before drawing the crow
        ctx.save();
        // Translate and rotate for a slight tilt when flapping
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.velocity * 0.05); // Tilt based on velocity
        ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));

        // Body
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.arc(this.x + this.width - 5, this.y + 5, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Beak (triangle)
        ctx.fillStyle = '#f39c12'; // Orange for beak
        ctx.beginPath();
        ctx.moveTo(this.x + this.width + 5, this.y + 5);
        ctx.lineTo(this.x + this.width + 15, this.y + 10);
        ctx.lineTo(this.x + this.width + 5, this.y + 15);
        ctx.fill();
        ctx.stroke();

        // Eye (small white circle with black pupil)
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(this.x + this.width - 2, this.y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(this.x + this.width - 1.5, this.y + 8, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Tail (simple triangle)
        ctx.fillStyle = '#2c3e50';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height / 2);
        ctx.lineTo(this.x - 15, this.y + this.height / 2 - 10);
        ctx.lineTo(this.x - 15, this.y + this.height / 2 + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Wings
        ctx.fillStyle = '#34495e'; // Slightly lighter for wings
        ctx.strokeStyle = '#1a242f';

        if (this.flapState === 0) { // Wings up
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
            ctx.lineTo(this.x + this.width / 2 - 20, this.y + this.height / 2 - 20);
            ctx.lineTo(this.x + this.width / 2 + 10, this.y + this.height / 2 - 15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else { // Wings down
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
            ctx.lineTo(this.x + this.width / 2 - 20, this.y + this.height / 2 + 15);
            ctx.lineTo(this.x + this.width / 2 + 10, this.y + this.height / 2 + 20);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Restore context state
        ctx.restore();
    },
    update: function() {
        this.velocity += this.gravity;
        this.y += this.velocity;

        // Animate wings
        if (frames % this.flapSpeed === 0) {
            this.flapState = 1 - this.flapState; // Toggle between 0 and 1
        }

        // Prevent crow from going off top or bottom
        if (this.y + this.height > GAME_HEIGHT) {
            this.y = GAME_HEIGHT - this.height;
            this.velocity = 0;
            gameOver();
        }
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },
    flap: function() {
        this.velocity = this.lift;
        this.flapState = 0; // Ensure wings go up when flapping
    }
};

// Obstacle properties (now with flower petal-like ends)
class Obstacle {
    constructor() {
        this.width = 60; // Width of the obstacle
        this.gap = 200; // Increased gap for slightly easier play
        this.x = GAME_WIDTH;
        this.speed = 3.5; // Slightly increased speed for challenge
        this.scored = false;

        // Random height for the top obstacle
        this.topHeight = Math.floor(Math.random() * (GAME_HEIGHT / 2 - 60)) + 60; // Min 60, Max GAME_HEIGHT/2 - 60, adjusted for gap

        this.bottomY = this.topHeight + this.gap;
        this.bottomHeight = GAME_HEIGHT - this.bottomY;
    }

    drawBlock(ctx, x, y, width, height, isTop) {
        const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
        gradient.addColorStop(0, '#ecf0f1'); // Light silver
        gradient.addColorStop(0.5, '#bdc3c7'); // Mid silver
        gradient.addColorStop(1, '#95a5a6'); // Dark silver
        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#7f8c8d'; // Darker grey for outline
        ctx.lineWidth = 2;

        ctx.beginPath();
        if (isTop) {
            // Top obstacle: curved bottom like a petal
            ctx.moveTo(x, y); // Top-left
            ctx.lineTo(x + width, y); // Top-right
            // Bezier curve for the bottom edge, creating a concave "petal" shape
            ctx.bezierCurveTo(
                x + width * 0.8, y + height * 0.9, // Control point 1 (pulls curve inwards/down)
                x + width * 0.2, y + height * 0.9, // Control point 2 (pulls curve inwards/down)
                x, y + height // Bottom-left
            );
        } else {
            // Bottom obstacle: curved top like a petal
            ctx.moveTo(x, y + height); // Bottom-left
            ctx.lineTo(x + width, y + height); // Bottom-right
            // Bezier curve for the top edge, creating a convex "petal" shape
            ctx.bezierCurveTo(
                x + width * 0.8, y + height * 0.1, // Control point 1 (pulls curve outwards/up)
                x + width * 0.2, y + height * 0.1, // Control point 2 (pulls curve outwards/up)
                x, y // Top-left
            );
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    draw() {
        // Draw top obstacle
        this.drawBlock(ctx, this.x, 0, this.width, this.topHeight, true);

        // Draw bottom obstacle
        this.drawBlock(ctx, this.x, this.bottomY, this.width, this.bottomHeight, false);
    }

    update() {
        this.x -= this.speed;
    }

    offscreen() {
        return this.x + this.width < 0;
    }

    // Collision detection remains AABB for simplicity, as the general bounding box is still rectangular
    hits(bird) {
        // Check collision with top obstacle
        const topObstacleX = this.x;
        const topObstacleY = 0;
        const topObstacleWidth = this.width;
        const topObstacleHeight = this.topHeight;

        // Check collision with bottom obstacle
        const bottomObstacleX = this.x;
        const bottomObstacleY = this.bottomY;
        const bottomObstacleWidth = this.width;
        const bottomObstacleHeight = this.bottomHeight;

        // Simple AABB collision for top obstacle
        if (bird.x < topObstacleX + topObstacleWidth &&
            bird.x + bird.width > topObstacleX &&
            bird.y < topObstacleY + topObstacleHeight &&
            bird.y + bird.height > topObstacleY) {
            return true;
        }

        // Simple AABB collision for bottom obstacle
        if (bird.x < bottomObstacleX + bottomObstacleWidth &&
            bird.x + bird.width > bottomObstacleX &&
            bird.y < bottomObstacleY + bottomObstacleHeight &&
            bird.y + bird.height > bottomObstacleY) {
            return true;
        }

        return false;
    }
}

// Cloud properties
class Cloud {
    constructor(x, y, radiusX, radiusY, speed) {
        this.x = x;
        this.y = y;
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.speed = speed;
    }

    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; // Semi-transparent white
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radiusX, this.radiusY, 0, 0, Math.PI * 2);
        ctx.ellipse(this.x + this.radiusX * 0.8, this.y + this.radiusY * 0.5, this.radiusX * 0.6, this.radiusY * 0.6, 0, 0, Math.PI * 2);
        ctx.ellipse(this.x - this.radiusX * 0.7, this.y + this.radiusY * 0.3, this.radiusX * 0.7, this.radiusY * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x -= this.speed;
    }

    offscreen() {
        return this.x + this.radiusX < 0;
    }
}

let obstacles = [];
let clouds = [];

// Game functions
function startGame() {
    gameRunning = true;
    score = 0;
    frames = 0;
    crow.y = GAME_HEIGHT / 2;
    crow.velocity = 0;
    obstacles = [];
    clouds = []; // Clear clouds on restart
    scoreDisplay.textContent = `Score: ${score}`;
    messageBox.style.display = 'none';
    animate();
}

// Function to draw hills (now green)
function drawHills() {
    ctx.fillStyle = '#6ab04c'; // Green for hills
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT);
    ctx.lineTo(0, GAME_HEIGHT - 80);
    ctx.quadraticCurveTo(GAME_WIDTH * 0.25, GAME_HEIGHT - 120, GAME_WIDTH * 0.5, GAME_HEIGHT - 80);
    ctx.quadraticCurveTo(GAME_WIDTH * 0.75, GAME_HEIGHT - 40, GAME_WIDTH, GAME_HEIGHT - 60);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#4a823e'; // Slightly darker green for another layer
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT);
    ctx.lineTo(0, GAME_HEIGHT - 60);
    ctx.quadraticCurveTo(GAME_WIDTH * 0.3, GAME_HEIGHT - 100, GAME_WIDTH * 0.7, GAME_HEIGHT - 70);
    ctx.quadraticCurveTo(GAME_WIDTH * 0.9, GAME_HEIGHT - 50, GAME_WIDTH, GAME_HEIGHT - 30);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();
}

// Function to draw mountains
function drawMountains() {
    ctx.fillStyle = '#4a5568'; // Even darker grey for mountains
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT - 150);
    ctx.lineTo(GAME_WIDTH * 0.15, GAME_HEIGHT - 250);
    ctx.lineTo(GAME_WIDTH * 0.3, GAME_HEIGHT - 150);
    ctx.lineTo(GAME_WIDTH * 0.45, GAME_HEIGHT - 280);
    ctx.lineTo(GAME_WIDTH * 0.6, GAME_HEIGHT - 160);
    ctx.lineTo(GAME_WIDTH * 0.75, GAME_HEIGHT - 220);
    ctx.lineTo(GAME_WIDTH * 0.9, GAME_HEIGHT - 140);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT - 180);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
    ctx.lineTo(0, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();
}


function gameOver() {
    gameRunning = false;
    messageTitle.textContent = 'Game Over!';
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    messageBox.style.display = 'block';
}

function animate() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT); // Clear canvas

    // Draw mountains (static for now, can be made to scroll slowly)
    drawMountains();
    // Draw hills (static for now, can be made to scroll slowly)
    drawHills();

    frames++;

    // Generate new clouds
    if (frames % 150 === 0) { // Adjust for cloud frequency
        const randomRadiusX = Math.floor(Math.random() * 40) + 50; // 50-90
        const randomRadiusY = Math.floor(Math.random() * 15) + 20; // 20-35
        const randomY = Math.floor(Math.random() * (GAME_HEIGHT / 3)) + 50; // Top third of screen
        const randomSpeed = Math.random() * 0.5 + 0.2; // 0.2 - 0.7
        clouds.push(new Cloud(GAME_WIDTH + randomRadiusX, randomY, randomRadiusX, randomRadiusY, randomSpeed));
    }

    // Update, draw, and remove clouds
    for (let i = clouds.length - 1; i >= 0; i--) {
        const cloud = clouds[i];
        cloud.update();
        cloud.draw();
        if (cloud.offscreen()) {
            clouds.splice(i, 1);
        }
    }

    // Generate new obstacles
    if (frames % 90 === 0) { // Adjust for obstacle frequency
        obstacles.push(new Obstacle());
    }

    // Update and draw crow
    crow.update();
    crow.draw();

    // Update, draw, and remove obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        obstacle.update();
        obstacle.draw();

        // Check for collision
        if (obstacle.hits(crow)) {
            gameOver();
            return; // Stop animation loop immediately
        }

        // Check if crow passed obstacle for scoring
        if (!obstacle.scored && obstacle.x + obstacle.width < crow.x) {
            score++;
            scoreDisplay.textContent = `Score: ${score}`;
            obstacle.scored = true;
        }

        // Remove offscreen obstacles
        if (obstacle.offscreen()) {
            obstacles.splice(i, 1);
        }
    }

    requestAnimationFrame(animate); // Loop the animation
}

// Event listener for flapping (Keyboard and Touch)
document.addEventListener('keydown', handleFlapInput);
document.addEventListener('touchstart', handleFlapInput); // For mobile touch

function handleFlapInput(e) {
    // Check for Spacebar (keyboard) or any touch event
    if ((e.type === 'keydown' && e.code === 'Space') || e.type === 'touchstart') {
        if (gameRunning) {
            crow.flap();
        } else if (messageBox.style.display === 'none') {
            // If game is not running and message box is not displayed (i.e., initial state)
            startGame();
        }
        e.preventDefault(); // Prevent default touch behavior like scrolling
    }
}

// Event listener for restart button
restartButton.addEventListener('click', startGame);

// Initial setup on window load
window.onload = function() {
    // Display initial message to start the game
    messageTitle.textContent = 'Kaagtali';
    finalScoreDisplay.textContent = 'Press Space or Tap to Start'; // Updated message
    restartButton.textContent = 'Start Game';
    messageBox.style.display = 'block';

    // Adjust canvas size for responsiveness
    const adjustCanvasSize = () => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const gameAspectRatio = GAME_WIDTH / GAME_HEIGHT; // 400 / 600 = 0.666...

        let targetCanvasWidth;
        let targetCanvasHeight;

        // Calculate the dimensions that fit the viewport while maintaining aspect ratio
        // and leaving some margin (e.g., 5% of the smaller dimension as padding)
        const marginPercentage = 0.05; // 5% margin on either side/top/bottom

        const availableWidth = viewportWidth * (1 - marginPercentage);
        const availableHeight = viewportHeight * (1 - marginPercentage);

        if (availableWidth / availableHeight > gameAspectRatio) {
            // Viewport is relatively wider, so height is the limiting factor
            targetCanvasHeight = availableHeight;
            targetCanvasWidth = targetCanvasHeight * gameAspectRatio;
        } else {
            // Viewport is relatively taller/narrower, so width is the limiting factor
            targetCanvasWidth = availableWidth;
            targetCanvasHeight = targetCanvasWidth / gameAspectRatio;
        }

        // Ensure the canvas doesn't become larger than its native resolution
        targetCanvasWidth = Math.min(targetCanvasWidth, GAME_WIDTH);
        targetCanvasHeight = Math.min(targetCanvasHeight, GAME_HEIGHT);


        canvas.style.width = `${targetCanvasWidth}px`;
        canvas.style.height = `${targetCanvasHeight}px`;

        backgroundImageElement.style.width = `${targetCanvasWidth}px`;
        backgroundImageElement.style.height = `${targetCanvasHeight}px`;
    };

    adjustCanvasSize();
    window.addEventListener('resize', adjustCanvasSize);
    window.addEventListener('orientationchange', adjustCanvasSize); // Re-adjust on orientation change
};

// Function to set background image opacity (can be called from console for tweaking)
function setBackgroundOpacity(opacity) {
    backgroundOpacity = Math.max(0, Math.min(1, opacity)); // Clamp between 0 and 1
    backgroundImageElement.style.opacity = backgroundOpacity;
}

// Example: To change opacity in console: setBackgroundOpacity(0.5);
