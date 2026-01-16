import Delta from "../Delta/Delta";
import Op from "../Delta/Op";

// 支持md导出的工具
export class Serializer {
  /**
   * 转化成 md 工具
   * @param doc
   * @returns
   */
  serialize(doc: Delta): string {
    let md = "";
    const lines = this._splitDeltaIntoLines(doc);

    for (const line of lines) {
      md += this._renderLine(line.ops, line.attrs);
    }

    return md;
  }

  /**
   * 处理当行内容
   * @param ops
   * @param attrs
   * @returns
   */
  private _renderLine(ops: Op[], attrs: Record<string, any>): string {
    // 处理行内样式
    let lineText = ops
      .map((op) => {
        let text = typeof op.insert === "string" ? op.insert : "";

        if (typeof op.insert === "object" && op.insert.image) {
          return `![](${op.insert.image})`;
        }

        if (typeof op.insert === "object" && op.insert.divider) {
          return "---\n";
        }

        // 处理零宽字符/软回车清理（防止污染md）
        text = text.replace(/\u200B/g, "").replace(/\u200B/g, "\n");

        if (!op.attributes) return text;

        if (op.attributes.code) text = `\`${text}\``;
        if (op.attributes.bold) text = `**${text}**`;
        if (op.attributes.italic) text = `*${text}*`;
        if (op.attributes.strike) text = `~~${text}~~`;
        if (op.attributes.link) text = `[${text}](${op.attributes.link})`;
        return text;
      })
      .join("");

    if (attrs) {
      if (attrs.header) {
        return `${"#".repeat(attrs.header)} ${lineText}\n`;
      }

      if (attrs.blockquote) {
        return `> ${lineText}\n`;
      }

      if (attrs["code-block"]) {
        return `    ${lineText}\n`;
      }

      if (attrs.list) {
        if (attrs.list === "ordered") {
          return `1. ${lineText}\n`;
        } else if (attrs.list === "checked") {
          return `- [x] ${lineText}\n`;
        } else if (attrs.list === "unchecked") {
          return `- [ ] ${lineText}\n`;
        } else {
          return `- ${lineText}\n`;
        }
      }
      if (attrs.table) {
        return `${lineText} | `;
      }
    }

    return `${lineText}\n\n`;
  }

  /**
   * 将Delta拆分成行 便于查找
   * @param doc
   */
  private _splitDeltaIntoLines(doc: Delta) {
    const lines: { ops: Op[]; attrs: any }[] = [];
    let currentOps: Op[] = [];

    for (const op of doc.ops) {
      if (typeof op.insert === "string") {
        const parts = op.insert.split("\n");
        parts.forEach((part, index) => {
          if (part)
            currentOps.push({ insert: part, attributes: op.attributes });

          if (index < parts.length - 1) {
            lines.push({ ops: currentOps, attrs: op.attributes || {} });
            currentOps = [];
          }
        });
      } else {
        currentOps.push(op);
      }
    }
    if (currentOps.length > 0) {
      lines.push({ ops: currentOps, attrs: {} });
    }

    return lines;
  }
}
