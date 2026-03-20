import './style.css'; // Add a basic reset here (margin: 0, overflow: hidden)
import { Engine } from './core/Engine';

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);

    // Initialize the core engine
    const engine = new Engine(canvas);

    // Start the game loop
    engine.start();
});