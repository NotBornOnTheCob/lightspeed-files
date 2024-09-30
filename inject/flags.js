class Flags {
constructor(url, terms) {
this.url = url;
this.matched = {};
this.terms = [];
terms.forEach((term) => {
let s = term.replace(/[\]{}?^$().*\\+|[]/g, '\\$&');
s = s.replace(/\\\*/g, '.*');
s = s.replace(/\\\?/g, '.');
let regex = new RegExp('\\b' + s + '\\b', 'gi');
this.terms.push({term: term, regex: regex});
});
}
report(flags) {
        console.debug('[LS Filter] flag report');
if (!flags.length)
            return;
const xhr = new XMLHttpRequest();
xhr.open('POST', document.location.origin + '/{{.InjectPath}}/log_flag', true);
console.debug('[LS Filter] sending -> ', flags);
xhr.send(JSON.stringify({
url: this.url.href,
flags: flags,
at_epoch_ms: Date.now()
}));
}
matchTerms(input, flagAll) {
const matches = [];
this.terms.forEach((term) => {
const hits = input.match(term.regex);
if (!hits || !hits.length)
return;
let added = false;
if (typeof(this.matched[term.term]) === 'undefined')
added = true
let count = hits.length;
if (!added)
count -= this.matched[term.term];
this.matched[term.term] = hits.length;
if (added || flagAll)
matches.push([term.term, count]);
});
return matches;
}
scanIntentValue(value) {
const matches = this.matchTerms(value, true);
const changes = [];
matches.forEach((match) => {
match[2] = true; // mark as user entered
changes.push(match);
});
if (changes.length)
this.report(changes);
}
scanIntentValues(values) {
values.forEach((value) => {
this.scanIntentValue(value);
});
}
scanIntentEvent(event) {
switch (event.target.tagName.toLowerCase()) {
case 'input':
let type = event.target.type || 'text';
type = type.toLowerCase();
// Dont scan password fields
if (type === 'password')
return;
this.scanIntentValue(event.target.value);
break;
case 'textarea':
this.scanIntentValue(event.target.value);
break;
}
}
scanIntent(event) {
if (typeof(gatherIntent) === 'function') {
const intent = gatherIntent();
if (intent.length)
this.scanIntentValues(intent);
}
}
onChange(event) {
this.scanIntentEvent(event);
}
onKeyup(event) {
this.scanIntentEvent(event);
}
bindDOM() {
document.addEventListener('change', this.onChange.bind(this));
document.addEventListener('keyup', this.onKeyup.bind(this));
setInterval(() => {
this.scanIntent();
}, 1000);
}
}
const initFlagScanning = function(terms) {
if (!terms.length)
return;
console.debug('[LS Filter] init flag scanning');
const a = document.createElement('A');
a.href = window.location.href;
const flags = new Flags(a, terms);
{{if .FlagIntent}}
console.debug('[LS Filter] flagging intent');
if (typeof(initGatherIntent) === 'function')
initGatherIntent();
flags.bindDOM();

};
{{else}}
console.debug('[LS Filter] flagging page scan');
let lastContent = '';
const scanAndReport = function() {
console.debug('[LS Filter] scanAndReport');
try {
// Make sure we are up to date on our url
if (a.href !== window.location.href) {
console.debug('[LS Filter] location changed');
a.href = window.location.href;
let content = '';
if (typeof(gatherContent) === 'function') {
content = gatherContent();
} else {
content += document.body.innerText;
// Only scan text if changed
if (content === lastContent)
return;
lastContent = content;
// Match
const matches = flags.matchTerms(content, false);
if (matches.length) {
console.debug('[LS Filter] matched terms: ', matches);
flags.report(matches);
} catch (e) {
console.error(e);
setInterval(scanAndReport, 5000);
scanAndReport();
{{end}}
initFlagScanning({{.FlagTerms}});