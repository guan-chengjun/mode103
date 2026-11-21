import * as THREE from 'three';
import { easeInOutCubic } from '../utils/easing';

/**
 * 翻转动画：沙漏整体绕 X 轴缓动旋转 180°。
 * 由于沙漏上下对称，动画结束后把旋转角归零（视觉等价），
 * 由 onComplete 回调交换上下腔沙量。
 */
export class FlipAnimator {
  /** 动画进度，<0 表示空闲 */
  private progress = -1;

  constructor(
    private target: THREE.Object3D,
    private duration: number,
    private onComplete?: () => void,
  ) {}

  get isFlipping(): boolean {
    return this.progress >= 0;
  }

  /** 开始翻转；动画进行中重复调用会被忽略 */
  start(): void {
    if (this.isFlipping) return;
    this.progress = 0;
  }

  /** 每帧推进；dt 为 0 时动画同步冻结 */
  update(dt: number): void {
    if (!this.isFlipping) return;
    this.progress = Math.min(1, this.progress + dt / this.duration);
    this.target.rotation.x = easeInOutCubic(this.progress) * Math.PI;
    if (this.progress >= 1) {
      this.progress = -1;
      this.target.rotation.x = 0; // 上下对称，归零视觉等价
      this.onComplete?.();
    }
  }
}
