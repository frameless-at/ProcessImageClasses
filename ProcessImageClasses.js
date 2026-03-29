(function () {
	'use strict';

	var cfg     = ((window.ProcessWire || {}).config || {}).ImageClasses || {};
	var classes = cfg.classes || [];
	if (!classes.length) return;

	// All non-empty class values managed by this module.
	// Used to distinguish "our" classes from any others on the element.
	var managed = classes.filter(function (c) { return c.value !== ''; })
	                     .map(function (c) { return c.value; });

	var KEY = '_imageClassSetup';

	// ── Shared helpers ───────────────────────────────────────────────────────

	// Returns the current class list as an array.
	// Works for both plain DOM nodes (TinyMCE) and CKEditor dom.element wrappers.
	function getClasses(el) {
		var str = (el && (el.className || el.getAttribute('class'))) || '';
		return str.split(/\s+/).filter(Boolean);
	}

	// Toggle one class value in an array; returns a new array.
	function toggle(list, value) {
		var idx = list.indexOf(value);
		return idx > -1
			? list.filter(function (_, i) { return i !== idx; })
			: list.concat([value]);
	}

	// Remove all managed classes from a list, keeping unrelated ones.
	function stripManaged(list) {
		return list.filter(function (c) { return managed.indexOf(c) < 0; });
	}

	// Is the "None" entry currently active? (no managed class is present)
	function noneActive(list) {
		return managed.every(function (v) { return list.indexOf(v) < 0; });
	}

	// ── TinyMCE ──────────────────────────────────────────────────────────────

	function registerTinyMCEUI(editor) {
		if (editor[KEY]) return;
		editor[KEY] = true;

		editor.ui.registry.addMenuButton('imageclass', {
			text:    'Image Style',
			tooltip: 'Image Style',
			// fetch() is called every time the menu opens, so the active state
			// always reflects the image's current classes at that moment.
			fetch: function (callback) {
				var node    = editor.selection.getNode();
				var current = (node && node.nodeName === 'IMG') ? getClasses(node) : [];

				callback(classes.map(function (cls) {
					var isActive = cls.value === ''
						? noneActive(current)
						: current.indexOf(cls.value) > -1;

					return {
						type:   'togglemenuitem',
						text:   cls.text,
						active: isActive,
						onAction: function () {
							var n = editor.selection.getNode();
							if (!n || n.nodeName !== 'IMG') return;
							var cur  = getClasses(n);
							var next = cls.value === ''
								? stripManaged(cur)          // "None": remove all managed
								: toggle(cur, cls.value);    // others: add or remove
							editor.dom.setAttrib(n, 'class', next.join(' '));
							editor.fire('change');
						}
					};
				}));
			}
		});

		editor.ui.registry.addContextToolbar('imageclass_context', {
			predicate: function (node) { return node.nodeName === 'IMG'; },
			items:     'imageclass',
			position:  'node',
			scope:     'node'
		});
	}

	function initTinyMCE() {
		if (typeof InputfieldTinyMCE === 'undefined') return false;
		if (InputfieldTinyMCE[KEY]) return true;
		InputfieldTinyMCE[KEY] = true;
		InputfieldTinyMCE.onSetup(registerTinyMCEUI);
		if (typeof tinymce !== 'undefined') {
			tinymce.get().forEach(registerTinyMCEUI);
		}
		return true;
	}

	// ── CKEditor 4 ───────────────────────────────────────────────────────────

	function initCKEditor() {
		if (typeof CKEDITOR === 'undefined') return false;
		if (CKEDITOR[KEY]) return true;
		CKEDITOR[KEY] = true;

		if (!CKEDITOR.plugins.registered['imageclass']) {
			CKEDITOR.plugins.add('imageclass', {
				requires: 'contextmenu',
				init: function (editor) {
					editor.addMenuGroup('imageclassGroup', 10);
					var itemNames = [];

					classes.forEach(function (cls, i) {
						var name = 'imageclass_' + i;
						itemNames.push(name);

						editor.addCommand(name, {
							exec: (function (value) {
								return function (ed) {
									var el = ed.getSelection() && ed.getSelection().getStartElement();
									if (!el || !el.is('img')) return;
									var cur  = getClasses(el);
									var next = value === ''
										? stripManaged(cur)
										: toggle(cur, value);
									next.length
										? el.setAttribute('class', next.join(' '))
										: el.removeAttribute('class');
									ed.fire('saveSnapshot');
								};
							})(cls.value)
						});

						editor.addMenuItem(name, {
							label:   cls.text,
							group:   'imageclassGroup',
							order:   i,
							command: name
						});
					});

					editor.contextMenu.addListener(function (element) {
						if (!element || !element.is('img')) return null;
						var current = getClasses(element);
						var state   = {};
						itemNames.forEach(function (name, i) {
							var cls    = classes[i];
							var active = cls.value === ''
								? noneActive(current)
								: current.indexOf(cls.value) > -1;
							state[name] = active ? CKEDITOR.TRISTATE_ON : CKEDITOR.TRISTATE_OFF;
						});
						return state;
					});
				}
			});
		}

		CKEDITOR.on('instanceCreated', function (ev) {
			ev.editor.on('configLoaded', function () {
				var extra = (this.config.extraPlugins || '').split(',').filter(Boolean);
				if (extra.indexOf('imageclass') < 0) {
					this.config.extraPlugins = extra.concat(['imageclass']).join(',');
				}
			});
		});

		return true;
	}

	// ── Bootstrap ────────────────────────────────────────────────────────────

	initTinyMCE();
	initCKEditor();

	var t = setInterval(function () {
		initTinyMCE();
		initCKEditor();
	}, 50);
	setTimeout(function () { clearInterval(t); }, 10000);

})();
