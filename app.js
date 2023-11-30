const { Engine, Render, World, Bodies, Events, Runner } = Matter;
const synth = new Tone.Synth().toDestination();
const polySynth = new Tone.PolySynth().toDestination();

// Dimensions of the canvas
let width;
let height;

// instructions
const instructions = document.getElementById('instructions');
const instructionsButton = document.getElementById('show-instructions-button');

// reset button
const resetButton = document.getElementById('reset-button');

// Get DOM elements for user note inputs
const particleCountInput = document.getElementById('particle-count');
const noteInput = document.getElementById('note-input');
const addParticleButton = document.getElementById('add-particle-button');
const particleSizeInput = document.getElementById('particle-size');

const canvas = document.getElementById('my-canvas');

// Get DOM elements for user input conditions
const volumeInput = document.getElementById('volume');
const temperatureInput = document.getElementById('temperature');

// create particle color map
const hues = {
    "C": 0,
    "C#": 30,
    "Db": 30,
    "D": 60,
    "D#": 90,
    "Eb": 90,
    "E": 120,
    "F": 150,
    "F#": 180,
    "Gb": 180,
    "G": 210,
    "G#": 240,
    "Ab": 240,
    "A": 270,
    "A#": 300,
    "Bb": 300,
    "B": 330,
};

// create saturation map that depends on the octave
const saturations = {
    0: 100,
    1: 80,
    2: 60,
    3: 40,
    4: 20,
    5: 0,
    6: 0,
    7: 0,
    8: 0,
};

// Store the user input conditions
let volume = parseFloat(volumeInput.value);
let temperature = parseFloat(temperatureInput.value);

// Store particle labels
const particleLabel = 'particle';

// Store particles and their corresponding notes
let particles = [];

// Store walls
let walls = [];

// Create an engine with no gravity
const engine = Engine.create({ 
    gravity: { x: 0, y: 0 } 
});

// Create a renderer
let render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: width, // Set your desired canvas width
        height: height, // Set your desired canvas height
        wireframes: false, // Show solid shapes
        background: '#dcdcdc', // Set the canvas background color
    }
});

// This line of code is necessary to prevent the particles from sticking to the walls
Matter.Resolver._restingThresh = 0.001;

// HELPER FUNCTIONS

// Draw walls around the canvas
// Draw a border around the canvas
function drawWalls() {
    const Bodies = Matter.Bodies;
    const margin = 1;
    const wallOptions = {
        isStatic: true,
        restitution: 1, // Perfectly elastic collisions
        friction: 0, // No friction
        frictionAir: 0, // No air friction
        frictionStatic: 0, // No static friction
        inertia: Infinity, // Infinite mass
        render: {
            fillStyle: '#007bff',
            strokeStyle: '#007bff',
            lineWidth: 3,
        },
    };

    return [
        // Bottom wall
        Bodies.rectangle(
            // x, y
            0, height,
            // width, height
            width * 2, margin,
            wallOptions
        ),
        // right wall
        Bodies.rectangle(
            // x, y
            width, 0,
            // width, height
            margin, height * 2,
            wallOptions
        ),
        // top wall
        Bodies.rectangle(
            // x, y
            0, 0,
            // width, height
            width * 2, margin,
            wallOptions
        ),
        // left wall
        Bodies.rectangle(
            // x, y
            0, 0,
            // width, height
            margin, height * 2,
            wallOptions
        ),
    ];
};

function calculateSpeed(temperature) {
    return 0.05 * temperature
};

function getGasParameters() {
    volume = parseFloat(volumeInput.value);
    temperature = parseFloat(temperatureInput.value);
}

function setParticleSpeed(p, temperature) {
    const speed = calculateSpeed(temperature);

    let vx = p.velocity.x;
    let vy = p.velocity.y;
    let currentSpeed = p.speed;

    if (currentSpeed === 0) {
        let direction = Math.random() * 2 * Math.PI;
        
        vx = speed * Math.cos(direction);
        vy = speed * Math.sin(direction);
    } else {
        // Calculate the ratio of the new speed to the current speed
        const speedRatio = speed / currentSpeed;

        // Scale the current velocity vector to the new speed while maintaining direction
        vx *= speedRatio;
        vy *= speedRatio;
    }

    Matter.Body.setVelocity(p, { x: vx, y: vy });
}

function updateCanvasSize() {
    width = Math.sqrt(volume) * 70;
    height = Math.sqrt(volume) * 70;

    // Update the canvas size
    render.options.width = width;
    render.options.height = height;
    
    // Update the canvas element size
    render.canvas.width = width;
    render.canvas.height = height;

    // Update the canvas bounds
    render.bounds.max.x = width;
    render.bounds.max.y = height;

    // Update the walls
    World.remove(engine.world, walls);
    walls = drawWalls();
    World.add(engine.world, walls);

    // Update the canvas
    Render.run(render); // Ensure that this line is correctly called to render the particles
}

// EVENT LISTENERS

// Listen for collisions with other particles and play chords
Events.on(engine, 'collisionStart', function(event) {
    let collidingParticles = [];

    let pairs = event.pairs;
    for (let i = 0; i < pairs.length; i++) {
        let pair = pairs[i];

        // Check if a collision involves particles
        if (pair.bodyA.label === particleLabel && pair.bodyB.label === particleLabel) {
            collidingParticles.push(pair.bodyA.note);
            collidingParticles.push(pair.bodyB.note);
        } else if (pair.bodyA.label === particleLabel && walls.includes(pair.bodyB)) {
            collidingParticles.push(pair.bodyA.note);
        } else if (pair.bodyB.label === particleLabel && walls.includes(pair.bodyA)) {
            // Particle-wall collision
            collidingParticles.push(pair.bodyB.note);
        }
    }

    if (collidingParticles.length === 1) {
        synth.triggerAttackRelease(collidingParticles[0], '8n');
    } else if (collidingParticles.length > 1) {
        // Play a chord with all the notes of the colliding particles using PolySynth
        polySynth.triggerAttackRelease(collidingParticles, '8n');
    }
});


// Event listener for adding particles based on user input
addParticleButton.addEventListener('click', function() {
    const count = parseInt(particleCountInput.value);
    const note = noteInput.value.trim(); // Get the note input and remove leading/trailing spaces
    const particleSize = parseInt(particleSizeInput.value);

    // get the hue and saturation for the particle
    const hue = hues[note.slice(0, -1)];
    const octave = parseInt(note.slice(-1));
    const saturation = saturations[octave];
    
    if (count && note) {
        for (let i = 0; i < count; i++) {
            const particle = Bodies.circle(
                Math.random() * width, // Random X position
                Math.random() * height, // Random Y position
                particleSize, // Initial particle radius
                {
                    frictionAir: 0, // No air friction
                    friction: 0, // No friction
                    restitution: 1, // Perfectly elastic collisions
                    frictionStatic: 0, // No static friction
                    inertia: Infinity, // Infinite mass
                    label: particleLabel, // Label the particle
                    render: {
                        fillStyle: `hsl(${hue}, ${saturation}%, 50%)`,
                        strokeStyle: `hsl(${hue}, ${saturation}%, 50%)`,
                        lineWidth: 2,
                    },
                }
            );

            setParticleSpeed(particle, temperature);

            Matter.Body.setMass(particle, 1000); // Set the particle mass to 0

            particle.note = note; // Assign the user-input note to the particle
            
            particles.push(particle);
            World.add(engine.world, particle);
        }
    }
});

// Event listener for showing/hiding instructions
instructionsButton.addEventListener('click', function() {
    if (instructions.style.display === 'none') {
        instructions.style.display = 'block';
        instructionsButton.innerText = 'Hide Instructions';
    } else {
        instructions.style.display = 'none';
        instructionsButton.innerText = 'Show Instructions';
    }
});

// Event listener for resetting the simulation
resetButton.addEventListener('click', function() {
    // Remove all particles from the world
    World.remove(engine.world, particles);

    // Reset the particles array
    particles = [];
});

// Event listener for changing the canvas size based on user input for volume
volumeInput.addEventListener('input', function() {
    volume = parseFloat(volumeInput.value);
    updateCanvasSize(volume);
});

temperatureInput.addEventListener("input", function() {
    temperature = parseFloat(temperatureInput.value);
});

// Run setParticleSpeed on each particle before update to ensure that the particles are moving at the correct speed
Events.on(engine, 'beforeUpdate', function(e) {
    particles.forEach(function(p) {
        setParticleSpeed(p, temperature);
    });
});

// on document load
window.addEventListener('load', function() {
    getGasParameters();

    updateCanvasSize();

    // Run the renderer
    Render.run(render);

    // Run the engine
    Runner.run(engine);
});
