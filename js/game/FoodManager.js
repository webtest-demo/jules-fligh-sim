import * as THREE from 'three';

export class FoodManager {
    constructor(scene, boardBounds = 28) {
        this.scene = scene;
        this.boardBounds = boardBounds;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.foods = [];
        this.time = 0;

        // Particle system for food collection effects
        this.particles = [];
        this.particleGroup = new THREE.Group();
        this.scene.add(this.particleGroup);

        this.spawnFoodCount = 3; // Maintain 3 active food items
        this.init();
    }

    init() {
        this.reset();
    }

    reset() {
        // Clear food objects
        this.foods.forEach(food => {
            this.group.remove(food.mesh);
            food.mesh.geometry.dispose();
        });
        this.foods = [];

        // Spawn initial set
        for (let i = 0; i < this.spawnFoodCount; i++) {
            this.spawnFood();
        }
    }

    createAppleMesh() {
        const appleGroup = new THREE.Group();

        // Apple body
        const bodyGeo = new THREE.SphereGeometry(0.7, 16, 16);
        bodyGeo.scale(1.0, 0.95, 1.0);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xef4444, // Red
            roughness: 0.2,
            metalness: 0.1,
            emissive: 0xd97706,
            emissiveIntensity: 0.3
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        appleGroup.add(bodyMesh);

        // Stem
        const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
        const stemMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(0, 0.7, 0);
        stem.rotation.z = -0.15;
        appleGroup.add(stem);

        // Leaf
        const leafGeo = new THREE.SphereGeometry(0.18, 8, 8);
        leafGeo.scale(1.5, 0.2, 0.6);
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e });
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(0.15, 0.72, 0);
        appleGroup.add(leaf);

        // Point light glow
        const light = new THREE.PointLight(0xef4444, 1.5, 8);
        light.position.set(0, 0, 0);
        appleGroup.add(light);

        return appleGroup;
    }

    createGemMesh() {
        const gemGroup = new THREE.Group();

        const gemGeo = new THREE.OctahedronGeometry(0.6, 0);
        const gemMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            roughness: 0.1,
            metalness: 0.8,
            emissive: 0x0284c7,
            emissiveIntensity: 0.6
        });
        const gemMesh = new THREE.Mesh(gemGeo, gemMat);
        gemMesh.castShadow = true;
        gemGroup.add(gemMesh);

        const light = new THREE.PointLight(0x38bdf8, 2, 8);
        gemGroup.add(light);

        return gemGroup;
    }

    spawnFood() {
        const isGem = Math.random() < 0.3; // 30% chance for gem
        const mesh = isGem ? this.createGemMesh() : this.createAppleMesh();

        // Random location on board
        const margin = 2.0;
        const x = (Math.random() * 2 - 1) * (this.boardBounds - margin);
        const z = (Math.random() * 2 - 1) * (this.boardBounds - margin);
        const y = 0.8;

        mesh.position.set(x, y, z);
        this.group.add(mesh);

        this.foods.push({
            mesh: mesh,
            type: isGem ? 'gem' : 'apple',
            points: isGem ? 30 : 10,
            baseY: y,
            rotSpeed: 1.5 + Math.random()
        });
    }

    update(dt) {
        this.time += dt;

        // Animate food bobbing and rotation
        this.foods.forEach(food => {
            food.mesh.rotation.y += food.rotSpeed * dt;
            food.mesh.position.y = food.baseY + Math.sin(this.time * 3 + food.mesh.position.x) * 0.25;
        });

        // Update particle effects
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.mesh.position.addScaledVector(p.velocity, dt);
            p.life -= dt;
            p.mesh.scale.multiplyScalar(0.95);

            if (p.life <= 0) {
                this.particleGroup.remove(p.mesh);
                p.mesh.geometry.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    checkCollisions(snakePosition, snakeRadius = 0.8) {
        let eatenPoints = 0;

        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            const dist = snakePosition.distanceTo(food.mesh.position);

            if (dist < snakeRadius + 0.6) {
                eatenPoints += food.points;

                // Trigger particle explosion effect
                this.spawnParticles(food.mesh.position, food.type === 'gem' ? 0x38bdf8 : 0xef4444);

                // Remove eaten food
                this.group.remove(food.mesh);
                this.foods.splice(i, 1);

                // Spawn new replacement food
                this.spawnFood();
            }
        }

        return eatenPoints;
    }

    spawnParticles(pos, colorHex) {
        const particleCount = 15;
        const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const mat = new THREE.MeshBasicMaterial({ color: colorHex });

        for (let i = 0; i < particleCount; i++) {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                Math.random() * 6 + 2,
                (Math.random() - 0.5) * 8
            );

            this.particleGroup.add(mesh);
            this.particles.push({
                mesh: mesh,
                velocity: velocity,
                life: 0.6
            });
        }
    }
}
