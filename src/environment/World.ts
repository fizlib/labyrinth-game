import * as THREE from 'three';

export class World {
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.setupLights();
        this.setupFloor();
    }

    private setupLights(): void {
        // Soft white ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // Directional light to cast shadows (like moonlight/sunlight)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(10, 20, 10);

        // Shadow optimizations
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048; // High res shadows for maze walls later
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;

        // Shadow bounds - will need tuning based on maze size
        const d = 20;
        directionalLight.shadow.camera.left = -d;
        directionalLight.shadow.camera.right = d;
        directionalLight.shadow.camera.top = d;
        directionalLight.shadow.camera.bottom = -d;

        this.scene.add(directionalLight);
    }

    private setupFloor(): void {
        // A simple large plane acting as the ground
        const geometry = new THREE.PlaneGeometry(100, 100);

        // Using Standard Material for proper light/shadow interaction
        const material = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });

        const floor = new THREE.Mesh(geometry, material);

        // Rotate flat and position
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;

        // Adding a subtle grid helper for development visual reference
        const gridHelper = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
        gridHelper.position.y = 0.01; // Slightly above floor to prevent z-fighting

        this.scene.add(floor);
        this.scene.add(gridHelper);
    }

    public update(deltaTime: number): void {
        // Animate environment elements here if needed later (e.g. moving clouds, day/night cycle)
    }
}