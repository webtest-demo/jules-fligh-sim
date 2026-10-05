import * as THREE from 'three';

export class CameraSystem {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        // Camera Modes: 'cockpit' or 'chase'
        this.mode = 'chase';

        // Offset positions relative to aircraft origin
        this.cockpitOffset = new THREE.Vector3(0, 0.52, -0.25); // Inside windshield pilot seat
        this.chaseOffset = new THREE.Vector3(0, 3.5, 14.0);     // Behind and slightly above

        // Chase camera smoothing target
        this.currentPos = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();

        // Mouse look / Orbit offsets
        this.mouseLookYaw = 0;
        this.mouseLookPitch = 0;
        this.isMouseDown = false;

        this.initMouseControls();
    }

    initMouseControls() {
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.isMouseDown = true;
        });
        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });
        window.addEventListener('mousemove', (e) => {
            if (this.isMouseDown) {
                this.mouseLookYaw -= e.movementX * 0.003;
                this.mouseLookPitch -= e.movementY * 0.003;
                this.mouseLookPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.mouseLookPitch));
            }
        });
    }

    toggleMode() {
        this.mode = (this.mode === 'chase') ? 'cockpit' : 'chase';
        this.mouseLookYaw = 0;
        this.mouseLookPitch = 0;
        return this.mode;
    }

    update(physics, aircraftMesh, dt) {
        const aircraftPos = new THREE.Vector3(physics.position.x, physics.position.y, physics.position.z);

        // Aircraft Rotation Matrix
        const rotationMatrix = new THREE.Matrix4();
        const euler = new THREE.Euler(physics.pitch, -physics.heading, -physics.roll, 'YXZ');
        rotationMatrix.makeRotationFromEuler(euler);

        if (this.mode === 'cockpit') {
            // Cockpit view: Rigid attach to pilot seat position with mouse look offset
            const localCockpit = this.cockpitOffset.clone();
            localCockpit.applyMatrix4(rotationMatrix);

            const targetCamPos = aircraftPos.clone().add(localCockpit);
            this.camera.position.copy(targetCamPos);

            // Forward vector
            const lookOffset = new THREE.Vector3(0, 0, -10);

            // Apply mouse look rotation
            const mouseLookEuler = new THREE.Euler(physics.pitch + this.mouseLookPitch, -physics.heading + this.mouseLookYaw, -physics.roll, 'YXZ');
            const mouseLookMatrix = new THREE.Matrix4().makeRotationFromEuler(mouseLookEuler);
            lookOffset.applyMatrix4(mouseLookMatrix);

            const lookTarget = targetCamPos.clone().add(lookOffset);
            this.camera.lookAt(lookTarget);

            // Make aircraft model semi-transparent or adjust windshield visibility if in cockpit
            aircraftMesh.visible = true; // Cockpit visible around camera
        } else {
            // Chase view: Smooth spring-like camera following behind aircraft
            aircraftMesh.visible = true;

            const localChase = this.chaseOffset.clone();
            localChase.applyMatrix4(rotationMatrix);

            const targetCamPos = aircraftPos.clone().add(localChase);
            const targetLookAt = aircraftPos.clone().add(new THREE.Vector3(0, 1.0, -2.0).applyMatrix4(rotationMatrix));

            // Smooth interpolation (lerp)
            const lerpFactor = Math.min(1.0, dt * 8.0);
            this.currentPos.lerp(targetCamPos, lerpFactor);
            this.currentLookAt.lerp(targetLookAt, lerpFactor);

            this.camera.position.copy(this.currentPos);
            this.camera.lookAt(this.currentLookAt);
        }
    }
}
