//
// Simple hooks to prevent links being displayed as links if the target of the link isn't OBSERVABLE by the player.
//
const _EntityMap = {
	"JournalEntry" : "journal",
	"Actor"        : "actors",
	"RollTable"    : "tables",
	"Scene"        : "scenes",
};

/**
 * For any link in the text which points to a document which is not visible to the current player
 * it will be replaced by the non-link text (so the player will be NOT aware that a link exists)
 * @param {ActorSheet} [sheet] Sheet for renderJournalSheet and renderActorSheet hooks
 * @param {jQuery}     [html]  HTML  for renderJournalSheet and renderActorSheet hooks
 * @param {Object}     [data]  Data for renderJournalSheet and renderActorSheet hooks
 */
async function _checkRenderLinks(sheet, html, data) {	
	// sheet = ActorSheet
	// html  = jQuery
	// data  = object
	
	// Original link:
	//     <a class="entity-link" draggable="true" [ data-entity="JournalEntry" | data-pack="packname" ] data-id=".....">
	//     <i class="fas fa-th-list">::before</i>
	//     plain text
	//     </a>
	// If the "data-id" isn't observable by the current user, then replace with just "plain text"
	html.find("a.entity-link").filter( (index,a) => {
		const dataentity = a.getAttribute('data-entity');	// RollTable, JournalEntry, Actor
		if (!dataentity) {
			// Compendium packs are only limited at the PACK level, not an individual document level
			return game.packs.get(a.getAttribute('data-pack'))?.private;
		}
		const entity = _EntityMap[dataentity];
		if (!entity) {
			console.warn(`checkRenderLinks#EntityMap does not have '${entity}'`);
			return false;
		}
		const item = game[entity].get(a.getAttribute("data-id"));
		return !item || !item.testUserPermission(game.user, "LIMITED");
	}).replaceWith ( (index,a) => {
		const pos = a.indexOf("</i> ");
		return (pos<0) ? a : a.slice(pos+5);
	});
}

Hooks.once('canvasInit', () => {
	// Only check for link visibility if NOT a gm
	if (!game.user.isGM) {
		Hooks.on("renderJournalSheet", _checkRenderLinks);
		Hooks.on("renderActorSheet",   _checkRenderLinks);
	}
})
