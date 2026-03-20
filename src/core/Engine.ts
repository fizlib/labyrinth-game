// src/core/Engine.ts
import * as THREE from 'three';
import { World } from '../environment/World';
import { InputManager } from '../input/InputManager';

export class Engine {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    private world: World;
    private clock: THREE.Clock;
    private isRunning: boolean = false;

    // Add reference to our InputManager
    private inputManager: InputManager;

    constructor(canvas: HTMLCanvasElement, inputManager: InputManager) {
        this.inputManager = inputManager;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111);
        this.scene.fog = new THREE.FogExp2(0x111111, 0.02);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.clock = new THREE.Clock();
        this.world = new World(this.scene);

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

        // -------------------------------------------------------------
        // TEMPORARY CONSOLE LOG (To prove InputManager works)
        // -------------------------------------------------------------
        if (this.inputManager.keys.forward || this.inputManager.mouse.movementX !== 0) {
            console.log(`W Key: ${this.inputManager.keys.forward} | Mouse Delta X: ${this.inputManager.mouse.movementX}, Y: ${this.inputManager.mouse.movementY}`);
        }

        this.world.update(deltaTime);
        this.renderer.render(this.scene, this.camera);

        // -------------------------------------------------------------
        // FRAME CLEANUP: Reset mouse deltas for the next frame
        // -------------------------------------------------------------
        this.inputManager.resetPerFrameData();
    }
}