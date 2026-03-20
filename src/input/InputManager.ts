// src/input/InputManager.ts

export class InputManager {
    // Semantic key mappings stored efficiently as booleans
    public keys = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        run: false,
    };

    // Raw mouse data
    public mouse = {
        movementX: 0,
        movementY: 0,
        locked: false,
    };

    private canvas: HTMLCanvasElement;

    // We bind the methods to 'this' so we can safely add and remove them from event listeners
    private onKeyDownBound = this.onKeyDown.bind(this);
    private onKeyUpBound = this.onKeyUp.bind(this);
    private onCanvasClickBound = this.onCanvasClick.bind(this);
    private onPointerLockChangeBound = this.onPointerLockChange.bind(this);
    private onMouseMoveBound = this.onMouseMove.bind(this);

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.init();
    }

    private init(): void {
        // Keyboard events attached to the window
        window.addEventListener('keydown', this.onKeyDownBound);
        window.addEventListener('keyup', this.onKeyUpBound);

        // Pointer lock requires a user gesture (like a click)
        this.canvas.addEventListener('click', this.onCanvasClickBound);
        document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
    }

    private onKeyDown(event: KeyboardEvent): void {
        this.setKey(event.code, true);
    }

    private onKeyUp(event: KeyboardEvent): void {
        this.setKey(event.code, false);
    }

    private setKey(code: string, isPressed: boolean): void {
        switch (code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = isPressed;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = isPressed;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = isPressed;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = isPressed;
                break;
            case 'Space':
                this.keys.jump = isPressed;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.run = isPressed;
                break;
        }
    }

    private onCanvasClick(): void {
        if (!this.mouse.locked) {
            this.canvas.requestPointerLock();
        }
    }

    private onPointerLockChange(): void {
        if (document.pointerLockElement === this.canvas) {
            this.mouse.locked = true;
            // Only listen to mouse movement when the pointer is locked
            document.addEventListener('mousemove', this.onMouseMoveBound);
        } else {
            this.mouse.locked = false;
            document.removeEventListener('mousemove', this.onMouseMoveBound);
            // Safety reset
            this.mouse.movementX = 0;
            this.mouse.movementY = 0;
        }
    }

    private onMouseMove(event: MouseEvent): void {
        if (this.mouse.locked) {
            // Accumulate movement. We will reset this at the end of the game loop tick.
            this.mouse.movementX += event.movementX;
            this.mouse.movementY += event.movementY;
        }
    }

    /**
     * MUST be called at the very end of the engine's render loop
     * to prevent continuous phantom mouse movement.
     */
    public resetPerFrameData(): void {
        this.mouse.movementX = 0;
        this.mouse.movementY = 0;
    }

    /**
     * Prevents memory leaks by cleaning up all event listeners
     */
    public dispose(): void {
        window.removeEventListener('keydown', this.onKeyDownBound);
        window.removeEventListener('keyup', this.onKeyUpBound);
        this.canvas.removeEventListener('click', this.onCanvasClickBound);
        document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
        document.removeEventListener('mousemove', this.onMouseMoveBound);
    }
}