//
// Handle correct visibility of Notes on a Scene
//

import {libWrapper} from './libwrapper-shim.js'

const MODULE_NAME = "realm-works-import";
const PIN_IS_REVEALED = "pinIsRevealed";
const NOTE_FLAG = `flags.${MODULE_NAME}.${PIN_IS_REVEALED}`;

/**
 * @param {function} [wrapper] The wrapper function provided by libWrapper
 * @param {Object}   [args]    The arguments for Note#refresh
 * @return [Note]    This Note
 */
function Note_refresh(wrapped, ...args) {
	let result = wrapped(...args);
	// Hide the Note if the RW revealed flag is set to false
	if (result.visible) {
		const value = result.document.getFlag(MODULE_NAME, PIN_IS_REVEALED);
		if (value !== undefined && !value) result.visible = false;
	}
	return result;
}

/**
 * Sets whether this Note is revealed (visible) to players; overriding the default FoundryVTT rules.
 * If this function is never called then the default FoundryVTT visibility rules will apply
 * @param [NoteData] [notedata] The NoteData whose visibility is to be set (can be used before the Note has been created)
 * @param {Boolean}  [visible]  pass in true if the Note should be revealed to players
 */
export function setNoteRevealed(notedata,visible) {
	// notedata might not exist as a Note, so setFlag is not available
	setProperty(notedata, NOTE_FLAG, visible);
}

// TODO: Add option to Note editor window

Hooks.once('ready', () => {
	// This is only required for Players, not GMs (game.user accessible from 'ready' event but not 'init' event)
	if (!game.user.isGM) {
		libWrapper.register(MODULE_NAME, 'Note.prototype.refresh', Note_refresh, libWrapper.WRAPPER);
	}
})
