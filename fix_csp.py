import re

file = "packages/pdfeditor/src/pages/index.html"
with open(file, "r") as f:
    content = f.read()

# Remove the overly strict CSP that might be causing iframe to block itself or cause navigation issues
content = re.sub(r'<meta http-equiv="Content-Security-Policy" content="navigate-to \'self\'">\n?', "", content)

with open(file, "w") as f:
    f.write(content)

file2 = "src/features/pdf-editor/EmbeddedPdfEditor.tsx"
with open(file2, "r") as f:
    content = f.read()

content = content.replace("const isEditorPath =", 'console.log("Iframe href:", href);\n          const isEditorPath =')

with open(file2, "w") as f:
    f.write(content)
