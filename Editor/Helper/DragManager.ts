import { Editor } from "../Editor";

export class DragManager {
  editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.bindEvents();
  }

  bindEvents() {
    // 拖拽上传
    this.editor.dom.addEventListener("drag", (e: DragEvent) => {
      this.handleDragEvent(e);
    });
  }

  private handleDragEvent(e: DragEvent) {
    e.preventDefault();

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        // 体验优化：
        // 我们希望放到鼠标移动的位置，而不是当前光标的位置
        this._updateSelectionByMouse(e.clientX, e.clientY);
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event?.target?.result as string;
          if (base64) this.editor.insertImage(base64);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  private _updateSelectionByMouse(x: number, y: number) {
    let range: Range | null = null;
    // @ts-ignore
    if (document.caretRangeFromPoint) {
      // @ts-ignore
      range = document.caretRangeFromPoint(x, y);
      // @ts-ignore
    } else if (document.caretPositionFromPoint) {
      // @ts-ignore
      const pos = document.caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }

    if (range && this.editor.dom.contains(range.startContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }
}
