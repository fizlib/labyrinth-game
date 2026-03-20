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
}

const DEFAULT_CONFIG: Required<MinimapConfig> = {
    canvasSize: 220,
    wallColor: '#1a1a2e',
    floorColor: '#16213e',
    centerColor: '#e2b714',
    spawnColor: '#e74c3c',
    playerColor: '#00ff88',
    directionColor: '#00ff88',
};

export class Minimap {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
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

        // Create and style the canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.canvasSize;
        this.canvas.height = this.config.canvasSize;
        this.canvas.classList.add('minimap-canvas');
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d')!;

        // Draw the static maze layer once
        this.drawMaze();
    }

    /**
     * Draw the static maze grid (walls, floor, center, spawns).
     * Called once at initialization.
     */
    private drawMaze(): void {
        const { ctx, cellPx, mazeSize, config } = this;

        for (let r = 0; r < mazeSize; r++) {
            for (let c = 0; c < mazeSize; c++) {
                const isWall = this.mazeGrid[r][c] === 1;

                // Determine color
                if (isWall) {
                    ctx.fillStyle = config.wallColor;
                } else if (this.isCenterRoom(r, c)) {
                    ctx.fillStyle = config.centerColor;
                } else {
                    ctx.fillStyle = config.floorColor;
                }

                ctx.fillRect(c * cellPx, r * cellPx, cellPx + 0.5, cellPx + 0.5);
            }
        }

        // Draw spawn markers
        for (const spawn of this.spawns) {
            ctx.fillStyle = config.spawnColor;
            const spawnPx = Math.max(cellPx * 1.5, 4);
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

    /**
     * Check if a cell is part of the central room (5×5 area).
     */
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
     * @param worldX Player's X position in world units
     * @param worldZ Player's Z position in world units
     * @param yaw Player's Y-axis rotation in radians
     */
    public update(worldX: number, worldZ: number, yaw: number): void {
        const { ctx, cellPx, config } = this;

        // Redraw the maze (clears old player dot)
        this.drawMaze();

        // Convert world position to minimap pixel position
        const mazeCol = worldX / CELL_SIZE;
        const mazeRow = worldZ / CELL_SIZE;

        const px = mazeCol * cellPx;
        const py = mazeRow * cellPx;

        // Draw direction indicator (line showing facing)
        const dirLength = Math.max(cellPx * 3, 8);
        const dirEndX = px + Math.sin(yaw) * dirLength;  // sin because Three.js yaw
        const dirEndY = py - Math.cos(yaw) * dirLength;  // -cos for forward (-Z in Three.js)

        ctx.strokeStyle = config.directionColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(dirEndX, dirEndY);
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Draw player dot
        const dotRadius = Math.max(cellPx * 1.2, 3);
        ctx.fillStyle = config.playerColor;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Outer glow ring
        ctx.strokeStyle = config.playerColor;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    /**
     * Remove the minimap from the DOM.
     */
    public dispose(): void {
        this.canvas.remove();
    }
}
