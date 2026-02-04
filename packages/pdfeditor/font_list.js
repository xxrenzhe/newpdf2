const fontDomain = 'https://fonts.abcdpdf.com/';

const fontList = [
    {
        fontFamily: 'Arial',
        showName: 'Arial',
        fontFile: 'Arimo-Regular.ttf'
    },
    {
        fontFamily: 'SimSun',
        showName: '宋体',
        fontFile: 'unicode.ttf'
    }
];

function generateFontCSS(cssFile) {
    let css = '';
    fontList.forEach(font => {
        css += `
@font-face {
    font-family: '${font.fontFamily}';
    font-style: normal;
    font-weight: 400;
    src: url(${fontDomain}${font.fontFile}) format('woff2');
}`;
});
    const fs = require('fs');
    fs.writeFileSync(cssFile, css);
}

module.exports = {
    generateFontCSS,
    fontList
}