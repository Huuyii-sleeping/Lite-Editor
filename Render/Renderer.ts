import Delta from "../Delta/Delta";

export class Renderer {
  static formats: Record<string, any> = {
    bold: { tag: "strong" },
    italic: { tag: "em" },
    link: { tag: "a", attr: "href" },
    color: { style: "color" },
  };

  render(delta: Delta): string {
    let html = "";
    let inlineBuffer: string[] = [];

    for (const op of delta.ops) {
      if (typeof op.insert !== "string") {
        continue;
      }

      // Quill Delta 是凭借\n作为区分的
      // 我们就需要检测文本里面是不是具有\n
      const text = op.insert;
      if (text.includes("\n")) {
        const parts = text.split("\n");
        // 先处理这部分文本的行内样式，放入缓冲区域
        parts.forEach((part, index) => {
          if (part) {
            inlineBuffer.push(this._renderInline(part, op.attributes));
          }

          // 如果这个不是最后一部分，说明碰见了\n 结行
          // part.length - 1就是\n的数量
          if (index < parts.length - 1) {
            const lineContent = inlineBuffer.join("") || "<br>";
            const lineHtml = this._renderBlock(lineContent, op.attributes);
            html += lineHtml;
            inlineBuffer = [];
          }
        });
      } else {
        inlineBuffer.push(this._renderInline(text, op.attributes));
      }
    }

    if (inlineBuffer.length > 0) {
      html += this._renderBlock(inlineBuffer.join(""), {});
    }
    return html;
  }

  /**
   * 渲染行内元素
   * 将对应位置上添加上标签
   * @param text
   * @param attributes
   * @returns
   */
  private _renderInline(
    text: string,
    attributes?: Record<string, any>
  ): string {
    if (!attributes) {
      return this._escapeHtml(text);
    }
    let content = this._escapeHtml(text);
    Object.keys(attributes).forEach((key) => {
      const value = attributes[key];
      const config = Renderer.formats[key];
      if (config) {
        if (config.tag) {
          if (config.attr) {
            content = `<${config.tag} ${config.attr}="${value}">${content}</${config.tag}>`;
          } else {
            content = `<${config.tag}>${content}</${config.tag}>`;
          }
        } else if (config.style) {
          content = `<span style="${config.style}:${value}">${content}</span>`;
        }
      }
    });
    return content;
  }

  /**
   * 渲染块级元素
   * 默认包裹在 div 或者 p 里面
   * 如果具有 header 就放在 h 标签当中
   * @param content
   * @param attributes
   */
  private _renderBlock(
    content: string,
    attributes?: Record<string, any>
  ): string {
    let tagName = "div";
    if (attributes && attributes.header) {
      tagName = `h${attributes.header}`;
    }
    return `<${tagName}>${content}</${tagName}>`;
  }

  /**
   *
   * @param str
   * @returns
   */
  private _escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
