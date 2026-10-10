import * as THREE from 'three';

export class Snake {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        // Movement configuration
        this.baseSpeed = 12.0; // units per second
        this.speed = this.baseSpeed;
        this.turnSpeed = 2.8; // radians per second
        this.pitchSpeed = 1.5; // pitch rotation speed
        this.segmentSpacing = 1.2; // distance between consecutive body segments
        this.radius = 0.6;

        // Steering controls
        this.turnInput = 0; // -1 for left, 1 for right
        this.pitchInput = 0; // -1 for pitch down, 1 for pitch up
        this.boost = false;

        // Historical position trail for segment positioning
        this.pathHistory = [];
        this.historyMaxPoints = 500;

        // Meshes
        this.segments = [];
        this.headMesh = null;

        this.reset();
    }

    reset() {
        // Clear existing meshes from group
        while (this.group.children.length > 0) {
            const obj = this.group.children[0];
            this.group.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
        }
        this.segments = [];

        // Snake state
        this.position = new THREE.Vector3(0, this.radius, 0);
        this.rotationY = 0; // Heading angle in radians (0 is looking forward along -Z or +Z)
        this.pitch = 0; // Elevation pitch
        this.forward = new THREE.Vector3(0, 0, -1);

        // Path history
        this.pathHistory = [];
        for (let i = 0; i < 200; i++) {
            this.pathHistory.push({
                pos: this.position.clone().add(new THREE.Vector3(0, 0, i * 0.1)),
                rotY: 0
            });
        }

        // Build Head Mesh
        this.headMesh = this.createHeadMesh();
        this.headMesh.position.copy(this.position);
        this.group.add(this.headMesh);

        // Initial body segments (start with 3 body segments + head = length 4)
        this.length = 3;
        for (let i = 0; i < this.length; i++) {
            this.addSegmentMesh();
        }
    }

    createHeadMesh() {
        const headGroup = new THREE.Group();

        // Main head sphere/capsule
        const headGeo = new THREE.SphereGeometry(this.radius, 32, 32);
        headGeo.scale(1.0, 0.85, 1.2); // Elongated head
        const headMat = new THREE.MeshStandardMaterial({
            color: 0x10b981, // Vibrant emerald green
            roughness: 0.2,
            metalness: 0.3,
            emissive: 0x059669,
            emissiveIntensity: 0.2
        });
        const headMesh = new THREE.Mesh(headGeo, headMat);
        headMesh.castShadow = true;
        headMesh.receiveShadow = true;
        headGroup.add(headMesh);

        // Glowing Eyes
        const eyeGeo = new THREE.SphereGeometry(0.12, 16, 16);
        const eyeMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            emissive: 0x38bdf8,
            emissiveIntensity: 1.0
        });

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
        leftEye.position.set(-0.3, 0.2, -0.45);
        headGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
        rightEye.position.set(0.3, 0.2, -0.45);
        headGroup.add(rightEye);

        // Crown / Crest Accent
        const crestGeo = new THREE.ConeGeometry(0.15, 0.4, 4);
        const crestMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706 });
        const crest = new THREE.Mesh(crestGeo, crestMat);
        crest.rotation.x = -Math.PI / 4;
        crest.position.set(0, 0.5, 0);
        headGroup.add(crest);

        return headGroup;
    }

    addSegmentMesh() {
        const segIndex = this.segments.length;
        const scaleFactor = Math.max(0.6, 1.0 - segIndex * 0.02); // slight taper towards tail

        const segGeo = new THREE.SphereGeometry(this.radius * scaleFactor, 24, 24);

        // Alternate cyan / emerald green pattern
        const color = segIndex % 2 === 0 ? 0x059669 : 0x0284c7;
        const segMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.3,
            metalness: 0.4,
            emissive: color,
            emissiveIntensity: 0.1
        });

        const mesh = new THREE.Mesh(segGeo, segMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        this.segments.push(mesh);
        this.group.add(mesh);
    }

    grow(amount = 1) {
        for (let i = 0; i < amount; i++) {
            this.length++;
            this.addSegmentMesh();
        }
    }

    setInputs(turn, pitch, boost) {
        this.turnInput = turn;
        this.pitchInput = pitch;
        this.boost = boost;
    }

    update(dt) {
        // Boost multiplier
        this.speed = this.boost ? this.baseSpeed * 1.6 : this.baseSpeed;

        // Yaw Turn
        this.rotationY -= this.turnInput * this.turnSpeed * dt;

        // Pitch (slightly elevate / dip head for 3D feel)
        this.pitch += this.pitchInput * this.pitchSpeed * dt;
        this.pitch = Math.max(-0.4, Math.min(0.4, this.pitch));
        // Pitch auto-centers when no input
        if (this.pitchInput === 0) {
            this.pitch *= 0.9;
        }

        // Calculate forward direction vector
        this.forward.set(
            Math.sin(this.rotationY) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.rotationY) * Math.cos(this.pitch)
        ).normalize();

        // Advance head position
        const moveDist = this.speed * dt;
        this.position.addScaledVector(this.forward, moveDist);

        // Lock Y near floor level (ground snake)
        if (this.position.y < this.radius) {
            this.position.y = this.radius;
        } else if (this.position.y > 5.0) {
            this.position.y = 5.0;
        }

        // Update head mesh transform
        this.headMesh.position.copy(this.position);
        this.headMesh.rotation.set(0, 0, 0);
        this.headMesh.rotation.y = this.rotationY;
        this.headMesh.rotation.x = this.pitch;

        // Record history point
        this.pathHistory.unshift({
            pos: this.position.clone(),
            rotY: this.rotationY
        });

        if (this.pathHistory.length > this.historyMaxPoints) {
            this.pathHistory.pop();
        }

        // Position body segments along recorded history path
        this.updateSegments();
    }

    updateSegments() {
        let accumulatedDist = 0;
        let historyIdx = 0;

        for (let i = 0; i < this.segments.length; i++) {
            const targetDist = (i + 1) * this.segmentSpacing;

            while (historyIdx < this.pathHistory.length - 1) {
                const p1 = this.pathHistory[historyIdx].pos;
                const p2 = this.pathHistory[historyIdx + 1].pos;
                const stepDist = p1.distanceTo(p2);

                if (accumulatedDist + stepDist >= targetDist) {
                    const alpha = (targetDist - accumulatedDist) / (stepDist || 0.001);
                    const pos = new THREE.Vector3().lerpVectors(p1, p2, alpha);
                    this.segments[i].position.copy(pos);
                    break;
                }

                accumulatedDist += stepDist;
                historyIdx++;
            }

            // Fallback if history ends
            if (historyIdx >= this.pathHistory.length - 1) {
                this.segments[i].position.copy(this.pathHistory[this.pathHistory.length - 1].pos);
            }
        }
    }

    checkSelfCollision() {
        // Skip first few segments near head to prevent self-triggering
        const minSegIndex = 4;
        const headRadius = this.radius * 0.8;

        for (let i = minSegIndex; i < this.segments.length; i++) {
            const segPos = this.segments[i].position;
            const dist = this.position.distanceTo(segPos);
            if (dist < headRadius + this.radius * 0.7) {
                return true;
            }
        }
        return false;
    }
}
