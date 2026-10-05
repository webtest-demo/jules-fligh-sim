import * as THREE from 'three';

export class AircraftModel {
    constructor() {
        this.group = new THREE.Group();

        // Sub-components for animation
        this.propeller = null;
        this.leftAileron = null;
        this.rightAileron = null;
        this.elevator = null;
        this.rudder = null;
        this.leftFlap = null;
        this.rightFlap = null;

        // Materials
        this.whitePaint = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.1 });
        this.bluePaint = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.2 });
        this.darkMetal = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.8 });
        this.glass = new THREE.MeshPhysicalMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.4, roughness: 0.1, transmission: 0.9, ior: 1.5 });
        this.tireMaterial = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.1 });
        this.cockpitInterior = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

        this.buildModel();
    }

    buildModel() {
        // 1. Fuselage
        const fuselageShape = new THREE.Shape();
        fuselageShape.moveTo(0, 0);

        // Main fuselage body (Streamlined)
        const fuselageGeo = new THREE.ConeGeometry(0.85, 7.5, 12);
        fuselageGeo.rotateX(Math.PI / 2);
        fuselageGeo.scale(1.0, 1.2, 1.0);
        const fuselage = new THREE.Mesh(fuselageGeo, this.whitePaint);
        fuselage.position.set(0, 0, 0);
        fuselage.castShadow = true;
        fuselage.receiveShadow = true;
        this.group.add(fuselage);

        // Blue Stripe Decal / Trim along Fuselage
        const stripeGeo = new THREE.BoxGeometry(0.02, 0.25, 6.0);
        const stripeLeft = new THREE.Mesh(stripeGeo, this.bluePaint);
        stripeLeft.position.set(0.85, 0.05, 0.2);
        const stripeRight = new THREE.Mesh(stripeGeo, this.bluePaint);
        stripeRight.position.set(-0.85, 0.05, 0.2);
        this.group.add(stripeLeft);
        this.group.add(stripeRight);

        // Cockpit Windshield & Windows
        const windshieldGeo = new THREE.BoxGeometry(1.4, 0.85, 1.6);
        const windshield = new THREE.Mesh(windshieldGeo, this.glass);
        windshield.position.set(0, 0.45, -0.6);
        windshield.rotation.x = -Math.PI / 8;
        this.group.add(windshield);

        // Cockpit Dashboard interior block
        const dashGeo = new THREE.BoxGeometry(1.3, 0.5, 0.6);
        const dashMesh = new THREE.Mesh(dashGeo, this.cockpitInterior);
        dashMesh.position.set(0, 0.25, -0.9);
        this.group.add(dashMesh);

        // Pilot Seats
        const seatGeo = new THREE.BoxGeometry(0.5, 0.6, 0.5);
        const seatLeft = new THREE.Mesh(seatGeo, this.cockpitInterior);
        seatLeft.position.set(-0.3, 0.1, -0.3);
        const seatRight = new THREE.Mesh(seatGeo, this.cockpitInterior);
        seatRight.position.set(0.3, 0.1, -0.3);
        this.group.add(seatLeft);
        this.group.add(seatRight);

        // 2. High Wings (Cessna signature)
        const wingSpan = 11.0;
        const wingChord = 1.4;
        const wingGeo = new THREE.BoxGeometry(wingSpan, 0.12, wingChord);
        const wingMesh = new THREE.Mesh(wingGeo, this.whitePaint);
        wingMesh.position.set(0, 0.95, -0.4);
        wingMesh.castShadow = true;
        wingMesh.receiveShadow = true;
        this.group.add(wingMesh);

        // Wing Struts (Supports connecting fuselage to wings)
        const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.3);
        const strutLeft = new THREE.Mesh(strutGeo, this.darkMetal);
        strutLeft.position.set(-2.0, 0.2, -0.4);
        strutLeft.rotation.z = -Math.PI / 4;
        const strutRight = new THREE.Mesh(strutGeo, this.darkMetal);
        strutRight.position.set(2.0, 0.2, -0.4);
        strutRight.rotation.z = Math.PI / 4;
        this.group.add(strutLeft);
        this.group.add(strutRight);

        // Ailerons (Left & Right)
        const aileronGeo = new THREE.BoxGeometry(2.2, 0.08, 0.3);
        this.leftAileron = new THREE.Mesh(aileronGeo, this.bluePaint);
        this.leftAileron.position.set(-4.0, 0.95, 0.25);
        this.rightAileron = new THREE.Mesh(aileronGeo, this.bluePaint);
        this.rightAileron.position.set(4.0, 0.95, 0.25);
        this.group.add(this.leftAileron);
        this.group.add(this.rightAileron);

        // Flaps (Left & Right inner wing trailing edge)
        const flapGeo = new THREE.BoxGeometry(2.5, 0.08, 0.35);
        this.leftFlap = new THREE.Mesh(flapGeo, this.darkMetal);
        this.leftFlap.position.set(-1.5, 0.93, 0.25);
        this.rightFlap = new THREE.Mesh(flapGeo, this.darkMetal);
        this.rightFlap.position.set(1.5, 0.93, 0.25);
        this.group.add(this.leftFlap);
        this.group.add(this.rightFlap);

        // 3. Empennage (Tail Section)
        // Vertical Stabilizer / Fin
        const finGeo = new THREE.BoxGeometry(0.1, 1.6, 1.2);
        finGeo.translate(0, 0.8, 0);
        const fin = new THREE.Mesh(finGeo, this.whitePaint);
        fin.position.set(0, 0.2, 3.2);
        fin.rotation.x = -Math.PI / 12;
        this.group.add(fin);

        // Rudder
        const rudderGeo = new THREE.BoxGeometry(0.08, 1.5, 0.4);
        this.rudder = new THREE.Mesh(rudderGeo, this.bluePaint);
        this.rudder.position.set(0, 0.9, 3.8);
        this.group.add(this.rudder);

        // Horizontal Stabilizer
        const horizStabGeo = new THREE.BoxGeometry(3.6, 0.08, 0.9);
        const horizStab = new THREE.Mesh(horizStabGeo, this.whitePaint);
        horizStab.position.set(0, 0.3, 3.4);
        this.group.add(horizStab);

        // Elevator
        const elevatorGeo = new THREE.BoxGeometry(3.5, 0.06, 0.35);
        this.elevator = new THREE.Mesh(elevatorGeo, this.bluePaint);
        this.elevator.position.set(0, 0.3, 3.85);
        this.group.add(this.elevator);

        // 4. Engine Cowling & Propeller
        const cowlGeo = new THREE.CylinderGeometry(0.75, 0.85, 1.2, 12);
        cowlGeo.rotateX(Math.PI / 2);
        const cowl = new THREE.Mesh(cowlGeo, this.whitePaint);
        cowl.position.set(0, -0.05, -3.2);
        this.group.add(cowl);

        // Spinner / Cone
        const spinnerGeo = new THREE.ConeGeometry(0.3, 0.5, 12);
        spinnerGeo.rotateX(-Math.PI / 2);
        const spinner = new THREE.Mesh(spinnerGeo, this.darkMetal);
        spinner.position.set(0, -0.05, -3.8);
        this.group.add(spinner);

        // Propeller Blades Group
        this.propeller = new THREE.Group();
        const bladeGeo = new THREE.BoxGeometry(2.0, 0.12, 0.03);
        const blade1 = new THREE.Mesh(bladeGeo, this.darkMetal);
        this.propeller.add(blade1);
        this.propeller.position.set(0, -0.05, -3.82);
        this.group.add(this.propeller);

        // 5. Tricycle Landing Gear
        // Nose Wheel Strut & Tire
        const noseStrutGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.0);
        const noseStrut = new THREE.Mesh(noseStrutGeo, this.darkMetal);
        noseStrut.position.set(0, -0.8, -2.2);
        this.group.add(noseStrut);

        const tireGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16);
        tireGeo.rotateZ(Math.PI / 2);
        const noseTire = new THREE.Mesh(tireGeo, this.tireMaterial);
        noseTire.position.set(0, -1.25, -2.2);
        this.group.add(noseTire);

        // Main Wheels (Left & Right)
        const mainStrutGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.3);
        const leftMainStrut = new THREE.Mesh(mainStrutGeo, this.darkMetal);
        leftMainStrut.position.set(-0.9, -0.7, 0.2);
        leftMainStrut.rotation.z = Math.PI / 6;

        const rightMainStrut = new THREE.Mesh(mainStrutGeo, this.darkMetal);
        rightMainStrut.position.set(0.9, -0.7, 0.2);
        rightMainStrut.rotation.z = -Math.PI / 6;

        this.group.add(leftMainStrut);
        this.group.add(rightMainStrut);

        const leftMainTire = new THREE.Mesh(tireGeo, this.tireMaterial);
        leftMainTire.position.set(-1.2, -1.25, 0.2);
        const rightMainTire = new THREE.Mesh(tireGeo, this.tireMaterial);
        rightMainTire.position.set(1.2, -1.25, 0.2);

        this.group.add(leftMainTire);
        this.group.add(rightMainTire);
    }

    update(physics, dt) {
        // Update aircraft body position and orientation in Three.js
        this.group.position.set(physics.position.x, physics.position.y, physics.position.z);

        // Euler angle orientation matching flight physics
        this.group.rotation.set(0, 0, 0); // Reset
        this.group.rotation.order = 'YXZ'; // Yaw (heading), Pitch, Roll order
        this.group.rotation.y = -physics.heading;
        this.group.rotation.x = physics.pitch;
        this.group.rotation.z = -physics.roll;

        // Animate Propeller rotation based on RPM
        if (this.propeller) {
            const rps = (physics.engineRPM / 60) * Math.PI * 2;
            this.propeller.rotation.z += rps * dt;
        }

        // Animate Control Surfaces based on flight inputs
        if (this.elevator) {
            this.elevator.rotation.x = physics.controls.pitch * 0.35;
        }
        if (this.leftAileron && this.rightAileron) {
            this.leftAileron.rotation.x = -physics.controls.roll * 0.35;
            this.rightAileron.rotation.x = physics.controls.roll * 0.35;
        }
        if (this.rudder) {
            this.rudder.rotation.y = -physics.controls.yaw * 0.35;
        }
        if (this.leftFlap && this.rightFlap) {
            const flapAngle = physics.controls.flaps * 0.5; // Up to ~30 degrees
            this.leftFlap.rotation.x = flapAngle;
            this.rightFlap.rotation.x = flapAngle;
        }
    }
}
