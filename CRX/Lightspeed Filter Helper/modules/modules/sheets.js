[function(require, module, exports) {
    module.exports = class {
        constructor(urlObject) {
            if (void 0 === urlObject) throw new Error("URL Object required");
            this.disabled = !0, this.moduleName = "sheets", urlObject.href.match(/docs\.google\.com\/spreadsheets/i) && (this.disabled = !1)
        }
        GatherIntent() {
            if (this.disabled) return;
            const ret = [],
                element = document.getElementById("waffle-rich-text-editor");
            return element && ret.push(element.innerText), ret
        }
    }
}]