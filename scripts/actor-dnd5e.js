//import { PF1 } from "../../../systems/pf1/pf1.js";

export class RWDND5EActor {

	static async initModule() {
		// full list of packs: classes, mythicpaths, commonbuffs
		// spells, feats, items, armors-and-shields, weapons-and-ammo, racialhd
		// races, class-abilities, monster-templates, sample-macros, roll-tables
		// ultimate-equipment, bestiary_1/2/3/4/5, conditions, skills
		//game.packs.find(p => console.log(`PF1 pack = ${p.metadata.name}`));
		// Very specific to PF1, generate the FEAT index only once (it avoids excessive re-writing of feats.db)
		await game.packs.find(p => p.metadata.name === 'armors-and-shields')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'classes')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'feats')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'items')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'racialhd')?.getIndex();	// creature types
		await game.packs.find(p => p.metadata.name === 'races')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'spells')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'weapons-and-ammo')?.getIndex();
	}

	static async createActorData(character) {
		// The main character
		let result = [ await RWPF1Actor.createOneActorData(character) ];
		// The minions
		if (character.minions?.character) {
			for (const minion of (Array.isArray(character.minions.character) ? character.minions.character : [character.minions.character])) {
				result.push (await RWPF1Actor.createOneActorData(minion));
			}
		}
		return result;
	}
		
	static async createOneActorData(character) {

		//console.log(`Parsing ${character.name}`);
		
		function addParas(string) {
			return `<p>${string.replace(/\n/g,'</p><p>')}</p>`;
		}
		function toArray(thing) {
			return (!thing || Array.isArray(thing)) ? thing : [thing];
		}
		
		// A HL file will have EITHER <xp> or <challengerating> & <xpaward>
		let actor = {
			name: character.name,
			type: (character.challengerating === undefined) ? 'character' : 'npc',		// 'npc' or 'character'
			data: {
				abilities: {},
				attributes: {},
				details: {},
				skills: {},
				traits: {},
			},
			items: []		// add items with :   items.push(new Item(itemdata).data)
		};

		return actor;
	}

	
}