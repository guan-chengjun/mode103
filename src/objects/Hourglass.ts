import * as THREE from 'three';
import { HOURGLASS_CONFIG } from '../config';

const C = HOURGLASS_CONFIG;

/**
 * 玻璃外轮廓半径函数：颈部细、球部鼓的沙漏曲线。
 * SandSystem 也用它推算内腔半径，保证沙子贴合玻璃内壁。
 */
export function glassRadiusAt(y: number): number {
  const t = Math.min(Math.abs(y) / C.bulbHeight, 1);
  return C.neckRadius + (C.maxRadius - C.neckRadius) * Math.pow(t, 1.7);
}

/** 玻璃内腔半径（扣除壁厚） */
export function innerRadiusAt(y: number): number {
  return Math.max(glassRadiusAt(y) - C.wallThickness, 0.03);
}

/**
 * 沙漏本体：玻璃罩（PBR 折射材质）+ 上下端盖 + 三根支撑柱。
 * 整体关于中心上下对称，翻转 180° 后视觉等价，便于动画归零。
 */
export class Hourglass {
  readonly group = new THREE.Group();

  constructor() {
    this.buildGlass();
    this.buildCaps();
    this.buildPillars();
    // 端盖外沿刚好落在 y = ±(glassExtend + capHeight)，整体抬升使其立于地面
    this.group.position.y = C.glassExtend + C.capHeight;
  }

  /** 玻璃罩：车削几何 + 物理透射材质（折射与厚度感） */
  private buildGlass(): void {
    const points: THREE.Vector2[] = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const y = -C.glassExtend + (2 * C.glassExtend * i) / segments;
      points.push(new THREE.Vector2(glassRadiusAt(y), y));
    }
    const geometry = new THREE.LatheGeometry(points, 96);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.05,
      transmission: 1.0,          // 全透射，模拟玻璃折射
      thickness: 0.18,            // 厚度感（影响折射衰减）
      ior: 1.5,                   // 玻璃折射率
      attenuationColor: new THREE.Color(0xe8f4ff),
      attenuationDistance: 4,
      clearcoat: 0.5,             // 表面清漆高光
      clearcoatRoughness: 0.1,
      side: THREE.DoubleSide,
    });
    const glass = new THREE.Mesh(geometry, material);
    glass.castShadow = false; // 玻璃不投实心阴影，避免画面出现黑块
    this.group.add(glass);
  }

  /** 上下端盖：木质 PBR 材质 + 金属装饰环 */
  private buildCaps(): void {
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x7a4f28,
      roughness: 0.55,
      metalness: 0.1,
    });
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0xc0a060,
      roughness: 0.3,
      metalness: 0.9, // 金属反射环境贴图
    });

    for (const sign of [1, -1]) {
      // 略带锥度的端盖
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(C.capRadius * 0.97, C.capRadius, C.capHeight, 64),
        woodMaterial,
      );
      cap.position.y = sign * (C.glassExtend + C.capHeight / 2);
      cap.castShadow = true;
      cap.receiveShadow = true;
      this.group.add(cap);

      // 玻璃与端盖交界处的金属环
      const ring = new THREE.Mesh(new THREE.TorusGeometry(C.maxRadius, 0.035, 16, 72), metalMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = sign * C.glassExtend;
      ring.castShadow = true;
      this.group.add(ring);
    }
  }

  /** 三根支撑柱：金属材质，反射环境光 */
  private buildPillars(): void {
    const material = new THREE.MeshStandardMaterial({
      color: 0xb08d4f,
      roughness: 0.35,
      metalness: 0.85,
    });
    const height = 2 * (C.glassExtend + C.capHeight);
    const geometry = new THREE.CylinderGeometry(C.pillarRadius, C.pillarRadius, height, 24);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const pillar = new THREE.Mesh(geometry, material);
      pillar.position.set(Math.cos(angle) * 1.04, 0, Math.sin(angle) * 1.04);
      pillar.castShadow = true;
      this.group.add(pillar);
    }
  }
}
