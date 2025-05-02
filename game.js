/**
 * Cyber Flappy - A cyberpunk-themed Flappy Bird clone
 */

// Game Constants
const GRAVITY = 0.5;
const FLAP_POWER = -8;
const PIPE_SPEED = 3;
const PIPE_SPACING = 200;
const PIPE_WIDTH = 80;
const GAP_SIZE = 160;
const PARTICLE_COUNT = 50;
const TRAIL_LENGTH = 8;

// Game Variables
let canvas, ctx;
let ufo;
let pipes = [];
let particles = [];
let trailPoints = [];
let gameActive = false;
let gameOver = false;
let score = 0;
let highScore = 0;
let lastPipeTime = 0;
let soundEnabled = true;

// Sound Effects
const sounds = {
    flap: new Audio('assets/flap.mp3'),
    score: new Audio('assets/score.mp3'),
    crash: new Audio('assets/crash.mp3'),
    background: new Audio('assets/background.mp3')
};

// Try to load from local storage or set default values
try {
    highScore = parseInt(localStorage.getItem('cyberFlappyHighScore')) || 0;
    soundEnabled = localStorage.getItem('cyberFlappySoundEnabled') !== 'false';
} catch (e) {
    console.error('Local storage access error', e);
}

// DOM Elements
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-value');
const finalScoreDisplay = document.getElementById('final-score');
const finalHighScoreDisplay = document.getElementById('final-high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const startButton = document.getElementById('start-button');
const retryButton = document.getElementById('retry-button');
const soundToggle = document.getElementById('sound-toggle');

// Update high score display
highScoreDisplay.textContent = highScore;
finalHighScoreDisplay.textContent = highScore;

// Bird object
class CyberUFO {
    constructor(canvas) {
        this.x = canvas.width / 3;
        this.y = canvas.height / 2;
        this.width = 60;
        this.height = 30;
        this.velocity = 0;
        this.rotation = 0;
        this.color = '#00FFFF';
        this.glowColor = 'rgba(0, 255, 255, 0.7)';
        this.thrusterActive = false;
        this.thrusterTimer = 0;
        this.enginePulse = 0;
        this.strobeLights = [];
        
        // Create strobing lights around the UFO
        for (let i = 0; i < 8; i++) {
            this.strobeLights.push({
                angle: (Math.PI * 2 / 8) * i,
                phase: Math.random() * Math.PI * 2,
                speed: 0.1 + Math.random() * 0.2,
                size: 2 + Math.random() * 3,
                color: Math.random() > 0.5 ? '#FF00FF' : '#00FFFF'
            });
        }
    }

    update() {
        // Apply gravity
        this.velocity += GRAVITY;
        this.y += this.velocity;
        
        // Rotation based on velocity (reduced for UFO)
        this.rotation = Math.min(Math.PI / 8, Math.max(-Math.PI / 8, this.velocity * 0.02));
        
        // Add trail effect
        if (gameActive && !gameOver) {
            trailPoints.unshift({
                x: this.x - 15,
                y: this.y,
                alpha: 1
            });
            
            if (trailPoints.length > TRAIL_LENGTH) {
                trailPoints.pop();
            }
        }
        
        // Update thruster effect
        if (this.thrusterActive) {
            this.thrusterTimer += 1;
            if (this.thrusterTimer > 5) {
                this.thrusterActive = false;
                this.thrusterTimer = 0;
            }
        }
        
        // Update engine pulse
        this.enginePulse += 0.1;
        
        // Update strobe lights
        for (const light of this.strobeLights) {
            light.phase += light.speed;
        }
    }

    flap() {
        this.velocity = FLAP_POWER;
        this.thrusterActive = true;
        
        if (soundEnabled) {
            sounds.flap.currentTime = 0;
            sounds.flap.play().catch(e => console.log('Audio play error:', e));
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Draw trail
        for (let i = 0; i < trailPoints.length; i++) {
            const point = trailPoints[i];
            const alpha = 1 - (i / TRAIL_LENGTH);
            point.alpha = alpha;
            
            ctx.fillStyle = `rgba(0, 255, 255, ${alpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 15 * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Transform context for UFO rotation
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Draw UFO glow - bigger and brighter
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 30;
        
        // Draw outer rim lights (strobing)
        for (const light of this.strobeLights) {
            const brightness = (Math.sin(light.phase) + 1) / 2; // Value between 0 and 1
            ctx.fillStyle = light.color;
            ctx.shadowColor = light.color;
            ctx.shadowBlur = 10 + brightness * 10;
            
            const x = Math.cos(light.angle) * (this.width/2 - 2);
            const y = Math.sin(light.angle) * (this.height/2 - 2);
            
            ctx.beginPath();
            ctx.arc(x, y, light.size * brightness, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw outer glow for the main UFO body
        const glow = ctx.createRadialGradient(0, 0, this.width/2 - 10, 0, 0, this.width/2 + 20);
        glow.addColorStop(0, 'rgba(0, 255, 255, 0)');
        glow.addColorStop(0.5, 'rgba(0, 255, 255, 0.2)');
        glow.addColorStop(1, 'rgba(0, 255, 255, 0)');
        
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width/2 + 20, this.height/2 + 20, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw UFO saucer top (dome) - brighter
        ctx.fillStyle = '#9D20FF';
        ctx.beginPath();
        ctx.ellipse(0, -this.height/4, this.width/3, this.height/3, 0, Math.PI, 0);
        ctx.fill();
        
        // Draw UFO main body (saucer) - brighter
        ctx.fillStyle = '#20FFFF';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width/2, this.height/2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Edge highlight for the saucer
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width/2, this.height/2.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw UFO cockpit window - brighter
        const cockpitGradient = ctx.createRadialGradient(0, -this.height/4, 0, 0, -this.height/4, this.width/4);
        cockpitGradient.addColorStop(0, '#FFFFFF');
        cockpitGradient.addColorStop(0.4, '#FF80FF');
        cockpitGradient.addColorStop(1, '#FF00FF');
        
        ctx.fillStyle = cockpitGradient;
        ctx.beginPath();
        ctx.ellipse(0, -this.height/4, this.width/4, this.height/4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw engine lights with more intensity
        const enginePulse = (Math.sin(this.enginePulse) + 1) / 2; // Value between 0 and 1
        
        // Center row of engine lights
        for (let i = -2; i <= 2; i++) {
            const pulseOffset = Math.abs(i) * 0.2;
            const individualPulse = (Math.sin(this.enginePulse + pulseOffset) + 1) / 2;
            
            ctx.fillStyle = i % 2 === 0 ? 
                `rgba(0, 255, 255, ${0.6 + individualPulse * 0.4})` : 
                `rgba(255, 0, 255, ${0.6 + individualPulse * 0.4})`;
            
            ctx.shadowColor = i % 2 === 0 ? '#00FFFF' : '#FF00FF';
            ctx.shadowBlur = 15 * individualPulse;
            
            ctx.beginPath();
            ctx.arc(i * (this.width/6), this.height/3, 3 + individualPulse * 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw tractor beam / thruster effect when boosting
        if (this.thrusterActive) {
            const gradient = ctx.createRadialGradient(0, this.height/3, 0, 0, this.height/3, this.height * 2);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
            gradient.addColorStop(0.2, 'rgba(0, 255, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(125, 0, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(-this.width/3, this.height/3);
            ctx.lineTo(this.width/3, this.height/3);
            ctx.lineTo(this.width/1.5, this.height * 2);
            ctx.lineTo(-this.width/1.5, this.height * 2);
            ctx.closePath();
            ctx.fill();
            
            // Add pulsing rings in the thruster beam
            const ringCount = 3;
            const ringSpacing = this.height * 1.5 / ringCount;
            const ringPhase = Date.now() / 200;
            
            ctx.strokeStyle = '#FFFFFF';
            
            for (let i = 0; i < ringCount; i++) {
                const yOffset = (i * ringSpacing + (ringPhase % ringSpacing)) + this.height/3;
                const ringWidth = this.width/3 + (yOffset - this.height/3) * 0.5;
                const alpha = 1 - (yOffset / (this.height * 2));
                
                ctx.globalAlpha = alpha * 0.8;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(0, yOffset, ringWidth, ringWidth/4, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.globalAlpha = 1;
        }
        
        ctx.restore();
    }

    checkCollision(pipes, canvas) {
        // Check if UFO hits the ground or ceiling
        if (this.y + this.height / 2 > canvas.height || this.y - this.height / 2 < 0) {
            return true;
        }
        
        // Check collision with pipes
        for (const pipe of pipes) {
            // Adjusted collision detection for larger UFO
            // Use a slightly smaller hitbox than visual size for better gameplay
            const hitboxWidth = this.width * 0.8;
            const hitboxHeight = this.height * 0.7;
            
            if (
                this.x + hitboxWidth / 3 > pipe.x &&
                this.x - hitboxWidth / 3 < pipe.x + PIPE_WIDTH
            ) {
                if (
                    (pipe.position === 'top' && this.y - hitboxHeight / 3 < pipe.height) ||
                    (pipe.position === 'bottom' && this.y + hitboxHeight / 3 > pipe.y)
                ) {
                    return true;
                }
            }
        }
        
        return false;
    }
}

// Pipe object
class CyberPipe {
    constructor(canvas, position, height) {
        this.x = canvas.width;
        this.position = position; // 'top' or 'bottom'
        this.height = height;
        this.scored = false;
        
        if (position === 'bottom') {
            this.y = canvas.height - height;
        }
        
        // Visual properties
        this.baseColor = '#00FFFF';
        this.glowColor = 'rgba(0, 255, 255, 0.5)';
        this.energyPulseOffset = Math.random() * Math.PI * 2; // Random starting phase
        this.energyPulseSpeed = 0.05 + Math.random() * 0.05;
    }

    update() {
        this.x -= PIPE_SPEED;
        this.energyPulseOffset += this.energyPulseSpeed;
    }

    draw(ctx) {
        ctx.save();
        
        // Add glow effect
        ctx.shadowColor = this.glowColor;
        ctx.shadowBlur = 10;
        
        // Draw the pipe structure
        ctx.fillStyle = this.baseColor;
        
        if (this.position === 'top') {
            ctx.fillRect(this.x, 0, PIPE_WIDTH, this.height);
            
            // Draw end cap
            ctx.fillRect(this.x - 10, this.height - 20, PIPE_WIDTH + 20, 20);
        } else {
            ctx.fillRect(this.x, this.y, PIPE_WIDTH, this.height);
            
            // Draw end cap
            ctx.fillRect(this.x - 10, this.y, PIPE_WIDTH + 20, 20);
        }
        
        // Draw energy pulse effect inside the pipe
        const energyHeight = Math.sin(this.energyPulseOffset) * 0.5 + 0.5; // Value between 0 and 1
        
        if (this.position === 'top') {
            const gradientHeight = this.height * 0.8;
            const gradient = ctx.createLinearGradient(0, 0, 0, gradientHeight);
            gradient.addColorStop(0, 'rgba(255, 0, 255, 0.8)');
            gradient.addColorStop(energyHeight, 'rgba(255, 0, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x + 10, 10, PIPE_WIDTH - 20, gradientHeight);
        } else {
            const gradientHeight = this.height * 0.8;
            const gradient = ctx.createLinearGradient(0, this.y + this.height, 0, this.y + this.height - gradientHeight);
            gradient.addColorStop(0, 'rgba(255, 0, 255, 0.8)');
            gradient.addColorStop(energyHeight, 'rgba(255, 0, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(this.x + 10, this.y + 20, PIPE_WIDTH - 20, gradientHeight);
        }
        
        ctx.restore();
    }
}

// Enhance Particle class for better explosions
class Particle {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        // Different types of particles for the explosion
        if (type === 'debris') {
            // Metallic debris
            this.size = Math.random() * 8 + 3;
            this.speedX = Math.random() * 12 - 6;
            this.speedY = Math.random() * 12 - 6;
            this.color = Math.random() > 0.5 ? '#BBBBBB' : '#888888';
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.2;
            this.alpha = 1;
            this.decay = Math.random() * 0.01 + 0.005;
            this.gravity = 0.1;
        } else if (type === 'spark') {
            // Bright sparks
            this.size = Math.random() * 3 + 1;
            this.speedX = Math.random() * 15 - 7.5;
            this.speedY = Math.random() * 15 - 7.5;
            this.color = Math.random() > 0.5 ? '#FFFFFF' : '#FFFF00';
            this.alpha = 1;
            this.decay = Math.random() * 0.04 + 0.02;
        } else if (type === 'fire') {
            // Fire particles
            this.size = Math.random() * 15 + 8;
            this.speedX = (Math.random() - 0.5) * 6;
            this.speedY = (Math.random() - 0.5) * 6;
            
            const r = Math.floor(Math.random() * 55) + 200;
            const g = Math.floor(Math.random() * 155);
            const b = Math.floor(Math.random() * 50);
            this.color = `rgb(${r}, ${g}, ${b})`;
            
            this.alpha = Math.random() * 0.5 + 0.5;
            this.decay = Math.random() * 0.03 + 0.015;
            this.expandRate = Math.random() * 0.1 + 0.05;
        } else {
            // Normal particle (energy/light)
            this.size = Math.random() * 10 + 5;
            this.speedX = Math.random() * 10 - 5;
            this.speedY = Math.random() * 10 - 5;
            this.color = Math.random() > 0.7 ? '#FF00FF' : (Math.random() > 0.5 ? '#00FFFF' : '#FFFFFF');
            this.alpha = 1;
            this.decay = Math.random() * 0.02 + 0.01;
        }
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha -= this.decay;
        
        if (this.type === 'debris') {
            // Apply gravity and rotation to debris
            this.speedY += this.gravity;
            this.rotation += this.rotationSpeed;
            // Slow down over time
            this.speedX *= 0.98;
            this.speedY *= 0.98;
        } else if (this.type === 'fire') {
            // Expand fire particles as they fade
            this.size += this.expandRate;
            this.speedX *= 0.95;
            this.speedY *= 0.95;
        } else if (this.type === 'spark') {
            // Sparks get smaller quickly
            this.size -= this.decay * 10;
        } else {
            // Normal particles also get smaller
            this.size -= this.decay * 5;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.type === 'debris') {
            // Draw metallic debris as rotating rectangles
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            ctx.fillStyle = this.color;
            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 2;
            ctx.fillRect(-this.size/2, -this.size/3, this.size, this.size/1.5);
            
        } else if (this.type === 'fire') {
            // Draw fire particles as gradient circles
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            gradient.addColorStop(0, 'rgba(255, 255, 200, ' + this.alpha + ')');
            gradient.addColorStop(0.4, this.color.replace('rgb', 'rgba').replace(')', ', ' + this.alpha + ')'));
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (this.type === 'spark') {
            // Draw sparks as bright dots with motion blur
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0, this.size), 0, Math.PI * 2);
            ctx.fill();
            
            // Add motion streak
            ctx.globalAlpha = this.alpha * 0.5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.speedX * 2, this.y - this.speedY * 2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size / 2;
            ctx.stroke();
            
        } else {
            // Normal glowing particles
            ctx.fillStyle = this.color;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0, this.size), 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Background class for visual effects
class CyberBackground {
    constructor(canvas) {
        this.canvas = canvas;
        this.cityscape = [];
        this.stars = [];
        this.generateCityscape();
        this.generateStars();
    }

    generateCityscape() {
        const buildingCount = Math.floor(this.canvas.width / 50);
        
        for (let i = 0; i < buildingCount; i++) {
            const width = Math.random() * 60 + 40;
            const height = Math.random() * 150 + 50;
            const x = i * (this.canvas.width / buildingCount);
            
            this.cityscape.push({
                x,
                y: this.canvas.height - height,
                width,
                height,
                color: Math.random() > 0.7 ? '#7D00FF' : '#001a33',
                windows: Math.floor(Math.random() * 5) + 2
            });
        }
    }

    generateStars() {
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * (this.canvas.height / 2),
                size: Math.random() * 2 + 1,
                alpha: Math.random() * 0.8 + 0.2,
                pulse: Math.random() * Math.PI
            });
        }
    }

    update() {
        // Move cityscape buildings
        for (const building of this.cityscape) {
            building.x -= 0.2;
            
            if (building.x + building.width < 0) {
                building.x = this.canvas.width;
                building.height = Math.random() * 150 + 50;
                building.y = this.canvas.height - building.height;
                building.width = Math.random() * 60 + 40;
                building.color = Math.random() > 0.7 ? '#7D00FF' : '#001a33';
                building.windows = Math.floor(Math.random() * 5) + 2;
            }
        }
        
        // Animate stars
        for (const star of this.stars) {
            star.pulse += 0.02;
            star.alpha = 0.5 + Math.sin(star.pulse) * 0.3;
        }
    }

    draw(ctx) {
        // Draw night sky gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.5, '#0a001a');
        gradient.addColorStop(1, '#1a0033');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars
        for (const star of this.stars) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 5;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        
        // Draw cityscape
        for (const building of this.cityscape) {
            ctx.save();
            
            // Building
            ctx.fillStyle = building.color;
            ctx.fillRect(building.x, building.y, building.width, building.height);
            
            // Windows
            const windowWidth = building.width * 0.6 / building.windows;
            const windowMargin = building.width * 0.2 / (building.windows - 1);
            const windowHeight = 10;
            const rows = Math.floor(building.height / 20);
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < building.windows; col++) {
                    const windowX = building.x + (building.width * 0.2) + col * (windowWidth + windowMargin);
                    const windowY = building.y + 10 + row * 20;
                    
                    // Random lit windows
                    if (Math.random() > 0.4) {
                        ctx.fillStyle = Math.random() > 0.7 ? '#00FFFF' : '#FF00FF';
                        ctx.fillRect(windowX, windowY, windowWidth, windowHeight);
                    }
                }
            }
            
            ctx.restore();
        }
        
        // Draw grid effect on ground
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        
        const gridSize = 50;
        const horizontalLines = Math.floor(this.canvas.height / 4 / gridSize);
        
        for (let i = 0; i <= horizontalLines; i++) {
            const y = this.canvas.height - i * gridSize;
            
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        
        const verticalLines = Math.floor(this.canvas.width / gridSize);
        
        for (let i = 0; i <= verticalLines; i++) {
            let x = i * gridSize;
            x = x - (Date.now() / 100 % gridSize);
            
            ctx.beginPath();
            ctx.moveTo(x, this.canvas.height);
            ctx.lineTo(x, this.canvas.height - horizontalLines * gridSize);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// Game initialization
function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas dimensions to match container
    resizeCanvas();
    
    // Initialize UFO
    ufo = new CyberUFO(canvas);
    
    // Initialize background
    background = new CyberBackground(canvas);
    
    // Add event listeners
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('click', handleClick);
    startButton.addEventListener('click', startGame);
    retryButton.addEventListener('click', resetGame);
    soundToggle.addEventListener('click', toggleSound);
    
    // Set initial high score display
    updateHighScore();
    
    // Start the animation loop
    animationLoop();
}

// Resize canvas to match container
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // If we have a background, regenerate it for the new size
    if (typeof background !== 'undefined') {
        background = new CyberBackground(canvas);
    }
}

// Handle keyboard input
function handleKeyDown(e) {
    if (e.code === 'Space') {
        if (!gameActive && !gameOver) {
            startGame();
        } else if (gameActive && !gameOver) {
            activateThrusters();
        } else if (gameOver) {
            resetGame();
        }
    }
}

// Handle mouse/touch input
function handleClick() {
    if (gameActive && !gameOver) {
        activateThrusters();
    }
}

// Toggle sound
function toggleSound() {
    soundEnabled = !soundEnabled;
    
    // Update icon state
    soundToggle.innerHTML = soundEnabled ? 
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M9 18l3-3-3-3v6z" /></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>';
    
    // Save preference to local storage
    try {
        localStorage.setItem('cyberFlappySoundEnabled', soundEnabled);
    } catch (e) {
        console.error('Local storage write error', e);
    }
    
    // Stop or start audio
    if (!soundEnabled) {
        stopAllSounds();
    } else if (gameActive && !gameOver) {
        playBackgroundMusic();
    }
}

// Stop all sounds
function stopAllSounds() {
    for (const sound in sounds) {
        sounds[sound].pause();
        sounds[sound].currentTime = 0;
    }
}

// Play background music
function playBackgroundMusic() {
    if (soundEnabled) {
        sounds.background.loop = true;
        sounds.background.volume = 0.3;
        sounds.background.play().catch(e => console.log('Background music error:', e));
    }
}

// Start the game
function startGame() {
    gameActive = true;
    gameOver = false;
    score = 0;
    pipes = [];
    particles = [];
    trailPoints = [];
    lastPipeTime = 0;
    
    // Hide the start screen
    startScreen.style.display = 'none';
    gameOverScreen.classList.remove('active');
    
    // Reset UFO position
    ufo = new CyberUFO(canvas);
    
    // Update score display
    updateScore();
    
    // Play background music
    playBackgroundMusic();
}

// Reset game after game over
function resetGame() {
    // Hide game over screen
    gameOverScreen.classList.remove('active');
    
    // Start a new game
    startGame();
}

// Game over
function handleGameOver() {
    gameOver = true;
    gameActive = false;
    
    // Play crash sound
    if (soundEnabled) {
        sounds.crash.play().catch(e => console.log('Audio play error:', e));
        sounds.background.pause();
        sounds.background.currentTime = 0;
    }
    
    // Create explosion effect
    createExplosion(ufo.x, ufo.y);
    
    // Update high score if needed
    if (score > highScore) {
        highScore = score;
        try {
            localStorage.setItem('cyberFlappyHighScore', highScore);
        } catch (e) {
            console.error('Local storage write error', e);
        }
    }
    
    // Update final score displays
    finalScoreDisplay.textContent = score;
    finalHighScoreDisplay.textContent = highScore;
    
    // Show game over screen after a short delay
    setTimeout(() => {
        gameOverScreen.classList.add('active');
    }, 1000);
}

// Create enhanced explosion effect
function createExplosion(x, y) {
    // Initial shockwave particles
    for (let i = 0; i < PARTICLE_COUNT * 1.5; i++) {
        particles.push(new Particle(x, y));
    }
    
    // Add debris particles
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, 'debris'));
    }
    
    // Add fire particles
    for (let i = 0; i < 25; i++) {
        particles.push(new Particle(x, y, 'fire'));
    }
    
    // Add spark particles
    for (let i = 0; i < 30; i++) {
        particles.push(new Particle(x, y, 'spark'));
    }
    
    // Add screen shake effect
    addScreenShake();
}

// Add screen shake function
function addScreenShake() {
    const gameContainer = document.getElementById('game-container');
    gameContainer.classList.add('screen-shake');
    
    setTimeout(() => {
        gameContainer.classList.remove('screen-shake');
    }, 500);
}

// Generate new pipes
function generatePipes() {
    const currentTime = Date.now();
    
    if (currentTime - lastPipeTime > PIPE_SPACING * 10) {
        const gapPosition = Math.random() * (canvas.height - GAP_SIZE - 100) + 50;
        
        // Top pipe
        pipes.push(new CyberPipe(canvas, 'top', gapPosition));
        
        // Bottom pipe
        pipes.push(new CyberPipe(canvas, 'bottom', canvas.height - gapPosition - GAP_SIZE));
        
        lastPipeTime = currentTime;
    }
}

// Update score
function updateScore() {
    scoreDisplay.textContent = score;
}

// Update high score display
function updateHighScore() {
    highScoreDisplay.textContent = highScore;
}

// Main animation loop
function animationLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    background.update();
    background.draw(ctx);
    
    // Add scanline effect
    if (!document.querySelector('.scanline')) {
        const scanline = document.createElement('div');
        scanline.className = 'scanline';
        document.getElementById('game-container').appendChild(scanline);
    }
    
    if (gameActive) {
        // Generate new pipes if needed
        generatePipes();
        
        // Update and draw pipes
        pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > 0);
        
        for (const pipe of pipes) {
            pipe.update();
            pipe.draw(ctx);
            
            // Check for score
            if (!pipe.scored && pipe.position === 'top' && pipe.x + PIPE_WIDTH < ufo.x) {
                pipe.scored = true;
                score += 0.5; // Count 0.5 per pipe (1 per pair)
                updateScore();
                
                // Play score sound
                if (Number.isInteger(score) && soundEnabled) {
                    sounds.score.currentTime = 0;
                    sounds.score.play().catch(e => console.log('Audio play error:', e));
                }
            }
        }
        
        // Update and draw UFO
        ufo.update();
        ufo.draw(ctx);
        
        // Check for collisions
        if (ufo.checkCollision(pipes, canvas)) {
            handleGameOver();
        }
    } else if (!gameOver) {
        // Draw UFO on start screen
        ufo.y = canvas.height / 2 + Math.sin(Date.now() / 500) * 20;
        ufo.draw(ctx);
    }
    
    // Update and draw particles
    particles = particles.filter(particle => particle.alpha > 0);
    
    for (const particle of particles) {
        particle.update();
        particle.draw(ctx);
    }
    
    // Continue animation loop
    requestAnimationFrame(animationLoop);
}

// Set up sound files to avoid loading issues
for (const sound in sounds) {
    sounds[sound].load();
}

// Initialize game when the page loads
window.addEventListener('load', init);

// Rename the function for consistency
function activateThrusters() {
    if (gameActive && !gameOver) {
        ufo.flap();
    }
} 