module.exports = {
	help: cfg => "Like list, but showing relays and without showing group info.",
	usage: cfg =>  ["listrng [user] - Sends a list of the user's registered " + cfg.lang + "s and relays, their brackets, post count, and birthday (if set). If user is not specified it defaults to the message author.\n\tlistrng ["+ cfg.lang + " name] [user] - Send a list of relay asscociated with the account for a user. If not specified, take message author instead.\nThe bot will provide reaction emoji controls for navigating long lists: Arrows navigate through pages, # jumps to a specific page, ABCD jumps to a specific " + cfg.lang + ", and the stop button deletes the message."],
	permitted: () => true,
	cooldown: msg => 60000,
	execute: async (bot, msg, args, cfg, members) => {
		return bot.cmds.listr.execute(bot,msg,args,cfg,members,true);
	}
};
