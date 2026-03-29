import { ToolbarItemBase } from '../ToolbarItemBase';
import { countTextMatches, replaceTextMatches } from '../../../search_text.js';

const MATCH_CLASS = '__pdf_find_match';
const ACTIVE_MATCH_CLASS = '__pdf_find_match_active';

class Find extends ToolbarItemBase {
    init() {
        this.name = 'find';
        this.matches = [];
        this.activeMatchIndex = -1;
        this.totalHints = 0;
        this.searchRequestId = 0;
        this.lastCriteria = null;
    }

    initActions(objElement) {
        const temp = document.createElement('div');
        temp.innerHTML = require('./actions.phtml')();

        this.elFindInput = temp.querySelector('.__find_input');
        this.elReplaceInput = temp.querySelector('.__replace_input');
        this.elPrev = temp.querySelector('.__find_prev');
        this.elNext = temp.querySelector('.__find_next');
        this.elCaseSensitive = temp.querySelector('.__find_case');
        this.elStatus = temp.querySelector('.__find_status');
        this.elReplace = temp.querySelector('.__find_replace_current');
        this.elReplaceAll = temp.querySelector('.__find_replace_all');

        const submitSearch = (direction = 1, force = false) => {
            void this.runSearch({
                direction,
                force
            });
        };

        this.elFindInput?.addEventListener('keydown', (evt) => {
            if (evt.key !== 'Enter') {
                return;
            }
            evt.preventDefault();
            const force = !this.#isCurrentCriteriaFresh();
            submitSearch(evt.shiftKey ? -1 : 1, force);
        });

        this.elFindInput?.addEventListener('input', () => {
            this.lastCriteria = null;
            this.updateStatus('');
            this.clearHighlights();
        });

        this.elCaseSensitive?.addEventListener('change', () => {
            submitSearch(1, true);
        });

        this.elPrev?.addEventListener('click', () => {
            submitSearch(-1, !this.#isCurrentCriteriaFresh());
        });

        this.elNext?.addEventListener('click', () => {
            submitSearch(1, !this.#isCurrentCriteriaFresh());
        });

        this.elReplace?.addEventListener('click', () => {
            void this.replaceCurrent();
        });

        this.elReplaceAll?.addEventListener('click', () => {
            void this.replaceAll();
        });

        let elActions = [];
        for (let elChild of temp.children) {
            elActions.push(elChild);
        }
        $L.bind(temp);
        return elActions;
    }

    onActive(status) {
        if (status) {
            setTimeout(() => {
                this.elFindInput?.focus();
            }, 0);
            return;
        }

        this.clearHighlights();
        this.updateStatus('');
    }

    getCriteria() {
        return {
            query: String(this.elFindInput?.value ?? ''),
            replaceText: String(this.elReplaceInput?.value ?? ''),
            caseSensitive: !!this.elCaseSensitive?.checked
        };
    }

    updateStatus(text) {
        if (!this.elStatus) {
            return;
        }
        this.elStatus.textContent = text;
    }

    setBusy(isBusy) {
        [
            this.elFindInput,
            this.elReplaceInput,
            this.elPrev,
            this.elNext,
            this.elCaseSensitive,
            this.elReplace,
            this.elReplaceAll
        ].forEach((element) => {
            if (element) {
                element.disabled = isBusy;
            }
        });

        if (isBusy) {
            this.updateStatus('Searching...');
        }
    }

    #isCurrentCriteriaFresh() {
        const criteria = this.getCriteria();
        if (!criteria.query) {
            return false;
        }
        if (!this.lastCriteria) {
            return false;
        }
        return this.lastCriteria.query === criteria.query
            && this.lastCriteria.caseSensitive === criteria.caseSensitive;
    }

    clearHighlights() {
        this.matches.forEach((match) => {
            const anchor = this.getMatchAnchor(match);
            anchor?.classList.remove(MATCH_CLASS, ACTIVE_MATCH_CLASS);
        });
    }

    applyHighlights() {
        this.matches.forEach((match, index) => {
            const anchor = this.getMatchAnchor(match);
            if (!anchor) {
                return;
            }
            anchor.classList.add(MATCH_CLASS);
            anchor.classList.toggle(ACTIVE_MATCH_CLASS, index === this.activeMatchIndex);
        });
    }

    getMatchAnchor(match) {
        if (!match) {
            return null;
        }

        if (match.kind === 'element') {
            return match.element?.el || null;
        }

        if (typeof match.readerPage?.getTextPartElement === 'function') {
            return match.readerPage.getTextPartElement(match.partIdx);
        }

        return null;
    }

    async collectMatches(criteria, requestId) {
        const matches = [];

        for (let pageNum = 1; pageNum <= this.reader.pageCount; pageNum++) {
            if (requestId !== this.searchRequestId) {
                return [];
            }

            const readerPage = this.reader.pdfDocument.getPage(pageNum);
            if (typeof readerPage.ensureTextLayerReady === 'function') {
                await readerPage.ensureTextLayerReady();
            }

            const textMatches = typeof readerPage.findTextParts === 'function'
                ? readerPage.findTextParts(criteria.query, criteria.caseSensitive)
                : await readerPage.find(criteria.query, criteria.caseSensitive);

            if (Array.isArray(textMatches)) {
                textMatches.forEach((match) => {
                    matches.push({
                        kind: 'origin',
                        pageNum,
                        readerPage,
                        partIdx: match.partIdx ?? null,
                        hints: match.hints || 1
                    });
                });
            }

            const editorPage = this.editor.pdfDocument.getPage(pageNum);
            Object.values(editorPage?.elements?.items || {}).forEach((element) => {
                if (!element || ['text', 'textbox', 'textCanvas'].indexOf(element.dataType) < 0) {
                    return;
                }
                const hints = countTextMatches(element.attrs?.text, criteria.query, criteria.caseSensitive);
                if (hints < 1) {
                    return;
                }
                matches.push({
                    kind: 'element',
                    pageNum,
                    element,
                    hints
                });
            });
        }

        return matches;
    }

    async runSearch({
        direction = 1,
        force = false
    } = {}) {
        if (!force && this.#isCurrentCriteriaFresh() && this.matches.length > 0) {
            return this.focusRelative(direction);
        }

        const criteria = this.getCriteria();
        if (!criteria.query) {
            this.lastCriteria = null;
            this.matches = [];
            this.totalHints = 0;
            this.activeMatchIndex = -1;
            this.clearHighlights();
            this.updateStatus('');
            return false;
        }

        const requestId = ++this.searchRequestId;
        this.clearHighlights();
        this.matches = [];
        this.totalHints = 0;
        this.activeMatchIndex = -1;
        this.lastCriteria = null;
        this.setBusy(true);

        try {
            const matches = await this.collectMatches(criteria, requestId);
            if (requestId !== this.searchRequestId) {
                return false;
            }

            this.matches = matches;
            this.totalHints = matches.reduce((sum, match) => sum + (match.hints || 0), 0);
            this.lastCriteria = {
                query: criteria.query,
                caseSensitive: criteria.caseSensitive
            };

            if (matches.length < 1) {
                this.updateStatus('0 results');
                return false;
            }

            return this.focusMatch(direction < 0 ? matches.length - 1 : 0);
        } finally {
            if (requestId === this.searchRequestId) {
                this.setBusy(false);
            }
        }
    }

    async focusMatch(index) {
        if (!this.matches.length) {
            this.activeMatchIndex = -1;
            this.updateStatus('0 results');
            return false;
        }

        if (index < 0) {
            index = this.matches.length - 1;
        } else if (index >= this.matches.length) {
            index = 0;
        }

        this.activeMatchIndex = index;
        const match = this.matches[index];
        if (match) {
            this.reader.pdfDocument.mainScrollTo(match.pageNum, true);
        }
        this.applyHighlights();
        const anchor = this.getMatchAnchor(match);
        if (anchor?.scrollIntoView) {
            anchor.scrollIntoView({
                block: 'center',
                inline: 'nearest'
            });
        }
        this.updateStatus((index + 1) + '/' + this.matches.length + ' | ' + this.totalHints + ' hits');
        return true;
    }

    focusRelative(step) {
        if (!this.matches.length) {
            return false;
        }
        const nextIndex = this.activeMatchIndex < 0 ? 0 : this.activeMatchIndex + step;
        return this.focusMatch(nextIndex);
    }

    async ensureEditableMatch(match) {
        if (!match) {
            return null;
        }

        if (match.kind === 'element') {
            return match.element || null;
        }

        if (!match.readerPage || typeof match.readerPage.convertTextPart !== 'function') {
            return null;
        }

        await match.readerPage.convertTextPart(match.partIdx);
        const editorPage = this.editor.pdfDocument.getPage(match.pageNum);
        return Object.values(editorPage?.elements?.items || {}).find((element) => {
            return String(element?.attrs?.originTextPartIdx ?? '') === String(match.partIdx ?? '')
                && Number.parseInt(String(element?.attrs?.originPageNum ?? ''), 10) === match.pageNum;
        }) || null;
    }

    async replaceCurrent() {
        const ready = this.#isCurrentCriteriaFresh() ? true : await this.runSearch({
            direction: 1,
            force: true
        });
        if (!ready || this.activeMatchIndex < 0 || !this.matches[this.activeMatchIndex]) {
            return false;
        }

        const criteria = this.getCriteria();
        const target = this.matches[this.activeMatchIndex];
        const element = await this.ensureEditableMatch(target);
        if (!element) {
            return false;
        }

        const result = replaceTextMatches(element.attrs?.text, criteria.query, criteria.replaceText, {
            caseSensitive: criteria.caseSensitive,
            replaceAll: false
        });

        if (result.count < 1 || result.text === element.attrs?.text) {
            return false;
        }

        element.edit({
            text: result.text
        });

        await this.runSearch({
            direction: 1,
            force: true
        });
        return true;
    }

    async replaceAll() {
        const ready = this.#isCurrentCriteriaFresh() ? true : await this.runSearch({
            direction: 1,
            force: true
        });
        if (!ready || !this.matches.length) {
            return false;
        }

        const criteria = this.getCriteria();
        const processed = new Set();
        let changed = 0;

        for (const match of [...this.matches]) {
            const element = await this.ensureEditableMatch(match);
            if (!element || processed.has(element.id)) {
                continue;
            }
            processed.add(element.id);

            const result = replaceTextMatches(element.attrs?.text, criteria.query, criteria.replaceText, {
                caseSensitive: criteria.caseSensitive,
                replaceAll: true
            });

            if (result.count < 1 || result.text === element.attrs?.text) {
                continue;
            }

            element.edit({
                text: result.text
            });
            changed += result.count;
        }

        await this.runSearch({
            direction: 1,
            force: true
        });
        return changed > 0;
    }
}

export default Find;
