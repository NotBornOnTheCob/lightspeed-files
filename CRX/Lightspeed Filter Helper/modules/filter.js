[function(require, module, exports) {
    const d = require("debug")("filter"),
        Remote = require("./remote");

    function allowedLists(url) {
        const allowed = Remote.Policy().allowed;
        return !!(allowed.protocols.includes(url.protocol) || allowed.urls.includes(url.href.replace(url.search, "")) || allowed.hosts.includes(url.hostname.split(":")[0]))
    }

    function allowedInternal(h) {
        return !h || !(!h.match(/^(\d{1,3}\.){3}(\d{1,3})$/) || !(h.match(/^127\./) || h.match(/^10\./) || h.match(/^172\.((1[6-9])|(2[0-9])|(3(0|1)))\./) || h.match(/^192\.168\./) || h.match(/^169\.254\./)))
    }

    function IsAllowed(details) {
        try {
            const url = new URL(details.url);
            if (!Remote.FilterOpen() || !navigator.onLine || function(details) {
                    return !(!details.initiator || !(details.initiator.match(chrome.runtime.id) || details.url.match(/docs\.google\.com/) && details.initiator.match(/docs\.google\.com/) || details.url.match(/youtube\.com/) && details.initiator.match(/youtube\.com/)))
                }(details) || allowedInternal(url.hostname) || allowedLists(url) || Remote.Overridable(details) || Remote.IsYoutube(url.hostname) && ["stylesheet", "script", "xmlhttprequest"].includes(details.type) || "xmlhttprequest" === details.type && url.hostname.match(/^(([^\.])+\.)?googlevideo\.com$/)) return true
        } catch (err) {
            d("[IsAllowed] error ->", err)
        }
        return false;
    }
    let redirectCount = {};
    setInterval((function() {
        redirectCount = {}
    }), 3e5);
    let lastTabUrl = {};
    module.exports.BeforeRequest = function(details) {
        if (!IsAllowed(details))
            if ("GET" === details.method) Remote.Score(details);
            else {
                const url = new URL(details.url),
                    matchedSite = function(hostname) {
                        const read_only = Remote.Policy().content_filter.read_only;
                        let matchedSite;
                        return matchFound = Remote.Policy().matchers.social.some(matcher => {
                            const r = new RegExp(matcher.hostname);
                            hostname.match(r) && read_only.includes(matcher.catId) && (matchedSite = matcher)
                        }), matchedSite;
                    }(url.hostname);
                if (matchedSite) {
                    if (!matchedSite.ignorePaths.some(matcher => {
                            const r = new RegExp(matcher);
                            return url.pathname.match(r)
                        })) return d(`[preScan] canceling ${matchedSite.site} request`), {
                        cancel: true
                    }
                }
            } return {}
    }, module.exports.BeforeSendHeaders = function(details) {
        if (IsAllowed(details)) return {};
        const url = new URL(details.url),
            policy = Remote.Policy();
        let header;
        return -1 !== policy.matchers.yt_restricted.indexOf(url.hostname.toLowerCase()) && "string" == typeof policy.youtube.restricted_mode && (header = {
            name: "YouTube-Restrict",
            value: policy.youtube.restricted_mode
        }, d("[YouTube] Restricted mode enabled, adding to the headers: ", header), details.requestHeaders.push(header)), policy.content_filter.google_filter_domains && details.url.match(/[^:]+:\/\/([^\.]+\.)?google\.com/i) && "string" == typeof policy.content_filter.google_domains_list && (header = {
            name: "X-GoogApps-Allowed-Domains",
            value: policy.content_filter.google_domains_list
        }, d("[GSuite] X-GoogApps-Allowed-Domains mode enabled, adding to the headers: ", header), details.requestHeaders.push(header)), url.hostname.match(/i\.ytimg\.com$/i) && details.requestHeaders.push({
            name: "Cache-Control",
            value: "no-cache"
        }), {
            requestHeaders: details.requestHeaders
        }
    }, module.exports.HeadersReceived = function(details) {
        if (IsAllowed(details)) return {};
        const u = new URL(details.url),
            score = Remote.Score(details);
        if (d("[score]", details.url, "\n  Score ->", score), true === score.hold) {
            if ("xmlhttprequest" === details.type && (u.hostname.match(/^(([^\.])+\.)?classlink\.com$/) || u.hostname.match(/^(([^\.])+\.)?google\.com$/))) return {};
            const holdRedirect = function(details, hostname) {
                redirectCount[details.tabId] || (redirectCount[details.tabId] = {}), redirectCount[details.tabId][details.url] || (redirectCount[details.tabId][details.url] = 0), redirectCount[details.tabId][details.url] += 1;
                const startStall = Date.now(),
                    duration = 10 * (redirectCount[details.tabId][details.url] + 2);
                for (; Date.now() - startStall < duration;);
                return redirectCount[details.tabId][details.url] > 20 ? Remote.Policy().content_filter.bypass_on_failure ? void 0 : "https://localhost:6543/error?h=" + hostname : details.url
            }(details, u.hostname);
            if (void 0 !== holdRedirect) return {
                redirectUrl: holdRedirect
            }
        } else if (score.redirect && "" !== score.redirect && "override" !== score.reason) {
            if ("xmlhttprequest" === details.type && u.hostname.match(/^(([^\.])+\.)?googlevideo\.com$/)) return {};
            const rURL = new URL(score.redirect);
            return "blocked" === score.allow && (score.type = details.type, d("[score] reporting block ->", score.url), Remote.Report(score)), "main_frame" === details.type || "sub_frame" === details.type || rURL.hostname === u.hostname ? (d("[score] redirecting tab ->", details.tabId, " to ->", score.redirect), {
                redirectUrl: score.redirect
            }) : "image" === details.type || u.hostname.match(/ytimg\.com$/i) ? {
                redirectUrl: chrome.extension.getURL("blocked-image-search.png")
            } : (d("[score] canceling request ->", details.url), {
                cancel: true
            })
        }
        return {}
    }, module.exports.IsAllowed = IsAllowed, module.exports.ScanTabs = function() {
        chrome.tabs.query({
            currentWindow: true,
            active: true
        }, tabs => {
            const tabInfo = tabs[0];
            if (!tabInfo || void 0 === tabInfo.url || "" === tabInfo.url) return;
            const details = {
                    url: tabInfo.url,
                    tabId: tabInfo.id,
                    type: "main_frame"
                },
                url = new URL(details.url);
            if (allowedLists(url)) return;
            if (allowedInternal(url.hostname)) return;
            let score = Remote.Score(details);
            if ("cat" !== score.reason && "blocked" === score.allow) score.type = details.type, Remote.Report(score), chrome.tabs.update(tabInfo.id, {
                url: score.redirect
            });
            else if (IsAllowed(details)) return;
            score && !score.hold && (lastTabUrl[tabInfo.id] !== tabInfo.url && (score.type = details.type, Remote.Report(score), lastTabUrl[tabInfo.id] = tabInfo.url), score.redirect ? (d("[tab] redirecting tab ->", tabInfo.id, " to ->", score.redirect), chrome.tabs.update(tabInfo.id, {
                url: score.redirect
            })) : Remote.ReportTime(score))
        })
    }
}]
