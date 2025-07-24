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
    gravity: 0.4, // Further reduced gravity for smoother control
    lift: -7, // Slightly less lift for finer control
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

// Cloud class is no longer used for drawing, and its generation/update logic is removed.
// It remains here as a placeholder if you wish to re-introduce clouds later.
class Cloud {
    constructor(x, y, radiusX, radiusY, speed) {
        this.x = x;
        this.y = y;
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.speed = speed;
    }

    draw() {
        // This method is intentionally left empty as clouds are no longer drawn on canvas
    }

    update() {
        this.x -= this.speed;
    }

    offscreen() {
        return this.x + this.radiusX < 0;
    }
}

let obstacles = [];
let clouds = []; // This array will remain empty as clouds are no longer generated

// Game functions
function startGame() {
    gameRunning = true;
    score = 0;
    frames = 0;
    crow.y = GAME_HEIGHT / 2;
    crow.velocity = 0;
    obstacles = [];
    clouds = []; // Ensure clouds array is cleared, though it won't be populated
    scoreDisplay.textContent = `Score: ${score}`;
    messageBox.style.display = 'none';
    animate();
}

// Functions to draw hills and mountains are removed as background is now an image
function gameOver() {
    gameRunning = false;
    messageTitle.textContent = 'Game Over!';
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    messageBox.style.display = 'block';
}

function animate() {
    if (!gameRunning) return;

    // The canvas background is now transparent, and the image handles the visual background.
    // No need to clear the canvas or draw static background elements like hills/mountains/clouds here.

    frames++;

    // Cloud generation and update logic removed
    // for (let i = clouds.length - 1; i >= 0; i--) {
    //     const cloud = clouds[i];
    //     cloud.update();
    //     if (cloud.offscreen()) {
    //         clouds.splice(i, 1);
    //     }
    // }

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

        // Make background image cover the canvas exactly
        backgroundImageElement.style.width = `${targetCanvasWidth}px`;
        backgroundImageElement.style.height = `${targetCanvasHeight}px`;
        // Position the background image precisely over the canvas
        const canvasRect = canvas.getBoundingClientRect();
        backgroundImageElement.style.left = `${canvasRect.left}px`;
        backgroundImageElement.style.top = `${canvasRect.top}px`;
        backgroundImageElement.style.position = 'absolute'; // Ensure it's positioned absolutely
        backgroundImageElement.style.zIndex = '1'; // Ensure it's behind the canvas (canvas z-index 2)
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
