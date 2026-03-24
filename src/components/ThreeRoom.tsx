import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type ThreeRoomProps = {
    targetDate?: Date;
    onClose?: () => void;
};

// ---------- TIME ----------
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

// ---------- ROUND RECT ----------
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

// ---------- TEXT TEXTURE ----------
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

// ---------- PALM ----------
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

// ---------- ROCK ----------
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

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.24, 1.5, 16),
        new THREE.MeshStandardMaterial({
            color: bottleColor,
            transparent: true,
            opacity: 0.82,
            roughness: 0.25,
        })
    );
    body.position.y = 0.78;
    g.add(body);

    const shoulder = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 0.22, 16),
        new THREE.MeshStandardMaterial({
            color: bottleColor,
            transparent: true,
            opacity: 0.82,
        })
    );
    shoulder.position.y = 1.65;
    g.add(shoulder);

    const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 0.38, 16),
        new THREE.MeshStandardMaterial({
            color: bottleColor,
            transparent: true,
            opacity: 0.82,
        })
    );
    neck.position.y = 1.95;
    g.add(neck);

    const label = new THREE.Mesh(
        new THREE.CylinderGeometry(0.181, 0.221, 0.42, 20, 1, true),
        new THREE.MeshStandardMaterial({
            color: "#f7e7a9",
            side: THREE.DoubleSide,
        })
    );
    label.position.y = 0.95;
    g.add(label);

    const topLabel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.101, 0.111, 0.18, 20, 1, true),
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

    // Corona Schrift als kleines Front-Label
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
    front.position.set(0, 0.95, 0.23);
    g.add(front);

    // Limette oben
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
        opacity: 0.35,
        roughness: 0.08,
        metalness: 0.05,
    });

    const drinkColors = ["#b7ef6f", "#ffd166", "#ffadad", "#9bf6ff"];
    const drinkColor = drinkColors[Math.floor(Math.random() * drinkColors.length)];

    // Schale
    const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.58, 0.42, 20),
        glassMat
    );
    bowl.position.y = 1.18;
    g.add(bowl);

    // Drink innen
    const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.5, 0.22, 20),
        new THREE.MeshStandardMaterial({
            color: drinkColor,
            transparent: true,
            opacity: 0.85,
            roughness: 0.2,
        })
    );
    liquid.position.y = 1.12;
    g.add(liquid);

    // Stiel
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.62, 12),
        glassMat
    );
    stem.position.y = 0.68;
    g.add(stem);

    // Fuss
    const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.05, 18),
        glassMat
    );
    base.position.y = 0.34;
    g.add(base);

    // Salzrand
    const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.52, 0.025, 10, 28),
        new THREE.MeshStandardMaterial({ color: "#f8f9fa" })
    );
    rim.position.y = 1.37;
    rim.rotation.x = Math.PI / 2;
    g.add(rim);

    // Limettenscheibe
    const lime = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.035, 8, 18),
        new THREE.MeshStandardMaterial({ color: "#a9e34b" })
    );
    lime.position.set(0.34, 1.32, 0);
    lime.rotation.y = Math.PI / 2;
    g.add(lime);

    // Strohhalm
    const straw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.55, 8),
        new THREE.MeshStandardMaterial({ color: "#ffffff" })
    );
    straw.position.set(-0.08, 1.42, 0);
    straw.rotation.z = -0.45;
    g.add(straw);

    return g;
}

// ---------- CHAIR ----------
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

export default function ThreeRoom({ targetDate, onClose }: ThreeRoomProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [locked, setLocked] = useState(false);

    const target = useMemo(
        () => targetDate || new Date(2026, 6, 19, 12, 50),
        [targetDate]
    );

    useEffect(() => {
        if (!ref.current) return;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2("#ff9966", 0.003);

        // ---------- SKY ----------
        const skyGeo = new THREE.SphereGeometry(500, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                top: { value: new THREE.Color("#ff5f6d") },
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

        // ---------- CAMERA / PLAYER ----------
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

        // ---------- RENDERER ----------
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        ref.current.appendChild(renderer.domElement);

        // ---------- LIGHT ----------
        scene.add(new THREE.AmbientLight(0xffffff, 0.72));

        const sunsetLight = new THREE.DirectionalLight("#ffb07c", 1.8);
        sunsetLight.position.set(30, 35, -40);
        scene.add(sunsetLight);

        const sunGlow = new THREE.PointLight("#ff9966", 3.2, 250);
        sunGlow.position.set(0, 35, -55);
        scene.add(sunGlow);

        // ---------- ISLAND ----------
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

        // ---------- WATER ----------
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

        // ---------- SUN ----------
        const sunDisc = new THREE.Mesh(
            new THREE.SphereGeometry(5.5, 24, 24),
            new THREE.MeshBasicMaterial({ color: "#ffb36b" })
        );
        sunDisc.position.set(0, 18, -140);
        scene.add(sunDisc);

        // ---------- BAR ----------
        const barGroup = new THREE.Group();
        barGroup.position.set(-8, 0, -4);
        scene.add(barGroup);

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
                map: makeTextTexture("BEACH BAR", {
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


        // ---------- COUNTDOWN ----------
        const board = new THREE.Group();
        board.position.set(5, 0, -6);
        scene.add(board);

        const posts = [-4.5, 4.5];
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

        // ---------- BOAT ----------
        const boatGroup = new THREE.Group();
        boatGroup.position.set(9, -0.05, -40);
        scene.add(boatGroup);

        const hull = new THREE.Mesh(
            new THREE.BoxGeometry(3.4, 0.9, 7),
            new THREE.MeshStandardMaterial({ color: "#8b5a2b" })
        );
        boatGroup.add(hull);

        // ---------- PALMS ----------
        for (let i = 0; i < 30; i++) {
            const p = palm(0.8 + Math.random() * 0.45);
            const a = Math.random() * Math.PI * 2;
            const r = 17 + Math.random() * 11;
            p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
            p.rotation.y = Math.random() * Math.PI * 2;
            scene.add(p);
        }

        // ---------- ROCKS ----------
        for (let i = 0; i < 40; i++) {
            const rr = 18 + Math.random() * 15;
            const ang = Math.random() * Math.PI * 2;
            const r = rock(Math.random() * 1.8 + 0.35);
            r.position.set(Math.cos(ang) * rr, 0.2, Math.sin(ang) * rr);
            scene.add(r);
        }

// ---------- DRINKS ----------
        for (let i = 0; i < 25; i++) {
            const drink = Math.random() > 0.45 ? coronaBottle() : margaritaGlass();
            drink.rotation.y = Math.random() * Math.PI * 2;
            drink.position.set((Math.random() - 0.5) * 38, 0, (Math.random() - 0.5) * 38);
            scene.add(drink);
        }

        // ---------- CHAIRS ----------
        for (let i = 0; i < 7; i++) {
            const c = chair(["#ff8787", "#ffd43b", "#4dabf7", "#69db7c"][i % 4]);
            c.position.set((Math.random() - 0.5) * 25, 0, (Math.random() - 0.5) * 25);
            c.rotation.y = Math.random() * Math.PI * 2;
            scene.add(c);
        }

        // ---------- INPUT ----------
        const keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            sprint: false,
            jump: false,
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
                    keys.jump = true;
                    if (canJump) {
                        velocity.y = JUMP_FORCE;
                        canJump = false;
                    }
                    break;
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
                case "Space":
                    keys.jump = false;
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

        renderer.domElement.addEventListener("click", () => {
            renderer.domElement.requestPointerLock();
        });

        document.addEventListener("pointerlockchange", onPointerLockChange);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("keyup", onKeyUp);

        // ---------- RESIZE ----------
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener("resize", handleResize);

        // ---------- LOOP ----------
        let raf = 0;
        let last = performance.now();

        const loop = (nowMs: number) => {
            const dt = Math.min(0.033, (nowMs - last) / 1000);
            last = nowMs;

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

            // movement
            direction.set(0, 0, 0);
            if (keys.forward) direction.z -= 1;
            if (keys.backward) direction.z += 1;
            if (keys.left) direction.x -= 1;
            if (keys.right) direction.x += 1;

            if (direction.lengthSq() > 0) direction.normalize();

            const speed = keys.sprint ? SPRINT_SPEED : WALK_SPEED;

            const move = new THREE.Vector3(direction.x, 0, direction.z);
            move.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

            player.position.x += move.x * speed * dt;
            player.position.z += move.z * speed * dt;

            // simple island boundary
            const radius = Math.sqrt(player.position.x ** 2 + player.position.z ** 2);
            const maxRadius = 28;
            if (radius > maxRadius) {
                const angle = Math.atan2(player.position.z, player.position.x);
                player.position.x = Math.cos(angle) * maxRadius;
                player.position.z = Math.sin(angle) * maxRadius;
            }

            // gravity / jump
            velocity.y -= GRAVITY * dt;
            player.position.y += velocity.y * dt;

            if (player.position.y <= PLAYER_HEIGHT) {
                player.position.y = PLAYER_HEIGHT;
                velocity.y = 0;
                canJump = true;
            }

            renderer.render(scene, camera);
            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("resize", handleResize);
            document.removeEventListener("pointerlockchange", onPointerLockChange);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("keyup", onKeyUp);

            if (document.pointerLockElement === renderer.domElement) {
                document.exitPointerLock?.();
            }

            if (ref.current && renderer.domElement.parentNode === ref.current) {
                ref.current.removeChild(renderer.domElement);
            }

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
                    Klick ins Bild für Maussteuerung • WASD laufen • Shift sprint • Space jump • ESC frei
                </div>
            )}

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