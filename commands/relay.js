const {article,proper} = require("../modules/lang");

module.exports = {
	help: cfg => "Set or clear " + cfg.lang + " as relay status.",
	usage: cfg =>  ["relay <main name> <relay name> - Set a " + cfg.lang + " as a relay .\n\t<main name> - the " + cfg.lang + "'s name, for multi-word names surround this argument in single or double quotes.\n\t<relay name> - the name of the relay to be linked to the main name."],
	desc: cfg => cfg.prefix + "relay <relay name> - Clear relay status.",
	permitted: () => true,
	cooldown: msg => 15000,
	groupArgs: true,
	execute: async (bot, msg, args, cfg, members) => {
		if(!args[0]) return bot.cmds.help.execute(bot, msg, ["relay"], cfg);
		let member = await bot.db.members.get(msg.author.id,args[0]);
		let relay = await bot.db.members.get(msg.author.id,args[1]);
		if(!member) return "You don't have " + article(cfg) + " " + cfg.lang + " with \'" + args[0] + "\' name registered.";
		if(!args[1]){
		await bot.db.members.update(msg.author.id,member.name,"relay",null);
		return proper(cfg.lang) + " relay link cleared.";
	}
		if(!relay) return "You don't have " + article(cfg) + " " + cfg.lang + " with \'" + args[1] + "\' name registered.";
		if(member.name == relay.name) return "Both are the same " + proper(cfg.lang) + ".";
		let check = (await bot.db.query("SELECT * FROM Members WHERE relay is NOT NULL AND user_id = $1 AND lower(relay) = lower($2)", [msg.author.id, relay.name]));
		if(member.relay != undefined) return "a relay cannot have a relay."
		if(check.rowCount != 0) return "A relay cannot have a relay";

		await bot.db.members.update(msg.author.id,relay.name,"relay",member.name);
		return `${proper(cfg.lang)} '${relay.name}' is now a relay of '${member.name}'`
	}
};
