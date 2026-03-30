with open("packages/pdfeditor/src/misc.js", "r") as f:
    content = f.read()

# [KISS Optimization] 优化背景色取色，如果它是全透明或者纯黑，极大概率是抗锯齿/空像素导致取色失败，这会导致编辑框变成黑底或者透明，无法覆盖底层残影。
replacement = """function getPixelColor(context, x, y) {
    let imageData = context.getImageData(x, y, 1, 1);
    let pixel = imageData.data;
    let r = pixel[0];
    let g = pixel[1];
    let b = pixel[2];
    let a = pixel[3] / 255;
    a = Math.round(a * 100) / 100;
    
    // [KISS Optimization] 背景取色防污染机制：如果取到的是完全透明的像素，强制回退为白色底色
    if (a === 0) {
        return "rgb(255, 255, 255)";
    }
    
    let rgbaColor = "rgba(" + r + "," + g + "," + b + "," + a + ")";
    return rgbaColor;
}"""

import re
content = re.sub(r'function getPixelColor\(context, x, y\) \{.*?    return rgbaColor;\n\}', replacement, content, flags=re.DOTALL)

with open("packages/pdfeditor/src/misc.js", "w") as f:
    f.write(content)
