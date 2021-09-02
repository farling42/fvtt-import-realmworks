//import { SWADE } from "../../../systems/swade/swade.js";

export default class RWSWADEActor {

	static async initModule() {
		// Basic game system
		await game.packs.find(p => p.metadata.name === 'edges')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'hindrances')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'skills')?.getIndex();
		//await game.packs.find(p => p.metadata.name === 'action-cards')?.getIndex();
		
		// Maybe premium is available
		await game.packs.find(p => p.metadata.name === 'swade-edges')?.getIndex();	// creature types
		await game.packs.find(p => p.metadata.name === 'swade-equipment')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'swade-hindrances')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'swade-powers')?.getIndex();
		await game.packs.find(p => p.metadata.name === 'swade-skills')?.getIndex();
		//await game.packs.find(p => p.metadata.name === 'swade-macros')?.getIndex();
		//await game.packs.find(p => p.metadata.name === 'swade-bestiary')?.getIndex();
		//await game.packs.find(p => p.metadata.name === 'swade-rules')?.getIndex();
		//await game.packs.find(p => p.metadata.name === 'swade-tables')?.getIndex();
		//await game.packs.find(p => p.metadata.name === 'swade-vehicles')?.getIndex();
	}
	
	static async createActorData(character) {
		// The main character
		let result = [ await RWSWADEActor.createOneActorData(character) ];
		// The minions
		if (character.minions?.character) {
			for (const minion of (Array.isArray(character.minions.character) ? character.minions.character : [character.minions.character])) {
				result.push (await RWSWADEActor.createOneActorData(minion));
			}
		}
		return result;
	}

	static async createOneActorData(character) {

		//console.debug(`Parsing ${character.name}`);
		
		function addParas(string) {
			return `<p>${string.replace(/\n/g,'</p><p>')}</p>`;
		}
		function toArray(thing) {
			return !thing ? [] : Array.isArray(thing) ? thing : [thing];
		}
		function toFormatted(string) {
			if (!string)
				return "";
			else if (string.indexOf('   ') > 0)	// need to maintain multiple spaces
				return `<pre>${string}</pre>`;
			else
				return '<p>' + string.replaceAll('\n','<p>');
		}
		function getDice(string) {
			let plus  = string.indexOf('+');
			let minus = string.indexOf('-');
			let max = (plus>minus) ? plus : minus;
			
			if (max < 0)
				return { sides: +string.slice(1), modifier: 0 };
			else
				return { sides: +string.slice(1,max), modifier: +string.slice(max) };
		}
		async function searchPack(pack,name) {
			if (!pack) return undefined;
			let lower = name.toLowerCase();
			let pos = lower.indexOf(': ');
			let prefix = (pos < 0) ? undefined : lower.slice(0,pos);
			let bracket = lower.slice(0,pos) + ' (' + lower.slice(pos+2) + ')';
			
			let entry = pack.index.find(e => { 
				let elc = e.name.toLowerCase();
				return elc === lower || elc === prefix || elc == bracket
			});
			if (!entry) return undefined;
			
			let itemdata = (await pack.getDocument(entry._id)).data.toObject();
			if (itemdata.name.toLowerCase() === prefix) itemdata.name = name;	// restore original name
			return itemdata;
		}
		
		
		// A HL file will have EITHER <xp> or <challengerating> & <xpaward>
		let actor = {
			name: character.name,
			type: (character.role === 'pc' && character.race.term == 'Race') ? 'character' : 'npc', // 'npc' or 'character'
			relationship : character.relationship,
			data: {
				// template: common
				attributes: {},
				stats: {},
				details: {},
				powerpoints: {},
				fatigue: {},
				wounds: {},
				advances: {},
				bennies: {},
				"status": {},
				initiative: {},
				additionalStats: {},
				wildcard: true,
			},
			items: [],
		};
		if (actor.type === 'npc') {
			actor.wildcard = false;
			actor.bennies = { value: 2, max: 2 };
			actor.wounds  = { max : 0 };
		}
		
		// attributes
		// agility = { die: { sides: 4, modifier: 0 }, "wild-die" : { sides: 6 } }
		for (let attr of character.attributes.attribute) {
			let name = attr.name.toLowerCase();
			actor.data.attributes[name] = { die : getDice(attr.value) };
			
			// attribute-specific additional variables
			//switch (name) {
			//	case 'smarts'  : actor.data[name].animal = false; break;
			//	case 'spirit'  : actor.data[name].unShakeBonus = 0; break;
			//	case 'strength': actor.data[name].uncumbranceSteps = 0; break;
			//}
		}
		
		//actor.data.stats.speed     = { runningDie : 6, runningMod : 0, value: 6 };
		//actor.data.stats.toughness = { value: 0, armor: 0, modifier: 0 };
		//actor.data.stats.parry     = { value: 0, modifier: 0 };
		//actor.data.stats.size      = 0;
		
		// These are probably not required, since Toughness and Parry are calculated automatically.
		// HL traits = Pace, Parry, Toughness, Charisma, (optional: Running Die, Size)
		for (let trait of toArray(character.traits.trait)) {
			switch (trait.name) {
				case 'Running Die':
					if (!actor.data.stats.speed) actor.data.stats.speed = {};
					actor.data.stats.speed.runningDie = +trait.value.slice(1);
					break;
				case 'Pace':
					if (!actor.data.stats.speed) actor.data.stats.speed = {};
					actor.data.stats.speed.value = +trait.value;
					break;
				case 'Size':
					actor.data.stats.size = +trait.value;
					break;
				default:
					actor.data.stats[trait.name.toLowerCase()] = { value : trait.value };
			}
		}
		
		//actor.data.details.biography = { value: "" }; -- HTML statblock added here later
		
		actor.data.details.species  = { name : character.race.name };
		actor.data.details.currency = character.cash.total;
		
		//actor.data.details.wealth            = { die : 6, modifier: 0, "wild-die": 6 };
		//actor.data.details.conviction        = { value: 0, active: false };
		//actor.data.details.autoCalcToughness = true;
		//actor.data.details.autoCalcParry     = true;
		
		//actor.data.powerPoints = {};
		
		//actor.data.fatigue = { value : 0, min: 0, max: 2 };
		//actor.data.wounds  = { value: 0, min: 0, max: 3, ignored: 0 };
		actor.data.advances = {
			value: +character.xp.total,
			rank : character.rank.name,
			details: "",
		};
		
		for (let tracker of toArray(character.trackers.tracker)) {
			if (tracker.name === 'Bennies') {
				actor.data.bennies = { value: tracker.left, max: tracker.max };
			}
		}
		
		/*actor.data["status"] = {
			isShaken : false,
			isDistracted: false,
			isVulnerable: false,
			isStunned: false,
			isEntangled: false,
			isBound: false
		}
		actor.data.initiative = {
			hasHesitant : false,
			hasLevelHeaded: false,
			hasImpLevelHeaded: false,
			hasQuick: false 
			}
		actor.data.additionalStats = {};
		*/
		
		// Skills
		let basic_skill_pack = await game.packs.find(p => p.metadata.name === 'skills');
		let swade_skills_pack = await game.packs.find(p => p.metadata.name === 'swade-skills');
		for (let skill of toArray(character.skills.skill)) {
			let itemdata;
			if (swade_skills_pack) itemdata = await searchPack(swade_skills_pack, skill.name);
			if (!itemdata) itemdata = await searchPack(basic_skill_pack, skill.name);
			if (itemdata) {
				// Put in our value(s)
				if (itemdata.data.description.startsWith('See SWADE') || itemdata.data.description.startsWith('<p>See SWADE')) {
					itemdata.data.description = toFormatted(skill.description["#text"])
				}
				itemdata.data.die = foundry.utils.mergeObject(itemdata.data.die, getDice(skill.value));
			} else {
				// Create homebrew
				itemdata = {
					name: skill.name,
					type: 'skill',
					data: {
						// template itemDescription
						description: toFormatted(skill.description["#text"]),
						notes: "",
						additionalStats: "",
						// skill item
						atttribute: "",
						isCoreSkill: false,
						die: getDice(skill.value),
						"wild-die": {
							sides: 6
						},
					}
				}
			}
			actor.items.push(itemdata);
		}
		// Resources - encumbrance, load limit
		// edges
		let basic_edges_pack = await game.packs.find(p => p.metadata.name === 'edges');
		let swade_edges_pack = await game.packs.find(p => p.metadata.name === 'swade-edges');
		for (let edge of toArray(character.edges.edge)) {
			let itemdata;
			if (swade_edges_pack) itemdata = await searchPack(swade_edges_pack, edge.name);
			if (!itemdata) itemdata = await searchPack(basic_edges_pack, edge.name);
			if (itemdata) {
				if (itemdata.data.description.startsWith('See SWADE') || itemdata.data.description.startsWith('<p>See SWADE')) {
					itemdata.data.description = toFormatted(edge.description["#text"])
				}
			} else {
				itemdata = {
					name: edge.name,
					type: 'edge',
					data: {
						// template itemDescription
						description: toFormatted(edge.description["#text"]),
						//notes: "",
						//additionalStats: "",
						// edge item
						isArcaneBackground: false,
						//requirements: {
						//	value: ""
						//},
					}
				}
			}
			actor.items.push(itemdata);
			// Special check to set power points: TODO - is this always correct?
			if (edge.name.startsWith('Arcane Background')) {
				actor.data.powerPoints = { value : 10, max: 10 };
			}
		}

		let basic_hind_pack = await game.packs.find(p => p.metadata.name === 'hindrances');
		let swade_hind_pack = await game.packs.find(p => p.metadata.name === 'swade-hindrances');
		for (let hindrance of toArray(character.hindrances.hindrance)) {
			let itemdata;
			if (swade_hind_pack) itemdata = await searchPack(swade_hind_pack, hindrance.name);
			if (!itemdata) itemdata = await searchPack(basic_hind_pack, hindrance.name);
			if (itemdata) {
				if (itemdata.data.description.startsWith('See SWADE') || itemdata.data.description.startsWith('<p>See SWADE')) {
					itemdata.data.description = toFormatted(hindrance.description["#text"])
				}
			} else {
				itemdata = {
					name: hindrance.name,
					type: 'hindrance',
					data: {
						// template itemDescription
						description: toFormatted(hindrance.description["#text"]),
						//notes: "",
						//additionalStats: "",
						// hindrance item
						//major: false,
					}
				}
			}
			actor.items.push(itemdata);
		}
		for (let drawback of toArray(character.drawbacks.drawback)) {
			let itemdata = {
				name: drawback.name,
				type: 'hindrance',
				data: {
					// template itemDescription
					description: toFormatted(drawback.description["#text"]),
					notes: "",
					additionalStats: "",
					// ability item
					major: false,
				}
			}
			actor.items.push(itemdata);
		}
		
		let swade_powers_pack = await game.packs.find(p => p.metadata.name === 'swade-powers');
		for (let item of toArray(character.arcanepowers.arcanepower)) {
			let itemdata;
			if (swade_powers_pack) itemdata = await searchPack(swade_powers_pack, item.name);
			if (itemdata) {
				itemdata.data.trapping = item.trappings;
			} else {
				itemdata = {
					name: item.name,
					type: 'power',
					data: {
						// template itemDescription
						description: toFormatted(item.description["#text"]),
						notes: "",
						additionalStats: "",
						// equipable template
						euippable: false,
						equipped: false,
						// actions template
						skill: "",
						skillMod: "",
						dmgMod: "",
						additional: {},
						// power item
						rank: "",
						pp: 0,
						damage: "",
						range: item.range,
						duration: item.duration,
						trapping: item.trappings,
						arcane: "",
						skill: "",
						modifiers: [],
						// item.maintenance ?
					}
				}
			}
			actor.items.push(itemdata);
		}
		for (let item of toArray(character.superpowers.superpower)) {
			let itemdata;
			if (swade_powers_pack) itemdata = await searchPack(swade_powers_pack, item.name);
			if (itemdata) {
				itemdata.data.trapping = item.trappings;
			} else {
				itemdata = {
					name: item.name,
					type: 'power',
					data: {
						// template itemDescription
						description: toFormatted(item.description["#text"]),
						notes: "",
						additionalStats: "",
						// equipable template
						euippable: false,
						equipped: false,
						// actions template
						skill: "",
						skillMod: "",
						dmgMod: "",
						additional: {},
						// power item
						rank: "",
						pp: 0,
						damage: "",
						range: "",
						duration: "",
						trapping: "",
						arcane: "",
						skill: "",
						modifiers: [],
					}
				}
			}
			actor.items.push(itemdata);
		}

		// Gear from several different places
		let swade_equipment_pack = await game.packs.find(p => p.metadata.name === 'swade-equipment');
		for (let gear of toArray(character.gear.item)) {
			// Transfer quantity to found items
			let itemdata;
			if (swade_equipment_pack) itemdata = await searchPack(swade_equipment_pack, gear.name);
			if (itemdata) {
				itemdata.data.quantity = +gear.quantity;
			} else {
				itemdata = {
					name: gear.name,
					type: 'gear',
					data: {
						// itemDescription template
						description: toFormatted(gear.description["#text"]),
						notes: "",
						additionalStats: "",
						// physicalItem template
						quantity: +gear.quantity,
						weight: +gear.weight.value,
						price: +gear.cost.value,
						// equipable template
						euippable: false,
						equipped: false,
						// vehicular template
						isVehicular: false,
						mods: 1,
					}
				}
			}
			actor.items.push(itemdata);
		}
		for (let magicitem of toArray(character.magicitems.magicitem)) {
			// Transfer quantity to found items
			let itemdata;
			if (swade_equipment_pack) itemdata = await searchPack(swade_equipment_pack, magicitem.name);
			if (itemdata) {
				itemdata.data.quantity = +attack.quantity;
			} else {
				itemdata = {
					name: gear.name,
					type: 'gear',
					data: {
						// itemDescription template
						description: toFormatted(magicitem.description["#text"]),
						notes: "",
						additionalStats: "",
						// physicalItem template
						quantity: +attack.quantity,
						weight: 0,
						price: 0,
						// equipable template
						euippable: false,
						equipped: false,
						// vehicular template
						isVehicular: false,
						mods: 1,
					}
				}
			}
			actor.items.push(itemdata);
		}
		for (let attack of toArray(character.attacks.attack)) {

			// If attack.damage contains the name of an ability, then prefix ability name with "@" for lookup
			let dmg = attack.damage.toLowerCase();
			if (dmg[0] >= 'a' && dmg[0] <= 'z')
				dmg = '@' + dmg;

			let itemdata;
			if (swade_equipment_pack) itemdata = await searchPack(swade_equipment_pack, attack.name);
			if (itemdata) {
				// Transfer quantity + equipped to found items
				itemdata.data.quantity = +attack.quantity;
				itemdata.data.equipped = attack.equipped ? true : false;
				//itemdata.damage = dmg;   // TODO - do we need this?
			} else {
				itemdata = {
					name: attack.name,
					type: 'weapon',
					data: {
						// itemDescription template
						description: "", // HTML
						notes: attack.description["#text"], // plain text
						additionalStats: "",
						// physicalItem template
						quantity: +attack.quantity,
						weight: +attack.weight.value,
						price: +attack.cost.value,
						// equipable template
						euippable: true,
						equipped: attack.equipped ? true : false,
						// vehicular template
						isVehicular: false,
						mods: 1,
						// actions template
						skill: "",
						skillMod: "",
						dmgMod: "",
						additional: {},
						// weapon
						damage: dmg,
						range: attack.range,
						rof: 1,
						ap: 0,
						minStr: "",
						shots: 0,
						currentShots: 0,
						ammo: "",
						autoReload: false,
					}
				}
			}
			actor.items.push(itemdata);
		}
		for (let defense of toArray(character.defenses.defense)) {
			let itemdata;
			if (swade_equipment_pack) itemdata = await searchPack(swade_equipment_pack, defense.name);
			if (itemdata) {
				// Transfer quantity + equipped to found items
				itemdata.data.quantity = +defense.quantity;
				itemdata.data.equipped = defense.equipped ? true : false;
			} else if (defense.name.indexOf('Shield') == -1) {
				itemdata = {
					name: defense.name,
					type: 'armor',
					data: {
						// itemDescription template
						description: "", // HTML
						notes: defense.description["#text"], // plain text
						additionalStats: "",
						// physicalItem template
						quantity: +defense.quantity,
						weight: +defense.weight.value,
						price: +defense.cost.value,
						// equipable template
						euippable: true,
						equipped: defense.equipped ? true : false,
						// armor
						minStr: "",
						armor: +defense.defense,
						isNaturalArmor: false,
						// TODO - determine locations for homebrew items
						locations: {
							head: false,
							torso: true,
							arms: false,
							legs: false,
						}
						// shield (instead of armor), but also has actions template
						//minStr: "",
						//parry: 0,
						//cover: 0,
					}
				}
			} else {
				// SHIELD, not ARMOR
				itemdata = {
					name: defense.name,
					type: 'shield',
					data: {
						// itemDescription template
						description: "", // HTML
						notes: defense.description["#text"], // plain text
						additionalStats: "",
						// physicalItem template
						quantity: +defense.quantity,
						weight: +defense.weight.value,
						price: +defense.cost.value,
						// equipable template
						euippable: true,
						equipped: defense.equipped ? true : false,
						// actions template
						skill: "",
						skillMod: "",
						dmgMod: "",
						additional: {},
						// shield
						minStr: "",
						parry: +defense.parry,
						cover: +defense.defense,
					}
				}
			}
			actor.items.push(itemdata);
		}
		
		return actor;
	}
}