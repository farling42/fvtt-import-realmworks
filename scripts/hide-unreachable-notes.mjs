//
// Handle correct visibility of Notes on a Scene
//

import {libWrapper} from './libwrapper-shim.js'

const MODULE_NAME = "realm-works-import";
const USE_PIN_REVEALED = "usePinRevealed";
const PIN_IS_REVEALED  = "pinIsRevealed";
const FLAG_IS_REVEALED  = `flags.${MODULE_NAME}.${PIN_IS_REVEALED}`;
const FLAG_USE_REVEALED = `flags.${MODULE_NAME}.${USE_PIN_REVEALED}`;
const CONFIG_TINT_REACHABLE_LINK   = "tintReachableLink";
const CONFIG_TINT_UNREACHABLE_LINK = "tintUnreachableLink";

/**
 * Wraps the default Note#refresh to allow the visibility of scene Notes to be controlled by the reveal
 * state stored in the Note (overriding the default visibility which is based on link accessibility).
 * @param {function} [wrapped] The wrapper function provided by libWrapper
 * @param {Object}   [args]    The arguments for Note#refresh
 * @return [Note]    This Note
 */
function Note_refresh(wrapped, ...args) {
	let result = wrapped(...args);
	const use_reveal = result.document.getFlag(MODULE_NAME, USE_PIN_REVEALED);
	if (use_reveal === undefined || !use_reveal) return result;
	
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
	const use_reveal = this.document.getFlag(MODULE_NAME, USE_PIN_REVEALED);
	if (use_reveal === undefined || !use_reveal) return wrapped(...args);
	
	const value = this.document.getFlag(MODULE_NAME, PIN_IS_REVEALED);
	if (value != undefined) {
		const is_linked = this.entry?.testUserPermission(game.user, "LIMITED");
		const colour = game.settings.get(MODULE_NAME, is_linked ? CONFIG_TINT_REACHABLE_LINK : CONFIG_TINT_UNREACHABLE_LINK);
		if (colour?.length > 0) this.data.iconTint = colour;
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
	setProperty(notedata, FLAG_USE_REVEALED, true);
	setProperty(notedata, FLAG_IS_REVEALED,  visible);
	// Default tint based on GM view
	let tint = game.settings.get(MODULE_NAME, notedata.entryId ? CONFIG_TINT_REACHABLE_LINK : CONFIG_TINT_UNREACHABLE_LINK);
	if (tint?.length > 0) notedata.iconTint = tint;
}

Hooks.once('canvasInit', () => {
	// This is only required for Players, not GMs (game.user accessible from 'ready' event but not 'init' event)
	if (!game.user.isGM) {
		libWrapper.register(MODULE_NAME, 'Note.prototype.refresh',          Note_refresh,         libWrapper.WRAPPER);
		libWrapper.register(MODULE_NAME, 'Note.prototype._drawControlIcon', Note_drawControlIcon, libWrapper.WRAPPER);
	}
})

//
// Update NoteConfig to handle REVEALED state
//

/**
 * Update Note config window with a text box to allow entry of GM-text.
 * Also replace single-line of "Text Label" with a textarea to allow multi-line text.
 * @param {NoteConfig} app    The Application instance being rendered (NoteConfig)
 * @param {jQuery} html       The inner HTML of the document that will be displayed and may be modified
 * @param {object] data       The object of data used when rendering the application (from NoteConfig#getData)
 */
Hooks.on("renderNoteConfig", async function (app, html, data) {
	// Check box to control use of REVEALED state
	let checked = (data.document.getFlag(MODULE_NAME, PIN_IS_REVEALED) ?? true) ? "checked" : "";
	let revealed_control = $(`<div class='form-group'><label>Revealed to Players</label><div class='form-fields'><input type='checkbox' name='${FLAG_IS_REVEALED}' ${checked}></div></div>`)
	html.find("select[name='entryId']").parent().parent().after(revealed_control);
	
	// Check box for REVEALED state
	let use_reveal = (data.document.getFlag(MODULE_NAME, USE_PIN_REVEALED) ?? false) ? "checked" : "";
	let mode_control = $(`<div class='form-group'><label>Use Reveal State</label><div class='form-fields'><input type='checkbox' name='${FLAG_USE_REVEALED}' ${use_reveal}></div></div>`)
	html.find("select[name='entryId']").parent().parent().after(mode_control);
	
	// Force a recalculation of the height
	if (!app._minimized) {
		let pos = app.position;
		pos.height = 'auto'
		app.setPosition(pos);
	}
})

Hooks.on("renderSettingsConfig", (app, html, data) => {
	// Add colour pickers to the Configure Game Settings: Module Settings menu
	let name,colour;
	name   = `${MODULE_NAME}.${CONFIG_TINT_REACHABLE_LINK}`;
	colour = game.settings.get(MODULE_NAME, CONFIG_TINT_REACHABLE_LINK);
	$('<input>').attr('type', 'color').attr('data-edit', name).val(colour).insertAfter($(`input[name="${name}"]`, html).addClass('color'));
	
	name   = `${MODULE_NAME}.${CONFIG_TINT_UNREACHABLE_LINK}`;
	colour = game.settings.get(MODULE_NAME, CONFIG_TINT_UNREACHABLE_LINK);
	$('<input>').attr('type', 'color').attr('data-edit', name).val(colour).insertAfter($(`input[name="${name}"]`, html).addClass('color'));
})

function refresh () {
	if (canvas?.ready) {
		console.warn('NOTES:refresh called');
		canvas.notes.placeables.forEach(note => note.draw());
		//for (let note of canvas.notes.objects) note.draw();
	}
}

Hooks.once('init', () => {
    game.settings.register(MODULE_NAME, CONFIG_TINT_REACHABLE_LINK, {
		name: "Note Tint Colour when linked",
		hint: "For players, the RGB value to be used to tint scene Notes if they have a reachable link (if left blank then the tint, if any, will remain unchanged).  For GMs, this is the initial Icon Tint set during import",
		scope: "world",
		type:  String,
		default: '#7CFC00',
		config: true,
		onChange: () => refresh()
	});
    game.settings.register(MODULE_NAME, CONFIG_TINT_UNREACHABLE_LINK, {
		name: "Note Tint Colour when not linked",
		hint: "For players, the RGB value to be used to tint scene Notes if they do not have a reachable link (if left blank then the tint, if any, will remain unchanged).  For GMs, this is the initial Icon Tint set during import",
		scope: "world",
		type:  String,
		default: '#c000c0',
		config: true,
		onChange: () => refresh()
	});
})