// src/entities/Player.ts
import * as THREE from 'three';
import { InputManager } from '../input/InputManager';

export class Player {
    public body: THREE.Group;

    private camera: THREE.PerspectiveCamera;
    private inputManager: InputManager;

    // Temporary configuration for testing
    private moveSpeed: number = 8.0;
    private lookSensitivity: number = 0.5;

    // Pitch constraints (slightly less than PI/2 to avoid gimbal lock/stuttering)
    private minPitch: number = -Math.PI / 2 + 0.05;
    private maxPitch: number = Math.PI / 2 - 0.05;

    constructor(camera: THREE.PerspectiveCamera, inputManager: InputManager, scene: THREE.Scene) {
        this.camera = camera;
        this.inputManager = inputManager;

        // 1. Create the physical body
        this.body = new THREE.Group();
        this.body.position.set(0, 2, 5); // Start at "eye level" above the floor

        // 2. Reset the camera and attach it to the body
        // The camera's position is now relative to the body's center
        this.camera.position.set(0, 0, 0);
        this.camera.rotation.set(0, 0, 0);

        this.body.add(this.camera);

        // 3. Add the player to the scene
        scene.add(this.body);
    }

    public update(deltaTime: number): void {
        this.handleRotation(deltaTime);
        this.handleMovement(deltaTime);
    }

    private handleRotation(deltaTime: number): void {
        // Only rotate if the pointer is locked
        if (!this.inputManager.mouse.locked) return;

        const { movementX, movementY } = this.inputManager.mouse;

        // YAW: Rotate the entire body left and right
        this.body.rotation.y -= movementX * this.lookSensitivity * deltaTime;

        // PITCH: Rotate only the camera up and down
        this.camera.rotation.x -= movementY * this.lookSensitivity * deltaTime;

        // Clamp the pitch to prevent the camera from flipping backwards
        this.camera.rotation.x = THREE.MathUtils.clamp(
            this.camera.rotation.x,
            this.minPitch,
            this.maxPitch
        );
    }

    private handleMovement(deltaTime: number): void {
        const keys = this.inputManager.keys;
        const direction = new THREE.Vector3(0, 0, 0);

        // Z-axis corresponds to Forward/Backward in Three.js (Negative Z is forward)
        if (keys.forward) direction.z -= 1;
        if (keys.backward) direction.z += 1;

        // X-axis corresponds to Left/Right
        if (keys.left) direction.x -= 1;
        if (keys.right) direction.x += 1;

        // Normalize the vector so diagonal movement isn't 1.4x faster
        if (direction.lengthSq() > 0) {
            direction.normalize();
        }

        // CRUCIAL: Rotate the movement vector by the body's current Y-axis rotation (Yaw).
        // This ensures pressing 'W' moves us in the direction we are currently facing.
        direction.applyEuler(new THREE.Euler(0, this.body.rotation.y, 0));

        // Move the body
        this.body.position.addScaledVector(direction, this.moveSpeed * deltaTime);
    }
}