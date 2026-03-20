import * as THREE from 'three';
import { World } from '../environment/World';

export class Engine {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;

    private world: World;
    private clock: THREE.Clock;
    private isRunning: boolean = false;

    constructor(canvas: HTMLCanvasElement) {
        // 1. Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x111111); // Dark atmospheric background
        this.scene.fog = new THREE.FogExp2(0x111111, 0.02); // Good for labyrinth atmosphere

        // 2. Camera Setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);

        // 3. Renderer Setup (Optimized)
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'high-performance' // Hints browser to use dedicated GPU
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Cap pixel ratio to 2 for performance on high-DPI (Retina) screens
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Modern lighting/color configurations
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 4. Initialize Utilities
        this.clock = new THREE.Clock();

        // 5. Build the static environment
        this.world = new World(this.scene);

        // 6. Event Listeners
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

        // Calculate delta time (time between frames)
        const deltaTime = this.clock.getDelta();

        // TODO: In the future, pass deltaTime to state/physics updates here
        // this.gameState.update(deltaTime);
        this.world.update(deltaTime);

        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}