with open("src/app/api/convert/to-pdf/route.ts", "r") as f:
    content = f.read()

import re

# [KISS Optimization] 零开销恶意文件防御：在进入繁重的 multipart 解析（把几十兆数据读进内存）之前，先通过请求头直接拍死超大文件。
replacement = """  if (!GOTENBERG_URL) {
    return NextResponse.json(
      { error: "GOTENBERG_URL is not configured (self-hosted Gotenberg required)" },
      { status: 501, headers: rateLimitHeaders(rl) }
    );
  }

  // [KISS Optimization] OOM防御：在分配极高成本的 FormData 内存前，先验证表单声称的大小
  const maxBytes = 25 * 1024 * 1024;
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > maxBytes + 5 * 1024 * 1024) { // Buffer for multipart boundaries
    return NextResponse.json(
      { error: "Payload too large (max 25MB)" },
      { status: 413, headers: rateLimitHeaders(rl) }
    );
  }

  const form = await request.formData();"""

content = re.sub(r'  if \(\!GOTENBERG_URL\) \{.*?\n    \);\n  \}\n\n  const form = await request\.formData\(\);', replacement, content, flags=re.DOTALL)

with open("src/app/api/convert/to-pdf/route.ts", "w") as f:
    f.write(content)
