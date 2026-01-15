
//缩放参数
const SCALE = {
    MAX: 3,
    MIN: 0.25,
    STEP: 0.1,   //针对鼠标滚轮
    AUTO_MAX: 1.75   //使用自动缩放模式的最大值
};

const VIEW_MODE = {
    AUTO_ZOOM: 'auto_zoom',
    FIT_PAGE: 'fit_page',
    FIT_WIDTH: 'fit_width',
    ACTUAL_SIZE: 'actual_size',
    VIEW_2PAGE: 'view_2page'
};


//工具栏的预设颜色列表
const COLOR_ITEMS = [
    '#ff0000',
    '#fdb91a',
    '#e3d236',
    '#00e100',
    '#00d7e8',
    '#10d7e8',
    '#0000ff',
    '#9000ff',
    '#c93ef7',
    '#e93ef7',
    '#f8c1ff',
    '#ffffff',
    '#bbbbbb',
    '#000000',
    '#ae5700'
];

const LANG_LIST = [
    "ar",
    "en",
    "es",
    "fr",
    "de",
    "it",
    "pt",
    "pl",
    "da",
    "nl",
    "fi",
    "cs",
    "sv",
    "no",
    "ro",
    "ru",
    "el",
    "id",
    "zh-cn",
    "zh-ft",
    "ja",
    "ko",
    "th",
    "tr",
    "vn"
];


//默认字体列表
const FONT_LIST = {

};

export {
    COLOR_ITEMS,
    FONT_LIST,
    SCALE,
    VIEW_MODE,
    LANG_LIST
};