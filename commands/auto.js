const {article,proper} = require("../modules/lang");

module.exports = {
	help: cfg => "Set " + article(cfg) + " " + cfg.lang + " as your default " + cfg.lang + " for new messages.",
    usage: cfg =>  ["auto [name] - Set the named " + cfg.lang + " as your auto " + cfg.lang + ". Blank to reset to default.",
                    "auto -sticky [name] - Set the named " + cfg.lang + " as your auto " + cfg.lang + " in sticky mode. Sticky mode means whichever " + cfg.lang + " you used last will be used as your auto " + cfg.lang + ' automatically.'
],
	permitted: () => true,
	groupArgs: true,
	execute: async (bot, msg, args, cfg) => {
            //if no user given, clear the current auto user
            if(!args[0]){
                //delete the auto user and the given message
                await bot.db.deleteAuto(msg.author.id);
                let perms = msg.channel.permissionsOf(bot.user.id);
                if (perms.has("manageMessages") && perms.has("readMessages"))
                    process.send({ name: "queueDelete", channelID: msg.channel.id, messageID: msg.id }, null, { swallowErrors: false }, err => {
                        if (err) console.log(err)
                    });
                return;
            } 

            //if the user specifies -sticky as the user, make the auto setting "sticky" so it always uses the last proxied member
            if(args[0] == "-sticky" && args.length == 1){
                await bot.db.setAuto(msg.author.id, null, true);
                let perms = msg.channel.permissionsOf(bot.user.id);
                if (perms.has("manageMessages") && perms.has("readMessages"))
                    process.send({ name: "queueDelete", channelID: msg.channel.id, messageID: msg.id }, null, { swallowErrors: false }, err => {
                        if (err) console.log(err)
                    });
                return;
            }

            //allow specify sticky and tupper
            let isSticky = false;
            if(args[0] == "-sticky"){
                isSticky = true;
                args = args.slice(1);
            }
            //check arguments
            let name = args.join(" ");
            let member = await bot.db.getMember(msg.author.id,name);
            if(!member) return "No valid " + cfg.lang + " found for the given name.";

            //set the auto user and delete the given message
            await bot.db.setAuto(msg.author.id,member, isSticky);
            let perms = msg.channel.permissionsOf(bot.user.id);
            if (perms.has("manageMessages") && perms.has("readMessages"))
                process.send({ name: "queueDelete", channelID: msg.channel.id, messageID: msg.id }, null, { swallowErrors: false }, err => {
                    if (err) console.log(err)
                });
	}
};