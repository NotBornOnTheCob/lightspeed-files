[
function (require, module, exports) {
const d = require("debug")("remote");
let wsAlert,
    wsAlertCheckInt,
    wsAlertProto = "wss";
function onAlertOpen() {
    d("[onOpen] alert agent connection open");
}
function onAlertError() {
    wsAlertProto = "wss" == wsAlertProto ? "ws" : "wss";
}
function wsAlertConnect() {
    (wsAlert &&
    wsAlert.readyState !== WebSocket.CLOSED &&
    wsAlert.readyState !== WebSocket.CLOSING) ||
    ((wsAlert = void 0),
    (wsAlert = new WebSocket(
        wsAlertProto + "://localhost:6541/websocket"
    )),
    (wsAlert.onopen = onAlertOpen),
    (wsAlert.onerror = onAlertError)),
    wsAlertCheckInt && clearTimeout(wsAlertCheckInt),
    (wsAlertCheckInt = setTimeout(wsAlertConnect, 5e3));
}
wsAlertConnect(),
    (module.exports.Alert = function (data) {
    (data.action = "alert"),
        (function (data) {
        if (wsAlert && wsAlert.readyState === WebSocket.OPEN)
            try {
            d("[sendAlertMessage] to alert agent -> ", data),
                wsAlert.send(JSON.stringify(data));
            } catch (err) {
            console.log(err);
            }
        else wsAlertConnect();
        })(data);
    });
}
]