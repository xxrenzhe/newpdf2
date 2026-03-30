with open("packages/pdfeditor/src/editor/element/EraseMaskElement.js", "r") as f:
    content = f.read()

# [KISS Optimization] 真正支持带色纸张的精准消除（防止白板补丁）
if "hexToRgb" not in content:
    content = content.replace("import { RectElement } from './RectElement';", "import { hexToRgb } from '../../misc';\nimport { RectElement } from './RectElement';")

replacement = """        let options = {
            x: x,
            y: this.page.height - (y + _height),
            width: _width,
            height: _height,
            color: this.attrs.background ? this.editor.PDFLib.componentsToColor(hexToRgb(this.attrs.background).map(v => (v / 255))) : this.editor.PDFLib.rgb(1, 1, 1),
            opacity: 1,
            borderWidth: 0
        };"""

import re
content = re.sub(r'        let options = \{.*?            borderWidth: 0\n        \};', replacement, content, flags=re.DOTALL)

with open("packages/pdfeditor/src/editor/element/EraseMaskElement.js", "w") as f:
    f.write(content)
