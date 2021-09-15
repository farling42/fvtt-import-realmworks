export default class RWCoC7Actor {

	static statnames = [ "str", "con", "siz", "dex", "app", "int", "pow", "edu" ];
	
	static async initModule() {
		console.log('RWCoC7Actor.initModule invoked');
	}
	
	static async parseStatblock(statblock) {
		console.trace();
		console.log(`RWCoC7Actor.parseStatblock with:\n${statblock}`);

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
		};

		let lines = statblock.split('\n');
		// first line has NAME, Age X, occupation
		let line1 = lines[0].split(/, +/);
		let name = line1[0];
		if (line1.length > 1 && line1[1].startsWith('Age ')) actordata.infos.age = +(line1[1].slice(4));
		if (line1.length > 2) actordata.infos.occupation = line1[2];
		
		// Now search the rest of the lines
		for (let line of lines) {
			let ll = line.toLowerCase();
			// Lines with stat blocks
			if (ll.startsWith('str') || ll.startsWith('dex')) {
				let words = ll.split(/\s+/);
				for (let i=0; i<words.length-1; i+=2) {
					if (words[i] === "hp") {
						actordata.attribs.hp = {value: +words[i+1] };
					} else if (words[i] === "san") {
						actordata.attribs.san = { value: +words[i+1] };
					} else if (words[i] === "Move") {
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
}