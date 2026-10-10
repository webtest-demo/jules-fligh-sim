import * as THREE from 'three';

export class WorldEnvironment {
    constructor(scene) {
        this.scene = scene;
        this.clouds = [];
        this.windsockProp = null;

        // Procedural Textures for distance & altitude visual perception
        this.terrainTexture = this.generateTerrainDetailTexture();
        this.runwayTexture = this.generateRunwayAsphaltTexture();

        this.buildLighting();
        this.buildSkyAndSun();
        this.buildMountainTerrain();
        this.buildAirport();
        this.buildClouds();
        this.buildTrees();
        this.buildCows();
    }

    buildLighting() {
        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.7);
        this.scene.add(ambientLight);

        // Directional Sun Light
        this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
        this.sunLight.position.set(1000, 1500, 800);
        this.sunLight.castShadow = true;

        // Shadow quality settings
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 3500;
        const shadowCamDist = 800;
        this.sunLight.shadow.camera.left = -shadowCamDist;
        this.sunLight.shadow.camera.right = shadowCamDist;
        this.sunLight.shadow.camera.top = shadowCamDist;
        this.sunLight.shadow.camera.bottom = -shadowCamDist;

        this.scene.add(this.sunLight);
    }

    buildSkyAndSun() {
        // Atmospheric Fog
        this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.00022);
        this.scene.background = new THREE.Color(0x7dd3fc);

        // Sun Mesh
        const sunGeo = new THREE.SphereGeometry(60, 32, 32);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
        const sunMesh = new THREE.Mesh(sunGeo, sunMat);
        sunMesh.position.set(1200, 1800, 960);
        this.scene.add(sunMesh);
    }

    generateTerrainDetailTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 512, 512);

        // High frequency noise / rock-grass grain texture
        const imgData = ctx.getImageData(0, 0, 512, 512);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            const grain = (Math.random() - 0.5) * 60;
            data[i] = Math.min(255, Math.max(0, 128 + grain));
            data[i + 1] = Math.min(255, Math.max(0, 128 + grain));
            data[i + 2] = Math.min(255, Math.max(0, 128 + grain));
            data[i + 3] = 255;
        }

        ctx.putImageData(imgData, 0, 0);

        // Grid pattern overlay for clear altitude/distance grid cues
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 4;
        const step = 64;
        for (let x = 0; x <= 512; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 512);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, x);
            ctx.lineTo(512, x);
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(120, 120); // Repeated over 12000m terrain
        return texture;
    }

    generateRunwayAsphaltTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#22262d';
        ctx.fillRect(0, 0, 256, 256);

        const imgData = ctx.getImageData(0, 0, 256, 256);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 35;
            data[i] = Math.min(255, Math.max(0, 35 + noise));
            data[i + 1] = Math.min(255, Math.max(0, 38 + noise));
            data[i + 2] = Math.min(255, Math.max(0, 45 + noise));
            data[i + 3] = 255;
        }

        ctx.putImageData(imgData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 120);
        return texture;
    }

    buildMountainTerrain() {
        // High quality terrain with valleys and mountain peaks
        const terrainSize = 12000;
        const segments = 256;
        const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
        terrainGeo.rotateX(-Math.PI / 2);

        const posAttr = terrainGeo.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < posAttr.count; i++) {
            vertex.fromBufferAttribute(posAttr, i);
            const height = this.getProceduralHeight(vertex.x, vertex.z);
            posAttr.setY(i, height);
        }

        terrainGeo.computeVertexNormals();

        // Vertex Coloring for Terrain (Grass valley -> Rocky slopes -> Snow peaks)
        const colors = [];
        const colorGrass = new THREE.Color(0x3f6212);
        const colorRock = new THREE.Color(0x475569);
        const colorSnow = new THREE.Color(0xf8fafc);
        const colorDirt = new THREE.Color(0x78350f);

        for (let i = 0; i < posAttr.count; i++) {
            const h = posAttr.getY(i);

            if (h < 80) {
                // Valley floor grass/dirt blend
                colors.push(colorGrass.r, colorGrass.g, colorGrass.b);
            } else if (h < 350) {
                // Lower mountains / rocky slopes
                const t = (h - 80) / 270;
                const c = colorGrass.clone().lerp(colorRock, t);
                colors.push(c.r, c.g, c.b);
            } else if (h < 650) {
                // High rocky peaks
                const t = (h - 350) / 300;
                const c = colorRock.clone().lerp(colorSnow, t);
                colors.push(c.r, c.g, c.b);
            } else {
                // Snow caps
                colors.push(colorSnow.r, colorSnow.g, colorSnow.b);
            }
        }

        terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const terrainMat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            map: this.terrainTexture,
            roughness: 0.9,
            metalness: 0.1
        });

        const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
        terrainMesh.receiveShadow = true;
        this.scene.add(terrainMesh);
    }

    getProceduralHeight(x, z) {
        // Keep airport valley flat around origin (z: -1800 to +1800, x: -600 to +600)
        const distFromRunwayX = Math.abs(x);
        const distFromRunwayZ = Math.abs(z);

        // Multi-layered sine wave noise for natural mountain terrain
        const nx = x * 0.0005;
        const nz = z * 0.0005;

        let h = Math.sin(nx * 3.5) * Math.cos(nz * 3.5) * 450 +
                Math.sin(nx * 8.0 + 1.2) * Math.cos(nz * 7.0) * 180 +
                Math.sin(nx * 18.0) * Math.cos(nz * 15.0) * 60;

        // Mountain ridge elevation
        const distFromCenter = Math.sqrt(x * x + z * z);
        if (distFromCenter > 1000) {
            h += (distFromCenter - 1000) * 0.25;
        }

        const rawHeight = Math.max(0, h);

        if (distFromRunwayX < 600 && distFromRunwayZ < 1800) {
            const flatFactor = Math.min(1.0, Math.max(0.0, (distFromRunwayX - 250) / 350));
            return rawHeight * flatFactor;
        }

        return rawHeight;
    }

    getTerrainHeight(x, z) {
        return this.getProceduralHeight(x, z);
    }

    buildAirport() {
        const airportGroup = new THREE.Group();

        // 1. Runway Surface (3000m long, 60m wide)
        const runwayGeo = new THREE.PlaneGeometry(60, 3000);
        runwayGeo.rotateX(-Math.PI / 2);
        const runwayMat = new THREE.MeshStandardMaterial({
            map: this.runwayTexture,
            color: 0x1e293b,
            roughness: 0.8
        });
        const runway = new THREE.Mesh(runwayGeo, runwayMat);
        runway.position.set(0, 0.1, 0);
        runway.receiveShadow = true;
        airportGroup.add(runway);

        // 2. Centerline & Threshold Markings (White paint lines)
        const markingMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // Centerline dashes
        for (let z = -1400; z <= 1400; z += 60) {
            const dashGeo = new THREE.PlaneGeometry(1.5, 30);
            dashGeo.rotateX(-Math.PI / 2);
            const dash = new THREE.Mesh(dashGeo, markingMat);
            dash.position.set(0, 0.15, z);
            airportGroup.add(dash);
        }

        // Runway Threshold Bars (Stripes at both ends)
        [-1450, 1450].forEach(endZ => {
            for (let x = -22; x <= 22; x += 5) {
                const barGeo = new THREE.PlaneGeometry(2.5, 25);
                barGeo.rotateX(-Math.PI / 2);
                const bar = new THREE.Mesh(barGeo, markingMat);
                bar.position.set(x, 0.15, endZ);
                airportGroup.add(bar);
            }
        });

        // 3. Runway Edge Lights (Green at threshold, white along sides, red at end)
        const lightGeo = new THREE.SphereGeometry(0.5, 8, 8);
        const whiteLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
        const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

        for (let z = -1480; z <= 1480; z += 80) {
            [-32, 32].forEach(x => {
                let mat = whiteLightMat;
                if (z < -1400) mat = greenLightMat;
                else if (z > 1400) mat = redLightMat;

                const lightMesh = new THREE.Mesh(lightGeo, mat);
                lightMesh.position.set(x, 0.5, z);
                airportGroup.add(lightMesh);
            });
        }

        // 4. Windsock
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 6);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(-45, 3, -1300);
        airportGroup.add(pole);

        const sockGeo = new THREE.ConeGeometry(0.8, 3.5, 8);
        sockGeo.rotateX(Math.PI / 2);
        const sockMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
        this.windsockProp = new THREE.Mesh(sockGeo, sockMat);
        this.windsockProp.position.set(-45, 5.5, -1300);
        airportGroup.add(this.windsockProp);

        this.scene.add(airportGroup);
    }

    buildClouds() {
        const cloudGroup = new THREE.Group();
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 1.0,
            transparent: true,
            opacity: 0.82
        });

        const numClouds = 40;
        for (let i = 0; i < numClouds; i++) {
            const singleCloud = new THREE.Group();
            const puffCount = 5 + Math.floor(Math.random() * 6);

            for (let j = 0; j < puffCount; j++) {
                const radius = 60 + Math.random() * 80;
                const puffGeo = new THREE.SphereGeometry(radius, 8, 8);
                const puff = new THREE.Mesh(puffGeo, cloudMat);
                puff.position.set(
                    (Math.random() - 0.5) * 120,
                    (Math.random() - 0.5) * 30,
                    (Math.random() - 0.5) * 120
                );
                singleCloud.add(puff);
            }

            // Scatter clouds around high altitude
            singleCloud.position.set(
                (Math.random() - 0.5) * 10000,
                800 + Math.random() * 800,
                (Math.random() - 0.5) * 10000
            );

            cloudGroup.add(singleCloud);
            this.clouds.push(singleCloud);
        }

        this.scene.add(cloudGroup);
    }

    buildTrees() {
        const treeGroup = new THREE.Group();
        const trunkGeo = new THREE.CylinderGeometry(0.4, 0.7, 4);
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
        const foliageGeo = new THREE.ConeGeometry(4, 12, 6);
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });

        // Scatter trees around runway valley sides
        const numTrees = 250;
        for (let i = 0; i < numTrees; i++) {
            let x = (Math.random() - 0.5) * 3500;
            let z = (Math.random() - 0.5) * 3500;

            // Keep clear of actual runway lane
            if (Math.abs(x) < 120 && Math.abs(z) < 1600) continue;

            const y = this.getProceduralHeight(x, z);
            if (y > 300) continue; // Don't place trees on snow peaks

            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 2;
            const foliage = new THREE.Mesh(foliageGeo, foliageMat);
            foliage.position.y = 8;
            foliage.castShadow = true;

            tree.add(trunk);
            tree.add(foliage);
            tree.position.set(x, y, z);

            const scale = 0.7 + Math.random() * 0.6;
            tree.scale.set(scale, scale, scale);

            treeGroup.add(tree);
        }

        this.scene.add(treeGroup);
    }

    buildCows() {
        const cowGroup = new THREE.Group();

        // Herds scattered across valley grass fields
        const herdCenters = [
            { x: -350, z: -400 },
            { x: 400, z: -200 },
            { x: -500, z: 600 },
            { x: 450, z: 800 },
            { x: -700, z: -1200 },
            { x: 650, z: -1000 },
            { x: -250, z: 1200 }
        ];

        const cowsPerHerd = 8;

        herdCenters.forEach(center => {
            for (let i = 0; i < cowsPerHerd; i++) {
                const offsetX = (Math.random() - 0.5) * 120;
                const offsetZ = (Math.random() - 0.5) * 120;
                const x = center.x + offsetX;
                const z = center.z + offsetZ;

                // Stay clear of main runway strip
                if (Math.abs(x) < 70 && Math.abs(z) < 1550) continue;

                const y = this.getProceduralHeight(x, z);
                if (y > 150) continue; // Only place in low grass fields

                const cow = this.createCowModel();
                cow.position.set(x, y, z);
                cow.rotation.y = Math.random() * Math.PI * 2;

                const scale = 0.85 + Math.random() * 0.3;
                cow.scale.set(scale, scale, scale);

                cowGroup.add(cow);
            }
        });

        this.scene.add(cowGroup);
    }

    createCowModel() {
        const cow = new THREE.Group();

        const whiteSkin = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
        const blackPatch = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const pinkSnout = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.6 });
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 });
        const hoofMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });

        // 1. Main Body
        const bodyGeo = new THREE.BoxGeometry(1.4, 1.1, 2.2);
        const body = new THREE.Mesh(bodyGeo, whiteSkin);
        body.position.set(0, 1.1, 0);
        body.castShadow = true;
        cow.add(body);

        // 2. Black Patches (Spots)
        const patchGeo1 = new THREE.BoxGeometry(1.42, 0.6, 0.8);
        const patch1 = new THREE.Mesh(patchGeo1, blackPatch);
        patch1.position.set(0, 1.25, -0.3);
        cow.add(patch1);

        const patchGeo2 = new THREE.BoxGeometry(0.8, 0.7, 0.7);
        const patch2 = new THREE.Mesh(patchGeo2, blackPatch);
        patch2.position.set(0.35, 1.05, 0.5);
        cow.add(patch2);

        // 3. Udder
        const udderGeo = new THREE.BoxGeometry(0.5, 0.3, 0.5);
        const udder = new THREE.Mesh(udderGeo, pinkSnout);
        udder.position.set(0, 0.45, 0.3);
        cow.add(udder);

        // 4. Head & Neck
        const headGeo = new THREE.BoxGeometry(0.65, 0.65, 0.75);
        const head = new THREE.Mesh(headGeo, whiteSkin);
        head.position.set(0, 1.55, -1.3);
        head.castShadow = true;
        cow.add(head);

        // Head Patch
        const headPatchGeo = new THREE.BoxGeometry(0.67, 0.4, 0.4);
        const headPatch = new THREE.Mesh(headPatchGeo, blackPatch);
        headPatch.position.set(0, 1.68, -1.35);
        cow.add(headPatch);

        // Snout / Muzzle
        const snoutGeo = new THREE.BoxGeometry(0.55, 0.38, 0.4);
        const snout = new THREE.Mesh(snoutGeo, pinkSnout);
        snout.position.set(0, 1.4, -1.7);
        cow.add(snout);

        // Nostrils
        const nostrilGeo = new THREE.BoxGeometry(0.1, 0.08, 0.05);
        const nostrilLeft = new THREE.Mesh(nostrilGeo, blackPatch);
        nostrilLeft.position.set(-0.15, 1.42, -1.91);
        const nostrilRight = new THREE.Mesh(nostrilGeo, blackPatch);
        nostrilRight.position.set(0.15, 1.42, -1.91);
        cow.add(nostrilLeft);
        cow.add(nostrilRight);

        // Horns
        const hornGeo = new THREE.ConeGeometry(0.06, 0.3, 5);
        hornGeo.rotateX(-Math.PI / 6);
        const hornLeft = new THREE.Mesh(hornGeo, hornMat);
        hornLeft.position.set(-0.3, 1.95, -1.25);
        const hornRight = new THREE.Mesh(hornGeo, hornMat);
        hornRight.position.set(0.3, 1.95, -1.25);
        cow.add(hornLeft);
        cow.add(hornRight);

        // Ears
        const earGeo = new THREE.BoxGeometry(0.35, 0.1, 0.15);
        const earLeft = new THREE.Mesh(earGeo, whiteSkin);
        earLeft.position.set(-0.45, 1.7, -1.25);
        earLeft.rotation.z = -Math.PI / 12;
        const earRight = new THREE.Mesh(earGeo, whiteSkin);
        earRight.position.set(0.45, 1.7, -1.25);
        earRight.rotation.z = Math.PI / 12;
        cow.add(earLeft);
        cow.add(earRight);

        // 5. 4 Legs & Hooves
        const legGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
        const hoofGeo = new THREE.BoxGeometry(0.24, 0.15, 0.24);

        const legPositions = [
            { x: -0.5, z: -0.7 },
            { x: 0.5, z: -0.7 },
            { x: -0.5, z: 0.7 },
            { x: 0.5, z: 0.7 }
        ];

        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, whiteSkin);
            leg.position.set(pos.x, 0.45, pos.z);
            leg.castShadow = true;
            cow.add(leg);

            const hoof = new THREE.Mesh(hoofGeo, hoofMat);
            hoof.position.set(pos.x, 0.08, pos.z);
            cow.add(hoof);
        });

        // 6. Tail
        const tailGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.8);
        const tail = new THREE.Mesh(tailGeo, whiteSkin);
        tail.position.set(0, 0.9, 1.15);
        tail.rotation.x = Math.PI / 8;
        cow.add(tail);

        const tuftGeo = new THREE.SphereGeometry(0.07, 6, 6);
        const tuft = new THREE.Mesh(tuftGeo, blackPatch);
        tuft.position.set(0, 0.5, 1.3);
        cow.add(tuft);

        return cow;
    }

    update(dt) {
        // Subtle cloud motion across sky
        this.clouds.forEach(cloud => {
            cloud.position.x += dt * 5.0;
            if (cloud.position.x > 5000) cloud.position.x = -5000;
        });

        // Windsock slight sway
        if (this.windsockProp) {
            this.windsockProp.rotation.z = Math.sin(Date.now() * 0.002) * 0.1;
        }
    }
}
