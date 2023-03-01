/**
 * 
 * @param {*} packs     An array of packs to check
 * @param {*} typematch array of strings that must match the 'type' of the Item's to be passed to testfunc
 * @param {*} testfunc  A function to check the name supplied as the only parameter
 * @returns {*} A copy of the data from the pack, or null
 */
async function searchPacks(packs, typematch, testfunc) {
	for (const pack of packs) {
		const entry = pack.index.find(item => typematch.includes(item.type) && testfunc (item.name.toLowerCase()));
		if (entry) {
			let result = (await pack.getDocument(entry._id)).toObject();
			delete result._id;
			return result;
		}
	}
	return null;
}

function toArray(thing) {
	return !thing ? [] : Array.isArray(thing) ? thing : [thing];
}

function noType(name) {
	if (name.endsWith(' (Ex)') || 
		name.endsWith(' (Su)') ||
		name.endsWith(' (Sp)')) {
		return name.slice(0,-5);
	}
	return name;
}

// The types of Item which appear on the Inventory tab of Actors
const ITEM_TYPES = [
	//'attack',
	//'buff',
	//'class',
	//'feat',
	//'spell',
	'consumable',
	'container',
	'equipment',
	'loot',
	'weapon'
];

let ItemAction;
let ItemSpellPF;

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
		[ "Armor Proficiency (Light)",  "Armor Proficiency, Light" ],
		[ "Armor Proficiency (Medium)", "Armor Proficiency, Medium" ],
		[ "Armor Proficiency (Heavy)",  "Armor Proficiency, Heavy" ],
	]);

	static once;
	static skill_mapping = {};
	static spellschool_names = {};
	static ability_names = {}

	static alignment_mapping = {
		'Lawful Good' : 'lg',
		'Lawful Neutral' : 'ln',
		'Lawful Evil' : 'le',
		'Neutral Good': 'ng',
		'True Neutral' : 'tn',
		'Neutral Evil': 'ne',
		'Chaotic Good': 'cg',
		'Chaotic Neutral': 'cn',
		'Chaotic Evil': 'ce'
	}
	
	static wizard_subclasses = [ 'Abjurer', 'Conjurer', 'Diviner', 'Enchanter', 'Evoker', 'Illusionist', 'Necromancer', 'Transmuter', 'Universalist' ];
	
	static item_packs;
	static feat_packs;
	static classability_packs;

	static async initModule() {
		// Load ItemAction class
		let { ItemAction:temp1, ItemSpellPF:temp2 } = await import("../../../systems/pf1/pf1.js");
		ItemAction  = temp1;
		ItemSpellPF = temp2;

		// Delete any previous stored data first.
		RWPF1Actor.item_packs = [];
		RWPF1Actor.feat_packs = [];
		RWPF1Actor.classability_packs = [];

		// Get a list of the compendiums to search,
		// using compendiums in the two support modules first (if loaded)
		let items = { core: [], modules: []};
		let feats = { core: [], modules: []};
		let classfeats = { core: [], modules: []};
		let worldpacks = [];
		for (const pack of game.packs) {
			if (pack.metadata.type === 'Item')
			{
				// 'type' of 'Item' documents are:
				// attack
				// buff
				// class (racial hd, mythic path, etc.)
				// consumable
				// equipment (magic item, etc)
				// feat (class feature, talent, etc)
				// loot
				// spell
				// weapon
				// race (ItemRacePF)
				// ?container (ItemContainerPF)
				let stuff = items;
				if (pack.metadata.name.includes('feats') || pack.metadata.name.includes('traits'))
					stuff = feats;
				else if (pack.metadata.name.includes('class-abilities'))
					stuff = classfeats;

				if (pack.metadata.packageType === 'world') {
					// We can't be sure what is actually in a WORLD compendium, so use the pack for all three types of things.
					worldpacks.push(pack);
				} else if (pack.metadata.packageType === 'system')
					stuff.core.push(pack);
				else if (
					pack.metadata.packageName === 'pf-content' ||
					pack.metadata.packageName === 'pf1-archetypes')
					stuff.modules.push (pack);
			}
		}
		// Core packs have better modifiers in them, so use them first.
		// Always put the core packs last - i.e. prefer contents from modules before core
		// so that the module compendiums are searched first.

		// WORLD compendiums first, then SYSTEM compendiums, then MODULE compendiums
		RWPF1Actor.item_packs = [].concat(worldpacks, items.core, items.modules);
		RWPF1Actor.feat_packs = [].concat(worldpacks, feats.core, feats.modules);
		RWPF1Actor.classability_packs = [].concat(worldpacks, classfeats.core, classfeats.modules);

		if (RWPF1Actor.once) return;
		RWPF1Actor.once=true;

		RWPF1Actor.skill_mapping = new Map();
		for (const [key,value] of Object.entries(CONFIG.PF1.skills)) {
			RWPF1Actor.skill_mapping[value.toLowerCase()] = key;
		}
		for (const [key,value] of Object.entries(CONFIG.PF1.spellSchools)) {
			RWPF1Actor.spellschool_names[value.toLowerCase()] = key;
		}
		// both "strength" and "str" are stored with "str" as the value
		for (const [key,value] of Object.entries(CONFIG.PF1.abilities)) {
			RWPF1Actor.ability_names[value.toLowerCase()] = key;
			RWPF1Actor.ability_names[key] = key;
		}
	}
	
	static async createActorData(character) {
		// The main character
		let result = [ await RWPF1Actor.createOneActorData(character) ];
		// The minions (if any)
		for (const minion of toArray(character.minions.character)) {
			result.push (await RWPF1Actor.createOneActorData(minion));
		}
		return result;
	}
		
	static async createOneActorData(character) {

		//console.debug(`Parsing ${character.name}`);
		const numberpattern = /[\d]+/;

		function addParas(string) {
			if (!string) return "";
			return `<p>${string.replace(/\n/g,'</p><p>')}</p>`;
		}
		
		// role="pc" is set on any character's in a PC's portfolio, including sidekicks and mounts.
		// A better test is to check for type="Hero" to detect a proper PC.
		let actor = {
			name: character.name,
			type: (character.role === 'pc' && character.type === 'Hero') ? 'character' : 'npc',		// 'npc' or 'character'
			relationship : character.relationship,
			system: {
				abilities: {},
				attributes: {},
				details: {},
				skills: {},
				traits: {},
			},
			items: []		// add items with :   items.push(new Item(itemdata).system)
		};

		// system.traits.size - fine|dim|tiny|med|lg|huge|grg|col
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
	
		//
		// SUMMARY tab
		//

		// system.attributes.hp.value/base/max/temp/nonlethal
		//let hp = +character.health.hitpoints;
		actor.system.attributes.hp = {
			value: +character.health.currenthp,
			//base:  +character.health.hitpoints,		// This screws up PF1E if automatic HP calculation is enabled
			min:   0,
			max:   +character.health.hitpoints,
			nonlethal: +character.health.nonlethal,
		};
		// system.attributes.wounds.min/max/base/value
		// system.attributes.vigor.min/value/temp/max/base
		// system.attributes.woundThresholds.penalty/mod/level/override

		// system.details.cr.base/total
		if (actor.type === 'character') {
			// system.details.xp.value/min/max
			actor.system.details.xp = {
				value: +character.xp.total,
				min  : 0,
				max  : +character.xp.total
			};
			actor.system.attributes.hd = { total: character.classes.level};
		} else {
			let cr = +character.challengerating.value;
			actor.system.details.cr = { base: cr, total: cr };
			actor.system.details.xp = { value : +character.xpaward.value };
		};
		// system.details.height/weight/gender/deity/age
		actor.system.details.height = character.personal.charheight.text;
		actor.system.details.weight = character.personal.charweight.text;
		actor.system.details.gender = character.personal.gender;
		actor.system.details.deity = character?.deity?.name;
		actor.system.details.age = character.personal.age;

		const hitpoints = +character.health.hitpoints;  // does NOT include temp hit points
		// Ignore any possible "12 HD;" prefix, putting just the second half into justdice
		// Calculate total number of HD for the character
		const hitdice = character.health.hitdice;		// either "9d8+16" or "12 HD; 7d6+5d10+67" or just "7d6+5d10+67"
		let t1 = hitdice.split(';');
		let justdice = t1[t1.length - 1];
		let lastpart = hitdice.match(/[+-][\d]+$/);	// ensure we keep the sign on the fixed modifier
		let hp_bonus = lastpart ? +lastpart[0] : 0;
		let total_hd = 0;
		for (const part of justdice.split(/[+-]/))
			if (part.includes('d')) total_hd += parseInt(part); // first number from "xdy"
		let classes_hd = +character.classes.level;
		let races_hd  = total_hd - classes_hd;
		
		let remain_hp = hitpoints - hp_bonus;
		let races_hp  = (races_hd > 0) ? Math.round(remain_hp * races_hd / total_hd) : 0;
		let classes_hp = remain_hp - races_hp;

		if (actor.type === 'character') {
			// For PCs, we can determine temporary hit points = difference between hp_bonus and CON bonus
			let con_bonus=0;
			for (const attr of character.attributes.attribute) {
				if (attr.name === 'Constitution') {
					con_bonus = +attr.attrbonus.base * total_hd;
					break;
				}
			}	
			actor.system.attributes.hp.temp = hp_bonus - con_bonus;
			if (classes_hp>0)
				classes_hp += actor.system.attributes.hp.temp;
			else
				races_hp += actor.system.attributes.hp.temp;
		} else {
			actor.system.attributes.hd = { total: total_hd };  // TODO - not entirely correct!
		}
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
		let classnames = [];
		for (const cclass of toArray(character.classes?.["class"])) {
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
			let lowername=name.toLowerCase();
			let classdata = await searchPacks(RWPF1Actor.item_packs, ['class'], itemname => itemname === lowername);
			if (classdata) {
				//console.debug(`Class ${entry.name} at level ${cclass.levels}`);

				// class.hp needs setting to the amount of HP gained from levelling in this class.
				// class.fc needs setting for the favoured class with information as to how the point was spent.
				// Do all NPCs really get the HP favoured class bonus on their stats?
				if (favclasses.includes(cclass.name) || actor.type === 'npc') {
					// This is NOT a favoured class, so cancel any favoured class bonuses.
					console.debug(`Setting favoured class for ${cclass.name}`);
					classdata.system.fc.hp.value = 0;
					classdata.system.fc.skill.value = levels;  // TODO - might NOT be allocated to skills (that information isn't available in POR)
					classdata.system.fc.alt.value = 0;
				}
				classnames.push(classdata.name);
					
				// Start by adding the class item with the correct number of levels & HP
				classdata.system.level = levels;
				classdata.system.hp = class_hp;		// how do we work this out?
				// Use the name from HL, since it might include the archetype (specialisation)
				classdata.name = cclass.name;
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
					const itemData = (await pack.getDocument(itemId)).toObject();
						
					// No record on each classFeature as to which class and level added it.
					//classUpdateData[`flags.pf1.links.classAssociations.${itemData.id}`] = co.level;	// itemData.id isn't valid yet!
					actor.items.push(itemData);
				}
			} else {
				// Create our own placemarker class.
				classdata = {
					name: cclass.name,
					type: 'class',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: { 
						level : levels,
						hp    : class_hp,
					},
					//system: { description : { value : addParas(feat.description['#text']) }}
				};
				actor.items.push(classdata);
			}
		} // for (class)

		// <race racetext="human (Taldan)" name="human" ethnicity="Taldan"/>
		const lowerrace = character.race.name.toLowerCase();
		let racedata = await searchPacks(RWPF1Actor.item_packs, ['race'], itemname => itemname === lowerrace);  // needed for attribute processing
		if (racedata) {
			actor.items.push(racedata);
		} else if (character.types.type?.name == 'Humanoid') {
			// Only do manual entry for humanoids, since monstrous races
			// have "classes" of the monster/animal levels
			console.warn(`Race '${character.race.name}' not in 'races' pack for ${character.name}`);
			const itemdata = {
				name: character.race.name,
				type: 'race',
				creatureType: character.types?.type?.name,
				img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
				//system: { description : { value : addParas(character.race.name['#text']) }}
			};
			actor.items.push(itemdata);
		}
		// <types><type name="Humanoid" active="yes"/>
		// <subtypes><subtype name="Human"/>
		if (character.types.type) {
			// Search for racialhd information
			const racehdlower = character.types.type.name.toLowerCase();
			let itemdata = await searchPacks(RWPF1Actor.item_packs, ['class'], itemname => itemname === racehdlower);
			if (itemdata) {
				itemdata.system.level = races_hd;
				itemdata.system.hp = races_hp;
				if (races_hd == 0) {
					itemdata.system.skillsPerLevel = 0;
					itemdata.system.savingThrows.fort.value = "Low";
					itemdata.system.savingThrows.ref.value = "Low";
					itemdata.system.savingThrows.will.value = "Low";
				}					
			} else {
				console.warn(`racialhd '${character.types.type.name}' not in 'racialhd' pack`);
				itemdata = {
					name: character.types.type.name,
					type: 'class',
					classType: 'racial',
					hp : races_hp,
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					//system: { description : { value : addParas(character.racialhd.name['#text']) }}
				};
			}
			let subtypes = [];
			for (const st of toArray(character.subtypes?.subtype)) {
				subtypes.push(st.name);
			}
			if (subtypes.length > 0) itemdata.name = itemdata.name + ` (${subtypes.join(', ')})`;
			actor.items.push(itemdata);
		}
		//
		// ATTRIBUTES tab
		//
		// attrvalue.base is unmodified by magical items, but INCLUDES racial bonus!
		// attrvalue.modified includes bonuses
		for (const attr of character.attributes.attribute) {
			actor.system.abilities[RWPF1Actor.ability_names[attr.name.toLowerCase()]] = {
				value: (attr.attrvalue.text=='-') ? 0 : +attr.attrvalue.base,
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

		// system.attributes.hpAbility
		// system.attributes.cmbAbility
		// system.attributes.hd -> actually handled by level of "racialhd" item

		// system.attributes.sr.formula/total
		// system.attributes.saveNotes
		// system.attributes.acNotes
		// system.attributes.cmdNotes
		// system.attributes.srNotes
		// system.attributes.attack.general/shared/melee/ranged/meleeAbility/rangedAbility
		// system.attributes.damage.general/weapon/spell
		// system.attributes.maxDexBonus
		// system.attributes.mDex.armorBonus/shieldBonus
		// system.attributes.acp.gear/encumbrance/total/armorBonus/shieldBonus/attackPenalty
		// system.attributes.energyDrain
		// system.attributes.quadruped

		// system.attributes.prof
		// system.attributes.speed.land/climb/swim/burrow/fly (base/total + for fly, .maneuverability)
		// movement.speed includes modifiers due to conditions (but active conditions aren't in POR)
		// movement.basespeed is the base speed (before modifiers)
		actor.system.attributes.speed = {
			land: {
				base:  +character.movement.basespeed.value,
				total: +character.movement.basespeed.value
			},
		}
		// system.attributes.conditions((long list false|true)
		// system.attributes.spells.usedSpellbooks[]
		// system.attributes.spells.spellbooks.primary/secondary/tertiary/spelllike
		// system.details.level.value/min/max
		// system.details.mythicTier
		// system.details.bonusFeatFormula
		// system.details.alignment: 'tn'
		actor.system.details.alignment = RWPF1Actor.alignment_mapping[character.alignment.name];
		// system.details.biography.value/public
		let bio = character.personal.description['#text'];
		if (bio) {
			actor.system.details.biography = {
				value: addParas(bio)	  // Each paragraph is on a single line
			};
		}
		// system.details.notes.value/public
		// system.details.bonusRankSkillFormula
		// system.details.tooltip.name/hideHeld/hideArmor/hideBuffs/hideConditions/hideClothing/hideName
		
		//
		// COMBAT tab
		//
		
		// system.attributes.init.value/bonus/total/ability
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
		let attackrange = parseInt(character.attack.rangedattack);
		let attackmelee = parseInt(character.attack.meleeattack);
		for (const attack of toArray(character.melee?.weapon).concat(toArray(character.ranged?.weapon))) {
			if (attack?.useradded === "no") {
				// decode crit: either "x2" or "17-20/x2"
				let x = attack.crit.indexOf("×");
				let critrange = (x === 0) ? 20 : parseInt(attack.crit);
				let critmult  = +attack.crit.slice(x+1);
				let primaryAttack = parseInt(attack.attack) >= (attack.rangedattack ? attackrange : attackmelee);
				
				let itemdata = {
					// item
					name: attack.name,
					type: "attack",
					hasAttack: true,
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
						// TEMPLATE: itemDescription
						description: { value: attack.description["#text"], chat: "", unidentified: "" },
						attackNotes: (attack.damage.indexOf(" ") > 0) ? [attack.damage] : [],
						attackType: "natural",		// or weapon?
						primaryAttack: primaryAttack,	// TODO : very coarse (if false, then -5 to attack)
					}
				}

				// Build the actual attack action
				let actiondata = ItemAction.defaultData;
				actiondata.activation = { cost: 1, type: "attack" };
				actiondata.duration   = { value: null, units: "inst" };
				//actiondata.attackName = attack.name;
				actiondata.actionType = (attack.rangedattack ? "rwak" : "mwak");		// eg "rwak" or "mwak"
				actiondata.attackBonus = (parseInt(attack.attack) - +character.attack.baseattack + CONFIG.PF1.sizeSpecialMods[actor.system.traits.size]).toString();		// use FIRST number, remove BAB (since FVTT-PF1 will add it)
				let dmgparts = []; // convert 'B/P/S' to array of damage types
				for (const part of attack.typetext.split('/')) {
					switch (part) {
						case 'B': dmgparts.push('bludgeoning'); break;
						case 'P': dmgparts.push('piercing'); break;
						case 'S': dmgparts.push('slashing'); break;
					}
				}
				dmgparts.push(attack.typetext);
				actiondata.damage.parts = [ [ attack.damage.split(' ')[0] , { values: dmgparts, custom: ""} ] ],			//   [ [ "sizeRoll(1, 4, @size)", "B" ] ],
				actiondata.enh = { override: false, value: 0};
				actiondata.name = 'Attack';
				actiondata.ability = {
					// attackBonus and damage already include attackBonus/damage.parts above, so don't let FVTT-PF1 add it again
					//attack: (attack.rangedattack ? "dex" : "str"),		// "str" or "dex"
					//damage: (attack.rangedattack ? null  : "str"),		// "str" or "dex" or null (ranged weapons might always have null)
					damageMult: 1,
					critRange: critrange,
					critMult:  critmult,
					attack: '',  // don't apply stat
					damage: '',  // don't apply stat
				};
				actiondata.attackNotes = (attack.damage.indexOf(" ") > 0) ? [attack.damage] : [];
				actiondata.range.units = attack.categorytext.includes('Reach Weapon') ? 'reach' : 'melee';
				actiondata.attackType = "natural";		// or weapon?
				actiondata.nonlethal = (attack.damage.indexOf("nonlethal") != -1);

				itemdata.system.actions = [actiondata];
				//itemdata.actions = new Map();
				//itemdata.actions.set(actiondata._id, actiondata);

				if (attack.rangedattack) {
					itemdata.system.range = { 
						value: attack.rangedattack.rangeinctext,
						units: "ft",
						maxIncrements: 1,
						//minValue: null,
						//minUnits: "",
					};
				} else {
					itemdata.system.range = { 
						//value: null,
						units: "melee",
						//maxIncrements: 1,
						//minValue: null,
						//minUnits: "",
					};
				}
				actor.items.push(itemdata);
			}
		}
		// COMBAT - MISCELLANEOUS
		for (const miscatk of toArray(character.attack.special)) {
			let atkdata = {
				name: "Special Attack: " + miscatk.shortname,
				type: "attack",
				img:  "systems/pf1/icons/skills/yellow_36.jpg",
				system: {
					description: {
						value: miscatk.description["#text"],
						chat: "",
						unidentified: ""
					},
					attackType: "misc",
				},
			};
			actor.items.push(atkdata);
		}
		
		//
		// INVENTORY tab
		//
		
		// system.currency.pp/gp/sp/cp
		actor.system.currency = {
			pp: +character.money.pp,
			gp: +character.money.gp,
			sp: +character.money.sp,
			cp: +character.money.cp,
		}
		// system.altCurrency.pp/gp/sp/cp  (weightless coins) - count as weightless

		// system.attributes.encumbrance.level/levels/carriedWeight
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
		for (const item of toArray(character.gear?.item).concat(toArray(character.magicitems?.item))) {
			// Get all forms of item's name once, since we search each pack.
			let lower = noType(item.name).toLowerCase();
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
			// Handle "Something (else)" -> "Something, else"
			if (lower.endsWith(')')) {
				let pos = lower.lastIndexOf(' (');
				noparen = lower.slice(0,pos) + ', ' + lower.slice(pos+2,-1);
				//console.error(`'${item.name}' has noparen = '${noparen}'`)
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
				
			// Finally, some name changes aren't simple re-mappings
			if (RWPF1Actor.item_name_mapping.has(lower)) lower = RWPF1Actor.item_name_mapping.get(lower);
				
			// Match items of any type
			let itemdata = await searchPacks(RWPF1Actor.item_packs, ITEM_TYPES, itemname =>
				itemname === lower || 
				(singular && itemname === singular) || 
				(reversed && itemname === reversed) || 
				(noparen  && itemname === noparen))

			// Potions, Scrolls and Wands
			if (!itemdata) {
				let type;
				if (lower.startsWith('potion of '))
					type='potion';
				else if (lower.startsWith('scroll of '))
					type='scroll';
				else if (lower.startsWith('wand of '))
					type='wand';
				if (type) {
					let found;
					let pos = lower.indexOf(' of ');
					let spells = lower.slice(pos+4).split(', ');
					for (const spellname of spells) {
						let spelldata = await searchPacks(RWPF1Actor.item_packs, ['spell'], itemname => itemname == spellname);
						if (!spelldata) {
							console.error(`Failed to find spell '${spellname}' for item '${item.name}'`)
							continue;
						}
						let itemdata = await ItemSpellPF.toConsumable(spelldata, type);
						if (itemdata) {
							// Check uses
							for (const tracked of toArray(character.trackedresources?.trackedresource)) {
								if (tracked.name.toLowerCase().startsWith(lower)) {
									const left = +tracked.left;
									if (type==='wand')
										itemdata.system.uses.value = +tracked.left;
									if (!left) itemdata.system.quantity = +tracked.left;
								}
							}
							actor.items.push(itemdata);
							// Abort the rest of creation for this item
							found=true;
						}
						else
							console.error(`Failed to create ${type} for '${item.name}'`);
					}
					if (found) continue;
				}
			}
			if (!itemdata) {
				// Maybe this item contains a longer description, so look for an item whose name
				// appears at the end of this item's name
				itemdata = await searchPacks(RWPF1Actor.item_packs, ITEM_TYPES, itemname =>
					lower.endsWith(itemname) || 
					(singular && singular.endsWith(itemname)) || 
					(reversed && reversed.endsWith(itemname)) || 
					(noparen  && noparen.endsWith(itemname)))
				if (itemdata)
					console.log(`Found item (${itemdata.name}) which ENDS with the creature's item name (${item.name})`)
			}
				
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
				// Special modifier for armor
				if (itemdata.type === 'equipment' &&
				   itemdata.system.equipmentType === 'armor') {
					if (lower.includes('mithral ')) {
						// armor check penalty reduced by 3
						// max dex increased by 2
						// weight set to 50%
						itemdata.system.armor.acp = (itemdata.system.armor.acp<3) ? 0 : (itemdata.system.armor.acp-3);
						itemdata.system.armor.dex += 2;
						itemdata.system.weight.value /= 2;
					}
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

				// TODO: Consumable items which contain a spell..
				//if (item.name.startsWith('Potion of'))
				//if (item.name.startsWith('Scroll of'))
				//if (item.name.startsWith('Wand of'))

				// Create our own placemarker item.
				const itemdata = {
					name: item.name,
					type: item.name.includes(' lbs)') ? 'container' : 'loot',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
						quantity: +item.quantity,
						weight:   { value: +item.weight.value },
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
				//cs:      (skill.classskill  === 'yes'),		// overridden by class definitions (if the creature has classes!)
				// rt, acp, background
			}
			let baseskill = this.skill_mapping[skill.name.toLowerCase()];
			if (!value.ability && value.rank===0) value.rank = +skill.value;
			if (baseskill) {
				actor.system.skills[baseskill] = value;
			} else {
				let paren = skill.name.indexOf(' (');
				baseskill = paren ? this.skill_mapping[skill.name.slice(0,paren).toLowerCase()] : undefined;
				value.name = skill.name;
				if (baseskill) {
					if (!actor.system.skills[baseskill]) actor.system.skills[baseskill] = {subSkills : {}};
					else if (!actor.system.skills[baseskill].subSkills) actor.system.skills[baseskill].subSkills = {};
					actor.system.skills[baseskill].subSkills[`${baseskill}${++numsub[baseskill]}`] = value;
				} else {
					console.debug(`PF1 custom skill '${skill.name}'`);
					value.custom = true;
					actor.system.skills[`customSkill${++numcust}`] = value;
				}
			}
		}
		
		
		//
		// FEATURES tab
		//
		
		// system.items (includes feats) - must be done AFTER skills
		for (const feat of toArray(character.feats?.feat)) {
			// since that indicates a class or race-based feature.
			let featname = noType(feat.name);
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
			if (lowername.endsWith(')')) shortname = lowername.slice(0, lowername.lastIndexOf(' ('));
				
			// Ignore 'classFeat' entries when searching for normal feats
			let itemdata = await searchPacks(RWPF1Actor.feat_packs, ['feat'],
				itemname => itemname === lowername || (shortname && itemname == shortname));

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
					let baseskill = this.skill_mapping[skillname.toLowerCase()];
					if (baseskill) {
						ranks = actor.system.skills[baseskill].rank;
						skill = 'skill.' + baseskill;
					} else {
						// Check for a subskill
						let paren = skillname.indexOf(' (');
						skill = paren ? this.skill_mapping[skillname.slice(0,paren).toLowerCase()] : undefined;
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
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
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
		
		// Traits (on FEATURES tab)
		// <trait name="Dangerously Curious" categorytext="Magic">
		for (const trait of toArray(character.traits?.trait)) {

			// Which type of Item actually might contain something from an HL trait
			// Some traits in the PF sources has the name of the module from which it is derived.
			let lowername = trait.name.toLowerCase();
			let shortname;
			if (lowername.endsWith(')')) shortname = lowername.slice(0, lowername.lastIndexOf(' ('));

			let itemdata = await searchPacks(RWPF1Actor.feat_packs, ['feat'],
				itemname => itemname == lowername || itemname == shortname);
			if (!itemdata) {
				itemdata = {
					name: trait.name,
					type: 'feat',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
						featType: (trait.categorytext == 'Racial') ? 'racial' : 'trait',	// feat, classFeat, trait, racial, misc, template
						description: {
							value: addParas(trait.description['#text'])
						}
					}
				}
			}
			if (!itemdata.system.uses?.max) {
				// maybe add uses
				let uses = trait.name.match(/ \((\d+)\/([\w]+)\)/);
				if (uses) {
					itemdata.system.uses = { max : +uses[1], per: uses[2], value: 0}
					itemdata.name = trait.name.slice(0,uses.index);
				}
			}
			actor.items.push(itemdata);
		}
		// and otherspecials.special with sourcetext attribute set to one of the classes
		// find items in "class-abilities"
		
		
		// defensive.[special.shortname]  from 'class abilities'
		for (const special of toArray(character.defensive.special).concat(toArray(character.otherspecials.special))) {
			// Special abilities such as class abilities have a type of 'feat'
			// Ignore anything in parentheses
			let lowername = special.shortname.toLowerCase();
			let shortname;
			if (lowername.endsWith(')')) shortname = lowername.slice(0, lowername.lastIndexOf(' ('));

			// Ignore abilities which were auto-entered by the class processing above,
			// or which were added from a magic item.
			let found=false;
			for (const item of actor.items) {
				let itemname = item.name.toLowerCase();
				if (itemname == lowername || (shortname && itemname == shortname)) {
					found=true;
					break;
				}
			}
			if (found) {
				console.log(`ignoring ${special.name} since it was already exists in items[]`);
				continue;
			}

			let specname = special.name;
			let itemdata = await searchPacks(classnames.includes(special?.sourcetext) ? RWPF1Actor.classability_packs : RWPF1Actor.feat_packs, ['feat'], 
				itemname => itemname == lowername || (shortname && itemname == shortname));
			if (!itemdata) {
				itemdata = {
					type: 'feat',
					img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
					system: {
						featType: (special?.sourcetext == 'Trait') ? 'trait' : (classnames.includes(special?.sourcetext)) ? 'classFeat' : 
							actor.type === 'character' ? 'misc' : 'racial'
					}
				}
				if (special.sourcetext) itemdata.system.associations = {classes: [[special.sourcetext]]};
				// maybe add uses
				let uses = specname.match(/ \((\d+)\/([\w]+)\)/);
				if (uses) {
					itemdata.system.uses = { max : +uses[1], per: uses[2], value: 0}
					specname = specname.slice(0,uses.index);
				}
			}
			itemdata.name = noType(specname);
			//itemdata.system.featType = 'racial';
			itemdata.system.description = { value: addParas(special.description['#text'])};
			if (special.type) itemdata.system.abilityType = special.type.slice(0,2).toLowerCase();
			actor.items.push(itemdata);
		}
		

		//
		// BUFFS tab
		//
		
		
		//
		// BIOGRAPHY tab
		//
		
		
		//
		// SPELLS tab
		//
		// system.attributes.spells.spellbooks.primary/secondary/tertiary/spelllike
		//
		// system.attributes.spellbooks.usedSpellbooks: [ 'primary', 'tertiary', 'spelllike' ]
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
		let spellbooks = [ 'primary', 'secondary', 'tertiary' ];
		let spellmaps = new Map();

		actor.system.attributes.spells = { spellbooks : {}}
		for (const sclass of toArray(character.spellclasses?.spellclass)) {

			let hasCantrips = false;
			for (const level of toArray(sclass.spelllevel)) {
				if (level.level === "0") hasCantrips = true;
			}

			let book = spellbooks[0];
			let classname = sclass.name;
			if (this.wizard_subclasses.includes(classname)) {
				classname = 'Wizard';
			}
			spellbooks.shift();
			actor.system.attributes.spells.spellbooks[book] = {
				inUse: true,
				name:  classname,
				hasCantrips: hasCantrips,
				spellPreparationMode:  sclass.spells === 'Spellbook' ? 'prepared' : 'spontaneous',
				// casterType: high, med, low  // opposite(?) of class' Bab
				class: classname.toLowerCase()
			}
			spellmaps.set(classname, book);
		}
		
		async function addSpells(nodes, memorized=undefined) {
			if (!nodes) return false;
			
			let fixedbook;
			if (typeof memorized === 'string') {
				fixedbook = memorized;
				memorized = undefined;
			}

			// <spell name="Eagle's Splendor" level="2" class="Sorcerer" casttime="1 action" range="touch" target="creature touched" area="" effect="" duration="1 min./level" 
			//		save="Will negates (harmless)" resist="yes" dc="18" casterlevel="7" componenttext="Verbal, Somatic, Material or Divine Focus"
			//		schooltext="Transmutation" subschooltext="" descriptortext="" savetext="Harmless, Will negates" resisttext="Yes" spontaneous="yes">
			// <special name="Serpentfriend (At will) (Ex)" shortname="Serpentfriend (At will)" type="Extraordinary Ability" sourcetext="Sorcerer">
			for (const spell of toArray(nodes)) {
				const lowername = spell.name.toLowerCase();
				const shortpos = lowername.indexOf(' (');
				const shortname = (shortpos > 0) ? lowername.slice(0,shortpos) : lowername;

				// Manage spellbooks
				let sclass = spell['class'];
				if (fixedbook) {
					// Let's assume it is the spell-like category
					actor.system.attributes.spells.spellbooks[fixedbook] = {
						inUse: true,
						hasCantrips: false,
						autoSpellLevelCalculation: false,
						spellPreparationMode: "prepared"
					}
				} else if (!spellmaps.has(sclass)) {
					// Get next available spell book
					if (spellbooks.length == 0) {
						console.warn('Not enough spellbooks to support all the required spell-casting classes')
						return;
					}
					// Get the next available spellbook for the Actor
					let book = spellbooks[0];
					spellbooks.shift();
					actor.system.attributes.spells.spellbooks[book] = {
						inUse: true,
						name:  sclass,
						//casterType: high,
						"class": sclass.toLowerCase()
					}
					spellmaps.set(sclass,book);
				}
				let book = fixedbook || spellmaps.get(sclass);
				
				let itemdata = await searchPacks(RWPF1Actor.item_packs, ['spell'], itemname => itemname == shortname);
				if (!itemdata) {
					// Manually create a spell item
					console.debug(`Manually creating spell '${shortname}'`);
					try {
						itemdata = {
							name: spell.shortname ?? spell.name,
							type: 'spell',
							img:  'icons/svg/hazard.svg',   // make it clear that we created it manually
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
				if (memorized && memorized.has(shortname)) {
					itemdata.system.preparation = { 
						maxAmount: memorized.get(shortname),
						preparedAmount: spell.castsleft || 1,
						spontaneousPrepared: false
					};
				}
				if (shortpos >= 0) itemdata.name = spell.name;	// full name has extra details
				if (lowername.indexOf('at will)') >= 0) itemdata.system.atWill = true;
				const perday = lowername.match(/([\d]+)\/day/);
				if (perday) {
					let uses = +perday[1];
					// TODO - setting uses doesn't do anything
					itemdata.system.uses.max   = uses;
					itemdata.system.uses.value = uses;
					itemdata.system.uses.per   = 'day';

					itemdata.system.preparation = {
						preparedAmount: uses,
						maxAmount: uses,
					}
				}
				//itemdata.system.learnedAt = { 'class': [  };
				actor.items.push(itemdata);
			}
			return true;
		}

		// Technically, we should process spellsmemorized to mark which spells in spellbook are prepared
		let memorized;
		for (const spell of toArray(character.spellsmemorized?.spell)) {
			const lowername = spell.name.toLowerCase();
			const shortpos = lowername.indexOf(' (');
			const shortname = (shortpos > 0) ? lowername.slice(0,shortpos) : lowername;
			let count = 1;
			if (shortpos > 0 && shortpos+4 < lowername.length && lowername.at(shortpos+2) == 'x') {
				let matches = lowername.slice(shortpos).match(numberpattern);
				if (matches) count = +matches[0];
			}
			// need to store the (x2) to know how many times it was memorized
			if (!memorized) memorized = new Map();
			memorized.set(shortname,count);
		}
		await addSpells(character.spellbook.spell, memorized);		// e.g. Wizard (spellsmemorized contains spells actually prepared from the spellbook)
		await addSpells(character.spellsknown.spell); 				// e.g. Bard, Summoner
		if (!character.spellbook.spell)
			await addSpells(character.spellsmemorized.spell);  			// e.g. Ranger
		
		// <special name="Disguise Self (humanoid form only, At will)" shortname="Disguise Self">
		// <special name="Blur (1/day)" shortname="Blur">
		// <special name="Serpentfriend (At will) (Ex)" shortname="Serpentfriend (At will)" type="Extraordinary Ability" sourcetext="Sorcerer">
		await addSpells(character.spelllike.special, "spelllike");  // force into the book 'spelllike'
		
		//
		// NOTES tab
		//
		
		
		//
		// SETTINGS tab
		//
		
		
		//
		// STUFF TO BE PUT INTO THE CORRECT PLACE
		//
		
		// system.traits.senses { dv, ts, bs, bse, ll { enabled, multiplier { dim, bright}}, sid, tr, si, sc, custom }
		actor.system.traits.senses = {}
		if (character.senses.special) {		
			function senseNumber(mysenses,sensename) {
				if (!mysenses) return 0;
				for (const sense of mysenses) {
					if (sense.name.startsWith(sensename)) {
						let matches = sense.name.match(numberpattern);
						if (matches) return +matches[0];
						return 0;
					}
				}
				return 0;
			}
			function sensePresent(mysenses,sensename) {
				if (!mysenses) return false;
				for (const sense of mysenses) {
					if (sense.name.startsWith(sensename)) {
						return true;
					}
				}
				return false;
			}	
			let mysenses = toArray(character.senses.special);
			let myspellike = toArray(character.spelllike.special);
			actor.system.traits.senses = {
				dv:  senseNumber(mysenses,'Darkvision'),
				ts:  senseNumber(mysenses,'Tremorsense'),
				bs:  senseNumber(mysenses,'Blindsight'),
				bse: senseNumber(mysenses,'Blindsense'),
				sid: sensePresent(mysenses,'See in Darkness'),
				tr:  sensePresent(myspellike,'True Seeing (Constant)'),
				si:  sensePresent(myspellike,'See Invisibility (Constant)'),  // spelllike.special.name="See Invisibility (Constant)"
				sc:  sensePresent(mysenses,'Scent'),
			}
			if (sensePresent(mysenses,"Low-Light Vision")) {
				actor.system.traits.senses.ll =  {
					enabled: true,
					multiplier: {
						dim:    2,
						bright: 2,
					}
				}
			}
		}
		
		// system.traits.dr		// damage reduction		(character.damagereduction)
		// system.traits.eres		// energy resistance	(character.resistances)
		// system.traits.cres		// condition resistance	(character.resistances)
		// system.traits.di.value[]/custom	- Damage Immunities
		// system.traits.dv.value[]/custom	- Damage Vulnerabilities
		// system.traits.ci.value[]/custom	- Condition Immunities

		if (character.damagereduction.special) {
			let set = [];
			for (const item of toArray(character.damagereduction.special)) {
				set.push(item.shortname);
			}
			actor.system.traits.dr = set.join(',');
		}
		if (character.resistances.special) {
			let eset = [];
			let cset = [];
			let sset = [];
			let spellres;
			for (const item of toArray(character.resistances.special)) {
				if (item.name.startsWith('Energy Resistance'))
					eset.push(item.shortname);
				else if (item.name.startsWith('Spell Resistance')) {
					let match = item.shortname.match(numberpattern);
					if (match) spellres = match[0];  // need string version for sr.formula
				} else
					cset.push(item.shortname);
			}
			actor.system.traits.eres = eset.join(',');
			actor.system.traits.cres = cset.join(',');
			if (spellres) actor.system.attributes.sr = {formula: spellres, total: +spellres};
		}

		if (character.immunities.special) {
			actor.system.traits.di = {value: []};
			actor.system.traits.ci = {value: []};
			let custom = [];

			for (const item of toArray(character.immunities.special)) {
				let name = item.shortname;
				if (CONFIG.PF1.damageTypes[name])
					actor.system.traits.di.value.push(name);
				else if (CONFIG.PF1.conditionTypes[name])
					actor.system.traits.ci.value.push(name);
				else
					custom.push(name);
			}
			actor.system.traits.di.custom = custom.join(',');
		}
		// system.traits.regen
		// system.traits.fastHealing
		// system.traits.languages.value[]/custom
		if (character.languages.language) {
			actor.system.traits.languages = {
				value: []
			};
			for (const lang of toArray(character.languages.language)) {
				actor.system.traits.languages.value.push(lang.name.toLowerCase());
			}
		}
		if (character.languages.special) {
			if (!actor.system.traits.languages)
				actor.system.traits.languages = {
					value: []
				};
			let spec = [];
			for (const lang of toArray(character.languages.special)) {
				spec.push(lang.name.toLowerCase());
			}
			actor.system.traits.languages.custom = spec.join(',');
		}

		// system.traits.perception.
		// system.traits.stature
		// system.traits.weaponProf.value[]/custom
		// system.traits.armorProf.value[]/custom
		// system.flags
		// system.token (leave empty)		
		// system.effects

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
			// "type" will be promoted outside of the item.system object
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
