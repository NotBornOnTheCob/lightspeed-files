[function(require, module, exports) {
    const d = require("debug")("remote"),
        Flags = (require("./filter"), require("./flags"));
    let wsFilterCheckInt, wsFilterCheckInInt, wsFilterPolicyInt, wsFilter, cache = {},
        policy = {},
        overrideUntil = 0,
        lockoutUntil = 0,
        wsFilterOpen = false;

    function onFilterMessage(m) {
        try {
            const jData = JSON.parse(m.data);
            switch (d(`[onMessage] '${jData.action}' from agent -> ${JSON.stringify(jData)}`), jData.action) {
                case "lockout":
                    d("[onLockoutMessage] lockout -> ", data = jData), lockoutUntil = data.until;
                    break;
                case "override":
                    ! function(data) {
                        d("[onOverrideMessage] overriding -> ", data), overrideUntil = Date.now() + 6e4 * Policy().content_filter.override_timeout, purgeCacheItems()
                    }(jData);
                    break;
                case "policy":
                    ! function(data) {
                        policy = data.policy, Flags.Configure(), purgeCacheItems()
                    }(jData);
                    break;
                case "score":
                    ! function(data) {
                        data.at = Date.now(), data.hold = false, d("[onScoreMessage] caching -> ", data), cache[data.url] = data
                    }(jData);
                    break;
                default:
                    d("[onMessage] unknown message")
            }
        } catch (err) {
            d("[onMessage] error ->", err)
        }
        var data
    }

    function onFilterOpen() {
        d("[onOpen] filter agent connection open"), wsFilterOpen = true, getPolicy()
    }

    function onFilterError() {
        wsFilter = void 0
    }

    function wsFilterConnect() {
        wsFilter && wsFilter.readyState !== WebSocket.CLOSED && wsFilter.readyState !== WebSocket.CLOSING || (wsFilter = void 0, wsFilter = new WebSocket("wss://localhost:6543/websocket"), wsFilter.onmessage = onFilterMessage, wsFilter.onopen = onFilterOpen, wsFilter.onerror = onFilterError), wsFilterCheckInt && clearTimeout(wsFilterCheckInt), wsFilterCheckInt = setTimeout(wsFilterConnect, 5e3)
    }

    function sendFilterMessage(data) {
        if (wsFilter && wsFilter.readyState === WebSocket.OPEN) try {
            d("[sendFilterMessage] to filter agent -> ", data), wsFilter.send(JSON.stringify(data))
        } catch (err) {
            console.log(err)
        } else wsFilterConnect()
    }

    function Policy() {
        return policy || (policy = {}), policy.allowed || (policy.allowed = {
            protocols: [],
            urls: [],
            hosts: []
        }), policy.content_filter || (policy.content_filter = {
            block_url: "https://localhost:6543/block",
            flag_mode: "page",
            google_filter_domains: false,
            override_timeout: 5,
            overrides: [],
            read_only: []
        }), policy.flags || (policy.flags = {
            terms: [],
            seettings: []
        }), policy.matchers || (policy.matchers = {
            search: [],
            social: [],
            youtube: [],
            yt_restricted: []
        }), policy.youtube || (policy.youtube = {
            age_restriction: false,
            hide_comments: false,
            hide_sidebar: false,
            hide_thumbnails: false,
            prevent_channel_autoplay: false,
            restricted_mode: false
        }), policy
    }

    function getPolicy() {
        sendFilterMessage({action: "policy"});
    }

    function IsYoutube(hostname) {
        const policy = Policy();
        if (!policy.matchers.youtube) return false;;
        const matchers = policy.matchers.youtube,
            l = matchers.length;
        for (let i = 0; i < l; i++)
            if (hostname.match(matchers[i])) return true;
        return false;;
    }

    function Report(data) {
        data.at_epoch_ms = Date.now().toString();
        sendFilterMessage({action: "report", data});
    }

    function purgeCacheItems() {
        cache = {}
    }
    setTimeout((function wsFilterPolicy() {
        wsFilterOpen && getPolicy(), wsFilterPolicyInt && clearTimeout(wsFilterPolicyInt), wsFilterPolicyInt = setTimeout(wsFilterPolicy, 3e5)
    }), 3e5), setTimeout((function wsFilterCheckIn() {
        sendFilterMessage({action: "heartbeat"}), wsFilterCheckInInt && clearTimeout(wsFilterCheckInInt), wsFilterCheckInInt = setTimeout(wsFilterCheckIn, 5e3)
    }), 5e3), wsFilterConnect(), module.exports.FilterOpen = function() {
        return wsFilterOpen
    }, module.exports.GetSettings = function(url) {
        const resp = {action: "settings"};
        if (!wsFilterOpen) return resp;
        const policy = Policy();
        if (resp.readOnly = false, "string" == typeof url) {
            const a = new URL(url),
                readOnly = policy.content_filter.read_only;
            policy.matchers.social.some(matcher => {
                const r = new RegExp(matcher.hostname);
                a.hostname.match(r) && readOnly.includes(matcher.catId) && (resp.readOnly = true)
            })
        }
        return Flags.GetFlagIngored(url) || "intent" === Flags.GetFlagMode(url) || (resp.flag_scan = true), resp.ytSettings = {
            hide_comments: policy.youtube.hide_comments,
            hide_sidebar: policy.youtube.hide_sidebar,
            disable_chan_autoplay: policy.youtube.prevent_channel_autoplay,
            block_thumbnails: policy.youtube.hide_thumbnails
        }, resp
    }, module.exports.IsYoutube = IsYoutube, module.exports.Overridable = function(details) {
        if (new URL(details.url), overrideUntil > Date.now()) {
            const c = cache[details.url];
            if (c && Policy().content_filter.overrides.includes(c.category_id)) return d("[overridable] -> ", c), "main_frame" === details.type && "blocked" === c.allow && "cat" === c.reason && (c.allow = "allowed", c.reason = "override", Report(c)), true
        }
        return false;
    }, module.exports.Policy = Policy, module.exports.Report = Report, module.exports.ReportFlags = function(data) {
        data.at_epoch_ms = Date.now().toString(), sendFilterMessage({
            action: "reportFlags",
            data
        })
    }, module.exports.ReportTime = function(data) {
        data.at_epoch_ms = Date.now().toString()
    }, module.exports.Score = function(details) {
        let url;
        const n = Date.now(),
            u = new URL(details.url),
            h = u.host;
        url = IsYoutube(h) || function(hostname) {
            const policy = Policy();
            if (!policy.matchers.search) return false;;
            const matchers = policy.matchers.search,
                l = matchers.length;
            for (let i = 0; i < l; i++)
                if (hostname.match(matchers[i].hostname)) {
                    if (notModMatchers = matchers[i].notModifyHost, notModMatchers) {
                        const ll = notModMatchers.length;
                        for (let ii = 0; ii < ll; ii++)
                            if (hostname.match(notModMatchers[ii])) return false;
                    }
                    return true
                } return false;
        }(h) ? details.url : u.href.replace(u.search, "");
        let c = cache[url];
        return c ? c && !c.hold && (d("[score] score complete -> ", c), lockoutUntil > n ? (c.allow = "blocked", c.reason = "lockout", c.redirect = `${policy.content_filter.block_url}?id=lockout&h=${h}`) : "lockout" === c.reason && (c.hold = true, delete cache[url])) : (c = {
            action: "score",
            at: n,
            host: h,
            hold: true,
            url
        }, cache[url] = c, d("[score] host request -> ", c), sendFilterMessage(c)), c
    }
}]