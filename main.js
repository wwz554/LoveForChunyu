// ====== 核心配置 ======
const PARTICLE_COUNT = 60000; // 粒子数量（可在设备允许情况下加到 100000）
const TEXT_CONTENT = "唐春雨我爱你";

// 初始化场景、相机和渲染器
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.001); // 宇宙深邃感

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
camera.position.z = 350;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 优化性能

// 鼠标控制宇宙旋转
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.enablePan = false;

// ====== 粒子状态生成函数 ======

// 1. 生成黑洞吸积盘/银河中心
function getGalaxyPositions() {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const colorInside = new THREE.Color(0xff69b4); // 粉色核心
    const colorOutside = new THREE.Color(0x4169e1); // 蓝色边缘

    for(let i = 0; i < PARTICLE_COUNT; i++) {
        const radius = Math.random() * Math.random() * 200 + 10;
        const spinAngle = radius * 5;
        const branchAngle = ((i % 3) / 3) * Math.PI * 2; // 3条旋臂
        const randomX = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * 15;
        const randomY = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * 15;
        const randomZ = Math.pow(Math.random(), 2) * (Math.random() < 0.5 ? 1 : -1) * 15;

        pos[i * 3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
        pos[i * 3 + 1] = randomY * (20/radius); // 越靠近中心越厚
        pos[i * 3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

        const mixedColor = colorInside.clone().lerp(colorOutside, radius / 200);
        colors[i*3] = mixedColor.r;
        colors[i*3+1] = mixedColor.g;
        colors[i*3+2] = mixedColor.b;
    }
    return { pos, colors };
}

// 2. 生成爱心 (基于心形数学方程)
function getHeartPositions() {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const color = new THREE.Color(0xff0040); // 鲜艳红/粉红

    for(let i = 0; i < PARTICLE_COUNT; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = Math.random() * 2 + 8; // 随机分布的心形厚度
        // 心形方程
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
        
        // 加入随机三维深度
        const z = (Math.random() - 0.5) * 30;

        pos[i * 3] = x * r;
        pos[i * 3 + 1] = y * r;
        pos[i * 3 + 2] = z;

        colors[i*3] = color.r + Math.random() * 0.2;
        colors[i*3+1] = color.g;
        colors[i*3+2] = color.b + Math.random() * 0.2;
    }
    return { pos, colors };
}

// 3. 解析文字成 3D 粒子
function getTextPositions() {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const color = new THREE.Color(0xffffff);

    // 使用离屏 Canvas 绘制文字并采样像素
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1000;
    textCanvas.height = 300;
    const ctx = textCanvas.getContext('2d');
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 120px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TEXT_CONTENT, textCanvas.width / 2, textCanvas.height / 2);

    const imgData = ctx.getImageData(0, 0, textCanvas.width, textCanvas.height).data;
    const validPixels = [];

    for (let y = 0; y < textCanvas.height; y += 2) {
        for (let x = 0; x < textCanvas.width; x += 2) {
            const index = (x + y * textCanvas.width) * 4;
            if (imgData[index] > 128) {
                // 将二维坐标居中
                validPixels.push({
                    x: x - textCanvas.width / 2,
                    y: -(y - textCanvas.height / 2)
                });
            }
        }
    }

    // 将粒子映射到文字像素上，多余的粒子在文字周围形成光晕
    for(let i = 0; i < PARTICLE_COUNT; i++) {
        const pixel = validPixels[i % validPixels.length];
        
        // 加入厚度和随机漂浮感，做成真 3D
        const scatter = Math.random() > 0.8 ? 50 : 2; // 20%的粒子作为光晕散开
        pos[i * 3] = pixel.x + (Math.random() - 0.5) * scatter;
        pos[i * 3 + 1] = pixel.y + (Math.random() - 0.5) * scatter;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 40;

        colors[i*3] = color.r;
        colors[i*3+1] = color.g * (Math.random() * 0.5 + 0.5); // 闪烁效果
        colors[i*3+2] = color.b * (Math.random() * 0.5 + 0.5);
    }
    return { pos, colors };
}

// 4. 烟花爆炸
function getFireworksPositions() {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    for(let i = 0; i < PARTICLE_COUNT; i++) {
        // 球面坐标系随机分布
        const r = Math.random() * 300 + 50;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);

        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);

        colors[i*3] = Math.random();
        colors[i*3+1] = Math.random();
        colors[i*3+2] = Math.random();
    }
    return { pos, colors };
}

// ====== 构建 GPU 粒子系统 (Vertex Shader) ======

const states = [
    getGalaxyPositions(), // 0: 银河/黑洞
    getHeartPositions(),  // 1: 爱心聚拢
    getTextPositions(),   // 2: 文字冲击
    getFireworksPositions() // 3: 烟花爆炸
];

const geometry = new THREE.BufferGeometry();
// 初始状态为 0
geometry.setAttribute('position', new THREE.BufferAttribute(states[0].pos, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(states[0].colors, 3));
// 目标状态属性（用于过渡）
geometry.setAttribute('targetPosition', new THREE.BufferAttribute(states[0].pos, 3));
geometry.setAttribute('targetColor', new THREE.BufferAttribute(states[0].colors, 3));

// 自定义着色器材质（将动画计算交给 GPU）
const material = new THREE.ShaderMaterial({
    uniforms: {
        uProgress: { value: 0.0 }, // 0->1 过渡进度
        uTime: { value: 0.0 }
    },
    vertexShader: `
        attribute vec3 targetPosition;
        attribute vec3 targetColor;
        varying vec3 vColor;
        uniform float uProgress;
        uniform float uTime;
        
        void main() {
            vColor = mix(color, targetColor, uProgress);
            
            // 添加宇宙跃迁 (Star Warp) 的拉伸效果和呼吸感
            vec3 pos = mix(position, targetPosition, uProgress);
            float noise = sin(uTime * 2.0 + position.x * 0.05) * 2.0;
            pos.y += noise;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = (300.0 / -mvPosition.z) * (1.0 + sin(uTime * 5.0 + position.x)*0.2);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        void main() {
            // 将方形点变成圆形发光点
            float dist = length(gl_PointCoord - vec2(0.5));
            if(dist > 0.5) discard;
            float alpha = 1.0 - (dist * 2.0);
            gl_FragColor = vec4(vColor, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending // 叠加发光模式
});

const particleSystem = new THREE.Points(geometry, material);
scene.add(particleSystem);

// 添加流星背景
function createMeteors() {
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(2000 * 3);
    for(let i=0; i<6000; i++) {
        starPos[i] = (Math.random() - 0.5) * 2000;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({color: 0xaaaaaa, size: 1.5, transparent: true});
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    return stars;
}
const stars = createMeteors();

// ====== 动画剧本场控 ======

let currentState = 0;
function changeState(nextStateIndex) {
    const nextState = states[nextStateIndex];
    
    // 更新目标属性
    geometry.attributes.targetPosition.array.set(nextState.pos);
    geometry.attributes.targetColor.array.set(nextState.colors);
    geometry.attributes.targetPosition.needsUpdate = true;
    geometry.attributes.targetColor.needsUpdate = true;

    // 重置进度并执行动画
    material.uniforms.uProgress.value = 0;
    gsap.to(material.uniforms.uProgress, {
        value: 1,
        duration: 2.5,
        ease: "power2.inOut",
        onComplete: () => {
            // 动画完成后，把当前状态变为起点，为下一次做准备
            geometry.attributes.position.array.set(nextState.pos);
            geometry.attributes.color.array.set(nextState.colors);
            geometry.attributes.position.needsUpdate = true;
            geometry.attributes.color.needsUpdate = true;
        }
    });

    // 宇宙跃迁效果 (镜头急拉)
    if (nextStateIndex === 2) { // 文字出现时拉近
        gsap.to(camera.position, { z: 150, duration: 2.5, ease: "power2.out" });
    } else if (nextStateIndex === 3) { // 烟花时镜头拉远
        gsap.to(camera.position, { z: 450, duration: 2.5, ease: "back.out(1.7)" });
    } else {
        gsap.to(camera.position, { z: 350, duration: 2.5 });
    }
}

// 自动轮播剧本
setInterval(() => {
    currentState = (currentState + 1) % states.length;
    changeState(currentState);
}, 6000); // 每 6 秒切换一次状态


// ====== 渲染循环 ======
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // 流星/背景星星旋转
    stars.rotation.y += 0.001;
    
    material.uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
}
animate();

// 窗口自适应
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ====== 音乐控制 ======
const bgm = document.getElementById('bgm');
const musicBtn = document.getElementById('music-controller');
let isPlaying = false;

musicBtn.addEventListener('click', () => {
    if (isPlaying) {
        bgm.pause();
        musicBtn.classList.remove('playing');
        musicBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>';
    } else {
        bgm.play();
        musicBtn.classList.add('playing');
        musicBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>';
    }
    isPlaying = !isPlaying;
});