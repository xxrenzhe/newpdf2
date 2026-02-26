file = "src/components/SecurityInitializer.tsx"
with open(file, "r") as f:
    content = f.read()

# Make it safer: don't block the editor route either
content = content.replace('!window.location.pathname.startsWith("/pdfeditor/")', '!window.location.pathname.startsWith("/pdfeditor/") && !window.location.pathname.startsWith("/tools/")')

with open(file, "w") as f:
    f.write(content)
