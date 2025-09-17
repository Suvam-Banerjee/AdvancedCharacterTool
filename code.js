/* code.js - robust, lint-cleaned version with safe initialization */

(function () {
  'use strict';

  // Helper to show top banner for errors
  function showErrorBanner(message) {
    try {
      var el = document.getElementById('errorBanner');
      if (!el) return;
      el.textContent = message;
      el.classList.remove('hidden');
    } catch (e) {
      console.error('Failed to show error banner', e);
    }
  }

  // Wrap all initialization in DOMContentLoaded and try/catch to avoid silent failure
  document.addEventListener('DOMContentLoaded', function () {
    try {
      // DOM references
      var modes = document.querySelectorAll('.mode');
      var optionsArea = document.getElementById('optionsArea');
      var mainText = document.getElementById('mainText');
      var lenEl = document.getElementById('len');
      var copyBtn = document.getElementById('copyBtn');
      var clearBtn = document.getElementById('clearBtn');
      var applyBtn = document.getElementById('applyBtn');
      var errorBox = document.getElementById('errorBox');
      var modal = document.getElementById('modal');
      var modalTitle = document.getElementById('modalTitle');
      var modalForm = document.getElementById('modalForm');
      var modalApply = document.getElementById('modalApply');
      var modalCancel = document.getElementById('modalCancel');
      var segBtns = modal ? modal.querySelectorAll('.seg-btn') : [];
      var typesField = document.getElementById('typesField');
      var closeModal = document.getElementById('closeModal');
      var overlay = document.getElementById('overlay');
      var overlayTitle = document.getElementById('overlayTitle');
      var overlayMsg = document.getElementById('overlayMsg');
      var overlayWarn = document.getElementById('overlayWarn');
      var overlayClear = document.getElementById('overlayClear');
      var overlayContinue = document.getElementById('overlayContinue');
      var overlayOK = document.getElementById('overlayOK');

      // Basic validation of DOM
      if (!optionsArea || !mainText || !lenEl || !applyBtn) {
        showErrorBanner('Required DOM elements missing. The app cannot initialize.');
        return;
      }

      // State
      var currentMode = 'generate';
      var modalCallback = null;
      var modalBehavior = 'multiple'; // 'multiple' or 'single'
      var genSelectedTypes = [];
      var removeSelectedTypes = [];
      var replaceFromTypes = [];
      var replaceToTypes = [];

      // Character sets
      var CHARSETS = {
        upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        lower: "abcdefghijklmnopqrstuvwxyz",
        digits: "0123456789",
        special: "!@#$%^&*()_+-=[]{}|;:',.<>/?`~",
        space: " "
      };

      // Utilities
      function safeText(v) { return v == null ? '' : String(v); }

      function updateCharCount() {
        lenEl.textContent = safeText(mainText.value.length);
      }

      // Clipboard fallback: copy text to clipboard or use execCommand fallback
      function copyToClipboard(text) {
        if (!text) return Promise.resolve();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
          try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (ok) resolve(); else reject(new Error('execCommand failed'));
          } catch (e) {
            reject(e);
          }
        });
      }

      // Notifications
      function showTempMessage(msg, type) {
        var prev = document.createElement('div');
        prev.textContent = msg;
        prev.style.position = 'fixed';
        prev.style.right = '18px';
        prev.style.bottom = '18px';
        prev.style.padding = '10px 12px';
        prev.style.borderRadius = '10px';
        prev.style.zIndex = '999';
        prev.style.background = (type === 'error') ? 'rgba(255,50,50,0.12)' : 'rgba(100,200,150,0.12)';
        document.body.appendChild(prev);
        setTimeout(function () { prev.remove(); }, 3500);
      }

      function showError(msg) {
  if (!errorBox) return;
  errorBox.textContent = msg;
  errorBox.className = 'error';
    // Auto-clear after 5 seconds
  setTimeout(function () {
    if (errorBox.className === 'info') {
      errorBox.textContent = '';
      errorBox.className = '';
    }
  }, 5000);
}

function showInfo(msg) {
  if (!errorBox) return;
  errorBox.textContent = msg;
  errorBox.className = 'info';

  // Auto-clear after 5 seconds
  setTimeout(function () {
    if (errorBox.className === 'info') {
      errorBox.textContent = '';
      errorBox.className = '';
    }
  }, 5000);
}


      // Event bindings
      mainText.addEventListener('input', updateCharCount);

      if (copyBtn) {
        copyBtn.addEventListener('click', function () {
          copyToClipboard(mainText.value).then(function () {
            showTempMessage('Copied to clipboard', 'success');
          }).catch(function (err) {
            showTempMessage('Copy failed', 'error');
            console.error(err && err.message ? err.message : err);
          });
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', function () {
          mainText.value = '';
          updateCharCount();
        });
      }

      // Mode switching
      function setActiveMode(modeBtn) {
        Array.prototype.forEach.call(modes, function (b) { b.classList.remove('active'); });
        if (modeBtn) modeBtn.classList.add('active');
        currentMode = modeBtn ? modeBtn.dataset.mode : currentMode;
        renderOptions();
        if (errorBox) errorBox.textContent = '';
      }

      Array.prototype.forEach.call(modes, function (btn) {
        btn.addEventListener('click', function () { setActiveMode(btn); });
      });

      // Render dynamic option UIs
      function renderOptions() {
        try {
          optionsArea.innerHTML = '';
          if (currentMode === 'generate') {
            optionsArea.appendChild(renderGenerateOptions());
          } else if (currentMode === 'remove') {
            optionsArea.appendChild(renderRemoveOptions());
          } else if (currentMode === 'replace') {
            optionsArea.appendChild(renderReplaceOptions());
          }
        } catch (e) {
          console.error('renderOptions failed', e);
          showErrorBanner('renderOptions failed: ' + (e && e.message ? e.message : e));
        }
      }

      // GENERATE
      function renderGenerateOptions() {
        var wrap = document.createElement('div');
        wrap.className = 'gen-wrap';

        var row = document.createElement('div');
        row.className = 'row';

        var pickBtn = document.createElement('button');
        pickBtn.className = 'btn';
        pickBtn.type = 'button';
        pickBtn.textContent = 'Select Character Types';
        pickBtn.addEventListener('click', function () {
          openModal('Select types to generate', function (types) {
            genSelectedTypes = types || [];
            pickBtn.textContent = genSelectedTypes.length ? 'Types: ' + genSelectedTypes.join(', ') : 'Select Character Types';
            pickBtn.dataset.types = JSON.stringify(genSelectedTypes || []);
          });
        });
        row.appendChild(pickBtn);

        var countInput = document.createElement('input');
        countInput.type = 'number';
        countInput.min = '0';
        countInput.placeholder = 'Count';
        countInput.className = 'input small';

        var fullInput = document.createElement('input');
        fullInput.type = 'number';
        fullInput.min = '0';
        fullInput.placeholder = 'Full Length';
        fullInput.className = 'input small';

        row.appendChild(countInput);
        row.appendChild(fullInput);
        wrap.appendChild(row);

        var tip = document.createElement('div');
        tip.className = 'row';
        tip.style.marginTop = '8px';
        tip.innerHTML = '<div style="color:var(--muted);font-size:13px">If textarea not empty, you will be prompted to Clear or Continue.</div>';
        wrap.appendChild(tip);

        wrap.getValues = function () {
          var types = genSelectedTypes || [];
          var count = countInput.value ? parseInt(countInput.value, 10) : null;
          var full = fullInput.value ? parseInt(fullInput.value, 10) : null;
          return { types: types, count: count, full: full };
        };

        return wrap;
      }

      // REMOVE
      function renderRemoveOptions() {
        var wrap = document.createElement('div');
        wrap.className = 'remove-wrap';

        var toggleRow = document.createElement('div');
        toggleRow.className = 'sub-toggle';
        var selBtn = document.createElement('button'); selBtn.className = 'btn small active'; selBtn.type = 'button'; selBtn.textContent = 'Selection Mode';
        var customBtn = document.createElement('button'); customBtn.className = 'btn small'; customBtn.type = 'button'; customBtn.textContent = 'Custom Mode';
        toggleRow.appendChild(selBtn); toggleRow.appendChild(customBtn);
        wrap.appendChild(toggleRow);

        var content = document.createElement('div'); content.className = 'remove-content'; content.style.marginTop = '8px';
        wrap.appendChild(content);

        function showSelection() {
          content.innerHTML = '';
          var row = document.createElement('div'); row.className = 'row';
          var pickBtn = document.createElement('button'); pickBtn.className = 'btn'; pickBtn.type = 'button'; pickBtn.textContent = 'Select Types to Remove';
          pickBtn.addEventListener('click', function () {
            openModal('Select character types to remove', function (types) {
              removeSelectedTypes = types || [];
              pickBtn.textContent = removeSelectedTypes.length ? 'Remove: ' + removeSelectedTypes.join(', ') : 'Select Types to Remove';
              pickBtn.dataset.types = JSON.stringify(removeSelectedTypes || []);
            });
          });
          row.appendChild(pickBtn);
          content.appendChild(row);

          content.getValues = function () {
            var types = removeSelectedTypes || [];
            var custom = '';
            return { mode: 'selection', types: types, custom: custom };
          };
        }

        function showCustom() {
          content.innerHTML = '';
          var row = document.createElement('div'); row.className = 'row';
          var orLabel = document.createElement('div'); orLabel.textContent = 'Enter custom characters to remove';
          orLabel.style.color = 'var(--muted)'; orLabel.style.paddingLeft = '8px';
          row.appendChild(orLabel);
          var customBox = document.createElement('input'); customBox.type = 'text'; customBox.placeholder = 'Characters to remove (e.g. @#$)'; customBox.className = 'input';
          content.appendChild(customBox);

          content.getValues = function () {
            var types = [];
            var custom = customBox.value || '';
            return { mode: 'custom', types: types, custom: custom };
          };
        }

        selBtn.addEventListener('click', function () {
          selBtn.classList.add('active'); customBtn.classList.remove('active'); showSelection();
        });
        customBtn.addEventListener('click', function () {
          customBtn.classList.add('active'); selBtn.classList.remove('active'); showCustom();
        });

        // initial
        showSelection();

        wrap.getValues = function () { return content.getValues ? content.getValues() : {}; };

        return wrap;
      }

      // REPLACE
      function renderReplaceOptions() {
        var wrap = document.createElement('div');
        wrap.className = 'replace-wrap';

        var tabRow = document.createElement('div'); tabRow.className = 'sub-toggle';
        var selBtn = document.createElement('button'); selBtn.className = 'btn small active'; selBtn.type = 'button'; selBtn.textContent = 'Selection Mode';
        var customBtn = document.createElement('button'); customBtn.className = 'btn small'; customBtn.type = 'button'; customBtn.textContent = 'Custom Mode';
        tabRow.appendChild(selBtn); tabRow.appendChild(customBtn);
        wrap.appendChild(tabRow);

        var content = document.createElement('div'); content.className = 'replace-content'; content.style.marginTop = '10px';
        wrap.appendChild(content);

        function showSelection() {
          content.innerHTML = '';
          var row = document.createElement('div'); row.className = 'row';
          var fromBtn = document.createElement('button'); fromBtn.className = 'btn'; fromBtn.type = 'button'; fromBtn.textContent = 'Replace From (select types)';
          fromBtn.addEventListener('click', function () {
            openModal('Select types to replace (FROM)', function (types) {
              replaceFromTypes = types || [];
              fromBtn.textContent = 'From: ' + (replaceFromTypes.length ? replaceFromTypes.join(', ') : 'none');
            });
          });
          var toBtn = document.createElement('button'); toBtn.className = 'btn'; toBtn.type = 'button'; toBtn.textContent = 'Replace With (select types)';
          toBtn.addEventListener('click', function () {
            openModal('Select types to replace with (TO)', function (types) {
              replaceToTypes = types || [];
              toBtn.textContent = 'To: ' + (replaceToTypes.length ? replaceToTypes.join(', ') : 'none');
            });
          });
          row.appendChild(fromBtn); row.appendChild(toBtn);
          content.appendChild(row);

          content.getValues = function () { return { mode: 'selection', from: replaceFromTypes || [], to: replaceToTypes || [] }; };
        }

        function showCustom() {
          content.innerHTML = '';
          // Side-by-side headers and pairs below them
          var grid = document.createElement('div'); grid.className = 'replace-pairs';
          var leftCol = document.createElement('div');
          var rightCol = document.createElement('div');
          leftCol.innerHTML = '<strong>Replace From</strong>';
          rightCol.innerHTML = '<strong>Replace With</strong>';
          grid.appendChild(leftCol); grid.appendChild(rightCol);
          var pairsDiv = document.createElement('div'); pairsDiv.style.gridColumn = '1/-1'; pairsDiv.style.marginTop = '8px';

          function addPair(from, to, focus) {
            from = from || '';
            to = to || '';
            focus = !!focus;
            var pr = document.createElement('div'); pr.className = 'pair-row';
            var inpFrom = document.createElement('input'); inpFrom.className = 'input'; inpFrom.placeholder = 'from'; inpFrom.value = from;
            var inpTo = document.createElement('input'); inpTo.className = 'input'; inpTo.placeholder = 'to'; inpTo.value = to;
            var controls = document.createElement('div'); controls.className = 'pair-controls';
           // Create controls depending on whether this is the first row
           if (pairsDiv.children.length === 0) {
  // First row → only "+"
  var addBtn = document.createElement('button');
  addBtn.className = 'btn small';
  addBtn.type = 'button';
  addBtn.textContent = '+';
  addBtn.addEventListener('click', function () { addPair('', '', true); });
  controls.appendChild(addBtn);
            } else {
  // Subsequent rows → only "-"
  var remBtn = document.createElement('button');
  remBtn.className = 'btn small secondary';
  remBtn.type = 'button';
  remBtn.textContent = '-';
  remBtn.addEventListener('click', function () {
    if (pr.parentNode) pr.parentNode.removeChild(pr);
  });
  controls.appendChild(remBtn);
}


            pr.appendChild(inpFrom); pr.appendChild(inpTo); pr.appendChild(controls);
            pairsDiv.appendChild(pr);
            if (focus) inpFrom.focus();
          }

          addPair('', '', true);
          content.appendChild(grid);
          content.appendChild(pairsDiv);

          content.getValues = function () {
            var pairs = [];
            var rows = pairsDiv.querySelectorAll('.pair-row');
            Array.prototype.forEach.call(rows, function (pr) {
              var inputs = pr.querySelectorAll('input');
              var f = inputs[0] ? inputs[0].value : '';
              var t = inputs[1] ? inputs[1].value : '';
              if (f && f.trim().length) pairs.push({ from: f, t: t });
            });
            return { mode: 'custom', pairs: pairs };
          };
        }

        selBtn.addEventListener('click', function () { selBtn.classList.add('active'); customBtn.classList.remove('active'); showSelection(); });
        customBtn.addEventListener('click', function () { customBtn.classList.add('active'); selBtn.classList.remove('active'); showCustom(); });

        // initial
        showSelection();

        wrap.getValues = function () { return content.getValues ? content.getValues() : {}; };
        return wrap;
      }

      // Modal implementation (safe)
      function openModal(title, callback) {
        if (!modal) {
          showErrorBanner('Modal is not available in DOM.');
          return;
        }
        modalTitle.textContent = title || 'Select types';
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        // Reset form inputs to checkboxes by default
        try {
          // rebuild checkboxes
          var template = [
            { v: 'upper', t: 'Uppercase (A-Z)' },
            { v: 'lower', t: 'Lowercase (a-z)' },
            { v: 'digits', t: 'Digits (0-9)' },
            { v: 'special', t: 'Special (!@#...)' },
            { v: 'space', t: 'Space' }
          ];
          typesField.innerHTML = '';
          template.forEach(function (it) {
            var lab = document.createElement('label'); lab.className = 'type-row';
            var inp = document.createElement('input'); inp.type = 'checkbox'; inp.name = 'type'; inp.value = it.v;
            lab.appendChild(inp); lab.appendChild(document.createTextNode(' ' + it.t));
            typesField.appendChild(lab);
          });
        } catch (e) {
          console.error('failed to build modal list', e);
        }
        modalCallback = callback;
        setModalBehavior('multiple');
      }

      function closeModalNow() {
        if (!modal) return;
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        modalCallback = null;
      }

      // modal behavior toggles
      if (segBtns && segBtns.length) {
        Array.prototype.forEach.call(segBtns, function (b) {
          b.addEventListener('click', function () { setModalBehavior(b.dataset.behavior); });
        });
      }

      function setModalBehavior(b) {
        modalBehavior = b === 'single' ? 'single' : 'multiple';
        Array.prototype.forEach.call(segBtns, function (s) { s.classList.toggle('active', s.dataset.behavior === modalBehavior); });
        // convert inputs in typesField to radio or checkbox accordingly
        try {
          var labels = Array.prototype.slice.call(typesField.querySelectorAll('label'));
          var cached = labels.map(function (l) {
            var inp = l.querySelector('input');
            var txt = l.textContent || '';
            return { val: inp ? inp.value : '', checked: inp ? inp.checked : false, txt: txt.trim() };
          });
          typesField.innerHTML = '';
          cached.forEach(function (c) {
            var lab = document.createElement('label'); lab.className = 'type-row';
            var inn = document.createElement('input'); inn.type = (modalBehavior === 'single') ? 'radio' : 'checkbox'; inn.name = 'type'; inn.value = c.val; inn.checked = c.checked;
            lab.appendChild(inn); lab.appendChild(document.createTextNode(' ' + c.txt));
            typesField.appendChild(lab);
          });
        } catch (e) {
          console.error('setModalBehavior error', e);
        }
      }

      if (modalApply) {
        modalApply.addEventListener('click', function () {
          try {
            var picked = Array.prototype.slice.call(typesField.querySelectorAll('input[name="type"]:checked')).map(function (i) { return i.value; });
            if (modalCallback) modalCallback(picked);
          } catch (e) {
            console.error('modal apply failed', e);
          }
          closeModalNow();
        });
      }
      if (modalCancel) modalCancel.addEventListener('click', closeModalNow);
      if (closeModal) closeModal.addEventListener('click', closeModalNow);

      // Apply button handler
      if (applyBtn) {
        applyBtn.addEventListener('click', function () {
          if (errorBox) errorBox.textContent = '';
          try {
            if (currentMode === 'generate') return handleGenerate();
            if (currentMode === 'remove') return handleRemove();
            if (currentMode === 'replace') return handleReplace();
          } catch (e) {
            console.error('Apply handler failed', e);
            showErrorBanner('Apply handler failed: ' + (e && e.message ? e.message : e));
          }
        });
      }

      // GENERATE logic
      function handleGenerate() {
  var opts = optionsArea.firstChild && optionsArea.firstChild.getValues ? optionsArea.firstChild.getValues() : {};
  var types = opts.types || [], count = opts.count, full = opts.full;

  if ((count == null || isNaN(count)) && (full == null || isNaN(full))) {
    return showError('Error: Count and Full length cannot be empty at the same time.\n');
  }
  if (!types || types.length === 0) {
    return showError('Error: Select at least one character type.\n');
  }

  // Strict rule: if both Count and Full are given and Count > Full, stop
  if (count != null && !isNaN(count) && full != null && !isNaN(full) && Number(count) > Number(full)) {
    return showError('Error: Count is greater than Full length.\n');
  }

  var existing = mainText.value || '';
  if (existing && existing.length > 0) {
    var allowed = buildAllowedFromTypes(types, true), mismatch = false;
    for (var i = 0; i < existing.length; i++) {
      if (allowed.indexOf(existing[i]) === -1) { mismatch = true; break; }
    }

    if (full != null && existing.length >= full) {
      overlayTitle.textContent = 'Full Length Reached';
      overlayMsg.textContent = 'Existing text length is already equal to or greater than Full Length. No more characters can be added.';
      overlayClear.style.display = 'none';
      overlayContinue.style.display = 'none';
      overlayOK.style.display = 'inline-block';
      overlayOK.onclick = function () { hideOverlay(); };
      showOverlay();
      return;
    }

    if (mismatch) {
      overlayTitle.textContent = 'Selected Characters do not match existing characters';
      overlayMsg.textContent = 'Your existing text contains characters not in chosen types.';
      overlayWarn.textContent = "Selected characters don't match existing characters.";
      overlayClear.style.display = 'inline-block';
      overlayContinue.style.display = 'inline-block';
      overlayOK.style.display = 'none';
      overlayClear.onclick = function () { mainText.value = ''; performGenerate(types, count, full); hideOverlay(); };
      overlayContinue.onclick = function () { performGenerate(types, count, full, true); hideOverlay(); };
      showOverlay();
      return;
    }

    overlayTitle.textContent = 'Existing Text Found';
    overlayMsg.textContent = 'You have existing text (length ' + existing.length + '). Clear or Continue?';
    overlayWarn.textContent = '';
    overlayClear.style.display = 'inline-block';
    overlayContinue.style.display = 'inline-block';
    overlayOK.style.display = 'none';
    overlayClear.onclick = function () { mainText.value = ''; performGenerate(types, count, full); hideOverlay(); };
    overlayContinue.onclick = function () { performGenerate(types, count, full, true); hideOverlay(); };
    showOverlay();
    return;

  } else {
    performGenerate(types, count, full);
  }
}






      function showOverlay() { if (overlay) overlay.classList.remove('hidden'); if (overlay) overlay.setAttribute('aria-hidden', 'false'); }
      function hideOverlay() { if (overlay) overlay.classList.add('hidden'); if (overlay) overlay.setAttribute('aria-hidden', 'true'); }

      function performGenerate(types, count, full, append) {
  // Build allowed pool (array or string)
  var allowed = buildAllowedFromTypes(types, true);
  if (!allowed || allowed.length === 0) {
    return showError('Error: No characters available for generation.\n');
  }

  var existing = mainText.value || '';
  var startLen = append ? existing.length : 0;

  // Normalize inputs
  var cnt = (count != null && !isNaN(count)) ? Number(count) : null;
  var fl = (full != null && !isNaN(full)) ? Number(full) : null;

  // Reject negative counts
  if (cnt != null && cnt < 0) {
    return showError('Error: Count cannot be negative.\n');
  }
  if (fl != null && fl < 0) {
    return showError('Error: Full length cannot be negative.\n');
  }

  // Compute desired final length
  var targetFinal = null;
  if (append) {
    if (cnt != null) {
      targetFinal = existing.length + cnt;
    } else if (fl != null) {
      targetFinal = fl;
    } else {
      return showError('Error: Provide Count or Full length to append.\n');
    }
  } else {
    if (cnt != null) {
      targetFinal = cnt;
    } else if (fl != null) {
      targetFinal = fl;
    } else {
      return showError('Error: Provide Count or Full length to generate.\n');
    }
  }

  // Cap at full if needed
  var capped = false;
  if (fl != null && targetFinal > fl) {
    targetFinal = fl;
    capped = true;
  }

  var need = append ? (targetFinal - existing.length) : targetFinal;
  if (need <= 0) {
    return showError('Error: Nothing to generate (count is 0 or no space left).\n');
  }

  var res = append ? existing : '';
  for (var i = 0; i < need; i++) {
    res += allowed[Math.floor(Math.random() * allowed.length)];
  }

  mainText.value = res;
  updateCharCount();

  var added = mainText.value.length - startLen;
  if (added === 0) {
    return showError('Error: Nothing was generated (count is 0).\n');
  }

  var msg = 'Generation successful: ' + added + ' characters added.\n';
  if (capped) {
    msg += 'Note: Only appended up to Full Length (' + fl + ' chars). Extra characters were not added.\n';
  }
  showInfo(msg);
}







      function buildAllowedFromTypes(types, includeAll) {
        includeAll = !!includeAll;
        var allowed = '';
        types.forEach(function (t) { allowed += CHARSETS[t] || ''; });
        return allowed.split('');
      }

      function generateString(types, len) {
        var pools = types.map(function (t) { return CHARSETS[t] || ''; });
        var out = [];
        var typesCount = pools.length;
        if (len >= typesCount) {
          for (var i = 0; i < typesCount; i++) {
            var pool = pools[i];
            if (pool.length) out.push(pool[Math.floor(Math.random() * pool.length)]);
          }
          var combined = pools.join('');
          for (var j = out.length; j < len; j++) {
            out.push(combined[Math.floor(Math.random() * combined.length)]);
          }
        } else {
          var idxs = shuffle(Array.apply(null, { length: typesCount }).map(Number.call, Number)).slice(0, len);
          idxs.forEach(function (i) {
            var pool2 = pools[i];
            if (pool2.length) out.push(pool2[Math.floor(Math.random() * pool2.length)]);
          });
        }
        return shuffle(out).join('');
      }

      function shuffle(arr) {
        for (var i = arr.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var tmp = arr[i];
          arr[i] = arr[j];
          arr[j] = tmp;
        }
        return arr;
      }

      // REMOVE logic
      function handleRemove() {
  var text = mainText.value;
  if (!text || !text.length) return showError('Error: Textarea is empty.\n');

  var before = text.length;
  var opts = optionsArea.firstChild && optionsArea.firstChild.getValues ? optionsArea.firstChild.getValues() : {};
  var mode = opts.mode, types = opts.types || [], custom = opts.custom || '';

  if (mode === 'selection') {
    if (!types || types.length === 0) return showError('Error: Select at least one type to remove.\n');
  } else {
    if (!custom || custom.length === 0) return showError('Error: Enter custom characters to remove.\n');
  }

  var toRemove = {};
  if (mode === 'selection' && types && types.length) {
    types.forEach(t => {
      var pool = CHARSETS[t] || '';
      for (var k = 0; k < pool.length; k++) toRemove[pool[k]] = true;
    });
  }
  if (custom && custom.length) {
    for (var m = 0; m < custom.length; m++) toRemove[custom[m]] = true;
  }

  var out = '';
  for (var n = 0; n < text.length; n++) {
    if (!toRemove[text[n]]) out += text[n];
  }

  mainText.value = out;
  updateCharCount();

  var removed = before - out.length;
  if (removed === 0) {
    return showError('Error: No characters were removed (count is 0).\n');
  }

  if (removed < 0) {
    return showError('Error: Removal count cannot be negative.\n');
  }

  showInfo('Removal successful: ' + removed + ' characters removed.\n');
}

      // REPLACE logic
      function handleReplace() {
  var text = mainText.value;
  if (!text || !text.length) return showError('Error: Textarea is empty.\n');

  var opts = optionsArea.firstChild && optionsArea.firstChild.getValues ? optionsArea.firstChild.getValues() : {};

  if (opts.mode === 'selection') {
    var from = opts.from || [], to = opts.to || [];
    if (!from || from.length === 0) return showError('Error: Select types to replace (from).\n');
    if (!to || to.length === 0) return showError('Error: Select replacement types (to).\n');

    var fromSet = {};
    from.forEach(t => {
      var p = CHARSETS[t] || '';
      for (var q = 0; q < p.length; q++) fromSet[p[q]] = true;
    });

    var toPool = to.map(t => CHARSETS[t] || '').join('');
    if (!toPool.length) return showError('Error: Replacement pool is empty.\n');

    var outStr = '';
    var replacedCount = 0;
    for (var r = 0; r < mainText.value.length; r++) {
      var ch2 = mainText.value[r];
      if (fromSet[ch2]) {
        outStr += toPool[Math.floor(Math.random() * toPool.length)];
        replacedCount++;
      } else {
        outStr += ch2;
      }
    }

    mainText.value = outStr;
    updateCharCount();

    if (replacedCount === 0) {
      return showError('Error: No replacements were made (count = 0).\n');
    }

    showInfo('Replace successful: ' + replacedCount + ' replacements made.\n');

  } else if (opts.mode === 'custom') {
    var pairs = opts.pairs || [];
    if (!pairs || pairs.length === 0) return showError('Error: Add at least one replace pair.\n');

    var txt = mainText.value;
    var replacedCount = 0;

    pairs.forEach(p => {
      if (!p.from) return;
      var esc = p.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var re = new RegExp(esc, 'g');

      var matches = (txt.match(re) || []).length;
      replacedCount += matches;

      txt = txt.replace(re, p.t || '');
    });

    mainText.value = txt;
    updateCharCount();

    if (replacedCount === 0) {
      return showError('Error: No replacements were made (count = 0).\n');
    }

    showInfo('Replace successful: ' + replacedCount + ' replacement(s) made.\n');

  } else {
    showError('Error: Unknown replace mode.\n');
  }
}



      // initialize render and counters
      renderOptions();
      updateCharCount();
    } catch (err) {
      // show user-friendly error banner and log stack
      console.error('Initialization failed', err);
      showErrorBanner('Initialization failed: ' + (err && err.message ? err.message : String(err)));
    }
  });

})();