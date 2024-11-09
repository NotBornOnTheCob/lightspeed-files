[
function (require, module, exports) {
module.exports = function (env) {
    function createDebug(namespace) {
    let prevTime,
        namespacesCache,
        enabledCache,
        enableOverride = null;
    function debug(...args) {
        if (!debug.enabled) return;
        const self = debug,
        curr = Number(new Date()),
        ms = curr - (prevTime || curr);
        (self.diff = ms),
        (self.prev = prevTime),
        (self.curr = curr),
        (prevTime = curr),
        (args[0] = createDebug.coerce(args[0])),
        "string" != typeof args[0] && args.unshift("%O");
        let index = 0;
        (args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
        if ("%%" === match) return "%";
        index++;
        const formatter = createDebug.formatters[format];
        if ("function" == typeof formatter) {
            const val = args[index];
            (match = formatter.call(self, val)),
            args.splice(index, 1),
            index--;
        }
        return match;
        })),
        createDebug.formatArgs.call(self, args);
        (self.log || createDebug.log).apply(self, args);
    }
    return (
        (debug.namespace = namespace),
        (debug.useColors = createDebug.useColors()),
        (debug.color = createDebug.selectColor(namespace)),
        (debug.extend = extend),
        (debug.destroy = createDebug.destroy),
        Object.defineProperty(debug, "enabled", {
        enumerable: !0,
        configurable: !1,
        get: () =>
            null !== enableOverride
            ? enableOverride
            : (namespacesCache !== createDebug.namespaces &&
                ((namespacesCache = createDebug.namespaces),
                (enabledCache = createDebug.enabled(namespace))),
                enabledCache),
        set: (v) => {
            enableOverride = v;
        },
        }),
        "function" == typeof createDebug.init && createDebug.init(debug),
        debug
    );
    }
    function extend(namespace, delimiter) {
    const newDebug = createDebug(
        this.namespace +
        (void 0 === delimiter ? ":" : delimiter) +
        namespace
    );
    return (newDebug.log = this.log), newDebug;
    }
    function toNamespace(regexp) {
    return regexp
        .toString()
        .substring(2, regexp.toString().length - 2)
        .replace(/\.\*\?$/, "*");
    }
    return (
    (createDebug.debug = createDebug),
    (createDebug.default = createDebug),
    (createDebug.coerce = function (val) {
        if (val instanceof Error) return val.stack || val.message;
        return val;
    }),
    (createDebug.disable = function () {
        const namespaces = [
        ...createDebug.names.map(toNamespace),
        ...createDebug.skips
            .map(toNamespace)
            .map((namespace) => "-" + namespace),
        ].join(",");
        return createDebug.enable(""), namespaces;
    }),
    (createDebug.enable = function (namespaces) {
        let i;
        createDebug.save(namespaces),
        (createDebug.namespaces = namespaces),
        (createDebug.names = []),
        (createDebug.skips = []);
        const split = (
            "string" == typeof namespaces ? namespaces : ""
        ).split(/[\s,]+/),
        len = split.length;
        for (i = 0; i < len; i++)
        split[i] &&
            ("-" === (namespaces = split[i].replace(/\*/g, ".*?"))[0]
            ? createDebug.skips.push(
                new RegExp("^" + namespaces.substr(1) + "$")
                )
            : createDebug.names.push(
                new RegExp("^" + namespaces + "$")
                ));
    }),
    (createDebug.enabled = function (name) {
        if ("*" === name[name.length - 1]) return !0;
        let i, len;
        for (i = 0, len = createDebug.skips.length; i < len; i++)
        if (createDebug.skips[i].test(name)) return !1;
        for (i = 0, len = createDebug.names.length; i < len; i++)
        if (createDebug.names[i].test(name)) return !0;
        return !1;
    }),
    (createDebug.humanize = require("ms")),
    (createDebug.destroy = function () {
        console.warn(
        "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
        );
    }),
    Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
    }),
    (createDebug.names = []),
    (createDebug.skips = []),
    (createDebug.formatters = {}),
    (createDebug.selectColor = function (namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++)
        (hash = (hash << 5) - hash + namespace.charCodeAt(i)),
            (hash |= 0);
        return createDebug.colors[
        Math.abs(hash) % createDebug.colors.length
        ];
    }),
    createDebug.enable(createDebug.load()),
    createDebug
    );
};
}
]