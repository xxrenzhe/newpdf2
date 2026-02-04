module.exports = function scopePdfEditorRoot() {
  return {
    postcssPlugin: 'pdfeditor-scope-root',
    Rule(rule) {
      if (!rule.selectors) return;
      if (rule.parent && rule.parent.type === 'atrule') {
        const name = String(rule.parent.name || '');
        if (name.includes('keyframes')) return;
      }
      rule.selectors = rule.selectors.map((selector) => {
        const trimmed = selector.trim();
        if (trimmed.startsWith('@')) return selector;
        const replaced = trimmed
          .replace(/\bhtml\b/g, '#pdf-editor-root')
          .replace(/\bbody\b/g, '#pdf-editor-root')
          .replace(/:root/g, '#pdf-editor-root');
        if (replaced.startsWith('#pdf-editor-root')) {
          return replaced;
        }
        return `#pdf-editor-root ${replaced}`;
      });
    },
  };
};

module.exports.postcss = true;
