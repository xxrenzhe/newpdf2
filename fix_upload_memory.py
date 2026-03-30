with open("src/lib/uploadStore.ts", "r") as f:
    content = f.read()

import re
old_logic = r"""const inMemoryStore = new Map<string, AnyStoredUpload>\(\);
const pendingDbWrites = new Map<string, Promise<void>>\(\);"""

new_logic = """// [KISS Optimization] 阻止客户端 OOM: 原生 Map 没有过期机制，长久挂载大文件会导致浏览器直接卡死。添加一个带容量上限的安全缓存。
const IN_MEMORY_LIMIT = 5;
const inMemoryStore = new Map<string, AnyStoredUpload>();
const pendingDbWrites = new Map<string, Promise<void>>();

function _setInMemory(id: string, value: AnyStoredUpload) {
  inMemoryStore.set(id, value);
  if (inMemoryStore.size > IN_MEMORY_LIMIT) {
    const firstKey = inMemoryStore.keys().next().value;
    if (firstKey) inMemoryStore.delete(firstKey);
  }
}
"""

content = re.sub(old_logic, new_logic, content)
content = content.replace("inMemoryStore.set(id, value);", "_setInMemory(id, value);")

with open("src/lib/uploadStore.ts", "w") as f:
    f.write(content)
