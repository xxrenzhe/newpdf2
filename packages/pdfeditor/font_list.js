// NOTE: This file is used by the pdfeditor Webpack build to generate
// `src/assets/fonts.css` and to provide `fontList` to the runtime toolbar.
//
// Keep URLs relative to the emitted CSS file location:
// output CSS is `public/pdfeditor/css/*.css`, and assets are under `../assets/`.
const fontDomain = '../assets/';

const fontList = [
    {
        fontFamily: 'Arial',
        showName: 'Arial',
        fontFile: 'fonts/Lato-Regular.ttf'
    },
    {
        fontFamily: 'SimSun',
        showName: '宋体',
        fontFile: 'fonts/NotoSansCJKsc-Regular.otf'
    }
];

function getFontFormat(fontFile) {
    const lower = String(fontFile).toLowerCase();
    if (lower.endsWith('.otf')) return 'opentype';
    if (lower.endsWith('.ttf')) return 'truetype';
    if (lower.endsWith('.woff2')) return 'woff2';
    if (lower.endsWith('.woff')) return 'woff';
    return 'truetype';
}

function generateFontCSS(cssFile) {
    let css = '';
    fontList.forEach(font => {
        css += `
@font-face {
    font-family: '${font.fontFamily}';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url(${fontDomain}${font.fontFile}) format('${getFontFormat(font.fontFile)}');
}`;
});
    const fs = require('fs');
    fs.writeFileSync(cssFile, css.trim() + '\n');
}

module.exports = {
    generateFontCSS,
    fontList
}
