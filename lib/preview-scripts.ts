/** Agency picker — kattintással elem kijelölése */
export function getPickerScript(): string {
  return `
(function() {
  if (window.__cmsPicker) return;
  window.__cmsPicker = true;
  var hoverEl = null;
  var style = document.createElement('style');
  style.textContent = '.cms-pick-hover{outline:2px solid #6366f1!important;outline-offset:2px;cursor:crosshair!important}.cms-pick-selected{outline:3px solid #10b981!important}';
  document.head.appendChild(style);
  var allowed = new Set(['H1','H2','H3','H4','H5','H6','P','SPAN','A','BUTTON','IMG','LI','TD','TH','LABEL','STRONG','EM']);
  function pathIndices(el) {
    var path = [];
    var cur = el;
    while (cur && cur !== document.body && cur.parentElement) {
      var parent = cur.parentElement;
      var idx = Array.prototype.indexOf.call(parent.children, cur) + 1;
      path.unshift(idx);
      cur = parent;
      if (cur.tagName === 'BODY') break;
    }
    return path;
  }
  function onOver(e) {
    var t = e.target;
    if (!t || !t.tagName || !allowed.has(t.tagName)) return;
    if (hoverEl && hoverEl !== t) hoverEl.classList.remove('cms-pick-hover');
    hoverEl = t;
    t.classList.add('cms-pick-hover');
  }
  function onOut(e) {
    var t = e.target;
    if (t) t.classList.remove('cms-pick-hover');
  }
  function onClick(e) {
    var t = e.target;
    if (!t || !t.tagName || !allowed.has(t.tagName)) return;
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('.cms-pick-selected').forEach(function(x){x.classList.remove('cms-pick-selected');});
    t.classList.add('cms-pick-selected');
    var payload = {
      type: 'cms-pick',
      tagName: t.tagName,
      childPath: pathIndices(t),
      text: (t.innerText || '').slice(0, 200),
      src: t.getAttribute('src') || '',
      dataCms: t.getAttribute('data-cms') || ''
    };
    window.parent.postMessage(payload, '*');
  }
  document.addEventListener('mouseover', onOver, true);
  document.addEventListener('mouseout', onOut, true);
  document.addEventListener('click', onClick, true);
})();
`;
}

/** Ügyfél edit — data-cms elemek + live update + scroll */
export function getEditScript(fieldKeysJson: string): string {
  return `
(function() {
  if (window.__cmsEdit) return;
  window.__cmsEdit = true;
  var keys = ${fieldKeysJson};
  var tooltip = null;
  var style = document.createElement('style');
  style.textContent = '[data-cms]{cursor:pointer!important;transition:outline .15s;position:relative}[data-cms]:hover{outline:2px dashed #6366f1!important;outline-offset:2px}.cms-editing{outline:3px solid #10b981!important}.cms-edit-tooltip{position:fixed;z-index:99999;background:#1e1e2e;color:#fff;font-size:12px;padding:4px 10px;border-radius:6px;pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.3)}';
  document.head.appendChild(style);

  function showTooltip(el, text) {
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'cms-edit-tooltip';
      document.body.appendChild(tooltip);
    }
    tooltip.textContent = text || 'Kattints a szerkesztéshez';
    var r = el.getBoundingClientRect();
    tooltip.style.left = Math.max(8, r.left) + 'px';
    tooltip.style.top = Math.max(8, r.top - 28) + 'px';
    tooltip.style.display = 'block';
  }
  function hideTooltip() {
    if (tooltip) tooltip.style.display = 'none';
  }

  function applyValueToEl(el, value, fieldType) {
    var attrSpec = el.getAttribute('data-cms-attr');
    var isImg = fieldType === 'image' || el.tagName === 'IMG' || (attrSpec && attrSpec.indexOf('src:') === 0);
    if (isImg) {
      var src = value;
      if (src && src.indexOf('http') !== 0 && src.indexOf('/') !== 0) {
        src = '/api/sites/' + (window.__cmsSiteId || '') + '/preview-asset?path=' + encodeURIComponent(src);
      }
      el.setAttribute('src', src || '');
      return;
    }
    if (fieldType === 'richtext' && value && value.indexOf('<') >= 0) {
      el.innerHTML = value;
    } else if (fieldType === 'richtext') {
      el.innerHTML = (value || '').replace(/\\n/g, '<br>');
    } else {
      el.textContent = value || '';
    }
  }

  function findByKey(key) {
    return document.querySelector('[data-cms="' + key + '"]');
  }

  function onClick(e) {
    var t = e.target.closest('[data-cms]');
    if (!t) return;
    e.preventDefault();
    e.stopPropagation();
    hideTooltip();
    document.querySelectorAll('.cms-editing').forEach(function(x){x.classList.remove('cms-editing');});
    t.classList.add('cms-editing');
    var key = t.getAttribute('data-cms');
    var attrSpec = t.getAttribute('data-cms-attr');
    var isImg = t.tagName === 'IMG' || (attrSpec && attrSpec.indexOf('src:') === 0);
    window.parent.postMessage({
      type: 'cms-edit',
      dataCmsKey: key,
      currentValue: isImg ? (t.getAttribute('src') || '') : (t.innerText || t.textContent || '').trim(),
      fieldType: isImg ? 'image' : 'text',
      innerHtml: t.innerHTML
    }, '*');
  }

  function onOver(e) {
    var t = e.target.closest('[data-cms]');
    if (t) showTooltip(t, 'Kattints a szerkesztéshez');
    else hideTooltip();
  }
  function onOut() { hideTooltip(); }

  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'cms-update-field') {
      var el = findByKey(e.data.dataCmsKey);
      if (el) applyValueToEl(el, e.data.value, e.data.fieldType || 'text');
    }
    if (e.data.type === 'cms-scroll-to') {
      var target = findByKey(e.data.dataCmsKey);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.querySelectorAll('.cms-editing').forEach(function(x){x.classList.remove('cms-editing');});
        target.classList.add('cms-editing');
        setTimeout(function(){ target.classList.remove('cms-editing'); }, 2000);
      }
    }
    if (e.data.type === 'cms-set-site-id') {
      window.__cmsSiteId = e.data.siteId;
    }
  });

  document.addEventListener('click', onClick, true);
  document.addEventListener('mouseover', onOver, true);
  document.addEventListener('mouseout', onOut, true);
})();
`;
}
