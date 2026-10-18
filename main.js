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
//#region src/questionnaire.ts
/** Answer scale, 1–5. */
var ANSWERS = [
	{
		value: 1,
		short: "DT",
		label: "Discordo totalmente"
	},
	{
		value: 2,
		short: "D",
		label: "Discordo"
	},
	{
		value: 3,
		short: "N",
		label: "Nem concordo nem discordo"
	},
	{
		value: 4,
		short: "C",
		label: "Concordo"
	},
	{
		value: 5,
		short: "CT",
		label: "Concordo totalmente"
	}
];
/** The items of each trait, by trait id, in the IPIP order. */
var ITEMS = Object.fromEntries(Object.entries({
	warmth: [[
		"Sabe consolar os outros.",
		"Gosta de reunir as pessoas.",
		"Sente as emoções dos outros.",
		"Interessa-se pela vida das outras pessoas.",
		"Anima as pessoas.",
		"Deixa as pessoas à vontade.",
		"Arranja tempo para os outros."
	], [
		"Não gosta de se envolver nos problemas dos outros.",
		"Não se interessa muito pelos outros.",
		"Tenta não pensar nos necessitados."
	]],
	intellect: [[
		"Faz comentários perspicazes.",
		"Sabe a resposta de muitas perguntas.",
		"Tende a analisar as coisas.",
		"Usa a cabeça.",
		"Aprende rápido.",
		"Rebate os argumentos dos outros.",
		"Pensa bem antes de agir.",
		"Pesa os prós e os contras."
	], [
		"Considera-se uma pessoa comum.",
		"Confunde-se com facilidade.",
		"Sabe que não é uma pessoa especial.",
		"Tem vocabulário pobre.",
		"Pula palavras difíceis quando lê."
	]],
	emotionalStability: [[
		"Raramente fica triste.",
		"Sente-se bem consigo.",
		"Supera reveses com facilidade.",
		"Na maior parte do tempo, está em paz.",
		"Não se frustra com facilidade."
	], [
		"Tem mudanças de humor frequentes.",
		"Fica triste com frequência.",
		"Não gosta de si.",
		"Sente desespero.",
		"Desanima com facilidade."
	]],
	assertiveness: [[
		"Assume o comando.",
		"Quer estar no comando.",
		"Diz o que pensa.",
		"Não tem medo de criticar.",
		"Toma as rédeas da situação.",
		"É capaz de tomar medidas duras."
	], [
		"Espera os outros tomarem a iniciativa.",
		"Nunca questiona as coisas.",
		"Deixa os outros decidirem.",
		"Deixa-se dominar pelos outros."
	]],
	gregariousness: [[
		"É a alma da festa.",
		"Adora festas grandes.",
		"Brinca muito.",
		"Gosta de estar no meio de uma multidão barulhenta.",
		"Diverte os amigos.",
		"Faz loucuras."
	], [
		"Raramente brinca.",
		"Não gosta de eventos lotados.",
		"Demora a rir de uma piada.",
		"Não gosta de música alta."
	]],
	dutifulness: [[
		"Acha que as leis devem ser aplicadas com rigor.",
		"Tenta seguir as regras.",
		"Acredita numa única religião verdadeira.",
		"Respeita a autoridade.",
		"Gosta de ficar de pé durante o hino nacional."
	], [
		"Resiste à autoridade.",
		"Quebra regras.",
		"Fala palavrões.",
		"Opõe-se à autoridade.",
		"Sabe como contornar as regras."
	]],
	socialConfidence: [[
		"Sente-se à vontade perto de outras pessoas.",
		"Conversa com muita gente diferente nas festas.",
		"Não se importa de ser o centro das atenções.",
		"Faz amigos com facilidade.",
		"Puxa conversa."
	], [
		"Acha difícil se aproximar dos outros.",
		"Costuma se sentir desconfortável perto dos outros.",
		"Tem pouco a dizer.",
		"Fica em silêncio perto de estranhos.",
		"Fica em segundo plano."
	]],
	sensitivity: [[
		"Gosta de ler.",
		"Gosta de discutir filmes e livros com os outros.",
		"Lê muito.",
		"Não gosta de filmes de ação.",
		"Chora vendo filmes.",
		"Adora flores."
	], [
		"Não gosta de assistir a apresentações de dança.",
		"Não gosta de poesia.",
		"Não gosta de ficção.",
		"Raramente percebe as próprias reações emocionais."
	]],
	distrust: [[
		"Tem dificuldade de perdoar os outros.",
		"Suspeita de segundas intenções nos outros.",
		"Fica com o pé atrás com os outros.",
		"Desconfia das pessoas.",
		"Acha que as pessoas raramente contam toda a verdade.",
		"Acha que as pessoas são essencialmente más."
	], [
		"Confia no que as pessoas dizem.",
		"Confia nos outros.",
		"Acredita que os outros têm boas intenções.",
		"Acredita que, no fundo, as pessoas são corretas."
	]],
	imagination: [[
		"Faz coisas que os outros acham estranhas.",
		"Gosta de se perder em pensamentos.",
		"Adora voos de fantasia.",
		"Adora sonhar acordado.",
		"Nada contra a corrente.",
		"Assume posições fora do comum.",
		"Faz coisas inesperadas."
	], [
		"Faz tudo conforme o manual.",
		"Raramente sonha acordado.",
		"Raramente se perde em pensamentos."
	]],
	reserve: [[
		"Revela pouco sobre si.",
		"É difícil de conhecer.",
		"Não fala muito.",
		"Reprime os sentimentos.",
		"Guarda os pensamentos para si."
	], [
		"Fala abertamente de si com os outros.",
		"Fala abertamente dos próprios sentimentos.",
		"Revela seus pensamentos íntimos.",
		"Demonstra o que sente.",
		"Fala de si de boa vontade."
	]],
	anxiety: [[
		"Tem medo de fazer a coisa errada.",
		"Sente-se sob ameaça com facilidade.",
		"Magoa-se com facilidade.",
		"Preocupa-se com as coisas.",
		"Passa tempo pensando em erros do passado.",
		"Sente culpa quando diz \"não\".",
		"Desmorona diante de reveses."
	], [
		"Não se preocupa com o que já aconteceu.",
		"Não se incomoda facilmente com as coisas.",
		"Não se deixa desanimar pelos outros."
	]],
	complexity: [[
		"Acredita na importância da arte.",
		"Adora inventar novos jeitos de fazer as coisas.",
		"Gosta de ouvir ideias novas.",
		"Leva a conversa a um nível mais alto.",
		"Prefere variedade à rotina."
	], [
		"Evita discussões filosóficas.",
		"Raramente procura um sentido mais profundo nas coisas.",
		"Não se interessa por discussões teóricas.",
		"Não se interessa por ideias abstratas.",
		"Tenta evitar pessoas complicadas."
	]],
	introversion: [[
		"Quer ficar só.",
		"Prefere fazer as coisas por conta própria.",
		"Gosta de passar tempo consigo.",
		"Procura sossego.",
		"Não se importa de comer só.",
		"Gosta do silêncio.",
		"Valoriza a própria privacidade."
	], [
		"Gosta de fazer parte de um grupo.",
		"Gosta de trabalhar em equipe.",
		"Não vive sem a companhia dos outros."
	]],
	orderliness: [[
		"Quer tudo \"do jeito certo\".",
		"Faz as tarefas logo.",
		"Gosta de ordem.",
		"Continua até tudo ficar perfeito.",
		"É exigente no trabalho."
	], [
		"Não se incomoda com pessoas bagunceiras.",
		"Não se incomoda com desordem.",
		"Deixa o quarto bagunçado.",
		"Deixa suas coisas espalhadas.",
		"Adia tarefas desagradáveis."
	]],
	emotionality: [[
		"Irrita-se facilmente.",
		"Fica com raiva facilmente.",
		"Julga os outros rapidamente.",
		"Incomoda-se com os erros dos outros.",
		"Aborrece-se com facilidade.",
		"Não suporta contradição.",
		"Julga as pessoas pela aparência."
	], [
		"Não se irrita facilmente.",
		"Tenta perdoar e esquecer.",
		"Tem uma palavra boa para todo mundo."
	]]
}).map(([trait, [plus, minus]]) => [trait, [...plus.map((text) => ({
	text,
	key: 1
})), ...minus.map((text) => ({
	text,
	key: -1
}))].map((x, i) => ({
	id: `${trait}-${i + 1}`,
	trait,
	...x
}))]));
/** Position of each item id in its trait's list (for a stable order in the file). */
var ITEM_ORDER = new Map(Object.values(ITEMS).flatMap((items) => items.map((x, i) => [x.id, i])));
var TOTAL_ITEMS = Object.values(ITEMS).reduce((n, items) => n + items.length, 0);
/**
* The scale value (0–100) the answers give for `trait`: reverse-keyed items
* count as 6 − x; the mean of the answered items (1–5) is mapped to 0–100.
* null when no item of the trait was answered.
*/
function traitScore(trait, answers) {
	let sum = 0;
	let n = 0;
	for (const item of ITEMS[trait] ?? []) {
		const a = answers[item.id];
		if (a === void 0) continue;
		sum += item.key === 1 ? a : 6 - a;
		n++;
	}
	return n === 0 ? null : Math.round((sum / n - 1) / 4 * 100);
}
//#endregion
//#region src/traits.ts
var TRAITS = [
	{
		id: "warmth",
		name: "Calor humano",
		measures: "quão empático é com os outros",
		low: "reservado, emocionalmente distante, desinteressado dos problemas alheios, guarda-se para si",
		high: "empático, acolhedor, interessado nos outros, une as pessoas, deixa os outros à vontade"
	},
	{
		id: "intellect",
		name: "Intelecto",
		measures: "quão analítico é o seu pensamento",
		low: "concreto, direto, evita complexidade, confunde-se com ideias abstratas, vocabulário simples",
		high: "analítico, perspicaz, aprende rápido, gosta de ideias abstratas, reflete antes de agir"
	},
	{
		id: "emotionalStability",
		name: "Estabilidade emocional",
		measures: "quão composto é sob pressão",
		low: "reativo, de humor instável, desanima fácil, insatisfeito consigo, desesperado sob estresse",
		high: "resiliente, estável, calmo sob pressão, supera reveses, à vontade consigo"
	},
	{
		id: "assertiveness",
		name: "Assertividade",
		measures: "quão assertivo é com os outros",
		low: "conciliador, evita conflito, deixa os outros liderarem, cede quando pressionado",
		high: "assertivo, assume o comando, diz o que pensa, dirige os outros, não teme críticas"
	},
	{
		id: "gregariousness",
		name: "Expansividade",
		measures: "quão expressivo e enérgico é",
		low: "sério, contido, introspectivo, quieto, evita multidões e barulho, sóbrio",
		high: "animado, enérgico, espontâneo, expressivo, adora festas, brinca, pode ser exagerado"
	},
	{
		id: "dutifulness",
		name: "Senso de dever",
		measures: "quanto segue regras e deveres",
		low: "inconformista, prático, resiste à autoridade, quebra regras, valoriza a liberdade",
		high: "cumpridor, respeita a autoridade, segue regras, acredita em ordem, convencional"
	},
	{
		id: "socialConfidence",
		name: "Confiança social",
		measures: "quão seguro é socialmente",
		low: "tímido, hesitante, quieto com estranhos, fica em segundo plano, difícil de abordar",
		high: "ousado, extrovertido, faz amigos fácil, à vontade com atenção, puxa conversa"
	},
	{
		id: "sensitivity",
		name: "Sensibilidade",
		measures: "quão ligado é à estética e à emoção",
		low: "pouco sentimental, objetivo, durão, prático, indiferente à arte, pouco nota emoções",
		high: "sensível, estético, intuitivo, gosta de arte e ficção, comove-se com a beleza"
	},
	{
		id: "distrust",
		name: "Desconfiança",
		measures: "quão desconfiado é dos outros",
		low: "confiante, aceita o que dizem, presume boas intenções, vê as pessoas como boas",
		high: "desconfiado, vigilante, cético, vê segundas intenções, custa a perdoar"
	},
	{
		id: "imagination",
		name: "Imaginação",
		measures: "quão imaginativo e abstrato é",
		low: "pé no chão, prático, convencional, focado em soluções, segue o manual, pouco devaneia",
		high: "imaginativo, abstrato, absorto em ideias, sonha acordado, pode ser excêntrico"
	},
	{
		id: "reserve",
		name: "Reserva",
		measures: "quanto guarda a vida pessoal",
		low: "franco, aberto, fala de sentimentos e pensamentos, fácil de conhecer, transparente",
		high: "reservado, discreto, difícil de conhecer, guarda os sentimentos para si"
	},
	{
		id: "anxiety",
		name: "Ansiedade",
		measures: "quanto tende a se preocupar e duvidar de si",
		low: "seguro, despreocupado, resiliente ao desânimo, sem culpa",
		high: "preocupado, inseguro, apreensivo, magoa-se fácil, remói erros, sente culpa"
	},
	{
		id: "complexity",
		name: "Complexidade",
		measures: "quão aberto é a ideias e experiências novas",
		low: "tradicional, prefere o familiar e a rotina, evita discussões abstratas",
		high: "experimental, aberto ao novo, gosta de variedade e de teoria, inventa jeitos novos"
	},
	{
		id: "introversion",
		name: "Introversão",
		measures: "quão autossuficiente e solitário é",
		low: "gregário, gosta de equipe, precisa de companhia, colaborativo",
		high: "autossuficiente, solitário, individualista, prefere ficar só"
	},
	{
		id: "orderliness",
		name: "Organização",
		measures: "quão organizado e disciplinado é",
		low: "flexível, tolera bagunça, espontâneo, pouco exigente, adia tarefas chatas",
		high: "perfeccionista, disciplinado, exigente, quer tudo \"do jeito certo\", termina logo"
	},
	{
		id: "emotionality",
		name: "Irritabilidade",
		measures: "quão fácil se frustra ou se irrita",
		low: "tranquilo, paciente, calmo, não se irrita fácil, perdoa rápido",
		high: "tenso, impaciente, irrita-se e frustra-se fácil, incomoda-se com erros alheios"
	}
];
var TRAIT_IDS = TRAITS.map((t) => t.id);
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
	"color",
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
	"fears",
	"scales",
	"questionnaire"
];
var SCALE_KEYS = ["value", "note"];
var ANSWERS_KEYS = ["use", "answers"];
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
var isScaleValue = (v) => Number.isInteger(v) && v >= 0 && v <= 100;
function scale(o) {
	const l = level(o, SCALE_KEYS);
	return {
		value: take(o, l.kept, "value", (v) => typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : null, isScaleValue),
		note: str(o, l.kept, "note"),
		...l
	};
}
function scalesOf(o) {
	const l = level(o, TRAIT_IDS);
	const byId = {};
	for (const id of TRAIT_IDS) {
		if (o[id] === void 0) continue;
		byId[id] = take(o, l.kept, id, (v) => scale(isObject(v) ? v : {}), isObject, scaleJSON);
	}
	return {
		byId,
		...l
	};
}
var isAnswer = (v) => Number.isInteger(v) && v >= 1 && v <= 5;
function traitAnswers(o) {
	const l = level(o, ANSWERS_KEYS);
	const answers = {};
	const badAnswers = {};
	const raw = o.answers;
	if (isObject(raw)) for (const [id, v] of Object.entries(raw)) isAnswer(v) ? answers[id] = v : badAnswers[id] = v;
	else if (raw !== void 0) l.kept.answers = {
		value: raw,
		shown: "{}"
	};
	return {
		use: take(o, l.kept, "use", (v) => v !== false, (v) => typeof v === "boolean"),
		answers,
		badAnswers,
		...l
	};
}
function questionnaireOf(o) {
	const l = level(o, TRAIT_IDS);
	const byId = {};
	for (const id of TRAIT_IDS) {
		if (o[id] === void 0) continue;
		byId[id] = take(o, l.kept, id, (v) => traitAnswers(isObject(v) ? v : {}), isObject, traitAnswersJSON);
	}
	return {
		byId,
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
		scales: take(o, l.kept, "scales", (v) => scalesOf(isObject(v) ? v : {}), isObject, scalesJSON),
		questionnaire: take(o, l.kept, "questionnaire", (v) => questionnaireOf(isObject(v) ? v : {}), isObject, questionnaireJSON),
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
		color: str(raw, k, "color"),
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
/** A scale without a value or a note leaves those keys out. */
function scaleJSON(x) {
	const o = {};
	const value = out(x.kept, "value", x.value);
	if (value !== null) o.value = value;
	const note = out(x.kept, "note", x.note);
	if (note !== "") o.note = note;
	return {
		...o,
		...x.extra
	};
}
/** Known traits in the documented order, then unknown ids. */
function scalesJSON(s) {
	const o = {};
	for (const id of TRAIT_IDS) {
		const x = s.byId[id];
		if (x) o[id] = out(s.kept, id, scaleJSON(x));
	}
	return {
		...o,
		...s.extra
	};
}
/** Answers in the items' order (unknown ids after), then the ones that are not 1–5. */
function traitAnswersJSON(x) {
	const order = (id) => ITEM_ORDER.get(id) ?? Infinity;
	const ids = Object.keys(x.answers).sort((a, b) => order(a) - order(b));
	const answers = {
		...Object.fromEntries(ids.map((id) => [id, x.answers[id]])),
		...x.badAnswers
	};
	return {
		use: out(x.kept, "use", x.use),
		answers: out(x.kept, "answers", answers),
		...x.extra
	};
}
function questionnaireJSON(q) {
	const o = {};
	for (const id of TRAIT_IDS) {
		const x = q.byId[id];
		if (x) o[id] = out(q.kept, id, traitAnswersJSON(x));
	}
	return {
		...o,
		...q.extra
	};
}
function personalityJSON(p) {
	const k = p.kept;
	return {
		traits: out(k, "traits", [...p.traits]),
		speech: out(k, "speech", p.speech),
		goal: out(k, "goal", p.goal),
		fears: out(k, "fears", p.fears),
		scales: out(k, "scales", scalesJSON(p.scales)),
		questionnaire: out(k, "questionnaire", questionnaireJSON(p.questionnaire)),
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
		color: out(k, "color", c.color),
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
/**
* Sets (or, with `null`, clears) a scale's value, keeping its note. A scale
* left with no value, no note and no unknown fields is removed.
*/
function setScale(c, id, value) {
	const byId = c.personality.scales.byId;
	const s = byId[id] ?? (byId[id] = {
		value: null,
		note: "",
		extra: {},
		kept: {}
	});
	s.value = value === null ? null : Math.min(100, Math.max(0, Math.round(value)));
	pruneScale(c, id);
}
/** Sets a scale's note (see setScale). */
function setScaleNote(c, id, note) {
	const byId = c.personality.scales.byId;
	const s = byId[id] ?? (byId[id] = {
		value: null,
		note: "",
		extra: {},
		kept: {}
	});
	s.note = note;
	pruneScale(c, id);
}
function pruneScale(c, id) {
	const byId = c.personality.scales.byId;
	const s = byId[id];
	if (s && s.value === null && s.note === "" && Object.keys(s.extra).length === 0 && Object.keys(s.kept).length === 0) {
		delete byId[id];
		delete c.personality.scales.kept[id];
	}
}
/** Whether `personality.scales` can be edited without dropping a value the sheet does not understand. */
var scalesEditable = (c) => !("personality" in c.kept) && !("scales" in c.personality.kept);
var HEX = /^#[0-9a-f]{6}$/i;
/** Colors given to characters without one, picked by their path. */
var AUTO_COLORS = [
	"#7b61ff",
	"#e5484d",
	"#30a46c",
	"#f76b15",
	"#0090ff",
	"#d6409f",
	"#12a594",
	"#ffb224",
	"#8e4ec6",
	"#6e56cf"
];
/** The character's color: its own, else its first appearance color, else one picked by its path. */
function characterColor(c, path) {
	if (c && HEX.test(c.color)) return c.color;
	const first = c?.appearance.colors.find((x) => HEX.test(x.color));
	if (first) return first.color;
	let hash = 0;
	for (const ch of path) hash = hash * 31 + ch.charCodeAt(0) >>> 0;
	return AUTO_COLORS[hash % AUTO_COLORS.length];
}
/** Whether `personality.questionnaire` can be edited without dropping a value the sheet does not understand. */
var questionnaireEditable = (c) => !("personality" in c.kept) && !("questionnaire" in c.personality.kept);
var answersOf = (c, trait) => {
	const byId = c.personality.questionnaire.byId;
	return byId[trait] ?? (byId[trait] = {
		use: true,
		answers: {},
		badAnswers: {},
		extra: {},
		kept: {}
	});
};
/** Removes a trait's entry once it holds nothing but the defaults. */
function pruneAnswers(c, trait) {
	const x = c.personality.questionnaire.byId[trait];
	const empty = (o) => Object.keys(o).length === 0;
	if (x && x.use && empty(x.answers) && empty(x.badAnswers) && empty(x.extra) && empty(x.kept)) {
		delete c.personality.questionnaire.byId[trait];
		delete c.personality.questionnaire.kept[trait];
	}
}
/** Records (or, with `null`, removes) the answer 1–5 to an item. */
function setAnswer(c, trait, item, value) {
	const x = answersOf(c, trait);
	delete x.badAnswers[item];
	if (value === null) delete x.answers[item];
	else x.answers[item] = value;
	pruneAnswers(c, trait);
}
/** Whether a trait's answers are used to calculate its position. */
function setUseAnswers(c, trait, use) {
	answersOf(c, trait).use = use;
	pruneAnswers(c, trait);
}
/** Forgets every answer (the scale values stay). */
function clearAnswers(c) {
	const q = c.personality.questionnaire;
	q.byId = {};
	q.kept = {};
}
//#endregion
//#region src/search.ts
var EXACT = 6;
var PREFIX = 5;
var INITIALS = 4;
var INSIDE = 3;
var SUBSEQUENCE = 2;
var TYPO = 1;
var PATH = .5;
/** Bonus when the whole query is one of the names. */
var WHOLE_NAME = 10;
/** Words this long (or longer) tolerate one typo. */
var TYPO_MIN = 4;
/** Lower case, no accents. */
var fold = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
var wordsOf = (s) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
/** `q` appears in order in `s`, starting at its first character. */
function isSubsequence(q, s) {
	if (q[0] !== s[0]) return false;
	let i = 0;
	for (const ch of s) if (ch === q[i] && ++i === q.length) return true;
	return false;
}
/** Edit distance with transpositions (optimal string alignment), stopping above `max`. */
function distance(a, b, max) {
	if (Math.abs(a.length - b.length) > max) return max + 1;
	let prev2 = [];
	let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
	for (let i = 1; i <= a.length; i++) {
		const row = [i];
		let best = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			let d = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
			row.push(d);
			best = Math.min(best, d);
		}
		if (best > max) return max + 1;
		prev2 = prev;
		prev = row;
	}
	return prev[b.length];
}
/** `q` is one typo away from `w` or from the start of `w` (a word still being typed). */
function nearly(q, w) {
	if (q.length < TYPO_MIN) return false;
	for (let len = q.length - 1; len <= q.length + 1; len++) {
		if (len > w.length) break;
		if (distance(q, w.slice(0, len), 1) <= 1) return true;
	}
	return distance(q, w, 1) <= 1;
}
/** Best score of the query word `q` against one name, already folded (0: no match). */
function wordScore(q, words, initials) {
	let best = 0;
	for (const w of words) {
		if (w === q) return EXACT;
		if (w.startsWith(q)) best = Math.max(best, PREFIX);
	}
	if (best) return best;
	if (q.length > 1 && isSubsequence(q, initials)) return INITIALS;
	for (const w of words) if (w.includes(q)) return INSIDE;
	for (let k = 0; k < words.length; k++) if (isSubsequence(q, words.slice(k).join(" "))) return SUBSEQUENCE;
	for (const w of words) if (nearly(q, w)) return TYPO;
	return 0;
}
/** Relevance of `item` for `query`: 0 when it does not match, 1 for an empty query. */
function score(item, query) {
	const qs = wordsOf(query);
	if (qs.length === 0) return 1;
	const names = item.names.map((n) => {
		const words = wordsOf(n);
		return {
			words,
			initials: words.map((w) => w[0]).join(""),
			whole: words.join(" ")
		};
	});
	const path = fold(item.path);
	let total = 0;
	for (const q of qs) {
		let best = 0;
		for (const n of names) best = Math.max(best, wordScore(q, n.words, n.initials));
		if (!best && path.includes(q)) best = PATH;
		if (!best) return 0;
		total += best;
	}
	const whole = qs.join(" ");
	if (names.some((n) => n.whole === whole)) total += WHOLE_NAME;
	return total;
}
/** The items that match `query`, most relevant first (ties keep their order). */
function rank(items, query, searchable) {
	return items.map((item, i) => ({
		item,
		i,
		s: score(searchable(item), query)
	})).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.item);
}
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
/** Every file under `root` (default: the vault root) whose path passes `keep`, sorted by path. */
async function walkFiles(granite, keep, maxDirs = MAX_DIRS, root = "") {
	const found = [];
	const queue = [root];
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
/** Files read at the same time. */
var PARALLEL_READS = 8;
/** What the sheet needs of the character file `path` holding `text`. */
function characterInfo(path, text) {
	const r = parse(text);
	if (!r.ok) return {
		path,
		name: "",
		relations: [],
		valid: false,
		relationsEditable: false
	};
	return {
		path,
		name: r.data.name.trim(),
		relations: r.data.relations.map((x) => ({
			character: x.character,
			type: x.type
		})),
		valid: true,
		relationsEditable: !("relations" in r.data.kept)
	};
}
/**
* One character. The text of an open tab (with its unsaved edits) wins over
* the file on disk: on purpose, the index shows what the user sees in the
* other tabs, even before it is saved (a write there is refused by the kernel
* meanwhile, so nothing is lost). A file that cannot be read or parsed has no
* name and no relations.
*/
async function readCharacter(granite, path) {
	try {
		return characterInfo(path, granite.documents.text(path) ?? await granite.files.readText(path));
	} catch {
		return {
			path,
			name: "",
			relations: [],
			valid: false,
			relationsEditable: false
		};
	}
}
/** Every character of the vault with its name and relations (see readCharacter). */
async function loadCharacters(granite, maxDirs = MAX_DIRS) {
	const walk = await walkFiles(granite, isCharacter, maxDirs);
	const characters = new Array(walk.paths.length);
	const read = (path) => readCharacter(granite, path);
	for (let i = 0; i < walk.paths.length; i += PARALLEL_READS) {
		const batch = walk.paths.slice(i, i + PARALLEL_READS);
		(await Promise.all(batch.map(read))).forEach((c, j) => characters[i + j] = c);
	}
	return {
		characters,
		partial: walk.partial
	};
}
//#endregion
//#region src/overlay.ts
var PARTIAL_LIST = "Lista parcial — refine a busca";
/** Items shown at most in a picker. */
var PICKER_MAX = 300;
var blobURL = (bytes, path) => URL.createObjectURL(new Blob([bytes], { type: imageMime(path) }));
/**
* Overlays drawn in `layer`; `page` holds the elements that get the focus
* back. `alive` is false once the owner is destroyed (late results dropped).
*/
function createOverlays(granite, layer, page, alive) {
	/** Releases what the open overlay holds (its blob URLs, timers). */
	let overlayCleanup = null;
	const close = (restore) => {
		const cleanup = overlayCleanup;
		overlayCleanup = null;
		cleanup?.();
		layer.replaceChildren();
		if (!(restore instanceof HTMLElement)) return;
		const key = restore.dataset.key;
		(restore.isConnected ? restore : key ? [...page.querySelectorAll("[data-key]")].find((e) => e.dataset.key === key) : void 0)?.focus();
	};
	const overlay = (content, label, cls = "", cleanup) => {
		close();
		const back = document.activeElement;
		const closeThis = () => {
			if (o.isConnected) close(back);
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
				closeThis();
			}
		});
		o.addEventListener("click", (e) => {
			if (e.target === o) closeThis();
		});
		o.append(content);
		layer.replaceChildren(o);
		overlayCleanup = cleanup ?? null;
		return {
			el: o,
			close: closeThis
		};
	};
	const picker = (opts) => {
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
				p = granite.files.readBytes(path).then((bytes) => closed || !alive() ? null : blobURL(bytes, path), () => null);
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
			const nameOf = opts.name ?? baseName;
			const items = rank(all, q, (p) => ({
				names: [nameOf(p), baseName(p)],
				path: p
			}));
			status.textContent = all.length === 0 ? opts.empty : items.length === 0 ? "Nada encontrado" : "";
			status.hidden = status.textContent === "";
			observer?.disconnect();
			list.replaceChildren(...items.slice(0, PICKER_MAX).map((path, i) => {
				const b = button("", i === 0 && q.trim() ? "pg-picker-item is-best" : "pg-picker-item", () => {
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
					text: nameOf(path)
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
			if (closed || !alive()) return;
			all = r.paths;
			partialNote.hidden = !r.partial;
			show();
		}, () => {
			if (closed) return;
			status.textContent = "Não foi possível listar os arquivos";
		});
	};
	return {
		overlay,
		close,
		picker
	};
}
//#endregion
//#region src/scale.ts
/** Bubbles closer than this (in scale units) are stacked vertically. */
var OVERLAP = 4;
var STEP = 1;
var BIG_STEP = 10;
var clamp = (v) => Math.min(100, Math.max(0, Math.round(v)));
/** The value under the pointer, from the line's box. */
function valueAt(line, clientX) {
	const r = line.getBoundingClientRect();
	return r.width > 0 ? clamp((clientX - r.left) / r.width * 100) : 50;
}
/** The value a key gives, or undefined when the key is not a slider key. */
function keyValue(key, shift, current) {
	const base = current ?? 50;
	const step = shift ? BIG_STEP : STEP;
	switch (key) {
		case "ArrowLeft":
		case "ArrowDown": return current === null ? base : clamp(base - step);
		case "ArrowRight":
		case "ArrowUp": return current === null ? base : clamp(base + step);
		case "PageDown": return clamp(base - BIG_STEP);
		case "PageUp": return clamp(base + BIG_STEP);
		case "Home": return 0;
		case "End": return 100;
	}
}
/** Vertical slot (0, 1, 2…) of each marker so that close bubbles do not hide each other. */
function stackSlots(values) {
	const slots = values.map(() => 0);
	const placed = [];
	values.forEach((v, i) => {
		if (v === null) return;
		let slot = 0;
		while (placed.some((p) => p.slot === slot && Math.abs(p.v - v) < OVERLAP)) slot++;
		slots[i] = slot;
		placed.push({
			v,
			slot
		});
	});
	return slots;
}
var setAria = (el, value) => {
	if (value === null) el.removeAttribute("aria-valuenow");
	else el.setAttribute("aria-valuenow", String(value));
	el.setAttribute("aria-valuetext", value === null ? "Sem valor" : String(value));
};
function scaleTrack(opts) {
	const { trait, markers } = opts;
	const line = h("div", { class: "pg-scale-line" });
	const slots = stackSlots(markers.map((m) => m.value));
	const maxSlot = Math.max(0, ...slots);
	line.style.setProperty("--pg-scale-rows", String(maxSlot + 1));
	const place = (dot, value) => {
		dot.hidden = value === null;
		if (value !== null) dot.style.left = `${value}%`;
	};
	/** Pointer drag on `target`, moving `dot`; commits on release. */
	const drag = (target, dot, m, startAt) => {
		target.addEventListener("pointerdown", (e) => {
			if (opts.readonly || m.locked || e.button !== 0) return;
			const start = startAt(e);
			if (start === null) return;
			e.preventDefault();
			e.stopPropagation();
			target.focus({ preventScroll: true });
			let value = start;
			place(dot, value);
			setAria(target, value);
			dot.classList.add("is-dragging");
			try {
				target.setPointerCapture(e.pointerId);
			} catch {}
			const moveTo = (ev) => {
				value = valueAt(line, ev.clientX);
				place(dot, value);
				setAria(target, value);
			};
			const stop = () => {
				target.removeEventListener("pointermove", moveTo);
				target.removeEventListener("pointerup", end);
				target.removeEventListener("pointercancel", cancel);
				dot.classList.remove("is-dragging");
			};
			const end = (ev) => {
				stop();
				moveTo(ev);
				if (value !== m.value) opts.onCommit(m.key, value);
			};
			const cancel = () => {
				stop();
				place(dot, m.value);
				setAria(target, m.value);
			};
			target.addEventListener("pointermove", moveTo);
			target.addEventListener("pointerup", end);
			target.addEventListener("pointercancel", cancel);
		});
	};
	const keys = (target, dot, m) => {
		target.addEventListener("keydown", (e) => {
			if (opts.readonly || m.locked) return;
			if (opts.single && (e.key === "Delete" || e.key === "Backspace")) {
				if (m.value === null) return;
				e.preventDefault();
				place(dot, null);
				opts.onCommit(m.key, null);
				return;
			}
			const v = keyValue(e.key, e.shiftKey, m.value);
			if (v === void 0) return;
			e.preventDefault();
			if (v === m.value) return;
			place(dot, v);
			setAria(target, v);
			opts.onCommit(m.key, v);
		});
	};
	const slider = (el, m, label) => {
		el.setAttribute("role", "slider");
		el.setAttribute("aria-label", label);
		el.setAttribute("aria-valuemin", "0");
		el.setAttribute("aria-valuemax", "100");
		setAria(el, m.value);
		if (opts.readonly || m.locked) el.setAttribute("aria-readonly", "true");
		el.tabIndex = 0;
	};
	const bubble = (m, slot) => {
		const dot = h("span", { class: "pg-scale-dot" });
		if (m.color) dot.style.setProperty("--pg-dot", m.color);
		if (m.size) dot.style.setProperty("--pg-dot-size", `${m.size}px`);
		dot.style.setProperty("--pg-dot-slot", String(slot));
		if (m.locked) dot.classList.add("is-locked");
		place(dot, m.value);
		return dot;
	};
	if (opts.single) {
		const m = markers[0];
		const dot = bubble(m, 0);
		dot.setAttribute("aria-hidden", "true");
		line.append(h("span", { class: "pg-scale-rule" }), dot);
		line.dataset.key = opts.dataKey;
		slider(line, m, trait.name);
		line.title = m.value === null ? "Clique para posicionar" : `${trait.name}: ${m.value}`;
		drag(line, dot, m, (e) => valueAt(line, e.clientX));
		keys(line, dot, m);
	} else {
		line.append(h("span", { class: "pg-scale-rule" }));
		markers.forEach((m, i) => {
			if (m.value === null) return;
			const dot = bubble(m, slots[i]);
			dot.dataset.key = `${opts.dataKey}:${m.key}`;
			dot.title = `${m.label}: ${m.value}`;
			slider(dot, m, `${m.label} — ${trait.name}`);
			drag(dot, dot, m, () => m.value);
			keys(dot, dot, m);
			line.append(dot);
		});
	}
	if (opts.readonly) line.classList.add("is-readonly");
	return h("div", { class: "pg-scale" }, line, h("div", { class: "pg-scale-poles" }, h("span", {
		class: "pg-scale-pole is-low",
		text: trait.low
	}), h("span", {
		class: "pg-scale-pole is-high",
		text: trait.high
	})));
}
//#endregion
//#region src/compare.ts
var VIEW_ID = "comparacao";
var FULL_VIEW_ID = `personagens.${VIEW_ID}`;
var COMPARE_TITLE = "Comparação de personalidades";
/** Bubble diameter by role (`role` field): the main characters stand out. */
var SIZES = {
	protagonista: 24,
	antagonista: 24,
	coadjuvante: 18
};
var SMALL = 13;
var bubbleSize = (role) => SIZES[role.trim().toLowerCase()] ?? SMALL;
var within = (path, folder) => folder === "" || path.startsWith(`${folder}/`);
/** The state as the view got it, cleaned up (it comes from another plugin's call). */
function readState(raw) {
	const o = typeof raw === "object" && raw !== null ? raw : {};
	return {
		paths: Array.isArray(o.paths) ? [...new Set(o.paths.filter((p) => typeof p === "string" && p !== ""))] : [],
		folder: typeof o.folder === "string" ? o.folder : null
	};
}
/** Same characters, or same folder: the same tab. */
function compareKey(state) {
	const s = readState(state);
	return s.folder !== null ? `folder:${s.folder}` : `paths:${[...s.paths].sort().join("|")}`;
}
/** Opens (or focuses) the comparison of `state`; false on a Granite without view tabs. */
async function openComparison(granite, state) {
	if (typeof granite.views?.open !== "function") return false;
	return granite.views.open(FULL_VIEW_ID, state, { key: compareKey(state) });
}
function createComparison(granite, container, ctx) {
	const start = readState(ctx.state);
	const folder = start.folder;
	let destroyed = false;
	/** The characters compared, in order. In folder mode: the folder's, then the ones added. */
	let members = folder === null ? start.paths : [];
	/** Folder mode: characters added from elsewhere, and the folder's removed. */
	const added = [];
	const removed = /* @__PURE__ */ new Set();
	/** null: unreadable or invalid. */
	const chars = /* @__PURE__ */ new Map();
	const hidden = /* @__PURE__ */ new Set();
	const locked = /* @__PURE__ */ new Set();
	let loading = true;
	let partial = false;
	const root = h("div", { class: "pg-root pg-compare" });
	const page = h("div", { class: "pg-page pg-compare-page" });
	const layer = h("div", { class: "pg-layer" });
	root.append(page, layer);
	container.append(root);
	const overlays = createOverlays(granite, layer, page, () => !destroyed);
	const name = (path) => chars.get(path)?.name.trim() || baseName(path);
	const toast = (m) => {
		if (!destroyed) granite.ui.toast(m);
	};
	const read = async (path) => {
		try {
			const r = parse(granite.documents.text(path) ?? await granite.files.readText(path));
			return r.ok ? r.data : null;
		} catch {
			return null;
		}
	};
	const readAll = async (paths) => {
		const got = await Promise.all(paths.map(async (p) => [p, await read(p)]));
		for (const [p, c] of got) chars.set(p, c);
	};
	/** Folder mode: the folder's characters again (plus the ones added, minus the removed). */
	const walk = async () => {
		if (folder === null) return;
		const r = await walkFiles(granite, isCharacter, void 0, folder);
		partial = !!r.partial;
		members = [.../* @__PURE__ */ new Set([...r.paths.filter((p) => !removed.has(p)), ...added])];
	};
	let gen = 0;
	/** Reads everything again (the newest call wins). */
	const refresh = async () => {
		const mine = ++gen;
		try {
			await walk();
			await readAll(members);
		} catch (e) {
			console.error(e);
		}
		if (destroyed || mine !== gen) return;
		loading = false;
		for (const p of [...chars.keys()]) if (!members.includes(p)) chars.delete(p);
		render();
	};
	const pending = /* @__PURE__ */ new Set();
	let timer;
	let walkAgain = false;
	const schedule = (path) => {
		if (path) pending.add(path);
		else walkAgain = true;
		clearTimeout(timer);
		timer = setTimeout(() => {
			timer = void 0;
			if (walkAgain) {
				walkAgain = false;
				pending.clear();
				refresh();
				return;
			}
			const paths = [...pending].filter((p) => members.includes(p));
			pending.clear();
			readAll(paths).then(() => !destroyed && render());
		}, 150);
	};
	const subs = [granite.files.onDidChange((c) => {
		const from = c.from;
		if (folder !== null) {
			if (c.type === "changed") {
				if (members.includes(c.path)) schedule(c.path);
			} else if (within(c.path, folder) || from !== void 0 && within(from, folder) || members.includes(c.path) || from !== void 0 && members.includes(from)) {
				if (from !== void 0) renameMember(from, c.path);
				schedule(null);
			}
			return;
		}
		if (c.type === "changed") {
			if (members.includes(c.path)) schedule(c.path);
		} else if (c.type === "deleted") {
			const gone = members.filter((p) => p === c.path || p.startsWith(`${c.path}/`));
			if (gone.length) {
				members = members.filter((p) => !gone.includes(p));
				for (const p of gone) chars.delete(p);
				render();
			}
		} else if (c.type === "renamed" && from !== void 0) {
			if (renameMember(from, c.path)) schedule(null);
		}
	}), granite.documents.onDidChange((d) => {
		if (members.includes(d.path)) schedule(d.path);
	})];
	/** Follows a rename of a member (or a folder above it); true when one moved. */
	function renameMember(from, to) {
		const move = (p) => p === from ? to : p.startsWith(`${from}/`) ? to + p.slice(from.length) : p;
		let moved = false;
		members = members.map((p) => {
			const n = move(p);
			if (n !== p) {
				moved = true;
				chars.set(n, chars.get(p) ?? null);
				chars.delete(p);
				for (const set of [hidden, locked]) if (set.delete(p)) set.add(n);
			}
			return n;
		});
		for (let i = 0; i < added.length; i++) added[i] = move(added[i]);
		return moved;
	}
	/** One write at a time per character. */
	const writes = /* @__PURE__ */ new Map();
	const writeScale = (path, trait, value) => {
		const next = (writes.get(path) ?? Promise.resolve()).then(async () => {
			const who = name(path);
			try {
				const disk = granite.documents.text(path) === null ? await granite.files.readText(path) : "";
				const r = parse(granite.documents.text(path) ?? disk);
				if (!r.ok) throw new Error(INVALID_FILE);
				if (!scalesEditable(r.data)) toast(`A ficha de ${who} tem a escala em formato não reconhecido — edite como texto`);
				else {
					setScale(r.data, trait, value);
					await granite.files.write(path, serialize(r.data));
					chars.set(path, r.data);
				}
			} catch (e) {
				toast(`Não foi possível gravar na ficha de ${who}: ${e instanceof Error ? e.message : String(e)}`);
			}
			if (!destroyed) render();
		});
		writes.set(path, next);
	};
	const remove = (path) => {
		members = members.filter((p) => p !== path);
		if (folder !== null) {
			removed.add(path);
			const i = added.indexOf(path);
			if (i >= 0) added.splice(i, 1);
		}
		chars.delete(path);
		render("cmp:add");
	};
	const add = (path) => {
		if (members.includes(path)) return;
		members = [...members, path];
		if (folder !== null) {
			removed.delete(path);
			added.push(path);
		}
		read(path).then((c) => {
			if (destroyed) return;
			chars.set(path, c);
			render(`cmp:row:${path}:name`);
		});
	};
	/** Names of the characters listed by the picker. */
	const names = /* @__PURE__ */ new Map();
	const pick = () => overlays.picker({
		title: "Adicionar personagem",
		empty: "Nenhum outro personagem (.character) no vault",
		load: async () => {
			const r = await loadCharacters(granite);
			for (const x of r.characters) names.set(x.path, x.name);
			return {
				paths: r.characters.map((x) => x.path).filter((p) => !members.includes(p)),
				partial: r.partial
			};
		},
		name: (p) => names.get(p) || baseName(p),
		pick: add
	});
	const open = (path) => {
		granite.documents.open(path).then((ok) => ok || toast("Não foi possível abrir o arquivo"), () => toast("Não foi possível abrir o arquivo"));
	};
	const toggle = (set, path, focus) => {
		if (set.has(path)) set.delete(path);
		else set.add(path);
		render(focus);
	};
	const title = () => {
		if (folder !== null) return folder === "" ? "Personagens do vault" : `Personagens — ${folder.slice(folder.lastIndexOf("/") + 1)}`;
		if (members.length === 0) return COMPARE_TITLE;
		const shown = members.slice(0, 3).map(name);
		return members.length > 3 ? `${shown.join(", ")} +${members.length - 3}` : shown.join(", ");
	};
	const row = (path) => {
		const c = chars.get(path);
		const dot = h("span", { class: "pg-cmp-color" });
		dot.style.setProperty("--pg-dot", characterColor(c ?? null, path));
		dot.style.setProperty("--pg-dot-size", `${bubbleSize(c?.role ?? "")}px`);
		const link = button(name(path), "pg-link", () => open(path));
		link.title = path;
		link.dataset.key = `cmp:row:${path}:name`;
		const eye = button("👁", "pg-icon-btn pg-cmp-eye", () => toggle(hidden, path, `cmp:row:${path}:eye`), `${hidden.has(path) ? "Mostrar" : "Ocultar"} ${name(path)} no mapa`);
		eye.dataset.key = `cmp:row:${path}:eye`;
		eye.setAttribute("aria-pressed", String(hidden.has(path)));
		const lock = button(locked.has(path) ? "🔒" : "🔓", "pg-icon-btn pg-cmp-lock", () => toggle(locked, path, `cmp:row:${path}:lock`), `${locked.has(path) ? "Destravar" : "Travar"} ${name(path)}`);
		lock.dataset.key = `cmp:row:${path}:lock`;
		lock.setAttribute("aria-pressed", String(locked.has(path)));
		const rm = button("×", "pg-icon-btn pg-remove", () => remove(path), `Tirar ${name(path)} da comparação`);
		rm.dataset.key = `cmp:row:${path}:remove`;
		const li = h("li", { class: "pg-row pg-cmp-row" }, dot, link);
		if (c === null) li.append(h("span", {
			class: "pg-cited-type",
			text: INVALID_FILE
		}));
		else if (c?.role) li.append(h("span", {
			class: "pg-cited-type",
			text: c.role
		}));
		li.append(h("div", { class: "pg-row-tools" }, eye, lock, rm));
		li.classList.toggle("is-hidden", hidden.has(path));
		return li;
	};
	const card = (t) => {
		const markers = members.filter((p) => !hidden.has(p) && chars.get(p)).map((p) => {
			const c = chars.get(p);
			return {
				key: p,
				label: name(p),
				value: c.personality.scales.byId[t.id]?.value ?? null,
				color: characterColor(c, p),
				size: bubbleSize(c.role),
				locked: locked.has(p) || !scalesEditable(c)
			};
		});
		const without = markers.filter((m) => m.value === null).map((m) => m.label);
		return h("div", { class: "pg-scale-card" }, h("div", { class: "pg-scale-head" }, h("div", { class: "pg-scale-title" }, h("span", {
			class: "pg-scale-name",
			text: t.name
		}), h("span", {
			class: "pg-scale-measures",
			text: t.measures
		}))), scaleTrack({
			trait: t,
			markers,
			dataKey: `cmp:${t.id}`,
			onCommit: (p, v) => writeScale(p, t.id, v)
		}), without.length ? h("p", {
			class: "pg-cmp-without",
			text: `Sem valor: ${without.join(", ")}`
		}) : null);
	};
	/** A drag in progress: redraws wait for its end (they would drop the bubble being dragged). */
	let dragging = false;
	let renderPending = false;
	page.addEventListener("pointerdown", (e) => {
		if (e.target.closest?.(".pg-scale-dot")) dragging = true;
	}, true);
	const dragEnd = () => {
		if (!dragging) return;
		dragging = false;
		setTimeout(() => {
			if (renderPending && !destroyed) render();
		}, 0);
	};
	window.addEventListener("pointerup", dragEnd, true);
	window.addEventListener("pointercancel", dragEnd, true);
	function render(focus) {
		if (destroyed) return;
		if (dragging) {
			renderPending = true;
			return;
		}
		renderPending = false;
		const active = document.activeElement;
		const keep = focus ?? (active instanceof HTMLElement && page.contains(active) ? active.dataset.key : void 0);
		const scroll = container.scrollTop;
		const addBtn = button("Adicionar personagem", "pg-add", pick);
		addBtn.dataset.key = "cmp:add";
		const subtitle = folder !== null ? `Pasta ${folder === "" ? "raiz do vault" : folder} e subpastas — ${members.length} personage${members.length === 1 ? "m" : "ns"}` : `${members.length} personage${members.length === 1 ? "m" : "ns"}`;
		const list = h("ul", { class: "pg-list pg-cmp-list" }, ...members.map(row));
		if (loading) list.append(h("li", {
			class: "pg-empty",
			text: "Carregando…"
		}));
		else if (members.length === 0) list.append(h("li", {
			class: "pg-empty",
			text: folder !== null ? "Nenhum personagem nesta pasta." : "Nenhum personagem — adicione alguns para comparar."
		}));
		page.replaceChildren(h("header", { class: "pg-section pg-cmp-header" }, h("h2", {
			class: "pg-cmp-title",
			text: COMPARE_TITLE
		}), h("p", {
			class: "pg-scale-measures",
			text: subtitle
		}), partial ? h("p", {
			class: "pg-picker-status",
			text: "Lista parcial — pasta grande demais"
		}) : null), h("section", {
			class: "pg-section",
			attrs: { "aria-label": "Personagens" }
		}, list, addBtn), h("section", {
			class: "pg-section",
			attrs: { "aria-label": "Escala de personalidade" }
		}, h("div", { class: "pg-scales pg-cmp-scales" }, ...TRAITS.map(card))));
		ctx.setTitle(title());
		container.scrollTop = scroll;
		if (keep) [...page.querySelectorAll("[data-key]")].find((e) => e.dataset.key === keep)?.focus({ preventScroll: true });
	}
	render();
	refresh();
	return {
		focus() {
			if (destroyed) return;
			(page.querySelector("[data-key='cmp:add']") ?? root).focus({ preventScroll: true });
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			clearTimeout(timer);
			overlays.close();
			for (const d of subs) d.dispose();
			window.removeEventListener("pointerup", dragEnd, true);
			window.removeEventListener("pointercancel", dragEnd, true);
			root.remove();
		}
	};
}
//#endregion
//#region src/questionnaire-dialog.ts
var QUESTIONNAIRE_TITLE = "Questionário de personalidade";
var APPLIED = "Escala de personalidade atualizada";
/** How many of the trait's items are answered. */
var answered = (c, trait) => {
	const answers = c?.personality.questionnaire.byId[trait]?.answers ?? {};
	return (ITEMS[trait] ?? []).filter((x) => answers[x.id] !== void 0).length;
};
/** The first trait without answers (where a new session picks up), else the first. */
function startPage(c) {
	const i = TRAITS.findIndex((t) => answered(c, t.id) === 0);
	return i < 0 ? 0 : i;
}
function showQuestionnaire(host) {
	const RESULT = TRAITS.length;
	let page = startPage(host.data());
	/** Traits skipped with "Pular traço" in this session: not applied by default. */
	const skipped = /* @__PURE__ */ new Set();
	/** "Apagar respostas" asks once more before forgetting everything. */
	let confirmClear = false;
	const box = h("div", { class: "pg-picker pg-dialog pg-quiz" });
	const o = host.overlay(box, QUESTIONNAIRE_TITLE, "is-quiz");
	box.addEventListener("keydown", (e) => {
		if (e.key !== "Tab") return;
		const focusable = [...box.querySelectorAll("button, input")].filter((x) => !x.disabled);
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	});
	const progress = () => {
		const c = host.data();
		const n = TRAITS.reduce((sum, t) => sum + answered(c, t.id), 0);
		const pct = Math.round(n / TOTAL_ITEMS * 100);
		const bar = h("div", { class: "pg-quiz-bar" });
		bar.style.width = `${pct}%`;
		return h("div", { class: "pg-quiz-progress" }, h("div", {
			class: "pg-quiz-track",
			attrs: {
				role: "progressbar",
				"aria-label": "Respondidas",
				"aria-valuemin": "0",
				"aria-valuemax": "100",
				"aria-valuenow": String(pct)
			}
		}, bar), h("span", {
			class: "pg-quiz-pct",
			text: `${pct}%`
		}));
	};
	const go = (p, focus) => {
		page = p;
		confirmClear = false;
		render(focus);
	};
	const traitPage = (index) => {
		const t = TRAITS[index];
		const entry = host.data()?.personality.questionnaire.byId[t.id];
		const answers = entry?.answers ?? {};
		const use = h("input", { attrs: {
			type: "checkbox",
			id: `${host.uid}-quiz-use`
		} });
		use.checked = entry?.use ?? true;
		use.dataset.key = "quiz:use";
		use.addEventListener("change", () => {
			const v = use.checked;
			if (!host.edit((d) => setUseAnswers(d, t.id, v))) use.checked = !v;
		});
		const head = h("div", {
			class: "pg-quiz-row pg-quiz-head",
			attrs: { "aria-hidden": "true" }
		}, h("span", {
			class: "pg-quiz-text",
			text: "Afirmação"
		}), ...ANSWERS.map((a) => h("span", {
			class: "pg-quiz-answer-head",
			text: a.short,
			attrs: { title: a.label }
		})));
		const rows = ITEMS[t.id].map((item) => {
			const row = h("div", {
				class: "pg-quiz-row",
				attrs: {
					role: "radiogroup",
					"aria-label": item.text
				}
			}, h("span", {
				class: "pg-quiz-text",
				text: item.text
			}));
			for (const a of ANSWERS) {
				const r = h("input", {
					class: `pg-quiz-radio is-${a.value}`,
					attrs: {
						type: "radio",
						name: `${host.uid}-quiz-${item.id}`,
						"aria-label": a.label,
						title: a.label
					}
				});
				r.value = String(a.value);
				r.checked = answers[item.id] === a.value;
				r.dataset.key = `quiz:${item.id}:${a.value}`;
				r.addEventListener("change", () => {
					if (!r.checked) return;
					if (host.edit((d) => setAnswer(d, t.id, item.id, a.value))) box.querySelector(".pg-quiz-progress")?.replaceWith(progress());
					else r.checked = false;
				});
				row.append(h("label", { class: "pg-quiz-answer" }, r));
			}
			return row;
		});
		return [h("div", { class: "pg-quiz-card" }, h("div", { class: "pg-quiz-trait" }, h("div", { class: "pg-scale-title" }, h("h4", {
			class: "pg-quiz-trait-name",
			text: t.name
		}), h("span", {
			class: "pg-scale-measures",
			text: t.measures
		})), h("label", {
			class: "pg-quiz-use",
			attrs: { for: use.id }
		}, use, document.createTextNode(" Usar estas respostas para calcular a posição"))), h("div", { class: "pg-quiz-items" }, head, ...rows))];
	};
	/** Per trait: current value, calculated value and whether it is applied by default. */
	const results = () => {
		const c = host.data();
		return TRAITS.map((t) => {
			const entry = c?.personality.questionnaire.byId[t.id];
			const current = c?.personality.scales.byId[t.id]?.value ?? null;
			const used = entry?.use ?? true;
			const calc = used ? traitScore(t.id, entry?.answers ?? {}) : null;
			return {
				t,
				current,
				calc,
				why: !used ? "não usado" : calc === null ? "sem respostas" : "",
				apply: calc !== null && !skipped.has(t.id) && calc !== current
			};
		});
	};
	const resultPage = () => {
		const rows = results();
		const list = h("div", { class: "pg-quiz-results" });
		for (const r of rows) {
			const cb = h("input", { attrs: {
				type: "checkbox",
				"aria-label": `Aplicar ${r.t.name}`
			} });
			cb.checked = r.apply;
			cb.disabled = r.calc === null;
			cb.dataset.key = `quiz:apply:${r.t.id}`;
			cb.dataset.trait = r.t.id;
			list.append(h("label", { class: "pg-quiz-result" }, cb, h("span", {
				class: "pg-quiz-result-name",
				text: r.t.name
			}), h("span", {
				class: "pg-quiz-result-values",
				text: `${r.current ?? "—"} → ${r.calc ?? r.why}`
			})));
		}
		const clear = button(confirmClear ? "Confirmar: apagar todas as respostas" : "Apagar respostas", "pg-btn pg-quiz-clear", () => {
			if (!confirmClear) {
				confirmClear = true;
				render("quiz:clear");
				return;
			}
			if (host.edit((d) => clearAnswers(d))) go(RESULT, "quiz:clear");
		});
		clear.dataset.key = "quiz:clear";
		return [
			h("p", {
				class: "pg-picker-status",
				text: "Marque os traços cuja posição calculada deve substituir a atual. Depois, ajuste arrastando as bolinhas."
			}),
			list,
			h("div", { class: "pg-quiz-clear-row" }, clear)
		];
	};
	const apply = () => {
		const chosen = [...box.querySelectorAll(".pg-quiz-results input:checked")].map((x) => x.dataset.trait);
		const values = new Map(results().map((r) => [r.t.id, r.calc]));
		const changes = chosen.map((id) => [id, values.get(id) ?? null]).filter(([, v]) => v !== null);
		if (changes.length > 0 && !host.edit((d) => changes.forEach(([id, v]) => setScale(d, id, v)))) return;
		o.close();
		if (changes.length > 0) {
			host.applied();
			host.toast(APPLIED);
		}
	};
	const nav = (label, key, onClick, cls = "pg-btn", disabled = false) => {
		const b = button(label, cls, onClick);
		b.dataset.key = key;
		b.disabled = disabled;
		return b;
	};
	function render(focus) {
		const name = host.name();
		const atResult = page === RESULT;
		const body = atResult ? resultPage() : traitPage(page);
		const left = h("div", { class: "pg-quiz-nav" }, nav("Cancelar", "quiz:cancel", () => o.close()));
		const right = h("div", { class: "pg-quiz-nav" });
		if (atResult) right.append(nav("Voltar", "quiz:prev", () => go(RESULT - 1, "quiz:prev")), nav("Aplicar", "quiz:apply", apply, "pg-btn pg-btn-primary"));
		else {
			left.append(nav("Pular restantes", "quiz:skipAll", () => go(RESULT, "quiz:apply")));
			right.append(nav("Anterior", "quiz:prev", () => go(page - 1, "quiz:prev"), "pg-btn", page === 0), nav("Pular traço", "quiz:skip", () => {
				skipped.add(TRAITS[page].id);
				go(page + 1, page + 1 === RESULT ? "quiz:apply" : "quiz:skip");
			}), nav(page === RESULT - 1 ? "Ver resultado" : "Próximo", "quiz:next", () => {
				skipped.delete(TRAITS[page].id);
				go(page + 1, page + 1 === RESULT ? "quiz:apply" : "quiz:next");
			}, "pg-btn pg-btn-primary"));
		}
		box.replaceChildren(h("h3", {
			class: "pg-picker-title",
			text: atResult ? `Resultado — ${name}` : QUESTIONNAIRE_TITLE
		}), h("p", {
			class: "pg-picker-status",
			text: `Responda pensando em como ${name} é — não em como você é. Para um resultado mais preciso, responda ao maior número possível de afirmações.`
		}), progress(), h("div", { class: "pg-quiz-body" }, ...body), h("div", { class: "pg-picker-actions pg-quiz-actions" }, left, right));
		const target = focus ? box.querySelector(`[data-key="${focus}"]`) : null;
		(target && !target.disabled ? target : box.querySelector("input, button"))?.focus();
	}
	render();
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
/** Relation types suggested back as themselves for the reciprocal relation. */
var SYMMETRIC_RELATIONS = [
	"rival",
	"amigo",
	"amiga",
	"inimigo",
	"interesse amoroso"
];
var COLOR_SUGGESTIONS = [
	"cabelo",
	"olhos",
	"pele",
	"roupa"
];
var IMAGE_MISSING = "Imagem não encontrada";
var CHIP_DRAFT = "Apelido ou traço digitado e não adicionado — pressione Enter";
var SCALES_UNKNOWN = "Escala de personalidade em formato não reconhecido — edite como texto";
var OPEN_FAILED = "Não foi possível abrir o arquivo";
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
	/** Traits whose note field is open. */
	const openNotes = /* @__PURE__ */ new Set();
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
	/** The vault's characters; null until first read. */
	let index = null;
	/** The same characters by path. */
	let byPath = /* @__PURE__ */ new Map();
	/** What the relations section last showed from the index (see indexView). */
	let shownView = "";
	let indexGen = 0;
	let indexTimer;
	const subs = [];
	const infoOf = (path) => byPath.get(path);
	/** A character's name, else its file name. */
	const label = (path) => infoOf(path)?.name || baseName(path);
	/** Characters changed since the index was read, to read again one by one. */
	const changed = /* @__PURE__ */ new Set();
	/** A full read is scheduled (it covers `changed`) or running. */
	let fullScheduled = false;
	let fullRunning = 0;
	const setIndex = (r) => {
		index = r;
		byPath = new Map(r.characters.map((c) => [c.path, c]));
		renderRelations();
	};
	/** Reads the index again (the newest read wins) and redraws the relations. */
	const refreshIndex = () => {
		clearTimeout(indexTimer);
		indexTimer = void 0;
		fullScheduled = false;
		changed.clear();
		const gen = ++indexGen;
		fullRunning++;
		return loadCharacters(granite).then((r) => {
			if (!destroyed && gen === indexGen) setIndex(r);
			return r;
		}).finally(() => {
			fullRunning--;
			if (changed.size > 0) arm();
		});
	};
	/** Reads again only the characters in `changed` and updates their entries. */
	const refreshChanged = async () => {
		indexTimer = void 0;
		if (fullRunning > 0 || !index) return;
		const paths = [...changed];
		changed.clear();
		const gen = indexGen;
		const infos = await Promise.all(paths.map((p) => readCharacter(granite, p)));
		if (destroyed || gen !== indexGen || !index) return;
		const next = new Map(byPath);
		for (const info of infos) next.set(info.path, info);
		setIndex({
			characters: [...next.values()].sort((a, b) => a.path.localeCompare(b.path)),
			partial: index.partial
		});
	};
	const arm = () => {
		if (destroyed) return;
		clearTimeout(indexTimer);
		indexTimer = setTimeout(() => fullScheduled ? void refreshIndex().catch(() => {}) : void refreshChanged().catch(() => {}), 300);
	};
	/** The whole vault is read again (a character or folder was created, removed or renamed). */
	const scheduleIndex = () => {
		fullScheduled = true;
		arm();
	};
	/** Only `p`, a character whose content changed, is read again. */
	const scheduleOne = (p) => {
		changed.add(p);
		if (!fullScheduled) arm();
	};
	/** walkFiles skips hidden paths: their changes never touch the index. */
	const isHidden = (p) => p.split("/").some((x) => x.startsWith("."));
	/** Whether the index has characters inside the folder `p`. */
	const holdsIndexed = (p) => index === null || index.characters.some((c) => c.path.startsWith(`${p}/`));
	/** Whether `p` is a folder now, by the kind its parent's listing gives it. */
	const isFolder = async (p) => {
		const slash = p.lastIndexOf("/");
		return (await granite.files.list(slash < 0 ? "" : p.slice(0, slash)).catch(() => [])).some((e) => e.path === p && e.kind === "dir");
	};
	const fullIf = (cond) => void Promise.resolve(cond).then((yes) => yes && scheduleIndex());
	subs.push(granite.files.onDidChange((c) => {
		if (c.path === doc.path && c.type !== "renamed") return;
		const here = !isHidden(c.path);
		const from = c.from !== void 0 && !isHidden(c.from) ? c.from : void 0;
		switch (c.type) {
			case "changed":
				if (here && isCharacter(c.path)) scheduleOne(c.path);
				return;
			case "deleted": return fullIf(here && (isCharacter(c.path) || holdsIndexed(c.path)));
			case "renamed":
				if (here && isCharacter(c.path) || from !== void 0 && (isCharacter(from) || holdsIndexed(from))) return fullIf(true);
				return fullIf(here && isFolder(c.path));
			case "created":
				if (!here) return;
				return fullIf(isCharacter(c.path) || isFolder(c.path));
		}
	}), granite.documents.onDidChange((d) => {
		if (d.path !== doc.path && isCharacter(d.path) && d.status === "saved") scheduleOne(d.path);
	}));
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
	const overlays = createOverlays(granite, layer, page, () => !destroyed);
	const overlay = overlays.overlay;
	const closeOverlay = overlays.close;
	const showPicker = overlays.picker;
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
		}), h("div", { class: "pg-grid" }, labeled("Nome em japonês", field("nameJapanese", c.nameJapanese, (d, v) => d.nameJapanese = v, { placeholder: "星野 あかり" })), labeled("Romaji", field("nameRomaji", c.nameRomaji, (d, v) => d.nameRomaji = v, { placeholder: "Hoshino Akari" }))), chips("nicknames", "Apelidos", (d) => d.nicknames), h("div", { class: "pg-grid pg-grid-4" }, labeled("Idade", field("age", c.age, (d, v) => d.age = v)), labeled("Aniversário", field("birthday", c.birthday, (d, v) => d.birthday = v, { placeholder: "dd/mm" })), labeled("Altura", field("height", c.height, (d, v) => d.height = v, { placeholder: "1,62 m" })), labeled("Papel na história", field("role", c.role, (d, v) => d.role = v, { list: "roles" }))), ownColor(c)));
	};
	/** The character's color (bubbles, comparison); "Automática" goes back to the derived one. */
	const ownColor = (c) => {
		const picker = h("input", {
			class: "pg-color",
			attrs: {
				type: "color",
				"aria-label": "Cor do personagem"
			}
		});
		picker.value = characterColor(c, doc.path);
		picker.id = `${uid}-charColor`;
		picker.dataset.key = "charColor";
		picker.disabled = isReadonly();
		const auto = button("Automática", "pg-btn pg-color-auto", () => edit((d) => d.color = "", {
			rerender: true,
			focus: "charColor"
		}), "Usar a cor automática (a primeira cor da aparência)");
		auto.dataset.key = "charColor:auto";
		auto.hidden = !c.color || isReadonly();
		picker.addEventListener("input", () => {
			if (!picker.isConnected) return;
			const v = picker.value;
			if (edit((d) => d.color = v)) {
				auto.hidden = false;
				paintColor();
			}
		});
		const row = h("div", { class: "pg-own-color" }, picker, auto);
		return h("div", { class: "pg-field pg-own-color-field" }, h("label", {
			class: "pg-label",
			text: "Cor do personagem",
			attrs: { for: `${uid}-charColor` }
		}), row);
	};
	/** Applies the character's color to the bubbles without redrawing. */
	const paintColor = () => {
		root.style.setProperty("--pg-char", characterColor(data, doc.path));
		const picker = page.querySelector("[data-key=\"charColor\"]");
		if (picker && data && document.activeElement !== picker) picker.value = characterColor(data, doc.path);
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
				if (edit((d) => d.appearance.colors[i].color = v, { guard: colorCount })) paintColor();
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
	/** "Escala de personalidade": the 16 traits, each a line with this character's bubble and a note. */
	const scales = (c) => {
		const editable = scalesEditable(c);
		const ro = isReadonly() || !editable;
		const grid = h("div", { class: "pg-scales" });
		for (const t of TRAITS) {
			const s = c.personality.scales.byId[t.id];
			const value = s?.value ?? null;
			const note = s?.note ?? "";
			const open = openNotes.has(t.id);
			const noteBtn = button("✎", "pg-icon-btn pg-scale-note-btn", () => {
				if (openNotes.has(t.id)) openNotes.delete(t.id);
				else openNotes.add(t.id);
				renderScales(openNotes.has(t.id) ? `scale:${t.id}:note` : `scale:${t.id}:noteBtn`);
			}, `Nota: ${t.name}`);
			noteBtn.dataset.key = `scale:${t.id}:noteBtn`;
			noteBtn.setAttribute("aria-expanded", String(open));
			noteBtn.classList.toggle("has-note", note.trim() !== "");
			if (note.trim()) noteBtn.title = `Nota: ${note}`;
			const tools = h("div", { class: "pg-row-tools" }, noteBtn);
			if (value !== null && !ro) {
				const clear = button("×", "pg-icon-btn pg-remove", () => commitScale(t.id, null, `scale:${t.id}`), `Limpar ${t.name}`);
				clear.dataset.key = `scale:${t.id}:clear`;
				tools.append(clear);
			}
			const card = h("div", { class: "pg-scale-card" }, h("div", { class: "pg-scale-head" }, h("div", { class: "pg-scale-title" }, h("span", {
				class: "pg-scale-name",
				text: t.name
			}), h("span", {
				class: "pg-scale-measures",
				text: t.measures
			})), tools), scaleTrack({
				trait: t,
				single: true,
				dataKey: `scale:${t.id}`,
				readonly: ro,
				markers: [{
					key: t.id,
					label: ownName(),
					value
				}],
				onCommit: (id, v) => commitScale(id, v, `scale:${id}`)
			}));
			if (open || ro && note) {
				const noteField = field(`scale:${t.id}:note`, note, (d, v) => setScaleNote(d, t.id, v), {
					multiline: true,
					placeholder: "Onde o traço aparece, cenas de exemplo, conflitos…",
					label: `Nota: ${t.name}`,
					class: "pg-scale-note"
				});
				if (!editable) noteField.readOnly = true;
				noteField.addEventListener("input", () => noteBtn.classList.toggle("has-note", noteField.value.trim() !== ""));
				card.append(noteField);
			}
			grid.append(card);
		}
		const notice = editable ? null : h("p", {
			class: "pg-banner-detail pg-scales-unknown",
			text: SCALES_UNKNOWN
		});
		const quiz = ro || !questionnaireEditable(c) ? null : button("Questionário", "pg-btn pg-quiz-open", openQuestionnaire, "Questionário: responder afirmações sobre o personagem para calcular as posições");
		if (quiz) quiz.dataset.key = "quiz:open";
		const compare = typeof granite.views?.open === "function" ? button("Comparar com…", "pg-btn pg-compare-open", () => void openComparison(granite, { paths: [doc.path] }), "Comparar a personalidade com a de outros personagens") : null;
		if (compare) compare.dataset.key = "compare:open";
		return h("div", { class: "pg-field pg-scales-block" }, h("div", { class: "pg-scales-head" }, h("h3", {
			class: "pg-label pg-subtitle",
			text: "Escala de personalidade"
		}), h("div", { class: "pg-scales-actions" }, compare, quiz)), notice, grid);
	};
	const openQuestionnaire = () => showQuestionnaire({
		uid,
		name: ownName,
		data: () => data,
		edit: (apply) => edit(apply),
		overlay,
		applied: () => renderScales(),
		toast: (m) => granite.ui.toast(m)
	});
	const commitScale = (id, v, focus) => {
		if (edit((d) => setScale(d, id, v))) renderScales(focus);
	};
	/** Redraws only the scales, focusing `focus` (else keeping the focus). */
	const renderScales = (focus) => {
		if (destroyed || !data) return;
		const old = page.querySelector(".pg-scales-block");
		if (!old) return;
		const snap = focus ? {
			key: focus,
			start: null,
			end: null
		} : old.contains(document.activeElement) ? snapshot() : null;
		old.replaceWith(scales(data));
		restore(snap);
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
	})), scales(c));
	/** This character's name for the other sheets' messages. */
	const ownName = () => data?.name.trim() || baseName(doc.path);
	/** Whether `target` is a known character that does not point back here yet. */
	const lacksReciprocal = (target) => {
		const info = infoOf(target);
		return !!info && info.valid && info.relationsEditable && target !== doc.path && !info.relations.some((x) => x.character === doc.path);
	};
	/** Adds the relation `target` → this character in `target`'s own file. */
	const writeReciprocal = async (target, type) => {
		const other = label(target);
		try {
			const disk = granite.documents.text(target) === null ? await granite.files.readText(target) : "";
			const r = parse(granite.documents.text(target) ?? disk);
			if (!r.ok) throw new Error(INVALID_FILE);
			if ("relations" in r.data.kept) {
				if (!destroyed) granite.ui.toast(`A ficha de ${other} tem relações em formato não reconhecido — edite como texto`);
			} else if (r.data.relations.some((x) => x.character === doc.path)) {
				if (!destroyed) granite.ui.toast(`A ficha de ${other} já tem essa relação`);
			} else {
				const rel = newRelation(doc.path);
				rel.type = type;
				r.data.relations.push(rel);
				await granite.files.write(target, serialize(r.data));
				if (!destroyed) granite.ui.toast(`Relação adicionada na ficha de ${other}`);
			}
		} catch (e) {
			if (!destroyed) granite.ui.toast(`Não foi possível adicionar na ficha de ${other}: ${e instanceof Error ? e.message : String(e)}`);
		}
		if (!destroyed) await refreshIndex().catch(() => {});
	};
	/** Asks the type of the reciprocal relation, then writes it. */
	const showReciprocal = (target, type) => {
		const other = label(target);
		const title = `Adicionar também na ficha de ${other}`;
		const input = h("input", {
			class: "pg-input pg-recip-type",
			attrs: {
				type: "text",
				placeholder: "tipo (opcional)",
				"aria-label": "Tipo de relação",
				list: `${uid}-relations`
			}
		});
		input.value = SYMMETRIC_RELATIONS.includes(type.trim().toLowerCase()) ? type.trim() : "";
		const submit = () => {
			const v = input.value.trim();
			o.close();
			writeReciprocal(target, v);
		};
		input.addEventListener("keydown", (e) => {
			if (e.key !== "Enter") return;
			e.preventDefault();
			submit();
		});
		const box = h("div", { class: "pg-picker pg-dialog" }, h("h3", {
			class: "pg-picker-title",
			text: title
		}), h("p", {
			class: "pg-picker-status",
			text: `${other} → ${ownName()}`
		}), input, h("div", { class: "pg-picker-actions" }, button("Cancelar", "pg-btn", () => o.close()), button("Adicionar", "pg-btn pg-btn-primary", submit)));
		const o = overlay(box, title);
		input.focus();
	};
	/** Adds a relation to `path` on this sheet, focusing its type. */
	const addRelation = (path) => edit((d) => d.relations.push(newRelation(path)), {
		rerender: true,
		focus: `rel:${data ? data.relations.length : 0}:type`
	});
	/** Who points to this character, with the types each one gave. */
	const citers = () => (index?.characters ?? []).filter((x) => x.path !== doc.path && x.relations.some((r) => r.character === doc.path)).map((x) => ({
		path: x.path,
		types: [...new Set(x.relations.filter((r) => r.character === doc.path).map((r) => r.type.trim()).filter(Boolean))]
	}));
	/** Everything the relations section shows from the index, to skip redraws that change nothing. */
	const indexView = (c) => JSON.stringify([
		index === null,
		c.relations.map((r) => [label(r.character), lacksReciprocal(r.character)]),
		citers().map((x) => [
			x.path,
			label(x.path),
			x.types
		])
	]);
	const relations = (c) => {
		shownView = indexView(c);
		const list = h("ul", { class: "pg-list" });
		c.relations.forEach((r, i) => {
			const link = button(r.character ? label(r.character) : "(sem personagem)", "pg-link", () => r.character && open(r.character));
			link.title = r.character;
			link.dataset.key = `rel:${i}:link`;
			const type = field(`rel:${i}:type`, r.type, (d, v) => d.relations[i].type = v, {
				placeholder: "tipo (rival, irmã…)",
				list: "relations",
				label: "Tipo de relação",
				guard: relationTargets
			});
			const extra = [];
			if (!isReadonly() && lacksReciprocal(r.character)) {
				const back = button("⇄", "pg-icon-btn pg-recip", () => showReciprocal(r.character, r.type), `Adicionar também na ficha de ${label(r.character)}`);
				back.dataset.key = `rel:${i}:back`;
				extra.push(back);
			}
			list.append(h("li", { class: "pg-row" }, link, type, rowTools("rel", i, c.relations.length, (d) => d.relations, relationTargets, extra)));
		});
		if (c.relations.length === 0) list.append(h("li", {
			class: "pg-empty",
			text: isReadonly() ? "—" : "Nenhuma relação ainda."
		}));
		const add = addButton("rel", "Adicionar relação", () => showPicker({
			title: "Adicionar relação",
			empty: "Nenhum outro personagem (.character) no vault",
			load: async () => {
				const fresh = refreshIndex();
				const r = index ?? await fresh;
				if (index) fresh.catch(() => {});
				return {
					paths: r.characters.map((x) => x.path).filter((p) => p !== doc.path),
					partial: r.partial
				};
			},
			name: label,
			pick: addRelation
		}));
		return section("relations", "Relações", list, add, citedBy(c));
	};
	/** "Citado por": the characters whose relations point to this one (read-only). */
	const citedBy = (c) => {
		const list = h("ul", { class: "pg-list pg-cited" });
		if (!index) list.append(h("li", {
			class: "pg-empty",
			text: "Carregando…"
		}));
		else {
			const from = citers();
			for (const x of from) {
				const link = button(label(x.path), "pg-link", () => open(x.path));
				link.title = x.path;
				link.dataset.key = `cited:${x.path}:link`;
				const row = h("li", { class: "pg-row" }, link, h("span", {
					class: "pg-cited-type",
					text: x.types.join(", ")
				}));
				if (!isReadonly() && !c.relations.some((r) => r.character === x.path)) {
					const back = button("Retribuir", "pg-btn pg-cited-back", () => addRelation(x.path), `Retribuir: adicionar ${label(x.path)} nas relações de ${ownName()}`);
					back.dataset.key = `cited:${x.path}:back`;
					row.append(back);
				}
				list.append(row);
			}
			if (from.length === 0) list.append(h("li", {
				class: "pg-empty",
				text: "Nenhum personagem cita este ainda."
			}));
		}
		return h("div", { class: "pg-field" }, h("h3", {
			class: "pg-label pg-subtitle",
			text: "Citado por"
		}), list);
	};
	/** Redraws only the relations section (after the index changed), keeping the focus in it. */
	const renderRelations = () => {
		if (destroyed || !data) return;
		const old = page.querySelector(".pg-section-relations");
		if (!old || indexView(data) === shownView) return;
		const snap = old.contains(document.activeElement) ? snapshot() : null;
		old.replaceWith(relations(data));
		restore(snap);
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
		root.style.setProperty("--pg-char", characterColor(c, doc.path));
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
	refreshIndex().catch(() => {});
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
			clearTimeout(indexTimer);
			for (const d of subs) d.dispose();
			subs.length = 0;
			urls.clear();
			for (const url of made) URL.revokeObjectURL(url);
			made.clear();
			root.remove();
		}
	};
}
//#endregion
//#region src/main.ts
var paths = (args) => Array.isArray(args[0]) ? args[0].filter((p) => typeof p === "string") : [];
function activate(granite) {
	granite.registerEditor("ficha", { create: (container, doc) => createSheet(granite, container, doc) });
	if (typeof granite.registerView !== "function") return;
	granite.registerView(VIEW_ID, { create: (container, ctx) => createComparison(granite, container, ctx) });
	granite.commands.register("compare", (...args) => openComparison(granite, { paths: paths(args) }));
	granite.commands.register("compareFolder", (...args) => {
		const folder = paths(args)[0];
		return folder === void 0 ? false : openComparison(granite, { folder });
	});
}
//#endregion
export { activate };
