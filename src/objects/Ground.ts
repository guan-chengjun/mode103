import * as THREE from 'three';

/**
 * 地面：承接阴影的圆形地板。
 */
export function createGround(): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(9, 64);
  const material = new THREE.MeshStandardMaterial({
    color: 0x17171c,
    roughness: 0.95,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true; // 承影
  return ground;
}
