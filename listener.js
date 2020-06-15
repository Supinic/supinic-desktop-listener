(async function () {
	"use strict";
	
	const qs = require("querystring");
	const url = require("url");
	const http = require("http");
	const AudioPlayer = require("./audio-module.js");
	const ytdl = require("youtube-dl");
	const fs = require("fs");
	
	const makeTTS = (text, voice = "Brian") => ({
		url: "https://api.streamelements.com/kappa/v2/speech/",
		searchParams: qs.stringify({ voice, text })
	});
	
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
				data.map(i => makeTTS(i.text, i.voice)),
				Number(parts.query.volume || 4),
				Number(parts.query.limit || 10000)
			);
		}
		else if (parts.query.necrodancer) {
			result = await new Promise((resolve, reject) => {
				ytdl.exec(parts.query.necrodancer, ["--extract-audio", "--audio-format", "mp3"], {}, (err, output) => {
					if (err) {
						reject(err);
					}
					else {
						resolve(output);
					}					
				});
			});
				
			result = "OK";
		}
		
		console.log(parts.query, result, String(result));
		res.end(String(result));
	});

	app.listen(9999);
	console.log("Listening...");
})();