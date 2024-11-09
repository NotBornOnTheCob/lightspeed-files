[
function (require, module, exports) {
  var s = 1e3,
    m = 6e4,
    h = 60 * m,
    d = 24 * h;
  function plural(ms, msAbs, n, name) {
    var isPlural = msAbs >= 1.5 * n;
    return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
  }
  module.exports = function (val, options) {
    options = options || {};
    var type = typeof val;
    if ("string" === type && val.length > 0)
      return (function (str) {
        if ((str = String(str)).length > 100) return;
        var match =
          /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
            str
          );
        if (!match) return;
        var n = parseFloat(match[1]);
        switch ((match[2] || "ms").toLowerCase()) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return 315576e5 * n;
          case "weeks":
          case "week":
          case "w":
            return 6048e5 * n;
          case "days":
          case "day":
          case "d":
            return n * d;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n * h;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n * m;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n * s;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n;
          default:
            return;
        }
      })(val);
    if ("number" === type && isFinite(val))
      return options.long
        ? (function (ms) {
            var msAbs = Math.abs(ms);
            if (msAbs >= d) return plural(ms, msAbs, d, "day");
            if (msAbs >= h) return plural(ms, msAbs, h, "hour");
            if (msAbs >= m) return plural(ms, msAbs, m, "minute");
            if (msAbs >= s) return plural(ms, msAbs, s, "second");
            return ms + " ms";
          })(val)
        : (function (ms) {
            var msAbs = Math.abs(ms);
            if (msAbs >= d) return Math.round(ms / d) + "d";
            if (msAbs >= h) return Math.round(ms / h) + "h";
            if (msAbs >= m) return Math.round(ms / m) + "m";
            if (msAbs >= s) return Math.round(ms / s) + "s";
            return ms + "ms";
          })(val);
    throw new Error(
      "val is not a non-empty string or a valid number. val=" +
        JSON.stringify(val)
    );
  };
}
]