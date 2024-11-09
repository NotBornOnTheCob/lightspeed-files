[
function (require, module, exports) {
const manifest = chrome.runtime.getManifest();
require("debug").enable("*");
const d = require("debug")("main"),
    Alert = require("./alert");
chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
    let tabId;
    switch (
        (d("[in_page] message ->", message),
        sender.tab && sender.tab.id && (tabId = sender.tab.id),
        message.action)
    ) {
        case "eval":
        Alert.ProcessText({
            text: message.text,
            url: sender.url,
            tabId: sender.tab.id,
        });
        break;
        case "eval-docs":
        if (message.text) {
            const text = JSON.parse(message.text);
            console.log(text),
            Array.isArray(text) &&
                Array.isArray(text[0]) &&
                Alert.ProcessText({
                text: text[0][0],
                url: sender.url,
                tabId,
                });
        }
    }
    }
),
    console.debug(
    manifest.description,
    "version",
    manifest.version,
    "Loaded."
    );
}
]