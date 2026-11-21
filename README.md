# 交互式 3D 沙漏

基于 **Vite + Three.js + TypeScript** 的可交互 3D 沙漏。多文件 ES Module 工程，开箱即跑。

## 启动步骤

```bash
npm install
npm run dev
```

浏览器会自动打开 `http://localhost:5173`（若未自动打开请手动访问）。

其他命令：

```bash
npm run build    # 类型检查 + 生产构建（输出 dist/）
npm run preview  # 预览生产构建
```

## 依赖及版本

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| three | ^0.160.0 | 3D 渲染（PBR、软阴影、粒子） |
| @types/three | ^0.160.0 | three 的 TypeScript 类型 |
| typescript | ^5.3.3 | 类型检查 |
| vite | ^5.0.8 | 开发服务器与构建 |

## 交互说明

- **拖动 / 滚轮**：旋转、缩放视角（OrbitControls）
- **翻转沙漏**：整体绕 X 轴缓动旋转 180°，完成后沙子回到上半腔重新开始
- **流速滑杆**：0.2× ~ 3.0× 实时调节漏沙速度（沙量转移与粒子生成同步变化）
- **暂停 / 继续**：粒子、沙量、翻转动画与时钟同步冻结

## 模型来源

装饰模型使用 three.js 官方示例仓库的 **Flamingo.glb**（`mrdoob/three.js`，示例模型遵循 MIT 许可），地址统一写在 `src/config.ts` 的 `MODEL_CONFIG.urls`：

1. `https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/Flamingo.glb`（jsDelivr CDN，首选）
2. `https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/models/gltf/Flamingo.glb`（GitHub Raw，备用）

加载过程有 **加载中 / 成功 / 失败** 三种状态，显示在左上角面板；全部地址失败时自动回退到程序化生成的金属环结装饰，场景始终完整可用。

## 可调参数（`src/config.ts`）

| 配置 | 说明 |
| --- | --- |
| `MODEL_CONFIG` | 模型候选地址、目标高度、摆放位置 |
| `HOURGLASS_CONFIG` | 球部高度、颈部/最大半径、壁厚、端盖与支柱尺寸 |
| `SAND_CONFIG.maxSandHeight` / `maxPileHeight` | 上腔沙面 / 下腔沙堆最大高度 |
| `SAND_CONFIG.particleCount` / `spawnRate` | 粒子池大小 / 基础生成速率 |
| `SAND_CONFIG.baseFlowRate` | 基础流速（0.02 ≈ 50 秒流完） |
| `SAND_CONFIG.gravity` / `pileAngle` | 粒子重力 / 沙堆堆积角 |
| `SAND_CONFIG.colors` | 沙粒暖黄色系调色板 |
| `RENDER_CONFIG.maxPixelRatio` | 设备像素比上限（默认 2） |
| `RENDER_CONFIG.shadowMapSize` / `exposure` | 阴影贴图尺寸 / 曝光 |
| `FLIP_CONFIG.duration` | 翻转动画时长（秒） |

## 目录结构

```
├── index.html                  # 页面骨架与面板样式
├── vite.config.ts              # Vite 配置
├── src/
│   ├── main.ts                 # 入口：组装场景与主循环
│   ├── config.ts               # 全部可调参数与模型地址
│   ├── core/
│   │   ├── Stage.ts            # 渲染器/相机/环境反射/自适应
│   │   └── Lights.ts           # 三点式灯光布置
│   ├── objects/
│   │   ├── Hourglass.ts        # 玻璃罩（透射 PBR）+ 端盖 + 支柱
│   │   ├── SandSystem.ts       # 沙面/沙堆/粒子流模拟
│   │   └── Ground.ts           # 承影地面
│   ├── loaders/
│   │   └── ModelLoader.ts      # GLB 加载（三态）与回退装饰
│   ├── animation/
│   │   └── FlipAnimator.ts     # 绕 X 轴 180° 缓动翻转
│   ├── ui/
│   │   └── ControlPanel.ts     # 翻转/流速/暂停面板
│   └── utils/
│       └── easing.ts           # 缓动函数
└── package.json
```

## 实现要点

- **渲染**：`MeshPhysicalMaterial` 透射玻璃（折射率 1.5 + 厚度衰减）、`PCFSoftShadowMap` 软阴影、RoomEnvironment PMREM 环境反射、ACES 色调映射防过曝、像素比限制在 2 以内、窗口缩放自适应。
- **沙子物理**：上腔沙面为贴合玻璃内壁的车削体，随沙量下降；漏孔粒子流使用对象池 + 重力积分；下腔沙堆按堆积角升高；沙量守恒转移，翻转后交换上下腔沙量重新开始。
- **暂停语义**：暂停时帧步长归零，粒子、沙量、翻转动画与时钟同步冻结，视角仍可操作。
