// Cessna 172 Physics Engine (Aerodynamics, Propulsion, Flight Dynamics & Ground Physics)

export class FlightPhysics {
    constructor() {
        // Aircraft Characteristics (Cessna 172 Skyhawk approximation)
        this.mass = 1100; // kg (max takeoff weight ~2550 lbs / 1157 kg)
        this.gravity = 9.81; // m/s^2
        this.wingArea = 16.2; // m^2 (174 sq ft)
        this.wingSpan = 11.0; // m (36 ft)
        this.aspectRatio = (this.wingSpan * this.wingSpan) / this.wingArea; // ~7.47
        this.airDensitySeaLevel = 1.225; // kg/m^3

        // Engine & Propeller Parameters
        this.maxPowerKW = 134; // 180 HP ~ 134 kW
        this.maxRPM = 2700;
        this.idleRPM = 650;
        this.propellerEfficiency = 0.80;

        // Aerodynamic Coefficients & Limits
        this.cLZero = 0.35; // Lift coefficient at zero AoA (cambered airfoil)
        this.cLAngle = 5.5; // Lift slope per radian (~0.096 per degree)
        this.cLMax = 1.6; // Max lift coefficient before stall
        this.stallAoADeg = 15.0; // Stall angle in degrees
        this.cD0 = 0.028; // Parasitic drag coefficient
        this.oswaldEfficiency = 0.80; // Oswald efficiency factor for induced drag

        // Control Surface Efficiency Factors
        this.elevatorAuthority = 0.085; // Increased for strong pitch response
        this.aileronAuthority = 0.065;
        this.rudderAuthority = 0.045;
        this.pitchDamping = 1.8;
        this.rollDamping = 2.5;
        this.yawDamping = 1.8;

        // Initial State
        this.resetState();
    }

    resetState(onRunway = true) {
        this.position = { x: 0, y: onRunway ? 1.8 : 500, z: onRunway ? 0 : -1000 };
        this.velocity = { x: 0, y: 0, z: onRunway ? 0 : -50 }; // Local velocity vector in m/s (z negative is forward)
        this.worldVelocity = { x: 0, y: 0, z: onRunway ? 0 : -50 };

        // Orientation in Euler angles (radians)
        this.pitch = 0; // Pitch angle (rad)
        this.roll = 0;  // Roll angle (rad)
        this.heading = 0; // Heading angle (rad, 0 = North / -Z axis)

        // Angular Velocities (rad/s)
        this.pitchRate = 0;
        this.rollRate = 0;
        this.yawRate = 0;

        // Control Inputs (Normalized -1 to +1 or 0 to 1)
        this.controls = {
            pitch: 0,     // -1 (nose down) to +1 (nose up)
            roll: 0,      // -1 (roll left) to +1 (roll right)
            yaw: 0,       // -1 (yaw left) to +1 (yaw right)
            throttle: onRunway ? 0 : 0.65, // 0 to 1
            flaps: 0,     // 0 (0 deg), 0.33 (10 deg), 0.66 (20 deg), 1.0 (30 deg)
            trim: 0,      // -1 to +1
            brakes: false
        };

        // Telemetry / Indicators
        this.airspeedKts = onRunway ? 0 : 100;
        this.altitudeFt = onRunway ? 5.9 : 1640;
        this.verticalSpeedFpm = 0;
        this.aoaDeg = 0;
        this.isStalling = false;
        this.isGrounded = onRunway;
        this.isCrashed = false;
        this.crashReason = '';
        this.engineRPM = onRunway ? this.idleRPM : 2300;
    }

    update(dt, getTerrainHeight = null) {
        if (this.isCrashed) return; // Stop simulation on crash

        if (dt > 0.1) dt = 0.1; // Cap delta time for stability

        // Calculate current air density based on altitude (barometric formula approximation)
        const currentAirDensity = this.airDensitySeaLevel * Math.exp(-this.position.y / 8500);

        // 1. Airspeed & Aerodynamic Flow Vectors
        // World velocity magnitude
        const speed = Math.sqrt(
            this.worldVelocity.x * this.worldVelocity.x +
            this.worldVelocity.y * this.worldVelocity.y +
            this.worldVelocity.z * this.worldVelocity.z
        );
        this.airspeedKts = speed * 1.94384; // m/s to knots

        // Dynamic pressure q = 0.5 * rho * V^2
        const dynamicPressure = 0.5 * currentAirDensity * (speed * speed);

        // Angle of Attack (AoA) estimation from flight path vs pitch
        let flightPathPitch = 0;
        if (speed > 1.0) {
            flightPathPitch = Math.asin(Math.max(-1, Math.min(1, this.worldVelocity.y / speed)));
        }
        this.aoaDeg = ((this.pitch - flightPathPitch) * 180 / Math.PI);

        // 2. Engine Thrust Calculation - Fast spool and boosted takeoff acceleration
        const targetRPM = this.idleRPM + this.controls.throttle * (this.maxRPM - this.idleRPM);
        this.engineRPM += (targetRPM - this.engineRPM) * Math.min(1, dt * 6.0);

        // Thrust = Power / Speed (with boosted low-speed static thrust)
        const currentPowerW = (this.engineRPM / this.maxRPM) * (this.maxPowerKW * 1000) * this.propellerEfficiency;
        const effectiveSpeed = Math.max(10, speed);
        let thrustForce = (currentPowerW / effectiveSpeed) * 1.6; // Increased general thrust baseline

        // Static thrust boost at low speed for rapid acceleration
        if (speed < 25) {
            thrustForce *= (2.2 - 1.0 * (speed / 25));
        }

        // 3. Lift & Drag Coefficients
        const flapsDeg = this.controls.flaps * 30; // Max 30 degrees flaps
        const cLFlaps = 0.015 * flapsDeg;
        const cDFlaps = 0.001 * flapsDeg;

        let cL = this.cLZero + (this.aoaDeg * Math.PI / 180) * this.cLAngle + cLFlaps;

        // Stall Mechanics
        this.isStalling = false;
        if (this.aoaDeg > this.stallAoADeg) {
            this.isStalling = true;
            // Dramatic loss of lift past stall angle
            const stallFactor = Math.max(0.2, 1.0 - (this.aoaDeg - this.stallAoADeg) * 0.08);
            cL *= stallFactor;
        } else if (this.aoaDeg < -10) {
            this.isStalling = true;
        }

        // Induced Drag Coefficient cDi = cL^2 / (pi * AR * e)
        const cDi = (cL * cL) / (Math.PI * this.aspectRatio * this.oswaldEfficiency);
        const cD = this.cD0 + cDi + cDFlaps;

        // Aerodynamic Forces (Newtons)
        const liftForce = dynamicPressure * this.wingArea * cL;
        const dragForce = dynamicPressure * this.wingArea * cD;

        // 4. Force Synthesis & Orientations
        // Forward vector (Aircraft longitudinal axis)
        const cosP = Math.cos(this.pitch);
        const sinP = Math.sin(this.pitch);
        const cosH = Math.cos(this.heading);
        const sinH = Math.sin(this.heading);
        const cosR = Math.cos(this.roll);
        const sinR = Math.sin(this.roll);

        // Forward unit vector (World space)
        const fwdX = -sinH * cosP;
        const fwdY = sinP;
        const fwdZ = -cosH * cosP;

        // Up unit vector (World space)
        const upX = sinH * sinP * cosR + cosH * sinR;
        const upY = cosP * cosR;
        const upZ = cosH * sinP * cosR - sinH * sinR;

        // Velocity unit vector (or forward if zero)
        let velX = speed > 0.1 ? this.worldVelocity.x / speed : fwdX;
        let velY = speed > 0.1 ? this.worldVelocity.y / speed : fwdY;
        let velZ = speed > 0.1 ? this.worldVelocity.z / speed : fwdZ;

        // Total force accumulators in World Coordinates
        let totalFx = fwdX * thrustForce - velX * dragForce;
        let totalFy = fwdY * thrustForce - velY * dragForce - (this.mass * this.gravity);
        let totalFz = fwdZ * thrustForce - velZ * dragForce;

        // Lift acts perpendicular to air velocity in the aircraft's upward direction
        totalFx += upX * liftForce;
        totalFy += upY * liftForce;
        totalFz += upZ * liftForce;

        // Linear Acceleration (a = F/m)
        const ax = totalFx / this.mass;
        const ay = totalFy / this.mass;
        const az = totalFz / this.mass;

        // Integrate World Velocity & Position
        this.worldVelocity.x += ax * dt;
        this.worldVelocity.y += ay * dt;
        this.worldVelocity.z += az * dt;

        this.position.x += this.worldVelocity.x * dt;
        this.position.y += this.worldVelocity.y * dt;
        this.position.z += this.worldVelocity.z * dt;

        // 5. Ground Physics, Terrain Collision & Crash Engine
        let terrainY = 0;
        if (getTerrainHeight) {
            terrainY = getTerrainHeight(this.position.x, this.position.z);
        }
        const gearHeight = 1.8;
        const groundLevel = terrainY + gearHeight;

        if (this.position.y <= groundLevel) {
            const verticalImpactSpeed = Math.abs(this.worldVelocity.y);
            const pitchDeg = Math.abs(this.pitch * 180 / Math.PI);
            const rollDeg = Math.abs(this.roll * 180 / Math.PI);

            // Crash conditions: high vertical speed on impact, inverted/steep roll/pitch, or mountain terrain collision
            if (terrainY > 15 || verticalImpactSpeed > 8.0 || pitchDeg > 25 || rollDeg > 30) {
                this.isCrashed = true;
                if (terrainY > 15) {
                    this.crashReason = 'Collided with mountain terrain!';
                } else if (verticalImpactSpeed > 8.0) {
                    this.crashReason = 'Hard landing / impact speed too high!';
                } else {
                    this.crashReason = 'Aircraft crashed due to severe pitch/roll attitude!';
                }
                this.worldVelocity = { x: 0, y: 0, z: 0 };
                return;
            }

            this.isGrounded = true;
            this.position.y = groundLevel;

            // Ground normal force (cancels downward vertical force if on ground)
            if (totalFy < 0) totalFy = 0;
            if (this.worldVelocity.y < 0) this.worldVelocity.y = 0;

            // Ground friction & braking
            const frictionCoeff = this.controls.brakes ? 0.45 : 0.02;
            const normalForce = this.mass * this.gravity;
            const frictionForce = normalForce * frictionCoeff;

            if (speed > 0.1) {
                this.worldVelocity.x *= Math.max(0, 1 - (frictionForce / (this.mass * speed)) * dt);
                this.worldVelocity.z *= Math.max(0, 1 - (frictionForce / (this.mass * speed)) * dt);
            }

            // Level pitch/roll gradually when firmly grounded at low speeds
            if (speed < 20) {
                this.pitch *= 0.90;
                this.roll *= 0.90;
            }
        } else {
            this.isGrounded = false;
        }

        // 6. Rotational Dynamics & Control Surface Moments
        // Control Inputs + Trim
        const effectivePitchInput = this.controls.pitch + (this.controls.trim * 0.3);

        // Dynamic control effectiveness with minimum baseline authority even at low speed / prop wash
        const controlQ = Math.max(0.6, Math.min(2.5, dynamicPressure / 200.0));

        // Pitch, Roll, Yaw Torques / Target Rates
        const targetPitchRate = effectivePitchInput * this.elevatorAuthority * controlQ;
        let targetRollRate = this.controls.roll * this.aileronAuthority * controlQ;
        let targetYawRate = -this.controls.yaw * this.rudderAuthority * controlQ;

        // Ground steering via rudder when grounded
        if (this.isGrounded) {
            targetYawRate += -this.controls.yaw * 0.05 * (speed / 10);
            targetRollRate *= 0.1; // Resistance to roll on ground
        }

        // Apply Angular Velocity Smoothly with Aerodynamic Damping
        this.pitchRate += (targetPitchRate - this.pitchRate * this.pitchDamping) * dt * 10;
        this.rollRate += (targetRollRate - this.rollRate * this.rollDamping) * dt * 10;
        this.yawRate += (targetYawRate - this.yawRate * this.yawDamping) * dt * 10;

        // Integrate Rotations with 85-degree pitch limits (prevent gimbal locks while allowing full climbs/descents)
        const maxPitch = (85 * Math.PI) / 180;
        this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch + this.pitchRate * dt));
        this.roll += this.rollRate * dt;
        this.heading += this.yawRate * dt;

        // Telemetry Update
        this.altitudeFt = this.position.y * 3.28084; // meters to feet
        this.verticalSpeedFpm = this.worldVelocity.y * 196.85; // m/s to feet per min
    }
}
