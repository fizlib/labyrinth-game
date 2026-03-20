// src/entities/Player.ts
import * as THREE from 'three';
import { InputManager } from '../input/InputManager';
import { PhysicsBody, PLAYER_HALF_EXTENTS, PLAYER_HEIGHT } from '../physics/PhysicsBody';

export class Player {
    public body: THREE.Group;

    private camera: THREE.PerspectiveCamera;
    private inputManager: InputManager;
    private physicsBody: PhysicsBody;

    /** Wall AABB colliders passed in from the level */
    private colliders: THREE.Box3[] = [];

    // Movement tuning
    private acceleration: number = 50.0;  // How quickly the player reaches top speed
    private maxSpeed: number = 8.0;       // Maximum horizontal speed (units/s)
    private lookSensitivity: number = 0.5;

    // Pitch constraints (slightly less than PI/2 to avoid gimbal lock/stuttering)
    private minPitch: number = -Math.PI / 2 + 0.05;
    private maxPitch: number = Math.PI / 2 - 0.05;

    constructor(camera: THREE.PerspectiveCamera, inputManager: InputManager, scene: THREE.Scene) {
        this.camera = camera;
        this.inputManager = inputManager;

        // 1. Create the physics body (AABB, velocity, etc.)
        this.physicsBody = new PhysicsBody(PLAYER_HALF_EXTENTS);

        // 2. Create the physical body group
        this.body = new THREE.Group();
        this.body.position.set(0, PLAYER_HEIGHT, 5); // Default spawn, overridden by setSpawnPosition

        // 3. Reset the camera and attach it to the body
        this.camera.position.set(0, 0, 0);
        this.camera.rotation.set(0, 0, 0);

        this.body.add(this.camera);

        // 4. Add the player to the scene
        scene.add(this.body);

        // 5. Initialise the bounding box at the starting position
        this.physicsBody.updateBoundingBox(this.body.position);
    }

    /**
     * Set the wall colliders that the player will be tested against each frame.
     */
    public setColliders(colliders: THREE.Box3[]): void {
        this.colliders = colliders;
    }

    /**
     * Move the player to a specific spawn position.
     */
    public setSpawnPosition(position: THREE.Vector3): void {
        this.body.position.copy(position);
        this.physicsBody.updateBoundingBox(this.body.position);
    }

    /**
     * Returns the player's AABB for external use (debug helpers, etc.)
     */
    public getBoundingBox(): THREE.Box3 {
        return this.physicsBody.boundingBox;
    }

    public update(deltaTime: number): void {
        this.handleRotation(deltaTime);
        this.handleMovement(deltaTime);

        // Update the bounding box to match the new position
        this.physicsBody.updateBoundingBox(this.body.position);

        // Resolve wall collisions (pushback along axis of least penetration)
        this.physicsBody.resolveCollisions(this.body.position, this.colliders);
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
        const inputDirection = new THREE.Vector3(0, 0, 0);

        // Z-axis corresponds to Forward/Backward in Three.js (Negative Z is forward)
        if (keys.forward) inputDirection.z -= 1;
        if (keys.backward) inputDirection.z += 1;

        // X-axis corresponds to Left/Right
        if (keys.left) inputDirection.x -= 1;
        if (keys.right) inputDirection.x += 1;

        // Determine if any movement key is pressed
        const isMoving = inputDirection.lengthSq() > 0;

        if (isMoving) {
            // Normalize so diagonal movement isn't 1.4x faster
            inputDirection.normalize();

            // Rotate the movement vector by the body's current Y-axis rotation (Yaw)
            // so pressing 'W' moves us in the direction we are currently facing.
            inputDirection.applyEuler(new THREE.Euler(0, this.body.rotation.y, 0));

            // Apply acceleration to velocity
            this.physicsBody.velocity.x += inputDirection.x * this.acceleration * deltaTime;
            this.physicsBody.velocity.z += inputDirection.z * this.acceleration * deltaTime;

            // Clamp horizontal speed to maxSpeed
            const horizontalSpeed = Math.sqrt(
                this.physicsBody.velocity.x ** 2 + this.physicsBody.velocity.z ** 2
            );
            if (horizontalSpeed > this.maxSpeed) {
                const scale = this.maxSpeed / horizontalSpeed;
                this.physicsBody.velocity.x *= scale;
                this.physicsBody.velocity.z *= scale;
            }
        }

        // Apply friction/damping when no input is given
        this.physicsBody.applyFriction(deltaTime, isMoving);

        // Apply gravity
        this.physicsBody.applyGravity(deltaTime);

        // Move the body by the current velocity
        this.body.position.addScaledVector(this.physicsBody.velocity, deltaTime);

        // Floor collision: snap to floor and zero Y velocity if below threshold
        this.physicsBody.clampToFloor(this.body.position);
    }
}