[function(require, module, exports) {
    module.exports = class {
        constructor(urlObject) {
            if (void 0 === urlObject) throw new Error("URL Object required");
            this.disabled = !0, this.moduleName = "youtube", urlObject.hostname.match(/\.?youtube\.com$/i) && (this.disabled = !1)
        }
        GatherIntent() {
            if (this.disabled) return;
            const ret = [],
                element = document.getElementById("contenteditable-root");
            return element && ret.push(element.innerText), ret
        }
    }
}]