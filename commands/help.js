const {article} = require("../modules/lang");

module.exports = {
	help: cfg => "Print this message, or get help for a specific command",
	usage: cfg =>  [
		{usage:"help", params: "", description: "Prints a list of cmds."}, 
		{usage:"help", params:"[command]", description: "Get help on a specific command."}],
	permitted: () => true,
	command: (bot, command, cfg) => {
		//help for a specific command
			if(bot.cmds[command] && bot.cmds[command].usage){
				let output = { embed: {
					title: `Bot Command | ${command}`,
					description: bot.cmds[command].help(cfg) + "\n\n**Usage:**\n",
					timestamp: new Date().toJSON(),
					color: 0x999999,
					author: {
						name: "Tupperbox",
						icon_url: bot.user.avatarURL
					},
					footer: {
						text: "If something is wrapped in <> or [], do not include the brackets when using the command. They indicate whether that part of the command is required <> or optional []."
					}
				}};
				for(let u of bot.cmds[command].usage(cfg)) {
					output.embed.description += `**${cfg.prefix}${u.usage}** ${u.params ? `*${u.params}*` : ''} - ${u.description}\n`;
				} 
				if(bot.cmds[command].desc) {
					output.embed.description += `\n${bot.cmds[command].desc(cfg)}`;
				} return output;
			}
			return "Command not found.";
		},
	execute: async (bot, msg, args, cfg) => {
		
		if (args[0]) {
			if(bot.cmds[args[0]] && bot.cmds[args[0]].usage && bot.checkPermissions(bot.cmds[args[0]], msg, args)){
					return module.exports.command(bot, args[0], cfg);
				} return "Command not found.";
		} 

		//general help
		let output = { embed: {
			title: "Tupperbox | Help",
			description: "I am Tupperbox, a bot that allows you to send messages as other pseudo-users using Discord webhooks.\nTo get started, register " + article(cfg) + " " + cfg.lang + " with `" + cfg.prefix + "register` and enter a message with the brackets you set!\nExample: `" + cfg.prefix + "register test [text]` to register with brackets as []\n`[Hello!]` to proxy the message 'Hello!'\n\n**Command List**\nType `"+cfg.prefix+"help command` for detailed help on a command.\n" + String.fromCharCode(8203) + "\n",
			color: 0x999999,
			author: {
				name: "Tupperbox",
				icon_url: bot.user.avatarURL
			}
		}};
		for(let command of Object.keys(bot.cmds)) {
			if(bot.cmds[command].help && bot.cmds[command].permitted(msg,args))
				output.embed.description += `**${cfg.prefix + command}**  -  ${bot.cmds[command].help(cfg)}\n`;
		}
		output.embed.fields = [{ name: "\u200b", value: "Single or double quotes can be used in any command to specify multi-word arguments!\n\nProxy tips:\nReact with \u274c to a recent proxy to delete it (if you sent it)!\nReact with \u2753 to a recent proxy to show who sent it in DM!\n\nQuestions? Join the support server: [invite](https://discord.gg/rHxMbt2)\nNow accepting donations to cover server costs! [patreon](https://www.patreon.com/tupperbox)\nInvite the bot to your server --> [click](https://discordapp.com/oauth2/authorize?client_id="+process.env.DISCORD_INVITE+"&scope=bot&permissions=536996928)"}];
		return output;
	}

	}
