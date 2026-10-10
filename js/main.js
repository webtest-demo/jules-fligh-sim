import * as THREE from 'three';
import { FlightPhysics } from './physics/FlightPhysics.js';
import { AircraftModel } from './graphics/AircraftModel.js';
import { CameraSystem } from './graphics/CameraSystem.js';
import { WorldEnvironment } from './world/WorldEnvironment.js';
import { InstrumentPanel } from './ui/InstrumentPanel.js';

class FlightSimulatorApp {
    constructor() {
        this.container = document.getElementById('canvas-container');

        // Three.js Core Components
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 15000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        window.app = this;

        // Simulation Modules
        this.physics = new FlightPhysics();
        this.aircraft = new AircraftModel();
        this.scene.add(this.aircraft.group);

        this.world = new WorldEnvironment(this.scene);
        this.cameraSystem = new CameraSystem(this.camera, this.renderer.domElement);
        this.instrumentPanel = new InstrumentPanel();

        // Control State Management
        this.keys = {};
        this.clock = new THREE.Clock();

        this.initEventListeners();
        this.animate();
    }

    initEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            // Camera toggle
            if (e.code === 'KeyC') {
                this.cameraSystem.toggleMode();
            }

            // Reset state
            if (e.code === 'KeyR') {
                this.physics.resetState(true);
            }

            // Flaps increment
            if (e.code === 'KeyF') {
                this.physics.controls.flaps = Math.min(1.0, this.physics.controls.flaps + 0.333);
            }
            if (e.code === 'KeyV') {
                this.physics.controls.flaps = Math.max(0.0, this.physics.controls.flaps - 0.333);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    processInputs(dt) {
        // Pitch Control (W / S) - 2x faster rate
        if (this.keys['KeyW']) {
            this.physics.controls.pitch = Math.max(-1.0, this.physics.controls.pitch - dt * 6.0);
        } else if (this.keys['KeyS']) {
            this.physics.controls.pitch = Math.min(1.0, this.physics.controls.pitch + dt * 6.0);
        } else {
            this.physics.controls.pitch *= 0.82; // Return to center
        }

        // Roll Control (A / D) - 2x faster rate
        if (this.keys['KeyA']) {
            this.physics.controls.roll = Math.max(-1.0, this.physics.controls.roll - dt * 6.0);
        } else if (this.keys['KeyD']) {
            this.physics.controls.roll = Math.min(1.0, this.physics.controls.roll + dt * 6.0);
        } else {
            this.physics.controls.roll *= 0.82;
        }

        // Yaw Control (Q / E) - 2x faster rate
        if (this.keys['KeyQ']) {
            this.physics.controls.yaw = Math.max(-1.0, this.physics.controls.yaw - dt * 6.0);
        } else if (this.keys['KeyE']) {
            this.physics.controls.yaw = Math.min(1.0, this.physics.controls.yaw + dt * 6.0);
        } else {
            this.physics.controls.yaw *= 0.82;
        }

        // Throttle Control (Shift / Ctrl)
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
            this.physics.controls.throttle = Math.min(1.0, this.physics.controls.throttle + dt * 0.5);
        }
        if (this.keys['ControlLeft'] || this.keys['ControlRight']) {
            this.physics.controls.throttle = Math.max(0.0, this.physics.controls.throttle - dt * 0.5);
        }

        // Elevator Trim (T / G)
        if (this.keys['KeyT']) {
            this.physics.controls.trim = Math.max(-1.0, this.physics.controls.trim - dt * 0.5);
        }
        if (this.keys['KeyG']) {
            this.physics.controls.trim = Math.min(1.0, this.physics.controls.trim + dt * 0.5);
        }

        // Brakes (B)
        this.physics.controls.brakes = !!this.keys['KeyB'];
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = this.clock.getDelta();

        // Handle Crash UI Overlay
        const crashOverlay = document.getElementById('crash-overlay');
        const crashReasonEl = document.getElementById('crash-reason');
        if (this.physics.isCrashed) {
            if (crashOverlay && crashOverlay.classList.contains('hidden')) {
                crashOverlay.classList.remove('hidden');
                if (crashReasonEl) crashReasonEl.textContent = this.physics.crashReason;
            }
        } else {
            if (crashOverlay && !crashOverlay.classList.contains('hidden')) {
                crashOverlay.classList.add('hidden');
            }
        }

        // 1. Process User Inputs
        this.processInputs(dt);

        // 2. Update Physics Engine with Terrain Lookup
        this.physics.update(dt, (x, z) => this.world.getTerrainHeight(x, z));

        // 3. Update 3D Aircraft Model
        this.aircraft.update(this.physics, dt);

        // 4. Update World Environment
        this.world.update(dt);

        // 5. Update Camera System
        this.cameraSystem.update(this.physics, this.aircraft.group, dt);

        // 6. Update Flight Instrument Gauges & Telemetry
        this.instrumentPanel.update(this.physics);

        // 7. Render 3D Scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Start Simulator on Window Load
window.addEventListener('DOMContentLoaded', () => {
    new FlightSimulatorApp();
});
