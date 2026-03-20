// src/ui/Minimap.ts

import { CELL_SIZE } from '../environment/LevelManager';

export interface MinimapConfig {
    /** Canvas size in pixels (square) */
    canvasSize?: number;
    /** Color for wall cells */
    wallColor?: string;
    /** Color for floor cells */
    floorColor?: string;
    /** Color for the central room */
    centerColor?: string;
    /** Color for spawn markers */
    spawnColor?: string;
    /** Color for the player dot */
    playerColor?: string;
    /** Color for the player direction indicator */
    directionColor?: string;
    /** Color for the player field-of-view cone */
    viewConeColor?: string;
}

const DEFAULT_CONFIG: Required<MinimapConfig> = {
    canvasSize: 220,
    // UI IMPROVEMENTS: Higher contrast. Transparent floor allows the CSS 
    // background-color (rgba(0,0,0, 0.6)) to show through beautifully.
    wallColor: 'rgba(200, 220, 255, 0.8)', // Frosted bright blue/white
    floorColor: 'transparent',
    centerColor: 'rgba(226, 183, 20, 0.4)', // Semi-transparent gold
    spawnColor: 'rgba(231, 76, 60, 0.9)',
    playerColor: '#00ff88',
    directionColor: '#00ff88',
    viewConeColor: 'rgba(0, 255, 136, 0.25)', // Transparent neon green
};

export class Minimap {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    // An offscreen canvas to cache the static maze (Improves performance)
    private staticMapCanvas: HTMLCanvasElement;

    private config: Required<MinimapConfig>;

    private mazeGrid: number[][];
    private mazeSize: number;
    private cellPx: number; // pixels per maze cell on the minimap

    private centerRow: number;
    private centerCol: number;
    private spawns: { row: number; col: number }[];

    constructor(
        mazeGrid: number[][],
        mazeSize: number,
        center: { row: number; col: number },
        spawns: { row: number; col: number }[],
        config?: MinimapConfig
    ) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.mazeGrid = mazeGrid;
        this.mazeSize = mazeSize;
        this.centerRow = center.row;
        this.centerCol = center.col;
        this.spawns = spawns;
        this.cellPx = this.config.canvasSize / this.mazeSize;

        // Create and style the main canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.canvasSize;
        this.canvas.height = this.config.canvasSize;
        this.canvas.classList.add('minimap-canvas');
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d')!;

        // Initialize the offscreen static map
        this.staticMapCanvas = document.createElement('canvas');
        this.staticMapCanvas.width = this.config.canvasSize;
        this.staticMapCanvas.height = this.config.canvasSize;

        // Render the static parts of the map ONCE
        this.drawStaticMaze();
    }

    /**
     * Renders the static maze to an offscreen canvas to save frame budget.
     */
    private drawStaticMaze(): void {
        const ctx = this.staticMapCanvas.getContext('2d')!;
        const { cellPx, mazeSize, config } = this;

        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                const isWall = this.mazeGrid[r][c] === 1;

                if (isWall) {
                    ctx.fillStyle = config.wallColor;
                    ctx.fillRect(c * cellPx, r * cellPx, cellPx + 0.5, cellPx + 0.5);
                } else if (this.isCenterRoom(r, c)) {
                    ctx.fillStyle = config.centerColor;
                    ctx.fillRect(c * cellPx, r * cellPx, cellPx + 0.5, cellPx + 0.5);
                } else if (config.floorColor !== 'transparent' && config.floorColor !== 'rgba(0,0,0,0)') {
                    // Only draw floors if it's not transparent
                    ctx.fillStyle = config.floorColor;
                    ctx.fillRect(c * cellPx, r * cellPx, cellPx + 0.5, cellPx + 0.5);
                }
            }
        }

        // Draw spawn markers
        for (const spawn of this.spawns) {
            ctx.fillStyle = config.spawnColor;
            const spawnPx = Math.max(cellPx * 1.5, 3);
            ctx.beginPath();
            ctx.arc(
                spawn.col * cellPx + cellPx / 2,
                spawn.row * cellPx + cellPx / 2,
                spawnPx,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    private isCenterRoom(row: number, col: number): boolean {
        const roomHalf = 2;
        return (
            row >= this.centerRow - roomHalf &&
            row <= this.centerRow + roomHalf &&
            col >= this.centerCol - roomHalf &&
            col <= this.centerCol + roomHalf
        );
    }

    /**
     * Called every frame to update the player's position and facing on the minimap.
     */
    public update(worldX: number, worldZ: number, yaw: number): void {
        const { ctx, cellPx, config } = this;

        // Clear the main canvas and redraw the cached static map
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.staticMapCanvas, 0, 0);

        // Convert world position to minimap pixel position
        const mazeCol = worldX / CELL_SIZE;
        const mazeRow = worldZ / CELL_SIZE;

        const px = mazeCol * cellPx;
        const py = mazeRow * cellPx;

        // --- FIXING THE ROTATION ---
        // Canvas 0 angle points RIGHT (+X). Three.js 0 yaw points FORWARD (-Z).
        // A forward view on the canvas is UP (-Y), which corresponds to -Math.PI / 2.
        // We subtract the `yaw` so that left/right turns map perfectly to 2D counter-clockwise rotations.
        const canvasAngle = -Math.PI / 2 - yaw;

        // 1. Draw View Cone (FOV)
        const viewRadius = Math.max(cellPx * 5, 20); // Length of the cone
        const fov = Math.PI / 2.5; // About 72 degrees wide

        ctx.fillStyle = config.viewConeColor;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.arc(px, py, viewRadius, canvasAngle - fov / 2, canvasAngle + fov / 2);
        ctx.closePath();
        ctx.fill();

        // 2. Draw Direction Indicator Line
        const dirLength = Math.max(cellPx * 2, 8);
        const dirEndX = px + Math.cos(canvasAngle) * dirLength;
        const dirEndY = py + Math.sin(canvasAngle) * dirLength;

        ctx.strokeStyle = config.directionColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(dirEndX, dirEndY);
        ctx.stroke();

        // 3. Draw Player Dot
        const dotRadius = Math.max(cellPx * 1.2, 3);
        ctx.fillStyle = config.playerColor;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Outer glow ring
        ctx.strokeStyle = config.playerColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    public dispose(): void {
        this.canvas.remove();
        this.staticMapCanvas.remove();
    }
}