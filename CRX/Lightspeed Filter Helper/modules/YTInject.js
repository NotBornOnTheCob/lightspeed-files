[function(require, module, exports) { //unconfirmed name
    const UserInput = require("./user_input");
    let killYTAutoplayInt, hideYTAvatarInt, lastBodyText;
    const urlObject = new URL(window.location.href);
    urlObject.hostname.match("(^|.)youtube.") && (window.onpopstate = function() {
        window.location.reload()
    });
    const blockYTImg = chrome.extension.getURL("blocked-image-search.png"),
        hideYTAvatars = function() {
            [...document.querySelectorAll("#avatar")].forEach(t => {
                [...t.getElementsByTagName("img")].forEach(i => {
                    i.src !== blockYTImg && (i.src = blockYTImg)
                })
            })
        },
        killYTAutoplay = function() {
            const a = document.createElement("A");
            if (a.href = window.location.href, a.hostname.match(/(^|\.)youtube\./) && (a.pathname.match(/^\/user\/[^\/\?]+$/) || a.pathname.match(/^\/channel\/[^\/\?]+$/) || a.pathname.match(/^\/c\/[^\/\?]+$/) || a.pathname.match(/\/featured$/))) {
                const v = document.getElementsByTagName("video");
                if (v.length > 0)
                    for (i in v)
                        if ("function" == typeof v[i].pause) {
                            v[i].paused || (console.debug("[LS Filter] pause autoplay"), v[i].pause());
                            const c = v[i].closest("ytd-channel-video-player-renderer");
                            c && "none" !== c.style.display && (console.debug("[LS Filter] hide autoplay container"), c.style.display = "none")
                        }
            }
        },
        killMiniPlayers = function() {
            const vc = document.getElementById("video-preview-container");
            vc && vc.remove();
            const mp = document.getElementsByTagName("ytd-miniplayer");
            mp.length > 0 && mp[0].remove(), document.querySelectorAll("div#mouseover-overlay").forEach(d => {
                d.remove()
            }), document.querySelectorAll("div#hover-overlays").forEach(d => {
                d.remove()
            })
        },
        fadeBadgeNotice = function() {
            const flashNotice = document.getElementById("read-only-flash-notice");
            let times = 0;
            const int = setInterval(() => {
                times++;
                const opacity = 100 - times;
                opacity < 1 ? (clearInterval(int), flashNotice.style.display = "none") : flashNotice.style.opacity = (opacity / 100).toString()
            }, 15);
            clearTimeout(window.readOnlyNoticeTimeout)
        },
        handleSettings = function(settings) {
            urlObject.hostname.match(/^localhost/) || UserInput.Init(), settings.flag_scan && function() {
                let scanInterval, currentText;
                void 0 !== scanInterval && clearInterval(scanInterval);
                const scan = () => {
                    currentText = document.body.innerText, currentText !== lastBodyText && (lastBodyText = currentText, chrome.runtime.sendMessage({
                        action: "flags",
                        text: currentText
                    }))
                };
                scanInterval = setInterval(scan, 5e3), scan()
            }(), urlObject.hostname.match(/(^|\.)youtube\./) && function(ytSettings) {
                if (void 0 === ytSettings) return;
                const style = document.createElement("STYLE");
                if (style.type = "text/css", style.innerText = "", ytSettings.hide_sidebar && (console.debug("[LS Helper] hide sidebar"), style.innerText += ".watch-sidebar, .ytd-watch-next-secondary-results-renderer {display: none !important;}\n"), ytSettings.hide_comments && (console.debug("[LS Helper] hide comments"), style.innerText += "#watch-discussion, .watch-discussion, ytd-comments {display: none !important;}\n"), "" !== style.innerText) {
                    let head = document.getElementsByTagName("head");
                    head && head.length > 0 && (head = head[0], head.append(style))
                }
                ytSettings.disable_chan_autoplay && (console.debug("[LS Helper] disable autoplay"), void 0 !== killYTAutoplayInt && (clearInterval(killYTAutoplayInt), killYTAutoplayInt = void 0), killYTAutoplay(), killYTAutoplayInt = setInterval(killYTAutoplay, 1e3)), ytSettings.block_thumbnails && (console.debug("[LS Helper] block thumbnails"), void 0 !== hideYTAvatarInt && (clearInterval(hideYTAvatarInt), hideYTAvatarInt = void 0), hideYTAvatars(), hideYTAvatarInt = setInterval(hideYTAvatars, 1e3)), console.debug("[LS Helper] hide miniplayers"), "undefined" != typeof killMiniPlayerInt && (clearInterval(killMiniPlayerInt), killMiniPlayerInt = void 0), killMiniPlayers(), killMiniPlayerInt = setInterval(killMiniPlayers, 1e3)
            }(settings.ytSettings), settings.readOnly && function(text) {
                if (document.documentElement && document.documentElement.clientHeight < 250) return;
                const flashNotice = document.createElement("div");
                flashNotice.id = "read-only-flash-notice", flashNotice.style.display = "block", flashNotice.style.position = "fixed", flashNotice.style.top = "16px", flashNotice.style.right = "16px", flashNotice.style.background = "#343d47", flashNotice.style.borderRadius = "4px", flashNotice.style.boxShadow = "0 2px 4px rgba(0,0,0,0.25)", flashNotice.style.color = "#ffffff", flashNotice.style.maxWidth = "400px", flashNotice.style.overflow = "hidden", flashNotice.style["z-index"] = "2147483647";
                const messageContainer = document.createElement("div");
                messageContainer.style.float = "left", messageContainer.style.padding = "16px";
                const message = document.createElement("div");
                message.innerText = text;
                const buttonContainer = document.createElement("div");
                buttonContainer.style.borderLeftStyle = "solid", buttonContainer.style.borderLeftWidth = "1px", buttonContainer.style.borderColor = "#505861", buttonContainer.style.float = "left";
                const button = document.createElement("a");
                button.style.color = "#ffffff", button.style.cursor = "pointer", button.style.display = "block", button.style.padding = "16px", button.style.textDecoration = "none", button.innerText = "Dismiss", button.addEventListener("click", fadeBadgeNotice), button.addEventListener("mouseenter", e => {
                    e.target.style.textDecoration = "underline"
                }), button.addEventListener("mouseleave", e => {
                    e.target.style.textDecoration = "none"
                }), messageContainer.appendChild(message), flashNotice.appendChild(messageContainer), buttonContainer.appendChild(button), flashNotice.appendChild(buttonContainer), document.getElementsByTagName("body")[0].appendChild(flashNotice), document.getElementById("read-only-flash-notice").style.setProperty("font-size", "16px", "important"), window.readOnlyNoticeTimeout = setTimeout(() => {
                    fadeBadgeNotice()
                }, 8e3)
            }("This website is in read only mode.")
        };
    chrome.runtime.sendMessage({
        action: "settings",
        href: window.location.href
    }, response => {
        switch (console.debug("[LightspeedHelper] message", response), response.action) {
            case "settings":
                handleSettings(response)
        }
    })
}]
