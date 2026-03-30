with open("packages/pdfeditor/src/reader/page.js", "r") as f:
    content = f.read()

# [KISS Optimization] 但是 isBreak 本身也可能太严格？我们来看看
content = content.replace("    #isBreak(textItem, nextIndex) {", "    #isBreak(textItem, nextIndex) {\n        // [KISS Optimization] Let the layout algorithm decide if this is a true semantic break")

with open("packages/pdfeditor/src/reader/page.js", "w") as f:
    f.write(content)
