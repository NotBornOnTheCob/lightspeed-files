[function(require, module, exports) {
    const d = require("debug")("flags"),
        Remote = require("./remote");
    let terms, flagSettings, reportedTerms = {};
    module.exports.Configure = function() {
        d("[Configure]");
        const policy = Remote.Policy();
        try {
            terms = [], policy.flags.terms && policy.flags.terms.length > 0 && policy.flags.terms.forEach(term => {
                const args = {
                    term
                };
                let regexTerm = term.replace(/[\]{}?^$().*\\+|[]/g, "\\$&");
                regexTerm = regexTerm.replace(/\\\*/g, ".*"), regexTerm = regexTerm.replace(/\\\?/g, "."), args.regex = new RegExp("\\b" + regexTerm + "\\b", "gi"), terms.push(args)
            });
            const ret = {};
            policy.flags.settings && Object.keys(policy.flags.settings).forEach(site => {
                let matcher;
                if (void 0 === ret[site]) {
                    if (ret[site] = policy.flags.settings[site], ret[site].regex) matcher = ret[site].matcher, delete ret[site].regex;
                    else if (matcher = ret[site].matcher.replace(/[\]{}?^$().*\\+|[]/g, "\\$&").replace(/\\\*/g, ".*"), !matcher.match("/")) {
                        let prefix = true;
                        matcher.match(/^\.\*/) && (matcher = "^[^:]+://" + matcher, prefix = false), matcher.match(/\.\*$/) ? (matcher.match("^[^:]+://") || (matcher = "^[^:]+://" + matcher), prefix = false) : matcher += "\\/", prefix && (matcher = "^[^:]+://([^\\.]+\\.)*" + matcher)
                    }
                    ret[site].matcher = new RegExp(matcher, "i")
                }
            }), flagSettings = ret, d("[Settings] -> ", flagSettings), d("[Terms] -> ", terms)
        } catch (e) {
            terms = [], flagSettings = {}, d("[Configure] error -> ", e)
        }
    }, module.exports.ProcessText = function(data) {
        d("[ProcessText] -> ", data);
        const flags = [],
            urlObject = new URL(data.url);
        void 0 === reportedTerms[urlObject.href] && (reportedTerms[urlObject.href] = {}), d("[ProcessText] current -> ", reportedTerms[urlObject.href]), terms.forEach(args => {
                const hits = data.text.match(args.regex);
                null != hits && hits.length > 0 && void 0 === reportedTerms[urlObject.href][args.term] && (flags.push([args.term, hits.length]), reportedTerms[urlObject.href][args.term] = hits.length, d("[ProcessText] hit -> ", hits))
            }),
            function(url, flags) {
                if (!Array.isArray(flags)) throw new Error("flags must be an array");
                if (0 === flags.length) return;
                Remote.ReportFlags({
                    flags,
                    url
                })
            }(data.url, flags)
    }, module.exports.GetFlagMode = function(url) {
        let ret = Remote.Policy().content_filter.flag_mode;
        return Object.keys(flagSettings).some(site => {
            const args = flagSettings[site];
            if (url.match(args.matcher) && void 0 !== args.mode) return ret = args.mode, true
        }), ret
    }, module.exports.GetFlagIngored = function(url) {
        let ret = false;
        return Object.keys(flagSettings).some(site => {
            const args = flagSettings[site];
            if (url.match(args.matcher) && void 0 !== args.ignore) return ret = args.ignore, true
        }), ret
    }
}]
