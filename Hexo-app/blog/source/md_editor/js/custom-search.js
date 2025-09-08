const customSearch = {
    dialog: null,
    searchInput: null,
    replaceInput: null,
    status: null,
    cm: null,
    cursor: null,
    lastQuery: null,

    init(editor) {
        this.cm = editor.cm;
        this.dialog = document.getElementById('custom-search-dialog');
        this.searchInput = document.getElementById('custom-search-query');
        this.replaceInput = document.getElementById('custom-replace-query');
        this.status = document.getElementById('custom-search-status');

        const self = this;
        this.dialog.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target === self.searchInput) {
                e.preventDefault();
                self.findNext();
            }
            if (e.key === 'Enter' && e.target === self.replaceInput) {
                e.preventDefault();
                self.replace();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                self.close();
            }
        });
    },

    open() {
        if (!this.cm) {
            console.error("Editor not initialized for custom search.");
            return;
        }
        this.dialog.style.display = 'block';
        const selectedText = this.cm.getSelection();
        if (selectedText) {
            this.searchInput.value = selectedText;
        }
        this.searchInput.focus();
        this.searchInput.select();
    },

    close() {
        this.dialog.style.display = 'none';
        this.clearSearch();
        this.cm.focus();
    },

    clearSearch() {
        this.cursor = null;
        this.lastQuery = null;
        this.status.textContent = '';
    },

    getSearchCursor(query, from) {
        return this.cm.getSearchCursor(query, from, {caseFold: true});
    },

    find(isPrev) {
        const query = this.searchInput.value;
        if (!query) {
            this.status.textContent = '请输入搜索内容';
            return;
        }

        if (this.lastQuery !== query) {
            this.lastQuery = query;
            this.cursor = this.getSearchCursor(query, this.cm.getCursor());
        }

        let found = isPrev ? this.cursor.findPrevious() : this.cursor.findNext();

        if (!found) {
            const from = isPrev ? {line: this.cm.lastLine()} : {line: 0, ch: 0};
            this.cursor = this.getSearchCursor(query, from);
            found = isPrev ? this.cursor.findPrevious() : this.cursor.findNext();
            if (found) {
                this.status.textContent = isPrev ? '已从末尾开始搜索' : '已从头开始搜索';
            }
        } else {
            this.status.textContent = '';
        }

        if (found) {
            this.cm.setSelection(this.cursor.from(), this.cursor.to());
            this.cm.scrollIntoView({ from: this.cursor.from(), to: this.cursor.to() }, 50);
        } else {
            this.status.textContent = '未找到匹配项';
        }
    },

    findNext() {
        this.find(false);
    },

    findPrev() {
        this.find(true);
    },

    replace() {
        const currentSelection = this.cm.getSelection();
        if (this.lastQuery && currentSelection && currentSelection.toLowerCase() === this.lastQuery.toLowerCase()) {
             this.cursor.replace(this.replaceInput.value);
             this.findNext();
        } else {
            this.findNext();
        }
    },

    replaceAll() {
        const query = this.searchInput.value;
        const replaceText = this.replaceInput.value;
        if (!query) {
            this.status.textContent = '请输入搜索内容';
            return;
        }

        this.cm.operation(() => {
            let count = 0;
            const cursor = this.getSearchCursor(query);
            while (cursor.findNext()) {
                cursor.replace(replaceText);
                count++;
            }
            this.status.textContent = `已替换 ${count} 处匹配。`;
            setTimeout(() => this.clearSearch(), 1000);
        });
    }
};