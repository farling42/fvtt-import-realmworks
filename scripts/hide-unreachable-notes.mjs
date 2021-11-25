//
// Handle correct visibility of Notes on a Scene
//
const GS_MODULE_NAME = "realm-works-import";
const PIN_IS_REVEALED = "pinIsRevealed";
const NOTE_FLAG = `flags.${GS_MODULE_NAME}.${PIN_IS_REVEALED}`;

let original_Note_refresh;
function Note_refresh() {
	original_Note_refresh.call(this);
	// Hide the Note if the RW revealed flag is set to false
	if (!game.user.isGM && this.visible) {
		const value = this.document.getFlag(GS_MODULE_NAME, PIN_IS_REVEALED);
		if (value !== undefined && !value) this.visible = false;
	}
	return this;
}

function setNoteRevealed(notedata,visible) {
	// notedata might not exist as a Note, so setFlag is not available
	setProperty(notedata, NOTE_FLAG, visible);
}

export { setNoteRevealed };

// TODO: Add option to Note editor window

Hooks.once('init', () => {
	original_Note_refresh = Note.prototype.refresh;
	Note.prototype.refresh = Note_refresh;
})
