(async function () {
	"use strict";
	
	const qs = require("querystring");
	const url = require("url");
	const http = require("http");
	const path = require("path");
	const AudioPlayer = require("./audio-module.js");
	const ytdl = require("youtube-dl");
	const shell = require("util").promisify(require('child_process').exec);

	const makeGoogleTTS = (text, locale = "en-gb", speed = 1) => {
		const slicedText = text.slice(0, 200);
		return {
			url: "http://translate.google.com/translate_tts",
			searchParams: qs.stringify({
				ie: "UTF-8",
				total: "1",
				idx: "0",
				client: "tw-ob",
				prev: "input",
				ttsspeed: String(speed),
				q: slicedText,
				textlen: slicedText.length,
				tl: locale
			})
		};
	};

	const audio = await new AudioPlayer();
	const app = http.createServer(async (req, res) => { 
		const parts = url.parse(req.url, true);
		let result = "OK";
		
		if (parts.query.audio) {
			const status = await audio.play(parts.query.audio);
			result = (status.success) ? "OK" : false;
		}
		else if (parts.query.specialAudio) {			
			result = await audio.playFromURL(
				[{ url: parts.query.url, searchParams: "" }],
				Number(parts.query.volume || 4),
				Number(parts.query.limit || 10000)
			);
		}	
		else if (parts.query.tts) {
			const data = JSON.parse(parts.query.tts);
			
			result = await audio.playFromURL(
				data.map(i => makeGoogleTTS(i.text, i.locale, i.speed)),
				Number(parts.query.volume || 4),
				Number(parts.query.limit || 10000)
			);
		}
		else if (parts.query.necrodancer) {
			const { link, zone } = JSON.parse(parts.query.necrodancer);
			const path = require("path").resolve("../necrodancer-custom-music/index.js");

			const res = await shell(`node ${path} ${link} ${zone} --debug`);
			console.log({ res });

			result = "OK";
		}
		
		console.log(parts.query, result, String(result));
		res.end(String(result));
	});

	app.listen(9999);
	console.log("Listening...");
})();