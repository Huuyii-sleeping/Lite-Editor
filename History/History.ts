import Delta from "../Delta/Delta";
import { Editor } from "../Editor/Editor";

interface HistoryItem {
  delta: Delta;
  // 存储光标的位置，用来将光标恢复到正确的位置
  selection: { index: number; length: number } | null;
}

interface lastOpState {
  time: number;
  type: "insert" | "delete" | "format" | "other";
}

export default class HistoryManager {
  undoStack: HistoryItem[] = [];
  redoStack: HistoryItem[] = [];
  editor: Editor;

  lastState: lastOpState = { time: 0, type: "other" };

  // 设置最大的步数防止内容无限膨胀
  options = { maxStack: 100, delay: 1000 };

  constructor(editor: Editor) {
    this.editor = editor;
  }

  record(
    change: Delta,
    oldDoc: Delta,
    selection: { index: number; length: number } | null
  ) {
    if (change.ops.length === 0) return;

    // 开始新的操作之后 redo栈置空
    this.redoStack = [];

    const undoDelta = change.invert(oldDoc);

    const now = Date.now();
    const type = this._getOpType(change);

    if (
      this.undoStack.length > 0 &&
      now - this.lastState.time < this.options.delay &&
      type === this.lastState.type &&
      type !== "other"
    ) {
      const lastItem = this.undoStack.pop()!;
      const mergedDelta = undoDelta.compose(lastItem.delta);

      this.undoStack.push({
        delta: mergedDelta,
        selection: lastItem.selection, // 保存旧的位置上的选区
      });
    } else {
      this.undoStack.push({
        delta: undoDelta,
        selection: selection, // 存储当前传进来的光标
      });

      if (this.undoStack.length > this.options.maxStack) {
        this.undoStack.shift();
      }
    }

    this.lastState = { time: now, type };
  }

  /**
   * 执行撤销操作
   * @returns
   */
  undo() {
    if (this.undoStack.length === 0) return;

    // 取出最近的一次反向操作
    const item = this.undoStack.pop()!;
    const { delta: undoDelta, selection: undoSelection } = item;

    const currentSelection = this.editor.selection.getSelection();
    const redoDelta = undoDelta.invert(this.editor.doc);
    this.redoStack.push({
      delta: redoDelta,
      selection: currentSelection,
    });

    this.editor.doc = this.editor.doc.compose(undoDelta);
    this.editor.updateView();

    if (undoSelection) {
      this.editor.selection.setSelection(
        undoSelection.index,
        undoSelection.length
      );
    }
  }

  redo() {
    if (this.redoStack.length === 0) return;

    const item = this.redoStack.pop()!;
    const { delta: redoDelta, selection: redoSelection } = item;

    const currentSelection = this.editor.selection.getSelection();
    const undoDelta = redoDelta.invert(this.editor.doc);

    this.undoStack.push({
      delta: undoDelta,
      selection: currentSelection,
    });

    this.editor.doc = this.editor.doc.compose(redoDelta);
    this.editor.updateView();

    if (redoSelection) {
      this.editor.selection.setSelection(
        redoSelection.index,
        redoSelection.length
      );
    }
  }

  private _getOpType(delta: Delta): lastOpState["type"] {
    const op = delta.ops[delta.ops.length - 1];
    if (op.insert) return "insert";
    if (op.delete) return "delete";
    if (op.attributes) return "format";
    return "other";
  }
}
