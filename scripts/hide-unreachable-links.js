//
// Simple hooks to prevent links being displayed as links if the target of the link isn't OBSERVABLE by the player.
//
const _EntityMap = {
	"JournalEntry" : "journal",
	"Actor"        : "actors",
	"RollTable"    : "tables",
	"Scene"        : "scenes",
};

async function _checkRenderLinks(sheet, html, data) {	
	// app  = ActorSheet
	// html = jQuery
	// data = object
	if (game.user.isGM) return;
	
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
		return !item || !item.testUserPermission(game.user, "OBSERVER");
	}).replaceWith ( (index,a) => {
		const pos = a.indexOf("</i> ");
		return (pos<0) ? a : a.slice(pos+5);
	});
}

Hooks.on("renderJournalSheet", _checkRenderLinks);
Hooks.on("renderActorSheet",   _checkRenderLinks);