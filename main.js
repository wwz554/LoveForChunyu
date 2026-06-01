// ====== 核心配置 ======
const PARTICLE_COUNT = 80000; // 8万个高亮星芒粒子
const TEXT_CONTENT = "唐春雨我爱你";

// 初始化场景、相机和渲染器
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050010, 0.001); // 极深邃的宇宙夜空

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 3000);
// 初始相机位置在正正面（Z轴），确保一上来就是文字暴击
camera.position.set(0, 0, 240); 

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 鼠标控制核心
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
// 允许全方位旋转
controls.minDistance = 150;
controls.maxDistance = 500;

// ====== 空间三维度坐标生成 ======

// 维度 Z：真 3D 立体厚重文字（正面呈现）
function getTextPositions() {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const colorStart = new THREE.Color(0xff0077); // 炽热霓虹粉
    const colorEnd = new THREE.Color(0x00f0ff);   // 赛博荧光蓝

    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1600;
    textCanvas.height = 400;
    const ctx = textCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 180px "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TEXT_CONTENT, textCanvas.width / 2, textCanvas.height / 2);

    const imgData = ctx.getImageData(0, 0, textCanvas.width, textCanvas.height).data;
    const validPixels = [];
    for (let y = 0; y < textCanvas.height; y += 2) {
        for (let x = 0; x < textCanvas.width; x += 2) {
            if (imgData[(x + y * textCanvas.width) * 4] > 128) {
                validPixels.push({ x: x - textCanvas.width / 2, y: -(y - textCanvas.height / 2) });
            }
        }
    }

    for(let i = 0; i < PARTICLE_COUNT; i++) {
        const pixel = validPixels[i % validPixels.length];
        const depthLayers = 60; // 60层Z轴深度，压榨出极致的立体感
        const layer = i % depthLayers;
        const zDepth = (layer - depthLayers / 2) * 2.5; 
        const scale = 0.26; // 放大字形，撑满屏幕

        pos[i * 3] = pixel.x * scale + (Math.random() - 0.5) * 2;
        pos[i * 3 + 1] = pixel.y * scale + (Math.random() - 0.5) * 2;
        pos[i * 3 + 2] = zDepth;

        // 左右渐变色
        const mixRatio = (pixel.x + textCanvas.width/2) / textCanvas.width;
        const blended = colorStart.clone().lerp(colorEnd, mixRatio);
        colors[i*3] = blended.r;
        colors[i*3+1] = blended.g;
        colors[i*3+2] = blended.b;
    }
    return { pos, colors };
}

// 维度 X：巨大 3D 璀璨心形（侧面呈现）
function getHeartPositions() {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const color = new THREE.Color(0xff053a);

    for(let i = 0; i < PARTICLE_COUNT; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = Math.random() * 4 + 11; 
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
        const z = (Math.random() - 0.5) * 60; // 心形的厚度

        // 注意：我们将心形的主体转向侧面
        pos[i * 3] = z; 
        pos[i * 3 + 1] = y * r + 15;
        pos[i * 3 + 2] = x * r;

        colors[i*3] = color.r + Math.random() * 0.2;
        colors[i*3+1] = color.g;
        colors[i*3+2] = color.b + Math.random() * 0.3;
    }
    return { pos, colors };
}

// 维度 Y：银河黑洞吸积盘（顶/底俯瞰呈现）
function getGalaxyPositions() {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const colorInside = new THREE.Color(0xff00aa); 
    const colorOutside = new THREE.Color(0x0044ff); 

    for(let i = 0; i < PARTICLE_COUNT; i++) {
        const radius = Math.pow(Math.random(), 1.5) * 280 + 10;
        const spinAngle = radius * 4.0;
        const branchAngle = ((i % 4) / 4) * Math.PI * 2; // 壮丽的4旋臂
        
        const x = Math.cos(branchAngle + spinAngle) * radius;
        const z = Math.sin(branchAngle + spinAngle) * radius;
        const y = (Math.random() - 0.5) * (180 / (radius + 10)) * 5; // 中心厚边缘薄

        pos[i * 3] = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = z;

        const mixedColor = colorInside.clone().lerp(colorOutside, radius / 280);
        colors[i*3] = mixedColor.r;
        colors[i*3+1] = mixedColor.g;
        colors[i*3+2] = mixedColor.b;
    }
    return { pos, colors };
}

// ====== 装载多维数据到 GPU ======

const textState = getTextPositions();
const heartState = getHeartPositions();
const galaxyState = getGalaxyPositions();

const geometry = new THREE.BufferGeometry();
// 基础属性（文字）
geometry.setAttribute('position', new THREE.BufferAttribute(textState.pos, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(textState.colors, 3));
// 扩展属性（心形与星系）
geometry.setAttribute('aHeart', new THREE.BufferAttribute(heartState.pos, 3));
geometry.setAttribute('aHeartColor', new THREE.BufferAttribute(heartState.colors, 3));
geometry.setAttribute('aGalaxy', new THREE.BufferAttribute(galaxyState.pos, 3));
geometry.setAttribute('aGalaxyColor', new THREE.BufferAttribute(galaxyState.colors, 3));

// 编写多维混合着色器
const material = new THREE.ShaderMaterial({
    uniforms: {
        uHeartWeight: { value: 0.0 },  // 心形权重
        uGalaxyWeight: { value: 0.0 }, // 星系权重
        uTextWeight: { value: 1.0 },   // 文字权重
        uTime: { value: 0.0 }
    },
    vertexShader: `
        attribute vec3 aHeart;
        attribute vec3 aHeartColor;
        attribute vec3 aGalaxy;
        attribute vec3 aGalaxyColor;
        
        varying vec3 vColor;
        
        uniform float uHeartWeight;
        uniform float uGalaxyWeight;
        uniform float uTextWeight;
        uniform float uTime;
        
        void main() {
            // 根据实时视角权重，线性混合三大形状的坐标与颜色
            vec3 blendedPos = position * uTextWeight + aHeart * uHeartWeight + aGalaxy * uGalaxyWeight;
            vec3 blendedColor = color * uTextWeight + aHeartColor * uHeartWeight + aGalaxyColor * uGalaxyWeight;
            
            vColor = blendedColor;
            
            // 宇宙超光速跃迁 (Star Warp) 的拉伸视觉冲击
            // 越靠近变换临界点，粒子随时间产生的波动越激进
            float wave = sin(uTime * 3.0 + blendedPos.x * 0.01) * 2.5 * (uHeartWeight + uGalaxyWeight);
            blendedPos.y += wave;

            vec4 mvPosition = modelViewMatrix * vec4(blendedPos, 1.0);
            
            // 发光星芒大小自适应与微频闪
            gl_PointSize = (480.0 / -mvPosition.z) * (1.0 + sin(uTime * 10.0 + blendedPos.x) * 0.2);
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if(dist > 0.5) discard;
            // 极端耀眼的星芒核心扩散算法
            float glow = pow(1.0 - dist * 2.0, 3.0);
            gl_FragColor = vec4(vColor * (glow * 2.5), glow);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
});

const particleSystem = new THREE.Points(geometry, material);
scene.add(particleSystem);

// 全宇宙璀璨流星背景
function createSpaceBackground() {
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(4000 * 3);
    for(let i=0; i<12000; i++) {
        starPos[i] = (Math.random() - 0.5) * 3000;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({color: 0xffffff, size: 1.5, transparent: true, opacity: 0.4});
    return new THREE.Points(starGeo, starMat);
}
const spaceBg = createSpaceBackground();
scene.add(spaceBg);

// ====== 核心交互逻辑：视角监听器 ======

function updateWeightsByInertia() {
    // 获取相机在宇宙空间中的三维绝对坐标
    const x = Math.abs(camera.position.x);
    const y = Math.abs(camera.position.y);
    const z = Math.abs(camera.position.z);
    const total = x + y + z;

    // 使用高次幂增强过渡的边缘硬度，让形态在接近正视角时更完美
    const pX = Math.pow(x / total, 3);
    const pY = Math.pow(y / total, 3);
    const pZ = Math.pow(z / total, 3);
    const pSum = pX + pY + pZ;

    // 计算出契合当前视角的百分比权重
    const targetHeartWeight = pX / pSum;
    const targetGalaxyWeight = pY / pSum;
    const targetTextWeight = pZ / pSum;

    // 丝滑缓动：让粒子在拖动时有一种由于宇宙引力导致的“形态滞后感”，非常高级
    material.uniforms.uHeartWeight.value += (targetHeartWeight - material.uniforms.uHeartWeight.value) * 0.1;
    material.uniforms.uGalaxyWeight.value += (targetGalaxyWeight - material.uniforms.uGalaxyWeight.value) * 0.1;
    material.uniforms.uTextWeight.value += (targetTextWeight - material.uniforms.uTextWeight.value) * 0.1;
}

// ====== 渲染核心主循环 ======
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    
    // 更新鼠标拖拽控制器
    controls.update();
    
    // 实时根据鼠标旋转角度计算粒子形变权重
    updateWeightsByInertia();
    
    // 背景星空极为缓慢的自转
    spaceBg.rotation.y += 0.0003;
    
    material.uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
}
animate();

// 视口自适应
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ====== 音乐控制逻辑 ======
const bgm = document.getElementById('bgm');
const musicBtn = document.getElementById('music-controller');
let isPlaying = false;

musicBtn.addEventListener('click', () => {
    if (isPlaying) {
        bgm.pause();
        musicBtn.classList.remove('playing');
        musicBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>';
    } else {
        bgm.play().catch(() => console.log("互动激活媒体播放"));
        musicBtn.classList.add('playing');
        musicBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>';
    }
    isPlaying = !isPlaying;
});
