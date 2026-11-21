import * as THREE from 'three';
import { RENDER_CONFIG } from '../config';

/**
 * 灯光布置：主光（投影）+ 半球环境光 + 冷色轮廓光。
 * 强度经过权衡，配合 ACES 色调映射避免过曝。
 */
export function setupLights(scene: THREE.Scene): void {
  // 半球光：模拟天空/地面的环境反射，提供基础照明
  const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x30281e, 0.5);
  scene.add(hemi);

  // 主光：暖白色，负责投射软阴影
  const key = new THREE.DirectionalLight(0xfff2e0, 2.0);
  key.position.set(4, 7, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(RENDER_CONFIG.shadowMapSize, RENDER_CONFIG.shadowMapSize);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -3;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02; // 减少阴影痤疮
  scene.add(key);

  // 轮廓光：冷色，从后上方勾勒玻璃边缘，增强通透感
  const rim = new THREE.DirectionalLight(0xa8c8ff, 0.7);
  rim.position.set(-4, 3, -5);
  scene.add(rim);
}
