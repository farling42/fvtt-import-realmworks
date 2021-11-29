// Ideally we'd override only Note#text to return GM-notes for Note tooltip, 
// but since that isn't possible we have to override Note#_drawTooltip instead :-(

import {libWrapper} from './libwrapper-shim.js'

const MODULE_NAME = "realm-works-import";
const PIN_GM_TEXT = "pinGmNote";
const NOTE_FLAG = `flags.${MODULE_NAME}.${PIN_GM_TEXT}`;

/**
 * If the Note has a GM-NOTE on it, then display that as the tooltip instead of the normal text
 * @param {function} [wrapped] The wrapped function provided by libWrapper
 * @param {object}   [args]    The normal arguments to Note#drawTooltip
 */
function Note_drawTooltip(wrapped, ...args) {
	// Only override default if flag(MODULE_NAME,PIN_GM_TEXT) is set
	const newtext = this.document.getFlag(MODULE_NAME, PIN_GM_TEXT);
	if (!newtext || newtext.length===0) return wrapped(...args);
	
	// Set a different label to be used while we call the original Note.prototype._drawTooltip
	//
	// Note#text          = get text()  { return this.document.label; }
	// NoteDocument#label = get label() { return this.data.text || this.entry?.name || "Unknown"; }
	// but NoteDocument#data.text can be modified :-)
	//
	let saved_text = this.document.data.text;
	this.document.data.text = newtext;
	let result = wrapped(...args);
	this.document.data.text = saved_text;
	return result;
}

/**
 * Adds a GM-only string to be displayed on the Note *instead of* the normal note text for the GM,
 * players will see the normal non-GM text.
 * @param {NoteData} [notedata]  The NoteData to which GM-only text is to be added
 * @param {String}   [text]      The text to be stored as the GM-only text for this note
 */
export function setNoteGMtext(notedata,text) {
	// notedata might not exist as a Note, so setFlag is not available
	setProperty(notedata, NOTE_FLAG, text);
}

// TODO: Add option to Note editor window

Hooks.once('canvasInit', () => {
	// This module is only required for GMs (game.user accessible from 'ready' event but not 'init' event)
	if (game.user.isGM) {
		libWrapper.register(MODULE_NAME, 'Note.prototype._drawTooltip', Note_drawTooltip, libWrapper.WRAPPER);
	}
})

/**
 * Update Note config window with a text box to allow entry of GM-text.
 * Also replace single-line of "Text Label" with a textarea to allow multi-line text.
 * @param {NoteConfig} app    The Application instance being rendered (NoteConfig)
 * @param {jQuery} html       The inner HTML of the document that will be displayed and may be modified
 * @param {object] data       The object of data used when rendering the application (from NoteConfig#getData)
 */
async function render_note_config(app, html, data) {
	// Input for GM Label
	let gmtext = data.document.getFlag(MODULE_NAME, PIN_GM_TEXT);
	if (!gmtext) gmtext = "";
	let gm_text = $(`<div class='form-group'><label>GM Label</label><div class='form-fields'><textarea name='${NOTE_FLAG}'>${gmtext}</textarea></div></div>`)
	html.find("input[name='text']").parent().parent().after(gm_text);
	
	// Multiline input for Text Label
	let initial_text = data.data.text ?? data.entry.name;
	let label = $(`<div class='form-group'><label>Player Label</label><div class='form-fields'><textarea name='text' placeholder='${data.entry.name}'>${initial_text}</textarea></div></div>`)
	html.find("input[name='text']").parent().parent().after(label);
	
	// Hide the old text label input field
	html.find("input[name='text']").parent().parent().remove();
	
	//let reveal_icon = $(`<div class='form-group'><label>Icon follows Reveal</label><div class='form-fields'><input type='checkbox' name='useRevealIcon'></div></div>`)
	//html.find("select[name='icon']").parent().parent().after(reveal_icon);
	
	// Do we hook onto  html.find("button[name='submit']") or is there a better way?
}

Hooks.on("renderNoteConfig", render_note_config);