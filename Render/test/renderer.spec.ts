import { describe, expect, it } from "vitest";
import { Renderer } from "../Renderer";
import Delta from "../../Delta/Delta";

describe("simpleRenderer", () => {
  const renderer = new Renderer();

  it("应该渲染纯文本", () => {
    const delta = new Delta().insert("Hello");
    expect(renderer.render(delta)).toBe("<div>Hello</div>");
  });

  it("应该渲染行内样式 (加粗)", () => {
    const delta = new Delta().insert("Hello", { bold: true });
    expect(renderer.render(delta)).toBe("<div><strong>Hello</strong></div>");
  });

  it("应该渲染多行文本", () => {
    // 这是一个标准的 Quill Delta 结构：
    // 第一行：Hello
    // 第二行：World
    const delta = new Delta().insert("Hello\n").insert("World\n");

    expect(renderer.render(delta)).toBe("<div>Hello</div><div>World</div>");
  });

  it("应该渲染标题 (Block Attributes)", () => {
    // Quill 的逻辑：属性挂在换行符 \n 上
    const delta = new Delta().insert("My Title").insert("\n", { header: 1 }); // 这个 \n 决定了这一行是 H1

    expect(renderer.render(delta)).toBe("<h1>My Title</h1>");
  });

  it("混合场景测试", () => {
    const delta = new Delta()
      .insert("Bold", { bold: true })
      .insert(" and ")
      .insert("Red", { color: "red" })
      .insert("\n")
      .insert("Header", { italic: true })
      .insert("\n", { header: 2 });

    // 预期结果：
    // 第一行 (div): <strong>Bold</strong> and <span style="color:red">Red</span>
    // 第二行 (h2): <em>Header</em>
    expect(renderer.render(delta)).toBe(
      '<div><strong>Bold</strong> and <span style="color:red">Red</span></div>' +
        "<h2><em>Header</em></h2>"
    );
  });
});
