import Delta from "../../Delta/Delta";
import { Editor } from "../Editor";
import { DocumentHelper } from "./DocumentHelper";

export class TableManager {
  editor: Editor;
  constructor(editor: Editor) {
    this.editor = editor;
  }

  /**
   * 指定的位置当中插入行
   * @param cellIndex 光标所在的行索引
   * @param offset 0：上方插入 1下方插入
   * @returns
   */
  insertRow(cellIndex: number, offset: number) {
    // 获取当前行的ID
    const format = DocumentHelper.getLineFormat(this.editor.doc, cellIndex);
    const currentRowId = format.table;
    if (!currentRowId) return;

    // 计算表格有多少列
    let colsCount = 0;
    const lines = this.editor.doc.ops;
    let startIndexOfRow = -1,
      endIndexOfRow = -1;

    let currentPos = 0;
    this.editor.doc.ops.forEach((op) => {
      const len = typeof op.insert === "string" ? op.insert.length : 1;
      if (op.attributes && op.attributes.table === currentRowId) {
        colsCount++;
        if (startIndexOfRow === -1) startIndexOfRow = currentPos;
        endIndexOfRow = currentPos + len;
      }
      currentPos += len;
    });

    const insertPos = offset === 1 ? endIndexOfRow : startIndexOfRow;

    const newRowId = DocumentHelper.generateId();
    const insertDelta = new Delta().retain(insertPos);
    for (let i = 0; i < colsCount; i++) {
      insertDelta.insert("\u200B");
      insertDelta.insert("\n", { table: newRowId });
    }
    this.editor.submitChange(insertDelta);
  }

  /**
   * 删除当前行
   * @param cellIndex 
   * @returns 
   */
  deleteRow(cellIndex: number) {
    const format = DocumentHelper.getLineFormat(this.editor.doc, cellIndex);
    const currentRowId = format.table;
    if (!currentRowId) return;

    let startToDelete = -1,
      lengthToDelete = 0,
      currentPos = 0;
    this.editor.doc.ops.forEach((op) => {
      const len = typeof op.insert === "string" ? op.insert.length : 1;
    });
  }
}
