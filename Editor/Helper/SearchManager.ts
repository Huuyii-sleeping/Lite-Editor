import Delta from "../../Delta/Delta";
import { Editor } from "../Editor";

export class SearchManager {
  editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  search(query: string) {
    if (!query) {
      return;
    }
    const text = this.getText();
    const index = text.indexOf(query);
    if (index !== -1) {
      this.editor.selection.setSelection(index, query.length);
      console.log(`Found ${query} at index ${index}`);
    } else {
      alert("Not Found");
    }
  }

  replace(query: string, replacement: string) {
    const selection = this.editor.selection.getSelection();
    if (selection?.length === 0) {
      alert("请选中要进行替换的区域");
      return;
    }
    const text = this.getText();
    if (query.length === 0) {
      const change = new Delta()
        .retain(selection!.index)
        .delete(selection!.length)
        .insert(replacement);
      this.editor.doc = this.editor.doc.compose(change);
      this.editor.history.record(change, this.editor.doc, selection);
      this.editor.updateView();
      return;
    }
    const index = text.indexOf(query);
    if (index !== -1) {
      const change = new Delta()
        .retain(index)
        .delete(query.length)
        .insert(replacement);

      this.editor.doc = this.editor.doc.compose(change);
      this.editor.history.record(change, this.editor.doc, selection);
      this.editor.updateView();
    }
  }

  getText(): string {
    return this.editor.doc.ops.reduce((text, op) => {
      if (typeof op.insert === "string") {
        return text + op.insert;
      }
      return text + " ";
    }, "");
  }
}
