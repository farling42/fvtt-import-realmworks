

const RW_editor_player_options = {
	title: "RW Players",
	items : [
		{
			title: "Style: Callout",
			block: 'section',
			classes: 'RWCallout',
			wrapper: true
		},
		{
			title: "Style: Handout",
			block: 'section',
			classes: 'RWHandout',
			wrapper: true
		},
		{
			title: "Style: Flavor",
			block: 'section',
			classes: 'RWFlavor',
			wrapper: true
		},
		{
			title: "Style: Read Aloud",
			block: 'section',
			classes: 'RWRead_Aloud',
			wrapper: true
		},
	]
};

const RW_editor_gm_options = {
	title: "RW GM Only",
	items : [
		{
			title: "Veracity: Partial Truth",
			block: 'section',
			classes: 'RWveracity-Partial',
			wrapper: true
		},
		{
			title: "Veracity: Lie",
			block: 'section',
			classes: 'RWveracity-Lie',
			wrapper: true
		},
		{
			title: "GM Directions & Contents",
			block: 'section',
			classes: 'RWgmDirAndContents',
			wrapper: true,
			//exact:   true   /* Prevent removal of other nested sections */
		},	
		{
			title: "GM Directions (secret)",
			block: 'section',
			classes: 'RWgmDirections secret',
			wrapper: true
		},
		{
			title: "GM Directions (not secret)",
			block: 'section',
			classes: 'RWgmDirections',
			wrapper: true
		},
	]
};


Hooks.once('init', () => {
	// From World Smiths Toolkit
	//CONFIG.TinyMCE.plugins += " searchreplace visualchars visualblocks textpattern preview template";
	//CONFIG.TinyMCE.toolbar += " | searchreplace template";
	//CONFIG.TinyMCE.visualchars_default_state = true;
	//CONFIG.TinyMCE.visualblocks_default_state = true;
    
	// New sections for the editor
	CONFIG.TinyMCE.style_formats.push(RW_editor_player_options);
	CONFIG.TinyMCE.style_formats.push(RW_editor_gm_options);
	CONFIG.TinyMCE.content_css.push('/modules/realm-works-import/styles/style.css');
})