// Ideally we'd override only Note#text to return GM-notes for Note tooltip, 
// but since that isn't possible we have to override Note#_drawTooltip instead :-(

const MODULE_NAME = "realm-works-import";
const PIN_GM_TEXT = "pinGmNote";
const NOTE_FLAG = `flags.${MODULE_NAME}.${PIN_GM_TEXT}`;

let original_Note_drawTooltip;
function Note_drawTooltip() {
	// Only override default if isGM and flag(MODULE_NAME,PIN_GM_TEXT) is set
	if (!game.user.isGM) return original_Note_drawTooltip.call(this);
	
	//const newtext = this.document.data.flags[MODULE_NAME]?.[PIN_GM_TEXT];
	const newtext = this.document.getFlag(MODULE_NAME, PIN_GM_TEXT);
	if (!newtext) return original_Note_drawTooltip.call(this);
	
	// Set a different label to be used while we call the original Note.prototype._drawTooltip
	//
	// Note#text          = get text()  { return this.document.label; }
	// NoteDocument#label = get label() { return this.data.text || this.entry?.name || "Unknown"; }
	// but NoteDocument#data.text can be modified :-)
	//
	let saved_text = this.document.data.text;
	this.document.data.text = newtext;
	let result = original_Note_drawTooltip.call(this);
	this.document.data.text = saved_text;
	return result;

	// The following is a copy of Note#_drawTooltip() except for first parameter to PreciseText
/*	
    // Create the Text object
    const textStyle = this._getTextStyle();
    const text = new PreciseText(newtext, textStyle);		// newtext instead of this.text
    text.visible = false;
    const halfPad = (0.5 * this.size) + 12;

    // Configure Text position
    switch ( this.data.textAnchor ) {
      case CONST.TEXT_ANCHOR_POINTS.CENTER:
        text.anchor.set(0.5, 0.5);
        text.position.set(0, 0);
        break;
      case CONST.TEXT_ANCHOR_POINTS.BOTTOM:
        text.anchor.set(0.5, 0);
        text.position.set(0, halfPad);
        break;
      case CONST.TEXT_ANCHOR_POINTS.TOP:
        text.anchor.set(0.5, 1);
        text.position.set(0, -halfPad);
        break;
      case CONST.TEXT_ANCHOR_POINTS.LEFT:
        text.anchor.set(1, 0.5);
        text.position.set(-halfPad, 0);
        break;
      case CONST.TEXT_ANCHOR_POINTS.RIGHT:
        text.anchor.set(0, 0.5);
        text.position.set(halfPad, 0);
        break;
    }
    return text;
*/
}

function setNoteGMtext(notedata,text) {
	// notedata might not exist as a Note, so setFlag is not available
	setProperty(notedata, NOTE_FLAG, text);
}

export { setNoteGMtext };

// TODO: Add option to Note editor window

Hooks.once('init', () => {
	original_Note_drawTooltip = Note.prototype._drawTooltip;
	Note.prototype._drawTooltip = Note_drawTooltip;
})
