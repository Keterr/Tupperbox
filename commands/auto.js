const {article,proper} = require("../modules/lang");

module.exports = {
	help: cfg => "Set " + article(cfg) + " " + cfg.lang + " as your default " + cfg.lang + " for new messages.",
    usage: cfg =>  [
        "auto (name) - Set the named " + cfg.lang + " as your auto " + cfg.lang + ".",
        "auto (clear/off/disable) - turn off all automatic behavior.",
        "auto - Sets you into 'sticky' mode where when you use one of your " + cfg.lang + "s it will be set as your auto without needing a command.",
    ],
	permitted: () => true,
	groupArgs: true,
	execute: async (bot, msg, args, cfg) => {
            //if no user given, clear the current auto user

            //if no user given, set "sticky" auto feature
            if(!args[0]){
                await bot.db.setAuto(msg.author.id, null, true);
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
            //if clear, off, or disable and there is no membere with one of those names - turn off auto.
            if(args[0] == "clear" || args[0] == "off" || args[0] == "disable" && !member){
                //delete the auto user and the given message
                await bot.db.deleteAuto(msg.author.id);
                let perms = msg.channel.permissionsOf(bot.user.id);
                if (perms.has("manageMessages") && perms.has("readMessages"))
                    process.send({ name: "queueDelete", channelID: msg.channel.id, messageID: msg.id }, null, { swallowErrors: false }, err => {
                        if (err) console.log(err)
                    });
                return;
            }
            if(!member) return "No valid " + cfg.lang + " found for the given name.";

            //set the auto user and delete the given message
            await bot.db.setAuto(msg.author.id,member, false);
            let perms = msg.channel.permissionsOf(bot.user.id);
            if (perms.has("manageMessages") && perms.has("readMessages"))
                process.send({ name: "queueDelete", channelID: msg.channel.id, messageID: msg.id }, null, { swallowErrors: false }, err => {
                    if (err) console.log(err)
                });
	}
};