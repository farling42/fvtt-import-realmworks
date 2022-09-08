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
			const lower = name.toLowerCase();
			const pos = lower.indexOf(': ');
			const prefix = (pos < 0) ? undefined : lower.slice(0,pos);
			const bracket = lower.slice(0,pos) + ' (' + lower.slice(pos+2) + ')';
			
			const entry = pack.index.find(e => { 
				let elc = e.name.toLowerCase();
				return elc === lower || elc === prefix || elc == bracket
			});
			if (!entry) return undefined;
			
			let itemdata = (await pack.getDocument(entry._id)).toObject();
			if (itemdata.name.toLowerCase() === prefix) itemdata.name = name;	// restore original name
			return itemdata;
		}
		
		
		// A HL file will have EITHER <xp> or <challengerating> & <xpaward>
		let actor = {
			name: character.name,
			type: (character.role === 'pc' && character.race.term == 'Race') ? 'character' : 'npc', // 'npc' or 'character'
			relationship : character.relationship,
			system: {
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
		for (const attr of character.attributes.attribute) {
			let name = attr.name.toLowerCase();
			actor.system.attributes[name] = { die : getDice(attr.value) };
			
			// attribute-specific additional variables
			//switch (name) {
			//	case 'smarts'  : actor.data[name].animal = false; break;
			//	case 'spirit'  : actor.data[name].unShakeBonus = 0; break;
			//	case 'strength': actor.data[name].uncumbranceSteps = 0; break;
			//}
		}
		
		//actor.system.stats.speed     = { runningDie : 6, runningMod : 0, value: 6 };
		//actor.system.stats.toughness = { value: 0, armor: 0, modifier: 0 };
		//actor.system.stats.parry     = { value: 0, modifier: 0 };
		//actor.system.stats.size      = 0;
		
		// These are probably not required, since Toughness and Parry are calculated automatically.
		// HL traits = Pace, Parry, Toughness, Charisma, (optional: Running Die, Size)
		for (const trait of toArray(character.traits.trait)) {
			switch (trait.name) {
				case 'Running Die':
					if (!actor.system.stats.speed) actor.system.stats.speed = {};
					actor.system.stats.speed.runningDie = +trait.value.slice(1);
					break;
				case 'Pace':
					if (!actor.system.stats.speed) actor.system.stats.speed = {};
					actor.system.stats.speed.value = +trait.value;
					break;
				case 'Size':
					actor.system.stats.size = +trait.value;
					break;
				default:
					actor.system.stats[trait.name.toLowerCase()] = { value : trait.value };
			}
		}
		
		//actor.system.details.biography = { value: "" }; -- HTML statblock added here later
		
		actor.system.details.species  = { name : character.race.name };
		actor.system.details.currency = character.cash.total;
		
		//actor.system.details.wealth            = { die : 6, modifier: 0, "wild-die": 6 };
		//actor.system.details.conviction        = { value: 0, active: false };
		//actor.system.details.autoCalcToughness = true;
		//actor.system.details.autoCalcParry     = true;
		
		//actor.system.powerPoints = {};
		
		//actor.system.fatigue = { value : 0, min: 0, max: 2 };
		//actor.system.wounds  = { value: 0, min: 0, max: 3, ignored: 0 };
		actor.system.advances = {
			value: +character.xp.total,
			rank : character.rank.name,
			details: "",
		};
		
		for (const tracker of toArray(character.trackers.tracker)) {
			if (tracker.name === 'Bennies') {
				actor.system.bennies = { value: tracker.left, max: tracker.max };
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
		actor.system.initiative = {
			hasHesitant : false,
			hasLevelHeaded: false,
			hasImpLevelHeaded: false,
			hasQuick: false 
			}
		actor.system.additionalStats = {};
		*/
		
		// Skills
		const basic_skill_pack  = await game.packs.find(p => p.metadata.name === 'skills');
		const swade_skills_pack = await game.packs.find(p => p.metadata.name === 'swade-skills');
		for (const skill of toArray(character.skills.skill)) {
			let itemdata;
			if (swade_skills_pack) itemdata = await searchPack(swade_skills_pack, skill.name);
			if (!itemdata) itemdata = await searchPack(basic_skill_pack, skill.name);
			if (itemdata) {
				// Put in our value(s)
				if (itemdata.system.description.startsWith('See SWADE') || itemdata.system.description.startsWith('<p>See SWADE')) {
					itemdata.system.description = toFormatted(skill.description["#text"])
				}
				itemdata.system.die = foundry.utils.mergeObject(itemdata.system.die, getDice(skill.value));
			} else {
				// Create homebrew
				itemdata = {
					name: skill.name,
					type: 'skill',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
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
		const basic_edges_pack = await game.packs.find(p => p.metadata.name === 'edges');
		const swade_edges_pack = await game.packs.find(p => p.metadata.name === 'swade-edges');
		for (const edge of toArray(character.edges.edge)) {
			let itemdata;
			if (swade_edges_pack) itemdata = await searchPack(swade_edges_pack, edge.name);
			if (!itemdata) itemdata = await searchPack(basic_edges_pack, edge.name);
			if (itemdata) {
				if (itemdata.system.description.startsWith('See SWADE') || itemdata.system.description.startsWith('<p>See SWADE')) {
					itemdata.system.description = toFormatted(edge.description["#text"])
				}
			} else {
				itemdata = {
					name: edge.name,
					type: 'edge',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
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
				actor.system.powerPoints = { value : 10, max: 10 };
			}
		}

		const basic_hind_pack = await game.packs.find(p => p.metadata.name === 'hindrances');
		const swade_hind_pack = await game.packs.find(p => p.metadata.name === 'swade-hindrances');
		for (const hindrance of toArray(character.hindrances.hindrance)) {
			let itemdata;
			if (swade_hind_pack) itemdata = await searchPack(swade_hind_pack, hindrance.name);
			if (!itemdata) itemdata = await searchPack(basic_hind_pack, hindrance.name);
			if (itemdata) {
				if (itemdata.system.description.startsWith('See SWADE') || itemdata.system.description.startsWith('<p>See SWADE')) {
					itemdata.system.description = toFormatted(hindrance.description["#text"])
				}
			} else {
				itemdata = {
					name: hindrance.name,
					type: 'hindrance',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
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
		for (const drawback of toArray(character.drawbacks.drawback)) {
			let itemdata = {
				name: drawback.name,
				type: 'hindrance',
				img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
				system: {
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
		
		const swade_powers_pack = await game.packs.find(p => p.metadata.name === 'swade-powers');
		for (const item of toArray(character.arcanepowers.arcanepower)) {
			let itemdata;
			if (swade_powers_pack) itemdata = await searchPack(swade_powers_pack, item.name);
			if (itemdata) {
				itemdata.system.trapping = item.trappings;
			} else {
				itemdata = {
					name: item.name,
					type: 'power',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
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
		for (const item of toArray(character.superpowers.superpower)) {
			let itemdata;
			if (swade_powers_pack) itemdata = await searchPack(swade_powers_pack, item.name);
			if (itemdata) {
				itemdata.system.trapping = item.trappings;
			} else {
				itemdata = {
					name: item.name,
					type: 'power',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
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
		const swade_equipment_pack = await game.packs.find(p => p.metadata.name === 'swade-equipment');
		for (const gear of toArray(character.gear.item)) {
			// Transfer quantity to found items
			let itemdata;
			if (swade_equipment_pack) itemdata = await searchPack(swade_equipment_pack, gear.name);
			if (itemdata) {
				itemdata.system.quantity = +gear.quantity;
			} else {
				itemdata = {
					name: gear.name,
					type: 'gear',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
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
		for (const magicitem of toArray(character.magicitems.magicitem)) {
			// Transfer quantity to found items
			let itemdata;
			if (swade_equipment_pack) itemdata = await searchPack(swade_equipment_pack, magicitem.name);
			if (itemdata) {
				itemdata.system.quantity = +attack.quantity;
			} else {
				itemdata = {
					name: gear.name,
					type: 'gear',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
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
		for (const attack of toArray(character.attacks.attack)) {
			// If attack.damage contains the name of an ability, then prefix ability name with "@" for lookup
			let dmg = attack.damage.toLowerCase();
			if (dmg[0] >= 'a' && dmg[0] <= 'z')
				dmg = '@' + dmg;

			let itemdata;
			if (swade_equipment_pack) itemdata = await searchPack(swade_equipment_pack, attack.name);
			if (itemdata) {
				// Transfer quantity + equipped to found items
				itemdata.system.quantity = +attack.quantity;
				itemdata.system.equipped = attack.equipped ? true : false;
				//itemdata.damage = dmg;   // TODO - do we need this?
			} else {
				itemdata = {
					name: attack.name,
					type: 'weapon',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
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
		for (const defense of toArray(character.defenses.defense)) {
			let itemdata;
			if (swade_equipment_pack) itemdata = await searchPack(swade_equipment_pack, defense.name);
			if (itemdata) {
				// Transfer quantity + equipped to found items
				itemdata.system.quantity = +defense.quantity;
				itemdata.system.equipped = defense.equipped ? true : false;
			} else if (defense.name.indexOf('Shield') == -1) {
				itemdata = {
					name: defense.name,
					type: 'armor',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
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
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
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