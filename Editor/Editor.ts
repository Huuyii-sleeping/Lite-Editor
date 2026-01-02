import Delta from "../Delta/Delta";
import { Renderer } from "../Render/Renderer";

export class Editor {
  dom: HTMLElement;
  doc: Delta;
  renderer: Renderer;

  constructor(selector: string) {
    this.dom = document.querySelector(selector) as HTMLElement;
    if (!this.dom) throw new Error(`找不到元素, ${selector}`);

    this.dom.contentEditable = "true";
    this.dom.style.whiteSpace = "pre-wrap";
    this.dom.style.outline = "none";

    this.doc = new Delta().insert("Hello World\n");
    this.renderer = new Renderer();

    this.updateView();
    this.bindEvents();
  }

  // 更新视图
  updateView() {
    const html = this.renderer.render(this.doc);
    if (this.dom.innerHTML !== html) {
      this.dom.innerHTML = html;
    }
  }

  // 事件绑定
  bindEvents() {
    // 使用beforeInput拦截输入操作
    this.dom.addEventListener("beforeinput", (e: InputEvent) => {
      e.preventDefault(); // 直接阻止默认行为，不允许直接修改DOM元素

      // 自己计算出Delta的变更
      const change = this.getDeltaFormInput(e);
      if (change) {
        this.doc = this.doc.compose(change);
        this.updateView();
        console.log("Current Model:", JSON.stringify(this.doc.ops));
      }
    });
  }

  // 将输入的事件翻译成Delta
  getDeltaFormInput(e: InputEvent): Delta | null {
    if (e.inputType === "insertText" && e.data) {
      return new Delta().retain(this.doc.length()).insert(e.data);
    }

    if (e.inputType === "deleteContentBackward") {
      // 使用backspace删除键
      return new Delta().retain(this.doc.length() - 1).delete(1);
    }

    console.warn("未处理的输入类型:", e.inputType);
    return null;
  }
}
