// 实现块级元素的位置的调换

import { Editor } from "../Editor/Editor";
import { DocumentHelper } from "../Editor/Helper/DocumentHelper";

export class BlockHandle {
  editor: Editor;
  dom: HTMLElement;

  // 当前悬停的块级元素
  currentBlockNode: HTMLElement | null = null;
  // 当前块在doc中的索引的位置
  currentBlockIndex: number = -1;

  constructor(editor: Editor) {
    this.editor = editor;
    this.dom = this._createDOM();
    document.body.appendChild(this.dom);
    this._bindEvents();
  }

  private _createDOM(): HTMLElement {
    const handle = document.createElement("div");
    handle.className = "editor-block-handle";
    handle.contentEditable = "false";
    handle.innerText = "::";

    // 基础样式
    Object.assign(handle.style, {
      position: "fixed",
      display: "none",
      cursor: "grab",
      color: "#ccc",
      fontSize: "20px",
      userSelect: "none",
      zIndex: "9999", // 确保层级最高
      width: "20px",
      height: "24px",
      textAlign: "center",
      lineHeight: "20px",
      borderRadius: "4px",
      transition: "top 0.1s, opacity 0.2s",
    });

    handle.onmouseenter = () => {
      handle.style.backgroundColor = "rgba(0,0,0,0.05)";
      handle.style.color = "#666";
    };

    handle.onmouseleave = () => {
      handle.style.backgroundColor = "transparent";
      handle.style.color = "#ccc";
    };

    return handle;
  }

  private _bindEvents() {
    this.editor.dom.addEventListener("mousemove", (e) => {
      this._handleMouseMove(e);
    });

    document.addEventListener("scroll", () => this.hide(), true);

    this.dom.draggable = true;

    this.dom.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("text/plain", "editor-block-move");
      e.dataTransfer?.setDragImage(this.currentBlockNode || this.dom, 0, 0);
      e.dataTransfer!.effectAllowed = "move";
      this.dom.style.opacity = "0.5";
    });

    this.dom.addEventListener("dragend", () => {
      this.dom.style.opacity = "1";
    });

    this.editor.dom.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "move";
      }
    });

    this.editor.dom.addEventListener("drop", (e) => {
      e.preventDefault();
      this._handleDrop(e);
    });
  }

  // 使用elementFromPoint方法拿到鼠标下面的元素，我们拿到的是整行的block
  private _handleMouseMove(e: MouseEvent) {
    // 拿到鼠标底下的元素
    const target = document.elementFromPoint(
      e.clientX,
      e.clientY
    ) as HTMLElement;

    if (this.dom.contains(target)) return;

    if (!target || !this.editor.dom.contains(target)) {
      this.hide();
      return;
    }

    // 向上查找块级元素
    // 向上进行冒泡寻找，直到找到直接属于editor的子元素 -> block
    let block = target;
    while (block && block.parentElement !== this.editor.dom) {
      block = block.parentElement as HTMLElement;
    }

    if (!block || block === this.editor.dom) return;

    this.currentBlockNode = block;
    // 确定显示的位置
    this.show(block);
  }

  show(block: HTMLElement) {
    const rect = block.getBoundingClientRect();

    // 简单的边界检查
    let leftPos = rect.left - 30;

    this.dom.style.display = "block";
    this.dom.style.top = `${rect.top}px`;
    this.dom.style.left = `${leftPos}px`;

    this.currentBlockIndex = this._getBlockIndex(block);
  }

  hide() {
    this.dom.style.display = "none";
  }

  // 解决问题的核心部分
  private _handleDrop(e: DragEvent) {
    if (this.currentBlockIndex === -1) {
      console.warn("❌ Start block index is -1. Check _getBlockIndex logic.");
      return;
    }

    let targetIndex = -1;
    let dropTargetNode: Node | null = null;

    // 第一种策略，精确命中文字
    // @ts-ignore
    if (document.caretRangeFromPoint) {
      // @ts-ignore
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) dropTargetNode = range.startContainer;
      // @ts-ignore
    } else if (document.caretPositionFromPoint) {
      // @ts-ignore
      const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) dropTargetNode = pos.offsetNode;
    }

    // elementFromPoint 方法兜底
    if (!dropTargetNode) {
      const elem = document.elementFromPoint(e.clientX, e.clientY);
      if (elem) dropTargetNode = elem;
    }

    if (dropTargetNode) {
      if (this.dom.contains(dropTargetNode)) return;

      let targetElement = (
        dropTargetNode.nodeType === Node.TEXT_NODE
          ? dropTargetNode.parentNode
          : dropTargetNode
      ) as HTMLElement;

      if (targetElement === this.editor.dom) {
        // 如果命中的是padding，根据最近距离进行寻找
        const children = Array.from(this.editor.dom.children);
        let closestBlock = null;
        let minDistance = Infinity;
        children.forEach((child) => {
          const rect = child.getBoundingClientRect();
          const distance = Math.abs(e.clientY - (rect.top + rect.height / 2));
          if (distance < minDistance) {
            minDistance = distance;
            closestBlock = child;
          }
        });
        if (closestBlock) targetElement = closestBlock as HTMLElement;
      }

      // 4. 向上查找直到 Block
      let dropBlock = targetElement;
      while (dropBlock && dropBlock.parentElement !== this.editor.dom) {
        if (!dropBlock.parentElement) break;
        dropBlock = dropBlock.parentElement as HTMLElement;
      }

      if (dropBlock && dropBlock.parentElement === this.editor.dom) {
        targetIndex = this._getBlockIndex(dropBlock);
      }
    }

    if (targetIndex !== -1 && targetIndex !== this.currentBlockIndex) {
      // 【向下】 必须插在目标行的后面
      if (targetIndex > this.currentBlockIndex) {
        const lineEnd = DocumentHelper.findLineEnd(
          this.editor.doc,
          targetIndex
        );
        const newTargetIndex = lineEnd + 1;

        this.editor.moveBlock(this.currentBlockIndex, newTargetIndex);
      } else {
        // 【向上】 插在目标行前面就行
        this.editor.moveBlock(this.currentBlockIndex, targetIndex);
      }
    }
  }

  // 用来帮助找到正确的位置
  private _getBlockIndex(block: HTMLElement): number {
    const target = block.firstChild || block;
    return DocumentHelper.findDOMNodeIndex(this.editor.dom, target);
  }
}
