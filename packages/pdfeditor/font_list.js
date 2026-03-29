const fontBaseUrl = ((process.env.BASE_URL || '/pdfeditor/').replace(/\/?$/, '/')) + 'assets/fonts/';

const fontList = [
    {
        fontFamily: 'NotoSansCJKsc',
        showName: 'Noto Sans SC',
        fontFile: 'NotoSansCJKsc-Regular.otf'
    },
    {
        fontFamily: 'NotoSansCJKjp',
        showName: 'Noto Sans JP',
        fontFile: 'NotoSansCJKjp-Regular.otf'
    },
    {
        fontFamily: 'NotoSansCJKkr',
        showName: 'Noto Sans KR',
        fontFile: 'NotoSansCJKkr-Regular.otf'
    },
    {
        fontFamily: 'Lato',
        showName: 'Lato',
        fontFile: 'Lato-Regular.ttf'
    }
];

function getFontFormat(fontFile) {
    if (/\.woff2$/i.test(fontFile)) return 'woff2';
    if (/\.woff$/i.test(fontFile)) return 'woff';
    if (/\.otf$/i.test(fontFile)) return 'opentype';
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
    src: url(${fontBaseUrl}${font.fontFile}) format('${getFontFormat(font.fontFile)}');
}`;
    });
    const fs = require('fs');
    fs.writeFileSync(cssFile, css);
}

module.exports = {
    generateFontCSS,
    fontList
}
