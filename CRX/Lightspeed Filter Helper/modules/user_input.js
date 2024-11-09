[function(require, module, exports) {
    (function(process) {
        (function() {
            const supportedDOMEvents = ["change", "keyup"],
                FB = require("./modules/facebook"),
                Twitter = require("./modules/twitter"),
                Gmail = require("./modules/gmail"),
                YouTube = require("./modules/youtube"),
                TikTok = require("./modules/tiktok"),
                Tumblr = require("./modules/tumblr"),
                Sheets = require("./modules/sheets");
            class UserInput {
                constructor(urlObject) {
                    if (void 0 === urlObject) throw new Error("url object required");
                    this.UrlObject = urlObject, this.lastBodyText = "", this.modules = [];
                    const fbModule = new FB(urlObject);
                    fbModule.disabled || this.modules.push(fbModule);
                    const twitterModule = new Twitter(urlObject);
                    twitterModule.disabled || this.modules.push(twitterModule);
                    const gmailModule = new Gmail(urlObject);
                    gmailModule.disabled || this.modules.push(gmailModule);
                    const ytModule = new YouTube(urlObject);
                    ytModule.disabled || this.modules.push(ytModule);
                    const tiktokModule = new TikTok(urlObject);
                    tiktokModule.disabled || this.modules.push(tiktokModule);
                    const tumblrModule = new Tumblr(urlObject);
                    tumblrModule.disabled || this.modules.push(tumblrModule);
                    const sheetsModule = new Sheets(urlObject);
                    sheetsModule.disabled || this.modules.push(sheetsModule), this.BindToDOM()
                }
                DOMExtractAndScan(event) {
                    if (void 0 === event.target) throw new Error("event has no target");
                    let values, scanType;
                    switch (event.type) {
                        case "scan":
                            scanType = "GatherIntent";
                            break;
                        default:
                            scanType = event.target.tagName.toLowerCase()
                    }
                    switch (scanType) {
                        case "input":
                            let type = event.target.type || "text";
                            if (type = type.toLowerCase(), "password" === type) break;
                            values = [event.target.value];
                            break;
                        case "textarea":
                            values = [event.target.value];
                            break;
                        case "div":
                            if (event.target.attributes && event.target.attributes.role && "textbox" === event.target.attributes.role.value) {
                                values = [event.target.innerText];
                                break
                            }
                        default:
                            values = [], this.modules.forEach(module => {
                                if ("function" == typeof module.GatherIntent) {
                                    const intent = module.GatherIntent();
                                    "string" == typeof intent ? values.push(intent) : Array.isArray(intent) && (values = values.concat(intent))
                                }
                            })
                    }
                    void 0 !== values && values.forEach(value => {
                        let target;
                        target = void 0 !== event.target && event.target ? event.target : document, "" === value ? target.RelayFlaggedTerms = {} : (void 0 === target.RelayFlaggedTerms && (target.RelayFlaggedTerms = {}), void 0 === target.RelayFlaggedTerms[value] && (chrome.runtime.sendMessage({
                            action: "eval",
                            text: value
                        }), target.RelayFlaggedTerms[value] = !0))
                    })
                }
                HandleDOM_change(event) {
                    if (void 0 === event) throw new Error("event required");
                    if ("change" !== event.type) throw new Error("event must be a change event");
                    if (void 0 === event.target) throw new Error("event has no target");
                    void 0 !== event.target.tagName && this.DOMExtractAndScan(event)
                }
                HandleDOM_keyup(event) {
                    if (void 0 === event) throw new Error("event required");
                    if ("keyup" !== event.type) throw new Error("event must be a keyup event");
                    if (void 0 === event.target) throw new Error("event has no target");
                    void 0 !== event.target.tagName && this.DOMExtractAndScan(event)
                }
                HandleDOM(event) {
                    if (void 0 === event) throw new Error("event required");
                    if (-1 === supportedDOMEvents.indexOf(event.type)) throw new Error("unsupported event type - " + event.type);
                    "function" == typeof this["HandleDOM_" + event.type] && this["HandleDOM_" + event.type](event)
                }
                BindToDOM() {
                    document.addEventListener("change", this.HandleDOM.bind(this)), document.addEventListener("keyup", this.HandleDOM.bind(this)), setInterval(() => {
                        this.DOMExtractAndScan(new Event("scan"))
                    }, 1e3)
                }
            }
            let lastText;
            const pageScanInt = process.env.PAGE_SCAN_INT || 1e3;

            function PageScan(a) {
                ! function() {
                    if (window.location.hostname.match(/google(\.\w{2,5}){1,2}$/i) && window.location.search && "" !== window.location.search) {
                        let term = window.location.search.replace(/^\?/, "").match(/q=([^&]+)(&|$)/i);
                        term && term[1] && (term = term[1], term = decodeURIComponent(term.replace(/\+/g, " ")), chrome.runtime.sendMessage({
                            action: "eval",
                            text: term
                        }))
                    }
                }(), setInterval(() => {
                    let docContainers;
                    if (a.href.match(/(^|\.)officeapps\.live\.com$/) ? docContainers = document.getElementsByClassName("PageContentContainer") : a.href.match(/docs\.google\.com\/document/) ? docContainers = document.getElementsByClassName("kix-appview-editor-container") : a.href.match(/docs\.google\.com\/presentation/) && (docContainers = [document.getElementById("workspace-container")]), docContainers && docContainers[0]) {
                        const newText = docContainers[0].innerText;
                        newText !== lastText && chrome.runtime.sendMessage({
                            action: "eval",
                            text: newText
                        }), lastText = newText
                    }
                }, pageScanInt)
            }
            module.exports.Init = function() {
                console.log("[InitUserInput]");
                const urlObject = new URL(window.location.href);
                PageScan(urlObject), new UserInput(urlObject)
            }, module.exports.UserInput = UserInput
        }).call(this)
    }).call(this, require("_process"))
}]
