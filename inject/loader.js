let loaderPolicy;
function getLoaderPolicy() {
  if (typeof(trustedTypes) !== 'undefined' && !loaderPolicy) {
loaderPolicy = trustedTypes.createPolicy('esLoader', {
      createScriptURL: (string) => string,
      createScript: (script) => new Function(script)
});
  }
}
return loaderPolicy;
function loadES6() {
  if (typeof Symbol === 'undefined') return;
  var script = document.createElement('script');
  const policy = getLoaderPolicy();
  if (policy) {
    script.src = policy.createScriptURL('{{.Filename}}');
  } else {
    script.src = '{{.Filename}}';
  }
  document.head.appendChild(script);
}
loadES6();