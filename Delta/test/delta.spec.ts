import { describe, it, expect } from "vitest";
import Delta from "../Delta";
import OpIterator from "../OpIterator";
import AttributeMap from "../AttributeMap";

// 测试AttributeMap，验证属性合并，属性移除，keepNull逻辑
describe("AttributeMap", () => {
  it("合并两个属性对象", () => {
    const a = { bold: true };
    const b = { color: "red" };
    expect(AttributeMap.compose(a, b)).toEqual({ bold: true, color: "red" });
  });

  it("新属性应该覆盖旧的值", () => {
    const a = { color: "blue" };
    const b = { color: "red" };
    expect(AttributeMap.compose(a, b)).toEqual({ color: "red" });
  });

  it("移除属性(值是null)", () => {
    const a = { bold: true, color: "red" };
    const b = { bold: null };
    expect(AttributeMap.compose(a, b, false)).toEqual({ color: "red" });
  });

  it("当keepNull是true的时候保留null值", () => {
    const a = { bold: true };
    const b = { bold: null };
    expect(AttributeMap.compose(a, b, true)).toEqual({ bold: null });
  });
});

// 测试OpIterator 迭代，切割字符串
describe("OpIterator", () => {
  it("应该能正确切割字符串 (next with length)", () => {
    // 模拟一个长 Op
    const ops = [{ insert: "HelloWithLength" }];
    const iter = new OpIterator(ops);

    // 1. 先切 5 个
    const first = iter.next(5);
    expect(first).toEqual({ insert: "Hello" });

    // 2. 再切 4 个
    const second = iter.next(4);
    expect(second).toEqual({ insert: "With" });

    // 3. 切剩下的（不传 length 或传 Infinity）
    const third = iter.next();
    expect(third).toEqual({ insert: "Length" });
  });

  it("跨越多个 Op 时应该自动切换", () => {
    const ops = [
      { insert: "A" }, // 长度 1
      { insert: "B" }, // 长度 1
    ];
    const iter = new OpIterator(ops);

    expect(iter.next(1)).toEqual({ insert: "A" });
    expect(iter.next(1)).toEqual({ insert: "B" });
    expect(iter.hasNext()).toBe(false);
  });

  it("peekType 和 peekLength 应该准确", () => {
    const ops = [{ insert: "HelloWorld" }];
    const iter = new OpIterator(ops);

    iter.next(5); // 消耗掉 "Hello"

    // 现在还剩 "World"，长度 5
    expect(iter.peekLength()).toBe(5);
    expect(iter.peekType()).toBe("insert");
  });
});

describe("Delta Basic", () => {
  it("基本数据delete的合并", () => {
    const a = new Delta().insert("Hello");
    a.delete(1);
    a.delete(2);
    expect(a.ops).toEqual([{ insert: "Hello" }, { delete: 3 }]);
  });

  it("基本数据retain的合并", () => {
    const a = new Delta().insert("Hello");
    a.retain(1);
    a.retain(2);
    expect(a.ops).toEqual([{ insert: "Hello" }, { retain: 3 }]);
  });
});

// 测试Delta Compose的核心部分
// 验证Insert，Retain，Delete的各种组合
describe("Delta Compose", () => {
  // 基础 Case 1: 纯插入 (Insert + Insert)
  it("Insert + Insert = Append", () => {
    const a = new Delta().insert("A");
    const b = new Delta().retain(1).insert("B");
    // A + B -> AB
    expect(a.compose(b).ops).toEqual([{ insert: "AB" }]);
  });

  // Case 2: 在中间插入 (Retain + Insert)
  it("Retain + Insert: 在文本中间插入", () => {
    const a = new Delta().insert("AC");
    // 指令：跳过 1 个('A')，插入 'B'
    // 隐含逻辑：B 结束后，A 剩下的 'C' 应该被自动保留
    const b = new Delta().retain(1).insert("B");

    // 预期：A -> B -> C = ABC
    expect(a.compose(b).ops).toEqual([{ insert: "ABC" }]);
  });

  // Case 3: 删除中间字符 (Retain + Delete)
  it("Retain + Delete: 删除中间的字符", () => {
    const a = new Delta().insert("ABC");
    // 指令：跳过 1 个('A')，删除 1 个('B')
    // 隐含逻辑：剩下的 'C' 自动保留
    const b = new Delta().retain(1).delete(1);

    // 结果：A(保留) - B(删除) + C(自动保留) = AC
    expect(a.compose(b).ops).toEqual([{ insert: "AC" }]);
  });

  // Case 4: 属性修改 (Retain with Attributes)
  it("应该能修改现有文本的属性", () => {
    // 原文：Hello (加粗)
    const a = new Delta().insert("Hello", { bold: true });

    // 修改：选中前 5 个，标红，取消加粗
    // 注意：bold: null 是移除指令
    const b = new Delta().retain(5, { color: "red", bold: null });

    const result = a.compose(b);
    // 预期：Hello (红，无加粗)
    // 验证点：
    // 1. bold 字段应该彻底消失，而不是留着 bold: null
    // 2. color: red 应该加上
    expect(result.ops).toEqual([
      { insert: "Hello", attributes: { color: "red" } },
    ]);
  });

  // Case 5: 抵消 (Insert + Delete)
  it("Insert + Delete: 新插入的内容被立刻删除", () => {
    // 场景：A 刚插入一个字，B 紧接着把它删了
    // 这在协同编辑处理冲突时很常见
    const a = new Delta().insert("A");
    const b = new Delta().delete(1);

    // 结果：空（相互抵消）
    expect(a.compose(b).ops).toEqual([]);
  });

  // Case 6: 复杂切割 (Mismatch Length)
  // 这是最考验 OpIterator 切割能力的 Case
  it("应该能处理长度不一致的操作", () => {
    // A: [Insert "Hello" (5)]
    // B: [Retain 2, Insert "X", Retain 3]
    // 意图：在 "He" 和 "llo" 之间插一个 "X"

    const a = new Delta().insert("Hello");
    // 注意：最后的 retain(3) 其实可以省略，Delta 默认保留
    // 但写出来是为了测试 OpIterator 是否能精准对接
    const b = new Delta().retain(2).insert("X").retain(3);

    const result = a.compose(b);

    // 预期结果：
    // 1. "He" (来自 A的前半段)
    // 2. "X"  (来自 B)
    // 3. "llo" (来自 A的后半段)
    // 由于我们实现了 Delta.push 的合并逻辑，相邻的纯文本可能会合并
    // 但 "X" 是新插入的，"Hello" 是旧的，通常属性一致时会合并成 "HeXllo"

    expect(result.ops).toEqual([{ insert: "HeXllo" }]);
  });

  // Case 7: 属性保留 (Attribute Persistence)
  it("Retain 应该保留原有的属性", () => {
    // A: 红色 "A"
    const a = new Delta().insert("A", { color: "red" });
    // B: 跳过 1 个 (不改属性)
    const b = new Delta().retain(1);

    // 结果应该还是红色的 A
    expect(a.compose(b).ops).toEqual([
      { insert: "A", attributes: { color: "red" } },
    ]);
  });

  // Case 8: 删除属性 (Attribute Removal with Split)
  it("局部移除属性", () => {
    // A: "AAAA" (加粗)
    const a = new Delta().insert("AAAA", { bold: true });
    // B: 跳过 1 个，接下来的 2 个取消加粗
    const b = new Delta().retain(1).retain(2, { bold: null });

    // 结果应该是三段：
    // 1. "A" (加粗)
    // 2. "AA" (无加粗)
    // 3. "A" (加粗 - 自动保留)
    const ops = a.compose(b).ops;
    expect(ops).toEqual([
      { insert: "A", attributes: { bold: true } },
      { insert: "AA" },
      { insert: "A", attributes: { bold: true } },
    ]);
  });
});
