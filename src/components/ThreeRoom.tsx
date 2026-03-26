import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type RemotePlayerState = {
    id: string;
    name: string;
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    updatedAt: number;
};

type MultiplayerEvent =
    | { type: "snapshot"; players: RemotePlayerState[] }
    | { type: "state"; player: RemotePlayerState }
    | { type: "leave"; id: string };

type ThreeRoomProps = {
    targetDate?: Date;
    onClose?: () => void;
};

type Collider = {
    x: number;
    z: number;
    r: number;
};

type Interactable = {
    object: THREE.Object3D;
    radius: number;
    message: string;
    label: string;
    kind?: "drink" | "bar" | "other";
    consumed?: boolean;
};

const PLAYER_ID_KEY = "three-room-player-id";
const PLAYER_NAME_KEY = "three-room-player-name";
const REMOTE_PLAYER_TTL = 7000;

function createPlayerId() {
    return `player-${Math.random().toString(36).slice(2, 10)}`;
}

function pickDefaultPlayerName() {
    const saved = window.localStorage.getItem(PLAYER_NAME_KEY)?.trim();
    if (saved) return saved;
    return `Guest-${Math.floor(100 + Math.random() * 900)}`;
}

function getOrCreatePlayerId() {
    const saved = window.localStorage.getItem(PLAYER_ID_KEY)?.trim();
    if (saved) return saved;
    const next = createPlayerId();
    window.localStorage.setItem(PLAYER_ID_KEY, next);
    return next;
}

async function postMultiplayerState(player: RemotePlayerState) {
    await fetch("/multiplayer/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player }),
    });
}

async function postMultiplayerLeave(id: string) {
    await fetch("/multiplayer/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
    });
}

function makeNameTagSprite(text: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    roundRect(ctx, 10, 16, canvas.width - 20, canvas.height - 32, 24);
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 229, 255, 0.95)";
    ctx.lineWidth = 6;
    roundRect(ctx, 10, 16, canvas.width - 20, canvas.height - 32, 24);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = '700 54px "Arial", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.8, 0.88, 1);
    return sprite;
}

function createRemoteAvatar(name: string, hue = Math.random()) {
    const group = new THREE.Group();
    const color = new THREE.Color().setHSL(hue, 0.85, 0.55);

    const bodyRadius = 0.33;
    const bodyLength = 0.8;
    const headRadius = 0.26;
    const bodyHeight = bodyLength + bodyRadius * 2;
    const bodyCenterY = bodyHeight / 2;

    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(bodyRadius, bodyLength, 6, 10),
        new THREE.MeshStandardMaterial({ color, emissive: color.clone().multiplyScalar(0.18) })
    );
    body.position.y = bodyCenterY;
    group.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(headRadius, 20, 20),
        new THREE.MeshStandardMaterial({ color: "#f2d3b1" })
    );
    head.position.y = bodyHeight + headRadius * 0.9;
    group.add(head);

    const marker = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.28, 12),
        new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#00e5ff", emissiveIntensity: 0.6 })
    );
    marker.rotation.x = Math.PI;
    marker.position.y = head.position.y + 0.5;
    group.add(marker);

    const nameTag = makeNameTagSprite(name);
    nameTag.position.y = head.position.y + 0.85;
    group.add(nameTag);

    return { group, nameTag };
}

function getTime(target: Date) {
    const d = Math.max(0, target.getTime() - Date.now());
    const s = Math.floor(d / 1000);

    return {
        w: Math.floor(s / 604800),
        d: Math.floor((s % 604800) / 86400),
        h: Math.floor((s % 86400) / 3600),
        m: Math.floor((s % 3600) / 60),
        s: s % 60,
    };
}

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function makeTextTexture(
    text: string,
    opts?: {
        width?: number;
        height?: number;
        fontSize?: number;
        bg?: string;
        fg?: string;
        stroke?: string;
        accent?: string;
    }
) {
    const width = opts?.width ?? 512;
    const height = opts?.height ?? 256;
    const fontSize = opts?.fontSize ?? 110;
    const bg = opts?.bg ?? "rgba(8,12,20,0.9)";
    const fg = opts?.fg ?? "#ffffff";
    const stroke = opts?.stroke ?? "#000000";
    const accent = opts?.accent ?? "#00e5ff";

    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;

    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = bg;
    roundRect(ctx, 14, 14, width - 28, height - 28, 24);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 8;
    roundRect(ctx, 14, 14, width - 28, height - 28, 24);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    roundRect(ctx, 28, 28, width - 56, height - 56, 18);
    ctx.stroke();

    ctx.font = `700 ${fontSize}px "Courier New", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 10;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = fg;

    ctx.strokeText(text, width / 2, height / 2 + 4);
    ctx.fillText(text, width / 2, height / 2 + 4);

    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
}

function palm(height = 1) {
    const g = new THREE.Group();

    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * height, 0.42 * height, 7 * height, 10),
        new THREE.MeshStandardMaterial({ color: "#8b5a2b", roughness: 1 })
    );
    trunk.position.y = 3.5 * height;
    trunk.rotation.z = -0.22 - Math.random() * 0.18;
    g.add(trunk);

    for (let i = 0; i < 10; i++) {
        const leaf = new THREE.Mesh(
            new THREE.ConeGeometry(0.28 * height, 4.6 * height, 4),
            new THREE.MeshStandardMaterial({ color: "#1f8f3a", roughness: 0.9 })
        );
        leaf.position.y = 6.9 * height;
        leaf.rotation.z = -1.25;
        leaf.rotation.y = (i / 10) * Math.PI * 2;
        g.add(leaf);
    }

    return g;
}

function rock(size = 1) {
    const r = new THREE.Mesh(
        new THREE.IcosahedronGeometry(size, 1),
        new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0, 0, 0.45 + Math.random() * 0.12),
            roughness: 1,
        })
    );
    r.scale.y = 0.35 + Math.random() * 0.8;
    r.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );
    return r;
}

function coronaBottle() {
    const g = new THREE.Group();

    const bottleColor = "#b9770e";

    const glassMat = new THREE.MeshStandardMaterial({
        color: bottleColor,
        transparent: true,
        opacity: 0.82,
        roughness: 0.25,
    });

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.24, 1.5, 16),
        glassMat
    );
    body.position.y = 0.78;
    g.add(body);

    const shoulder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 0.22, 16),
        glassMat
    );
    shoulder.position.y = 1.65;
    g.add(shoulder);

    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 0.38, 16),
        glassMat
    );
    neck.position.y = 1.95;
    g.add(neck);

    const labelWrap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.245, 0.185, 0.42, 20, 1, true),
        new THREE.MeshStandardMaterial({
            color: "#f7e7a9",
            side: THREE.DoubleSide,
        })
    );
    labelWrap.position.y = 0.95;
    g.add(labelWrap);

    const topLabel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.112, 0.102, 0.18, 20, 1, true),
        new THREE.MeshStandardMaterial({
            color: "#f7e7a9",
            side: THREE.DoubleSide,
        })
    );
    topLabel.position.y = 1.72;
    g.add(topLabel);

    const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: "#d4af37" })
    );
    crown.position.y = 2.18;
    g.add(crown);

    const front = new THREE.Mesh(
        new THREE.PlaneGeometry(0.42, 0.18),
        new THREE.MeshBasicMaterial({
            map: makeTextTexture("CORONA", {
                width: 512,
                height: 160,
                fontSize: 52,
                bg: "rgba(247,231,169,1)",
                fg: "#1f3a93",
                stroke: "#ffffff",
                accent: "#d4af37",
            }),
            transparent: true,
        })
    );
    front.position.set(0, 0.95, 0.245);
    g.add(front);

    const lime = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 10),
        new THREE.MeshStandardMaterial({ color: "#9be15d" })
    );
    lime.position.set(0.06, 2.18, 0.03);
    g.add(lime);

    return g;
}

function margaritaGlass() {
    const g = new THREE.Group();

    const glassMat = new THREE.MeshStandardMaterial({
        color: "#dff6ff",
        transparent: true,
        opacity: 0.32,
        roughness: 0.08,
        metalness: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
    });

    const drinkColors = ["#b7ef6f", "#ffd166", "#ffadad", "#9bf6ff"];
    const drinkColor = drinkColors[Math.floor(Math.random() * drinkColors.length)];

    const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.65, 0.18, 0.35, 32, 1, true),
        glassMat
    );
    bowl.position.y = 1.18;
    g.add(bowl);

    const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.14, 0.2, 24),
        new THREE.MeshStandardMaterial({
            color: drinkColor,
            transparent: true,
            opacity: 0.92,
            roughness: 0.05,
            metalness: 0.1,
        })
    );
    liquid.position.y = 1.17;
    g.add(liquid);

    const surface = new THREE.Mesh(
        new THREE.CircleGeometry(0.48, 32),
        new THREE.MeshStandardMaterial({
            color: drinkColor,
            transparent: true,
            opacity: 0.95,
        })
    );
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = 1.28;
    g.add(surface);

    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.62, 12),
        glassMat
    );
    stem.position.y = 0.68;
    g.add(stem);

    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.05, 18),
        glassMat
    );
    base.position.y = 0.34;
    g.add(base);

    const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.52, 0.025, 10, 28),
        new THREE.MeshStandardMaterial({ color: "#f8f9fa" })
    );
    rim.position.y = 1.33;
    rim.rotation.x = Math.PI / 2;
    g.add(rim);

    const lime = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.035, 8, 18),
        new THREE.MeshStandardMaterial({ color: "#a9e34b" })
    );
    lime.position.set(0.34, 1.28, 0);
    lime.rotation.y = Math.PI / 2;
    g.add(lime);

    const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8),
        new THREE.MeshStandardMaterial({ color: "#ffffff" })
    );
    straw.position.set(-0.08, 1.38, 0);
    straw.rotation.z = -0.45;
    g.add(straw);

    return g;
}

function chair(color = "#ff8787") {
    const g = new THREE.Group();

    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.2, 0.7),
        new THREE.MeshStandardMaterial({ color })
    );
    seat.position.y = 0.6;
    g.add(seat);

    const back = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.9, 0.2),
        new THREE.MeshStandardMaterial({ color })
    );
    back.position.set(0, 1.2, -0.2);
    g.add(back);

    return g;
}

function canPlace(
    x: number,
    z: number,
    radius: number,
    colliders: Collider[],
    maxIslandRadius: number
) {
    const distFromCenter = Math.sqrt(x * x + z * z);
    if (distFromCenter + radius > maxIslandRadius) return false;

    for (const c of colliders) {
        const dx = x - c.x;
        const dz = z - c.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < radius + c.r) return false;
    }

    return true;
}

function placeRandom(
    radius: number,
    colliders: Collider[],
    spread: number,
    maxIslandRadius: number,
    tries = 40
) {
    for (let i = 0; i < tries; i++) {
        const x = (Math.random() - 0.5) * spread;
        const z = (Math.random() - 0.5) * spread;
        if (canPlace(x, z, radius, colliders, maxIslandRadius)) {
            return { x, z };
        }
    }
    return null;
}

export default function ThreeRoom({ targetDate, onClose }: ThreeRoomProps) {
    const ref = useRef<HTMLDivElement>(null);
    const playerIdRef = useRef<string>(getOrCreatePlayerId());
    const [playerName, setPlayerName] = useState(() => pickDefaultPlayerName());
    const playerNameRef = useRef(playerName);
    const drunkLevelRef = useRef(0);

    const [locked, setLocked] = useState(false);
    const [interactionText, setInteractionText] = useState("");
    const [hintText, setHintText] = useState("");
    const [onlineCount, setOnlineCount] = useState(1);
    const [drunkLevel, setDrunkLevel] = useState(0);

    const target = useMemo(
        () => targetDate || new Date(2026, 6, 19, 12, 50),
        [targetDate]
    );

    useEffect(() => {
        const nextName = playerName.trim() || pickDefaultPlayerName();
        playerNameRef.current = nextName;
        window.localStorage.setItem(PLAYER_NAME_KEY, nextName);
    }, [playerName]);

    useEffect(() => {
        drunkLevelRef.current = drunkLevel;
    }, [drunkLevel]);

    useEffect(() => {
        if (!ref.current) return;

        const PALM_COUNT = 24;
        const ROCK_COUNT = 16;
        const DRINK_COUNT = 12;
        const CHAIR_COUNT = 8;
        const MAX_ISLAND_RADIUS = 28;

        const colliders: Collider[] = [];
        const interactables: Interactable[] = [];

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2("#ff9966", 0.003);

        const skyGeo = new THREE.SphereGeometry(500, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                top: { value: new THREE.Color("#1d4e89") },
                mid: { value: new THREE.Color("#ff2d55") },
                bottom: { value: new THREE.Color("#1d4e89") },
            },
            vertexShader: `
                varying vec3 vPos;
                void main() {
                    vPos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 top;
                uniform vec3 mid;
                uniform vec3 bottom;
                varying vec3 vPos;

                void main() {
                    float h = normalize(vPos).y * 0.5 + 0.5;
                    vec3 c = mix(bottom, mid, smoothstep(0.0, 0.45, h));
                    c = mix(c, top, smoothstep(0.45, 1.0, h));
                    gl_FragColor = vec4(c, 1.0);
                }
            `,
        });
        scene.add(new THREE.Mesh(skyGeo, skyMat));

        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1200
        );

        const pitchObject = new THREE.Object3D();
        pitchObject.add(camera);

        const player = new THREE.Object3D();
        player.position.set(0, 2.2, 18);
        player.add(pitchObject);
        scene.add(player);

        camera.position.set(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        ref.current.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.72));

        const sunsetLight = new THREE.DirectionalLight("#ffb07c", 1.8);
        sunsetLight.position.set(30, 35, -40);
        scene.add(sunsetLight);

        const sunGlow = new THREE.PointLight("#ff9966", 3.2, 250);
        sunGlow.position.set(0, 35, -55);
        scene.add(sunGlow);

        const sand = new THREE.Mesh(
            new THREE.CircleGeometry(30, 96),
            new THREE.MeshStandardMaterial({
                color: "#c89d6d",
                roughness: 1,
            })
        );
        sand.rotation.x = -Math.PI / 2;
        scene.add(sand);

        const shore = new THREE.Mesh(
            new THREE.RingGeometry(28, 31.5, 128),
            new THREE.MeshStandardMaterial({
                color: "#f4e7c5",
                transparent: true,
                opacity: 0.95,
            })
        );
        shore.rotation.x = -Math.PI / 2;
        shore.position.y = 0.02;
        scene.add(shore);

        const waterGeo = new THREE.RingGeometry(31, 140, 256);
        const waterMat = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color("#1fb6d5") },
                color2: { value: new THREE.Color("#103f75") },
            },
            vertexShader: `
                uniform float time;
                varying vec2 vUv;
                varying float vWave;
                void main() {
                    vUv = uv;
                    vec3 p = position;
                    float wave1 = sin((p.x + time * 4.0) * 0.12) * 0.22;
                    float wave2 = cos((p.y + time * 3.0) * 0.18) * 0.18;
                    float wave3 = sin((p.x * 0.08 + p.y * 0.06 + time * 2.2)) * 0.14;
                    p.z += wave1 + wave2 + wave3;
                    vWave = p.z;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                varying vec2 vUv;
                varying float vWave;
                void main() {
                    float mixV = smoothstep(-0.25, 0.35, vWave);
                    vec3 col = mix(color2, color1, mixV);
                    float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
                    gl_FragColor = vec4(col, 0.9 * edge + 0.06);
                }
            `,
        });
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.y = -0.24;
        scene.add(water);

        const sunDisc = new THREE.Mesh(
            new THREE.SphereGeometry(5.5, 24, 24),
            new THREE.MeshBasicMaterial({ color: "#ffb36b" })
        );
        sunDisc.position.set(0, 18, -140);
        scene.add(sunDisc);

        const barGroup = new THREE.Group();
        barGroup.position.set(-8, 0, -4);
        scene.add(barGroup);

        colliders.push({ x: -8, z: -4, r: 4.4 });
        interactables.push({
            object: barGroup,
            radius: 4.5,
            label: "Bar",
            message: "Willkommen an der Neon Beach Bar ✨",
            kind: "bar",
            consumed: false,
        });

        const barBase = new THREE.Mesh(
            new THREE.BoxGeometry(7, 2.2, 2.4),
            new THREE.MeshStandardMaterial({
                color: "#161616",
                emissive: "#00a8b5",
                emissiveIntensity: 0.7,
            })
        );
        barBase.position.y = 1.1;
        barGroup.add(barBase);

        const backWall = new THREE.Mesh(
            new THREE.BoxGeometry(6.4, 3.8, 0.4),
            new THREE.MeshStandardMaterial({
                color: "#101010",
                emissive: "#4c00ff",
                emissiveIntensity: 0.5,
            })
        );
        backWall.position.set(0, 2.4, -1.2);
        barGroup.add(backWall);

        const neonSign = new THREE.Mesh(
            new THREE.PlaneGeometry(4.8, 0.85),
            new THREE.MeshBasicMaterial({
                map: makeTextTexture("NEON BEACH BAR", {
                    width: 1024,
                    height: 180,
                    fontSize: 54,
                    bg: "rgba(10,0,20,0.7)",
                    fg: "#ffffff",
                    stroke: "#000000",
                    accent: "#ff00ff",
                }),
                transparent: true,
            })
        );
        neonSign.position.set(0, 4.5, -0.95);
        barGroup.add(neonSign);

        for (let i = 0; i < 10; i++) {
            const d = i % 2 === 0 ? coronaBottle() : margaritaGlass();
            d.scale.setScalar(0.52);
            d.position.set(-2.2 + (i % 5) * 1.1, i < 5 ? 2.45 : 3.15, -0.58);
            barGroup.add(d);
        }

        const barLight = new THREE.PointLight("#00ffff", 2, 20);
        barLight.position.set(0, 4.2, 0.5);
        barGroup.add(barLight);

        const board = new THREE.Group();
        board.position.set(5, 0, -6);
        scene.add(board);

        colliders.push({ x: 5, z: -6, r: 4.3 });

        const posts = [-5.5, 5.5];
        posts.forEach((x) => {
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.22, 0.28, 5.5, 12),
                new THREE.MeshStandardMaterial({ color: "#7f5539" })
            );
            post.position.set(x, 2.2, 0);
            board.add(post);
        });

        const plank = new THREE.Mesh(
            new THREE.BoxGeometry(11.5, 4.6, 0.35),
            new THREE.MeshStandardMaterial({
                color: "#6f4518",
                emissive: "#2a1408",
                emissiveIntensity: 0.2,
            })
        );
        plank.position.y = 3;
        board.add(plank);

        const title = new THREE.Mesh(
            new THREE.PlaneGeometry(7.6, 0.8),
            new THREE.MeshBasicMaterial({
                map: makeTextTexture("COUNTDOWN TO AYIA NAPA", {
                    width: 1400,
                    height: 160,
                    fontSize: 48,
                    bg: "rgba(6,10,20,0.9)",
                    fg: "#ffffff",
                    stroke: "#000000",
                    accent: "#ffd43b",
                }),
                transparent: true,
            })
        );
        title.position.set(0, 4.2, 0.22);
        board.add(title);

        const labels = ["Wochen", "Tage", "Stunden", "Minuten", "Sekunden"];
        const nums: THREE.Mesh[] = [];

        for (let i = 0; i < 5; i++) {
            const x = -3.9 + i * 1.95;

            const frame = new THREE.Mesh(
                new THREE.BoxGeometry(1.75, 1.75, 0.08),
                new THREE.MeshStandardMaterial({
                    color: "#1b263b",
                    emissive: "#00e5ff",
                    emissiveIntensity: 0.25,
                })
            );
            frame.position.set(x, 2.95, 0.14);
            board.add(frame);

            const numberPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(1.45, 1.45),
                new THREE.MeshBasicMaterial({
                    map: makeTextTexture("00", {
                        width: 512,
                        height: 512,
                        fontSize: 180,
                        bg: "rgba(3,8,18,0.96)",
                        fg: "#ffffff",
                        stroke: "#000000",
                        accent: "#00f5ff",
                    }),
                    transparent: true,
                })
            );
            numberPlane.position.set(x, 2.95, 0.22);
            board.add(numberPlane);
            nums.push(numberPlane);

            const label = new THREE.Mesh(
                new THREE.PlaneGeometry(1.5, 0.3),
                new THREE.MeshBasicMaterial({
                    map: makeTextTexture(labels[i], {
                        width: 700,
                        height: 120,
                        fontSize: 42,
                        bg: "rgba(0,0,0,0.82)",
                        fg: "#ffd43b",
                        stroke: "#000000",
                        accent: "#ff922b",
                    }),
                    transparent: true,
                })
            );
            label.position.set(x, 1.88, 0.22);
            board.add(label);
        }

        const boatGroup = new THREE.Group();
        boatGroup.position.set(9, -0.05, -40);
        scene.add(boatGroup);

        const hull = new THREE.Mesh(
            new THREE.BoxGeometry(3.4, 0.9, 7),
            new THREE.MeshStandardMaterial({ color: "#8b5a2b" })
        );
        boatGroup.add(hull);

        for (let i = 0; i < PALM_COUNT; i++) {
            let placed = false;

            for (let t = 0; t < 50 && !placed; t++) {
                const a = Math.random() * Math.PI * 2;
                const r = 17 + Math.random() * 9;
                const x = Math.cos(a) * r;
                const z = Math.sin(a) * r;
                const radius = 1.4;

                if (!canPlace(x, z, radius, colliders, MAX_ISLAND_RADIUS)) continue;

                const p = palm(0.8 + Math.random() * 0.45);
                p.position.set(x, 0, z);
                p.rotation.y = Math.random() * Math.PI * 2;
                scene.add(p);

                colliders.push({ x, z, r: radius });
                placed = true;
            }
        }

        for (let i = 0; i < ROCK_COUNT; i++) {
            const pos = placeRandom(1.15, colliders, 44, MAX_ISLAND_RADIUS, 50);
            if (!pos) continue;

            const r = rock(Math.random() * 1.2 + 0.45);
            r.position.set(pos.x, 0.2, pos.z);
            scene.add(r);

            colliders.push({ x: pos.x, z: pos.z, r: 1.15 });
        }

        for (let i = 0; i < DRINK_COUNT; i++) {
            const pos = placeRandom(0.7, colliders, 26, MAX_ISLAND_RADIUS, 50);
            if (!pos) continue;

            const isCorona = Math.random() > 0.45;
            const drink = isCorona ? coronaBottle() : margaritaGlass();
            drink.rotation.y = Math.random() * Math.PI * 2;
            drink.position.set(pos.x, 0, pos.z);
            scene.add(drink);

            colliders.push({ x: pos.x, z: pos.z, r: 0.7 });
            interactables.push({
                object: drink,
                radius: 1.6,
                label: isCorona ? "Corona" : "Margarita",
                message: isCorona
                    ? "Du trinkst ein Corona 🍺"
                    : "Du trinkst eine Margarita 🍸",
                kind: "drink",
                consumed: false,
            });
        }

        for (let i = 0; i < CHAIR_COUNT; i++) {
            const pos = placeRandom(1.1, colliders, 28, MAX_ISLAND_RADIUS, 40);
            if (!pos) continue;

            const c = chair(["#ff8787", "#ffd43b", "#4dabf7", "#69db7c"][i % 4]);
            c.position.set(pos.x, 0, pos.z);
            c.rotation.y = Math.random() * Math.PI * 2;
            scene.add(c);

            colliders.push({ x: pos.x, z: pos.z, r: 1.1 });
        }

        const keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            sprint: false,
        };

        let yaw = 0;
        let pitch = 0;
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();

        const PLAYER_HEIGHT = 2.2;
        const GRAVITY = 22;
        const JUMP_FORCE = 8.5;
        const WALK_SPEED = 6;
        const SPRINT_SPEED = 11;
        let canJump = true;

        let interactionTimeout: number | null = null;
        let visualDrunk = 0;
        let wobbleTime = 0;

        const remotePlayers = new Map<string, {
            root: THREE.Group;
            nameTag: THREE.Sprite;
            targetPosition: THREE.Vector3;
            currentPosition: THREE.Vector3;
            targetYaw: number;
            currentYaw: number;
            updatedAt: number;
            name: string;
        }>();
        let eventSource: EventSource | null = null;
        let networkBroadcastTimer: number | null = null;
        let reconnectTimer: number | null = null;

        const getSelfState = (): RemotePlayerState => ({
            id: playerIdRef.current,
            name: playerNameRef.current || "Guest",
            x: player.position.x,
            y: player.position.y,
            z: player.position.z,
            yaw,
            pitch,
            updatedAt: Date.now(),
        });

        const updateOnlineCount = () => {
            setOnlineCount(remotePlayers.size + 1);
        };

        const removeRemotePlayer = (id: string) => {
            const remote = remotePlayers.get(id);
            if (!remote) return;
            scene.remove(remote.root);
            remotePlayers.delete(id);
            updateOnlineCount();
        };

        const upsertRemotePlayer = (state: RemotePlayerState) => {
            if (state.id === playerIdRef.current) return;

            let remote = remotePlayers.get(state.id);
            if (!remote) {
                const { group, nameTag } = createRemoteAvatar(state.name);
                group.position.set(state.x, 0, state.z);
                group.rotation.y = state.yaw;
                scene.add(group);
                remote = {
                    root: group,
                    nameTag,
                    targetPosition: new THREE.Vector3(state.x, 0, state.z),
                    currentPosition: new THREE.Vector3(state.x, 0, state.z),
                    targetYaw: state.yaw,
                    currentYaw: state.yaw,
                    updatedAt: state.updatedAt,
                    name: state.name,
                };
                remotePlayers.set(state.id, remote);
                updateOnlineCount();
            }

            remote.targetPosition.set(state.x, 0, state.z);
            remote.targetYaw = state.yaw;
            remote.updatedAt = state.updatedAt;

            if (remote.name !== state.name) {
                remote.name = state.name;
                const nextTag = makeNameTagSprite(state.name);
                nextTag.position.copy(remote.nameTag.position);
                remote.root.remove(remote.nameTag);
                (remote.nameTag.material as THREE.SpriteMaterial).map?.dispose();
                (remote.nameTag.material as THREE.SpriteMaterial).dispose();
                remote.nameTag = nextTag;
                remote.root.add(nextTag);
            }
        };

        const syncSelfState = async () => {
            try {
                await postMultiplayerState(getSelfState());
            } catch (error) {
                console.warn("Multiplayer sync failed", error);
            }
        };

        const showInteractionMessage = (msg: string) => {
            setInteractionText(msg);
            if (interactionTimeout) window.clearTimeout(interactionTimeout);
            interactionTimeout = window.setTimeout(() => {
                setInteractionText("");
            }, 1600);
        };

        const getClosestInteractable = () => {
            let closest: Interactable | null = null;
            let closestDist = Infinity;
            const tempPos = new THREE.Vector3();

            for (const item of interactables) {
                if (item.consumed) continue;

                item.object.getWorldPosition(tempPos);

                const dx = player.position.x - tempPos.x;
                const dz = player.position.z - tempPos.z;
                const dist = Math.sqrt(dx * dx + dz * dz);

                if (dist < item.radius && dist < closestDist) {
                    closest = item;
                    closestDist = dist;
                }
            }

            return closest;
        };

        const drinkItem = (item: Interactable) => {
            if (item.consumed || item.kind !== "drink") return;

            item.consumed = true;
            scene.remove(item.object);

            item.object.traverse((child) => {
                const mesh = child as THREE.Mesh & { material?: THREE.Material | THREE.Material[] };
                mesh.geometry?.dispose?.();

                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((m) => m?.dispose?.());
                } else {
                    mesh.material?.dispose?.();
                }
            });

            const nextDrunk = Math.min(1, drunkLevelRef.current + 0.18);
            drunkLevelRef.current = nextDrunk;
            setDrunkLevel(nextDrunk);

            showInteractionMessage(`${item.message} • Alkoholpegel: ${Math.round(nextDrunk * 100)}%`);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            switch (e.code) {
                case "KeyW":
                    keys.forward = true;
                    break;
                case "KeyS":
                    keys.backward = true;
                    break;
                case "KeyA":
                    keys.left = true;
                    break;
                case "KeyD":
                    keys.right = true;
                    break;
                case "ShiftLeft":
                case "ShiftRight":
                    keys.sprint = true;
                    break;
                case "Space":
                    if (canJump) {
                        velocity.y = JUMP_FORCE;
                        canJump = false;
                    }
                    break;
                case "KeyE": {
                    const hit = getClosestInteractable();
                    if (hit) {
                        if (hit.kind === "drink") {
                            drinkItem(hit);
                        } else {
                            showInteractionMessage(hit.message);
                        }
                    }
                    break;
                }
                case "Escape":
                    document.exitPointerLock?.();
                    break;
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            switch (e.code) {
                case "KeyW":
                    keys.forward = false;
                    break;
                case "KeyS":
                    keys.backward = false;
                    break;
                case "KeyA":
                    keys.left = false;
                    break;
                case "KeyD":
                    keys.right = false;
                    break;
                case "ShiftLeft":
                case "ShiftRight":
                    keys.sprint = false;
                    break;
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement !== renderer.domElement) return;

            const sensitivity = 0.0022;
            yaw -= e.movementX * sensitivity;
            pitch -= e.movementY * sensitivity;

            const maxPitch = Math.PI / 2 - 0.05;
            pitch = Math.max(-maxPitch, Math.min(maxPitch, pitch));

            player.rotation.y = yaw;
            pitchObject.rotation.x = pitch;
        };

        const onPointerLockChange = () => {
            const isLocked = document.pointerLockElement === renderer.domElement;
            setLocked(isLocked);
        };

        const applyMultiplayerEvent = (data: MultiplayerEvent) => {
            if (!data) return;

            if (data.type === "snapshot") {
                const keepIds = new Set<string>();
                data.players.forEach((remoteState) => {
                    if (remoteState.id !== playerIdRef.current) {
                        keepIds.add(remoteState.id);
                        upsertRemotePlayer(remoteState);
                    }
                });
                for (const id of Array.from(remotePlayers.keys())) {
                    if (!keepIds.has(id)) {
                        removeRemotePlayer(id);
                    }
                }
                return;
            }

            if (data.type === "state") {
                upsertRemotePlayer(data.player);
                return;
            }

            if (data.type === "leave") {
                removeRemotePlayer(data.id);
            }
        };

        const connectMultiplayer = () => {
            eventSource?.close();
            eventSource = new EventSource(`/multiplayer/events?playerId=${encodeURIComponent(playerIdRef.current)}`);

            eventSource.addEventListener("snapshot", (event) => {
                applyMultiplayerEvent(JSON.parse((event as MessageEvent).data) as MultiplayerEvent);
            });
            eventSource.addEventListener("state", (event) => {
                applyMultiplayerEvent(JSON.parse((event as MessageEvent).data) as MultiplayerEvent);
            });
            eventSource.addEventListener("leave", (event) => {
                applyMultiplayerEvent(JSON.parse((event as MessageEvent).data) as MultiplayerEvent);
            });
            eventSource.onerror = () => {
                eventSource?.close();
                eventSource = null;
                if (reconnectTimer === null) {
                    reconnectTimer = window.setTimeout(() => {
                        reconnectTimer = null;
                        connectMultiplayer();
                    }, 1200);
                }
            };
        };

        renderer.domElement.addEventListener("click", () => {
            renderer.domElement.requestPointerLock();
        });

        connectMultiplayer();
        void syncSelfState();
        networkBroadcastTimer = window.setInterval(() => {
            void syncSelfState();
        }, 120);

        document.addEventListener("pointerlockchange", onPointerLockChange);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        let raf = 0;
        let last = performance.now();

        const loop = (nowMs: number) => {
            const dt = Math.min(0.033, (nowMs - last) / 1000);
            last = nowMs;

            wobbleTime += dt;

            drunkLevelRef.current = Math.max(0, drunkLevelRef.current - dt * 0.012);
            setDrunkLevel((prev) => {
                const next = Math.max(0, prev - dt * 0.012);
                return Math.abs(next - prev) > 0.0005 ? next : prev;
            });

            visualDrunk += (drunkLevelRef.current - visualDrunk) * Math.min(1, dt * 2.5);

            const t = getTime(target);
            const arr = [t.w, t.d, t.h, t.m, t.s];

            arr.forEach((v, i) => {
                const mat = nums[i].material as THREE.MeshBasicMaterial;
                mat.map = makeTextTexture(String(v).padStart(2, "0"), {
                    width: 512,
                    height: 512,
                    fontSize: 180,
                    bg: "rgba(3,8,18,0.96)",
                    fg: "#ffffff",
                    stroke: "#000000",
                    accent: "#00f5ff",
                });
                mat.needsUpdate = true;
            });

            waterMat.uniforms.time.value = nowMs * 0.001;
            boatGroup.position.y = -0.05 + Math.sin(nowMs * 0.0014) * 0.18;
            boatGroup.rotation.z = Math.sin(nowMs * 0.0011) * 0.06;

            direction.set(0, 0, 0);
            if (keys.forward) direction.z -= 1;
            if (keys.backward) direction.z += 1;
            if (keys.left) direction.x -= 1;
            if (keys.right) direction.x += 1;

            if (direction.lengthSq() > 0) direction.normalize();

            const speed = keys.sprint ? SPRINT_SPEED : WALK_SPEED;
            const move = new THREE.Vector3(direction.x, 0, direction.z);
            const stumbleAngle =
                Math.sin(wobbleTime * (2.1 + visualDrunk * 1.5)) * visualDrunk * 0.22;
            move.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw + stumbleAngle);

            const nextX = player.position.x + move.x * speed * dt;
            const nextZ = player.position.z + move.z * speed * dt;

            player.position.x = nextX;
            player.position.z = nextZ;

            const radius = Math.sqrt(player.position.x ** 2 + player.position.z ** 2);
            if (radius > MAX_ISLAND_RADIUS) {
                const angle = Math.atan2(player.position.z, player.position.x);
                player.position.x = Math.cos(angle) * MAX_ISLAND_RADIUS;
                player.position.z = Math.sin(angle) * MAX_ISLAND_RADIUS;
            }

            velocity.y -= GRAVITY * dt;
            player.position.y += velocity.y * dt;

            if (player.position.y <= PLAYER_HEIGHT) {
                player.position.y = PLAYER_HEIGHT;
                velocity.y = 0;
                canJump = true;
            }

            const closest = getClosestInteractable();
            setHintText(closest ? `E drücken: ${closest.label}` : "");

            for (const [id, remote] of remotePlayers) {
                if (Date.now() - remote.updatedAt > REMOTE_PLAYER_TTL) {
                    removeRemotePlayer(id);
                    continue;
                }

                remote.currentPosition.lerp(remote.targetPosition, Math.min(1, dt * 10));
                remote.root.position.copy(remote.currentPosition);
                remote.currentYaw += (remote.targetYaw - remote.currentYaw) * Math.min(1, dt * 10);
                remote.root.rotation.y = remote.currentYaw;
                remote.nameTag.lookAt(camera.position);
            }

            const wobble = visualDrunk * 0.035;
            const roll = Math.sin(wobbleTime * (1.8 + visualDrunk * 2.2)) * wobble;
            const swayX = Math.sin(wobbleTime * (1.6 + visualDrunk * 1.4)) * visualDrunk * 0.08;
            const swayY = Math.cos(wobbleTime * (2.4 + visualDrunk * 1.7)) * visualDrunk * 0.05;
            const zoomPulse = 75 + Math.sin(wobbleTime * 1.3) * visualDrunk * 4.5;

            camera.rotation.z = roll;
            camera.position.x = swayX;
            camera.position.y = swayY;
            camera.fov += (zoomPulse - camera.fov) * Math.min(1, dt * 2.2);
            camera.updateProjectionMatrix();

            renderer.render(scene, camera);
            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            if (interactionTimeout) window.clearTimeout(interactionTimeout);
            window.removeEventListener("resize", handleResize);
            document.removeEventListener("pointerlockchange", onPointerLockChange);
            if (networkBroadcastTimer !== null) window.clearInterval(networkBroadcastTimer);
            if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
            eventSource?.close();
            void postMultiplayerLeave(playerIdRef.current).catch(() => undefined);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);

            if (document.pointerLockElement === renderer.domElement) {
                document.exitPointerLock?.();
            }

            if (ref.current && renderer.domElement.parentNode === ref.current) {
                ref.current.removeChild(renderer.domElement);
            }

            remotePlayers.forEach((remote) => {
                (remote.nameTag.material as THREE.SpriteMaterial).map?.dispose();
                (remote.nameTag.material as THREE.SpriteMaterial).dispose();
            });

            renderer.dispose();
        };
    }, [target]);

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "#000",
            }}
        >
            <div ref={ref} style={{ width: "100vw", height: "100vh", cursor: "crosshair" }} />

            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 12,
                    height: 12,
                    borderRadius: "999px",
                    border: "2px solid rgba(255,255,255,0.85)",
                    pointerEvents: "none",
                    boxShadow: "0 0 10px rgba(255,255,255,0.35)",
                }}
            />

            {!locked && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        bottom: 28,
                        transform: "translateX(-50%)",
                        padding: "12px 18px",
                        borderRadius: 14,
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        fontSize: 14,
                        backdropFilter: "blur(8px)",
                    }}
                >
                    Klick ins Bild für Maussteuerung • WASD laufen • Shift sprint • Space jump • E interagieren • ESC frei
                </div>
            )}

            <div
                style={{
                    position: "absolute",
                    top: 20,
                    left: 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 14,
                    background: "rgba(0,0,0,0.55)",
                    color: "#fff",
                    backdropFilter: "blur(8px)",
                    minWidth: 240,
                }}
            >
                <div style={{ fontSize: 13, opacity: 0.78 }}>Online multiplayer</div>
                <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                    Dein Name
                    <input
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value.slice(0, 18))}
                        style={{
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.18)",
                            background: "rgba(255,255,255,0.08)",
                            color: "#fff",
                            padding: "8px 10px",
                            outline: "none",
                        }}
                    />
                </label>
                <div style={{ fontSize: 13, opacity: 0.88 }}>Online in room: {onlineCount}</div>
                <div style={{ fontSize: 13, opacity: 0.88 }}>
                    Pegel: {Math.round(drunkLevel * 100)}%
                </div>
            </div>

            {hintText && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        bottom: 86,
                        transform: "translateX(-50%)",
                        padding: "10px 16px",
                        borderRadius: 12,
                        background: "rgba(0,0,0,0.55)",
                        color: "#fff",
                        fontSize: 14,
                        backdropFilter: "blur(8px)",
                        pointerEvents: "none",
                    }}
                >
                    {hintText}
                </div>
            )}

            {interactionText && (
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        top: 24,
                        transform: "translateX(-50%)",
                        padding: "12px 18px",
                        borderRadius: 14,
                        background: "rgba(0,0,0,0.65)",
                        color: "#fff",
                        fontSize: 15,
                        backdropFilter: "blur(8px)",
                        pointerEvents: "none",
                    }}
                >
                    {interactionText}
                </div>
            )}

            <div
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background: `radial-gradient(
                        circle at center,
                        rgba(255,255,255,0) 40%,
                        rgba(120, 255, 120, ${drunkLevel * 0.06}) 62%,
                        rgba(0, 0, 0, ${drunkLevel * 0.22}) 100%
                    )`,
                    mixBlendMode: "screen",
                    opacity: 0.9,
                }}
            />

            <button
                onClick={onClose}
                style={{
                    position: "absolute",
                    top: 20,
                    right: 20,
                    padding: "10px 14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    cursor: "pointer",
                    backdropFilter: "blur(8px)",
                }}
            >
                Schliessen
            </button>
        </div>
    );
}