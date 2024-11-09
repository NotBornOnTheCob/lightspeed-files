[function(require, module, exports) {
    module.exports = class {
        constructor(urlObject) {
            if (void 0 === urlObject) throw new Error("URL Object required");
            this.disabled = !0, this.moduleName = "facebook", urlObject.hostname.match(/\.?facebook\.com$/i) && (this.disabled = !1)
        }
        GatherIntent() {
            if (this.disabled) return;
            const ret = [];
            return document.querySelectorAll('[data-text="true"]').forEach(e => {
                ret.push(e.innerText)
            }), ret
        }
    }
}]