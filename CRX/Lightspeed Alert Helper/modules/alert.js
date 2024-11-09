[
function (require, module, exports) {
  (function (process) {
    (function () {
      const d = require("debug")("alert"),
        Remote = require("./remote"),
        delayInt = process.env.SEND_DELAY || 15e3,
        wordMin = process.env.WORD_MIN || 1,
        wordMax = process.env.WORD_MAX || 500;
      async function getHistory() {
        d("[getHistory]");
        const urls = [],
          clip = new Date().getTime() - 9e5;
        return (
          (
            await (function () {
              if (chrome && chrome.history)
                return new Promise((resolve, _) => {
                  chrome.history.search(
                    { text: "", maxResults: 5 },
                    resolve
                  );
                });
              return [];
            })()
          ).forEach((history) => {
            if (history.lastVisitTime > clip) {
              const data = {
                at: history.lastVisitTime,
                url: cleanUrl(history.url),
              };
              history.title &&
                ((data.title = history.title.slice(0, 100)),
                history.title.length > 100 && (data.title += "...")),
                urls.push(JSON.stringify(data));
            }
          }),
          urls
        );
      }
      async function getTabs() {
        d("[getTabs]");
        return (
          await new Promise((resolve, _) => {
            chrome.tabs.query({}, resolve);
          })
        ).map((tab) => {
          const data = { id: tab.id, url: cleanUrl(tab.url) };
          return (
            tab.title &&
              ((data.title = tab.title.slice(0, 100)),
              tab.title.length > 100 && (data.title += "...")),
            JSON.stringify(data)
          );
        });
      }
      const tabData = {};
      function sendCurrentData(tabId) {
        const td = tabData[tabId];
        td &&
          (delete tabData[tabId],
          (async function (data) {
            d("[sendData]"),
              (data.history = await getHistory()),
              (data.tabs = await getTabs()),
              (data.url = data.url),
              Remote.Alert(data);
          })(td.data));
      }
      let lastScreenshot, screenshotInt;
      async function getScreenshot() {
        if (Object.keys(tabData).length > 0) {
          const data = await new Promise((resolve, _) => {
            d("[captureVisibleTab]"),
              chrome.tabs.captureVisibleTab(
                { format: "jpeg", quality: 20 },
                resolve
              );
          });
          chrome.runtime.lastError,
            data &&
              "string" == typeof data &&
              (lastScreenshot = data.split(";base64,")[1]),
            (screenshotInt = setTimeout(getScreenshot, 550));
        } else
          d("[getScreenshot] shutting down screenshots"),
            clearTimeout(screenshotInt),
            (screenshotInt = void 0);
      }
      async function updateCurrentData(data, text) {
        tabData[data.tabId] ||
          (tabData[data.tabId] = { at: Date.now(), data: {} }),
          (data.url = cleanUrl(data.url)),
          (data.screenshot = await (async function () {
            return (
              screenshotInt ||
                (d("[screenshotData] start getting screenshots"),
                await getScreenshot()),
              lastScreenshot
            );
          })()),
          (data.text = (function (text) {
            let cText = (function (text) {
              let cleanerText = text.toLowerCase().trim();
              for (const str of cleanStringsExp)
                cleanerText = cleanerText.replace(str, "");
              return (
                (cleanerText = cleanerText.replace(/\s+/g, " ")),
                cleanerText
              );
            })(text);
            return (
              (cText = cText.replace(
                /\d{4}(\s|-)?\d{4}(\s|-)?\d{4}(\s|-)?\d{4}(\s?\d{2}?\/?\d{2})*/gi,
                (d) => "X".repeat(d.length)
              )),
              (cText = cText.replace(/\d{3}.?\d{2}.?\d{4}/gi, (d) =>
                "X".repeat(d.length)
              )),
              (cText = cText.replace(/\d{3}.?\d{3}.?\d{4}/gi, (d) =>
                "X".repeat(d.length)
              )),
              (cText = cText.replace(/\d{5,}/gi, (d) =>
                "X".repeat(d.length)
              )),
              d("[cleanText] -> ", cText),
              cText.replace(/\s+/g, " ")
            );
          })(text)),
          (data.rawText = text),
          (tabData[data.tabId].data = data),
          d("[updateCurrentData] updated text ->", text);
      }
      setInterval(function () {
        const now = Date.now();
        for (const tabId in tabData) {
          const tab = tabData[tabId];
          tab && tab.at < now - delayInt && sendCurrentData(tabId);
        }
      }, 1e3);
      const cleanStringsExp = [
        "\\n",
        "\\",
        "===",
        "==",
        "\n",
        /[.,\/#!?$%\^&\*;:{}=\-_`~()]/g,
      ];
      function cleanUrl(url) {
        return url.replace(/(\?[^#]+)(#|$)/, "$2");
      }
      module.exports.ProcessText = async function (data) {
        d("[ProcessText] -> ", data);
        const words = data.text.split(" ");
        if (words.length >= wordMin) {
          let firstWord = 0,
            lastWord = wordMax - 1,
            currText = words.slice(firstWord, lastWord).join(" ");
          for (; currText.length > 0; ) {
            const td = tabData[data.tabId];
            td &&
              !currText.startsWith(td.data.text) &&
              (d("[ProcessText] new tab text"),
              sendCurrentData(data.tabId)),
              await updateCurrentData(data, currText),
              (firstWord = lastWord - 10),
              (lastWord = firstWord + wordMax),
              (currText = words.slice(firstWord, lastWord).join(" "));
          }
        }
      };
    }).call(this);
  }).call(this, require("_process"));
}
]