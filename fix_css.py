with open("packages/pdfeditor/src/css/pdf_viewer.css", "a") as f:
    f.write("\n/* [KISS Optimization] 隔离绘图时的文本误触 */\n")
    f.write(".pdf-drawing-mode .textLayer {\n")
    f.write("  pointer-events: none !important;\n")
    f.write("  user-select: none !important;\n")
    f.write("}\n")
