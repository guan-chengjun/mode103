import * as THREE from 'three';
import { HOURGLASS_CONFIG, SAND_CONFIG } from '../config';
import { innerRadiusAt } from './Hourglass';

const C = SAND_CONFIG;
/** 下半腔沙子的“地板”高度（沙漏局部坐标） */
const FLOOR_Y = -HOURGLASS_CONFIG.bulbHeight + 0.03;

/** 生成圆形柔边粒子贴图（Canvas 径向渐变） */
function makeParticleSprite(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

/**
 * 沙子系统：
 *  - 顶部沙面：随沙量下降的车削体（顶部带漏斗凹陷）
 *  - 底部沙堆：随沙量升高的圆锥堆
 *  - 漏孔粒子流：对象池粒子，受重力下落，落在沙堆表面回收
 * 沙量守恒：topAmount + bottomAmount ≈ 1。
 */
export class SandSystem {
  readonly group = new THREE.Group();

  /** 上/下腔沙量（0~1） */
  topAmount = 1;
  bottomAmount = 0;
  /** 流速倍率（滑杆实时调节） */
  flowMultiplier = 1;

  private topSand: THREE.Mesh;
  private bottomPile: THREE.Mesh;
  private sandMaterial: THREE.MeshStandardMaterial;

  private points: THREE.Points;
  private positions: Float32Array;
  private velocities: Float32Array; // 仅存 y 方向速度
  private alive: boolean[];
  private spawnAccumulator = 0;
  private cursor = 0;

  private lastTopHeight = -1;
  private lastPileHeight = -1;
  private pileHeight = 0;
  private pileRadius = 0;

  constructor() {
    // 暖黄色沙材质，粗糙度适中带来轻微高光
    this.sandMaterial = new THREE.MeshStandardMaterial({
      color: 0xf3c26b,
      roughness: 0.6,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    this.topSand = new THREE.Mesh(new THREE.BufferGeometry(), this.sandMaterial);
    this.bottomPile = new THREE.Mesh(new THREE.BufferGeometry(), this.sandMaterial);
    this.group.add(this.topSand, this.bottomPile);

    // --- 粒子流 ---
    const count = C.particleCount;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count);
    this.alive = new Array(count).fill(false);
    const colors = new Float32Array(count * 3);
    const palette = C.colors.map((c) => new THREE.Color(c));
    const tmp = new THREE.Color();
    for (let i = 0; i < count; i++) {
      this.positions[i * 3 + 1] = -999; // 未激活粒子藏在地面以下
      // 每颗粒子在暖黄色系内随机微调，增加层次
      tmp.copy(palette[i % palette.length]).offsetHSL(0, 0, (Math.random() - 0.5) * 0.06);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.04,
      map: makeParticleSprite(),
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false; // 粒子位置动态变化，关闭视锥剔除
    this.group.add(this.points);

    this.rebuildTopSand(true);
    this.rebuildBottomPile(true);
  }

  /** 每帧推进沙子模拟；dt 为 0（暂停/翻转中）时整体冻结 */
  update(dt: number): void {
    if (dt <= 0) return;

    // 沙量从上腔向下腔转移
    if (this.topAmount > 0) {
      const flow = Math.min(C.baseFlowRate * this.flowMultiplier * dt, this.topAmount);
      this.topAmount -= flow;
      this.bottomAmount = Math.min(1, this.bottomAmount + flow);
    }

    this.rebuildTopSand();
    this.rebuildBottomPile();
    this.updateParticles(dt);
  }

  /** 翻转完成后调用：交换上下腔沙量并清空粒子，沙子“回到上半腔”重新开始 */
  swapChambers(): void {
    [this.topAmount, this.bottomAmount] = [this.bottomAmount, this.topAmount];
    this.alive.fill(false);
    for (let i = 0; i < C.particleCount; i++) this.positions[i * 3 + 1] = -999;
    this.points.geometry.attributes.position.needsUpdate = true;
    this.lastTopHeight = -1;
    this.lastPileHeight = -1;
    this.rebuildTopSand(true);
    this.rebuildBottomPile(true);
  }

  /** 重建顶部沙面：沿玻璃内壁的车削体，高度随沙量下降 */
  private rebuildTopSand(force = false): void {
    const h = this.topAmount * C.maxSandHeight;
    if (h < 0.01) {
      this.topSand.visible = false;
      return;
    }
    this.topSand.visible = true;
    if (!force && Math.abs(h - this.lastTopHeight) < 0.004) return; // 变化太小不重建，减少 GC
    this.lastTopHeight = h;

    const points: THREE.Vector2[] = [new THREE.Vector2(0.001, 0.02)];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const y = 0.02 + ((h - 0.02) * i) / steps;
      points.push(new THREE.Vector2(innerRadiusAt(y) * 0.97, y));
    }
    // 顶部中心轻微凹陷，模拟漏沙漏斗
    points.push(new THREE.Vector2(0.001, h - Math.min(0.05, h * 0.25)));

    this.topSand.geometry.dispose();
    this.topSand.geometry = new THREE.LatheGeometry(points, 48);
  }

  /** 重建底部沙堆：高度随沙量升高的圆锥 */
  private rebuildBottomPile(force = false): void {
    const hp = this.bottomAmount * C.maxPileHeight;
    if (hp < 0.01) {
      this.bottomPile.visible = false;
      this.pileHeight = 0;
      this.pileRadius = 0;
      return;
    }
    this.bottomPile.visible = true;
    if (!force && Math.abs(hp - this.lastPileHeight) < 0.004) return;
    this.lastPileHeight = hp;

    // 按堆积角求底面半径，并限制不超过玻璃内壁
    let rp = hp / Math.tan(C.pileAngle);
    rp = Math.min(rp, innerRadiusAt(FLOOR_Y + hp) * 0.96);
    this.pileHeight = hp;
    this.pileRadius = rp;

    const points = [
      new THREE.Vector2(0.001, FLOOR_Y + hp),
      new THREE.Vector2(rp, FLOOR_Y + 0.005),
      new THREE.Vector2(0.001, FLOOR_Y + 0.005),
    ];
    this.bottomPile.geometry.dispose();
    this.bottomPile.geometry = new THREE.LatheGeometry(points, 48);
  }

  /** 沙堆表面高度（粒子落点判定用） */
  private pileSurfaceY(x: number, z: number): number {
    if (this.pileHeight <= 0) return FLOOR_Y;
    const dist = Math.hypot(x, z);
    if (dist >= this.pileRadius) return FLOOR_Y;
    return FLOOR_Y + this.pileHeight * (1 - dist / this.pileRadius);
  }

  /** 从对象池取一个死粒子放到漏孔处 */
  private spawnParticle(): void {
    const count = C.particleCount;
    for (let n = 0; n < count; n++) {
      this.cursor = (this.cursor + 1) % count;
      if (!this.alive[this.cursor]) {
        const i = this.cursor;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * HOURGLASS_CONFIG.neckRadius * 0.5;
        this.positions[i * 3] = Math.cos(angle) * r;
        this.positions[i * 3 + 1] = -0.03;
        this.positions[i * 3 + 2] = Math.sin(angle) * r;
        this.velocities[i] = -0.8;
        this.alive[i] = true;
        return;
      }
    }
  }

  /** 更新粒子：生成、重力下落、落到沙堆表面回收 */
  private updateParticles(dt: number): void {
    // 上腔有沙才持续生成粒子流，流速倍率实时生效
    if (this.topAmount > 0.001) {
      this.spawnAccumulator += C.spawnRate * this.flowMultiplier * dt;
      while (this.spawnAccumulator >= 1) {
        this.spawnAccumulator -= 1;
        this.spawnParticle();
      }
    }

    for (let i = 0; i < C.particleCount; i++) {
      if (!this.alive[i]) continue;
      const i3 = i * 3;
      this.velocities[i] -= C.gravity * dt;
      this.positions[i3 + 1] += this.velocities[i] * dt;
      const surfaceY = this.pileSurfaceY(this.positions[i3], this.positions[i3 + 2]);
      if (this.positions[i3 + 1] <= surfaceY) {
        this.alive[i] = false;
        this.positions[i3 + 1] = -999;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}
