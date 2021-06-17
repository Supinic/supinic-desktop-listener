(async function () {
	"use strict";

	const fs = require("fs").promises;
	const qs = require("querystring");
	const url = require("url");
	const http = require("http");
	const AudioPlayer = require("./audio-module.js");
	const Necrodancer = require("necrodancer-custom-music");

	const necrodancerDirectory = "C:\\Custom SSD Data\\Steam\\steamapps\\common\\Crypt of the Necrodancer";

	const makeGoogleTTS = (text, locale = "en-gb", speed = 1) => {
		const slicedText = text.slice(0, 200);
		return {
			url: "https://translate.google.com/translate_tts",
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
			res.setHeader("Content-Type", "application/json");

			const { command, link, zone } = JSON.parse(parts.query.necrodancer);
			const saveFilePath = await Necrodancer.detectSaveFile(necrodancerDirectory);
			let response = {};

			if (command === "request") {
				try {
					await Necrodancer.prepareZoneSymlinks(saveFilePath);
					const data = await Necrodancer.fullProcess({
						gameDir: necrodancerDirectory,
						link,
						zone,
						backupSaveFile: false,
						prepareAllSymlinks: false,
						forceDownload: false,
						forceBeatmap: false
					});

					const rawBeatMap = await fs.readFile(data.beatmapFile);
					const beatmap = rawBeatMap.toString()
						.split("\n")
						.filter(Boolean)
						.map(Number);

					const max = beatmap[beatmap.length - 1];
					response = {
						success: true,
						length: max,
						beats: beatmap.length
					};
				}
				catch (e) {
					console.error(e);
					response = {
						success: false,
						error: e,
						errorMessage: e.message
					};
				}
			}
			else if (command === "reset") {
				try {
					await Necrodancer.removeZoneSymlinks(...zone);
					response = {
						success: true
					};
				}
				catch (e) {
					console.error(e);
					response = {
						success: false,
						error: e,
						errorMessage: e.message
					};
				}
			}

			result = JSON.stringify(response);
		}
		
		console.debug(parts.query, result, String(result));
		res.end(String(result));
	});

	app.listen(9999);
	console.log("Desktop listener listening...");
})();