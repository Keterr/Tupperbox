module.exports = {
	help: cfg => "Get a link to the official support server!",
	usage: cfg => [usage: "feedback", params: "", description: "Get a link to the support server."],
	permitted: msg => true,
	execute: (bot, msg, args, cfg) => {
		return "https://discord.gg/rHxMbt2";
	}
};
