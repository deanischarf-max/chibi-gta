// ═══════════════════════════════════════════
// CHIBI GTA - 3D Open World Game
// ═══════════════════════════════════════════

let scene, camera, renderer, clock;
let player, playerBody, playerSpeed = 0.15, playerRunSpeed = 0.3;
let cameraOffset = new THREE.Vector3(0, 8, 12);
let cameraAngleY = 0, cameraAngleX = 0.3;
let keys = {};
let vehicles = [];
let npcs = [];
let buildings = [];
let currentVehicle = null;
let health = 100;
let wanted = 0;
let weapons = [
    { name: 'Faust', type: 'melee', damage: 10, range: 2, rate: 5, auto: false },
    { name: 'Messer', type: 'melee', damage: 25, range: 2.5, rate: 4, auto: false },
    { name: 'Baseballschlaeger', type: 'melee', damage: 20, range: 3, rate: 3, auto: false },
    { name: 'Pistole', type: 'gun', damage: 15, range: 80, rate: 5, auto: false, bulletSpeed: 2, color: 0xFFFF00 },
    { name: 'Desert Eagle', type: 'gun', damage: 35, range: 70, rate: 3, auto: false, bulletSpeed: 2.5, color: 0xFFAA00 },
    { name: 'Micro SMG', type: 'gun', damage: 8, range: 50, rate: 15, auto: true, bulletSpeed: 2, color: 0xFFFF00 },
    { name: 'SMG', type: 'gun', damage: 12, range: 60, rate: 12, auto: true, bulletSpeed: 2, color: 0xFFFF00 },
    { name: 'AK-47', type: 'gun', damage: 20, range: 90, rate: 10, auto: true, bulletSpeed: 2.5, color: 0xFFAA00 },
    { name: 'M4', type: 'gun', damage: 18, range: 100, rate: 12, auto: true, bulletSpeed: 3, color: 0xFFFF00 },
    { name: 'Shotgun', type: 'gun', damage: 40, range: 30, rate: 2, auto: false, bulletSpeed: 1.5, color: 0xFF4400, spread: 5 },
    { name: 'Sawed-Off', type: 'gun', damage: 50, range: 20, rate: 1.5, auto: false, bulletSpeed: 1.5, color: 0xFF4400, spread: 8 },
    { name: 'Scharfschuetze', type: 'gun', damage: 80, range: 200, rate: 1, auto: false, bulletSpeed: 4, color: 0x00FF00 },
    { name: 'RPG', type: 'gun', damage: 100, range: 150, rate: 0.5, auto: false, bulletSpeed: 1, color: 0xFF0000, explosive: true },
    { name: 'Minigun', type: 'gun', damage: 8, range: 80, rate: 30, auto: true, bulletSpeed: 3, color: 0xFFFF00 },
];
let currentWeapon = 0;
let bullets = [];
let isLocked = false;
let mouseDown = false;
let aiming = false;
let normalFOV = 60;
let aimFOV = 35;
let lastFireTime = 0;

// ── INIT ──
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 500);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    clock = new THREE.Clock();

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(50, 100, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -100; sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
    scene.add(sun);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a5a3a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Build city
    buildCity();
    createPlayer();
    spawnVehicles();
    spawnNPCs();

    // Events
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    window.addEventListener('keydown', e => { keys[e.code] = true; handleKeyDown(e); });
    window.addEventListener('keyup', e => keys[e.code] = false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', e => {
        if (e.button === 0) { mouseDown = true; onShoot(); } // Linksklick = schießen
        if (e.button === 2) { aiming = true; } // Rechtsklick = zielen
    });
    window.addEventListener('mouseup', e => {
        if (e.button === 0) mouseDown = false;
        if (e.button === 2) aiming = false;
    });
    window.addEventListener('contextmenu', e => e.preventDefault());

    // Start
    document.getElementById('loading').addEventListener('click', () => {
        document.getElementById('loading').style.display = 'none';
        renderer.domElement.requestPointerLock();
        isLocked = true;
        animate();
    });

    document.addEventListener('pointerlockchange', () => {
        isLocked = document.pointerLockElement === renderer.domElement;
    });
}

// ── CITY BUILDER ──
function buildCity() {
    const roadMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    // Main roads grid
    for (let i = -3; i <= 3; i++) {
        // Horizontal roads
        const roadH = new THREE.Mesh(new THREE.BoxGeometry(300, 0.05, 12), roadMat);
        roadH.position.set(0, 0.01, i * 50);
        roadH.receiveShadow = true;
        scene.add(roadH);
        // Center line
        const lineH = new THREE.Mesh(new THREE.BoxGeometry(300, 0.06, 0.3), lineMat);
        lineH.position.set(0, 0.02, i * 50);
        scene.add(lineH);

        // Vertical roads
        const roadV = new THREE.Mesh(new THREE.BoxGeometry(12, 0.05, 300), roadMat);
        roadV.position.set(i * 50, 0.01, 0);
        roadV.receiveShadow = true;
        scene.add(roadV);
        const lineV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 300), lineMat);
        lineV.position.set(i * 50, 0.02, 0);
        scene.add(lineV);

        // Sidewalks
        for (let side = -1; side <= 1; side += 2) {
            const swH = new THREE.Mesh(new THREE.BoxGeometry(300, 0.1, 2), sidewalkMat);
            swH.position.set(0, 0.05, i * 50 + side * 7);
            scene.add(swH);
            const swV = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 300), sidewalkMat);
            swV.position.set(i * 50 + side * 7, 0.05, 0);
            scene.add(swV);
        }
    }

    // Buildings in each block
    const colors = [0x8B4513, 0x696969, 0x4682B4, 0xB8860B, 0x556B2F, 0x8B0000, 0x2F4F4F, 0xDAA520, 0x708090, 0xCD853F];
    for (let bx = -2; bx <= 2; bx++) {
        for (let bz = -2; bz <= 2; bz++) {
            const cx = bx * 50;
            const cz = bz * 50;
            const numBuildings = 2 + Math.floor(Math.random() * 3);
            for (let b = 0; b < numBuildings; b++) {
                const w = 5 + Math.random() * 12;
                const h = 5 + Math.random() * 30;
                const d = 5 + Math.random() * 12;
                const color = colors[Math.floor(Math.random() * colors.length)];
                const mat = new THREE.MeshLambertMaterial({ color });
                const geo = new THREE.BoxGeometry(w, h, d);
                const mesh = new THREE.Mesh(geo, mat);
                const ox = (Math.random() - 0.5) * 25;
                const oz = (Math.random() - 0.5) * 25;
                mesh.position.set(cx + ox, h / 2, cz + oz);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);
                buildings.push({ mesh, x: cx + ox, z: cz + oz, w, d });

                // Windows
                const windowMat = new THREE.MeshBasicMaterial({ color: 0xFFFF99 });
                const floors = Math.floor(h / 4);
                for (let f = 0; f < floors; f++) {
                    for (let wi = 0; wi < 3; wi++) {
                        const win = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 0.1), windowMat);
                        win.position.set(cx + ox - w / 3 + wi * (w / 3), 2 + f * 4, cz + oz + d / 2 + 0.1);
                        scene.add(win);
                    }
                }
            }
        }
    }

    // Street lights
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFF99 });
    for (let i = -5; i <= 5; i++) {
        for (let side = -1; side <= 1; side += 2) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6), poleMat);
            pole.position.set(i * 30, 3, side * 8);
            scene.add(pole);
            const light = new THREE.Mesh(new THREE.SphereGeometry(0.4), lightMat);
            light.position.set(i * 30, 6.2, side * 8);
            scene.add(light);
            const pl = new THREE.PointLight(0xFFFF99, 0.5, 20);
            pl.position.copy(light.position);
            scene.add(pl);
        }
    }

    // Trees/Parks
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const leafMat = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    for (let i = 0; i < 40; i++) {
        const x = (Math.random() - 0.5) * 280;
        const z = (Math.random() - 0.5) * 280;
        // Don't place on roads
        if (Math.abs(x % 50) < 8 || Math.abs(z % 50) < 8) continue;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 3), trunkMat);
        trunk.position.set(x, 1.5, z);
        trunk.castShadow = true;
        scene.add(trunk);
        const leaves = new THREE.Mesh(new THREE.SphereGeometry(2, 6, 6), leafMat);
        leaves.position.set(x, 4, z);
        leaves.castShadow = true;
        scene.add(leaves);
    }
}

// ── PLAYER ──
function createPlayer() {
    player = new THREE.Group();

    // Body
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2196F3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.5), bodyMat);
    body.position.y = 1.4;
    body.castShadow = true;
    player.add(body);

    // Head
    const headMat = new THREE.MeshLambertMaterial({ color: 0xFFDBAC });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), headMat);
    head.position.y = 2.3;
    head.castShadow = true;
    player.add(head);

    // Legs
    const legMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2e });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.4), legMat);
    legL.position.set(-0.2, 0.4, 0);
    player.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.4), legMat);
    legR.position.set(0.2, 0.4, 0);
    player.add(legR);

    // Arms
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.3), bodyMat);
    armL.position.set(-0.55, 1.3, 0);
    player.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.3), bodyMat);
    armR.position.set(0.55, 1.3, 0);
    player.add(armR);

    playerBody = { legL, legR, armL, armR };
    player.position.set(0, 0, 20);
    scene.add(player);
}

// ── VEHICLES ──
function addWheels(group, wheelRadius, wheelWidth, positions) {
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 8);
    for (const [wx, wy, wz] of positions) {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, wy, wz);
        group.add(wheel);
    }
}

function addHeadlights(group, positions) {
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xFFFF99 });
    for (const [lx, ly, lz] of positions) {
        const hl = new THREE.Mesh(new THREE.SphereGeometry(0.15), lightMat);
        hl.position.set(lx, ly, lz);
        group.add(hl);
    }
}

function addTaillights(group, positions) {
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    for (const [lx, ly, lz] of positions) {
        const tl = new THREE.Mesh(new THREE.SphereGeometry(0.12), tailMat);
        tl.position.set(lx, ly, lz);
        group.add(tl);
    }
}

const vehicleStats = {
    sedan:      { maxSpeed: 0.5, accel: 0.01 },
    sports:     { maxSpeed: 0.8, accel: 0.015 },
    muscle:     { maxSpeed: 0.6, accel: 0.012 },
    suv:        { maxSpeed: 0.5, accel: 0.009 },
    truck:      { maxSpeed: 0.3, accel: 0.005 },
    van:        { maxSpeed: 0.4, accel: 0.007 },
    motorcycle: { maxSpeed: 0.9, accel: 0.018 },
    police:     { maxSpeed: 0.7, accel: 0.014 },
    ambulance:  { maxSpeed: 0.55, accel: 0.01 },
    taxi:       { maxSpeed: 0.5, accel: 0.01 },
    bus:        { maxSpeed: 0.25, accel: 0.004 },
    firetruck:  { maxSpeed: 0.35, accel: 0.006 },
};

function createVehicle(x, z, color, type) {
    const group = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.5 });

    if (type === 'sedan' || type === 'taxi') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), mat);
        body.position.y = 0.8; body.castShadow = true; group.add(body);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2), mat);
        roof.position.set(0, 1.7, -0.3); group.add(roof);
        const front = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.1), glassMat);
        front.position.set(0, 1.6, 0.7); group.add(front);
        addWheels(group, 0.35, 0.3, [[-1.1, 0.35, -1.2], [1.1, 0.35, -1.2], [-1.1, 0.35, 1.2], [1.1, 0.35, 1.2]]);
        addHeadlights(group, [[-0.6, 0.8, 2.1], [0.6, 0.8, 2.1]]);
        addTaillights(group, [[-0.6, 0.8, -2.1], [0.6, 0.8, -2.1]]);
        if (type === 'taxi') {
            const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.4), new THREE.MeshBasicMaterial({ color: 0xFFFF00 }));
            sign.position.set(0, 2.2, -0.3); group.add(sign);
        }
    } else if (type === 'sports') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.5), mat);
        body.position.y = 0.55; body.castShadow = true; group.add(body);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 1.5), mat);
        roof.position.set(0, 1.15, -0.5); group.add(roof);
        const front = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.1), glassMat);
        front.position.set(0, 1.1, 0.2); group.add(front);
        // Spoiler
        const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.5), mat);
        spoiler.position.set(0, 1.3, -2.2); group.add(spoiler);
        const spoilerL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
        spoilerL.position.set(-0.8, 1.1, -2.2); group.add(spoilerL);
        const spoilerR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), mat);
        spoilerR.position.set(0.8, 1.1, -2.2); group.add(spoilerR);
        addWheels(group, 0.3, 0.35, [[-1.2, 0.3, -1.4], [1.2, 0.3, -1.4], [-1.2, 0.3, 1.4], [1.2, 0.3, 1.4]]);
        addHeadlights(group, [[-0.7, 0.55, 2.3], [0.7, 0.55, 2.3]]);
        addTaillights(group, [[-0.7, 0.55, -2.3], [0.7, 0.55, -2.3]]);
    } else if (type === 'muscle') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1, 4.2), mat);
        body.position.y = 0.8; body.castShadow = true; group.add(body);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 1.8), mat);
        roof.position.set(0, 1.65, -0.4); group.add(roof);
        const front = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.1), glassMat);
        front.position.set(0, 1.5, 0.5); group.add(front);
        // Hood scoop
        const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.8), mat);
        scoop.position.set(0, 1.45, 1.2); group.add(scoop);
        addWheels(group, 0.4, 0.35, [[-1.2, 0.4, -1.3], [1.2, 0.4, -1.3], [-1.2, 0.4, 1.3], [1.2, 0.4, 1.3]]);
        addHeadlights(group, [[-0.7, 0.8, 2.2], [0.7, 0.8, 2.2]]);
        addTaillights(group, [[-0.7, 0.8, -2.2], [0.7, 0.8, -2.2]]);
    } else if (type === 'suv') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.4, 4.5), mat);
        body.position.y = 1.2; body.castShadow = true; group.add(body);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 2.8), mat);
        roof.position.set(0, 2.35, -0.3); group.add(roof);
        const front = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 0.1), glassMat);
        front.position.set(0, 2.2, 1.1); group.add(front);
        addWheels(group, 0.45, 0.35, [[-1.2, 0.45, -1.5], [1.2, 0.45, -1.5], [-1.2, 0.45, 1.5], [1.2, 0.45, 1.5]]);
        addHeadlights(group, [[-0.7, 1.2, 2.3], [0.7, 1.2, 2.3]]);
        addTaillights(group, [[-0.7, 1.2, -2.3], [0.7, 1.2, -2.3]]);
    } else if (type === 'truck') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2, 6), mat);
        body.position.y = 1.5; body.castShadow = true; group.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2), new THREE.MeshLambertMaterial({ color: 0x666666 }));
        cabin.position.set(0, 2, 3); group.add(cabin);
        const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 0.1), glassMat);
        cabGlass.position.set(0, 2.6, 4.05); group.add(cabGlass);
        addWheels(group, 0.5, 0.4, [[-1.3, 0.5, -2], [1.3, 0.5, -2], [-1.3, 0.5, 0], [1.3, 0.5, 0], [-1.3, 0.5, 2], [1.3, 0.5, 2]]);
        addHeadlights(group, [[-0.8, 1.5, 4.1], [0.8, 1.5, 4.1]]);
        addTaillights(group, [[-0.8, 1.5, -3.1], [0.8, 1.5, -3.1]]);
    } else if (type === 'van') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.8, 4.5), mat);
        body.position.y = 1.3; body.castShadow = true; group.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.5), mat);
        cabin.position.set(0, 2.6, 1.2); group.add(cabin);
        const front = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.1), glassMat);
        front.position.set(0, 2.5, 2.0); group.add(front);
        addWheels(group, 0.4, 0.3, [[-1.2, 0.4, -1.5], [1.2, 0.4, -1.5], [-1.2, 0.4, 1.5], [1.2, 0.4, 1.5]]);
        addHeadlights(group, [[-0.7, 1.0, 2.3], [0.7, 1.0, 2.3]]);
        addTaillights(group, [[-0.7, 1.0, -2.3], [0.7, 1.0, -2.3]]);
    } else if (type === 'motorcycle') {
        // Thin body
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 2.2), mat);
        body.position.y = 0.8; body.castShadow = true; group.add(body);
        // Seat
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.2, 1), new THREE.MeshLambertMaterial({ color: 0x222222 }));
        seat.position.set(0, 1.2, -0.2); group.add(seat);
        // Handlebars
        const handlebar = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 0.1), new THREE.MeshLambertMaterial({ color: 0x888888 }));
        handlebar.position.set(0, 1.3, 0.8); group.add(handlebar);
        // Wheels (only 2)
        addWheels(group, 0.35, 0.15, [[0, 0.35, -0.9], [0, 0.35, 0.9]]);
        addHeadlights(group, [[0, 1.0, 1.2]]);
        addTaillights(group, [[0, 0.9, -1.2]]);
    } else if (type === 'police') {
        // Black body with white doors
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), bodyMat);
        body.position.y = 0.8; body.castShadow = true; group.add(body);
        // White door panels
        const doorMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
        const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.5), doorMat);
        doorL.position.set(-1.03, 0.9, 0); group.add(doorL);
        const doorR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 1.5), doorMat);
        doorR.position.set(1.03, 0.9, 0); group.add(doorR);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2), bodyMat);
        roof.position.set(0, 1.7, -0.3); group.add(roof);
        const front = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.1), glassMat);
        front.position.set(0, 1.6, 0.7); group.add(front);
        // Light bar
        const lightBarRed = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
        lightBarRed.position.set(-0.4, 2.2, -0.3); group.add(lightBarRed);
        const lightBarBlue = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0x0000FF }));
        lightBarBlue.position.set(0.4, 2.2, -0.3); group.add(lightBarBlue);
        addWheels(group, 0.35, 0.3, [[-1.1, 0.35, -1.2], [1.1, 0.35, -1.2], [-1.1, 0.35, 1.2], [1.1, 0.35, 1.2]]);
        addHeadlights(group, [[-0.6, 0.8, 2.1], [0.6, 0.8, 2.1]]);
        addTaillights(group, [[-0.6, 0.8, -2.1], [0.6, 0.8, -2.1]]);
    } else if (type === 'ambulance') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.8, 5), mat);
        body.position.y = 1.3; body.castShadow = true; group.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 1.5), mat);
        cabin.position.set(0, 2.6, 1.5); group.add(cabin);
        const front = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.6, 0.1), glassMat);
        front.position.set(0, 2.5, 2.25); group.add(front);
        // Red cross
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.05), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
        crossH.position.set(0, 1.8, -2.55); group.add(crossH);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.05), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
        crossV.position.set(0, 1.8, -2.55); group.add(crossV);
        // Light bar
        const siren = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
        siren.position.set(0, 3.1, 1.5); group.add(siren);
        addWheels(group, 0.45, 0.3, [[-1.2, 0.45, -1.8], [1.2, 0.45, -1.8], [-1.2, 0.45, 1.8], [1.2, 0.45, 1.8]]);
        addHeadlights(group, [[-0.7, 1.3, 2.6], [0.7, 1.3, 2.6]]);
        addTaillights(group, [[-0.7, 1.3, -2.6], [0.7, 1.3, -2.6]]);
    } else if (type === 'bus') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 10), mat);
        body.position.y = 1.6; body.castShadow = true; group.add(body);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.3, 10), new THREE.MeshLambertMaterial({ color: 0x888888 }));
        roof.position.set(0, 2.85, 0); group.add(roof);
        const front = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.1), glassMat);
        front.position.set(0, 2.0, 5.05); group.add(front);
        // Windows along sides
        const winMat = new THREE.MeshLambertMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.4 });
        for (let wi = -3; wi <= 3; wi++) {
            const winL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 1), winMat);
            winL.position.set(-1.28, 2.0, wi * 1.3); group.add(winL);
            const winR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 1), winMat);
            winR.position.set(1.28, 2.0, wi * 1.3); group.add(winR);
        }
        addWheels(group, 0.5, 0.4, [[-1.3, 0.5, -3.5], [1.3, 0.5, -3.5], [-1.3, 0.5, 0], [1.3, 0.5, 0], [-1.3, 0.5, 3.5], [1.3, 0.5, 3.5]]);
        addHeadlights(group, [[-0.8, 1.2, 5.1], [0.8, 1.2, 5.1]]);
        addTaillights(group, [[-0.8, 1.2, -5.1], [0.8, 1.2, -5.1]]);
    } else if (type === 'firetruck') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 7), mat);
        body.position.y = 1.5; body.castShadow = true; group.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 2.5), mat);
        cabin.position.set(0, 2.5, 2.5); group.add(cabin);
        const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 0.1), glassMat);
        cabGlass.position.set(0, 2.8, 3.8); group.add(cabGlass);
        // Ladder on top
        const ladderMat = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
        const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 5), ladderMat);
        ladder.position.set(0, 2.55, -1); group.add(ladder);
        // Light bar
        const siren1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
        siren1.position.set(-0.4, 3.2, 2.5); group.add(siren1);
        const siren2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xFF4400 }));
        siren2.position.set(0.4, 3.2, 2.5); group.add(siren2);
        addWheels(group, 0.5, 0.4, [[-1.3, 0.5, -2.5], [1.3, 0.5, -2.5], [-1.3, 0.5, 0], [1.3, 0.5, 0], [-1.3, 0.5, 2.5], [1.3, 0.5, 2.5]]);
        addHeadlights(group, [[-0.8, 1.5, 3.6], [0.8, 1.5, 3.6]]);
        addTaillights(group, [[-0.8, 1.5, -3.6], [0.8, 1.5, -3.6]]);
    }

    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(group);

    const stats = vehicleStats[type] || vehicleStats.sedan;
    return {
        mesh: group, x, z, speed: 0, angle: group.rotation.y,
        maxSpeed: stats.maxSpeed,
        accel: stats.accel,
        type
    };
}

function spawnVehicles() {
    const carColors = [0xFF0000, 0x0000FF, 0xFFFF00, 0x00FF00, 0xFF8800, 0xFFFFFF, 0x000000, 0x800080, 0x00FFFF, 0xCC0066, 0x336699, 0x994400];

    // Vehicle spawn definitions: [type, count, colorOverride]
    const spawnList = [
        ['sedan', 10, null],
        ['sports', 5, null],
        ['muscle', 4, null],
        ['suv', 4, null],
        ['truck', 3, null],
        ['van', 3, null],
        ['motorcycle', 4, null],
        ['police', 3, 0x111111],
        ['ambulance', 2, 0xFFFFFF],
        ['taxi', 3, 0xFFCC00],
        ['bus', 2, 0x2255AA],
        ['firetruck', 2, 0xCC0000],
    ];

    for (const [type, count, colorOverride] of spawnList) {
        for (let i = 0; i < count; i++) {
            const road = Math.floor(Math.random() * 7) - 3;
            const pos = (Math.random() - 0.5) * 200;
            const color = colorOverride !== null ? colorOverride : carColors[Math.floor(Math.random() * carColors.length)];
            const onHorizontal = Math.random() > 0.5;
            const x = onHorizontal ? pos : road * 50 + 3;
            const z = onHorizontal ? road * 50 + 3 : pos;
            const v = createVehicle(x, z, color, type);
            if (onHorizontal) v.mesh.rotation.y = Math.PI / 2;
            v.angle = v.mesh.rotation.y;
            vehicles.push(v);
        }
    }
}

// ── NPCs ──
function createNPC(x, z) {
    const group = new THREE.Group();
    const skinColors = [0xFFDBAC, 0xD2A06F, 0x8D5524, 0xF1C27D];
    const shirtColors = [0xFF4444, 0x44FF44, 0x4444FF, 0xFFFF44, 0xFF44FF, 0x44FFFF, 0xFFAA00, 0xAA00FF];
    const skinColor = skinColors[Math.floor(Math.random() * skinColors.length)];
    const shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.4), new THREE.MeshLambertMaterial({ color: shirtColor }));
    body.position.y = 1.3; body.castShadow = true; group.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({ color: skinColor }));
    head.position.y = 2.1; head.castShadow = true; group.add(head);

    const legMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.35), legMat);
    legL.position.set(-0.15, 0.35, 0); group.add(legL);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.7, 0.35), legMat);
    legR.position.set(0.15, 0.35, 0); group.add(legR);

    group.position.set(x, 0, z);
    scene.add(group);

    return {
        mesh: group, x, z, speed: 0.03 + Math.random() * 0.03,
        dir: Math.random() * Math.PI * 2, changeTimer: Math.random() * 200,
        health: 100, legL, legR
    };
}

function spawnNPCs() {
    for (let i = 0; i < 30; i++) {
        const x = (Math.random() - 0.5) * 250;
        const z = (Math.random() - 0.5) * 250;
        npcs.push(createNPC(x, z));
    }
}

// ── INPUT ──
function onMouseMove(e) {
    if (!isLocked) return;
    cameraAngleY -= e.movementX * 0.003;
    cameraAngleX = Math.max(0.1, Math.min(1.2, cameraAngleX + e.movementY * 0.003));
}

function handleKeyDown(e) {
    if (e.code === 'KeyF') toggleVehicle();
    if (e.code === 'KeyQ') {
        currentWeapon = (currentWeapon + 1) % weapons.length;
        document.getElementById('weapon').textContent = weapons[currentWeapon].name;
        document.getElementById('crosshair').style.display = weapons[currentWeapon].type === 'gun' ? 'block' : 'none';
    }
    if (e.code === 'KeyE') {
        currentWeapon = (currentWeapon - 1 + weapons.length) % weapons.length;
        document.getElementById('weapon').textContent = weapons[currentWeapon].name;
        document.getElementById('crosshair').style.display = weapons[currentWeapon].type === 'gun' ? 'block' : 'none';
    }
}

function toggleVehicle() {
    if (currentVehicle) {
        // Exit vehicle
        player.visible = true;
        player.position.set(currentVehicle.mesh.position.x + 3, 0, currentVehicle.mesh.position.z);
        currentVehicle.speed = 0;
        currentVehicle = null;
    } else {
        // Find nearest vehicle
        let nearest = null, minDist = 5;
        for (const v of vehicles) {
            const dx = player.position.x - v.mesh.position.x;
            const dz = player.position.z - v.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < minDist) { minDist = dist; nearest = v; }
        }
        if (nearest) {
            currentVehicle = nearest;
            player.visible = false;
        }
    }
}

function onShoot() {
    if (!isLocked) {
        renderer.domElement.requestPointerLock();
        return;
    }

    const weapon = weapons[currentWeapon];
    const now = performance.now();
    const fireInterval = 1000 / weapon.rate;
    if (now - lastFireTime < fireInterval) return;
    lastFireTime = now;

    const pos = currentVehicle ? currentVehicle.mesh.position.clone() : player.position.clone();
    pos.y += 1.5;

    if (weapon.type === 'melee') {
        // Melee attack - raycast check for nearby NPCs
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);
        for (const npc of npcs) {
            if (npc.health <= 0) continue;
            const dx = npc.mesh.position.x - pos.x;
            const dz = npc.mesh.position.z - pos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > weapon.range) continue;
            // Check if NPC is roughly in front of player
            const toNpc = new THREE.Vector3(dx, 0, dz).normalize();
            const dot = dir.dot(toNpc);
            if (dot > 0.3) {
                npc.health -= weapon.damage;
                if (npc.health <= 0) {
                    npc.mesh.rotation.x = Math.PI / 2;
                    npc.mesh.position.y = 0.3;
                    wanted = Math.min(5, wanted + 1);
                }
                break;
            }
        }
        if (wanted < 5) wanted = Math.min(5, wanted + 0.2);
        updateHUD();
        return;
    }

    // Gun fire
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);

    const bulletCount = weapon.spread ? weapon.spread : 1;
    for (let i = 0; i < bulletCount; i++) {
        const bulletGeo = new THREE.SphereGeometry(weapon.explosive ? 0.2 : 0.1);
        const bulletMat = new THREE.MeshBasicMaterial({ color: weapon.color || 0xFFFF00 });
        const bullet = new THREE.Mesh(bulletGeo, bulletMat);
        bullet.position.copy(pos);
        scene.add(bullet);

        const bulletDir = dir.clone();
        if (weapon.spread) {
            const spreadAngle = (Math.random() - 0.5) * 0.3;
            bulletDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
        }

        const lifeFrames = Math.ceil(weapon.range / (weapon.bulletSpeed || 2));
        bullets.push({
            mesh: bullet,
            dir: bulletDir,
            speed: weapon.bulletSpeed || 2,
            life: lifeFrames,
            damage: weapon.damage,
            explosive: weapon.explosive || false
        });
    }

    if (wanted < 5) wanted = Math.min(5, wanted + 0.5);
    updateHUD();
}

// ── UPDATE ──
function updatePlayer(dt) {
    if (currentVehicle) {
        updateVehicleControls();
        return;
    }

    const speed = aiming ? playerSpeed * 0.5 : (keys['ShiftLeft'] ? playerRunSpeed : playerSpeed);

    // Face camera direction when aiming
    if (aiming) player.rotation.y = cameraAngleY + Math.PI;
    let moveX = 0, moveZ = 0;

    if (keys['KeyW']) { moveX -= Math.sin(cameraAngleY) * speed; moveZ -= Math.cos(cameraAngleY) * speed; }
    if (keys['KeyS']) { moveX += Math.sin(cameraAngleY) * speed; moveZ += Math.cos(cameraAngleY) * speed; }
    if (keys['KeyA']) { moveX -= Math.cos(cameraAngleY) * speed; moveZ += Math.sin(cameraAngleY) * speed; }
    if (keys['KeyD']) { moveX += Math.cos(cameraAngleY) * speed; moveZ -= Math.sin(cameraAngleY) * speed; }

    if (moveX !== 0 || moveZ !== 0) {
        player.position.x += moveX;
        player.position.z += moveZ;
        player.rotation.y = Math.atan2(moveX, moveZ);
        // Walk animation
        const t = clock.getElapsedTime();
        const swing = Math.sin(t * 10) * 0.5;
        playerBody.legL.rotation.x = swing;
        playerBody.legR.rotation.x = -swing;
        playerBody.armL.rotation.x = -swing;
        playerBody.armR.rotation.x = swing;
    } else {
        playerBody.legL.rotation.x = 0;
        playerBody.legR.rotation.x = 0;
        playerBody.armL.rotation.x = 0;
        playerBody.armR.rotation.x = 0;
    }

    // Collision with buildings
    for (const b of buildings) {
        const dx = Math.abs(player.position.x - b.x);
        const dz = Math.abs(player.position.z - b.z);
        if (dx < b.w / 2 + 0.5 && dz < b.d / 2 + 0.5) {
            // Push out
            if (dx / (b.w / 2) > dz / (b.d / 2)) {
                player.position.x = b.x + (player.position.x > b.x ? 1 : -1) * (b.w / 2 + 0.5);
            } else {
                player.position.z = b.z + (player.position.z > b.z ? 1 : -1) * (b.d / 2 + 0.5);
            }
        }
    }
}

function updateVehicleControls() {
    const v = currentVehicle;
    if (keys['KeyW']) v.speed = Math.min(v.maxSpeed, v.speed + v.accel);
    else if (keys['KeyS']) v.speed = Math.max(-v.maxSpeed / 2, v.speed - v.accel);
    else v.speed *= 0.98;

    if (Math.abs(v.speed) > 0.01) {
        if (keys['KeyA']) v.angle += 0.03 * (v.speed > 0 ? 1 : -1);
        if (keys['KeyD']) v.angle -= 0.03 * (v.speed > 0 ? 1 : -1);
    }

    v.mesh.position.x += Math.sin(v.angle) * v.speed;
    v.mesh.position.z += Math.cos(v.angle) * v.speed;
    v.mesh.rotation.y = v.angle;

    // Vehicle-building collision
    for (const b of buildings) {
        const dx = Math.abs(v.mesh.position.x - b.x);
        const dz = Math.abs(v.mesh.position.z - b.z);
        if (dx < b.w / 2 + 2 && dz < b.d / 2 + 2) {
            v.speed *= -0.3;
            if (dx / (b.w / 2) > dz / (b.d / 2)) {
                v.mesh.position.x = b.x + (v.mesh.position.x > b.x ? 1 : -1) * (b.w / 2 + 2);
            } else {
                v.mesh.position.z = b.z + (v.mesh.position.z > b.z ? 1 : -1) * (b.d / 2 + 2);
            }
        }
    }
}

function updateCamera() {
    const target = currentVehicle ? currentVehicle.mesh.position : player.position;

    // Aim mode: closer camera, lower FOV, over-shoulder
    let dist, lookY, lerpSpeed;
    if (aiming && !currentVehicle) {
        dist = 3;
        lookY = 2;
        lerpSpeed = 0.2;
        camera.fov += (aimFOV - camera.fov) * 0.15;
        const ch = document.getElementById('crosshair');
        if (weapons[currentWeapon].type === 'gun') {
            ch.style.display = 'block';
            ch.classList.add('aiming');
        }
    } else {
        dist = currentVehicle ? 15 : 10;
        lookY = 2;
        lerpSpeed = 0.1;
        camera.fov += (normalFOV - camera.fov) * 0.15;
        const ch = document.getElementById('crosshair');
        ch.style.display = 'none';
        ch.classList.remove('aiming');
    }
    camera.updateProjectionMatrix();

    // Over-shoulder offset when aiming
    const shoulderOffset = aiming && !currentVehicle ? 1.5 : 0;

    const camX = target.x + Math.sin(cameraAngleY) * dist * Math.cos(cameraAngleX) + Math.cos(cameraAngleY) * shoulderOffset;
    const camY = target.y + dist * Math.sin(cameraAngleX);
    const camZ = target.z + Math.cos(cameraAngleY) * dist * Math.cos(cameraAngleX) - Math.sin(cameraAngleY) * shoulderOffset;

    camera.position.lerp(new THREE.Vector3(camX, camY, camZ), lerpSpeed);
    camera.lookAt(target.x, target.y + lookY, target.z);
}

function updateNPCs() {
    const t = clock.getElapsedTime();
    for (const npc of npcs) {
        if (npc.health <= 0) continue;
        npc.changeTimer--;
        if (npc.changeTimer <= 0) {
            npc.dir += (Math.random() - 0.5) * 2;
            npc.changeTimer = 100 + Math.random() * 200;
        }
        npc.mesh.position.x += Math.sin(npc.dir) * npc.speed;
        npc.mesh.position.z += Math.cos(npc.dir) * npc.speed;
        npc.mesh.rotation.y = npc.dir;

        // Walk animation
        const swing = Math.sin(t * 8 + npc.dir) * 0.4;
        npc.legL.rotation.x = swing;
        npc.legR.rotation.x = -swing;

        // Keep in bounds
        if (Math.abs(npc.mesh.position.x) > 140) npc.dir = Math.PI - npc.dir;
        if (Math.abs(npc.mesh.position.z) > 140) npc.dir = -npc.dir;
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.mesh.position.x += b.dir.x * b.speed;
        b.mesh.position.z += b.dir.z * b.speed;
        b.life--;

        const bulletDamage = b.damage || 50;
        let hit = false;

        // Hit NPCs
        const hitRadius = b.explosive ? 8 : 1.5;
        for (const npc of npcs) {
            if (npc.health <= 0) continue;
            const dx = b.mesh.position.x - npc.mesh.position.x;
            const dz = b.mesh.position.z - npc.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < (b.explosive ? 1.5 : 1.5)) {
                hit = true;
            }
        }

        // Explosive: on hit or end of life, damage all NPCs in radius
        if (b.explosive && (hit || b.life <= 0)) {
            // Create explosion visual
            const explGeo = new THREE.SphereGeometry(3, 8, 8);
            const explMat = new THREE.MeshBasicMaterial({ color: 0xFF4400, transparent: true, opacity: 0.8 });
            const explosion = new THREE.Mesh(explGeo, explMat);
            explosion.position.copy(b.mesh.position);
            scene.add(explosion);
            // Animate explosion away after short time
            setTimeout(() => { scene.remove(explosion); }, 200);
            // Second flash
            const explGeo2 = new THREE.SphereGeometry(5, 8, 8);
            const explMat2 = new THREE.MeshBasicMaterial({ color: 0xFFAA00, transparent: true, opacity: 0.5 });
            const explosion2 = new THREE.Mesh(explGeo2, explMat2);
            explosion2.position.copy(b.mesh.position);
            scene.add(explosion2);
            setTimeout(() => { scene.remove(explosion2); }, 350);

            for (const npc of npcs) {
                if (npc.health <= 0) continue;
                const dx = b.mesh.position.x - npc.mesh.position.x;
                const dz = b.mesh.position.z - npc.mesh.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < hitRadius) {
                    const falloff = 1 - (dist / hitRadius);
                    npc.health -= bulletDamage * falloff;
                    if (npc.health <= 0) {
                        npc.mesh.rotation.x = Math.PI / 2;
                        npc.mesh.position.y = 0.3;
                        wanted = Math.min(5, wanted + 1);
                    }
                }
            }
            b.life = 0;
        } else if (hit) {
            // Normal bullet hit
            for (const npc of npcs) {
                if (npc.health <= 0) continue;
                const dx = b.mesh.position.x - npc.mesh.position.x;
                const dz = b.mesh.position.z - npc.mesh.position.z;
                if (Math.sqrt(dx * dx + dz * dz) < 1.5) {
                    npc.health -= bulletDamage;
                    if (npc.health <= 0) {
                        npc.mesh.rotation.x = Math.PI / 2;
                        npc.mesh.position.y = 0.3;
                        wanted = Math.min(5, wanted + 1);
                    }
                    b.life = 0;
                    break;
                }
            }
        }

        if (b.life <= 0) {
            scene.remove(b.mesh);
            bullets.splice(i, 1);
        }
    }
}

function updateWanted() {
    if (wanted > 0) wanted = Math.max(0, wanted - 0.001);
    updateHUD();
}

function updateHUD() {
    document.getElementById('health-fill').style.width = health + '%';
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < Math.ceil(wanted) ? '★' : '☆';
    document.getElementById('wanted').textContent = stars;
}

// ── GAME LOOP ──
function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    updatePlayer(dt);
    updateCamera();
    updateNPCs();
    updateBullets();
    updateWanted();

    // Auto-fire for automatic weapons
    if (mouseDown && isLocked && weapons[currentWeapon].auto) {
        onShoot();
    }

    renderer.render(scene, camera);
}

// Start
init();
