//import { PF1 } from "../../../systems/pf1/pf1.js";


async function collectPacks(namelist) {
	let packs = [];
	for (const packname of namelist) {
		const pack = await game.packs.find(p => p.metadata.name === packname);
		if (pack) packs.push(pack);
	}
	return packs;
}

/**
 * 
 * @param {*} packs An array of packs to check
 * @param {*} test  A function to check the name supplied as the only parameter
 * @returns {*} A copy of the data from the pack, or null
 */
async function searchPacks(packs, test) {
	for (const pack of packs) {
		const entry = pack.index.find(e => test (e.name));
		if (entry) return duplicate((await pack.getDocument(entry._id)));
	}
	return null;
}

export default class RWPF1Actor {

	// Do we need the translated name for these categories?
	// item.type = weapon | equipment | consumable | loot | class | spell | feat | buff | attack | race | container
	// This coarse list (based purely on topic category) will be refined by getItemType (which can look inside the topic structure)
	static CategoryItemTypes = new Map([
		[ "Feat",                  "feat" ],
		[ "Archetype/Domain/Etc.", "feat" ],
		[ "Trait/Drawback",        "feat" ],
		[ "Skill",                 "feat" ],
		[ "Magic Item",            "equipment" ],
		[ "Mundane Weapon",        "equipment" ],
		[ "Mundane Item",          "equipment" ],
		[ "Mundane Armor/Shield",  "equipment" ],
		[ "Named Object",          "equipment" ],
		[ "Named Equipment",       "equipment" ],
		[ "Race",                  "race" ],
		[ "Class",                 "class" ],
		[ "Spell",                 "spell" ],
	]);

	static ability_names = {
		"strength" : "str",
		"dexterity" : "dex",
		"constitution" : "con",
		"intelligence" : "int",
		"wisdom" : "wis",
		"charisma" : "cha",
		// Just so that we don't have to have conditional code to check if it is long or short name
		"str" : "str",
		"dex" : "dex",
		"con" : "con",
		"int" : "int",
		"wis" : "wis",
		"cha" : "cha"
	};

	static spellschool_names = {
		"abjuration": "abj",
		"conjuration": "con",
		"divination": "div",
		"enchantment": "enc",
		"evocation": "evo",
		"illusion": "ill",
		"necromancy": "nec",
		"transmutation": "trs",
		"universal": "uni",
	};
	
	// Items whose name doesn't fit into one of the pattern matches.
	static item_name_mapping = new Map([
		[ "thieves' tools", "tools, thieves' (common)" ],
		[ "thieves' tools, masterwork",  "tools, thieves' (masterwork)" ],
		[ "thieves' tools, concealable",  "tools, thieves' (concealable)" ],
		[ "pot", "pot, cooking (iron)" ],
		[ "feed", "feed, animal" ],
		[ "riding saddle", "saddle (riding)" ],
		[ "military saddle", "saddle (military)" ],
		[ "exotic saddle", "saddle (exotic)" ],
	]);
	
	static feat_name_mapping = new Map([
		[ "Armor Proficiency (Light)", "Armor Proficiency, Light" ],
		[ "Armor Proficiency (Medium)", "Armor Proficiency, Medium" ],
		[ "Armor Proficiency (Heavy)", "Armor Proficiency, Heavy" ],
	]);

	static skill_mapping = new Map([
		[ "Acrobatics", "acr" ],
		[ "Appraise", "apr" ],
		[ "Artistry", "art" ],
		[ "Bluff", "blf" ],
		[ "Climb", "clm" ],
		[ "Craft", "crf" ],
		[ "Diplomacy", "dip" ],
		[ "Disguise", "dis" ],
		[ "Disable Device", "dev" ],
		[ "Escape Artist", "esc" ],
		[ "Fly", "fly" ],
		[ "Handle Animal", "han" ],
		[ "Heal", "hea" ],
		[ "Intimidate", "int" ],
		[ "Knowledge (arcana)", "kar" ],
		[ "Knowledge (dungeoneering)", "kdu" ],
		[ "Knowledge (engineering)", "ken" ],
		[ "Knowledge (geography)", "kge" ],
		[ "Knowledge (history)", "khi" ],
		[ "Knowledge (local)", "klo" ],
		[ "Knowledge (nature)", "kna" ],
		[ "Knowledge (nobility)", "kno" ],
		[ "Knowledge (planes)", "kpl" ],
		[ "Knowledge (religion)", "kre" ],
		[ "Linguistics", "lin" ],
		[ "Lore", "lor" ],
		[ "Perception", "per" ],
		[ "Perform", "prf" ],
		[ "Profession", "pro" ],
		[ "Ride", "rid" ],
		[ "Sense Motive", "sen" ],
		[ "Sleight of Hand", "slt" ],
		[ "Spellcraft", "spl" ],
		[ "Stealth", "ste" ],
		[ "Survival", "sur" ],
		[ "Swim", "swm" ],
		[ "Use Magic Device", "umd" ],
	]);
	
	static wizard_subclasses = [ 'Abjurer', 'Conjurer', 'Diviner', 'Enchanter', 'Evoker', 'Illusionist', 'Necromancer', 'Transmuter', 'Universalist' ];
	
	static async initModule() {
		// full list of packs: classes, mythicpaths, commonbuffs
		// spells, feats, items, armors-and-shields, weapons-and-ammo, racialhd
		// races, class-abilities, monster-templates, sample-macros, roll-tables
		// ultimate-equipment, bestiary_1/2/3/4/5, conditions, skills
		//game.packs.find(p => console.debug(`PF1 pack = ${p.metadata.name}`));
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

		//console.debug(`Parsing ${character.name}`);
		
		function addParas(string) {
			return `<p>${string.replace(/\n/g,'</p><p>')}</p>`;
		}
		function toArray(thing) {
			return !thing ? [] : Array.isArray(thing) ? thing : [thing];
		}
		
		// A HL file will have EITHER <xp> or <challengerating> & <xpaward>
		let actor = {
			name: character.name,
			type: (character.challengerating === undefined) ? 'character' : 'npc',		// 'npc' or 'character'
			relationship : character.relationship,
			system: {
				abilities: {},
				attributes: {},
				details: {},
				skills: {},
				traits: {},
			},
			items: []		// add items with :   items.push(new Item(itemdata).data)
		};

		//
		// SUMMARY tab
		//

		// data.attributes.hp.value/base/max/temp/nonlethal
		//let hp = +character.health.hitpoints;
		actor.system.attributes.hp = {
			value: +character.health.currenthp,
			//base:  +character.health.hitpoints,		// This screws up PF1E if automatic HP calculation is enabled
			min:   0,
			max:   +character.health.hitpoints,
		};
		// data.attributes.wounds.min/max/base/value
		// data.attributes.vigor.min/value/temp/max/base
		// data.attributes.woundThresholds.penalty/mod/level/override

		// data.details.cr.base/total
		if (character.challengerating === undefined) {
			// data.details.xp.value/min/max
			actor.system.details.xp = {
				value: +character.xp.total,
				min  : 0,
				max  : +character.xp.total
			};
		} else {
			let cr = +character.challengerating.value;
			actor.system.details.cr = { base: cr, total: cr };
			actor.system.details.xp = { value : +character.xpaward.value };
		};
		// data.details.height/weight/gender/deity/age
		actor.system.details.height = character.personal.charheight.text;
		actor.system.details.weight = character.personal.charweight.text;
		actor.system.details.gender = character.personal.gender;
		actor.system.details.deity = character?.deity?.name;
		actor.system.details.age = character.personal.age;

		const hitpoints = +character.health.hitpoints;
		// Ignore any possible "12 HD;" prefix, putting just the second half into justdice
		// Calculate total number of HD for the character
		const hitdice = character.health.hitdice;		// either "9d8+16" or "12 HD; 7d6+5d10+67" or just "7d6+5d10+67"
		let t1 = hitdice.split(';');
		let justdice = t1[t1.length - 1];
		let hdparts = justdice.split('+');
		let lastpart = hdparts[hdparts.length - 1];
		let hp_bonus = lastpart.includes('d') ? 0 : parseInt(lastpart);
		let total_hd = 0;
		for (let i = 0; i<hdparts.length-1; i++)
			total_hd += parseInt(hdparts[i]);
		let classes_hd = parseInt(character.classes.level);
		let races_hd  = total_hd - classes_hd;
		
		let remain_hp = hitpoints - hp_bonus;
		let races_hp  = (races_hd > 0) ? Math.round(remain_hp * races_hd / total_hd) : 0;
		let classes_hp = remain_hp - races_hp;
		
		//
		// CLASSES sub-tab (before RACE, in case we need to adjust HD by number of class levels)
		//
		//	<classes level="11" summary="bard (archaeologist) 2/unchained rogue 9" summaryabbr="Brd 2/Rog 9">
		//		<class name="Bard (Archaeologist)" level="2" spells="Spontaneous" casterlevel="2" concentrationcheck="+5" overcomespellresistance="+2" basespelldc="13" castersource="Arcane">
		//			<arcanespellfailure text="0%" value="0"/>
		//		</class>
		//		<class name="Rogue (Unchained)" level="9" spells="" casterlevel="0" concentrationcheck="+3" overcomespellresistance="+0" basespelldc="13" castersource=""/>
		//	</classes>
		//	<favoredclasses>
		//		<favoredclass name="Rogue (Unchained)"/>  <-- to set fc.hp.value, fc.skill.value, fc.alt.value/notes
		//	</favoredclasses>
		let favclasses = [];
		let charfav = character.favoredclasses?.favoredclass;
		if (charfav) {
			for (const fc of toArray(charfav)) {
				favclasses.push(fc.name);
			}
		}
		const classes = character.classes?.["class"];
		if (classes) {
			const class_pack = await game.packs.find(p => p.metadata.name === 'classes');
			
			for (const cclass of toArray(classes)) {
				// Calculate how many class HP belong to this class; and remove from the pool.
				let levels = +cclass.level;
				let class_hp = Math.round((classes_hp * levels) / classes_hd);
				classes_hp -= class_hp;
				classes_hd -= levels;
				
				// TODO: we shouldn't really do this, because we are stripping the archetype from the class.
				let name = (cclass.name.indexOf('(Unchained)') > 0) ? cclass.name : cclass.name.replace(/ \(.*/,'');
				// Special case for wizard classes
				if (this.wizard_subclasses.includes(name)) {
					name = 'Wizard';
				}
				//console.debug(`Looking for class called '${name}'`);
				// Strip trailing (...)  from class.name
				const entry = class_pack.index.find(e => e.name === name);
				if (entry) {
					let classdata = (await class_pack.getDocument(entry._id)).toObject();
					//console.debug(`Class ${entry.name} at level ${cclass.levels}`);

					// class.hp needs setting to the amount of HP gained from levelling in this class.
					// class.fc needs setting for the favoured class with information as to how the point was spent.
					// Do all NPCs really get the HP favoured class bonus on their stats?
					if (favclasses.includes(cclass.name) || character.role === 'npc') {
						// This is NOT a favoured class, so cancel any favoured class bonuses.
						console.debug(`Setting favoured class for ${cclass.name}`);
						classdata.system.fc.hp.value = levels;
						classdata.system.fc.skill.value = 0;
						classdata.system.fc.alt.value = 0;
					}
					
					// Start by adding the class item with the correct number of levels & HP
					classdata.system.level = levels;
					classdata.system.hp = class_hp;		// how do we work this out?
					actor.items.push(classdata);
					
					// Now add all the class features up to the level of the class.
					// See PF1._onLevelChange (triggered by updateItem and createItem, but not create()
					const classAssociations = (classdata.system.links.classAssociations || []).filter((o, index) => {
						o.__index = index;
						return o.level <= levels;
					});

					for (const co of classAssociations) {
						const collection = co.id.split(".").slice(0, 2).join(".");
						const itemId = co.id.split(".")[2];
						const pack = game.packs.get(collection);
						const itemData = duplicate((await pack.getDocument(itemId)));
						
						// No record on each classFeature as to which class and level added it.
						//classUpdateData[`flags.pf1.links.classAssociations.${itemData.id}`] = co.level;	// itemData.id isn't valid yet!
						actor.items.push(itemData);
					}
				} else {
					// Create our own placemarker class.
					const itemdata = {
						name: cclass.name,
						type: 'race',
						system: { 
							level : levels,
							hp    : class_hp,
						},
						//system: { description : { value : addParas(feat.description['#text']) }}
					};
					actor.items.push(itemdata);
				}
			}
		} // if (classes)

		// <race racetext="human (Taldan)" name="human" ethnicity="Taldan"/>
		const race_pack = await game.packs.find(p => p.metadata.name === 'races');
		const lowerrace = character.race.name.toLowerCase();
		const race = await race_pack.index.find(e => e.name.toLowerCase() === lowerrace);
		let racedata;  // needed for attribute processing
		if (race) {
			racedata = (await race_pack.getDocument(race._id)).toObject();
			actor.items.push(racedata);
		} else if (character.types.type?.name == 'Humanoid') {
			// Only do manual entry for humanoids, since monstrous races
			// have "classes" of the monster/animal levels
			console.warn(`Race '${character.race.name}' not in 'races' pack for ${character.name}`);
			const itemdata = {
				name: character.race.name,
				type: 'race',
				creatureType: character.types?.type?.name,
				//system: { description : { value : addParas(character.race.name['#text']) }}
			};
			actor.items.push(itemdata);
		}
		// <types><type name="Humanoid" active="yes"/>
		// <subtypes><subtype name="Human"/>
		if (character.types.type) {
			const racialhd_pack = await game.packs.find(p => p.metadata.name === 'racialhd');
			const racehdlower = character.types.type.name.toLowerCase();
			const racialhd = await racialhd_pack.index.find(e => e.name.toLowerCase() === racehdlower);
			if (racialhd) {
				let item = (await racialhd_pack.getDocument(racialhd._id)).toObject();
				item.system.level = races_hd;
				item.system.hp = races_hp;
				if (races_hd == 0) {
					item.system.skillsPerLevel = 0;
					item.system.savingThrows.fort.value = "Low";
					item.system.savingThrows.ref.value = "Low";
					item.system.savingThrows.will.value = "Low";
				}					
				actor.items.push(item);
			} else {
				console.warn(`racialhd '${character.types.type.name}' not in 'racialhd' pack`);
				const itemdata = {
					name: character.types.type.name,
					type: 'class',
					classType: 'racial',
					hp : races_hp,
					//system: { description : { value : addParas(character.racialhd.name['#text']) }}
				};
				actor.items.push(itemdata);
			}
		}
		//
		// ATTRIBUTES tab
		//
		// attrvalue.base is unmodified by magical items, but INCLUDES racial bonus!
		// attrvalue.modified includes bonuses
		for (const attr of character.attributes.attribute) {
			actor.system.abilities[RWPF1Actor.ability_names[attr.name.toLowerCase()]] = {
				value: +attr.attrvalue.base,
			}
		}
		// Remove racial bonuses (if any)
		// race.system.changes []
		//    modifier = "racial"
		//    formula  = "2" or "-2"
		//    target   = "ability"
		//    subTarget = "dex" | "int" | "con"
		if (racedata) {
			for (const change of racedata.system.changes) {
				if (change.modifier == 'racial' && change.target == 'ability' && change.operator == 'add') {
					console.log(`Removing racial ability modifier: ${change.subTarget} = ${change.formula} `);
					actor.system.abilities[change.subTarget].value = actor.system.abilities[change.subTarget].value - (+change.formula);
				}
			}
		}

		// Saving Throws are calculated automatically
/*		actor.system.attributes.savingThrows = {};
		for (const child of character.saves.save) {
			if (child.abbr == "Fort") {
				actor.system.attributes.savingThrows.fort = {
					base:  +child.fromresist, //+child.base,
					//total: +child.save - +child.fromattr,
					ability: "con"
				};
			} else if (child.abbr == "Ref") {
				actor.system.attributes.savingThrows.ref = {
					base:  +child.fromresist,
					//total: +child.save - +child.fromattr,
					ability: "dex"
				};
			} else if (child.abbr == "Will") {
				actor.system.attributes.savingThrows.will = {
					base:  +child.fromresist,
					//total: +child.save - +child.fromattr,
					ability: "wis"
				};
			}
		};
*/

		// data.attributes.vision.lowLight/darkvision
		actor.system.attributes.vision = {
			lowLight   : character.senses?.special?.name && character.senses.special.name.includes("Low-Light Vision"),
			darkvision : 0,
		}
		// data.attributes.hpAbility
		// data.attributes.cmbAbility
		// data.attributes.hd -> actually handled by level of "racialhd" item

		// data.attributes.sr.formula/total
		// data.attributes.saveNotes
		// data.attributes.acNotes
		// data.attributes.cmdNotes
		// data.attributes.srNotes
		// data.attributes.attack.general/shared/melee/ranged/meleeAbility/rangedAbility
		// data.attributes.damage.general/weapon/spell
		// data.attributes.maxDexBonus
		// data.attributes.mDex.armorBonus/shieldBonus
		// data.attributes.acp.gear/encumbrance/total/armorBonus/shieldBonus/attackPenalty
		// data.attributes.energyDrain
		// data.attributes.quadruped

		// data.attributes.prof
		// data.attributes.speed.land/climb/swim/burrow/fly (base/total + for fly, .maneuverability)
		actor.system.attributes.speed = {
			land: {
				base:  +character.movement.speed.value,
				total: +character.movement.speed.value
			},
		}
		// data.attributes.conditions((long list false|true)
		// data.attributes.spells.usedSpellbooks[]
		// data.attributes.spells.spellbooks.primary/secondary/tertiary/spelllike
		// data.details.level.value/min/max
		// data.details.mythicTier
		// data.details.bonusFeatFormula
		// data.details.alignment: 'tn'
		actor.system.details.alignment = character.alignment;
		// data.details.biography.value/public
		let bio = character.personal.description['#text'];
		if (bio) {
			actor.system.details.biography = {
				value: addParas(bio)	  // Each paragraph is on a single line
			};
		}
		// data.details.notes.value/public
		// data.details.bonusRankSkillFormula
		// data.details.tooltip.name/hideHeld/hideArmor/hideBuffs/hideConditions/hideClothing/hideName
		
		//
		// COMBAT tab
		//
		
		// data.attributes.init.value/bonus/total/ability
		const initvalue = +character.initiative.misctext; //+character.initiative.total - +character.initiative.attrtext;
		actor.system.attributes.init = {
			value: initvalue,
			bonus: initvalue,
			total: initvalue,
			ability: RWPF1Actor.ability_names[character.initiative.attrname]
		};

		actor.system.attributes.bab = {
			value: +character.attack.baseattack,
			total: +character.attack.baseattack
		};
		actor.system.attributes.cmd = {
			value: +character.maneuvers.cmd,
			total: +character.maneuvers.cmd,
			flatFootedTotal: +character.maneuvers.cmdflatfooted
		}
		actor.system.attributes.cmb = {
			value: +character.maneuvers.cmb,
			total: +character.maneuvers.cmb,
		}

		// AC will be calculated automatically
/*		actor.system.attributes.naturalAC = +character.armorclass.fromnatural;
		actor.system.attributes.ac = {
			normal: {
				value: +character.armorclass.ac,
				total: +character.armorclass.ac
			},
			touch: {
				value: +character.armorclass.touch,
				total: +character.armorclass.touch,
			},
			flatFooted: {
				value: +character.armorclass.flatfooted,
				total: +character.armorclass.flatfooted
			}
		};
*/

		//
		// COMBAT tab
		//
		// (Items in the Inventory will be added later by postCreateActors)
		//
		
		for (const armor of toArray(character.defenses.armor)) {
			if (armor.natural && armor.useradded === "no" && armor.equipped && armor.natural === "yes") {
				// We need to somehow work out if this is actually from an ITEM, rather than being a racial bonus
				actor.system.attributes.naturalAC = +armor.ac;
			}
		}
		for (const attack of toArray(character.melee.weapon).concat(toArray(character.ranged.weapon))) {
			if (attack && attack.useradded === "no") {
				// decode crit: either "x2" or "17-20/x2"
				let x = attack.crit.indexOf("×");
				let critrange = (x === 0) ? 20 : parseInt(attack.crit);
				let critmult  = +attack.crit.slice(x+1);
				let primaryAttack = (parseInt(attack.attack) >= (parseInt(attack.rangedattack) ? parseInt(character.attack.rangedattack) : parseInt(character.attack.meleeattack)));
				
				// templates: itemDescription
				let atkdata = {
					// item
					name: attack.name,
					type: "attack",
					system: {
						// TEMPLATE: itemDescription
						description: { value: attack.description["#text"], chat: "", unidentified: "" },
						//tags: [],
						// TEMPLATE: activatedEffect
						activation: { cost: 1, type: "attack" },
						//unchainedAction: { activation: { cost: 1, type: "" },
						duration: { value: null, units: "inst" },
						//target: { value : "" },
						//range: { value: null, units: "", maxIncrements: 1, minValue: null, minUnits: "" },
						//uses: { value: 0, per: null, autoDetectCharges: true, autoDeductChargesCost: 1, maxFormula:  "" },
						// TEMPLATE: action
						//measureTemplate: { type: "", size: "", overrideColor: false, customColor: "", overrideTexture: false, customTexture: "" },
						attackName: attack.name,
						actionType: (attack.rangedattack ? "rwak" : "mwak"),		// eg "rwak" or "mwak"
						attackBonus: (parseInt(attack.attack) - parseInt(character.attack.attackbonus) + (primaryAttack?0:5)).toString(),		// use FIRST number, remove BAB (since FVTT-PF1 will add it)
						//critConfirmBonus: "",
						damage: { 
							parts: [ [ attack.damage.split(' ')[0] , attack.typetext ] ],			//   [ [ "sizeRoll(1, 4, @size)", "B" ] ],
								// split to remove " nonlethal" (or " plus grab", etc.) from tail end of damage, if present
							//critParts: [],		//	
							//nonCritParts: []
						},
						//attackParts: [],
						formulaicAttacks: {		// standard formula for all attacks
							//count: { formula: "ceil(@attributes.bab.total / 5) - 1" },
							//bonus: { formula: "@formulaicAttack * -5" },
							label: null
						},
						//formula: "",
						ability: {
							// attackBonus and damage already include attackBonus/damage.parts above, so don't let FVTT-PF1 add it again
							//attack: (attack.rangedattack ? "dex" : "str"),		// "str" or "dex"
							//damage: (attack.rangedattack ? null  : "str"),		// "str" or "dex" or null (ranged weapons might always have null)
							damageMult: 1,
							critRange: critrange,
							critMult:  critmult,
						},
						save: { dc: 0, type: "", description: "" },
						//effectNotes: [],
						attackNotes: (attack.damage.indexOf(" ") > 0) ? [attack.damage] : [],
						//soundEffect: "",
						// TEMPLATE: links
						//links: { children: {} },
						// TEMPLATE: tagged
						//tag: "",
						//useCustomTag: false,
						// TEMPLATE: flags
						//flags: { boolean: [], dictionary: [] },
						// TEMPLATE: scriptCalls
						//scriptCalls: []
						// ITEM: attack
						attackType: "natural",		// or weapon?
						//masterwork: false,
						nonlethal: (attack.damage.indexOf("nonlethal") != -1),
						//enh: null,
						//proficient: true,
						primaryAttack: primaryAttack,	// TODO : very coarse
						//showInQuickbar: true,
						//broken: false,
						//held: "normal",
						//conditionals: [],
						//links: { charges: [], ammunition: [] },
					}
					// from HeroLab
/*					cta: attack.category,	// "Melee Weapon, Unarmed Attack"
					attack.weight,
					attack.cost,
					attack.description,
					attack.wepcategory["#text"],  //maybe more than one
					attack.wepcategory["#text"],
					attack.wepcategory["#text"],
					attack.weptype["#text"],		// Bludgeoning,Piercing
					attack.situationalmodifiers.text;*/
				}

				if (attack.rangedattack) {
					atkdata.system.range = { 
						value: attack.rangedattack.rangeinctext,
						units: "ft",
						maxIncrements: 1,
						//minValue: null,
						//minUnits: "",
					};
				} else {
					atkdata.system.range = { 
						//value: null,
						units: "melee",
						//maxIncrements: 1,
						//minValue: null,
						//minUnits: "",
					};
				}
				actor.items.push(atkdata);
			}
		}
		// COMBAT - MISCELLANEOUS
		for (const miscatk of toArray(character.attack.special)) {
			let atkdata = {
				name : "Special Attack: " + miscatk.shortname,
				type : "attack",
				img  : "systems/pf1/icons/skills/yellow_36.jpg",
				data : {
					description: { value: miscatk.description["#text"], chat: "", unidentified: "" },
					attackType: "misc",
				},
			};
			actor.items.push(atkdata);
		}
		
		//
		// INVENTORY tab
		//
		
		// data.currency.pp/gp/sp/cp
		actor.system.currency = {
			pp: +character.money.pp,
			gp: +character.money.gp,
			sp: +character.money.sp,
			cp: +character.money.cp,
		}
		// data.altCurrency.pp/gp/sp/cp  (weightless coins) - count as weightless

		// data.attributes.encumbrance.level/levels/carriedWeight
		const enc = character.encumbrance;
		actor.system.attributes.encumbrance = {
			level: (enc.level == 'Light Load') ? 0 : 1, // 0 = light load TBD
			levels: {
				light:  +enc.light,
				medium: +enc.medium,
				heavy:  +enc.heavy,
				//carry:
				//drag:
			},
			carriedWeight: +enc.carried
		};

		// gear.[item.name/quantity/weight/cost/description
		let items = [];
		if (character.gear?.item) items = items.concat(toArray(character.gear.item));
		if (character.magicitems?.item) items = items.concat(toArray(character.magicitems.item));
		
		if (items.length > 0) {
			// Core System compendiums
			let packs = await collectPacks(
				[ 'items', 'armors-and-shields', 'weapons-and-ammo',				// Base PF1 system
				  'pf-magicitems', 'pf-items', 'pf-wondrous', 'pf-goods-services'])	// "PF1 Compendiums" module			
			
			for (const item of items) {
				// Get all forms of item's name once, since we search each pack.
				let lower = item.name.toLowerCase();
				let singular, reversed, pack, entry, noparen;
				// Firstly deal with masterwork and enhancement bonuses on weapons.
				let masterwork, enh;
				if (lower.startsWith("masterwork ")) {
					masterwork = true;
					lower = lower.slice(11);
				}
				if (lower.length > 3 && lower[0] === "+" && lower[2] === " ") {
					enh = parseInt(lower[1]);
					if (!isNaN(enh)) lower = lower.slice(3);
				}
				// Remove container "(x @ y lbs)"
				//if (lower.endsWith(')') && (lower.endsWith('lbs)') || lower.endsWith('empty)') || lower.endsWith('per day)') || lower.endsWith('/day)')))
				if (lower.endsWith(')'))
					lower = lower.slice(0,lower.lastIndexOf(' ('));
				// Remove plurals
				if (lower.endsWith('s')) singular = lower.slice(0,-1);
				// Handle names like "bear trap" => "trap, bear"
				const words = lower.split(' ');
				if (words.length == 2) reversed = words[1] + ', ' + words[0];
				// Handle "Something (else)" -> "Something, else"
				if (lower.endsWith(')')) {
					let pos = lower.lastIndexOf(' (');
					noparen = lower.slice(0,pos) + ', ' + lower.slice(pos+2,-1);
				}
				
				// Finally, some name changes aren't simple re-mappings
				if (RWPF1Actor.item_name_mapping.has(lower)) lower = RWPF1Actor.item_name_mapping.get(lower);
				
				let itemdata = await searchPacks(packs, name => {	
					const elc = name.toLowerCase(); 
					return elc === lower || (singular && elc === singular) || (reversed && elc === reversed) || (noparen && elc === noparen)
				})
				
				if (itemdata) {
					itemdata.system.quantity = +item.quantity;
					if (masterwork) itemdata.system.masterwork = true;
					if (enh) {
						if (itemdata.system.armor)
							itemdata.system.armor.enh = enh;
						else
							itemdata.system.enh = enh;
					}
					// Restore original POR name if there is information in brackets at the end of the name
					if (masterwork || enh || item.name.endsWith(')')) {
						itemdata.name = item.name;
						itemdata.system.identifiedName = item.name;
					}
					// See if need to remove the naturalAC that was added from the defenses section.
					if (actor.system.attributes.naturalAC > 0 && itemdata.system.changes) {
						for (const effect of itemdata.system.changes) {
							if (effect.target === 'ac' && effect.subTarget === 'nac') {
								console.log(`Removing item's Natural AC from actor's natural AC ${effect.formula}`)
								actor.system.attributes.naturalAC = actor.system.attributes.naturalAC - (+effect.formula);
							}
						}
					}
					actor.items.push(itemdata);
				} else {
					// Create our own placemarker item.
					const itemdata = {
						name: item.name,
						type: 'loot',
						system: {
							quantity: +item.quantity,
							weight:   +item.weight.value,
							price:    +item.cost.value,
							description: {
								value: addParas(item.description['#text'])
							},
							identified: true,
							carried: true,
						},
					};
					actor.items.push(itemdata);
				}
			}
		}
				
		//
		// SKILLS tab
		//
		let numsub = { art: 0, crf: 0, lor: 0, prf: 0, pro: 0 };
		let numcust = 0;
		for (const skill of character.skills.skill) {
			// <skill name="Acrobatics" ranks="5" attrbonus="5" attrname="DEX" value="10" armorcheck="yes" classskill="yes" trainedonly="yes" usable="no" tools="uses|needs">
			let value = {
				//value:   +skill.value,
				ability: RWPF1Actor.ability_names[skill.attrname.toLowerCase()],
				rt:      (skill.trainedonly === 'yes'),
				acp:     (skill.armorcheck  === 'yes'),
				rank:    +skill.ranks,
				//mod:     +skill.attrbonus,
				//cs:      (skill.classskill  === 'yes'),		// overridden by class definitions
				// rt, acp, background
			}
			if (!value.ability) {
				console.warn(`Failed to find an ability called '${skill.attrname}' for skill '${skill.name}' - SKIPPING`);
				continue;
			}
			let baseskill = this.skill_mapping.get(skill.name);
			if (baseskill) {
				actor.system.skills[baseskill] = value;
			} else {
				let paren = skill.name.indexOf(' (');
				baseskill = paren ? this.skill_mapping.get(skill.name.slice(0,paren)) : undefined;
				if (baseskill) {
					value.name = skill.name;
					if (!actor.system.skills[baseskill]) actor.system.skills[baseskill] = {subSkills : {}};
					else if (!actor.system.skills[baseskill].subSkills) actor.system.skills[baseskill].subSkills = {};
					actor.system.skills[baseskill].subSkills[`${baseskill}${++numsub[baseskill]}`] = value;
				} else {
					console.debug(`PF1 custom skill ${skill.name}`);
					value.name = skill.name;
					actor.system.skills[numcust++ ? `skill${numcust}` : 'skill'] = value;
				}
			}
		}
		
		
		//
		// FEATURES tab
		//
		
		// data.items (includes feats) - must be done AFTER skills
		if (character.feats?.feat) {
			let packs = await collectPacks([ 'feats', 'pf-feats' ]);

			for (const feat of toArray(character.feats.feat)) {
				// since that indicates a class or race-based feature.
				let featname = feat.name;
				let realname = featname;
				if (RWPF1Actor.feat_name_mapping.has(featname))
					realname = featname = RWPF1Actor.feat_name_mapping.get(featname);
				else
					featname = featname.replace(/ \(.*/,'').replace(/ -.*/,'');

				if (feat.useradded == 'no') {
					// Never manually add armor/shield/weapon proficiencies
					if (feat.profgroup == 'yes') continue;
						
					// But don't add it if a copy has already been added when processing classes.
					let acopy = false;
					for (const item of actor.items) {
						if (item.name == realname) {
							acopy = true;
							break;
						}
					}
					if (acopy) continue;
				}
				let lowername = featname.toLowerCase()
				let shortname;
				if (lowername.endsWith(')')) shortname = lowername.slice(0, lowername.lastIndexOf('('));
				
				let itemdata = await searchPacks(packs, name => name.toLowerCase() === lowername || (shortname && name.toLowerCase() == shortname));

				if (itemdata) {
					itemdata.name = realname;	// TODO: in case we removed parentheses

					if (feat.useradded == 'no') {
						// We are going to add it as a manual class feature.
						itemdata.system.featType = 'classFeat';
					}
					
					// Special additions:
					if (feat.name.startsWith('Skill Focus (')) {
						// Skill Focus (Profession [Merchant]) => Profession (Merchant)
						let ranks;
						let p1 = feat.name.indexOf(' (');
						let p2 = feat.name.lastIndexOf(')');
						let skillname = feat.name.slice(p1+2,p2).replace('[','(').replace(']',')');
						// Find any descendent of actor.system.skills with a .name that matches the skill
						let skill;
						let baseskill = this.skill_mapping.get(skillname);
						if (baseskill) {
							ranks = actor.system.skills[baseskill].rank;
							skill = 'skill.' + baseskill;
						} else {
							// Check for a subskill
							let paren = skillname.indexOf(' (');
							skill = paren ? this.skill_mapping.get(skillname.slice(0,paren)) : undefined;
							if (skill) {
								for (const skl2 of Object.keys(actor.system.skills[skill].subSkills)) {
									if (actor.system.skills[skill].subSkills[skl2].name == skillname) {
										ranks = actor.system.skills[skill].subSkills[skl2].rank;
										skill = 'skill.' + skill + ".subSkills." + skl2;
										break;
									}
								}
							}
							if (!skill) { 
								// Check custom skills
								// actor.system.skills.skill
								// actor.system.skills.skill2
								let i=0;
								while (true) {
									let name = (i==0) ? 'skill' : `skill${i}`;
									if (!(name in actor.system.skills)) break;
									if (actor.system.skills[name].name == skill.name) {
										ranks = actor.system.skills[name].rank;
										skill = 'skill.' + name;
										break;
									}
								}
							}
						}
						if (skill) {
							let bonus = (ranks >= 10) ? "6" : "3";
							itemdata.system.changes = [
							{
								formula:   bonus,
								operator:  "add",
								subTarget: skill,
								modifier:  "untyped",
								priority:  0,
								value:     bonus,
							}];
							//console.debug(`Skill Focus: ${itemdata.system.changes[0].formula} to ${itemdata.system.changes[0].subTarget}`);
						}
					}
					actor.items.push(itemdata);
				} else {
					// Create our own placemarker feat.
					const itemdata = {
						name: feat.name,
						type: 'feat',
						system: {
							description: {
								value: addParas(feat.description['#text'])
							}
						}
					};
					if (feat.useradded == 'no') {
						itemdata.system.featType = 'classFeat';
					}					
					if (feat.featcategory) {
						let cats = [[feat.featcategory['#text']]];
						//itemdata.system.tags = new Map();
						//itemdata.system.tags.insert( cats );
					}
					actor.items.push(itemdata);
				}
			} /* for feat in pack */
		}
		
		// Traits (on FEATURES tab)
		// <trait name="Dangerously Curious" categorytext="Magic">
		if (character.traits?.trait) {
			let packs = await collectPacks(['pf-traits', 'pf-racial-traits'])

			for (const trait of toArray(character.traits.trait)) {

				let itemdata = await searchPacks(packs, name => name == trait.name);
				// Some traits in the PF sources has the name of the module from which it is derived.
				if (!itemdata) itemdata = await searchPacks(packs, name => name.startsWith(trait.name));
				if (!itemdata) {
					itemdata = {
						name: trait.name,
						type: 'feat',
						system: {
							featType: (trait.categorytext == 'Racial') ? 'racial' : 'trait',	// feat, classFeat, trait, racial, misc, template
							description: {
								value: addParas(trait.description['#text'])
							}
						}
					}
				}
				actor.items.push(itemdata);
			}
		}
		// and otherspecials.special with sourcetext attribute set to one of the classes
		// find items in "class-abilities"
		
		
		// defensive.[special.shortname]  from 'class abilities'
		

		//
		// BUFFS tab
		//
		
		
		//
		// BIOGRAPHY tab
		//
		
		
		//
		// SPELLS tab
		//
		// data.attributes.spells.spellbooks.primary/secondary/tertiary/spelllike
		//
		// data.attributes.spellbooks.usedSpellbooks: [ 'primary', 'tertiary', 'spelllike' ]
		// spells are added to items array.
		// <character>
		// <spellsknown>
		// <spell name="Ghost Sound" level="0" class="Bard" casttime="1 action" range="close (25 + 5 ft./2 levels)" target="" area="" effect="illusory sounds" duration="1 round/level (D)" save="DC 13 Will disbelief" resist="no" dc="13" casterlevel="2" componenttext="Verbal, Somatic, Material" schooltext="Illusion" subschooltext="Figment" descriptortext="" savetext="Will disbelief" resisttext="No" spontaneous="yes">
		//			<description>Ghost sound allows you to create a volume of sound that rises, recedes, approaches, or remains at a fixed place. You choose what type of sound ghost sound creates when casting it and cannot thereafter change the sound's basic character. The volume of sound created depends on your level. You can produce as much noise as four normal humans per caster level (maximum 40 humans). Thus, talking, singing, shouting, walking, marching, or running sounds can be created. The noise a ghost sound spell produces can be virtually any type of sound within the volume limit. A horde of rats running and squeaking is about the same volume as eight humans running and shouting. A roaring lion is equal to the noise from 16 humans, while a roaring dragon is equal to the noise from 32 humans. Anyone who hears a ghost sound receives a Will save to disbelieve.
		//	 		Ghost sound can enhance the effectiveness of a silent image spell.
		//			Ghost sound can be made permanent with a permanency spell.</description>
		//			<spellcomp>Verbal</spellcomp>
		//			<spellcomp>Somatic</spellcomp>
		//			<spellcomp>Material</spellcomp>
		//			<spellschool>Illusion</spellschool>
		//			<spellschool>Void Elemental</spellschool>
		//			<spellsubschool>Figment</spellsubschool>
		//		</spell>
		const spell_pack = await game.packs.find(p => p.metadata.name === 'spells');
		
		async function addSpells(nodes, book, memorized=[]) {
			if (!nodes) return false;
			
			//console.debug(`Creating spellbook ${book} for '${character.name}'`);
			if (!actor.system.attributes.spells) actor.system.attributes.spells = { usedSpellbooks : []};
			actor.system.attributes.spells.usedSpellbooks.push(book);
				
			// <spell name="Eagle's Splendor" level="2" class="Sorcerer" casttime="1 action" range="touch" target="creature touched" area="" effect="" duration="1 min./level" 
			//		save="Will negates (harmless)" resist="yes" dc="18" casterlevel="7" componenttext="Verbal, Somatic, Material or Divine Focus"
			//		schooltext="Transmutation" subschooltext="" descriptortext="" savetext="Harmless, Will negates" resisttext="Yes" spontaneous="yes">
			// <special name="Serpentfriend (At will) (Ex)" shortname="Serpentfriend (At will)" type="Extraordinary Ability" sourcetext="Sorcerer">

			for (const spell of toArray(nodes)) {
				const lowername = spell.name.toLowerCase();
				const shortpos = lowername.indexOf(' (');
				const shortname = (shortpos > 0) ? lowername.slice(0,shortpos) : lowername;
					
				const entry = spell_pack.index.find(e => e.name.toLowerCase() == shortname);
				let itemdata;
				if (entry)
					itemdata = (await spell_pack.getDocument(entry._id)).toObject();
				else {
					// Manually create a spell item
					try {
						itemdata = {
							name: spell.shortname ?? spell.name,
							type: 'spell',
							system: {
								uses: {}
							},
						};
						if (spell.type == 'Extraordinary Ability') {
							itemdata.system.abilityType = 'ex';
						}
						itemdata.system.description = {
							value: spell.description['#text']
						};
							// spell not special
						if (spell.spellschool) {
							// There might be more than one spellschool child.
							let school = (spell.spellschool instanceof Array ? spell.spellschool[0] : spell.spellschool)['#text'];
							itemdata.system.level = +spell.level;
							itemdata.system.school = RWPF1Actor.spellschool_names[school.toLowerCase()] ?? school;
							itemdata.system.subschool = spell.subschool;
							if (spell.spelldescript) {
								itemdata.system.types = toArray(spell.spelldescript).map(el => el['#text']).join(';');
							}
							let comps = toArray(spell.spellcomp).map(el => el['#text']);
							let material = (spell.componenttext.indexOf('Material') >= 0);
							let sfocus = (spell.componenttext.indexOf('Divine Focus') >= 0);
							itemdata.system.components = {
								//value: spell.componenttext,
								verbal: comps.includes('Verbal'),
								somatic: comps.includes('Somatic'),
								material: comps.includes('Material'),
								"focus": comps.includes('Focus'),
								divineFocus: // 0=no, 1=DF, 2=M/DF, 3=F/DF
									comps.includes('Focus or Divine Focus') ? 3 :
									comps.includes('Material or Divine Focus') ? 2 :	
									comps.includes('Divine Focus') ? 1 :
									0,
							};
							itemdata.system.castTime = spell.casttime;
							itemdata.system.sr = (spell.resisttext == 'Yes');
							itemdata.system.spellDuration = spell.duration;
							itemdata.system.spellEffect = spell.effect;
							itemdata.system.spellArea = spell.area;
							//itemdata.system.materials.value/focus/gpValue
							// itemdata.system.preparation.preparedAmount/maxAmount/autoDeductCharges/spontaneousPrepared
							if (spell.spontaneous == 'Yes')
								itemdata.system.preparation = {
									spontaneousPrepared: true
								};
						}
					} catch (e) {
						console.error(`Failed to create custom version of '${spell.name}' for '${actor.name}' due to ${e}`);
						continue;
					}
				}
				itemdata.system.spellbook = book;
				if (memorized.includes(lowername)) itemdata.system.preparation = { preparedAmount : 1};
				if (shortpos >= 0) itemdata.name = spell.name;	// full name has extra details
				if (lowername.indexOf('at will)') >= 0) itemdata.system.atWill = true;
				if (lowername.endsWith('/day)')) {
					itemdata.system.uses.max   = parseInt(lowername.slice(-6));	// assume one digit
					itemdata.system.uses.value = itemdata.system.uses.max;
					itemdata.system.uses.per   = 'day';
				}
				//itemdata.system.learnedAt = { 'class': [  };
				actor.items.push(itemdata);
			}
			return true;
		}

		// Technically, we should process spellsmemorized to mark which spells in spellbook are prepared
		let spellbooks = [ 'primary', 'secondary', 'tertiary' ];
		let memorized = [];
		if (character.spellsmemorized.spell) {
			for (const spell of toArray(character.spellsmemorized.spell)) {
				memorized.push(spell.name.toLowerCase());
			}
		}
		if (await addSpells(character.spellbook.spell, spellbooks[0], memorized)) spellbooks.shift();
		if (await addSpells(character.spellsknown.spell, spellbooks[0]))
			spellbooks.shift();
		else if (await addSpells(character.spellsmemorized.spell, spellbooks[0])) spellbooks.shift();
		
		// <special name="Disguise Self (humanoid form only, At will)" shortname="Disguise Self">
		// <special name="Blur (1/day)" shortname="Blur">
		// <special name="Serpentfriend (At will) (Ex)" shortname="Serpentfriend (At will)" type="Extraordinary Ability" sourcetext="Sorcerer">
		await addSpells(character.spelllike.special, 'spelllike');
		
		//
		// NOTES tab
		//
		
		
		//
		// SETTINGS tab
		//
		
		
		//
		// STUFF TO BE PUT INTO THE CORRECT PLACE
		//
		
		// data.traits.size - fine|dim|tiny|med|lg|huge|grg|col
		switch (character.size.name) {
		case 'Fine':		actor.system.traits.size = 'fine';	break;
		case 'Diminutive':	actor.system.traits.size = 'dim';		break;
		case 'Tiny':		actor.system.traits.size = 'tiny';	break;
		case 'Small':		actor.system.traits.size = 'sm';		break;
		case 'Medium':		actor.system.traits.size = 'med';		break;
		case 'Large':		actor.system.traits.size = 'lg';		break;
		case 'Huge':		actor.system.traits.size = 'huge';	break;
		case 'Gargantuan':	actor.system.traits.size = 'grg';		break;
		case 'Colossal':	actor.system.traits.size = 'col';		break;
		default:
			console.warn(`Unknown actor size ${character.size.name}`);
		}
		// data.traits.senses
		let senses = [];
		if (character.senses.special) {
			for (const sense of toArray(character.senses.special)) {
				senses.push(sense.name);
			}
		}
		actor.system.traits.senses = senses.join(', ');
		// data.traits.dr		// damage reduction		(character.damagereduction)
		// data.traits.eres		// energy resistance	(character.resistances)
		// data.traits.cres		// condition resistance	(character.resistances)
		// data.traits.regen
		// data.traits.fastHealing
		// data.traits.languages.value[]/custom
		if (character.languages.language) {
			actor.system.traits.languages = {
				value: []
			};
			for (const lang of toArray(character.languages.language)) {
				actor.system.traits.languages.value.push(lang.name.toLowerCase());
			}
		}

		// data.traits.di.value[]/custom
		// data.traits.dv.value[]/custom
		// data.traits.ci.value[]/custom
		// data.traits.perception.
		// data.traits.stature
		// data.traits.weaponProf.value[]/custom
		// data.traits.armorProf.value[]/custom
		// data.flags
		// data.token (leave empty)
		
		// data.effects

		return actor;
	}
	
	//
	// After all Actors have been created, we can add Attacks for each of the weapons on the Actor.
	static async postCreateActors(actors) {
		console.debug(`PF1.postCreateActors for ${actors.length} actors`);
		for (let actor of actors) {
			if (!actor) continue;
			// For each weapon, create the relevant attacks
			for (const item of actor.items) {
				if (item.system.type === "weapon") {
					console.debug(`'${actor.name}' creating attacks for '${item.name}'`);
					await actor.createAttackFromWeapon(item);
				}
			}
		}
	}
	
	//
	// Determine the ITEM type of the given node:
	// if it can't be determined only by CategoryItemTypes (at top).
	// item.type = weapon | equipment | consumable | loot | class | spell | feat | buff | attack | race | container
	//
	static async getItemType(structure, topic, initial_type) {
		for (const tag of topic.getElementsByTagName('tag_assign')) {
			const tag_id = tag.getAttribute('tag_id');
			const tag_name = structure.tags.get(tag.getAttribute('tag_id'));
			if (!tag_name) continue;
			
			switch (tag_name) {
			case "Weapon":
			case "Light Melee Weapons":
			case "One-Handed Melee Weapons":
			case "Two-Handed Melee Weapons":
			case "Ranged Weapons":
				return 'weapon';
				
			case "Rod": 
			case "Spellbook":
			case "Wondrous Item":
			case "Light Armor":
			case "Medium Armor":
			case "Heavy Armor":
			case "Shield":
				return 'equipment';

			case "Potion":
			case "Scroll":
			case "Staff":
			case "Wand":
				return 'consumable';

			//case "":
				//return 'loot';
			//case "":
				//return 'class';
			//case "":
				//return 'spell';
			case "Archetype":
			case "Trait":
				return 'feat';
			//case "":
				//return 'buff';
			//case "":
				//return 'attack';
			//case "":
				//return 'race';
			//case "":
				//return 'container';
			}
		}
		
		// No more-specific item type detected, so use the provided default
		return initial_type;
	}
	
	//
	// Create the ITEM data
	//
	static async createItemData(structure,topic,itemtype,content,category) {
		// item.type = weapon | equipment | consumable | loot | class | spell | feat | buff | attack | race | container

		let item = {
			// "type" will be promoted outside of the item.data object
			description: {
				value : content,
			}
		}
		console.debug(`PF1.createItemData: '${topic.getAttribute('public_name')}'`);
		
		if (itemtype==='feat') item.featType='feat';
		
		item.equipmentType = 'misc';
		item.equipmentSubtype = 'other';
	
		// Tag determines itemtype
		for (const tag of topic.getElementsByTagName('tag_assign')) {
			const tag_id = tag.getAttribute('tag_id');
			const tag_name = structure.tags.get(tag.getAttribute('tag_id'));
			if (!tag_name) continue;
			//console.debug(`    Checking tag '${tag_name}'`);
			
			switch (tag_name) {
			case 'Archetype':
				item.featType = 'classFeature';
				break;
				
			case 'Trait':
				item.featType = 'trait';
				break;
			// Domain tags for "Magic Item type"
			case 'Armor/Shield':
				item.equipmentType = 'armor';
				item.equipmentSubtype = 'lightArmor'; // 'mediumArmor' // 'heavyArmor'
				break;
			case 'Shield':
				item.equipmentType = 'shield';
				item.equipmentSubtype = 'lightShield'; // 'heavyShield' // 'towerShield' // 'other'
				break;
			case 'Weapon':
				item.weaponType = 'simple';		// simple|martial|exotic|misc
				item.weaponSubtype = 'light';	// light|1h|2h|ranged  (for weaponType=="misc" it is splash|other)
				break;
			case 'Wondrous Item':
				item.equipmentType = 'misc';
				item.equipmentSubtype = 'wondrous';
				break;
				
			case 'Construct Modification':
				break;

			case 'Potion':
				item.consumableType='potion';
				break;
			case 'Scroll':
				item.consumableType='scroll';
				break;
			case 'Staff':
				item.consumableType='staff';
				break;
			case 'Wand':
				item.consumableType='wand';
				break;


			//case 'Ring' : 
			//case 'Rod': 
			//case 'Spellbook':
			//case 'Wondrous Item':
				
			// Domain tags for "Magic Item Slot"
			case "Armor":
				item.slot='armor';
				break;
			case "Shield": 
				if (item.equipmentType==='armor') item.equipmentType='shield';
				item.slot='shield';
				break;
			case "Belt":   item.slot='belt'; break;
			case "Body":   item.slot='body'; break;
			case "Chest":  item.slot='chest'; break;
			case "Eyes":   item.slot='eyes'; break;
			case "Feet":   item.slot='feet'; break;
			case "Hands":  item.slot='hands'; break;
			case "Head":   item.slot='head'; break;
			case "Neck":   item.slot='neck'; break;
			case "None":   item.slot='slotless'; break;
			case "Ring":   item.slot='ring'; break;
			case "Wrist":  item.slot='wrists'; break;
			case "Headband":  item.slot='headband'; break;
			case "Shoulders": item.slot='shoulders'; break;
			// Domain tags for "Special Item Type"
			//case 'Artifact':
			//case "Cursed Item":
			//case "Magic Item":
			//	item.equipmentType = 'misc';
			//	item.equipmentSubtype = 'wondrous';
			//	break;
			
			// Armour Types
			case 'Light Armor':  item.equipmentType = 'armor'; item.equipmentSubtype = 'lightArmor';  break;
			case 'Medium Armor': item.equipmentType = 'armor'; item.equipmentSubtype = 'mediumArmor'; break;
			case 'Heavy Armor':  item.equipmentType = 'armor'; item.equipmentSubtype = 'heavyArmor';  break;
			case "Shields":      item.equipmentType = 'shield'; break;
			
			// Weapon Types
			case "Light Melee Weapons":      item.weaponSubtype = 'light';  break;
			case "One-Handed Melee Weapons": item.weaponSubtype = '1h';     break;
			case "Two-Handed Melee Weapons": item.weaponSubtype = '2h';     break;
			case "Ranged Weapons":           item.weaponSubtype = 'ranged'; break;
			//case "Ranged Siege Engines":
			//case "Close Assault Siege Engines" :
			case "Simple Weapons":  item.weaponType = 'simple';  break;
			case "Martial Weapons": item.weaponType = 'martial'; break; 
			case "Exotic Weapons":  item.weaponType = 'exotic';  break;
			
			default:
				break;
			}
		}
		
		return item;
	}
}
