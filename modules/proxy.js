const db = require("./db");

module.exports = async ({msg,bot,members,cfg,automember}) => {
    if(msg.channel.guild && (!msg.channel.permissionsOf(bot.user.id).has("readMessages") || !msg.channel.permissionsOf(bot.user.id).has("sendMessages"))) return;
	if(members[0] && !(msg.channel.type == 1)) {


		let clean = msg.cleanContent || msg.content;
		clean = clean.replace(/(<a?:.+?:\d+?>)|(<@!?\d+?>)/,"cleaned");
		let cleanarr = clean.split("\n");
		let lines = msg.content.split("\n");


		//if there is a null automember with is_sticky of true this is a sticky user
		let besticky = automember && automember.is_sticky?true:false;
		//if no automember id exists (was null) then there is no auto member
		if(automember && !automember.id){
			automember = undefined;
		}

		//indicates if the auto proxy is going to change at the end of processing
		//setAutoProxyMember indicates what the member will be set to.  Set to null for no member
		let setAutoProxy = false;
		let setAutoProxyMember = null;

		let replace = [];
		let current = null;
		for(let i = 0; i < lines.length; i++) {
			let found = false;
			members.forEach(t => {
				//get the index of the brackets for a member (res) and the member object (t) using the cleaned message array
				let res = bot.checkMember(msg, t, cleanarr[i]);
				if(res >= 0) {
					if(t.brackets[res*2+1].length == 0) current = t;
					else current = null;
					found = true;
					//push the modified message into the replace array.  Depending on if the show brackets is set, clear brackets from message.
					let modified = t.show_brackets ? lines[i] : lines[i].substring(t.brackets[res*2].length, lines[i].length-t.brackets[res*2+1].length);
					//if the the sticky flag is set, flag that an auto needs to be used
					if(besticky){
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
					//strip brackets from message
					let modified =t.show_brackets ? msg.content : msg.content.substring(t.brackets[res*2].length, msg.content.length-t.brackets[res*2+1].length);
					//if the sticky flag is set, set the auto proxy flag
					if(besticky){
						setAutoProxyMember = t;
						setAutoProxy = true;
					}
					replace.push([msg, cfg, t, modified]);
					break;
				}
			}

			//escape to make auto proxy not work for a single message
			let escape ='\\\\';
			let stickyescape = '\\';

			let matchesEscape = (msg.content.substring(0, escape.length) == escape);
			let matchesStickyEscape = msg.content.substring(0, stickyescape.length) == stickyescape;
			//this is required in case sticky escape is a subset of normal escape 
			//if that is the case, and both are true, the user is trying to pick the longer one, turn off sticky  escape
			if(matchesStickyEscape && matchesEscape && stickyescape.length < escape.length){
				matchesStickyEscape = false;
			}
			if(matchesStickyEscape){
				matchesEscape = true;
			}

			//if an auto member is provided and no other member matched and the escape wasn't used, use that auto member
			if(replace.length == 0  && automember !== undefined && clean.length > 0 && !matchesEscape){
				replace.push([msg, cfg, automember, msg.content]);
			}
			//if besticky is set and a message is escaped go back to using the null/default member as the "stuck" one.
			if(clean.substring(0,escape.length) == escape && besticky && !matchesStickyEscape){
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