// src/core/Engine.ts
import * as THREE from 'three';
import { World } from '../environment/World';
import { InputManager } from '../input/InputManager';
import { Player } from '../entities/Player'; // Import the new Player class

export class Engine {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    private world: World;
    private clock: THREE.Clock;
    private isRunning: boolean = false;

    private inputManager: InputManager;
    private player: Player; // Add player reference

    constructor(canvas: HTMLCanvasElement, inputManager: InputManager) {
        this.inputManager = inputManager;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this.scene.fog = new THREE.FogExp2(0x111111, 0.02);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // NOTE: We removed camera.position.set() and camera.lookAt() here.
        // The Player class now dictates where the camera is and where it looks.

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.clock = new THREE.Clock();
        this.world = new World(this.scene);

        // Instantiate the Player and pass the required dependencies
        this.player = new Player(this.camera, this.inputManager, this.scene);

        window.addEventListener('resize', this.onWindowResize.bind(this));
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

        // Render the frame
        this.renderer.render(this.scene, this.camera);

        // Clean up per-frame input data (mouse deltas)
        this.inputManager.resetPerFrameData();
    }
}