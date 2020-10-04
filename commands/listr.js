module.exports = {
	help: cfg => "Like list, but showing relays.",
	usage: cfg =>  ["listr [user] - Sends a list of the user's registered " + cfg.lang + "s and relays, their brackets, post count, and birthday (if set). If user is not specified it defaults to the message author.\n\tlistr ["+ cfg.lang + " name] [user] - Send a list of relay asscociated with the account for a user. If not specified, take message author instead.\nThe bot will provide reaction emoji controls for navigating long lists: Arrows navigate through pages, # jumps to a specific page, ABCD jumps to a specific " + cfg.lang + ", and the stop button deletes the message."],
	permitted: () => true,
	cooldown: msg => 60000,
	execute: async (bot, msg, args, cfg, _members, ng = false) => {

		//get target list
		let target;
		let extra;
		var relaybracket = {};
		var posts = {}
		var status = 0;
		var main = {};
		var count = {};
		var tgtname;
		if(!args[0]) target = msg.author;
		if(args[0]) {
			if(msg.channel.type == 1) return "Cannot search for members in a DM.";
			target = await bot.resolveUser(msg, args[0]);
			if(!target){ status = 1
			target = msg.author}
		}

		if(args[1]) {
			target = await bot.resolveUser(msg, args[1]);
			if(!target) return "User not found"
		}
		switch(status){
		case 0: //Normal list + user list
		main = await bot.db.members.getAll(target.id);
		break;
		case 1: //args 0 is name and args 1 is id

		main = (await bot.db.query("SELECT * FROM members WHERE user_id = $1 AND lower(relay) = lower($2)", [target.id, args[0]])).rows;
	}
	var main2 = await bot.db.members.getAllNonRelay(target.id);
	var relays = await bot.db.members.getAllRelay(target.id);
	if(!main[0]) return "Specified " + cfg.lang + " not found."
		for(mainentries of main){
			relaybracket[mainentries.name] = relaybracket[mainentries.name] || [];
			relaybracket[mainentries.name].push(bot.getBrackets(mainentries));
			posts[mainentries.name] = posts[mainentries.name] || [];
			posts[mainentries.name].push(mainentries.posts);
		}
		for(reentries of relays){
		count[reentries.relay] = count[reentries.relay] || [];
		count[reentries.relay].push(reentries.name);
		count[reentries.name] = count[reentries.name] || [];
		count[reentries.name].push(reentries.name);
		}
		for(mainentries of main2){
			count[mainentries.name] = count[mainentries.name] || [];
			count[mainentries.name].push(mainentries.name);
		}
		//generate paginated list with groups
		let groups = await bot.db.groups.getAll(target.id);
		if(groups[0] && !ng) {
		//	let members = await bot.db.members.getAll(target.id); //original
			if(!main[0]) return (target.id == msg.author.id) ? "You have not registered any " + cfg.lang + "s." : "That user has not registered any " + cfg.lang + "s.";
			if(main.find(t => !t.group_id)) groups.push({name: "Ungrouped", id: null});
			let embeds = [];
			for(let i=0; i<groups.length; i++) {
				if(status == 0){
				extra = {
					title: `${target.username}#${target.discriminator}'s registered ${cfg.lang}s`,
					author: {
						name: target.username,
						icon_url: target.avatarURL
					},
					description: `Group: ${groups[i].name}${groups[i].tag ? "\nTag: " + groups[i].tag : ""}${groups[i].description ? "\n" + groups[i].description : ""}`
				};
			} else {
				extra = {
					title: `${target.username}#${target.discriminator}'s registered relay of ${main[0].relay}`,
					author: {
						name: target.username,
						icon_url: target.avatarURL
			},
					description: `Group: ${groups[i].name}${groups[i].tag ? "\nTag: " + groups[i].tag : ""}${groups[i].description ? "\n" + groups[i].description : ""}`
				};
			};
				let add = await bot.paginator.generatePages(bot, main.filter(t => t.group_id == groups[i].id), t => bot.paginator.generateMemberField(bot, t, relaybracket, posts, count),extra);
				if(add[add.length-1].embed.fields.length < 5 && groups[i+1]) add[add.length-1].embed.fields.push({
					name: "\u200b",
					value: `Next page: group ${groups[i+1].name}`
				});
				embeds = embeds.concat(add);
			}

			for(let i=0; i<embeds.length; i++) {
				embeds[i].embed.title = `${target.username}#${target.discriminator}'s registered ${cfg.lang}s`;
				if(embeds.length > 1) embeds[i].embed.title += ` (page ${i+1}/${embeds.length}, ${main.length} total)`;
			}

			if(embeds[1]) return bot.paginator.paginate(bot, msg,embeds);
			return embeds[0];
		}
		//let members = await bot.db.members.getAll(target.id); //Original
		if(!main[0]) return (target.id == msg.author.id) ? "You have not registered any " + cfg.lang + "s." : "That user has not registered any " + cfg.lang + "s.";

		//generate paginated list
		if(status == 0){
		extra = {
			title: `${target.username}#${target.discriminator}'s registered ${cfg.lang}s`,
			author: {
				name: target.username,
				icon_url: target.avatarURL
			}
		};
	} else {
		extra = {
			title: `${target.username}#${target.discriminator}'s registered relay of ${main[0].relay}`,
			author: {
				name: target.username,
				icon_url: target.avatarURL
	}
};
};
		let embeds = await bot.paginator.generatePages(bot, main, async t => {
			let group = null;
			if(t.group_id) group = await bot.db.groups.getById(t.group_id);
			return bot.paginator.generateMemberField(bot, t, relaybracket, posts,count, group);
		}, extra);
		if(embeds[1]) return bot.paginator.paginate(bot, msg, embeds);
		return embeds[0];
	}
};
