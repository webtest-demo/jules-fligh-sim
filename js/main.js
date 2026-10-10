import * as THREE from 'three';
import { Board } from './game/Board.js';
import { Snake } from './game/Snake.js';
import { FoodManager } from './game/FoodManager.js';
import { CameraSystem } from './graphics/CameraSystem.js';

class SnakeGame3DApp {
    constructor() {
        this.container = document.getElementById('canvas-container');

        // Game State
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('snake3d_highscore') || '0', 10);
        this.isGameOver = false;
        this.isPaused = false;

        // Three.js Core Components
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050811);
        this.scene.fog = new THREE.FogExp2(0x050811, 0.012);

        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        window.app = this;

        // Game Modules
        this.board = new Board(this.scene, 60, 30);
        this.snake = new Snake(this.scene);
        this.foodManager = new FoodManager(this.scene, this.board.bounds);
        this.cameraSystem = new CameraSystem(this.camera, this.renderer.domElement);

        // Input & Clock
        this.keys = {};
        this.clock = new THREE.Clock();

        this.initUI();
        this.initEventListeners();
        this.updateHUD();

        this.animate();
    }

    initUI() {
        this.scoreEl = document.getElementById('val-score');
        this.lengthEl = document.getElementById('val-length');
        this.highscoreEl = document.getElementById('val-highscore');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.gameOverReasonEl = document.getElementById('game-over-reason');
        this.finalScoreEl = document.getElementById('final-score');
        this.finalHighscoreEl = document.getElementById('final-highscore');
        this.restartBtn = document.getElementById('restart-btn');

        if (this.restartBtn) {
            this.restartBtn.addEventListener('click', () => this.restartGame());
        }
    }

    initEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Camera toggle
            if (e.code === 'KeyC') {
                this.cameraSystem.toggleMode();
            }

            // Pause toggle
            if (e.code === 'KeyP' && !this.isGameOver) {
                this.isPaused = !this.isPaused;
                if (this.pauseOverlay) {
                    this.pauseOverlay.classList.toggle('hidden', !this.isPaused);
                }
            }

            // Reset / Restart
            if (e.code === 'KeyR') {
                this.restartGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    restartGame() {
        this.score = 0;
        this.isGameOver = false;
        this.isPaused = false;

        if (this.gameOverOverlay) this.gameOverOverlay.classList.add('hidden');
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');

        this.snake.reset();
        this.foodManager.reset();
        this.updateHUD();
    }

    processInputs() {
        let turn = 0;
        let pitch = 0;

        if (this.keys['KeyA'] || this.keys['ArrowLeft']) turn += 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) turn -= 1;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) pitch += 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) pitch -= 1;

        const boost = !!this.keys['Space'];

        this.snake.setInputs(turn, pitch, boost);
    }

    triggerGameOver(reason) {
        this.isGameOver = true;
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snake3d_highscore', this.highScore.toString());
        }

        if (this.gameOverReasonEl) this.gameOverReasonEl.textContent = reason;
        if (this.finalScoreEl) this.finalScoreEl.textContent = this.score.toString();
        if (this.finalHighscoreEl) this.finalHighscoreEl.textContent = this.highScore.toString();
        if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('hidden');

        this.updateHUD();
    }

    updateHUD() {
        if (this.scoreEl) this.scoreEl.textContent = this.score.toString();
        if (this.lengthEl) this.lengthEl.textContent = (this.snake ? this.snake.length + 1 : 4).toString();
        if (this.highscoreEl) this.highscoreEl.textContent = this.highScore.toString();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = Math.min(this.clock.getDelta(), 0.1);

        if (!this.isGameOver && !this.isPaused) {
            // 1. Process User Controls
            this.processInputs();

            // 2. Update Snake Logic & Physics
            this.snake.update(dt);

            // 3. Update Food Manager
            this.foodManager.update(dt);

            // 4. Check Food Collision
            const pointsGained = this.foodManager.checkCollisions(this.snake.position, this.snake.radius);
            if (pointsGained > 0) {
                this.score += pointsGained;
                this.snake.grow(1);
                this.updateHUD();
            }

            // 5. Check Wall Boundary Collision
            if (this.board.isOutOfBounds(this.snake.position, this.snake.radius)) {
                this.triggerGameOver('You crashed into the border wall!');
            }

            // 6. Check Self Body Collision
            if (this.snake.checkSelfCollision()) {
                this.triggerGameOver('You ran into your own body!');
            }
        }

        // 7. Update Camera System
        this.cameraSystem.update(this.snake, dt);

        // 8. Render 3D Scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Start 3D Snake App on DOM Loaded
window.addEventListener('DOMContentLoaded', () => {
    new SnakeGame3DApp();
});
