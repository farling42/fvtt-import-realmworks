// Ideally we'd override only Note#text to return GM-notes for Note tooltip, 
// but since that isn't possible we have to override Note#_drawTooltip instead :-(

import {libWrapper} from './libwrapper-shim.js'

const MODULE_NAME = "realm-works-import";
const PIN_GM_TEXT = "pinGmNote";
const NOTE_FLAG = `flags.${MODULE_NAME}.${PIN_GM_TEXT}`;

function Note_drawTooltip(wrapped, ...args) {
	// Only override default if flag(MODULE_NAME,PIN_GM_TEXT) is set
	const newtext = this.document.getFlag(MODULE_NAME, PIN_GM_TEXT);
	if (!newtext) return wrapped(...args);
	
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

export function setNoteGMtext(notedata,text) {
	// notedata might not exist as a Note, so setFlag is not available
	setProperty(notedata, NOTE_FLAG, text);
}

// TODO: Add option to Note editor window

Hooks.once('ready', () => {
	// This module is only required for GMs (game.user accessible from 'ready' event but not 'init' event)
	if (game.user.isGM) {
		libWrapper.register(MODULE_NAME, 'Note.prototype._drawTooltip', Note_drawTooltip, libWrapper.WRAPPER);
	}
})
