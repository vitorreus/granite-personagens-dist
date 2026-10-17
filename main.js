//#region src/dom.ts
function h(tag, props = {}, ...children) {
	const el = document.createElement(tag);
	if (props.class) el.className = props.class;
	if (props.text !== void 0) el.textContent = props.text;
	if (props.attrs) {
		for (const [k, v] of Object.entries(props.attrs)) if (v !== void 0) el.setAttribute(k, v);
	}
	if (props.on) for (const [k, fn] of Object.entries(props.on)) el.addEventListener(k, fn);
	for (const c of children) if (c) el.append(c);
	return el;
}
function button(text, cls, onClick, label) {
	const b = h("button", {
		class: cls,
		text,
		attrs: { type: "button" }
	});
	if (label) {
		b.setAttribute("aria-label", label);
		b.title = label;
	}
	b.addEventListener("click", (e) => {
		e.preventDefault();
		onClick();
	});
	return b;
}
/** "a/b/Ren.character" → "Ren"; "capitulos/Cap 01.md" → "Cap 01". */
function baseName(path) {
	const name = path.slice(path.lastIndexOf("/") + 1);
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.slice(0, dot) : name;
}
//#endregion
//#region src/model.ts
var FORMAT = "granite-character";
var INVALID_FILE = "Arquivo de personagem inválido — abra como texto para corrigir";
var TOP_KEYS = [
	"format",
	"version",
	"name",
	"nameJapanese",
	"nameRomaji",
	"nicknames",
	"age",
	"birthday",
	"height",
	"role",
	"appearance",
	"personality",
	"history",
	"relations",
	"appearances",
	"notes"
];
var APPEARANCE_KEYS = [
	"description",
	"colors",
	"images"
];
var PERSONALITY_KEYS = [
	"traits",
	"speech",
	"goal",
	"fears"
];
var COLOR_KEYS = ["label", "color"];
var IMAGE_KEYS = [
	"path",
	"caption",
	"main"
];
var RELATION_KEYS = ["character", "type"];
var isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
var isText = (v) => typeof v === "string" || typeof v === "number";
var extraOf = (o, known) => {
	const extra = {};
	for (const [k, v] of Object.entries(o)) if (!known.includes(k)) extra[k] = v;
	return extra;
};
/** Reads one known field of `o`; a value of the wrong type is recorded in `kept`. */
function take(o, kept, key, convert, exact, shown) {
	const v = o[key];
	const out = convert(v);
	if (v !== void 0 && !exact(v)) kept[key] = {
		value: v,
		shown: JSON.stringify(shown ? shown(out) : out)
	};
	return out;
}
var str = (o, kept, key) => take(o, kept, key, (v) => isText(v) || typeof v === "boolean" ? String(v) : "", (v) => typeof v === "string");
var strList = (o, kept, key) => take(o, kept, key, (v) => Array.isArray(v) ? v.filter(isText).map(String) : [], (v) => Array.isArray(v) && v.every((x) => typeof x === "string"));
function objList(o, kept, key, f, out) {
	return take(o, kept, key, (v) => Array.isArray(v) ? v.filter(isObject).map(f) : [], (v) => Array.isArray(v) && v.every(isObject), (list) => list.map(out));
}
var level = (o, known) => ({
	extra: extraOf(o, known),
	kept: {}
});
function color(o) {
	const l = level(o, COLOR_KEYS);
	return {
		label: str(o, l.kept, "label"),
		color: str(o, l.kept, "color"),
		...l
	};
}
function image(o) {
	const l = level(o, IMAGE_KEYS);
	return {
		path: str(o, l.kept, "path"),
		caption: str(o, l.kept, "caption"),
		main: take(o, l.kept, "main", (v) => v === true, (v) => typeof v === "boolean"),
		...l
	};
}
function relation(o) {
	const l = level(o, RELATION_KEYS);
	return {
		character: str(o, l.kept, "character"),
		type: str(o, l.kept, "type"),
		...l
	};
}
function appearanceOf(o) {
	const l = level(o, APPEARANCE_KEYS);
	return {
		description: str(o, l.kept, "description"),
		colors: objList(o, l.kept, "colors", color, colorJSON),
		images: objList(o, l.kept, "images", image, imageJSON),
		...l
	};
}
function personalityOf(o) {
	const l = level(o, PERSONALITY_KEYS);
	return {
		traits: strList(o, l.kept, "traits"),
		speech: str(o, l.kept, "speech"),
		goal: str(o, l.kept, "goal"),
		fears: str(o, l.kept, "fears"),
		...l
	};
}
function blank() {
	return normalize({});
}
/** Fills every known field with its default; unknown fields go to `extra`, wrong-typed ones to `kept`. */
function normalize(raw) {
	const l = level(raw, TOP_KEYS);
	const k = l.kept;
	return {
		format: take(raw, k, "format", (v) => typeof v === "string" && v ? v : FORMAT, (v) => typeof v === "string" && v !== ""),
		version: raw.version ?? 1,
		name: str(raw, k, "name"),
		nameJapanese: str(raw, k, "nameJapanese"),
		nameRomaji: str(raw, k, "nameRomaji"),
		nicknames: strList(raw, k, "nicknames"),
		age: str(raw, k, "age"),
		birthday: str(raw, k, "birthday"),
		height: str(raw, k, "height"),
		role: str(raw, k, "role"),
		appearance: take(raw, k, "appearance", (v) => appearanceOf(isObject(v) ? v : {}), isObject, appearanceJSON),
		personality: take(raw, k, "personality", (v) => personalityOf(isObject(v) ? v : {}), isObject, personalityJSON),
		history: str(raw, k, "history"),
		relations: objList(raw, k, "relations", relation, relationJSON),
		appearances: strList(raw, k, "appearances"),
		notes: str(raw, k, "notes"),
		...l
	};
}
/**
* Empty or whitespace-only text is a blank character. Anything that is not a
* JSON object is an error: the sheet shows it read-only and never saves.
*/
function parse(text) {
	if (text.trim() === "") return {
		ok: true,
		data: blank()
	};
	let raw;
	try {
		raw = JSON.parse(text);
	} catch (e) {
		return {
			ok: false,
			error: e instanceof Error ? e.message : String(e)
		};
	}
	if (!isObject(raw)) return {
		ok: false,
		error: "o arquivo não é um objeto JSON"
	};
	return {
		ok: true,
		data: normalize(raw)
	};
}
/** The original value of a wrong-typed field while the sheet did not change it, else the current one. */
function out(kept, key, current) {
	const k = kept[key];
	return k && JSON.stringify(current) === k.shown ? k.value : current;
}
function colorJSON(x) {
	return {
		label: out(x.kept, "label", x.label),
		color: out(x.kept, "color", x.color),
		...x.extra
	};
}
function imageJSON(x) {
	const main = out(x.kept, "main", x.main);
	return {
		path: out(x.kept, "path", x.path),
		caption: out(x.kept, "caption", x.caption),
		...main !== false ? { main } : {},
		...x.extra
	};
}
function relationJSON(x) {
	return {
		character: out(x.kept, "character", x.character),
		type: out(x.kept, "type", x.type),
		...x.extra
	};
}
function appearanceJSON(a) {
	const k = a.kept;
	return {
		description: out(k, "description", a.description),
		colors: out(k, "colors", a.colors.map(colorJSON)),
		images: out(k, "images", a.images.map(imageJSON)),
		...a.extra
	};
}
function personalityJSON(p) {
	const k = p.kept;
	return {
		traits: out(k, "traits", [...p.traits]),
		speech: out(k, "speech", p.speech),
		goal: out(k, "goal", p.goal),
		fears: out(k, "fears", p.fears),
		...p.extra
	};
}
/** The plain JSON object: known fields first in the documented order, then unknown ones. */
function toJSON(c) {
	const k = c.kept;
	return {
		format: out(k, "format", c.format),
		version: c.version,
		name: out(k, "name", c.name),
		nameJapanese: out(k, "nameJapanese", c.nameJapanese),
		nameRomaji: out(k, "nameRomaji", c.nameRomaji),
		nicknames: out(k, "nicknames", [...c.nicknames]),
		age: out(k, "age", c.age),
		birthday: out(k, "birthday", c.birthday),
		height: out(k, "height", c.height),
		role: out(k, "role", c.role),
		appearance: out(k, "appearance", appearanceJSON(c.appearance)),
		personality: out(k, "personality", personalityJSON(c.personality)),
		history: out(k, "history", c.history),
		relations: out(k, "relations", c.relations.map(relationJSON)),
		appearances: out(k, "appearances", [...c.appearances]),
		notes: out(k, "notes", c.notes),
		...c.extra
	};
}
/** JSON with 2-space indentation and a final newline. */
function serialize(c) {
	return JSON.stringify(toJSON(c), null, 2) + "\n";
}
/** The image shown in the header: the one marked main, else the first. */
function mainImage(c) {
	const imgs = c.appearance.images;
	return imgs.find((i) => i.main) ?? imgs[0] ?? null;
}
/** A new list item (no unknown or kept fields). */
var newColor = (label, color) => ({
	label,
	color,
	extra: {},
	kept: {}
});
var newImage = (path) => ({
	path,
	caption: "",
	main: false,
	extra: {},
	kept: {}
});
var newRelation = (character) => ({
	character,
	type: "",
	extra: {},
	kept: {}
});
//#endregion
//#region src/vault.ts
var IMAGE_EXTENSIONS = [
	"png",
	"jpg",
	"jpeg",
	"gif",
	"webp",
	"svg",
	"avif",
	"bmp"
];
var MIME = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	avif: "image/avif",
	bmp: "image/bmp"
};
var extOf = (path) => {
	const name = path.slice(path.lastIndexOf("/") + 1);
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};
var isImage = (path) => IMAGE_EXTENSIONS.includes(extOf(path));
var isCharacter = (path) => extOf(path) === "character";
var imageMime = (path) => MIME[extOf(path)] ?? "application/octet-stream";
/** Upper bound on folders visited, so a huge vault cannot stall the picker. */
var MAX_DIRS = 2e3;
/** Folders listed at the same time. */
var PARALLEL = 4;
/** Every file under the vault root whose path passes `keep`, sorted by path. */
async function walkFiles(granite, keep, maxDirs = MAX_DIRS) {
	const found = [];
	const queue = [""];
	let visited = 0;
	while (queue.length > 0 && visited < maxDirs) {
		const batch = queue.splice(0, Math.min(PARALLEL, maxDirs - visited));
		visited += batch.length;
		const listings = await Promise.all(batch.map((dir) => granite.files.list(dir).catch(() => [])));
		for (const entries of listings) for (const e of entries) {
			if (e.name.startsWith(".")) continue;
			if (e.kind === "dir") queue.push(e.path);
			else if (keep(e.path)) found.push(e.path);
		}
	}
	return {
		paths: found.sort((a, b) => a.localeCompare(b)),
		partial: queue.length > 0
	};
}
/** Case- and accent-insensitive substring match. */
function matches(path, query) {
	const fold = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
	return fold(path).includes(fold(query.trim()));
}
//#endregion
//#region src/sheet.ts
var ROLE_SUGGESTIONS = [
	"Protagonista",
	"Antagonista",
	"Coadjuvante",
	"Figurante",
	"Outro"
];
var CAPTION_SUGGESTIONS = [
	"Rosto",
	"Corpo de frente",
	"De lado",
	"Costas",
	"Expressões"
];
var RELATION_SUGGESTIONS = [
	"irmão",
	"irmã",
	"rival",
	"mentor",
	"amigo",
	"amiga",
	"interesse amoroso",
	"inimigo",
	"pai",
	"mãe"
];
var COLOR_SUGGESTIONS = [
	"cabelo",
	"olhos",
	"pele",
	"roupa"
];
var IMAGE_MISSING = "Imagem não encontrada";
var CHIP_DRAFT = "Apelido ou traço digitado e não adicionado — pressione Enter";
var PARTIAL_LIST = "Lista parcial — refine a busca";
var OPEN_FAILED = "Não foi possível abrir o arquivo";
/** Items shown at most in a picker. */
var PICKER_MAX = 300;
var instances = 0;
function createSheet(granite, container, doc) {
	const uid = `pg${++instances}`;
	const toText = (c) => typeof c === "string" ? c : new TextDecoder().decode(c);
	let text = toText(doc.content);
	let data = null;
	let error = "";
	let readonlyFlag = doc.readonly;
	let destroyed = false;
	/** > 0 while reload() runs: nothing done then is a user edit. */
	let reloading = 0;
	/** Bumped on every reload: an edit sees whether the kernel reloaded it inside markDirty. */
	let reloads = 0;
	/** Chip text typed but not added yet, by chip list ("nicknames", "traits"). */
	const drafts = /* @__PURE__ */ new Map();
	/** Blob URLs of the images in use, by vault path. */
	const urls = /* @__PURE__ */ new Map();
	const made = /* @__PURE__ */ new Set();
	const root = h("div", { class: "pg-root" });
	const page = h("div", { class: "pg-page" });
	const layer = h("div", { class: "pg-layer" });
	root.append(page, layer);
	container.append(root);
	const setText = (t) => {
		text = t;
		const r = parse(t);
		if (r.ok) {
			data = r.data;
			error = "";
		} else {
			data = null;
			error = r.error;
		}
	};
	setText(text);
	const isReadonly = () => readonlyFlag || data === null;
	const hasDraft = () => [...drafts.values()].some((v) => v.trim() !== "");
	/**
	* A user edit: markDirty first (it may reload this view with another
	* tab's text), then the change is applied to whatever the model is now.
	* Returns whether it was applied.
	*/
	const edit = (apply, opts = {}) => {
		if (destroyed || reloading || isReadonly() || !data) return false;
		const snap = snapshot();
		const before = reloads;
		const guarded = opts.guard ? JSON.stringify(opts.guard(data)) : "";
		doc.markDirty();
		if (destroyed || !data || isReadonly()) return false;
		const reloaded = reloads !== before;
		if (reloaded && opts.guard && JSON.stringify(opts.guard(data)) !== guarded) {
			render(snap);
			return false;
		}
		apply(data);
		text = serialize(data);
		if (opts.rerender || reloaded) render(opts.focus ? {
			key: opts.focus,
			start: null,
			end: null
		} : snap);
		return true;
	};
	const blobURL = (bytes, path) => URL.createObjectURL(new Blob([bytes], { type: imageMime(path) }));
	/** The image's blob URL; a failed read is not cached (the next render tries again). */
	const imageURL = (path) => {
		let p = urls.get(path);
		if (!p) {
			const mine = granite.files.readBytes(path).then((bytes) => {
				if (destroyed || urls.get(path) !== mine) return null;
				const url = blobURL(bytes, path);
				made.add(url);
				return url;
			}, () => {
				if (urls.get(path) === mine) urls.delete(path);
				return null;
			});
			p = mine;
			urls.set(path, p);
		}
		return p;
	};
	const revoke = (path) => {
		const p = urls.get(path);
		urls.delete(path);
		p?.then((url) => {
			if (url && made.delete(url)) URL.revokeObjectURL(url);
		});
	};
	/** Drops the URLs of images no longer in the character. */
	const pruneImages = () => {
		const used = new Set(data ? data.appearance.images.map((i) => i.path) : []);
		for (const path of [...urls.keys()]) if (!used.has(path)) revoke(path);
	};
	const missing = (box) => {
		box.classList.add("is-missing");
		box.append(h("span", {
			class: "pg-img-missing",
			text: IMAGE_MISSING
		}));
	};
	const imageBox = (img, cls, onClick) => {
		const box = h("div", { class: `pg-img ${cls}` });
		const el = h("img", { attrs: { alt: img.caption || baseName(img.path) } });
		box.append(el);
		if (onClick) {
			box.classList.add("is-clickable");
			box.tabIndex = 0;
			box.setAttribute("role", "button");
			box.setAttribute("aria-label", `Ampliar ${img.caption || baseName(img.path)}`);
			box.addEventListener("click", onClick);
			box.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick();
				}
			});
		}
		if (!img.path) {
			missing(box);
			return box;
		}
		imageURL(img.path).then((url) => {
			if (destroyed) return;
			if (url) el.src = url;
			else missing(box);
		});
		return box;
	};
	/** Releases what the open overlay holds (its blob URLs, timers). */
	let overlayCleanup = null;
	const closeOverlay = (restore) => {
		const cleanup = overlayCleanup;
		overlayCleanup = null;
		cleanup?.();
		layer.replaceChildren();
		if (restore instanceof HTMLElement && restore.isConnected) restore.focus();
	};
	/** Shows `content` in a modal layer (Esc or a click outside closes it); returns its close. */
	const overlay = (content, label, cls = "", cleanup) => {
		closeOverlay();
		const back = document.activeElement;
		const close = () => {
			if (o.isConnected) closeOverlay(back);
		};
		const o = h("div", {
			class: `pg-overlay ${cls}`.trim(),
			attrs: {
				role: "dialog",
				"aria-modal": "true",
				"aria-label": label
			}
		});
		o.tabIndex = -1;
		o.addEventListener("keydown", (e) => {
			if (e.key === "Escape") {
				e.preventDefault();
				e.stopPropagation();
				close();
			}
		});
		o.addEventListener("click", (e) => {
			if (e.target === o) close();
		});
		o.append(content);
		layer.replaceChildren(o);
		overlayCleanup = cleanup ?? null;
		return {
			el: o,
			close
		};
	};
	/** The enlarged image, with its own blob URL (independent of the page's, revoked on close). */
	const showLightbox = (img) => {
		const name = img.caption || baseName(img.path);
		const box = h("div", { class: "pg-img pg-lightbox-img" });
		const el = h("img", { attrs: { alt: name } });
		box.append(el);
		const content = h("figure", { class: "pg-lightbox" }, box, img.caption ? h("div", {
			class: "pg-lightbox-caption",
			text: img.caption
		}) : null);
		let closed = false;
		let url = null;
		const o = overlay(content, name, "is-lightbox", () => {
			closed = true;
			if (url) URL.revokeObjectURL(url);
			url = null;
		});
		content.addEventListener("click", o.close);
		o.el.focus();
		granite.files.readBytes(img.path).then((bytes) => {
			if (closed || destroyed) return;
			url = blobURL(bytes, img.path);
			el.src = url;
		}, () => {
			if (!closed) missing(box);
		});
	};
	const showPicker = (opts) => {
		const search = h("input", {
			class: "pg-input pg-picker-search",
			attrs: {
				type: "search",
				placeholder: "Buscar pelo nome…",
				"aria-label": "Buscar"
			}
		});
		const list = h("ul", {
			class: "pg-picker-list",
			attrs: { role: "listbox" }
		});
		const status = h("p", {
			class: "pg-picker-status",
			text: "Carregando…"
		});
		const partialNote = h("p", {
			class: "pg-picker-status pg-picker-partial",
			text: PARTIAL_LIST
		});
		partialNote.hidden = true;
		const cancel = button("Cancelar", "pg-btn", () => o.close());
		const box = h("div", { class: "pg-picker" }, h("h3", {
			class: "pg-picker-title",
			text: opts.title
		}), search, status, list, partialNote, h("div", { class: "pg-picker-actions" }, cancel));
		let closed = false;
		let timer;
		const thumbURLs = /* @__PURE__ */ new Map();
		const thumbURL = (path) => {
			let p = thumbURLs.get(path);
			if (!p) {
				p = granite.files.readBytes(path).then((bytes) => closed || destroyed ? null : blobURL(bytes, path), () => null);
				thumbURLs.set(path, p);
			}
			return p;
		};
		const loadThumb = (el) => {
			thumbURL(el.dataset.path).then((url) => {
				if (url && !closed) el.src = url;
			});
		};
		const observer = opts.thumbs && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				observer.unobserve(e.target);
				loadThumb(e.target);
			}
		}, {
			root: list,
			rootMargin: "200px"
		}) : null;
		const o = overlay(box, opts.title, "", () => {
			closed = true;
			clearTimeout(timer);
			observer?.disconnect();
			for (const p of thumbURLs.values()) p.then((url) => url && URL.revokeObjectURL(url));
			thumbURLs.clear();
		});
		let all = [];
		const show = () => {
			clearTimeout(timer);
			timer = void 0;
			const q = search.value;
			const items = all.filter((p) => matches(p, q));
			status.textContent = all.length === 0 ? opts.empty : items.length === 0 ? "Nada encontrado" : "";
			status.hidden = status.textContent === "";
			observer?.disconnect();
			list.replaceChildren(...items.slice(0, PICKER_MAX).map((path) => {
				const b = button("", "pg-picker-item", () => {
					o.close();
					opts.pick(path);
				});
				b.setAttribute("role", "option");
				if (opts.thumbs) {
					const thumb = h("img", {
						class: "pg-picker-thumb",
						attrs: { alt: "" }
					});
					thumb.dataset.path = path;
					b.append(thumb);
					if (observer) observer.observe(thumb);
					else loadThumb(thumb);
				}
				b.append(h("span", {
					class: "pg-picker-name",
					text: baseName(path)
				}), h("span", {
					class: "pg-picker-path",
					text: path
				}));
				return h("li", {}, b);
			}));
		};
		search.addEventListener("input", () => {
			clearTimeout(timer);
			timer = setTimeout(show, 150);
		});
		search.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;
			if (timer !== void 0) show();
			const first = list.querySelector(".pg-picker-item");
			if (first) {
				e.preventDefault();
				first.click();
			}
		});
		search.focus();
		opts.load().then((r) => {
			if (closed || destroyed) return;
			all = r.paths;
			partialNote.hidden = !r.partial;
			show();
		}, () => {
			if (closed) return;
			status.textContent = "Não foi possível listar os arquivos";
		});
	};
	const open = (path) => {
		granite.documents.open(path).then((ok) => {
			if (!ok) granite.ui.toast(OPEN_FAILED);
		}, () => granite.ui.toast(OPEN_FAILED));
	};
	const datalist = (name, values) => {
		const dl = h("datalist", { attrs: { id: `${uid}-${name}` } });
		for (const v of values) dl.append(h("option", { attrs: { value: v } }));
		return dl;
	};
	/** A text input or textarea bound to a string of the model. */
	const field = (key, value, set, opts = {}) => {
		const el = opts.multiline ? h("textarea", { class: "pg-input pg-textarea" }) : h("input", { class: "pg-input" });
		if (el instanceof HTMLInputElement) el.type = "text";
		if (opts.class) el.classList.add(opts.class);
		el.value = value;
		el.dataset.key = key;
		el.readOnly = isReadonly();
		if (opts.placeholder) el.placeholder = opts.placeholder;
		if (opts.list) el.setAttribute("list", `${uid}-${opts.list}`);
		if (opts.label) el.setAttribute("aria-label", opts.label);
		el.spellcheck = true;
		el.addEventListener("input", () => {
			if (!el.isConnected) return;
			const v = el.value;
			edit((c) => set(c, v), { guard: opts.guard });
		});
		return el;
	};
	let fieldIds = 0;
	const labeled = (label, control, cls = "") => {
		const id = `${uid}-f${++fieldIds}`;
		const target = control.matches("input, textarea") ? control : control.querySelector("input, textarea");
		if (target && !target.id) target.id = id;
		return h("div", { class: `pg-field ${cls}`.trim() }, h("label", {
			class: "pg-label",
			text: label,
			attrs: { for: target?.id }
		}), control);
	};
	/**
	* Chips (nicknames, traits): remove with ×, add by typing + Enter (or
	* comma, or leaving the box). Adding or removing redraws only the chips,
	* never the box nor the rest of the page, so the focus stays where the
	* user put it.
	*/
	const chips = (key, label, get) => {
		const wrap = h("div", { class: "pg-chips" });
		const draft = drafts.get(key) ?? "";
		let add = null;
		if (!isReadonly() || draft.trim() !== "") {
			add = h("input", {
				class: "pg-input pg-chip-add",
				attrs: {
					type: "text",
					placeholder: "Adicionar…",
					"aria-label": `Adicionar ${label.toLowerCase()}`
				}
			});
			add.dataset.key = `${key}:add`;
			add.value = draft;
			add.readOnly = isReadonly();
		}
		const fill = () => {
			for (const el of [...wrap.querySelectorAll(".pg-chip, .pg-empty")]) el.remove();
			const values = data ? get(data) : [];
			const nodes = values.map((v, i) => {
				const chip = h("span", { class: "pg-chip" }, h("span", {
					class: "pg-chip-text",
					text: v
				}));
				if (!isReadonly()) chip.append(button("×", "pg-chip-remove", () => {
					if (edit((c) => get(c).splice(i, 1), { guard: get })) {
						fill();
						add?.focus();
					}
				}, `Remover ${v}`));
				return chip;
			});
			if (isReadonly() && values.length === 0 && !add) nodes.push(h("span", {
				class: "pg-empty",
				text: "—"
			}));
			if (add) add.before(...nodes);
			else wrap.append(...nodes);
		};
		if (add) {
			const box = add;
			wrap.append(box);
			const setDraft = (v) => {
				const had = hasDraft();
				if (v === "") drafts.delete(key);
				else drafts.set(key, v);
				if (had !== hasDraft()) doc.refreshStatus?.();
			};
			const commit = () => {
				if (!box.isConnected || box.readOnly) return;
				const v = box.value.trim();
				if (!v) return;
				box.value = "";
				setDraft("");
				if (edit((c) => get(c).push(v))) {
					if (wrap.isConnected) fill();
				} else if (box.isConnected) {
					box.value = v;
					setDraft(v);
				}
			};
			box.addEventListener("input", () => {
				if (box.isConnected) setDraft(box.value);
			});
			box.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === ",") {
					e.preventDefault();
					commit();
				} else if (e.key === "Backspace" && box.value === "" && !box.readOnly && data && get(data).length > 0) {
					const n = get(data).length;
					if (edit((c) => c && get(c).splice(n - 1, 1), { guard: get }) && wrap.isConnected) fill();
				}
			});
			box.addEventListener("change", commit);
		}
		fill();
		return labeled(label, wrap);
	};
	const move = (list, i, d) => {
		const j = i + d;
		if (j < 0 || j >= list.length) return;
		[list[i], list[j]] = [list[j], list[i]];
	};
	/** ↑ ↓ × buttons of a list row. */
	const rowTools = (key, i, n, get, guard, extra = []) => {
		const tools = h("div", { class: "pg-row-tools" }, ...extra);
		if (isReadonly()) return tools;
		const up = button("↑", "pg-icon-btn", () => edit((c) => move(get(c), i, -1), {
			rerender: true,
			focus: `${key}:${i - 1}:up`,
			guard
		}), "Mover para cima");
		up.dataset.key = `${key}:${i}:up`;
		up.disabled = i === 0;
		const down = button("↓", "pg-icon-btn", () => edit((c) => move(get(c), i, 1), {
			rerender: true,
			focus: `${key}:${i + 1}:down`,
			guard
		}), "Mover para baixo");
		down.dataset.key = `${key}:${i}:down`;
		down.disabled = i === n - 1;
		const rm = button("×", "pg-icon-btn pg-remove", () => edit((c) => get(c).splice(i, 1), {
			rerender: true,
			focus: `${key}:new`,
			guard
		}), "Remover");
		rm.dataset.key = `${key}:${i}:remove`;
		tools.append(up, down, rm);
		return tools;
	};
	const addButton = (key, text, onClick) => {
		if (isReadonly()) return null;
		const b = button(text, "pg-add", onClick);
		b.dataset.key = `${key}:new`;
		return b;
	};
	const section = (id, title, ...children) => h("section", {
		class: `pg-section pg-section-${id}`,
		attrs: { "aria-labelledby": `${uid}-${id}` }
	}, h("h2", {
		class: "pg-section-title",
		text: title,
		attrs: { id: `${uid}-${id}` }
	}), ...children);
	const imagePaths = (c) => c.appearance.images.map((x) => x.path);
	const colorCount = (c) => c.appearance.colors.length;
	const relationTargets = (c) => c.relations.map((x) => x.character);
	const appearanceList = (c) => c.appearances;
	const header = (c) => {
		const main = mainImage(c);
		return h("header", { class: "pg-section pg-header" }, main ? imageBox(main, "pg-main-img", () => showLightbox(main)) : h("div", { class: "pg-img pg-main-img is-empty" }, isReadonly() ? h("span", {
			class: "pg-img-missing",
			text: "Sem imagem"
		}) : button("Adicionar imagem", "pg-add", pickImage)), h("div", { class: "pg-ident" }, field("name", c.name, (d, v) => d.name = v, {
			placeholder: "Nome do personagem",
			label: "Nome",
			class: "pg-name"
		}), h("div", { class: "pg-grid" }, labeled("Nome em japonês", field("nameJapanese", c.nameJapanese, (d, v) => d.nameJapanese = v, { placeholder: "星野 あかり" })), labeled("Romaji", field("nameRomaji", c.nameRomaji, (d, v) => d.nameRomaji = v, { placeholder: "Hoshino Akari" }))), chips("nicknames", "Apelidos", (d) => d.nicknames), h("div", { class: "pg-grid pg-grid-4" }, labeled("Idade", field("age", c.age, (d, v) => d.age = v)), labeled("Aniversário", field("birthday", c.birthday, (d, v) => d.birthday = v, { placeholder: "dd/mm" })), labeled("Altura", field("height", c.height, (d, v) => d.height = v, { placeholder: "1,62 m" })), labeled("Papel na história", field("role", c.role, (d, v) => d.role = v, { list: "roles" })))));
	};
	const pickImage = () => showPicker({
		title: "Adicionar imagem",
		empty: "Nenhuma imagem no vault",
		thumbs: true,
		load: () => walkFiles(granite, isImage),
		pick: (path) => edit((c) => c.appearance.images.push(newImage(path)), {
			rerender: true,
			focus: `img:${data ? data.appearance.images.length : 0}:caption`
		})
	});
	const appearance = (c) => {
		const colors = h("div", { class: "pg-colors" });
		c.appearance.colors.forEach((col, i) => {
			const picker = h("input", {
				class: "pg-color",
				attrs: {
					type: "color",
					"aria-label": `Cor ${col.label || i + 1}`
				}
			});
			picker.value = /^#[0-9a-f]{6}$/i.test(col.color) ? col.color : "#000000";
			picker.dataset.key = `color:${i}:color`;
			picker.disabled = isReadonly();
			picker.addEventListener("input", () => {
				if (!picker.isConnected) return;
				const v = picker.value;
				edit((d) => d.appearance.colors[i].color = v, { guard: colorCount });
			});
			const label = field(`color:${i}:label`, col.label, (d, v) => d.appearance.colors[i].label = v, {
				placeholder: "cabelo, olhos…",
				list: "colors",
				label: "Nome da cor",
				guard: colorCount
			});
			const rm = isReadonly() ? null : button("×", "pg-icon-btn pg-remove", () => edit((d) => d.appearance.colors.splice(i, 1), {
				rerender: true,
				focus: "color:new",
				guard: colorCount
			}), "Remover cor");
			colors.append(h("div", { class: "pg-color-row" }, picker, label, rm));
		});
		const addColor = addButton("color", "Adicionar cor", () => edit((d) => d.appearance.colors.push(newColor("", "#888888")), {
			rerender: true,
			focus: `color:${c.appearance.colors.length}:label`
		}));
		if (isReadonly() && c.appearance.colors.length === 0) colors.append(h("span", {
			class: "pg-empty",
			text: "—"
		}));
		const gallery = h("div", { class: "pg-gallery" });
		const imgs = c.appearance.images;
		imgs.forEach((img, i) => {
			const star = button(img.main ? "★" : "☆", "pg-icon-btn pg-star", () => edit((d) => d.appearance.images.forEach((x, j) => x.main = j === i && !img.main), {
				rerender: true,
				focus: `img:${i}:star`,
				guard: imagePaths
			}), img.main ? "Imagem principal" : "Tornar principal");
			star.dataset.key = `img:${i}:star`;
			star.setAttribute("aria-pressed", String(img.main));
			star.disabled = isReadonly();
			const caption = field(`img:${i}:caption`, img.caption, (d, v) => d.appearance.images[i].caption = v, {
				placeholder: "Legenda",
				list: "captions",
				label: "Legenda",
				guard: imagePaths
			});
			gallery.append(h("figure", { class: "pg-card" }, imageBox(img, "pg-thumb", () => showLightbox(img)), h("figcaption", { class: "pg-card-caption" }, caption), rowTools("img", i, imgs.length, (d) => d.appearance.images, imagePaths, [star])));
		});
		if (isReadonly() && imgs.length === 0) gallery.append(h("span", {
			class: "pg-empty",
			text: "—"
		}));
		return section("appearance", "Aparência", labeled("Descrição", field("description", c.appearance.description, (d, v) => d.appearance.description = v, {
			multiline: true,
			placeholder: "Adicionar descrição…"
		})), h("div", { class: "pg-field" }, h("div", {
			class: "pg-label",
			text: "Cores principais"
		}), colors, addColor), h("div", { class: "pg-field" }, h("div", {
			class: "pg-label",
			text: "Imagens de referência"
		}), gallery, addButton("img", "Adicionar imagem", pickImage)));
	};
	const personality = (c) => section("personality", "Personalidade", chips("traits", "Traços", (d) => d.personality.traits), labeled("Jeito de falar", field("speech", c.personality.speech, (d, v) => d.personality.speech = v, {
		multiline: true,
		placeholder: "Pronome que usa, bordões…"
	})), labeled("Objetivo", field("goal", c.personality.goal, (d, v) => d.personality.goal = v, {
		multiline: true,
		placeholder: "Adicionar…"
	})), labeled("Medos", field("fears", c.personality.fears, (d, v) => d.personality.fears = v, {
		multiline: true,
		placeholder: "Adicionar…"
	})));
	const relations = (c) => {
		const list = h("ul", { class: "pg-list" });
		c.relations.forEach((r, i) => {
			const link = button(baseName(r.character) || "(sem personagem)", "pg-link", () => r.character && open(r.character));
			link.title = r.character;
			link.dataset.key = `rel:${i}:link`;
			const type = field(`rel:${i}:type`, r.type, (d, v) => d.relations[i].type = v, {
				placeholder: "tipo (rival, irmã…)",
				list: "relations",
				label: "Tipo de relação",
				guard: relationTargets
			});
			list.append(h("li", { class: "pg-row" }, link, type, rowTools("rel", i, c.relations.length, (d) => d.relations, relationTargets)));
		});
		if (c.relations.length === 0) list.append(h("li", {
			class: "pg-empty",
			text: isReadonly() ? "—" : "Nenhuma relação ainda."
		}));
		const add = addButton("rel", "Adicionar relação", () => showPicker({
			title: "Adicionar relação",
			empty: "Nenhum outro personagem (.character) no vault",
			load: () => walkFiles(granite, (p) => isCharacter(p) && p !== doc.path),
			pick: (path) => edit((d) => d.relations.push(newRelation(path)), {
				rerender: true,
				focus: `rel:${data ? data.relations.length : 0}:type`
			})
		}));
		return section("relations", "Relações", list, add);
	};
	const appearances = (c) => {
		const list = h("ul", { class: "pg-list" });
		c.appearances.forEach((p, i) => {
			const link = button(baseName(p), "pg-link", () => open(p));
			link.title = p;
			link.dataset.key = `app:${i}:link`;
			list.append(h("li", { class: "pg-row" }, link, h("span", {
				class: "pg-path",
				text: p
			}), rowTools("app", i, c.appearances.length, (d) => d.appearances, appearanceList)));
		});
		if (c.appearances.length === 0) list.append(h("li", {
			class: "pg-empty",
			text: isReadonly() ? "—" : "Nenhuma aparição ainda."
		}));
		const add = addButton("app", "Adicionar aparição", () => showPicker({
			title: "Adicionar aparição",
			empty: "Nenhuma nota no vault",
			load: async () => ({ paths: (await granite.files.notes()).filter((p) => p.toLowerCase().endsWith(".md")).sort((a, b) => a.localeCompare(b)) }),
			pick: (path) => edit((d) => d.appearances.push(path), {
				rerender: true,
				focus: "app:new"
			})
		}));
		return section("appearances", "Aparições", list, add);
	};
	const snapshot = () => {
		const a = document.activeElement;
		if (!(a instanceof HTMLElement) || !page.contains(a) || !a.dataset.key) return null;
		let start = null;
		let end = null;
		if (a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement) try {
			start = a.selectionStart;
			end = a.selectionEnd;
		} catch {}
		return {
			key: a.dataset.key,
			start,
			end
		};
	};
	const restore = (snap) => {
		if (!snap) return;
		const target = [...page.querySelectorAll("[data-key]")].find((e) => e.dataset.key === snap.key);
		const el = target && !target.disabled ? target : null;
		if (!el) return;
		el.focus({ preventScroll: true });
		if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && snap.start !== null) try {
			const n = el.value.length;
			el.setSelectionRange(Math.min(snap.start, n), Math.min(snap.end ?? snap.start, n));
		} catch {}
	};
	function render(snap = snapshot()) {
		if (destroyed) return;
		const scroll = container.scrollTop;
		fieldIds = 0;
		root.classList.toggle("is-readonly", isReadonly());
		if (!data) {
			page.replaceChildren(h("div", {
				class: "pg-banner",
				attrs: { role: "alert" }
			}, h("strong", { text: INVALID_FILE }), h("div", {
				class: "pg-banner-detail",
				text: error
			})));
			pruneImages();
			return;
		}
		const c = data;
		page.replaceChildren(header(c), appearance(c), personality(c), section("history", "História", field("history", c.history, (d, v) => d.history = v, {
			multiline: true,
			placeholder: "Adicionar história…",
			label: "História",
			class: "pg-long"
		})), relations(c), appearances(c), section("notes", "Notas", field("notes", c.notes, (d, v) => d.notes = v, {
			multiline: true,
			placeholder: "Adicionar notas…",
			label: "Notas",
			class: "pg-long"
		})), datalist("roles", ROLE_SUGGESTIONS), datalist("captions", CAPTION_SUGGESTIONS), datalist("relations", RELATION_SUGGESTIONS), datalist("colors", COLOR_SUGGESTIONS));
		pruneImages();
		container.scrollTop = scroll;
		restore(snap);
	}
	render(null);
	return {
		getContent: () => text,
		reload(content) {
			if (destroyed) return;
			reloading++;
			reloads++;
			try {
				const snap = snapshot();
				setText(toText(content));
				render(snap);
			} finally {
				reloading--;
			}
		},
		setReadonly(b) {
			if (destroyed || readonlyFlag === b) return;
			readonlyFlag = b;
			reloading++;
			try {
				render();
			} finally {
				reloading--;
			}
		},
		focus() {
			if (destroyed) return;
			(page.querySelector(".pg-name") ?? root).focus({ preventScroll: true });
		},
		hasUnapplied: () => hasDraft() ? CHIP_DRAFT : false,
		destroy() {
			if (destroyed) return;
			destroyed = true;
			closeOverlay();
			urls.clear();
			for (const url of made) URL.revokeObjectURL(url);
			made.clear();
			root.remove();
		}
	};
}
//#endregion
//#region src/main.ts
function activate(granite) {
	granite.registerEditor("ficha", { create: (container, doc) => createSheet(granite, container, doc) });
}
//#endregion
export { activate };
