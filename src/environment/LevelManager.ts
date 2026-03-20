// src/environment/LevelManager.ts
import * as THREE from 'three';

// --- Tunable Constants ---
export const CELL_SIZE = 2;    // Width & depth of each grid cell in world units
export const WALL_HEIGHT = 3;  // Height of wall blocks

/**
 * Hardcoded 10×10 maze grid.
 * 1 = wall, 0 = walkable floor.
 * Fully enclosed perimeter with a few internal walls for testing.
 */
const MAZE_DATA: number[][] = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 1, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export class LevelManager {
    /** AABB colliders for every wall cell — used by the physics system */
    public colliders: THREE.Box3[] = [];

    /** Number of rows in the maze grid */
    public readonly rows: number;

    /** Number of columns in the maze grid */
    public readonly cols: number;

    constructor() {
        this.rows = MAZE_DATA.length;
        this.cols = MAZE_DATA[0].length;
    }

    /**
     * Parse the grid, build an InstancedMesh of walls, compute colliders,
     * and add everything to the scene.
     */
    public buildMaze(scene: THREE.Scene): void {
        // 1. Count how many wall cells exist so we can size the InstancedMesh
        let wallCount = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (MAZE_DATA[row][col] === 1) wallCount++;
            }
        }

        // 2. Create the shared geometry and material
        const geometry = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, CELL_SIZE);
        const material = new THREE.MeshStandardMaterial({
            color: 0x556677,
            roughness: 0.7,
            metalness: 0.1,
        });

        // 3. Create the InstancedMesh (single draw call for all walls)
        const instancedMesh = new THREE.InstancedMesh(geometry, material, wallCount);
        instancedMesh.castShadow = true;
        instancedMesh.receiveShadow = true;

        // 4. Position each instance and compute its collider
        const dummy = new THREE.Object3D();
        let instanceIndex = 0;

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (MAZE_DATA[row][col] !== 1) continue;

                // World position: centre of the wall block
                const x = col * CELL_SIZE + CELL_SIZE / 2;
                const y = WALL_HEIGHT / 2; // Sit on the floor (y=0)
                const z = row * CELL_SIZE + CELL_SIZE / 2;

                // Set instance transform
                dummy.position.set(x, y, z);
                dummy.updateMatrix();
                instancedMesh.setMatrixAt(instanceIndex, dummy.matrix);

                // Compute AABB collider for this wall
                const halfW = CELL_SIZE / 2;
                const halfH = WALL_HEIGHT / 2;
                const box = new THREE.Box3(
                    new THREE.Vector3(x - halfW, y - halfH, z - halfW),
                    new THREE.Vector3(x + halfW, y + halfH, z + halfW)
                );
                this.colliders.push(box);

                instanceIndex++;
            }
        }

        // Mark instance matrix buffer as needing an upload to the GPU
        instancedMesh.instanceMatrix.needsUpdate = true;

        scene.add(instancedMesh);
    }

    /**
     * Returns a safe spawn position on a known walkable cell (row 1, col 1).
     * The position is at eye-level above the floor, centred in the cell.
     */
    public getSpawnPosition(playerHeight: number): THREE.Vector3 {
        // Row 1, Col 1 is guaranteed to be 0 (walkable) in our grid
        const spawnRow = 1;
        const spawnCol = 1;

        return new THREE.Vector3(
            spawnCol * CELL_SIZE + CELL_SIZE / 2,
            playerHeight,
            spawnRow * CELL_SIZE + CELL_SIZE / 2
        );
    }
}
