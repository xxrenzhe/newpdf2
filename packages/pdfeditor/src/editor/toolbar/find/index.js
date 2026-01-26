import { ToolbarItemBase } from '../ToolbarItemBase';
import { createId, trimSpace } from '../../../misc';

const SEARCH_MARKUP_TYPE = 'search';
const SEARCH_MARKUP_COLOR = '#fff000';
const SEARCH_MARKUP_OPACITY = 0.25;
const SEARCH_DEBOUNCE_MS = 200;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class Find extends ToolbarItemBase {
    init() {
        this.name = 'find';
        this.searchState = {
            term: '',
            matches: [],
            currentIndex: 0,
            markups: new Map()
        };
        this.searchTimer = null;
    }

    initActions(objElement) {
        const temp = document.createElement('div');
        temp.innerHTML = require('./actions.phtml')();

        const inputs = temp.querySelectorAll('input[type="text"]');
        const elFindInput = inputs[0] || null;
        const elReplaceInput = inputs[1] || null;
        const btnReplace = temp.querySelector('button[data-locale="replace"]');
        const btnReplaceAll = temp.querySelector('button[data-locale="replace_all"]');

        const runFind = () => {
            const term = elFindInput?.value || '';
            void this.performFind(term);
        };
        const runReplace = () => {
            const term = elFindInput?.value || '';
            const replacement = elReplaceInput?.value || '';
            void this.replaceNext(term, replacement);
        };
        const runReplaceAll = () => {
            const term = elFindInput?.value || '';
            const replacement = elReplaceInput?.value || '';
            void this.replaceAll(term, replacement);
        };

        if (elFindInput) {
            elFindInput.addEventListener('input', () => {
                this.queueFind(elFindInput.value);
            });
            elFindInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    runFind();
                }
            });
        }

        if (elReplaceInput) {
            elReplaceInput.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    runReplace();
                }
            });
        }

        if (btnReplace) {
            btnReplace.addEventListener('click', runReplace);
        }
        if (btnReplaceAll) {
            btnReplaceAll.addEventListener('click', runReplaceAll);
        }

        let elActions = [];
        for (let elChild of temp.children) {
            elActions.push(elChild);
        }
        if (typeof $L !== 'undefined' && $L?.bind) {
            $L.bind(temp);
        }
        return elActions;
    }

    queueFind(term) {
        if (this.searchTimer) {
            clearTimeout(this.searchTimer);
        }
        this.searchTimer = setTimeout(() => {
            void this.performFind(term);
        }, SEARCH_DEBOUNCE_MS);
    }

    async performFind(term, options = {}) {
        const nextTerm = trimSpace(term || '');
        if (!nextTerm) {
            this.resetSearchState();
            return;
        }

        const termChanged = nextTerm !== this.searchState.term;
        const keepIndex = Number.isFinite(options.keepIndex)
            ? options.keepIndex
            : (termChanged ? 0 : this.searchState.currentIndex);

        const result = await this.collectMatches(nextTerm);
        const matches = result.matches;
        this.searchState.term = nextTerm;
        this.searchState.matches = matches;
        this.searchState.currentIndex = matches.length
            ? Math.min(Math.max(keepIndex, 0), matches.length - 1)
            : 0;
        this.applyHighlights(result.highlightTargets);

        if (matches.length) {
            this.scrollToMatch(matches[this.searchState.currentIndex]);
        }
    }

    resetSearchState() {
        this.searchState.term = '';
        this.searchState.matches = [];
        this.searchState.currentIndex = 0;
        this.clearHighlights();
    }

    async replaceNext(findValue, replacementValue) {
        const term = trimSpace(findValue || '');
        if (!term) {
            this.resetSearchState();
            return;
        }

        if (term !== this.searchState.term || !this.searchState.matches.length) {
            await this.performFind(term);
        }

        const matches = this.searchState.matches;
        if (!matches.length) {
            return;
        }

        const index = this.searchState.currentIndex >= matches.length ? 0 : this.searchState.currentIndex;
        const match = matches[index];
        const replaced = await this.replaceMatch(match, replacementValue);
        if (!replaced) {
            return;
        }
        await this.performFind(term, { keepIndex: index });
    }

    async replaceAll(findValue, replacementValue) {
        const term = trimSpace(findValue || '');
        if (!term) {
            this.resetSearchState();
            return;
        }

        const result = await this.collectMatches(term);
        if (!result.matches.length) {
            this.applyHighlights(new Map());
            this.searchState.term = term;
            this.searchState.matches = [];
            this.searchState.currentIndex = 0;
            return;
        }

        const replacement = typeof replacementValue === 'string' ? replacementValue : '';
        const processed = new Set();
        for (const match of result.matches) {
            const page = match.page;
            if (!page) continue;
            const key = `${match.pageNum}:${match.partIndex}`;
            if (processed.has(key)) {
                continue;
            }
            processed.add(key);

            if (typeof page.ensureTextParts === 'function') {
                await page.ensureTextParts();
            }
            const part = page.textParts?.[match.partIndex];
            if (!part || typeof part.text !== 'string') {
                continue;
            }
            const nextText = this.replaceAllText(part.text, term, replacement);
            if (nextText !== part.text) {
                await this.applyReplacementText(page, match.partIndex, nextText);
            }
        }

        await this.performFind(term);
    }

    async replaceMatch(match, replacementValue) {
        const page = match?.page;
        if (!page) return false;
        if (typeof page.ensureTextParts === 'function') {
            await page.ensureTextParts();
        }
        const part = page.textParts?.[match.partIndex];
        if (!part || typeof part.text !== 'string') {
            return false;
        }
        const replacement = typeof replacementValue === 'string' ? replacementValue : '';
        const start = Math.max(0, match.start);
        const end = Math.max(start, match.end);
        const nextText = part.text.slice(0, start) + replacement + part.text.slice(end);
        return this.applyReplacementText(page, match.partIndex, nextText);
    }

    async applyReplacementText(page, partIndex, nextText) {
        const part = page?.textParts?.[partIndex];
        if (!part) return false;

        const anchor = this.getTextPartAnchor(part);
        if (!anchor) return false;

        const editorPage = this.editor?.pdfDocument?.getPage?.(page.pageNum);
        if (!editorPage) return false;

        const partKey = anchor.getAttribute('data-l') || '0';
        const elementId = `${page.pageNum}_${partIndex}_${partKey}`;
        let element = editorPage.elements?.get?.(elementId);
        if (!element) {
            element = this.getExistingTextElement(editorPage, page.pageNum, partIndex);
        }
        if (!element) {
            await page.convertWidget(anchor);
            element = editorPage.elements?.get?.(elementId)
                || this.getExistingTextElement(editorPage, page.pageNum, partIndex);
        }
        if (!element) return false;

        const nextAttrs = { text: nextText };
        if (element.attrs?.hidden && trimSpace(nextText)) {
            nextAttrs.hidden = false;
        }
        element.edit(nextAttrs);

        part.text = nextText;
        if (anchor.textContent !== nextText) {
            anchor.textContent = nextText;
        }
        return true;
    }

    getExistingTextElement(editorPage, pageNum, partIndex) {
        const items = editorPage?.elements?.items;
        if (!items) return null;
        const prefix = `${pageNum}_${partIndex}_`;
        const matchId = Object.keys(items).find(id => id.startsWith(prefix));
        return matchId ? items[matchId] : null;
    }

    replaceAllText(text, term, replacement) {
        const escaped = escapeRegExp(term);
        const regex = new RegExp(escaped, 'gi');
        return String(text).replace(regex, () => replacement);
    }

    async collectMatches(term) {
        const pages = this.getRenderedPages();
        const matches = [];
        const highlightTargets = new Map();
        const escaped = escapeRegExp(term);
        const regexFlags = 'gi';

        for (const page of pages) {
            if (!page) continue;
            if (typeof page.ensureTextParts === 'function') {
                await page.ensureTextParts();
            }
            const parts = Array.isArray(page.textParts) ? page.textParts : [];
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const text = typeof part?.text === 'string' ? part.text : '';
                if (!text) continue;
                const regex = new RegExp(escaped, regexFlags);
                let match = null;
                while ((match = regex.exec(text)) !== null) {
                    matches.push({
                        page,
                        pageNum: page.pageNum,
                        partIndex: i,
                        start: match.index,
                        end: match.index + match[0].length
                    });
                }
                if (regex.lastIndex > 0) {
                    let set = highlightTargets.get(page.pageNum);
                    if (!set) {
                        set = new Set();
                        highlightTargets.set(page.pageNum, set);
                    }
                    set.add(i);
                }
            }
        }

        return { matches, highlightTargets };
    }

    getRenderedPages() {
        const doc = this.reader?.pdfDocument;
        if (!doc || !Array.isArray(doc.pages)) return [];
        return doc.pages.filter(page => page && page.rendered);
    }

    getTextPartAnchor(part) {
        const elements = Array.isArray(part?.elements) ? part.elements.filter(el => el && el.isConnected) : [];
        if (!elements.length) return null;
        const withText = elements.find(el => trimSpace(el.textContent || '') !== '');
        return withText || elements[0];
    }

    getTextPartBounds(page, part) {
        const bounds = part?.bounds;
        if (bounds && Number.isFinite(bounds.width) && bounds.width > 0 && Number.isFinite(bounds.height) && bounds.height > 0) {
            return bounds;
        }
        const anchor = this.getTextPartAnchor(part);
        const layer = page?.elTextLayer;
        if (!anchor || !layer) return null;
        const rect = anchor.getBoundingClientRect();
        const layerRect = layer.getBoundingClientRect();
        const left = rect.left - layerRect.left;
        const top = rect.top - layerRect.top;
        const width = rect.width;
        const height = rect.height;
        if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height)) {
            return null;
        }
        if (width <= 0 || height <= 0) return null;
        return {
            left,
            top,
            right: left + width,
            bottom: top + height,
            width,
            height
        };
    }

    applyHighlights(highlightTargets) {
        this.clearHighlights();
        if (!highlightTargets || highlightTargets.size === 0) {
            return;
        }
        const markups = this.searchState.markups;
        for (const [pageNum, partSet] of highlightTargets.entries()) {
            const page = this.reader?.pdfDocument?.getPage?.(pageNum);
            if (!page) continue;
            const ids = [];
            partSet.forEach(partIndex => {
                const part = page.textParts?.[partIndex];
                const bounds = this.getTextPartBounds(page, part);
                if (!bounds) return;
                const scale = page.scale || 1;
                const markupId = createId('search_');
                page.addTextMarkup({
                    id: markupId,
                    type: SEARCH_MARKUP_TYPE,
                    x: bounds.left / scale,
                    y: bounds.top / scale,
                    width: bounds.width / scale,
                    height: bounds.height / scale,
                    background: SEARCH_MARKUP_COLOR,
                    opacity: SEARCH_MARKUP_OPACITY
                });
                ids.push(markupId);
            });
            if (ids.length) {
                markups.set(pageNum, ids);
            }
        }
    }

    clearHighlights() {
        const markups = this.searchState.markups;
        if (!markups || markups.size === 0) return;
        for (const [pageNum, ids] of markups.entries()) {
            const page = this.reader?.pdfDocument?.getPage?.(pageNum);
            if (!page || !Array.isArray(ids)) continue;
            ids.forEach(id => page.removeTextMarkup(id));
        }
        markups.clear();
    }

    scrollToMatch(match) {
        const pageNum = match?.pageNum;
        if (!Number.isFinite(pageNum)) return;
        this.reader?.pdfDocument?.mainScrollTo?.(pageNum, true);
    }
}

export default Find;
