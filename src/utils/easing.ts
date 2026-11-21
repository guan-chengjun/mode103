/**
 * 缓动函数工具
 */

/** 三次方缓入缓出：翻转动画使用，起步和停止都柔和 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
