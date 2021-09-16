export default class RWCoC7Actor {

	static statnames = [ "str", "con", "siz", "dex", "app", "int", "pow", "edu" ];
	
	static knownskills = [];
	static knownweapons = [];
	
	static async initModule() {
		console.debug('RWCoC7Actor.initModule invoked');

		// Search the world entries.
		RWCoC7Actor.knownskills  = new Map();
		RWCoC7Actor.knownweapons = new Map();
		// Search all the packs.
		//for (let pack in game.packs) {
		async function checkset(pack, map, entry) {
			let exist = map.get(entry.name);
			if (exist === undefined || pack.metadata.package !== "CoC7") {
				// Assume non-system packs contain better information than those supplied in the system.
				//console.log(`Adding '${entry.name}' to map`);
				map.set(entry.name, await pack.getDocument(entry._id));
			}
		}
		
		await game.packs.forEach(async(pack) => {
			//console.log(`pack = ${JSON.stringify(pack.metadata)}`);
			if (pack.metadata.entity === "Item") {
				await pack.index.forEach(async(entry) => { 
					if (entry.type === "weapon")
						await checkset(pack, RWCoC7Actor.knownweapons, entry);
					else if (entry.type === "skill")
						await checkset(pack, RWCoC7Actor.knownskills, entry);
				});
			}
		})
		// Local world versions supercede compendium versions
		await game.items.filter(e => e.type === "skill").forEach(e => RWCoC7Actor.knownskills.set(e.name, e));
		await game.items.filter(e => e.type === "weapon").forEach(e => RWCoC7Actor.knownweapons.set(e.name, e));
		
		console.log(`RWCoC7Actor working with ${RWCoC7Actor.knownskills.size} skills and ${RWCoC7Actor.knownweapons.size} weapons`);
		//console.log(`knownskills = ${JSON.stringify(RWCoC7Actor.knownskills)}`);
	}
	
	//const GS_MODULE_NAME = "realm-works-import";

	static async parseStatblock(statblock) {
		console.trace();
		console.log(`RWCoC7Actor.parseStatblock with:\n${statblock}`);

/*
		const GS_MODULE_NAME = "realm-works-import";
		const GS_ACTOR_TYPE = "actorType";
		if (!this.handler) {
			await import("./coc7-actor-importerw.js")
				.then(module => this.handler = new module.CoC7ActorImporter)
				.catch(e => `coc7-actor-importer.js is not available: ${e}`)
			//this.handler = new CoC7ActorImporter;
		}
		if (this.handler) {
			this.handler.createActor({
				entity: game.settings.get(GS_MODULE_NAME, GS_ACTOR_TYPE),
				convertFrom6E: 'coc-guess', 	// if any STAT > 30 then it assumes 7th edition
				lang: game.i18n.lang,
				text: statblock + "."
			});
			return undefined;
		}
*/

		let actordata = {
			// TEMPLATE characteristics
			// each has { value: null, tempValue : null, short: "CHARAC.STR", label: "CHARAC.Strength", formula: null }
			// for each of: str, con, siz, dex, app, int, pow, edu
			characteristics : {},
			
			// TEMPLATE attribs
			attribs: {
/*				hp:  { value: null, max: null, "short": "HP", label: "Hit points",     auto: true },
				mp:  { value: null, max: null, "short": "MP", label: "Magic points",   auto: true },
				lck: { value: null, max: 99,   "short": "LCK", label: "Luck",          auto: true },
				san: { value: null, max: 99,   "short": "SAN", label: "Sanity",        auto: true, dailyLoss: 0, oneFifthSanity: " / 0" },
				mov: { value: null, max: null, "short": "MOV", label: "Movement rate", auto: true },
				db:  { value: null, "short": "DB", label: "Damage bonus", auto: true },
				build: { current: null, value: null, "short": "BLD", label: "Build", auto: true },
				armor: { value: null, localized: false, locations: [], auto: false },*/
			},
			// TEMPLATE status
			"status": {
/*				criticalWounds: { type: "Boolean", value: false },
				unconscious:    { type: "Boolean", value: false },
				dying:          { type: "Boolean", value: false },
				dead:           { type: "Boolean", value: false },
				prone:          { type: "Boolean", value: false },
				tempoInsane:    { type: "Boolean", value: false },
				indefInsane:    { type: "Boolean", value: false },*/
			},
			// TEMPLATE biography (not "character")
			biography: [{
					title: "Statblock",
					value: statblock
				}
			],
			// type === "npc"
			infos: {
/*				occupation: "",
				age: "",
				sex: "",
				// type === "creature"
				type: null,*/
			},
			// type === "creature"
			special: {
/*				attribs: {
					move: {
						primary:   { enabled: false, value: null, type: null },
						secondary: { enabled: false, value: null, type: null },
					}
				},
				sanLoss: {
					checkPassed: null,
					checkFailled: null,
				},*/
			},
			// items will be transferred UP TO main actor record elsewhere
			items: []
		};

		function addSkill(percentage, mainname, specname=null, push=true, fighting=undefined) {
			let skill = RWCoC7Actor.knownskills.get(mainname);
			if (!skill) {
				skill = {
					type: "skill",
					name: mainname,
					data: {
						value: percentage,
						properties: {
							special: false,
							rarity:  false,
							push:    push,
							combat:  false,
						},
						description: {
							value: `Manually created when importing statblock.`,
						}
					}
				};
				if (fighting !== undefined) {
					skill.data.properties.combat = true;
					skill.data.properties.fighting = fighting;
					skill.data.properties.firearm  = !fighting;
				}
				if (specname) {
					skill.data.specialization = specname;
					skill.data.properties.special = true;
				}
			} else {
				//console.log(`Using existing skill: ${JSON.stringify(skill)}`);
				skill = duplicate(skill);
				skill.data.value = percentage;
			}
			actordata.items.push(skill);
		}
		
		function addWeapon(score, name, skillname, specname, damage) {
			let fighting;
			let weapon = RWCoC7Actor.knownweapons.get(name);
			if (!weapon) {
				// GUESS: if damage ends with "+<DB>" then we'll assume melee
				let dbstr = `+${actordata.attribs.db.value}`;
				fighting = damage.endsWith(dbstr);
				if (fighting) damage = damage.slice(0,-dbstr.length);  // strip "+DB" from damage.

				// Now set up the weapon.
				weapon = {
					type: "weapon",
					name: skillname,
					data: {
						skill: {
							main : { name : skillname },	// maybe need ID here too?
						},
						range: {
							normal : { damage : damage },
						},
						properties: {
							addb:   fighting,	// add DB (usually true for melee weapons)
							ahdb:   false,		// add 1/2 DB
							melee:  fighting,	// or "rngd"
							rngd:   !fighting,	// or "melee"
							shotgun:false,		// shotgun (damage reduces with range)
							brst:   false,		// burst
							auto:   false,		// full-auto
							dbrl:   false,		// double-barrel
							spcl:   true,
						},
						description: {
							special: `<p>Manually created when importing statblock.</p>`,
						}
					}
				};
			} else {
				//console.log(`Using existing weapon: ${JSON.stringify(weapon)}`);
				weapon = duplicate(weapon);
				weapon.data.skill.main.name = skillname;
				fighting = weapon.data.properties.melee;
			}
			actordata.items.push(weapon);
			
			// Now add the relevant weapon skill too.
			addSkill(score, skillname, specname, /*push*/false, fighting);
		}
		
		
		let lines = statblock.split('\n');
		// first line has NAME, Age X, occupation
		let line1 = lines[0];
		const AGE_MARKER = ", Age ";
		let agepos = line1.indexOf(AGE_MARKER);
		if (agepos > 0)
		{
			agepos += line1.indexOf(AGE_MARKER);
			let occpos = line1.indexOf(", ", agepos);
			if (occpos < 0)
				actordata.infos.age = +(line1.slice(agepos))
			else {
				actordata.infos.age = +(line1.slice(agepos, occpos));
				actordata.infos.occupation = line1.slice(occpos+2);
			}
		}
		// Now search the rest of the lines
		for (const line of lines) {
			let ll = line.toLowerCase();
			// Lines with stat blocks
			if (ll.startsWith('str') || ll.startsWith('dex') || ll.startsWith('int')) {
				let words = ll.split(/\s+/);
				for (let i=0; i<words.length-1; i+=2) {
					if (words[i] === "hp") {
						actordata.attribs.hp = {value: +words[i+1] };
					} else if (words[i] === "san") {
						actordata.attribs.san = { value: +words[i+1] };
					} else if (words[i] === "Move") {
						actordata.attribs.mov = { value : +words[i+1], auto: false };
					} else {
						actordata.characteristics[words[i]] = { value: +words[i+1] };
					}
				}
			}
			else if (ll.startsWith("damage bonus:")) {
				actordata.attribs.db = { value: +ll.slice(14) };
			}
			else if (ll.startsWith("sanity loss:")) {
				let words=ll.slice(13).split('/');
				actordata.special = { sanLoss : { checkPassed: words[0], checkFailled: words[1] }};
			}
			else if (ll.startsWith("armor: ")) {
				let pos = ll.search(/\d/);
				actordata.attribs.armor = { value : parseInt(ll.slice(pos)) };
			}
			else if (ll.startsWith("skills: ") || ll.startsWith("languages: ")) {
				for (const skill of line.slice(8).split(", ")) {
					let pos = skill.lastIndexOf(' ');
					let skillname = skill.slice(0,pos);
					let skillvalue = +skill.slice(pos+1,-1);
					//console.debug(`add skill '${skillname}' = ${skillvalue} %`);
					
					let specpos = skillname.indexOf("(");
					if (specpos > 0) {
						// General (spec)   => name = spec;  specialization = General
						let spec = skillname.slice(0,specpos);
						let name = skillname.slice(specpos+1,-1);
						addSkill(skillvalue, name, spec);
						continue;
					}
					specpos = skillname.indexOf(":");
					if (specpos > 0) {
						// General: spec   => name = spec;  specialization = General
						// (This handles languages)
						let spec = skillname.slice(0,specpos);
						let name = skillname.slice(specpos+1);
						addSkill(skillvalue, name, spec);
						continue;
					}
					// No specialization
					addSkill(skillvalue, skillname, undefined);
				}
			}
			else if (ll.startsWith("spells: ")) {
				for (const name of line.slice(8).split(", ")) {
					//console.debug(`add spell '${name}'`);
					actordata.items.push({
						type: "spell",
						name: name,
						});
				}
			}
			else if (line.startsWith("Hero Lab and the Hero Lab logo")) {
				// We've reached the end of this statblock.
				break;
			}
			else if (line.startsWith("HP ")) {
				// hp:  { value: null, max: null, "short": "HP", label: "Hit points",     auto: true },
				let hp = +line.slice(3);
				actordata.attribs.hp = { value : hp, max: hp, auto: false };
			}
			else if (line.startsWith("Build: ")) {
				//build: { current: null, value: null, "short": "BLD", label: "Build", auto: true },
				actordata.attribs.build = { value: +line.slice(7), auto: false };
			}
			else if (line.startsWith("Move: ")) {
				//mov: { value: null, max: null, "short": "MOV", label: "Movement rate", auto: true },
				actordata.attribs.mov = { value : +line.slice(6), auto: false };
			}
			else if (line.startsWith("Magic Points: ")) {
				//mov: { value: null, max: null, "short": "MOV", label: "Movement rate", auto: true },
				let mp = +line.slice(14);
				actordata.attribs.mp = { value : mp, max: mp, auto: false };
			}
			else if (line.startsWith("ATTACKS")) {
				// nothing to add
			}
			else if (line.startsWith("Attacks per round:")) {
				// TODO - where to put this?
			}
			// other line possibilities:
			// line1 = name + age + occupation
			// ATTACKS
			// Attacks per round: 1
			// 
			else if (line.startsWith("Dodge ")) {
				addSkill(parseInt(line.slice(6)), "Dodge", undefined);
			}
			else if (line.length > 0) {
				// Assume it is a weapon
				let scorepos = line.search(/\d+%/);
				let percentpos = line.indexOf("%",scorepos);
				let damagepos = line.indexOf(", damage ");
				//console.log(`ATTACK: '${line}' has scorepos ${scorepos}`);
				if (scorepos == -1) {
					console.info(`Not an attack: '${line}'`);
					continue;
				}
				let name = line.slice(0,scorepos-1);
				let score = parseInt(line.slice(scorepos));
				let remain = (percentpos>0) ? line.slice(percentpos+2) : "";
				let damage = (damagepos>0) ? line.slice(damagepos+9) : "";
				console.log(`ATTACK: '${name}' = '${score}' = '${damage}'`);
				
				let part = name.indexOf(" (");
				let skillname = (part > 0) ? name.slice(part+2,-1) : name;
				let specname  = (part > 0) ? name.slice(0,part): undefined;
				// Add the weapon to the combat and skill sections
				addWeapon(score, name, skillname, specname, damage);
			}
		}
		
		actordata.biography = { personalDescription: { value: `<pre>${statblock}</pre>` }};
		//console.log("parseStatblock = " + JSON.stringify(actordata));
		
		return actordata;
		
/*		
		let actordata = {
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
		};
		
		// No items[] array accessible :-(
		
		return actor;
*/
	}
	
	
	static async tidyupActors(actors) {
		for (let actor of actors) {
			if (!actor) continue;

			for (let weapon of actor.items) {
				if (weapon.type === "weapon") {
					//console.debug(`tidyupActors: weapon = ${JSON.stringify(weapon, null, 4)}`);
					// Patch link to skill to be used for this weapon.
					for (const skill of actor.items) {
						if (skill.type === "skill" && weapon.data.data.skill.main.name === skill.name) {
							weapon.update({ data: { skill: { main: { id: skill.id }}}});
							break;
						}
					}
				}
			}
			//actor.update(actor);
		}		
	}
}