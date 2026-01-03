// 用来给图片进行自由的缩放

import Delta from "../Delta/Delta";
import { Editor } from "../Editor/Editor";

export class ImageResizer {
  editor: Editor;
  overlay: HTMLElement;
  currentImage: HTMLImageElement | null = null;

  // 拖拽状态记录
  isResizing: boolean = false;
  startX: number = 0;
  startWidth: number = 0;

  constructor(editor: Editor) {
    this.editor = editor;
    this.overlay = this._createOverlay();
    this._bindEvents();
  }

  /**
   * 创建覆盖层DOM
   * @returns
   */
  private _createOverlay(): HTMLElement {
    const div = document.createElement("div");
    div.id = "image-resizer";

    // 这里只使用右下角手柄，如果需要四角可以自己进行添加
    const handle = document.createElement("div");
    handle.className = "resize-handle handle-se";

    handle.addEventListener("mousedown", (e) => this._handleMouseDown(e));

    div.appendChild(handle);
    document.body.appendChild(div);
    return div;
  }

  private _bindEvents() {
    // 监听编辑器内部的点击事件
    this.editor.dom.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        this._selectImage(target as HTMLImageElement);
      } else {
        this._hide();
      }
    });

    // 监听页面滚动/大小变化 同步更新框的位置
    window.addEventListener("scroll", () => this._reposition());
    window.addEventListener("resize", () => this._reposition());

    // 监听全局鼠标移动
    window.addEventListener("mousemove", (e) => this._handleMouseMove(e));
    window.addEventListener("mouseup", () => this._handleMouseUp());
  }

  private _selectImage(img: HTMLImageElement) {
    this.currentImage = img;
    this.overlay.classList.add("is-active");
    this._reposition();
  }

  private _hide() {
    this.currentImage = null;
    this.overlay.classList.remove("is-active");
  }

  private _reposition() {
    if (!this.currentImage) return;
    const rect = this.currentImage.getBoundingClientRect();

    const top = rect.top + window.scrollY;
    const left = rect.left + window.scrollX;

    this.overlay.style.top = `${top}px`;
    this.overlay.style.left = `${left}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;
  }

  private _handleMouseDown(e: MouseEvent) {
    if (!this.currentImage) return;
    e.preventDefault();
    e.stopPropagation();

    this.isResizing = true;
    this.startX = e.clientX;
    this.startWidth = this.currentImage.offsetWidth;
  }

  private _handleMouseMove(e: MouseEvent) {
    if (!this.isResizing || !this.currentImage) return;
    const diff = e.clientX - this.startX;
    const newWidth = Math.max(20, this.startWidth + diff);
    this.currentImage.style.width = `${newWidth}px`;

    this.overlay.style.width = `${newWidth}px`;
    this.overlay.style.height = `${this.currentImage.offsetHeight}px`;
  }

  private _handleMouseUp() {
    if (!this.isResizing || !this.currentImage) return;
    this.isResizing = false;

    const finalWidth = this.currentImage.offsetWidth;
    const index = this.editor.findDOMNodeIndex(this.currentImage);

    if (index !== -1) {
      const change = new Delta().retain(index).retain(1, { width: finalWidth });
      this.editor.submitChange(change);
    }
  }
}
