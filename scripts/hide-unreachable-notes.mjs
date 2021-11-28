//
// Handle correct visibility of Notes on a Scene
//

import {libWrapper} from './libwrapper-shim.js'

const MODULE_NAME = "realm-works-import";
const PIN_IS_REVEALED = "pinIsRevealed";
const NOTE_FLAG = `flags.${MODULE_NAME}.${PIN_IS_REVEALED}`;
const PIN_COLOUR_LINKED     = '#7CFC00';
const PIN_COLOUR_NOT_LINKED = '#c000c0';

/**
 * Wraps the default Note#refresh to allow the visibility of scene Notes to be controlled by the reveal
 * state stored in the Note (overriding the default visibility which is based on link accessibility).
 * @param {function} [wrapped] The wrapper function provided by libWrapper
 * @param {Object}   [args]    The arguments for Note#refresh
 * @return [Note]    This Note
 */
function Note_refresh(wrapped, ...args) {
	let result = wrapped(...args);
	const value = result.document.getFlag(MODULE_NAME, PIN_IS_REVEALED);
	// Use the revealed state as the visibility of the Note.
	// If the linked topic is not visible to the player then clicking will do nothing.
	if (value != undefined) {
		result.visible  = value;
	}
	return result;
}

/**
 * Wraps the default Note#_drawControlIcon so that we can override the stored this.data.iconTint based
 * on whether the link is accessible for the current player (or not). This is only done for links which
 * are using the "revealed" flag.
 * @param {function} [wrapped] The wrapper function provided by libWrapper
 * @param {Object}   [args]    The arguments for Note#_drawControlIcon
 * @return [Note]    This Note
 */
function Note_drawControlIcon(wrapped, ...args) {
	const value = this.document.getFlag(MODULE_NAME, PIN_IS_REVEALED);
	if (value != undefined) {
		this.data.iconTint = this.entry?.testUserPermission(game.user, "LIMITED") ? PIN_COLOUR_LINKED : PIN_COLOUR_NOT_LINKED;
		console.warn(`Note_drawControlIcon: iconTint = ${this.data.iconTint}`);
	}
	return wrapped(...args);
}

/**
 * Sets whether this Note is revealed (visible) to players; overriding the default FoundryVTT rules.
 * The iconTint will also be set on the Note based on whether there is a link that the player can access.
 * If this function is never called then the default FoundryVTT visibility rules will apply
 * @param [NoteData] [notedata] The NoteData whose visibility is to be set (can be used before the Note has been created)
 * @param {Boolean}  [visible]  pass in true if the Note should be revealed to players
 */
export function setNoteRevealed(notedata,visible) {
	// notedata might not exist as a Note, so setFlag is not available
	setProperty(notedata, NOTE_FLAG, visible);
	// Default tint based on GM view
	notedata.iconTint = notedata.entryId ? PIN_COLOUR_LINKED : PIN_COLOUR_NOT_LINKED;
}

// TODO: Add option to Note editor window

Hooks.once('canvasInit', () => {
	// This is only required for Players, not GMs (game.user accessible from 'ready' event but not 'init' event)
	if (!game.user.isGM) {
		libWrapper.register(MODULE_NAME, 'Note.prototype.refresh',          Note_refresh,         libWrapper.WRAPPER);
		libWrapper.register(MODULE_NAME, 'Note.prototype._drawControlIcon', Note_drawControlIcon, libWrapper.WRAPPER);
	}
})
