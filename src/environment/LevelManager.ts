// src/environment/LevelManager.ts
import * as THREE from 'three';
import { generateMaze, type MazeResult } from './MazeGenerator';

// --- Tunable Constants ---
export const CELL_SIZE = 2;    // Width & depth of each grid cell in world units
export const WALL_HEIGHT = 3;  // Height of wall blocks

export class LevelManager {
    /** AABB colliders for every wall cell — used by the physics system */
    public colliders: THREE.Box3[] = [];

    /** Number of rows in the maze grid */
    public readonly rows: number;

    /** Number of columns in the maze grid */
    public readonly cols: number;

    /** The generated maze result */
    private mazeResult: MazeResult;

    constructor(size: number = 41) {
        this.mazeResult = generateMaze(size);
        this.rows = this.mazeResult.size;
        this.cols = this.mazeResult.size;
    }

    /**
     * Returns the raw maze grid (for minimap rendering).
     */
    public getMazeGrid(): number[][] {
        return this.mazeResult.grid;
    }

    /**
     * Returns the generated maze result (grid, center, spawns).
     */
    public getMazeResult(): MazeResult {
        return this.mazeResult;
    }

    /**
     * Parse the grid, build an InstancedMesh of walls, compute colliders,
     * and add everything to the scene.
     */
    public buildMaze(scene: THREE.Scene): void {
        const grid = this.mazeResult.grid;

        // 1. Count how many wall cells exist so we can size the InstancedMesh
        let wallCount = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (grid[row][col] === 1) wallCount++;
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
                if (grid[row][col] !== 1) continue;

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
     * Returns spawn positions for all 4 teams.
     * Each position is at player eye-level, centred in the spawn cell.
     */
    public getSpawnPositions(playerHeight: number): THREE.Vector3[] {
        return this.mazeResult.spawns.map(spawn => new THREE.Vector3(
            spawn.col * CELL_SIZE + CELL_SIZE / 2,
            playerHeight,
            spawn.row * CELL_SIZE + CELL_SIZE / 2
        ));
    }

    /**
     * Returns the first spawn position (for the local player).
     */
    public getSpawnPosition(playerHeight: number): THREE.Vector3 {
        return this.getSpawnPositions(playerHeight)[0];
    }
}
