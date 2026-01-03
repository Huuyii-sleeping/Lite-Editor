import { Editor } from "../Editor";

export class ShortcutManager {
  editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.bindEvents();
  }

  bindEvents() {
    this.editor.dom.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
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
          // 将来可以在这里扩展：
          // case "b": this.editor.format("bold", true); break;
          // case "s": e.preventDefault(); this.save(); break;
        }
      }
    });
  }
}
