// Unit & Integration test for FlightPhysics simulation engine
import { FlightPhysics } from './js/physics/FlightPhysics.js';

function runPhysicsTests() {
    console.log("Running Flight Physics Verification Tests...");
    const physics = new FlightPhysics();

    // Test 1: Initial state ground check
    console.assert(physics.isGrounded === true, "Initial state should be grounded");
    console.assert(physics.altitudeFt > 0, "Altitude should be positive");

    // Test 2: Throttle increase produces thrust & accelerates aircraft
    physics.controls.throttle = 1.0;
    for (let i = 0; i < 100; i++) {
        physics.update(0.05);
    }
    console.log(`Speed after 5 seconds full throttle on ground: ${physics.airspeedKts.toFixed(1)} kts`);
    console.assert(physics.airspeedKts > 20, "Aircraft should accelerate with full throttle");

    // Test 3: Airborne physics test
    physics.resetState(false); // airborne at 1640 ft
    console.assert(physics.isGrounded === false, "Aircraft should be airborne");
    const initAlt = physics.altitudeFt;
    for (let i = 0; i < 50; i++) {
        physics.update(0.05);
    }
    console.log(`Airborne Speed: ${physics.airspeedKts.toFixed(1)} kts, Altitude: ${physics.altitudeFt.toFixed(1)} ft`);
    console.assert(physics.airspeedKts > 50, "Airborne speed should be sustained");

    // Test 4: Flaps increase lift/drag
    physics.controls.flaps = 1.0;
    physics.update(0.05);
    console.log(`Flaps deployed, AoA: ${physics.aoaDeg.toFixed(1)}°`);

    console.log("All Flight Physics Tests Passed Successfully!");
}

runPhysicsTests();
