(async function () {
	"use strict";
	
	const qs = require("querystring");
	const url = require("url");
	const http = require("http");
	const AudioPlayer = require("./audio-module.js");
	const Necrodancer = require("necrodancer-custom-music");

	const necrodancerDirectory = "C:\\Custom SSD Data\\Steam\\steamapps\\common\\Crypt of the Necrodancer";

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
			const { command, link, zone } = JSON.parse(parts.query.necrodancer);
			if (command === "request") {
				try {
					await Necrodancer.fullProcess({
						gameDir: necrodancerDirectory,
						link,
						zone,
						backupSaveFile: false,
						prepareAllSymlinks: false,
						forceDownload: false,
						forceBeatmap: false
					});

					result = "OK";
				}
				catch (e) {
					console.error(e);
					result = e.message;
				}
			}
			else if (command === "reset") {
				const saveFilePath = await Necrodancer.detectSaveFile(necrodancerDirectory);
				if (!saveFilePath) {
					throw new Error("No Necrodancer save file?");
				}

				try {
					await Necrodancer.resetZones(saveFilePath, ...zone);
					result = "OK";
				}
				catch (e) {
					console.error(e);
					result = e.message;
				}
			}

		}
		
		console.log(parts.query, result, String(result));
		res.end(String(result));
	});

	app.listen(9999);
	console.log("Listening...");
})();