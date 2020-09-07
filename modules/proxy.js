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


		//if there is a null automember with is_sticky of true this is a sticky user
		let besticky = automember && automember.is_sticky?true:false;
		//if no automember id exists (was null) then there is no auto member
		if(automember && !automember.id){
			automember = undefined;
		}

		//these variables store the member which was used with prefix-auto
		//as well as if prefix!auto was used (used to write to database when proxying message)
		let setAutoProxy = false;
		let setAutoProxyMember = null;

		let replace = [];
		let current = null;
		//this flag identifies if the member that was picked was picked due to auto proxy instead of bracket matching
		for(let i = 0; i < lines.length; i++) {
			let found = false;
			members.forEach(t => {
				//get the index of the brackets for a member (res) and the member object (t) using the cleaned message array
				let res = bot.checkMember(msg, t, cleanarr[i]);
				if(res >= 0) {
					if(t.brackets[res*2+1].length == 0) current = t;
					else current = null;
					found = true;
					//clear -prefix!auto from the message if it exists
					let modified = lines[i].replace(matchLineEndsWithAuto, "");
					//push the modified message into the replace array.  Depending on if the show brackets is set, clear brackets from message.
					modified = t.show_brackets ? modified : modified.substring(t.brackets[res*2].length, modified.length-t.brackets[res*2+1].length);
					//if the modified message ends in -auto or the sticky flag is set, flag that an auto needs to be used
					if(lines[i].match(matchPhraseEndsWithAuto) || besticky){
						setAutoProxy =true;
						setAutoProxyMember = t;
					}
					replace.push([msg,cfg,t,modified]);
				}
			});
			if(!found && current) 
				replace[replace.length-1][3] += "\n"+lines[i];
		}
	
		if(replace.length < 2) replace = [];
	
		if(!replace[0]) {
			for(let t of members) {
				let res = bot.checkMember(msg, t, clean);
				if(res >= 0) {
					//replace all spaces before -prefix!auto and -prefix!auto itself in the message
					let modified = msg.content.replace(matchLineEndsWithAuto, "");
					modified =t.show_brackets ? modified : modified.substring(t.brackets[res*2].length, modified.length-t.brackets[res*2+1].length);
					//if message ends in -prefix!auto, or the sticky flag is set, set the auto proxy flag
					if(msg.content.match(matchPhraseEndsWithAuto) || besticky){
						setAutoProxyMember = t;
						setAutoProxy = true;
					}
					replace.push([msg, cfg, t, modified]);
					break;
				}
			}

			//escape to make auto proxy not work for a single message
			let escape ='\\';
			if(replace.length == 0  && automember !== undefined && clean.length > 0 && clean.substring(0, escape.length) != escape){
				//replace all spaces before -prefix!auto and -prefix!auto itself in the message
				let modified = msg.content.replace(matchLineEndsWithAuto, "");
				//if message ends in -prefix!auto, set the auto proxy flag
				if (msg.content.match(matchPhraseEndsWithAuto)) {
					setAutoProxyMember = null;
					setAutoProxy = true;
				}
				replace.push([msg, cfg, automember, modified]);
			}
			//if besticky is set and a message is escaped go back to using the null/default person
			if(clean.substring(0,escape.length) == escape && besticky){
				setAutoProxyMember = null;
				setAutoProxy = true;
			}
		}
	
		if(replace[0] && (!msg.channel.guild || !(await bot.db.isBlacklisted(msg.channel.guild.id,msg.channel.id,true)))) {
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
				//if I had set an auto proxy with -prefixl!auto then write that to the database
				//if this is sticky, and the given member matches the sticky member, do nothing

			} catch(e) { 
				if(e.message == "Cannot Send Empty Message") bot.send(msg.channel, "Cannot proxy empty message.");
				else if(e.permission == "Manage Webhooks") bot.send(msg.channel, "Proxy failed because I don't have 'Manage Webhooks' permission in this channel.");
				else if(e.message == "toolarge") bot.send(msg.channel, "Message not proxied because bots can't send attachments larger than 8mb. Sorry!");
				else if(e.message == "autoban") {
					if(e.notify) bot.send(msg.channel, "Proxies refused due to spam!");
					console.log(`Potential spam by ${msg.author.id}!`);
				} else if(e.code != 10008) bot.err(msg, e); //discard "Unknown Message" errors
			}
		}
		//this has to be outside the above block due to escaped auto proxies changing the state of who is set to auto
		//set the auto proxy based on the fields found during parsing
		if(setAutoProxy){
			//if there is a member to set to, set it
			if(setAutoProxyMember !== null && (automember === undefined || automember.id != setAutoProxyMember.id)){
				bot.db.setAuto(msg.author.id, setAutoProxyMember, besticky)
			}
			//if sticky and no member set, set to null to keep sticky
			else if(besticky){
				bot.db.setAuto(msg.author.id, null, besticky)
			}
			//otherwise, delete the auto proxy entirely
			else{
				bot.db.deleteAuto(msg.author.id);
			}
		}
	}
}