import * as THREE from 'three';

export class Board {
    constructor(scene, size = 60, gridUnits = 30) {
        this.scene = scene;
        this.size = size; // total arena size in 3D world units (-30 to +30)
        this.gridUnits = gridUnits;
        this.bounds = size / 2; // half-width/height limit (e.g. 30)

        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.initLighting();
        this.initFloor();
        this.initWalls();
    }

    initLighting() {
        // Ambient light for general visibility
        const ambientLight = new THREE.AmbientLight(0x0f172a, 1.2);
        this.scene.add(ambientLight);

        // Directional light with shadow mapping
        const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
        dirLight.position.set(20, 50, 30);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 1;
        dirLight.shadow.camera.far = 150;
        const d = this.bounds + 10;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        // Point lights for glowing atmosphere
        const pointLight1 = new THREE.PointLight(0x10b981, 2, 80);
        pointLight1.position.set(-this.bounds / 2, 10, -this.bounds / 2);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xec4899, 2, 80);
        pointLight2.position.set(this.bounds / 2, 10, this.bounds / 2);
        this.scene.add(pointLight2);
    }

    initFloor() {
        // Dark floor plane
        const floorGeo = new THREE.PlaneGeometry(this.size, this.size);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x090d16,
            roughness: 0.3,
            metalness: 0.8
        });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        this.group.add(floorMesh);

        // Grid helper overlay
        const gridHelper = new THREE.GridHelper(this.size, this.gridUnits, 0x38bdf8, 0x1e293b);
        gridHelper.position.y = 0.02; // slightly above floor to prevent z-fighting
        this.group.add(gridHelper);
    }

    initWalls() {
        const wallHeight = 4;
        const wallThickness = 1.0;
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0x0284c7,
            emissiveIntensity: 0.2
        });

        const halfS = this.bounds;

        // Top Wall (+Z)
        const topWall = new THREE.Mesh(new THREE.BoxGeometry(this.size + wallThickness * 2, wallHeight, wallThickness), wallMat);
        topWall.position.set(0, wallHeight / 2, halfS + wallThickness / 2);
        topWall.castShadow = true;
        topWall.receiveShadow = true;
        this.group.add(topWall);

        // Bottom Wall (-Z)
        const botWall = new THREE.Mesh(new THREE.BoxGeometry(this.size + wallThickness * 2, wallHeight, wallThickness), wallMat);
        botWall.position.set(0, wallHeight / 2, -halfS - wallThickness / 2);
        botWall.castShadow = true;
        botWall.receiveShadow = true;
        this.group.add(botWall);

        // Left Wall (-X)
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, this.size), wallMat);
        leftWall.position.set(-halfS - wallThickness / 2, wallHeight / 2, 0);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        this.group.add(leftWall);

        // Right Wall (+X)
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, this.size), wallMat);
        rightWall.position.set(halfS + wallThickness / 2, wallHeight / 2, 0);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        this.group.add(rightWall);

        // Wall neon glowing borders
        const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8 });
        const points = [
            new THREE.Vector3(-halfS, wallHeight, -halfS),
            new THREE.Vector3(halfS, wallHeight, -halfS),
            new THREE.Vector3(halfS, wallHeight, halfS),
            new THREE.Vector3(-halfS, wallHeight, halfS),
            new THREE.Vector3(-halfS, wallHeight, -halfS)
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeo, lineMat);
        this.group.add(line);
    }

    isOutOfBounds(position, margin = 0.5) {
        const limit = this.bounds - margin;
        return (
            Math.abs(position.x) > limit ||
            Math.abs(position.z) > limit
        );
    }
}
