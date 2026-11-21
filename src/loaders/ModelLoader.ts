import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** 模型加载的三种状态 */
export type ModelLoadState = 'loading' | 'success' | 'error';

/**
 * 依次尝试候选地址加载 GLB 装饰模型。
 * 状态通过 onState 回调通知 UI；全部失败返回 null（由调用方回退）。
 */
export async function loadDecorativeModel(
  urls: string[],
  onState: (state: ModelLoadState, message: string) => void,
): Promise<THREE.Object3D | null> {
  const loader = new GLTFLoader();
  onState('loading', '装饰模型加载中…');
  for (const url of urls) {
    try {
      const gltf = await loader.loadAsync(url);
      onState('success', '装饰模型加载成功');
      return gltf.scene;
    } catch {
      // 当前地址失败，尝试下一个候选地址
    }
  }
  onState('error', '模型加载失败，已使用内置装饰');
  return null;
}

/**
 * 把加载到的模型归一化到目标高度并放到指定位置（底部贴地）。
 */
export function placeModel(
  model: THREE.Object3D,
  targetHeight: number,
  position: [number, number, number],
): THREE.Object3D {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeight / (size.y || 1);
  model.scale.setScalar(scale);
  // 缩放后重新计算包围盒，把模型底部对齐到地面
  box.setFromObject(model);
  model.position.set(position[0], position[1] - box.min.y, position[2]);
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) child.castShadow = true;
  });
  return model;
}

/**
 * 模型加载失败时的程序化替代装饰：金属环结雕塑。
 */
export function createFallbackDecor(position: [number, number, number]): THREE.Object3D {
  const group = new THREE.Group();
  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.32, 0.1, 128, 24),
    new THREE.MeshStandardMaterial({ color: 0xb08d4f, roughness: 0.3, metalness: 0.9 }),
  );
  knot.position.y = 0.75;
  knot.castShadow = true;
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.46, 0.12, 48),
    new THREE.MeshStandardMaterial({ color: 0x7a4f28, roughness: 0.55, metalness: 0.1 }),
  );
  base.position.y = 0.06;
  base.castShadow = true;
  group.add(knot, base);
  group.position.set(...position);
  return group;
}
