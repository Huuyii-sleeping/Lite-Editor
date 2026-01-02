/**
 * 覆盖规则：如果具有同名的属性，新属性覆盖旧属性
 * 删除规则：如果新属性值是null，意味着就需要移除这个属性
 */

type AttributeMap = Record<string, any>;

const AttributeMap = {
  /**
   * 合并两个属性对象
   * @param a 旧属性
   * @param b 新属性
   * @param keepNull 是否保留null值
   */
  compose(
    a: AttributeMap = {},
    b: AttributeMap = {},
    keepNull = false
  ): AttributeMap | undefined {
    const attributes = { ...a };
    for (const key in b) {
      if (b.hasOwnProperty(key)) {
        const value = b[key];
        if (keepNull) {
          // 场景A：一个retain操作，需要我们保留null
          // 因为他可能表示“将来应用这个delta时候，将这个属性删除”
          attributes[key] = value;
        } else {
          // null 就是代表着删除，非null就是直接覆盖就行
          if (value === null) {
            delete attributes[key];
          } else {
            attributes[key] = value;
          }
        }
      }
    }
    return Object.keys(attributes).length > 0 ? attributes : undefined;
  },
};

export default AttributeMap;
