file = "src/components/SecurityInitializer.tsx"
with open(file, "r") as f:
    content = f.read()

# Don't run preventIframeEmbedding if we are the pdfeditor iframe
content = content.replace("preventIframeEmbedding();", """
    // Skip iframe embedding check for the PDF editor iframe itself or E2E tests
    if (process.env.NEXT_PUBLIC_E2E !== "1" && !window.location.pathname.startsWith("/pdfeditor/")) {
      preventIframeEmbedding();
    }
""")

with open(file, "w") as f:
    f.write(content)
