// src/main.ts
import './style.css';
import { Engine } from './core/Engine';
import { InputManager } from './input/InputManager';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    // Initialize the Input Manager
    const inputManager = new InputManager(canvas);

    // Pass the input manager into the core engine
    const engine = new Engine(canvas, inputManager);

    engine.start();
});