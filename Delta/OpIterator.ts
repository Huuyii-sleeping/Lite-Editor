import Op from "./Op";

class OpIterator {
  ops: Op[];
  index: number = 0;
  offset: number = 0;

  constructor(ops: Op[]) {
    this.ops = ops;
  }

  /**
   * 判断是否还有剩余的Op
   * @returns
   */
  hasNext(): boolean {
    return this.peekLength() < Infinity;
  }

  /**
   * 查看当前Op的剩余的长度
   * @returns
   */
  peekLength(): number {
    if (this.ops[this.index]) {
      return Op.length(this.ops[this.index]) - this.offset;
    }
    return Infinity;
  }

  /**
   * 查看当前Op的类型 insert delete retain
   * @returns
   */
  peekType(): string {
    if (this.ops[this.index]) {
      if (this.ops[this.index].delete) return "delete";
      if (this.ops[this.index].retain) return "retain";
      return "insert";
    }
    return "unknown";
  }

  /**
   * 获取下一个Op，可以是完整的一个，也可以是被切断的一部分
   * @param length
   * @returns
   */
  next(length: number = Infinity): Op {
    if (this.index >= this.ops.length) {
      return { retain: Infinity };
    }
    const nextOp = this.ops[this.index];
    const offset = this.offset;
    const opLength = Op.length(nextOp);

    /**
     * 取用长度的计算，【请求长度】和【当前Op剩余长度】的较小值
     * 比如：当前Op的长度是10，offset是2 => 还剩下8个没有取用
     * 如果想要5个就直接取用5个
     * 如果想要20个 但是就只能取用8个
     */
    if (length >= opLength - offset) {
      length = opLength - offset; // 全部取完的情况
    }

    // 根据offset和length构造返回的Op片段
    let retOp: Op = {};

    // retain delete 直接就是数字的相加减
    if (nextOp.retain) {
      retOp.retain = length;
    } else if (nextOp.delete) {
      retOp.delete = length;
    } else {
      if (typeof nextOp.insert === "string") {
        // 从offset开始切 length 的长度
        retOp.insert = nextOp.insert.substr(offset, length);
      } else {
        // 如果是对象的类型，通常length只能是1，直接传输过去即可
        retOp.insert = nextOp.insert;
      }
    }
    retOp.attributes = nextOp.attributes;
    this.offset += length;
    if (this.offset >= opLength) {
      this.index += 1;
      this.offset = 0;
    }
    return retOp;
  }
}

export default OpIterator;
