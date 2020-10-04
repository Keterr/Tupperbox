require("dotenv").config();
const Sharder = require("eris-sharder").Master;
const cluster = require("cluster");

try { 
	require("./auth.json");
	throw new Error("outdated");
} catch(e) { 
	if(e.message == "outdated") throw new Error("auth.json is outdated, please use the .env file instead! See the github page for more info");
}

(async () => {

	let db;
	if (cluster.isMaster) {
		db = require("./modules/db");
		await db.init();
	}

	let sharder = new Sharder("Bot " + process.env.DISCORD_TOKEN,"/bot.js",{
		name: "Tupperbox",
		debug: true,
		stats: false,
		shards: +process.env.SHARDS,
		clusters: +process.env.CLUSTERS || process.env.DEV? 1 : undefined,
		clusterTimeout: 0.1,
		clientOptions: {
            messageLimit: 0,
			restMode: true,
			ratelimiterOffset: 5,
			maxConcurrency: process.env.MAX_CONCURRENCY ?? 1,
			intents: 13825,
			disableEvents: {
				MESSAGE_DELETE: true,
				MESSAGE_DELETE_BULK: true,
				CHANNEL_PINS_UPDATE: true,
			},
		},
	});

	sharder.eris.on("debug", (data) => {
		if(typeof data != "string" || !data.includes("left | Reset")) console.log(data);
	});

	if (!cluster.isMaster) return;

	sharder.db = db;
	sharder.stat = {};
	setInterval(() => sharder.broadcast(0, { name: "sendStats" }), process.env.STATS_INTERVAL ?? 10000);

	let events = require("./modules/ipc.js");

	cluster.on("message", async (worker,message) => {
		if(message.name == "reloadIPC") {
			delete require.cache[require.resolve("./modules/ipc.js")];
			events = require("./modules/ipc.js");
			console.log("Reloaded IPC plugin!");
		} 
		else events(sharder, worker, message);
	});

})();