import * as THREE from 'three';
import { FLIP_CONFIG, MODEL_CONFIG } from './config';
import { Stage } from './core/Stage';
import { setupLights } from './core/Lights';
import { createGround } from './objects/Ground';
import { Hourglass } from './objects/Hourglass';
import { SandSystem } from './objects/SandSystem';
import { FlipAnimator } from './animation/FlipAnimator';
import { ControlPanel } from './ui/ControlPanel';
import { createFallbackDecor, loadDecorativeModel, placeModel } from './loaders/ModelLoader';

/**
 * 入口：组装场景、接线交互、驱动主循环。
 */

// --- 舞台与灯光 ---
const stage = new Stage(document.getElementById('app')!);
setupLights(stage.scene);
stage.scene.add(createGround());

// --- 沙漏与沙子 ---
const hourglass = new Hourglass();
stage.scene.add(hourglass.group);

const sand = new SandSystem();
hourglass.group.add(sand.group); // 沙子挂在沙漏组下，翻转时随整体旋转

// --- 翻转动画：完成后交换上下腔沙量，沙子重新开始 ---
const flipper = new FlipAnimator(hourglass.group, FLIP_CONFIG.duration, () => {
  sand.swapChambers();
  panel.setFlipEnabled(true);
});

// --- 控制面板 ---
let paused = false;
const panel = new ControlPanel({
  onFlip: () => {
    flipper.start();
    panel.setFlipEnabled(false);
  },
  onFlowChange: (multiplier) => {
    sand.flowMultiplier = multiplier; // 滑杆实时调流速
  },
  onPauseToggle: (value) => {
    paused = value;
  },
});

// --- 装饰模型：联网加载 GLB，失败回退程序化装饰 ---
loadDecorativeModel(MODEL_CONFIG.urls, (state, message) => {
  panel.setModelStatus(state, message);
}).then((model) => {
  if (model) {
    stage.scene.add(placeModel(model, MODEL_CONFIG.targetHeight, MODEL_CONFIG.position));
  } else {
    stage.scene.add(createFallbackDecor(MODEL_CONFIG.position));
  }
});

// --- 主循环：暂停时 dt 归零，粒子与时钟同步冻结 ---
const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05); // 限制最大步长，防止切后台后跳变
  const dt = paused ? 0 : rawDt;

  flipper.update(dt);
  if (!flipper.isFlipping) {
    sand.update(dt); // 翻转过程中冻结沙子，避免粒子穿帮
  }

  stage.controls.update();
  stage.render();
}

animate();
