import type { ModelLoadState } from '../loaders/ModelLoader';

/** 控制面板回调 */
export interface ControlPanelHandlers {
  onFlip: () => void;
  onFlowChange: (multiplier: number) => void;
  onPauseToggle: (paused: boolean) => void;
}

/**
 * 控制面板：翻转按钮、流速滑杆、暂停按钮、模型加载状态。
 * 直接操作 DOM，样式在 index.html 中。
 */
export class ControlPanel {
  private flipButton: HTMLButtonElement;
  private pauseButton: HTMLButtonElement;
  private flowValue: HTMLSpanElement;
  private status: HTMLDivElement;
  private paused = false;

  constructor(handlers: ControlPanelHandlers) {
    const root = document.getElementById('panel')!;

    // --- 按钮行：翻转 + 暂停 ---
    const buttonRow = document.createElement('div');
    buttonRow.className = 'row';

    this.flipButton = document.createElement('button');
    this.flipButton.textContent = '翻转沙漏';
    this.flipButton.addEventListener('click', () => handlers.onFlip());

    this.pauseButton = document.createElement('button');
    this.pauseButton.textContent = '暂停';
    this.pauseButton.addEventListener('click', () => {
      this.paused = !this.paused;
      this.pauseButton.textContent = this.paused ? '继续' : '暂停';
      handlers.onPauseToggle(this.paused);
    });

    buttonRow.append(this.flipButton, this.pauseButton);

    // --- 流速滑杆行 ---
    const flowRow = document.createElement('div');
    flowRow.className = 'row';
    const label = document.createElement('span');
    label.textContent = '流速';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0.2';
    slider.max = '3';
    slider.step = '0.1';
    slider.value = '1';
    this.flowValue = document.createElement('span');
    this.flowValue.textContent = '1.0×';
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.flowValue.textContent = `${value.toFixed(1)}×`;
      handlers.onFlowChange(value);
    });
    flowRow.append(label, slider, this.flowValue);

    // --- 模型加载状态行 ---
    this.status = document.createElement('div');
    this.status.id = 'model-status';

    root.append(buttonRow, flowRow, this.status);
  }

  /** 更新模型加载状态显示 */
  setModelStatus(state: ModelLoadState, message: string): void {
    this.status.textContent = message;
    this.status.className = state === 'success' ? 'ok' : state === 'error' ? 'err' : '';
  }

  /** 翻转动画期间禁用翻转按钮，防止连点 */
  setFlipEnabled(enabled: boolean): void {
    this.flipButton.disabled = !enabled;
  }
}
