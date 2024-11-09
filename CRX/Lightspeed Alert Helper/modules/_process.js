[
function (require, module, exports) {
var cachedSetTimeout,
    cachedClearTimeout,
    process = (module.exports = {});
function defaultSetTimout() {
    throw new Error("setTimeout has not been defined");
}
function defaultClearTimeout() {
    throw new Error("clearTimeout has not been defined");
}
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) return setTimeout(fun, 0);
    if (
    (cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) &&
    setTimeout
    )
    return (cachedSetTimeout = setTimeout), setTimeout(fun, 0);
    try {
    return cachedSetTimeout(fun, 0);
    } catch (e) {
    try {
        return cachedSetTimeout.call(null, fun, 0);
    } catch (e) {
        return cachedSetTimeout.call(this, fun, 0);
    }
    }
}
!(function () {
    try {
    cachedSetTimeout =
        "function" == typeof setTimeout ? setTimeout : defaultSetTimout;
    } catch (e) {
    cachedSetTimeout = defaultSetTimout;
    }
    try {
    cachedClearTimeout =
        "function" == typeof clearTimeout
        ? clearTimeout
        : defaultClearTimeout;
    } catch (e) {
    cachedClearTimeout = defaultClearTimeout;
    }
})();
var currentQueue,
    queue = [],
    draining = !1,
    queueIndex = -1;
function cleanUpNextTick() {
    draining &&
    currentQueue &&
    ((draining = !1),
    currentQueue.length
        ? (queue = currentQueue.concat(queue))
        : (queueIndex = -1),
    queue.length && drainQueue());
}
function drainQueue() {
    if (!draining) {
    var timeout = runTimeout(cleanUpNextTick);
    draining = !0;
    for (var len = queue.length; len; ) {
        for (currentQueue = queue, queue = []; ++queueIndex < len; )
        currentQueue && currentQueue[queueIndex].run();
        (queueIndex = -1), (len = queue.length);
    }
    (currentQueue = null),
        (draining = !1),
        (function (marker) {
        if (cachedClearTimeout === clearTimeout)
            return clearTimeout(marker);
        if (
            (cachedClearTimeout === defaultClearTimeout ||
            !cachedClearTimeout) &&
            clearTimeout
        )
            return (
            (cachedClearTimeout = clearTimeout), clearTimeout(marker)
            );
        try {
            cachedClearTimeout(marker);
        } catch (e) {
            try {
            return cachedClearTimeout.call(null, marker);
            } catch (e) {
            return cachedClearTimeout.call(this, marker);
            }
        }
        })(timeout);
    }
}
function Item(fun, array) {
    (this.fun = fun), (this.array = array);
}
function noop() {}
(process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1)
    for (var i = 1; i < arguments.length; i++)
        args[i - 1] = arguments[i];
    queue.push(new Item(fun, args)),
    1 !== queue.length || draining || runTimeout(drainQueue);
}),
    (Item.prototype.run = function () {
    this.fun.apply(null, this.array);
    }),
    (process.title = "browser"),
    (process.browser = !0),
    (process.env = {}),
    (process.argv = []),
    (process.version = ""),
    (process.versions = {}),
    (process.on = noop),
    (process.addListener = noop),
    (process.once = noop),
    (process.off = noop),
    (process.removeListener = noop),
    (process.removeAllListeners = noop),
    (process.emit = noop),
    (process.prependListener = noop),
    (process.prependOnceListener = noop),
    (process.listeners = function (name) {
    return [];
    }),
    (process.binding = function (name) {
    throw new Error("process.binding is not supported");
    }),
    (process.cwd = function () {
    return "/";
    }),
    (process.chdir = function (dir) {
    throw new Error("process.chdir is not supported");
    }),
    (process.umask = function () {
    return 0;
    });
}
]