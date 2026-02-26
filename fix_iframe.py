file = "src/components/SecurityInitializer.tsx"
with open(file, "r") as f:
    content = f.read()

# We only want to prevent iframes if we are the top level window, actually wait, if we are in an iframe, we SHOULD be redirected UNLESS we are specifically an allowed iframe
content = content.replace("""    // Skip iframe embedding check for the PDF editor iframe itself or E2E tests
    if (process.env.NEXT_PUBLIC_E2E !== "1" && !window.location.pathname.startsWith("/pdfeditor/") && !window.location.pathname.startsWith("/tools/")) {
      preventIframeEmbedding();
    }""", """    // The preventIframeEmbedding function checks if window.self !== window.top.
    // If we are in an iframe, we ONLY allow it if we are the pdfeditor iframe (legacy code).
    // The Next.js app itself should NOT be embedded.
    const isE2E = process.env.NEXT_PUBLIC_E2E === "1";
    const isLegacyEditorIframe = window.location.pathname.startsWith("/pdfeditor/");
    if (!isE2E && !isLegacyEditorIframe) {
      preventIframeEmbedding();
    }""")

with open(file, "w") as f:
    f.write(content)
