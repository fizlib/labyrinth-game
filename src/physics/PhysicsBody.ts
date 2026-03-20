// src/physics/PhysicsBody.ts
import * as THREE from 'three';

// --- Tunable Constants ---
export const GRAVITY = -20.0;          // Downward acceleration (units/s²)
export const DAMPING = 8.0;            // Friction/damping factor (higher = quicker stop)
export const PLAYER_HEIGHT = 2.0;      // Eye-level height above the floor
export const PLAYER_HALF_EXTENTS = new THREE.Vector3(0.4, 1.0, 0.4); // Half-size of the AABB

export class PhysicsBody {
    /** Current velocity in world-space */
    public velocity: THREE.Vector3;

    /** Axis-Aligned Bounding Box for collision detection */
    public boundingBox: THREE.Box3;

    /** Half-extents defining the size of the bounding box */
    private halfExtents: THREE.Vector3;

    /** Whether the body is currently on the ground */
    public isGrounded: boolean = false;

    constructor(halfExtents: THREE.Vector3) {
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.halfExtents = halfExtents.clone();
        this.boundingBox = new THREE.Box3();
    }

    /**
     * Apply gravitational acceleration to the Y velocity.
     */
    public applyGravity(deltaTime: number): void {
        this.velocity.y += GRAVITY * deltaTime;
    }

    /**
     * Apply exponential friction/damping to the XZ velocity
     * so the player slides to a stop when no input is given.
     * @param deltaTime Frame delta in seconds
     * @param isMoving Whether the player is actively pressing movement keys
     */
    public applyFriction(deltaTime: number, isMoving: boolean): void {
        if (!isMoving) {
            // Exponential decay: velocity *= e^(-damping * dt)
            const factor = Math.exp(-DAMPING * deltaTime);
            this.velocity.x *= factor;
            this.velocity.z *= factor;

            // Snap to zero when below a tiny threshold to avoid infinite drift
            if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
            if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
        }
    }

    /**
     * Prevent the body from falling through the floor.
     * If the position dips below the floor threshold, snap back up and zero Y velocity.
     * @param position The entity's current position (mutated in-place)
     * @param floorY The Y coordinate of the floor surface (default 0)
     * @param height The height the entity's position sits above the floor
     */
    public clampToFloor(position: THREE.Vector3, floorY: number = 0, height: number = PLAYER_HEIGHT): void {
        const minY = floorY + height;

        if (position.y <= minY) {
            position.y = minY;
            this.velocity.y = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
    }

    /**
     * Recalculate the bounding box to be centred on the given world position.
     * The box extends by halfExtents in each axis direction.
     */
    public updateBoundingBox(position: THREE.Vector3): void {
        this.boundingBox.setFromCenterAndSize(
            // Centre the box vertically on the body (offset down from eye-level by half the height)
            new THREE.Vector3(
                position.x,
                position.y - this.halfExtents.y,
                position.z
            ),
            // Full size = 2 × halfExtents
            new THREE.Vector3(
                this.halfExtents.x * 2,
                this.halfExtents.y * 2,
                this.halfExtents.z * 2
            )
        );
    }

    /**
     * Placeholder for AABB collision testing against an array of wall colliders.
     * Returns the list of collider boxes that intersect with this body's bounding box.
     * Will be fleshed out when walls are added to the labyrinth.
     */
    public checkCollisions(colliders: THREE.Box3[]): THREE.Box3[] {
        const intersecting: THREE.Box3[] = [];

        for (const collider of colliders) {
            if (this.boundingBox.intersectsBox(collider)) {
                intersecting.push(collider);
            }
        }

        return intersecting;
    }
}
