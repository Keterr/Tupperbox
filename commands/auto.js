const {article,proper} = require("../modules/lang");

module.exports = {
	help: cfg => "Set " + article(cfg) + " " + cfg.lang + " as your default " + cfg.lang + " for new messages.",
	usage: cfg =>  ["auto <name> - Set the named " + cfg.lang + " as your auto " + cfg.lang],
	permitted: () => true,
	groupArgs: true,
	execute: async (bot, msg, args, cfg) => {
        console.log('config object');
        console.log(cfg);
        var client = null;
        try{
            client = await bot.db.connect();
            //if no user given, clear the current auto user
            if(!args[0]){
                //delete the auto user and the given message
                await bot.db.deleteAuto(msg.author.id, client);
                let perms = msg.channel.permissionsOf(bot.user.id);
                if (perms.has("manageMessages") && perms.has("readMessages"))
                    process.send({ name: "queueDelete", channelID: msg.channel.id, messageID: msg.id }, null, { swallowErrors: false }, err => {
                        if (err) console.log(err)
                    });
                return;
            } 

            //check arguments
            let name = args.join(" ");
            let member = await bot.db.getMember(msg.author.id,name);
            if(!member) return "No valid " + cfg.lang + " found for the given name.";

            //set the auto user and delete the given message
            await bot.db.deleteAuto(msg.author.id,client);
            await bot.db.addAuto(msg.author.id,member, client);
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