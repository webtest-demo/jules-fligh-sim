import * as THREE from 'three';

export class CameraSystem {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        // Camera Modes
        // 0: Above-and-Behind Elevated Follow Camera (FPS-like top-down over-the-shoulder)
        // 1: Top-Down Arena View
        // 2: Tight Over-the-head First Person
        this.mode = 0;

        // Elevated Follow Camera Offset configuration
        this.followDistance = 12.0; // Distance behind snake head
        this.followHeight = 10.0;   // Height above snake head
        this.lookAhead = 4.0;       // Distance forward ahead of head to target

        // Smooth camera dampening
        this.currentPos = new THREE.Vector3(0, 20, 20);
        this.currentLookAt = new THREE.Vector3(0, 0, 0);

        this.camera.position.copy(this.currentPos);
        this.camera.lookAt(this.currentLookAt);
    }

    toggleMode() {
        this.mode = (this.mode + 1) % 3;
    }

    update(snake, dt) {
        if (!snake || !snake.position) return;

        const targetPos = new THREE.Vector3();
        const targetLookAt = new THREE.Vector3();

        // Snake forward vector and right vector
        const forward = snake.forward.clone().normalize();
        const up = new THREE.Vector3(0, 1, 0);

        if (this.mode === 0) {
            // Elevated Follow Camera (Above character, following heading and position)
            const behindOffset = forward.clone().multiplyScalar(-this.followDistance);
            const heightOffset = up.clone().multiplyScalar(this.followHeight);

            targetPos.copy(snake.position).add(behindOffset).add(heightOffset);
            targetLookAt.copy(snake.position).add(forward.clone().multiplyScalar(this.lookAhead));
        } else if (this.mode === 1) {
            // Top-Down Overview Camera
            targetPos.set(0, 48, 0.1);
            targetLookAt.set(0, 0, 0);
        } else if (this.mode === 2) {
            // Low-angle Over-the-Head Third-Person / FPS
            const behindOffset = forward.clone().multiplyScalar(-5.0);
            const heightOffset = up.clone().multiplyScalar(2.8);

            targetPos.copy(snake.position).add(behindOffset).add(heightOffset);
            targetLookAt.copy(snake.position).add(forward.clone().multiplyScalar(8.0));
        }

        // Smooth interpolation (LERP) for fluid camera motion
        const lerpFactor = Math.min(1.0, dt * 6.0);
        this.currentPos.lerp(targetPos, lerpFactor);
        this.currentLookAt.lerp(targetLookAt, lerpFactor);

        this.camera.position.copy(this.currentPos);
        this.camera.lookAt(this.currentLookAt);
    }
}
