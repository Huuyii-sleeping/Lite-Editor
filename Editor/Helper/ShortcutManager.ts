import { Editor } from "../Editor";
import { DocumentHelper } from "./DocumentHelper";

export class ShortcutManager {
  editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.bindEvents();
  }

  bindEvents() {
    this.editor.dom.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        this._handleTab(e);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        this._handleCommand(e);
      }
    });
  }

  private _handleTab(e: KeyboardEvent) {
    const range = this.editor.selection.getSelection();
    if (!range) return;

    // 检查当前行是否在表格当中
    const attrs = DocumentHelper.getLineFormat(this.editor.doc, range.index);

    // 如果是表格，拦截默认行为并执行导航
    if (attrs.table) {
      e.preventDefault();
      if (e.shiftKey) {
        this._movePreviousCell(range.index);
      } else {
        this._moveNextCell(range.index);
      }
    }

    // [TODO] 未来普通文本的缩进逻辑
  }

  private _handleCommand(e: KeyboardEvent) {
    const currentFormat = this.editor.getFormat();
    switch (e.key.toLowerCase()) {
      case "z":
        e.preventDefault();
        if (e.shiftKey) {
          this.editor.history.redo();
        } else {
          this.editor.history.undo();
        }
        break;
      case "y":
        e.preventDefault();
        this.editor.history.redo();
        break;
      case "b":
        e.preventDefault();
        this.editor.format("bold", !currentFormat.bold);
        break;
      case "i":
        e.preventDefault();
        this.editor.format("italic", !currentFormat.italic);
        break;
      case "u":
        e.preventDefault();
        this.editor.format("strike", !currentFormat.strike);
        break;
      case "e":
        e.preventDefault();
        this.editor.format("code", !currentFormat.code);
        break;
    }
  }

  /**
   * 移动到下一单元格
   * @param currentIndex
   */
  private _moveNextCell(currentIndex: number) {
    const lineEnd = DocumentHelper.findLineEnd(this.editor.doc, currentIndex);
    const nextCellStart = lineEnd + 1;
    if (nextCellStart < this.editor.doc.length()) {
      const nextAttr = DocumentHelper.getLineFormat(
        this.editor.doc,
        nextCellStart
      );
      if (nextAttr.table) {
        this.editor.selection.setSelection(nextCellStart);
      }
    }
  }

  /**
   * 移动上一单元格
   * @param currentIndex
   */
  private _movePreviousCell(currentIndex: number) {
    const lineStart = DocumentHelper.findLineStart(
      this.editor.doc,
      currentIndex
    );
    if (lineStart > 0) {
      const prevLineEnd = lineStart - 1;
      const prevAttrs = DocumentHelper.getLineFormat(
        this.editor.doc,
        prevLineEnd
      );

      if (prevAttrs.table) {
        const preLineStart = DocumentHelper.findLineStart(
          this.editor.doc,
          prevLineEnd
        );
        this.editor.selection.setSelection(preLineStart);
      }
    }
  }
}
