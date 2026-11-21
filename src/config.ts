/**
 * 全局配置文件
 * 所有可调参数（模型地址、沙漏几何、沙子物理、渲染设置）集中在此，便于修改。
 */

/** 装饰模型配置（GLB 地址允许联网加载，按顺序尝试，全部失败则回退到程序化装饰） */
export const MODEL_CONFIG = {
  urls: [
    // three.js 官方示例仓库的 Flamingo 模型，jsDelivr CDN 镜像（带 CORS 头）
    'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/Flamingo.glb',
    // 备用地址：GitHub Raw（同样允许跨域）
    'https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/models/gltf/Flamingo.glb',
  ],
  /** 模型归一化后的目标高度（世界单位） */
  targetHeight: 1.15,
  /** 摆放位置（相对世界原点） */
  position: [2.4, 0, -0.9] as [number, number, number],
};

/** 沙漏几何参数 */
export const HOURGLASS_CONFIG = {
  bulbHeight: 1.5,      // 单腔高度（颈部到端盖）
  neckRadius: 0.16,     // 颈部半径
  maxRadius: 1.0,       // 球部最大半径
  wallThickness: 0.06,  // 玻璃壁厚（用于推算沙子的内腔半径）
  capRadius: 1.15,      // 端盖半径
  capHeight: 0.14,      // 端盖厚度
  pillarRadius: 0.05,   // 支撑柱半径
  glassExtend: 1.56,    // 玻璃延伸到端盖内的高度
};

/** 沙子物理参数 */
export const SAND_CONFIG = {
  maxSandHeight: 1.0,    // 上半腔沙面最大高度
  maxPileHeight: 1.0,    // 下半腔沙堆最大高度
  particleCount: 500,    // 粒子池大小
  spawnRate: 130,        // 基础粒子生成速率（个/秒，流速倍率为 1 时）
  baseFlowRate: 0.02,    // 基础沙量流速（总沙量 1，约 50 秒流完）
  gravity: 5.0,          // 粒子重力加速度
  pileAngle: 0.9,        // 沙堆堆积角（弧度）
  /** 暖黄色系沙粒调色板 */
  colors: [0xf8cd7d, 0xf3bc5e, 0xecab45],
};

/** 渲染参数 */
export const RENDER_CONFIG = {
  maxPixelRatio: 2,      // 限制设备像素比，避免高分屏性能损耗
  shadowMapSize: 2048,   // 阴影贴图尺寸
  exposure: 1.0,         // 色调映射曝光（避免过曝）
};

/** 翻转动画参数 */
export const FLIP_CONFIG = {
  duration: 1.4, // 翻转时长（秒）
};
