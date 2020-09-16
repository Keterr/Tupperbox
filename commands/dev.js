const util = require("util");

module.exports = {
	permitted: (msg, bot) => msg.author.id == bot.owner,
	execute: async (bot, msg, args, cfg) => {
		if (msg.author.id != bot.owner) return;
		switch(args.shift()) {
		case "eval":
			let code = args.join(" ");
			if (e = code.match(/^```js\n([^]*)\n```$/)) code = e[1];
			let out;
			try {
				code.split("\n").length > 1 ? (out = await eval(`(async () => {${code}})();`)) : (out = await eval(code));
			} catch(e) { out = e.toString(); }
			return util.inspect(out).split(process.env.DISCORD_TOKEN).join("[[ TOKEN ]]").slice(0,2000);
		case "reload":
			process.send({name: "broadcast", msg: {name: "reload", type: args[0], targets: args.slice(1)}});
			if(args[0] == "queue") process.send({name:"reloadQueue"});
			if(args[0] == "ipc") process.send({name:"reloadIPC"});
			return "Reload command sent!";
		case "blacklist":
			await bot.banAbusiveUser(args.shift(), msg.channel.id);
			break;
		case "rawstats":
			process.send({ name: "rawstats", channelID: msg.channel.id });
			break;
		}
	}
};
