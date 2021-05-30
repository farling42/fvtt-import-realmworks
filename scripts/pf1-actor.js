//import { PF1 } from "../../../systems/pf1/pf1.js";

export class RWPF1Actor {

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

	static parseXml(xmlDoc, arrayTags) {

		function parseNode(xmlNode, result) {
			if (xmlNode.nodeName == "#text") {
				let v = xmlNode.nodeValue;
				if (v.trim())
					result['#text'] = v;
				return;
			}
			let jsonNode = {},
			existing = result[xmlNode.nodeName];
			if (existing) {
				if (!Array.isArray(existing))
					result[xmlNode.nodeName] = [existing, jsonNode];
				else
					result[xmlNode.nodeName].push(jsonNode);
			} else {
				if (arrayTags && arrayTags.indexOf(xmlNode.nodeName) != -1)
					result[xmlNode.nodeName] = [jsonNode];
				else
					result[xmlNode.nodeName] = jsonNode;
			}
			if (xmlNode.attributes) {
				for (let attribute of xmlNode.attributes) {
					jsonNode[attribute.nodeName] = attribute.nodeValue;
				}
			}
			for (let node of xmlNode.childNodes) {
				parseNode(node, jsonNode);
			}
		}
		let result = {};
		for (let node of xmlDoc.childNodes) {
			parseNode(node, result);
		}
		return result;
	}

	static async createActorData(xmlString) {
		let parser = new DOMParser();
		const json = RWPF1Actor.parseXml(parser.parseFromString(xmlString, "text/xml"));
		const character = json.document.public.character;

		function addParas(string) {
			return `<p>${string.replace(/\n/g,'</p><p>')}</p>`;
		}
		
		let actor = {
			name: character.name,
			type: (character.type == 'Hero') ? 'character' : 'npc',		// 'npc' or 'character'
			//type: (character.role == 'pc') ? 'character' : 'npc',		// 'npc' or 'character'
			data: {
				abilities: {},
				attributes: {},
				details: {},
				skills: {},
				traits: {},
			},
			items: []
		};


		//
		// SUMMARY tab
		//

		// data.attributes.hp.value/base/max/temp/nonlethal
		actor.data.attributes.hp = {
			value: parseInt(character.health.hitpoints),
			base: parseInt(character.health.hitpoints),
			min: 0,
			max: parseInt(character.health.hitpoints),
		};
		// data.attributes.wounds.min/max/base/value
		// data.attributes.vigor.min/value/temp/max/base
		// data.attributes.woundThresholds.penalty/mod/level/override

		// data.details.cr.base/total
		if (character.challengerating) {
			let cr = parseInt(character.challengerating['#text']);
			actor.data.details.cr = { base: cr, total: cr };
		}
		if (actor.type == 'npc') {
			actor.data.details.xp = { value : parseInt(character.xpaward.value) };
		} else {	
			// data.details.xp.value/min/max
			actor.data.details.xp = {
				value: parseInt(character.xp.total),
				min  : 0,
				max  : parseInt(character.xp.total)
			};
		};
		// data.details.height/weight/gender/deity/age
		actor.data.details.height = character.personal.charheight.text;
		actor.data.details.weight = character.personal.charweight.text;
		actor.data.details.gender = character.personal.gender;
		actor.data.details.deity = character.deity.name;
		actor.data.details.age = character.personal.age;

		// <race racetext="human (Taldan)" name="human" ethnicity="Taldan"/>
		const race_pack = await game.packs.find(p => p.metadata.name === 'races');
		const race = await race_pack.index.find(e => e.name.toLowerCase() === character.race.name);
		if (race) {
			actor.items.push(await race_pack.getEntry(race._id));
		} else {
			console.log(`Race '${character.race.name.toLowerCase()}' not in 'races' pack`);
			const itemdata = {
				name: character.race.name,
				type: 'race',
				//data: { description : { value : addParas(character.race.name['#text']) }}
			};
			actor.items.push(new Item(itemdata));
		}

		//
		// CLASSES sub-tab
		//
		//	<classes level="11" summary="bard (archaeologist) 2/unchained rogue 9" summaryabbr="Brd 2/Rog 9">
		//		<class name="Bard (Archaeologist)" level="2" spells="Spontaneous" casterlevel="2" concentrationcheck="+5" overcomespellresistance="+2" basespelldc="13" castersource="Arcane">
		//			<arcanespellfailure text="0%" value="0"/>
		//		</class>
		//		<class name="Rogue (Unchained)" level="9" spells="" casterlevel="0" concentrationcheck="+3" overcomespellresistance="+0" basespelldc="13" castersource=""/>
		//	</classes>		
		const classes = character.classes?.["class"];
		if (classes) {
			const class_pack = await game.packs.find(p => p.metadata.name === 'classes');
			
			for (const cclass of (Array.isArray(classes) ? classes : [classes] )) {
				// TODO: we shouldn't really do this, because we are stripping the archetype from the class.
				const name = (cclass.name.indexOf('(Unchained)') > 0) ? cclass.name : cclass.name.replace(/ \(.*/,'');
				console.log(`Looking for class called '${name}'`);
				// Strip trailing (...)  from class.name
				const entry = class_pack.index.find(e => e.name === name);
				if (entry) {
					let itemdata = await class_pack.getEntry(entry._id);
					itemdata.data.level = cclass.level;
					actor.items.push(itemdata);
				} else {
					// Create our own placemarker feat.
					const itemdata = {
						name: cclass.name,
						type: 'race',
						data: { level : cclass.level },
						//data: { description : { value : addParas(feat.description['#text']) }}
					};
					actor.items.push(new Item(itemdata));
				}
			}
		}
		
		//
		// ATTRIBUTES tab
		//
		for (const attr of character.attributes.attribute) {
			actor.data.abilities[RWPF1Actor.ability_names[attr.name.toLowerCase()]] = {
				total: attr.attrvalue.modified,
				value: attr.attrvalue.base,
				mod:   attr.attrbonus?.base ? attr.attrbonus.base : 0
			}
		}

		actor.data.attributes.savingThrows = {};
		for (const child of character.saves.save) {
			if (child.abbr == "Fort") {
				actor.data.attributes.savingThrows.fort = {
					total: parseInt(child.save),
					ability: "con"
				};
			} else if (child.abbr == "Ref") {
				actor.data.attributes.savingThrows.ref = {
					total: parseInt(child.save),
					ability: "dex"
				};
			} else if (child.abbr == "Will") {
				actor.data.attributes.savingThrows.will = {
					total: parseInt(child.save),
					ability: "wis"
				};
			}
		};

		// data.attributes.vision.lowLight/darkvision
		actor.data.attributes.vision = {
			lowLight   : character.senses?.special?.name && character.senses.special.name.includes("Low-Light Vision"),
			darkvision : 0,
		}
		// data.attributes.hpAbility
		// data.attributes.cmbAbility
		// data.attributes.hd.base/total/max

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
		actor.data.attributes.speed = {
			land: {
				base: parseInt(character.movement.speed.value),
				total: parseInt(character.movement.speed.value)
			},
		}
		// data.attributes.conditions((long list false|true)
		// data.attributes.spells.usedSpellbooks[]
		// data.attributes.spells.spellbooks.primary/secondary/tertiary/spelllike
		// data.details.level.value/min/max
		// data.details.mythicTier
		// data.details.bonusFeatFormula
		// data.details.alignment: 'tn'
		actor.data.details.alignment = character.alignment;
		// data.details.biography.value/public
		let bio = character.personal.description['#text'];
		if (bio) {
			actor.data.details.biography = {
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
		actor.data.attributes.init = {
			value: parseInt(character.initiative.total),
			bonus: parseInt(character.initiative.total),
			total: parseInt(character.initiative.total),
			ability: RWPF1Actor.ability_names[character.initiative.attrname]
		};

		actor.data.attributes.bab = {
			value: parseInt(character.attack.baseattack),
			total: parseInt(character.attack.baseattack)
		};
		actor.data.attributes.cmd = {
			value: parseInt(character.maneuvers.cmd),
			total: parseInt(character.maneuvers.cmd),
			flatFootedTotal: parseInt(character.maneuvers.cmdflatfooted)
		}
		actor.data.attributes.cmb = {
			value: parseInt(character.maneuvers.cmb),
			total: parseInt(character.maneuvers.cmb),
		}

		actor.data.attributes.naturalAC = parseInt(character.armorclass.fromnatural);
		actor.data.attributes.ac = {
			normal: {
				value: parseInt(character.armorclass.ac),
				total: parseInt(character.armorclass.ac)
			},
			touch: {
				value: parseInt(character.armorclass.touch),
				total: parseInt(character.armorclass.touch),
			},
			flatFooted: {
				value: parseInt(character.armorclass.flatfooted),
				total: parseInt(character.armorclass.flatfooted)
			}
		};


		//
		// INVENTORY tab
		//
		
		// data.currency.pp/gp/sp/cp
		actor.data.currency = {
			pp: parseInt(character.money.pp),
			gp: parseInt(character.money.gp),
			sp: parseInt(character.money.sp),
			cp: parseInt(character.money.cp),
		}
		// data.altCurrency.pp/gp/sp/cp  (weightless coins)


		// data.attributes.encumbrance.level/levels/carriedWeight
		const enc = character.encumbrance;
		actor.data.attributes.encumbrance = {
			level: (enc.level == 'Light Load') ? 0 : 1, // 0 = light load TBD
			levels: {
				light: parseInt(enc.light),
				medium: parseInt(enc.medium),
				heavy: parseInt(enc.heavy),
				//carry:
				//drag:
			},
			carriedWeight: parseInt(enc.carried)
		};

		
		//
		// FEATURES tab
		//
		
		// data.items (includes feats)
		const feat_pack = await game.packs.find(p => p.metadata.name === 'feats');
		for (const feat of (Array.isArray(character.feats.feat) ? character.feats.feat : [character.feats.feat] )) {
			const entry = feat_pack.index.find(e => e.name === feat.name);
			if (entry) {
				actor.items.push(await feat_pack.getEntry(entry._id));
			} else {
				// Create our own placemarker feat.
				const itemdata = {
						name: feat.name,
						type: 'feat',
						data: { description : { value : addParas(feat.description['#text']) }}
					};
				if (feat.featcategory) {
					let cats = [ [ feat.featcategory['#text'] ] ];
					//item.data.tags = new Map();
					//item.data.tags.insert( cats );
				}
				actor.items.push(new Item(itemdata));
			}
		}
		
		// defensive.[special.shortname]  from 'class abilities'
		// gear.[item.name/quantity/weight/cost/description
		const item_pack = await game.packs.find(p => p.metadata.name === 'items');
		for (const item of (Array.isArray(character.gear.item) ? character.gear.item : [character.gear.item] )) {
			const entry = item_pack.index.find(e => e.name === item.name);
			if (entry) {
				actor.items.push(await item_pack.getEntry(entry._id));
			} else {
				// Create our own placemarker item.
				const itemdata = {
						name: item.name,
						type: 'equipment',
						data: {
							quantity: item.quantity,
							weight: item.weight.value,
							price: item.cost.value,
							description : { value : addParas(item.description['#text']) },
							identified: true,
							carried: true,
							},
					};
				actor.items.push(new Item(itemdata));
			}
		}
		
		
		
		//
		// SKILLS tab
		//
		let numart = 0;
		let numcrf = 0;
		let numlor = 0;
		let numper = 0;
		let numpro = 0;
		let numcust = 0;
		for (const skill of character.skills.skill) {
			let value = {
				value: parseInt(skill.value),
				ability: RWPF1Actor.ability_names[skill.attrname.toLowerCase()],
				rank: parseInt(skill.ranks),
				mod: parseInt(skill.attrbonus)
				// rt, acp, background
			}
			if (skill.name == 'Acrobatics')
				actor.data.skills.acr = value;
			else if (skill.name == "Appraise")
				actor.data.skills.apr = value;
			else if (skill.name == "Artistry")
				actor.data.skills.art = value;
			else if (skill.name.startsWith("Artistry (")) {
				value.name = skill.name;
				if (!actor.data.skills.art) actor.data.skills.art = {subSkills : {}};
				else if (!actor.data.skills.art.subSkills) actor.data.skills.art.subSkills = {};
				actor.data.skills.art.subSkills[`art${++numart}`] = value;
			} else if (skill.name == "Bluff")
				actor.data.skills.blf = value;
			else if (skill.name == "Climb")
				actor.data.skills.clm = value;
			else if (skill.name == "Craft")
				actor.data.skills.crf = value; // special skills
			else if (skill.name.startsWith("Craft (")) {
				value.name = skill.name;
				if (!actor.data.skills.crf) actor.data.skills.crf = {subSkills : {}};
				else if (!actor.data.skills.crf.subSkills) actor.data.skills.crf.subSkills = {};
				actor.data.skills.crf.subSkills[`crf${++numcrf}`] = value;
			} else if (skill.name == "Diplomacy")
				actor.data.skills.dip = value;
			else if (skill.name == "Disguise")
				actor.data.skills.dev = value;
			else if (skill.name == "Disable Device")
				actor.data.skills.dis = value;
			else if (skill.name == "Escape Artist")
				actor.data.skills.esc = value;
			else if (skill.name == "Fly")
				actor.data.skills.fly = value;
			else if (skill.name == "Handle Animal")
				actor.data.skills.han = value;
			else if (skill.name == "Heal")
				actor.data.skills.hea = value;
			else if (skill.name == "Intimidate")
				actor.data.skills.int = value;
			else if (skill.name == "Knowledge (arcana)")
				actor.data.skills.kar = value;
			else if (skill.name == "Knowledge (dungeoneering)")
				actor.data.skills.kdu = value;
			else if (skill.name == "Knowledge (engineering)")
				actor.data.skills.ken = value;
			else if (skill.name == "Knowledge (geography)")
				actor.data.skills.kge = value;
			else if (skill.name == "Knowledge (history)")
				actor.data.skills.khi = value;
			else if (skill.name == "Knowledge (local)")
				actor.data.skills.klo = value;
			else if (skill.name == "Knowledge (nature)")
				actor.data.skills.kna = value;
			else if (skill.name == "Knowledge (nobility)")
				actor.data.skills.kno = value;
			else if (skill.name == "Knowledge (planes)")
				actor.data.skills.kpl = value;
			else if (skill.name == "Knowledge (religion)")
				actor.data.skills.kre = value;
			else if (skill.name == "Linguistics")
				actor.data.skills.lin = value;
			else if (skill.name == "Lore")
				actor.data.skills.lor = value;
			else if (skill.name.startsWith("Lore (")) {
				value.name = skill.name;
				if (!actor.data.skills.lor) actor.data.skills.lor = {subSkills : {}};
				else if (!actor.data.skills.lor.subSkills) actor.data.skills.lor.subSkills = {};
				actor.data.skills.lor.subSkills[`lor${++numlor}`] = value;
			} else if (skill.name == "Perception")
				actor.data.skills.per = value;
			else if (skill.name == "Perform")
				actor.data.skills.prf = value;
			else if (skill.name.startsWith("Perform (")) {
				value.name = skill.name;
				if (!actor.data.skills.prf) actor.data.skills.prf = {subSkills : {}};
				else if (!actor.data.skills.prf.subSkills) actor.data.skills.prf.subSkills = {};
				actor.data.skills.prf.subSkills[`prf${++numprf}`] = value;
			} else if (skill.name == "Profession")
				actor.data.skills.pro = value;
			else if (skill.name.startsWith("Profession (")) {
				value.name = skill.name;
				if (!actor.data.skills.pro) actor.data.skills.pro = {subSkills : {}};
				else if (!actor.data.skills.pro.subSkills) actor.data.skills.pro.subSkills = {};
				actor.data.skills.pro.subSkills[`pro${++numpro}`] = value;
			} else if (skill.name == "Ride")
				actor.data.skills.rid = value;
			else if (skill.name == "Sense Motive")
				actor.data.skills.sen = value;
			else if (skill.name == "Sleight of Hand")
				actor.data.skills.slt = value;
			else if (skill.name == "Spellcraft")
				actor.data.skills.spl = value;
			else if (skill.name == "Stealth")
				actor.data.skills.ste = value;
			else if (skill.name == "Survival")
				actor.data.skills.sur = value;
			else if (skill.name == "Swim")
				actor.data.skills.swm = value;
			else if (skill.name == "Use Magic Device")
				actor.data.skills.umd = value;
			else
			{
				console.log(`PF1 custom skill ${skill.name}`);
				value.name = skill.name;
				actor.data.skills[numcust++ ? `skill${numcust}` : 'skill'] = value;
			}
		}
		
		
		//
		// BUFFS tab
		//
		
		
		//
		// BIOGRAPHY tab
		//
		
		
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
		const siz = character.size.name;
		if (siz == 'Fine')
			actor.data.traits.size = 'fine';
		else if (siz == 'Diminutive')
			actor.data.traits.size = 'dim';
		else if (siz == 'Tiny')
			actor.data.traits.size = 'tiny';
		else if (siz == 'Small')
			actor.data.traits.size = 'sm';
		else if (siz == 'Medium')
			actor.data.traits.size = 'med';
		else if (siz == 'Large')
			actor.data.traits.size = 'lg';
		else if (siz == 'Huge')
			actor.data.traits.size = 'huge';
		else if (siz == 'Gargantuan')
			actor.data.traits.size = 'grg';
		else if (siz == 'Colossal')
			actor.data.traits.size = 'col';
		else
			console.log(`Unknown actor size ${siz}`);
		
		// data.traits.senses
		let senses = "";
		if (character.senses.special) {
			if (senses.length > 0)
				senses += ', ';
			senses += character.senses.special.name;
		}
		actor.data.traits.senses = senses;
		// data.traits.dr		// damage reduction		(character.damagereduction)
		// data.traits.eres		// energy resistance	(character.resistances)
		// data.traits.cres		// condition resistance	(character.resistances)
		// data.traits.regen
		// data.traits.fastHealing
		// data.traits.languages.value[]/custom
		if (character.languages.language) {
			actor.data.traits.languages = {
				value: []
			};
			if (Array.isArray(character.languages.language)) {
				for (const lang of character.languages.language) {
					actor.data.traits.languages.value.push(lang.name.toLowerCase());
				}
			} else {
				actor.data.traits.languages.value.push(character.languages.language.name.toLowerCase());
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
}