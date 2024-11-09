[function(require, module, exports) {
    const manifest = chrome.runtime.getManifest();
    require("debug").enable("*");
    const d = require("debug")("main"),
        Filter = require("./filter"),
        Remote = require("./remote"),
        Flags = require("./flags");
    chrome.webRequest.onBeforeRequest.addListener(details => Filter.BeforeRequest(details), {
        types: ["main_frame", "sub_frame", "script", "image", "object", "xmlhttprequest", "other", "websocket"],
        urls: ["<all_urls>"]
    }, ["blocking"]), chrome.webRequest.onBeforeSendHeaders.addListener(details => Filter.BeforeSendHeaders(details), {
        urls: ["<all_urls>"]
    }, ["blocking", "requestHeaders"]), chrome.webRequest.onHeadersReceived.addListener(details => Filter.HeadersReceived(details), {
        types: ["main_frame", "sub_frame", "script", "image", "object", "xmlhttprequest", "other", "websocket"],
        urls: ["<all_urls>"]
    }, ["blocking"]), setInterval((function() {
        Filter.ScanTabs()
    }), 1e3), chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        let tabId;
        switch (d("[in_page] message ->", message), sender.tab && sender.tab.id && (tabId = sender.tab.id), message.action) {
            case "eval":
                Flags.GetFlagIngored(sender.url) || "page" === Flags.GetFlagMode(sender.url) || Flags.ProcessText({
                    text: message.text,
                    url: sender.url,
                    type: "intent"
                });
                break;
            case "flags":
                Remote.FilterOpen() && Flags.ProcessText({
                    text: message.text,
                    url: sender.url,
                    type: "scan"
                });
                break;
            case "settings":
                sendResponse(Remote.GetSettings(message.href))
        }
    }), console.debug("Lightspeed", manifest.description, "version", manifest.version, "Loaded.")
}]
