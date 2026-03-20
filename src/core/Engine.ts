// src/core/Engine.ts
import * as THREE from 'three';
import { World } from '../environment/World';
import { InputManager } from '../input/InputManager';
import { Player } from '../entities/Player';
import { LevelManager, CELL_SIZE } from '../environment/LevelManager';
import { PLAYER_HEIGHT } from '../physics/PhysicsBody';
import { Minimap } from '../ui/Minimap';

export class Engine {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    private world: World;
    private levelManager: LevelManager;
    private clock: THREE.Clock;
    private isRunning: boolean = false;

    private inputManager: InputManager;
    private player: Player;
    private minimap: Minimap;

    constructor(canvas: HTMLCanvasElement, inputManager: InputManager) {
        this.inputManager = inputManager;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this.scene.fog = new THREE.FogExp2(0x111111, 0.02);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.clock = new THREE.Clock();
        this.world = new World(this.scene);

        // Build the labyrinth (procedurally generated)
        this.levelManager = new LevelManager(41);
        this.levelManager.buildMaze(this.scene);

        // Update shadow camera bounds to cover the entire maze
        const mazeWorldSize = this.levelManager.cols * CELL_SIZE;
        this.updateShadowBounds(mazeWorldSize);

        // Instantiate the Player and pass the required dependencies
        this.player = new Player(this.camera, this.inputManager, this.scene);

        // Place the player at a safe spawn point inside the maze
        this.player.setSpawnPosition(this.levelManager.getSpawnPosition(PLAYER_HEIGHT));

        // Give the player the wall colliders so physics can resolve collisions
        this.player.setColliders(this.levelManager.colliders);

        // Create the minimap
        const mazeResult = this.levelManager.getMazeResult();
        this.minimap = new Minimap(
            mazeResult.grid,
            mazeResult.size,
            mazeResult.center,
            mazeResult.spawns
        );

        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    /**
     * Update the directional light's shadow camera to cover the full maze.
     */
    private updateShadowBounds(mazeWorldSize: number): void {
        const halfSize = mazeWorldSize / 2;
        this.scene.traverse((obj) => {
            if (obj instanceof THREE.DirectionalLight) {
                obj.position.set(halfSize, 30, halfSize);
                obj.target.position.set(halfSize, 0, halfSize);
                obj.shadow.camera.left = -halfSize;
                obj.shadow.camera.right = halfSize;
                obj.shadow.camera.top = halfSize;
                obj.shadow.camera.bottom = -halfSize;
                obj.shadow.camera.far = 100;
                obj.shadow.camera.updateProjectionMatrix();
            }
        });
    }

    private onWindowResize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    public start(): void {
        if (this.isRunning) return;
        this.isRunning = true;
        this.clock.start();
        this.renderer.setAnimationLoop(this.tick.bind(this));
    }

    public stop(): void {
        this.isRunning = false;
        this.renderer.setAnimationLoop(null);
    }

    private tick(): void {
        if (!this.isRunning) return;

        const deltaTime = this.clock.getDelta();

        // Update logic modules
        this.player.update(deltaTime);
        this.world.update(deltaTime);

        // Update the minimap with player position and yaw
        this.minimap.update(
            this.player.body.position.x,
            this.player.body.position.z,
            this.player.body.rotation.y
        );

        // Render the frame
        this.renderer.render(this.scene, this.camera);

        // Clean up per-frame input data (mouse deltas)
        this.inputManager.resetPerFrameData();
    }
}