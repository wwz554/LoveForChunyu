// ====== 核心配置 ======
const PARTICLE_COUNT = 100000; // 提高到10万个粒子，进行无缝实心堆叠
const TEXT_CONTENT = "唐春雨我爱你";

// 初始化场景、相机和渲染器
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050010, 0.001); // 极深邃的宇宙夜空

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 3000);
// 初始相机位置在正正面，确保文字满屏、清晰呈现
camera.position.set(0, 0, 220); 

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// 鼠标控制核心
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
// 允许全方位旋转欣赏
controls.minDistance = 100;
controls.maxDistance = 500;

// ====== 空间三维度坐标生成：真实心Voxel文字 ======

function getTextPositions() {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    // 使用鲜艳的霓虹双色
    const colorStart = new THREE.Color(0xff0088); // 炽热霓虹粉
    const colorEnd = new THREE.Color(0x00ffff);   // 赛博荧光蓝

    // 创建高分辨率离屏Canvas用于文字严密采样
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1600;
    textCanvas.height = 400;
    const ctx = textCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    // 强制使用超粗体，确保粒子饱满无缝隙
    ctx.font = 'bold 220px "Microsoft YaHei", "SimHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(TEXT_CONTENT, textCanvas.width / 2, textCanvas.height / 2);

    const imgData = ctx.getImageData(0, 0, textCanvas.width, textCanvas.height).data;
    const validPixels = [];
    
    // 严密采样：采样步长必须小，确保无缝隙
    for (let y = 0; y < textCanvas.height; y += 1) {
        for (let x = 0; x < textCanvas.width; x += 1) {
            // 获取像素的阿尔法通道值
            if (imgData[(x + y * textCanvas.width) * 4 + 3] > 128) {
                validPixels.push({ x: x - textCanvas.width / 2, y: -(y - textCanvas.height / 2) });
            }
        }
    }

    // 将粒子严密映射到真 3D 实体空间中
    for(let i = 0; i < PARTICLE_COUNT; i++) {
        const pixel = validPixels[i % validPixels.length];
        
        // 【核心升级：真实心厚度】将粒子分布在70个不同的深度层，产生实体厚度
        const depthLayers = 70; 
        const layer = i % depthLayers;
        const zDepth = (layer - depthLayers / 2) * 3.5; // Z轴拉伸厚度

        // 缩放控制，让文字硕大贴脸满屏
        const scale = 0.28; 

        // 将单个粒子排布成无散乱的严格矩阵，产生积木般的实心效果
        pos[i * 3] = pixel.x * scale;
        pos[i * 3 + 1] = pixel.y * scale;
        pos[i * 3 + 2] = zDepth;

        // 根据3D空间位置进行双色霓虹渐变插值
        const mixRatio = (pixel.x + textCanvas.width/2) / textCanvas.width;
        const blended = colorStart.clone().lerp(colorEnd, mixRatio);
        colors[i * 3] = blended.r;
        colors[i * 3 + 1] = blended.g;
        colors[i * 3 + 2] = blended.b;
    }
    return { pos, colors };
}

// ====== 装载实心文字数据到 GPU ======
const textState = getTextPositions();
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(textState.pos, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(textState.colors, 3));

// ====== 编写高级霓虹闪烁着色器材质 ======

const material = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0.0 }
    },
    vertexShader: `
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        
        void main() {
            vColor = color;
            
            // 【核心升级：高频霓虹闪烁算法】
            // 使用正弦波控制粒子随时间产生的呼吸频闪效果
            float flash = sin(uTime * 15.0) * 0.5 + 0.5; // 0.0 -> 1.0 的闪烁
            // 将闪烁效果应用到亮度上
            vColor *= (0.7 + flash * 0.3); // 降低闪烁幅度，保持可读性
            
            // 细微的动态太空微动
            vec3 pos = position;
            pos.x += sin(uTime * 1.5 + position.z * 0.02) * 1.0;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            
            // 【核心升级：方形实体点】增大单个粒子尺寸，并使其随深度变化，产生实心覆盖
            // 将gl_PointSize放大，并保持正方形外观，不使用模糊的星芒纹理
            gl_PointSize = (2800.0 / -mvPosition.z); 
            gl_Position = projectionMatrix * mvPosition;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        void main() {
            // 【核心升级：锐利方形】不进行圆形 discard 或模糊处理，保持原始方形外观
            // 产生类似Voxel(体素/方块)拼装的实心感觉
            
            // 简单的边缘锐化处理
            if(length(gl_PointCoord - vec2(0.5)) > 0.48) discard;

            // 实心输出，产生强烈的厚重感
            gl_FragColor = vec4(vColor, 1.0); 
        }
    `,
    transparent: false, // 实体文字，不透明
    depthWrite: true,
    depthTest: true,
    // 使用标准叠加混合，产生强烈的发光感觉
    blending: THREE.NormalBlending 
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

// ====== 渲染核心主循环 ======
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);
    
    // 更新鼠标拖拽控制器
    controls.update();
    
    // 背景星空极为缓慢的自转
    spaceBg.rotation.y += 0.0003;
    
    // 将时间传递给着色器用于闪烁动画
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
