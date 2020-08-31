const fs = require("fs").promises;
let policy = null;
fs.readFile("./privacy.txt").then(file => policy = file.toString());

module.exports = {
	help: cfg => "View my privacy policy.",
	usage: cfg => [usage: "privacy", params: "", description: "Show the privacy policy"],
	permitted: msg => true,
	execute: (bot, msg, args, cfg) => {
		return policy;
	}
};
