import { Events, PDFEvent } from '../../event';
import OpenFile from './open_file';
import Pages from './pages';
import Mouse from './mouse';
import Text from './text';
import Image from './image';
import Rect from './rect';
import Eraser from './eraser';
import Highlight from './highlight';
import Radact from './radact';
import Circle from './circle';
import Ellipse from './ellipse';
import Line from './line';
import TextHighLight from './text_highlight';
import Download from './download';
import History from './history';
import Shapes from './shapes';
import TextBox from './textbox';
import Hand from './hand';
import Find from './find';
import Underline from './underline';
import Strikethrough from './strikethrough';
import Signature from './signature';
import Watermark from './watermark';
import HeaderFooter from './header_footer';
import PageNumber from './page_number';
import Forms from './forms';
import InsertPages from './insert_pages';
import DeletePages from './delete_pages';
import TextArt from './textArt';
import Stamp from './stamp';

const ITEMS = {
    openFile: OpenFile,
    pages: Pages,
    mouse: Mouse,
    hand: Hand,
    text: Text,
    image: Image,
    rect: Rect,
    eraser: Eraser,
    radact: Radact,
    highlight: Highlight,
    circle: Circle,
    ellipse: Ellipse,
    line: Line,
    download: Download,
    text_highlight: TextHighLight,
    history: History,
    shapes: Shapes,
    textbox: TextBox,
    find: Find,
    underline: Underline,
    strikethrough: Strikethrough,
    signature: Signature,
    watermark: Watermark,
    header_footer: HeaderFooter,
    page_number: PageNumber,
    forms: Forms,
    insert_pages: InsertPages,
    delete_pages: DeletePages,
    textArt: TextArt,
    stamp:Stamp,
};

class Toolbar {
    constructor(editor, options) {
        this.editor = editor;
        this.options = {
            box: null,
            items: ['pages', 'mouse', 'text', 'image', 'eraser', 'radact', 'highlight', 'line', 'download','textArt']
        };
        this.options = Object.assign(this.options, options);
        if (this.options.box instanceof Node) {
            this.container = this.options.box;
        } else if (typeof(this.options.box) == 'string') {
            this.container = document.querySelector(this.options.box);
        }
        this.container?.classList.add('__pdf_editor_toolbar');
        this.toolActive = null;
        this.tools = {};
        //主要是为了实现TextElement点击两次才添加
        this.clickNum = 0;
        this.init();
    }

    get reader() {
        return this.editor.reader;
    }

    init() {
        this.options.items.forEach(itemType => {
            const itemInstance = new ITEMS[itemType](this);
            this.tools[itemType] = itemInstance;
            this.container?.appendChild(itemInstance.container);
        });

        PDFEvent.on(Events.PAGE_DOWN, e => {
            if (this.toolActive) {
                if (this.toolActive.name == 'text') {
                    if (this.clickNum % 2 == 0) {
                        this.toolActive.pageClick(e);
                    }
                    this.clickNum++;
                } else {
                    this.toolActive.pageClick(e);
                }
            }
        });

        //切换分面时根据当时工具来设置div层级
        PDFEvent.on(Events.PAGE_ACTIVE, e => {
            if (this.toolActive) {
                this.toolActive.__setzIndex();
            }
        });
    }

    get(name) {
        return this.tools[name];
    }

    getActive() {
        return this.toolActive;
    }

    setActive(tool) {
        this.clickNum = 0;
        // PDFEvent.dispatch(Events.TOOLBAR_ITEM_CLICK, tool);
        if (this.toolActive == tool) {
            return;
        }
        
        //已经有选中的元素时触发失去焦点事件
        if (this.toolActive) {
            this.reader.mainBox.classList.remove('__cursor_' + this.toolActive.name);
            this.toolActive.container.classList.remove('active');
            this.toolActive.setActive(false);
            // PDFEvent.dispatch(Events.TOOLBAR_ITEM_BLUR, this.toolActive);
        }
        this.toolActive = tool;
        this.reader.mainBox.classList.add('__cursor_' + this.toolActive.name);
        this.toolActive.container.classList.add('active');
        // PDFEvent.dispatch(Events.TOOLBAR_ITEM_ACTIVE, this.toolActive);
    }

    //自定义工具扩展
    extend(name, module) {
        this.tools[name] = module;
        this.container?.appendChild(module.container);
    }
}

export { Toolbar };