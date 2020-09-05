
module.exports = {
	help: cfg => "Clear your auto tupper (set using -tul!auto after a proxied message)",
	usage: cfg =>  ["append -tul!auto to a bracketed message to start auto proxy. After doing this all your future messages will use that tupper automatically.  Use tul!clearauto or -tul!auto on a non-proxied message to reset"],
	permitted: (msg) => true,
	execute: async (bot, msg, args, cfg) => {
        try{
            var client = await bot.db.connect();
            bot.db.deleteAuto(msg.author.id, client);
            let perms = msg.channel.permissionsOf(bot.user.id);
            if (perms.has("manageMessages") && perms.has("readMessages"))
                process.send({ name: "queueDelete", channelID: msg.channel.id, messageID: msg.id }, null, { swallowErrors: false }, err => {
                    if (err) console.log(err)
                });
        }
        finally{
            client.release();
        }

	}
};