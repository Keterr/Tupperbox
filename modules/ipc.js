const cluster = require("cluster");
const os = require("os");
const table = require("easy-table");

const dhm = (t) => {
	let cd = 24 * 60 * 60 * 1000, ch = 60 * 60 * 1000, cm = 60 * 1000, cs = 1000;
	let d = Math.floor(t/cd), h = Math.floor((t-d*cd)/ch), m = Math.floor((t-d*cd-h*ch)/cm), s = Math.floor((t-d*cd-h*ch-m*cm)/cs);
	return `${d ? `${d}d ` : ''}${h | d ? `${h}h ` : ''}${m | h | d ? `${m}m ` : ''}${s | m | h | d ? `${s}s ` : ''}`;
	//return `${d}d ${h}h ${m}m ${s}s`;
};

const masterExports = (enqueue) => async (sharder, worker, message) => {
	switch(message.name) {
		case "postStats":
			let totalGuilds = 0;
			let totalMemory = 0;
			let totalMessages = 0;
			let totalMessageChannels = 0;

			let t = new table;

			Object.values(sharder.stat).forEach(clusterStat => {
				totalGuilds += clusterStat.guilds.length;
				totalMemory += clusterStat.ram/1000000;
				totalMessages += clusterStat.cachedMessages;
				totalMessageChannels += clusterStat.cachedMessageChannels;

				t.cell("ID", clusterStat.id);
				t.cell("Guilds", `[${clusterStat.guilds.length}]${clusterStat.guilds.filter(x => !x.available).length ? `(${clusterStat.guilds.filter(x => !x.available).length} down)` : ''}`);
				t.cell("Shards", `${clusterStat.shards.length} (${clusterStat.shards.filter(x => x.status == "ready").length} up)`);
				t.cell("Memory", `${(clusterStat.ram/1000000).toFixed(1)} MB`);
				t.cell("Uptime", dhm(clusterStat.uptime));
				t.newRow();
			})

			sharder.eris.createMessage(message.channelID, { embed: { 
				description: "**__Clusters:__**\n```css\n" + t.toString() + "```\n" + `**Totals:** ${totalGuilds} guilds | ${process.env.SHARDS} shards | ${totalMemory.toFixed(1)} MB RAM | Up ${Object.values(sharder.stat).shift().uptime}\n`,
				color: 6982049,
				fields: [
					{ name: "Host RAM Usage", value: `${((os.totalmem() - os.freemem())/1000000).toFixed(1)} MB (out of ${(os.totalmem()/1000000).toFixed(1)} MB)`, inline: true },
					{ name: "Messages cached", value: `${totalMessages} messages (across ${totalMessageChannels} channels)`, inline: true },
					{ name: 'Shards per cluster', value: (process.env.SHARDS / Object.keys(sharder.stat).length).toFixed(0) },
					{ name: `${message.lang.slice(0, 1).toUpperCase()}${message.lang.slice(1, message.lang.length)}s registered`, value: await sharder.db.members.count(), inline: true },
					{ name: `Groups registered`, value: await sharder.db.groups.count(), inline: true },
				],
				footer: { text: `Request received on Shard ${message.shard} (Cluster ${message.cluster})` }, timestamp: new Date().toJSON() } 
			});
			break;

		case "rawstats":
			sharder.eris.createMessage(message.channelID, {}, { file: Buffer.from(JSON.stringify(sharder.stat, null, 2)), name: "stats.json" } );
			break;

		case "statReturn":
			sharder.stat[worker.id] = message.stats;
			break;

		case "queueDelete":
			if(!message.channelID || !message.messageID) return;
			enqueue(message);
			break;

		case "reloadQueue":
			delete require.cache[require.resolve('./queue')];
			enqueue = require("./queue");
			break;

		case "restartCluster":
			if(message.id) cluster.workers[sharder.clusters.get(msg.id).workerID].kill();
			break;

		case "eval":
			if (message.code) console.log(await eval(message.code));
			break;
	}
};

const types = ['command', 'module', 'event'];
const modules = ['blacklist', 'cmd', 'db', 'influx', 'msg', 'paginator', 'proxy', 'redis'];
const botModules = ['util', 'ipc'];

const botExports = (bot) => bot.ipc = async (msg) => {
	switch(msg.name) {
		case "reload": {
			if (!msg.type) return; 
			let out = "";

			if (msg.type == "ipc") {
				delete require.cache[require.resolve(`../modules/ipc`)];
				bot.ipc = require(`../modules/ipc`)(bot);
				console.log(`reloaded ipc module`);
				return;
			}

			msg.targets.forEach(async (arg) => {
				try {
					let path = `../${msg.type}s/${arg}`;

					if (types.includes(msg.type)) {
						delete require.cache[require.resolve(path)];
						console.log(`deleted ${path}`)
					}
					if (msg.type == "command") bot.cmds[arg] = require(path);

					else if(msg.type == "event") {
						bot.removeAllListeners(arg);
						let func = require(path);
						bot.on(arg, (...a) => func(...a,bot));
					}

					else if(msg.type == "module") {
						if (arg == "db") await bot.db.end();
						if (modules.includes(arg)) bot[arg] = require(`../modules/${arg + (arg == "blacklist" ? ".json" : "")}`);
						else if (botModules.includes(arg)) require(`../modules/${arg}`)(bot);
					}

					out += `${arg} reloaded\n`;
				} catch(e) {
					out += `Could not reload ${arg} (${e.code}) - ${e.stack}\n`;
				}
			});

			console.log(out);
			break;
		}

		case "eval": {
			if (!msg.code) return;
			let result = await eval(msg.code);
			console.log(result);
			break;
		};

		case "sendStats": {
			process.send({
				name: "statReturn",
				stats: {
					id: bot.cluster.clusterID,
					uptime: Date.now() - bot.cluster.launchTime,
					ram: process.memoryUsage().rss.toFixed(2),
					cachedMessages: bot.recent ? ((Object.values(bot.recent)).map(x => Object.keys(x))).flat().length : 0,
					cachedMessageChannels: Object.keys(bot.recent).length,
					shards: [{
						"1": "a",
						"b": "2",
						"3": "ch"
					}],
					shards: bot.shards.map((shard) => {
						return {
							id: shard.id,
							status: shard.status,
							latency: shard.latency,
							lastIdentified: shard.lastIdentified,
							guilds: bot.guilds.filter(x => x.shard.id == shard.id).length,
						}
					}),
					guilds: bot.guilds.map((guild) => {
						return {
							id: guild.id,
							shardID: guild.shard.id,
							members: guild.memberCount,
							available: !guild.unavailable,
						}
					})
				}
			})
		}

	}
};

if (cluster.isMaster) module.exports = masterExports(require("./queue"));
else module.exports = botExports;
