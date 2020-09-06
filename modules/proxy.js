const db = require("./db");

module.exports = async ({msg,bot,members,cfg,automember}) => {
    if(msg.channel.guild && (!msg.channel.permissionsOf(bot.user.id).has("readMessages") || !msg.channel.permissionsOf(bot.user.id).has("sendMessages"))) return;
	if(members[0] && !(msg.channel.type == 1)) {
		let matchPhraseEndsWithAuto = new RegExp("^.*-"+ cfg.prefix + "auto$");
		let matchLineEndsWithAuto = new RegExp("\\s*-"+ cfg.prefix + "auto$");
		let matchAnyLineEndsWithAuto = new RegExp("\\s*-"+ cfg.prefix + "auto$", "m");


		let clean = msg.cleanContent || msg.content;
		clean = clean.replace(/(<a?:.+?:\d+?>)|(<@!?\d+?>)/,"cleaned");
		//for the cleaned array, filter instances of -prefix!auto at the end of each line
		clean = clean.replace(matchAnyLineEndsWithAuto, "");
		let cleanarr = clean.split("\n");
		let lines = msg.content.split("\n");

		//these variables store the member which was used with tul-auto
		//as well as if tul!auto was used (used to write to database when proxying message)
		let setAutoProxy = false;
		let setAutoProxyMember = null;

		let replace = [];
		let current = null;
		//this flag identifies if the member that was picked was picked due to auto proxy instead of bracket matching
		let usingautomember = false;
		for(let i = 0; i < lines.length; i++) {
			let found = false;
			members.forEach(t => {
				//get the index of the brackets for a member (res) and the member object (t) using the cleaned message array
				let res = bot.checkMember(msg, t, cleanarr[i]);
				if(res >= 0) {
					if(t.brackets[res*2+1].length == 0) current = t;
					else current = null;
					found = true;
					//clear -tul!auto from the message if it exists
					let modified = lines[i].replace(matchLineEndsWithAuto, "");
					//push the modified message into the replace array.  Depending on if the show brackets is set, clear brackets from message.
					modified = t.show_brackets ? modified : modified.substring(t.brackets[res*2].length, modified.length-t.brackets[res*2+1].length);
					//if the modified message ends in -auto, flag that an auto needs to be used
					if(lines[i].match(matchPhraseEndsWithAuto)){
						setAutoProxy =true;
						setAutoProxyMember = t;
					}
					replace.push([msg,cfg,t,modified]);
				}
			});
			//if no member was found but auto proxy is set, use it
			//if -tul!auto is used on an autoproxy method, clear the auto proxy (when member is null it will delete and not set a new member)
			if(!found && automember !==undefined){
				let t = automember;
				usingautomember = true;
				found = true;
				//push the modified message into the replace array.  Depending on if the show brackets is set, clear brackets from message.
				let modified = lines[i].replace(matchLineEndsWithAuto, "");
				//if the modified message ends in -auto, then...
				if(lines[i].match(matchPhraseEndsWithAuto)){
					//replace all spaces before -tul!auto and -tul!auto itself in the message
					setAutoProxy =true;
					setAutoProxyMember = null;
				}
				replace.push([msg,cfg,t,modified]);
			}
			if(!found && current) 
				replace[replace.length-1][3] += "\n"+lines[i];
		}
	
		if(replace.length < 2) replace = [];
	
		if(!replace[0]) {
			let found = false;
			for(let t of members) {
				let res = bot.checkMember(msg, t, clean);
				if(res >= 0) {
					found = true;
					let modified = msg.content.replace(matchLineEndsWithAuto, "");
					modified =t.show_brackets ? modified : modified.substring(t.brackets[res*2].length, modified.length-t.brackets[res*2+1].length);
					//if message ends in -tul!auto, set the auto proxy flag
					if(msg.content.match(matchPhraseEndsWithAuto)){
						//replace all spaces before -tul!auto and -tul!auto itself in the message
						setAutoProxyMember = t;
						setAutoProxy = true;
					}
					replace.push([msg, cfg, t, modified]);
					break;
				}
			}
			if(!found && automember !== undefined){
				usingautomember = true;
				let t = automember;
				let modified = msg.content.replace(matchLineEndsWithAuto, "");
				//if message ends in -tul!auto, set the auto proxy flag
				if (msg.content.match(matchPhraseEndsWithAuto)) {
					//replace all spaces before -tul!auto and -tul!auto itself in the message
					setAutoProxyMember = null;
					setAutoProxy = true;
				}
				replace.push([msg, cfg, t, modified]);
			}
		}
	
		if(replace[0] && (!msg.channel.guild || !(await bot.db.isBlacklisted(msg.channel.guild.id,msg.channel.id,true)))) {
			let client = null;
			try {
				if(replace.length > 7) {
					//console.log(`Potential abuse by ${msg.author.id} - ${replace.length} proxies at once in ${msg.channel.id}!`);
					return bot.send(msg.channel, `Proxy refused: too many proxies in one message!`);
				}
				for(let r of replace) {
					await bot.replaceMessage(...r);
				}
				let perms = msg.channel.permissionsOf(bot.user.id);
				if(perms.has("manageMessages") && perms.has("readMessages"))
					process.send({name: "queueDelete", channelID: msg.channel.id, messageID: msg.id}, null, {swallowErrors: false}, err => {
						if(err) console.log(err)
					});
				//if I had set an auto proxy with -tul!auto then write that to the database
				if(setAutoProxy){
					client = await bot.db.connect();
					bot.db.deleteAuto(msg.author.id, client);
					if(setAutoProxyMember !== null){
						bot.db.addAuto(msg.author.id, setAutoProxyMember, client)
					}
				}
			} catch(e) { 
				if(e.message == "Cannot Send Empty Message") bot.send(msg.channel, "Cannot proxy empty message.");
				else if(e.permission == "Manage Webhooks") bot.send(msg.channel, "Proxy failed because I don't have 'Manage Webhooks' permission in this channel.");
				else if(e.message == "toolarge") bot.send(msg.channel, "Message not proxied because bots can't send attachments larger than 8mb. Sorry!");
				else if(e.message == "autoban") {
					if(e.notify) bot.send(msg.channel, "Proxies refused due to spam!");
					console.log(`Potential spam by ${msg.author.id}!`);
				} else if(e.code != 10008) bot.err(msg, e); //discard "Unknown Message" errors
			}
			finally{
				//always clean up database closing in a finally block
				if(client) client.release();
			}
		}
	}
}