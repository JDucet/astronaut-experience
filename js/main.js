// Scene, Camera, Renderer
let scene, camera, renderer;
let astronautController;
let photoSpawner;
let photos = [];
let notes = [];
let selectedPhoto = null;

// Game State
let gameState = {
    inLocation: false,
    currentLocation: null,
    previousCameraPos: new THREE.Vector3(),
    previousCameraRot: new THREE.Euler(),
    transitionProgress: 0,
    isTransitioning: false
};

// FPS Counter
let fpsCounter = { frames: 0, lastTime: Date.now(), fps: 60 };

// New Feature Variables
let particleTrails = [];
let atmosphericEffectColor = new THREE.Color(0x000000);
let photoTrailParticles = [];
let globalAudioContext = null;
let nebulaPlanes = [];
let comets = [];
let composer = null;
let bloomPass = null;

// Debug logging
console.log('Script loaded');

// ========== UTILITY FUNCTIONS ==========
function computeHeartPosition(index, total, scale, depthAmp) {
    const t = (index / total) * Math.PI * 2;
    const x = scale * 16 * Math.pow(Math.sin(t), 3);
    const y = scale * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    const z = Math.cos(t) * depthAmp + Math.sin(t * 2) * (depthAmp * 0.25);
    return new THREE.Vector3(x, y, z);
}
function initAudioContext() {
    if (!globalAudioContext) {
        globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return globalAudioContext;
}

function playAmbientAudio() {
    try {
        const ctx = initAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.frequency.setValueAtTime(40, ctx.currentTime);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    } catch(e) { console.log('Audio not available'); }
}

function createParticleBurst(position, color = 0x00ff88) {
    const particleCount = 25;
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount;
        const velocity = new THREE.Vector3(
            Math.cos(angle) * (Math.random() * 3 + 2),
            (Math.random() - 0.5) * 4,
            Math.sin(angle) * (Math.random() * 3 + 2)
        );
        
        const particle = {
            pos: position.clone(),
            vel: velocity,
            life: 1.0,
            size: Math.random() * 2 + 1,
            color: new THREE.Color(color),
        };
        particleTrails.push(particle);
    }
}

function updateParticles() {
    particleTrails = particleTrails.filter(p => {
        p.life -= 0.01;
        p.pos.add(p.vel);
        p.vel.multiplyScalar(0.96);
        return p.life > 0;
    });
}

function setupUIEventListeners() {
    // Screenshot button - only add if element exists
    const screenshotBtn = document.getElementById('screenshot-btn');
    if (screenshotBtn) {
        screenshotBtn.addEventListener('click', () => {
            renderer.render(scene, camera);
            const link = document.createElement('a');
            link.download = `astronaut-${Date.now()}.png`;
            link.href = renderer.domElement.toDataURL();
            link.click();
        });
    }
}

// ========== LOCATION/SCENE SYSTEM ==========

// ...existing code...

// Scene initialization
function init() {
    console.log('Init starting');
    
    // Check if THREE is available
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded!');
        document.body.innerHTML = '<h1 style="color: white; text-align: center; margin-top: 50px;">ERROR: Three.js failed to load. Check your internet connection.</h1>';
        return;
    }
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 150, 600);

    console.log('Scene created');

    // Camera setup - First person view
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 5000);
    camera.position.set(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;
    // Tone mapping for better HDR-like look
    if (THREE.ReinhardToneMapping) renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.body.appendChild(renderer.domElement);

    console.log('Renderer created');

    // Hide loading screen
    const loadingScreen = document.getElementById('loading');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }

    // Initialize orbital bodies array first (before setupEnvironment uses it)
    window.orbitalBodies = [];
    
    // Setup components
    setupLighting();
    setupEnvironment();
    setupMusic();

    // Try to initialize post-processing (optional; requires examples to be loaded)
    try {
        if (typeof THREE.EffectComposer !== 'undefined') {
            composer = new THREE.EffectComposer(renderer);
            const renderPass = new THREE.RenderPass(scene, camera);
            composer.addPass(renderPass);
            if (typeof THREE.UnrealBloomPass !== 'undefined') {
                bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85);
                bloomPass.threshold = 0.2;
                bloomPass.strength = 0.7;
                bloomPass.radius = 0.4;
                composer.addPass(bloomPass);
            }
        }
    } catch (e) { console.log('Post-processing init failed', e); composer = null; }
    
    astronautController = new AstronautController(camera);
    photoSpawner = new PhotoSpawner(scene, camera);
    
    // Load photos with placeholder texture
    loadPhotos();
    loadNotes();

    // Input handler
    new InputHandler();

    // Setup new UI and features
    setupUIEventListeners();
    playAmbientAudio();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

function setupLighting() {
    // Ambient light for the space - brighter
    const ambientLight = new THREE.AmbientLight(0x5577ff, 0.6);
    scene.add(ambientLight);

    // Main star light - coming from one direction
    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight1.position.set(80, 60, 100);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    scene.add(dirLight1);

    // Secondary nebula-colored light
    const dirLight2 = new THREE.DirectionalLight(0xff00ff, 0.5);
    dirLight2.position.set(-60, -40, -80);
    scene.add(dirLight2);

    // Tertiary cyan light for contrast
    const dirLight3 = new THREE.DirectionalLight(0x00ffff, 0.4);
    dirLight3.position.set(40, -50, 60);
    scene.add(dirLight3);

    // Point lights for local nebula glow
    const nebulaPurple = new THREE.PointLight(0x7700ff, 0.7, 300);
    nebulaPurple.position.set(-100, 80, 120);
    scene.add(nebulaPurple);

    const nebulaCyan = new THREE.PointLight(0x00ffcc, 0.6, 250);
    nebulaCyan.position.set(120, -60, -100);
    scene.add(nebulaCyan);
}


function setupEnvironment() {
    // Create a realistic sky sphere (gradient) behind everything
    createSkySphere();

    // Create a realistic starfield background
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const posArray = new Float32Array(starCount * 3);
    const colorArray = new Float32Array(starCount * 3);
    const sizeArray = new Float32Array(starCount);

    for (let i = 0; i < starCount * 3; i += 3) {
        posArray[i] = (Math.random() - 0.5) * 2000; // x
        posArray[i + 1] = (Math.random() - 0.5) * 2000; // y
        posArray[i + 2] = (Math.random() - 0.5) * 2000; // z

        // Vary star colors slightly (white, blue, yellow)
        const colorType = Math.random();
        if (colorType < 0.6) {
            // White stars
            colorArray[i] = 1;
            colorArray[i + 1] = 1;
            colorArray[i + 2] = 1;
        } else if (colorType < 0.8) {
            // Blue stars
            colorArray[i] = 0.7;
            colorArray[i + 1] = 0.8;
            colorArray[i + 2] = 1;
        } else {
            // Yellow stars
            colorArray[i] = 1;
            colorArray[i + 1] = 0.9;
            colorArray[i + 2] = 0.6;
        }

        // Vary star brightness (size)
        sizeArray[i / 3] = Math.random() * 2.5 + 0.5;
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));

    const starsMaterial = new THREE.PointsMaterial({
        size: 1.5,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
    });

    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    // Nebula cloud particles
    createCosmicDust();
    
    // Distant planets and stars (in orbits)
    createOrbitalSystem();
    
    // Create the sun (also in orbit)
    registerSunForOrbit();
    
    // Add subtle lights to planets so they illuminate nearby photos
    addPlanetLights();

    // Add nebula clouds and comets
    createNebulaClouds();
    createCometSystem();
}

function createCosmicDust() {
    // Drifting cosmic particles that move and twinkle
    const dustGeometry = new THREE.BufferGeometry();
    const dustCount = 3000;
    const posArray = new Float32Array(dustCount * 3);
    const colorArray = new Float32Array(dustCount * 3);
    const sizeArray = new Float32Array(dustCount);
    const velocityArray = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount * 3; i += 3) {
        posArray[i] = (Math.random() - 0.5) * 1000;
        posArray[i + 1] = (Math.random() - 0.5) * 1000;
        posArray[i + 2] = (Math.random() - 0.5) * 1000;

        // Dust colors - mostly whites, blues, and soft purples
        const val = Math.random();
        if (val < 0.5) {
            colorArray[i] = 0.95;
            colorArray[i + 1] = 0.95;
            colorArray[i + 2] = 1;
        } else if (val < 0.8) {
            colorArray[i] = 0.7;
            colorArray[i + 1] = 0.8;
            colorArray[i + 2] = 1;
        } else {
            colorArray[i] = 0.9;
            colorArray[i + 1] = 0.7;
            colorArray[i + 2] = 1;
        }

        sizeArray[i / 3] = Math.random() * 1 + 0.3;

        // Slow drift velocities
        velocityArray[i] = (Math.random() - 0.5) * 0.05;
        velocityArray[i + 1] = (Math.random() - 0.5) * 0.05;
        velocityArray[i + 2] = (Math.random() - 0.5) * 0.05;
    }

    dustGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    dustGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    dustGeometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));

    const dustMaterial = new THREE.PointsMaterial({
        size: 0.8,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
    });

    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.userData.velocities = velocityArray;
    dust.userData.originalPositions = posArray.slice();
    scene.add(dust);
    window.cosmicDust = dust;
}

function animateCosmicDust() {
    if (!window.cosmicDust) return;
    
    const positions = window.cosmicDust.geometry.attributes.position.array;
    const velocities = window.cosmicDust.userData.velocities;
    const originalPositions = window.cosmicDust.userData.originalPositions;
    
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * 0.5;
        positions[i + 1] += velocities[i + 1] * 0.5;
        positions[i + 2] += velocities[i + 2] * 0.5;
        
        // Wrap around to create infinite drift
        const distance = Math.sqrt(
            positions[i] * positions[i] + 
            positions[i + 1] * positions[i + 1] + 
            positions[i + 2] * positions[i + 2]
        );
        
        if (distance > 600) {
            positions[i] = originalPositions[i];
            positions[i + 1] = originalPositions[i + 1];
            positions[i + 2] = originalPositions[i + 2];
        }
    }
    
    window.cosmicDust.geometry.attributes.position.needsUpdate = true;
}

// ------- Nebula Clouds -------
function createNebulaClouds() {
    const colors = [ [255,80,200], [80,200,255], [200,120,255] ];
    for (let i = 0; i < 4; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // radial gradient nebula texture
        const g = ctx.createRadialGradient(512, 512, 50, 512, 512, 512);
        const c = colors[i % colors.length];
        g.addColorStop(0, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.85)`);
        g.addColorStop(0.4, `rgba(${c[0]}, ${c[1]}, ${c[2]}, 0.35)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0,0,1024,1024);

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;

        // Create layered billboards for parallax depth
        const baseSize = 2000 + Math.random()*800;
        for (let layer = 0; layer < 3; layer++) {
            const layerMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.06 + layer*0.02, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
            const geo = new THREE.PlaneGeometry(baseSize * (1 + layer*0.15), baseSize * 0.7 * (1 + layer*0.12));
            const mesh = new THREE.Mesh(geo, layerMat);
            const zBase = -1000 - Math.random()*1200;
            mesh.position.set((Math.random()-0.5)*2200 * (1 + layer*0.2), (Math.random()-0.5)*500 + 50, zBase - layer*300);
            mesh.rotation.x = Math.PI * 0.5 * (0.12 + layer*0.02);
            mesh.rotation.z = Math.random() * Math.PI * 2;
            mesh.renderOrder = 10 + layer;
            mesh.userData.speed = 0.00001 + Math.random()*0.00003 + layer*0.00001;
            nebulaPlanes.push(mesh);
            scene.add(mesh);
        }
    }
}

function updateNebulaClouds() {
    nebulaPlanes.forEach((p, i) => {
        p.rotation.z += p.userData.speed;
        p.material.opacity = 0.08 + Math.sin(Date.now()*0.00015 + i)*0.02;
    });
}

// ------- Sky Sphere (gradient) -------
function createSkySphere() {
    const geometry = new THREE.SphereGeometry(4000, 32, 15);
    const material = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
            topColor: { value: new THREE.Color(0x030417) },
            bottomColor: { value: new THREE.Color(0x0a0a1a) }
        },
        vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vPos; void main(){ float h = normalize(vPos).y * 0.5 + 0.5; vec3 col = mix(bottomColor, topColor, pow(smoothstep(0.0,1.0,h), 1.2)); gl_FragColor = vec4(col, 1.0); }'
    });
    const sky = new THREE.Mesh(geometry, material);
    scene.add(sky);
}

// ------- Comet System -------
function createCometSystem() {
    const cometCount = 6;
    for (let i = 0; i < cometCount; i++) {
        const headGeo = new THREE.SphereGeometry(2.5, 8, 8);
        const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, emissive: 0xffffff });
        const head = new THREE.Mesh(headGeo, headMat);

        const tailGeo = new THREE.PlaneGeometry(60, 6);
        const tailMat = new THREE.MeshBasicMaterial({ color: 0x99ddff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.rotation.y = Math.PI;
        tail.position.set(-30,0,0);
        head.add(tail);

        const start = new THREE.Vector3((Math.random()-0.5)*2000, Math.random()*800-200, -1200 - Math.random()*800);
        head.position.copy(start);
        head.userData = { vel: new THREE.Vector3((Math.random()*0.6+0.4), (Math.random()-0.5)*0.2, Math.random()*0.2+0.3), life: 1 };
        comets.push(head);
        scene.add(head);
    }
}

function updateComets() {
    comets.forEach(c => {
        c.position.add(c.userData.vel);
        // tail orientation
        c.children.forEach(ch => { ch.lookAt(c.position.clone().sub(c.userData.vel)); });
        // respawn if far
        if (c.position.length() > 4000 || c.position.z > 1000) {
            c.position.set((Math.random()-0.5)*2000, Math.random()*800-200, -1800 - Math.random()*800);
            c.userData.vel.set((Math.random()*0.6+0.4), (Math.random()-0.5)*0.2, Math.random()*0.2+0.3);
        }
    });
}

// ------- Planet lighting -------
function addPlanetLights() {
    if (!window.orbitalBodies) return;
    window.orbitalBodies.forEach(body => {
        if (!body.mesh || !body.mesh.userData || !body.mesh.userData.orbitalData) return;
        const lightColor = new THREE.Color(0xffffff);
        if (body.mesh.material && body.mesh.material.color) lightColor.copy(body.mesh.material.color);
        const pLight = new THREE.PointLight(lightColor, 0.08, 800);
        pLight.position.set(0,0,0);
        body.mesh.add(pLight);
        body.light = pLight;
    });
}



function createPlanets() {
    // Define realistic planets with varied distances
    const planetData = [
        { name: 'Earth', size: 35, color: 0x4488ff, position: { x: -150, y: 100, z: -180 }, type: 'rocky', distance: 'close' },
        { name: 'Mars', size: 25, color: 0xff6633, position: { x: 500, y: -300, z: -700 }, type: 'rocky', distance: 'far' },
        { name: 'Jupiter', size: 60, color: 0xaa7733, position: { x: 200, y: 200, z: -300 }, type: 'gas', distance: 'midrange' },
        { name: 'Neptune', size: 40, color: 0x0066ff, position: { x: -600, y: -250, z: -800 }, type: 'ice', distance: 'far' },
        { name: 'Venus', size: 30, color: 0xffcc00, position: { x: -250, y: 150, z: -200 }, type: 'rocky', distance: 'close' },
        { name: 'Mercury', size: 18, color: 0x888888, position: { x: 400, y: 350, z: -550 }, type: 'rocky', distance: 'far' },
        { name: 'Saturn', size: 50, color: 0xf4a460, position: { x: -400, y: 0, z: -500 }, type: 'gas', distance: 'midrange', hasRings: true },
    ];

    planetData.forEach(planet => {
        // Generate procedural texture for the planet
        const texture = generatePlanetTexture(planet.color, planet.type);
        
        const geometry = new THREE.SphereGeometry(planet.size, 64, 64);
        
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.1,
            roughness: 0.8,
            emissive: planet.color,
            emissiveIntensity: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(planet.position.x, planet.position.y, planet.position.z);
        mesh.rotation.x = Math.random() * Math.PI;
        mesh.rotation.y = Math.random() * Math.PI;
        scene.add(mesh);

        // Add light glow
        const glowGeometry = new THREE.SphereGeometry(planet.size * 1.15, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: planet.color,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        mesh.add(glow);

        // Add rings if this is Saturn
        if (planet.hasRings) {
            createSaturnRings(mesh);
        }

        // Rotation animation
        mesh.userData.rotationSpeed = Math.random() * 0.0005 + 0.0001;
    });

    // Add some large distant stars
    const starGeometry = new THREE.SphereGeometry(12, 32, 32);
    const starPositions = [
        { x: 700, y: -400, z: -900, color: 0xffff99 },
        { x: -700, y: 500, z: -950, color: 0xff99ff },
        { x: 550, y: 300, z: -1000, color: 0x99ffff },
        { x: -400, y: -500, z: -1100, color: 0xffaaff },
    ];

    starPositions.forEach(starData => {
        const material = new THREE.MeshStandardMaterial({
            color: starData.color,
            metalness: 0,
            roughness: 0.2,
            emissive: starData.color,
            emissiveIntensity: 0.9,
        });

        const star = new THREE.Mesh(starGeometry, material);
        star.position.set(starData.x, starData.y, starData.z);
        
        // Add light from the star
        const pointLight = new THREE.PointLight(starData.color, 0.2, 800);
        pointLight.position.copy(star.position);
        scene.add(pointLight);
        
        scene.add(star);
    });
}

function generatePlanetTexture(color, type) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Convert color to RGB
    const r = (color >> 16) & 255;
    const g = (color >> 8) & 255;
    const b = color & 255;

    // Create realistic 3D lighting with offset light source
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const lightX = centerX - 80;
    const lightY = centerY - 80;
    const radius = canvas.width * 0.45;
    
    const gradient = ctx.createRadialGradient(lightX, lightY, 0, centerX, centerY, canvas.width);
    
    const brightColor = `rgb(${Math.min(255, r + 50)}, ${Math.min(255, g + 50)}, ${Math.min(255, b + 50)})`;
    const baseColor = `rgb(${r}, ${g}, ${b})`;
    const darkColor = `rgb(${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)})`;
    const shadowColor = `rgb(${Math.max(0, r - 120)}, ${Math.max(0, g - 120)}, ${Math.max(0, b - 120)})`;
    
    gradient.addColorStop(0, brightColor);
    gradient.addColorStop(0.3, baseColor);
    gradient.addColorStop(0.7, darkColor);
    gradient.addColorStop(1, shadowColor);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add realistic surface details based on planet type
    if (type === 'rocky') {
        // Mercury/Venus/Earth/Mars style - varied rocky surfaces
        
        // First pass: continental plates / darker regions
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const sizeX = Math.random() * 120 + 60;
            const sizeY = Math.random() * 100 + 40;
            
            ctx.fillStyle = `rgba(60, 60, 60, ${Math.random() * 0.3 + 0.1})`;
            ctx.beginPath();
            ctx.ellipse(x, y, sizeX, sizeY, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Large impact craters with shading
        for (let i = 0; i < 60; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 35 + 5;
            const darkness = Math.random() * 0.5 + 0.2;
            
            ctx.fillStyle = `rgba(20, 20, 20, ${darkness})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Crater rim light (direction of sun)
            ctx.strokeStyle = `rgba(180, 180, 180, ${darkness * 0.6})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Medium craters
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radiusX = Math.random() * 20 + 5;
            const radiusY = Math.random() * 15 + 3;
            
            ctx.fillStyle = `rgba(40, 40, 40, ${Math.random() * 0.4})`;
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Ore deposits and mineral variations
        for (let i = 0; i < 120; i++) {
            const colors = [
                'rgba(200, 180, 100, 0.2)',
                'rgba(120, 140, 160, 0.2)',
                'rgba(180, 140, 80, 0.15)',
            ];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillRect(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                Math.random() * 25 + 3,
                Math.random() * 25 + 3
            );
        }
    } else if (type === 'gas') {
        // Jupiter/Saturn style - atmospheric bands with storms
        for (let i = 0; i < canvas.height; i += 20) {
            const intensity = (Math.sin(i / 40) * 0.2 + 0.1);
            const bandColor = i % 40 === 0 ? 
                `rgba(255, 220, 100, ${intensity})` : 
                `rgba(200, 180, 80, ${intensity * 0.5})`;
            ctx.fillStyle = bandColor;
            ctx.fillRect(0, i, canvas.width, 20);
        }
        
        // Large storm systems
        for (let i = 0; i < 8; i++) {
            const x = 100 + Math.random() * (canvas.width - 200);
            const y = 100 + Math.random() * (canvas.height - 200);
            const radiusX = Math.random() * 100 + 80;
            const radiusY = Math.random() * 50 + 30;
            
            ctx.fillStyle = `rgba(255, 150, 100, ${Math.random() * 0.35 + 0.15})`;
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, Math.random() * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = `rgba(255, 100, 50, 0.5)`;
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // Cloud streams
        for (let i = 0; i < 200; i++) {
            const colors = [
                'rgba(220, 200, 150, 0.2)',
                'rgba(200, 180, 100, 0.15)',
                'rgba(255, 220, 180, 0.1)',
            ];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillRect(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                Math.random() * 30 + 5,
                Math.random() * 8 + 2
            );
        }
    } else if (type === 'ice') {
        // Neptune/Uranus - icy atmosphere
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radiusX = Math.random() * 120 + 100;
            const radiusY = Math.random() * 70 + 40;
            
            ctx.fillStyle = `rgba(100, 200, 255, ${Math.random() * 0.3 + 0.1})`;
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, Math.random() * Math.PI, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Ice clouds
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            const startX = Math.random() * canvas.width;
            const startY = Math.random() * canvas.height;
            ctx.moveTo(startX, startY);
            ctx.lineTo(startX + (Math.random() - 0.5) * 150, startY + (Math.random() - 0.5) * 100);
            ctx.stroke();
        }
        
        // Ice crystals
        for (let i = 0; i < 150; i++) {
            const colors = [
                'rgba(150, 200, 255, 0.3)',
                'rgba(180, 220, 255, 0.25)',
                'rgba(120, 180, 255, 0.2)',
            ];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.fillRect(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                Math.random() * 18 + 2,
                Math.random() * 18 + 2
            );
        }
    }

    // Add atmospheric haze with proper lighting
    const hazeGradient = ctx.createRadialGradient(lightX, lightY, radius * 0.8, centerX, centerY, canvas.width);
    hazeGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    hazeGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    hazeGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    ctx.fillStyle = hazeGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
}
function createSaturnRings(saturnMesh) {
    // Create ring geometry
    const ringGeometry = new THREE.RingGeometry(70, 120, 128);
    const ringTexture = generateSaturnRingTexture();
    
    const ringMaterial = new THREE.MeshStandardMaterial({
        map: ringTexture,
        transparent: true,
        side: THREE.DoubleSide,
        metalness: 0,
        roughness: 0.8,
    });

    const rings = new THREE.Mesh(ringGeometry, ringMaterial);
    
    // Tilt the rings slightly
    rings.rotation.x = Math.PI / 3.5; // Saturn's ring angle
    
    // Add rings as child of Saturn so they move with it
    saturnMesh.add(rings);
}

function generateSaturnRingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Create base ring colors - icy/rocky
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#d4a574');
    gradient.addColorStop(0.3, '#c9947a');
    gradient.addColorStop(0.5, '#8b7355');
    gradient.addColorStop(0.7, '#a0826d');
    gradient.addColorStop(1, '#8b7355');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add ring variation and detail
    for (let i = 0; i < canvas.width; i += 20) {
        const darkness = Math.sin(i * 0.02) * 0.15 + 0.1;
        ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
        ctx.fillRect(i, 0, Math.random() * 30 + 10, canvas.height);
    }

    // Add ice particles
    for (let i = 0; i < 3000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const iceSize = Math.random() * 2 + 0.5;
        
        ctx.fillStyle = `rgba(200, 210, 220, ${Math.random() * 0.6 + 0.2})`;
        ctx.fillRect(x, y, iceSize, iceSize);
    }

    // Add shadow bands (darker regions)
    for (let i = 0; i < 5; i++) {
        const yPos = (i / 5) * canvas.height;
        const bandHeight = canvas.height / 8;
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.2 + 0.1})`;
        ctx.fillRect(0, yPos, canvas.width, bandHeight);
    }

    // Radial gradient for ring perspective
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
}
function createSun() {
    const sunTexture = generateSunTexture();
    
    const sunGeometry = new THREE.SphereGeometry(100, 128, 128);
    const sunMaterial = new THREE.MeshBasicMaterial({
        map: sunTexture,
    });

    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(0, 50, -450); // Centered among all planets
    scene.add(sun);

    // Realistic corona/glow
    const coronaGeometry = new THREE.SphereGeometry(105, 64, 64);
    const coronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sun.add(corona);

    // Outer glow layer
    const glowGeometry = new THREE.SphereGeometry(115, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    sun.add(glow);

    // Sun's directional light - low intensity but warm
    const sunLight = new THREE.DirectionalLight(0xffcc99, 0.5);
    sunLight.position.set(0, 50, -450); // Match sun position
    sunLight.target.position.set(0, 0, 0);
    scene.add(sunLight);
    scene.add(sunLight.target);

    // Sun's point light for local illumination
    const sunPointLight = new THREE.PointLight(0xffcc99, 0.4, 1500);
    sunPointLight.position.set(0, 50, -450); // Match sun position
    scene.add(sunPointLight);

    // Slow rotation
    sun.userData.rotationSpeed = 0.00005;
}

function generateSunTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = canvas.width / 2;

    // Base sun color gradient
    const radialGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    radialGradient.addColorStop(0, '#ffff99');
    radialGradient.addColorStop(0.3, '#ffdd44');
    radialGradient.addColorStop(0.6, '#ffaa00');
    radialGradient.addColorStop(1, '#ff6600');

    ctx.fillStyle = radialGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add sunspots
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const spotX = centerX + Math.cos(angle) * (radius * 0.5);
        const spotY = centerY + Math.sin(angle) * (radius * 0.5);
        const spotSize = Math.random() * 40 + 20;

        // Spot shadow
        const spotGradient = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotSize);
        spotGradient.addColorStop(0, 'rgba(100, 50, 0, 0.4)');
        spotGradient.addColorStop(1, 'rgba(150, 80, 0, 0.1)');
        ctx.fillStyle = spotGradient;
        ctx.beginPath();
        ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add solar flares/prominences
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const flareX = centerX + Math.cos(angle) * (radius * 0.95);
        const flareY = centerY + Math.sin(angle) * (radius * 0.95);
        const flareSize = Math.random() * 30 + 10;

        ctx.fillStyle = `rgba(255, 200, 0, ${Math.random() * 0.3 + 0.2})`;
        ctx.beginPath();
        ctx.arc(flareX, flareY, flareSize, 0, Math.PI * 2);
        ctx.fill();
    }

    // Add surface granulation
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        // Only add granulation within the sun
        if (distFromCenter < radius) {
            const granuleSize = Math.random() * 8 + 2;
            ctx.fillStyle = `rgba(255, 150, 0, ${Math.random() * 0.25})`;
            ctx.fillRect(x, y, granuleSize, granuleSize);
        }
    }

    // Add radiating heat waves
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const startX = centerX;
        const startY = centerY;
        const endX = centerX + Math.cos(angle) * radius * 1.2;
        const endY = centerY + Math.sin(angle) * radius * 1.2;

        ctx.strokeStyle = `rgba(255, 200, 50, ${Math.random() * 0.2})`;
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // Chromosphere effect (outer layer)
    const chromoGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius);
    chromoGradient.addColorStop(0, 'rgba(255, 150, 0, 0)');
    chromoGradient.addColorStop(1, 'rgba(255, 100, 0, 0.15)');
    ctx.fillStyle = chromoGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
}

function setupMusic() {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const audio = new THREE.Audio(listener);
    const resumeAndPlay = () => {
        const ctx = audio.context;
        if (ctx && ctx.state === 'suspended') {
            ctx.resume();
        }
        if (!audio.isPlaying) {
            audio.play();
        }
        document.removeEventListener('click', resumeAndPlay);
    };
    
    // Try to load music from the project root
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(
        'romanticmusic.mp3',
        (audioBuffer) => {
            console.log('Music loaded successfully');
            audio.setBuffer(audioBuffer);
            audio.setLoop(true);
            audio.setVolume(0.15);
            document.addEventListener('click', resumeAndPlay);
        },
        undefined,
        (error) => {
            // Fail silently if music file doesn't exist
            console.log('Music file not found. Add your music file to audio/music.mp3');
        }
    );

    // Volume control - only add if element exists
    const volumeSlider = document.getElementById('volumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            audio.setVolume(e.target.value / 100);
        });
    }

    window.audioElement = audio; // For external control
}

function loadPhotos() {
    const photoFiles = [
        'fotos/photo1.jpg',
        'fotos/photo2.jpg',
        'fotos/photo3.jpg',
        'fotos/photo4.jpg',
        'fotos/photo5.jpg',
        'fotos/photo6.jpg',
        'fotos/photo7.jpg',
        'fotos/photo8.jpg',
        'fotos/photo9.jpg',
        'fotos/photo10.jpg'
    ];
    photoSpawner.totalPhotos = photoFiles.length;
    const loader = new THREE.TextureLoader();

    photoFiles.forEach((path, index) => {
        loader.load(
            path,
            (texture) => {
                photoSpawner.spawnPhoto(texture, index);
            },
            undefined,
            () => {
                const canvas = createPhotoPlaceholder(index + 1);
                const fallback = new THREE.CanvasTexture(canvas);
                photoSpawner.spawnPhoto(fallback, index);
            }
        );
    });
}

function loadNotes() {
    const phrases = [
        'Te amo',
        'Te quiero',
        'Mi vida',
        'Siempre tu',
        'Mi cielo',
        'Contigo'
    ];

    const total = phrases.length;
    phrases.forEach((text, i) => {
        const texture = createNoteTexture(text);
        const width = 3.2;
        const height = 2.0;
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        const note = new THREE.Mesh(geometry, material);

        const base = computeHeartPosition(i, total, 6.3, 3.2);
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 3.0,
            (Math.random() - 0.5) * 2.2,
            (Math.random() - 0.5) * 1.6
        );
        note.position.copy(base.add(offset));
        // Push notes away from nearby photos to avoid collisions
        let tries = 0;
        while (tries < 12) {
            let tooClose = false;
            for (let p = 0; p < photos.length; p++) {
                if (photos[p].position.distanceTo(note.position) < 6) {
                    const push = note.position.clone().sub(photos[p].position).normalize().multiplyScalar(1.2);
                    note.position.add(push);
                    tooClose = true;
                }
            }
            if (!tooClose) break;
            tries++;
        }
        note.lookAt(this?.camera || camera.position);

        note.userData = {
            startPos: note.position.clone(),
            isHeld: false,
            rotationSpeed: (Math.random() - 0.5) * 0.004,
            floatSpeed: Math.random() * 0.4 + 0.2,
            floatAmount: Math.random() * 0.8 + 0.4,
            type: 'note',
            clickable: true,
        };

        scene.add(note);
        notes.push(note);
    });
}

function createNoteTexture(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#f7b7c7';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e89bb0';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

    ctx.fillStyle = '#4a2b33';
    ctx.font = '34px "Brush Script MT", "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function createPhotoPlaceholder(photoNum) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d');

    // Blue gradient background
    const gradient = ctx.createLinearGradient(0, 0, 512, 384);
    gradient.addColorStop(0, '#1a1a4d');
    gradient.addColorStop(1, '#0d0d26');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 384);

    // Border
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 492, 364);

    // Text
    ctx.fillStyle = '#00ff88';
    ctx.font = 'Bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Photo #' + photoNum, 256, 180);

    ctx.font = '18px Arial';
    ctx.fillText('Replace with your photo', 256, 220);
    ctx.fillText('Click to pull closer', 256, 245);

    return canvas;
}


class AstronautController {
    constructor(camera) {
        this.camera = camera;
        this.velocity = new THREE.Vector3();
        this.moveSpeed = 0.15;
        this.sprintSpeed = 0.3;
        this.currentSpeed = this.moveSpeed;
        
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            space: false,
            ctrl: false,
            shift: false,
        };

        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(e) {
        switch (e.key.toLowerCase()) {
            case 'w': this.keys.w = true; break;
            case 'a': this.keys.a = true; break;
            case 's': this.keys.s = true; break;
            case 'd': this.keys.d = true; break;
            case ' ': this.keys.space = true; e.preventDefault(); break;
            case 'control': this.keys.ctrl = true; break;
            case 'shift': this.keys.shift = true; this.currentSpeed = this.sprintSpeed; break;
        }
    }

    onKeyUp(e) {
        switch (e.key.toLowerCase()) {
            case 'w': this.keys.w = false; break;
            case 'a': this.keys.a = false; break;
            case 's': this.keys.s = false; break;
            case 'd': this.keys.d = false; break;
            case ' ': this.keys.space = false; break;
            case 'control': this.keys.ctrl = false; break;
            case 'shift': this.keys.shift = false; this.currentSpeed = this.moveSpeed; break;
        }
    }

    update() {
        const direction = new THREE.Vector3();

        if (this.keys.w) direction.z -= 1;
        if (this.keys.s) direction.z += 1;
        if (this.keys.a) direction.x -= 1;
        if (this.keys.d) direction.x += 1;
        if (this.keys.space) direction.y += 1;
        if (this.keys.ctrl) direction.y -= 1;

        if (direction.length() > 0) {
            direction.normalize();
            direction.applyQuaternion(this.camera.quaternion);
            this.velocity.lerp(direction.multiplyScalar(this.currentSpeed), 0.1);
        } else {
            this.velocity.multiplyScalar(0.95);
        }

        this.camera.position.add(this.velocity);
    }
}

// Photo Spawner
class PhotoSpawner {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.spawnRadius = 90; // Much further away
    }

    spawnPhoto(texture, index) {
        // Create a Polaroid-style front texture with white borders and larger bottom
        const pW = 512, pH = 640; // extra vertical space for polaroid bottom
        const pCanvas = document.createElement('canvas');
        pCanvas.width = pW; pCanvas.height = pH;
        const pCtx = pCanvas.getContext('2d');
        // White polaroid base
        pCtx.fillStyle = '#ffffff';
        pCtx.fillRect(0, 0, pW, pH);

        // Photo area (leave margins)
        const margin = 18;
        const bottomExtra = 120; // larger bottom border
        const areaW = pW - margin * 2;
        const areaH = pH - margin * 2 - bottomExtra;

        // Draw the source texture/image into the photo area, preserving aspect
        try {
            const src = texture.image || texture;
            const imgW = src.width || pW;
            const imgH = src.height || pH - bottomExtra;
            const scale = Math.min(areaW / imgW, areaH / imgH);
            const dw = imgW * scale;
            const dh = imgH * scale;
            const dx = (pW - dw) / 2;
            const dy = margin + (areaH - dh) / 2;
            pCtx.drawImage(src, dx, dy, dw, dh);
        } catch (e) {
            // fallback: fill with gray if draw fails
            pCtx.fillStyle = '#222';
            pCtx.fillRect(margin, margin, areaW, areaH);
        }

        // Thin inner border around the photo
        pCtx.strokeStyle = '#000000';
        pCtx.lineWidth = 3;
        pCtx.strokeRect(margin + 4, margin + 4, areaW - 8, areaH - 8);

        const frontTexture = new THREE.CanvasTexture(pCanvas);
        frontTexture.needsUpdate = true;

        // Geometry sized to the polaroid aspect
        const width = 10;
        const height = width * (pH / pW);
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({
            map: frontTexture,
            side: THREE.FrontSide,
        });

        const photo = new THREE.Mesh(geometry, material);
        // Back face as a separate mesh to show white on the reverse
        const backMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide });
        const backMesh = new THREE.Mesh(geometry, backMat);
        backMesh.position.set(0, 0, -0.12);
        photo.add(backMesh);
        
        // Posición en forma de corazón agrupada y estética
        // https://mathworld.wolfram.com/HeartCurve.html
        const N = this.totalPhotos || 8;
        const pos = computeHeartPosition(index, N, 5.5, 3.0);
        photo.position.copy(pos);

        // Face camera
        photo.lookAt(this.camera.position);

        // ...existing code...

        // Add custom properties
        photo.userData = {
            startPos: photo.position.clone(),
            isHeld: false,
            rotationSpeed: (Math.random() - 0.5) * 0.01,
            floatSpeed: Math.random() * 0.5 + 0.3,
            floatAmount: Math.random() * 2 + 1,
            index: index,
            zoomProgress: 0,
            type: 'photo',
        };

        // ...existing code...

        // Make clickable
        photo.userData.clickable = true;

        this.scene.add(photo);
        photos.push(photo);
    }
}

// Input Handler
class InputHandler {
    constructor() {
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.PI_2 = Math.PI / 2;
        this.heldPhoto = null;
        this.lastClickTime = 0;
        this.lastClickObject = null;
        this.hoveredPhoto = null;
        
        // ...existing code...
        
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        document.addEventListener('keydown', (e) => {
            console.log('🔑 Key pressed:', e.key);
            
            if (e.key === 'Escape') {
                if (document.pointerLockElement === document.documentElement) {
                    document.exitPointerLock?.();
                } else {
                    document.documentElement.requestPointerLock?.();
                }
            }
            
            // TEST SHORTCUTS
            // ...existing code...
        });

        // Request pointer lock
        console.log('InputHandler initialized, requesting pointer lock');
        document.documentElement.requestPointerLock?.();
    }

    onMouseDown(e) {
        // Request pointer lock on click if not already locked
        if (document.pointerLockElement !== document.documentElement) {
            document.documentElement.requestPointerLock?.();
            return;
        }
        
        // Raycast to find photo
        this.raycaster = this.raycaster || new THREE.Raycaster();
        this.mouse = this.mouse || new THREE.Vector2();

        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, camera);
        const intersects = this.raycaster.intersectObjects(scene.children, true);

        let picked = null;
        let pickedNote = null;
        for (let intersect of intersects) {
            if (intersect.object.userData.clickable) {
                if (intersect.object.userData.type === 'photo') {
                    picked = intersect.object;
                    break;
                }
                if (!pickedNote && intersect.object.userData.type === 'note') {
                    pickedNote = intersect.object;
                }
            }
        }
        if (!picked && pickedNote) picked = pickedNote;

        if (picked) {
                this.heldPhoto = picked;
                this.heldPhoto.userData.isHeld = true;
                
                // Check for double click
                const now = Date.now();
                if (now - this.lastClickTime < 300 && this.lastClickObject === this.heldPhoto) {
                    // Double click detected
                    console.log('📸 DOUBLE CLICK DETECTED');
                } else {
                    this.lastClickTime = now;
                    this.lastClickObject = this.heldPhoto;
                    
                    // Single click - normal grab
                    createParticleBurst(this.heldPhoto.position, 0x00ffff);
                    playAmbientAudio();
                    console.log('Photo grabbed');
                }
        }
    }

    onMouseUp(e) {
        if (this.heldPhoto) {
            this.heldPhoto.userData.isHeld = false;
            createParticleBurst(this.heldPhoto.position, 0xff00ff);
            console.log('Photo released');
            this.heldPhoto = null;
        }
    }

    onMouseMove(e) {
        if (document.pointerLockElement === document.documentElement) {
            const currentQuaternion = camera.quaternion.clone();
            this.euler.setFromQuaternion(currentQuaternion);
            
            const rotX = -e.movementY * 0.003;
            const rotY = -e.movementX * 0.003;
            
            this.euler.order = 'YXZ';
            this.euler.x += rotX;
            this.euler.y += rotY;
            
            // Clamp vertical rotation
            this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
            
            camera.quaternion.setFromEuler(this.euler);
        }
        
        // Check if hovering over photo
        if (!gameState.inLocation) {
            this.raycaster = this.raycaster || new THREE.Raycaster();
            this.mouse = this.mouse || new THREE.Vector2();

            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, camera);
            const intersects = this.raycaster.intersectObjects(scene.children, true);

            let hoveringPhoto = null;
            if (intersects.length > 0) {
                for (let intersect of intersects) {
                    if (intersect.object.userData.clickable && intersect.object.userData.type === 'photo') {
                        hoveringPhoto = intersect.object;
                        break;
                    }
                }
            }

            if (hoveringPhoto !== this.hoveredPhoto) {
                this.hoveredPhoto = hoveringPhoto;
                const prompt = document.getElementById('enter-prompt');
                if (prompt) {
                    if (hoveringPhoto && camera.position.distanceTo(hoveringPhoto.position) < 30) {
                        prompt.style.display = 'block';
                    } else {
                        prompt.style.display = 'none';
                    }
                }
            }
        }
    }
}

// Update photos
function updatePhotos() {
    const time = Date.now() * 0.001;

    photos.forEach(photo => {
        const userData = photo.userData;
        const startPos = userData.startPos;

        if (userData.isHeld) {
            // Pull towards camera while held
            userData.zoomProgress = Math.min(userData.zoomProgress + 0.08, 1);
            
            // Move smoothly towards camera but keep distance to avoid clipping
            const targetPos = camera.position.clone().add(
                camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(20)
            );
            
            photo.position.lerp(targetPos, 0.15);
            photo.lookAt(camera.position);
            
            // ...existing code...
        } else {
            // Return to original position after release
            userData.zoomProgress = Math.max(userData.zoomProgress - 0.06, 0);
            
            // Float around original position
            const floatX = Math.sin(time * userData.floatSpeed) * userData.floatAmount;
            const floatY = Math.cos(time * userData.floatSpeed * 0.7) * userData.floatAmount;
            const floatZ = Math.sin(time * userData.floatSpeed * 0.5) * userData.floatAmount;
            
            photo.position.lerp(startPos.clone().add(new THREE.Vector3(floatX, floatY, floatZ)), 0.1);
            
            // Rotate
            photo.rotation.y += userData.rotationSpeed;
            photo.rotation.x += userData.rotationSpeed * 0.5;
            
            // ...existing code...
        }
    });
}

function updateNotes() {
    const time = Date.now() * 0.001;

    notes.forEach(note => {
        const userData = note.userData;
        const startPos = userData.startPos;

        if (userData.isHeld) {
            const targetPos = camera.position.clone().add(
                camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(12)
            );
            note.position.lerp(targetPos, 0.12);
            note.lookAt(camera.position);
        } else {
            const floatX = Math.sin(time * userData.floatSpeed) * userData.floatAmount;
            const floatY = Math.cos(time * userData.floatSpeed * 0.7) * userData.floatAmount;
            const floatZ = Math.sin(time * userData.floatSpeed * 0.5) * userData.floatAmount;
            note.position.lerp(startPos.clone().add(new THREE.Vector3(floatX, floatY, floatZ)), 0.08);
            note.rotation.y += userData.rotationSpeed;
            note.rotation.x += userData.rotationSpeed * 0.3;
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateOrbits() {
    // Update positions of all orbiting bodies
    window.orbitalBodies.forEach(body => {
        if (body.mesh && body.mesh.userData.orbitalData) {
            const orbitData = body.mesh.userData.orbitalData;
            
            // Update angle (clockwise from photo POV)
            orbitData.angle += orbitData.speed;
            
            // Calculate position in orbit
            body.mesh.position.x = Math.cos(orbitData.angle) * orbitData.distance;
            body.mesh.position.z = Math.sin(orbitData.angle) * orbitData.distance;
            body.mesh.position.y = orbitData.height;
            
            // Update planet rotation
            if (body.mesh.userData.rotationSpeed) {
                body.mesh.rotation.y += body.mesh.userData.rotationSpeed;
                body.mesh.rotation.x += body.mesh.userData.rotationSpeed * 0.3;
            }
            
            // Update directional light position if exists
            if (body.light) {
                body.light.position.copy(body.mesh.position);
                body.light.position.y += 50;
            }
        }
    });

    // Rotate asteroids
    scene.children.forEach(child => {
        if (child.userData.spin) {
            child.rotation.x += child.userData.spin.x;
            child.rotation.y += child.userData.spin.y;
            child.rotation.z += child.userData.spin.z;
        }
    });
}



function createOrbitalSystem() {
    // Define planets with orbital data
    const planetData = [
        { name: 'Mercury', size: 18, color: 0xaa8844, type: 'rocky', distance: 300, speed: 0.00008, height: 60 },
        { name: 'Venus', size: 30, color: 0xffcc99, type: 'rocky', distance: 400, speed: 0.00006, height: 100 },
        { name: 'Earth', size: 35, color: 0x2d5aa8, type: 'rocky', distance: 500, speed: 0.00004, height: 80 },
        { name: 'Mars', size: 25, color: 0xcc5533, type: 'rocky', distance: 600, speed: 0.00003, height: 120 },
        { name: 'Jupiter', size: 60, color: 0xbb8844, type: 'gas', distance: 800, speed: 0.00002, height: 40 },
        { name: 'Saturn', size: 50, color: 0xddaa55, type: 'gas', distance: 950, speed: 0.000015, hasRings: true, height: 0 },
        { name: 'Neptune', size: 40, color: 0x0055dd, type: 'ice', distance: 1100, speed: 0.000008, height: -80 },
    ];

    planetData.forEach((planet, index) => {
        const texture = generatePlanetTexture(planet.color, planet.type);
        
        const geometry = new THREE.SphereGeometry(planet.size, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.1,
            roughness: 0.8,
            emissive: planet.color,
            emissiveIntensity: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.orbitalData = {
            distance: planet.distance,
            angle: (index / planetData.length) * Math.PI * 2,
            speed: planet.speed,
            height: planet.height,
        };
        scene.add(mesh);

        // Glow
        const glowGeometry = new THREE.SphereGeometry(planet.size * 1.15, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: planet.color,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        mesh.add(glow);

        // Rings for Saturn
        if (planet.hasRings) {
            createSaturnRings(mesh);
        }

        // Rotation
        mesh.userData.rotationSpeed = Math.random() * 0.0005 + 0.0001;

        window.orbitalBodies.push({ mesh, light: null });
    });

    // Distant stars (stationary background)
    const starGeometry = new THREE.SphereGeometry(12, 32, 32);
    const starPositions = [
        { x: 1000, y: -400, z: -750, color: 0xffff99 },
        { x: -900, y: 500, z: -800, color: 0xff99ff },
        { x: 700, y: 300, z: -1000, color: 0x99ffff },
        { x: -750, y: -500, z: -900, color: 0xffaaff },
    ];

    starPositions.forEach(starData => {
        const material = new THREE.MeshStandardMaterial({
            color: starData.color,
            metalness: 0,
            roughness: 0.2,
            emissive: starData.color,
            emissiveIntensity: 0.9,
        });

        const star = new THREE.Mesh(starGeometry, material);
        star.position.set(starData.x, starData.y, starData.z);
        
        const pointLight = new THREE.PointLight(starData.color, 0.2, 800);
        pointLight.position.copy(star.position);
        scene.add(pointLight);
        
        scene.add(star);
    });
}

function registerSunForOrbit() {
    const sunTexture = generateSunTexture();
    
    const sunGeometry = new THREE.SphereGeometry(100, 128, 128);
    const sunMaterial = new THREE.MeshBasicMaterial({
        map: sunTexture,
    });

    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.userData.orbitalData = {
        distance: 1300,
        angle: 0,
        speed: 0.000005, // Extremely slow
        height: 0,
    };
    scene.add(sun);

    // Corona glow
    const coronaGeometry = new THREE.SphereGeometry(105, 64, 64);
    const coronaMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa00,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide,
    });
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial);
    sun.add(corona);

    // Outer glow
    const glowGeometry = new THREE.SphereGeometry(115, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    sun.add(glow);

    // Rotation
    sun.userData.rotationSpeed = 0.00005;
    
    // Sun's lights
    const sunLight = new THREE.DirectionalLight(0xffcc99, 0.5);
    sunLight.target.position.set(0, 0, 0);
    scene.add(sunLight);
    scene.add(sunLight.target);

    const sunPointLight = new THREE.PointLight(0xffcc99, 0.4, 1500);
    sun.add(sunPointLight);

    window.orbitalBodies.push({ mesh: sun, light: sunLight });
}

function updatePhotoHoverEffects() {
    if (camera) {
        photos.forEach(photo => {
            const distance = camera.position.distanceTo(photo.position);
            const normalizedDist = Math.max(0, 1 - distance / 150);
            
            if (normalizedDist > 0.1) {
                photo.scale.set(1 + normalizedDist * 0.2, 1 + normalizedDist * 0.2, 1);
            } else {
                photo.scale.set(1, 1, 1);
            }
            
            // Apply scale factor if being held
            if (photo.userData.scaleFactor) {
                photo.scale.multiplyScalar(photo.userData.scaleFactor);
            }
        });
    }
}

function updatePhotoTrails() {
    const inputHandler = astronautController.inputHandler || (window.lastInputHandler);
    if (inputHandler && inputHandler.heldPhoto) {
        // Add trail particles when dragging a photo
        if (Math.random() < 0.3) {
            const trailParticle = {
                pos: inputHandler.heldPhoto.position.clone(),
                vel: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.5
                ),
                life: 1.0,
                size: 1,
                color: new THREE.Color(0xffffff),
            };
            particleTrails.push(trailParticle);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    astronautController.update();
    
    updatePhotos();
    updateNotes();
    animateCosmicDust();
    updateOrbits();
    // New features
    updateParticles();
    updatePhotoHoverEffects();
    updatePhotoTrails();
    updateNebulaClouds();
    updateComets();

    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}

function animatePlanets() {
    // Slowly rotate planets and sun
    scene.traverse((child) => {
        if (child.userData.rotationSpeed) {
            child.rotation.y += child.userData.rotationSpeed;
            child.rotation.x += child.userData.rotationSpeed * 0.3;
        }
    });
}

// Start when page loads
window.addEventListener('load', () => {
    try {
        console.log('Window load event fired');
        init();
        console.log('Init completed successfully');
    } catch (error) {
        console.error('Fatal error:', error);
        document.body.innerHTML = '<h1 style="color: #ff0000; text-align: center; margin-top: 50px;">ERROR: ' + error.message + '</h1>';
    }
});
