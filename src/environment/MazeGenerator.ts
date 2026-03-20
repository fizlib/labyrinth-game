// src/environment/MazeGenerator.ts

/**
 * Procedural labyrinth generator with 4-fold rotational symmetry.
 *
 * Algorithm:
 * 1. Create an odd-sized grid filled with walls.
 * 2. Generate corridors in the top-left quadrant using iterative backtracking.
 * 3. Mirror the quadrant across both axes to produce perfect symmetry.
 * 4. Carve a central room and L-shaped bridge connectors from each quadrant.
 * 5. Place 4 spawn points symmetrically (one per quadrant corner).
 * 6. BFS-validate that all spawns connect to the center.
 */

export interface MazeCell {
    row: number;
    col: number;
}

export interface MazeResult {
    /** 2D grid: 1 = wall, 0 = floor */
    grid: number[][];
    /** Size of the grid (rows === cols === size) */
    size: number;
    /** Centre cell of the maze */
    center: MazeCell;
    /** 4 team spawn cells, one per quadrant */
    spawns: MazeCell[];
}

// Direction vectors for maze carving — move by 2 to keep walls between corridors
const DIRECTIONS: [number, number][] = [
    [-2, 0], // up
    [2, 0],  // down
    [0, -2], // left
    [0, 2],  // right
];

/**
 * Generate a symmetric maze.
 * @param size Grid dimension (will be forced to the nearest odd number ≥ 21).
 */
export function generateMaze(size: number = 41): MazeResult {
    size = Math.max(21, size % 2 === 0 ? size + 1 : size);

    // Try up to 30 times (practically succeeds on 1st attempt)
    for (let attempt = 0; attempt < 30; attempt++) {
        const result = buildMaze(size);
        if (result) return result;
    }

    // Should never reach here, but satisfy the type system
    throw new Error('MazeGenerator: failed to generate a connected maze after 30 attempts');
}

function buildMaze(size: number): MazeResult | null {
    // ── 1. Fill entire grid with walls ──────────────────────────────────
    const grid: number[][] = [];
    for (let r = 0; r < size; r++) {
        grid[r] = [];
        for (let c = 0; c < size; c++) {
            grid[r][c] = 1;
        }
    }

    const mid = Math.floor(size / 2); // centre index (e.g. 20 for size 41)
    const roomHalf = 2;               // central room is (2*roomHalf+1)² = 5×5

    // The carved quadrant region spans odd indices [1 .. qMax] × [1 .. qMax]
    const qMax = mid - roomHalf - 1;  // e.g. 17

    // ── 2. Iterative backtracking in the top-left quadrant ─────────────
    const visited: boolean[][] = [];
    for (let r = 0; r < size; r++) {
        visited[r] = [];
        for (let c = 0; c < size; c++) {
            visited[r][c] = false;
        }
    }

    // Start at (1,1)
    visited[1][1] = true;
    grid[1][1] = 0;
    const stack: MazeCell[] = [{ row: 1, col: 1 }];

    while (stack.length > 0) {
        const current = stack[stack.length - 1];

        // Gather unvisited odd-indexed neighbours within the quadrant
        const neighbours: [number, number][] = [];
        for (const [dr, dc] of DIRECTIONS) {
            const nr = current.row + dr;
            const nc = current.col + dc;
            if (nr >= 1 && nr <= qMax && nc >= 1 && nc <= qMax && !visited[nr][nc]) {
                neighbours.push([nr, nc]);
            }
        }

        if (neighbours.length === 0) {
            stack.pop(); // backtrack
        } else {
            // Pick a random neighbour
            const idx = Math.floor(Math.random() * neighbours.length);
            const [nr, nc] = neighbours[idx];

            // Carve the wall between current and neighbour
            grid[current.row + (nr - current.row) / 2][current.col + (nc - current.col) / 2] = 0;

            // Carve the neighbour cell
            visited[nr][nc] = true;
            grid[nr][nc] = 0;
            stack.push({ row: nr, col: nc });
        }
    }

    // ── 3. Mirror top-left quadrant → all 4 quadrants ──────────────────
    // Copy [0..mid-1] × [0..mid-1] to the other three quadrants
    for (let r = 0; r < mid; r++) {
        for (let c = 0; c < mid; c++) {
            const v = grid[r][c];
            grid[r][size - 1 - c] = v;            // top-right
            grid[size - 1 - r][c] = v;            // bottom-left
            grid[size - 1 - r][size - 1 - c] = v; // bottom-right
        }
    }

    // ── 4. Carve the central room (5×5) ────────────────────────────────
    for (let r = mid - roomHalf; r <= mid + roomHalf; r++) {
        for (let c = mid - roomHalf; c <= mid + roomHalf; c++) {
            grid[r][c] = 0;
        }
    }

    // ── 5. Bridge each quadrant's corner to the central room ───────────
    // After mirroring, the 4 carved-corner cells closest to the room are:
    //   TL: (qMax, qMax)  →  room corner (mid-roomHalf, mid-roomHalf)
    //   TR: (qMax, size-1-qMax) → room corner (mid-roomHalf, mid+roomHalf)
    //   BL: (size-1-qMax, qMax) → room corner (mid+roomHalf, mid-roomHalf)
    //   BR: (size-1-qMax, size-1-qMax) → room corner (mid+roomHalf, mid+roomHalf)
    //
    // We carve an L-shaped connector between them (2 cells to bridge the gap).
    const roomTop = mid - roomHalf;     // 18
    const roomBot = mid + roomHalf;     // 22
    const roomLeft = mid - roomHalf;    // 18
    const roomRight = mid + roomHalf;   // 22
    const qMirror = size - 1 - qMax;   // bottom / right quadrant edge (e.g. 23)

    // Top-left connector: carve from (qMax, qMax) → right → down to room
    carveLine(grid, qMax, qMax + 1, qMax, roomLeft, 'horizontal');   // row qMax, cols qMax+1..roomLeft
    carveLine(grid, qMax, roomTop - 1, roomLeft, roomLeft, 'vertical');  // col roomLeft, rows qMax..roomTop-1

    // Top-right connector: carve from (qMax, qMirror) → left → down to room
    carveLine(grid, qMax, qMirror - 1, qMax, roomRight, 'horizontal');
    carveLine(grid, qMax, roomTop - 1, roomRight, roomRight, 'vertical');

    // Bottom-left connector: carve from (qMirror, qMax) → right → up to room
    carveLine(grid, qMirror, qMax + 1, qMirror, roomLeft, 'horizontal');
    carveLine(grid, roomBot + 1, qMirror, roomLeft, roomLeft, 'vertical');

    // Bottom-right connector: carve from (qMirror, qMirror) → left → up to room
    carveLine(grid, qMirror, qMirror - 1, qMirror, roomRight, 'horizontal');
    carveLine(grid, roomBot + 1, qMirror, roomRight, roomRight, 'vertical');

    // ── 6. Seal the outer perimeter ────────────────────────────────────
    for (let i = 0; i < size; i++) {
        grid[0][i] = 1;
        grid[size - 1][i] = 1;
        grid[i][0] = 1;
        grid[i][size - 1] = 1;
    }

    // ── 7. Place 4 symmetric spawn points (nearest walkable cell to each corner)
    const spawns: MazeCell[] = [
        findSpawn(grid, 1, 1, size),
        findSpawn(grid, 1, size - 2, size),
        findSpawn(grid, size - 2, 1, size),
        findSpawn(grid, size - 2, size - 2, size),
    ];

    // ── 8. Validate connectivity ───────────────────────────────────────
    const centerCell: MazeCell = { row: mid, col: mid };
    if (!validateConnectivity(grid, centerCell, spawns)) {
        return null;
    }

    return { grid, size, center: centerCell, spawns };
}

// ── Helper: carve a straight line of floor cells ───────────────────────

function carveLine(
    grid: number[][],
    r1: number, r2: number,
    c1: number, c2: number,
    _direction: 'horizontal' | 'vertical'
): void {
    const rMin = Math.min(r1, r2);
    const rMax = Math.max(r1, r2);
    const cMin = Math.min(c1, c2);
    const cMax = Math.max(c1, c2);

    for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
            grid[r][c] = 0;
        }
    }
}

// ── Helper: find the nearest walkable cell to a corner ─────────────────

function findSpawn(grid: number[][], startRow: number, startCol: number, size: number): MazeCell {
    const vis: boolean[][] = [];
    for (let r = 0; r < size; r++) {
        vis[r] = [];
        for (let c = 0; c < size; c++) {
            vis[r][c] = false;
        }
    }

    const queue: MazeCell[] = [{ row: startRow, col: startCol }];
    vis[startRow][startCol] = true;

    while (queue.length > 0) {
        const cell = queue.shift()!;
        if (grid[cell.row][cell.col] === 0) return cell;

        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nr = cell.row + dr;
            const nc = cell.col + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && !vis[nr][nc]) {
                vis[nr][nc] = true;
                queue.push({ row: nr, col: nc });
            }
        }
    }

    return { row: startRow, col: startCol };
}

// ── Helper: BFS from center to verify all spawns are reachable ─────────

function validateConnectivity(grid: number[][], center: MazeCell, spawns: MazeCell[]): boolean {
    const size = grid.length;
    const vis: boolean[][] = [];
    for (let r = 0; r < size; r++) {
        vis[r] = [];
        for (let c = 0; c < size; c++) {
            vis[r][c] = false;
        }
    }

    const queue: MazeCell[] = [center];
    vis[center.row][center.col] = true;

    while (queue.length > 0) {
        const cell = queue.shift()!;
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nr = cell.row + dr;
            const nc = cell.col + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && !vis[nr][nc] && grid[nr][nc] === 0) {
                vis[nr][nc] = true;
                queue.push({ row: nr, col: nc });
            }
        }
    }

    return spawns.every(s => vis[s.row][s.col]);
}
