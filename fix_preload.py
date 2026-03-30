with open("packages/pdfeditor/src/pages/index.html", "r") as f:
    content = f.read()

replacement = """    <meta charset="utf-8">
    <title><%= htmlWebpackPlugin.options.title %></title>
    <!-- [KISS Optimization] 预加载巨大的 PDF Worker 线程文件以秒开编辑器 -->
    <link rel="preload" href="/pdfeditor/assets/js/pdfjs/pdf.worker.min.js" as="script">
"""
content = content.replace('    <meta charset="utf-8">\n        <title><%= htmlWebpackPlugin.options.title %></title>\n', replacement)

with open("packages/pdfeditor/src/pages/index.html", "w") as f:
    f.write(content)
