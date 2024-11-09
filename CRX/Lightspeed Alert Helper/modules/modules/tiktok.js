[
function (require, module, exports) {
  module.exports = class {
    constructor(urlObject) {
      if (void 0 === urlObject) throw new Error("URL Object required");
      (this.disabled = !0),
        (this.moduleName = "tiktok"),
        urlObject.hostname.match(/\.?tiktok\.com$/i) &&
          (this.disabled = !1);
    }
    GatherIntent() {
      if (this.disabled) return;
      const ret = [];
      return (
        document.querySelectorAll('[role="combobox"]').forEach((e) => {
          ret.push(e.innerText);
        }),
        ret
      );
    }
  };
}
]