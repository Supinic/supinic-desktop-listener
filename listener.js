(async function () {
	"use strict";

	const fs = require("fs/promises");
	const qs = require("querystring");
	const url = require("url");
	const http = require("http");
	const ytdl = require("youtube-dl-exec");

	const AudioPlayer = require("./audio-module.js");
	const DesktopEffects = require("./desktop-effects.js");

	const { promisify } = require("util");
	const { exec } = require("child_process");
	const shell = promisify(exec);

	const bossIndex = {
		conga: 1,
		metal: 2,
		chess: 3,
		coral: 4,
		ringer: 5,
		necrodancer: 6,
		necrodancerReturn: 7,
		lute: 8,
		mole: 9,
		frankenstein: 10,
		conductor: 11
	};

	const necrodancerPathPositions = {
		"1-1": 0,
		"1-2": 1,
		"1-3": 2,
		"2-1": 3,
		"2-2": 4,
		"2-3": 5,
		"3-1": 6,
		"3-2": 7,
		"3-3": 8,
		"4-1": 9,
		"4-2": 10,
		"4-3": 11,
		"5-1": 12,
		"5-2": 13,
		"5-3": 14,
		conga: 15,
		metal: 16,
		chess: 17,
		coral: 18,
		ringer: 19,
		necrodancer: 20,
		necrodancerReturn: 21,
		lute: 22,
		mole: 23,
		frankenstein: 24,
		conductor: 25,
		lobby: 26,
		training: 27,
		tutorial: 28
	};

	const essentiaExecutablePath = "C:\\Custom SSD Data\\Steam\\steamapps\\common\\Crypt of the NecroDancer\\data\\essentia\\beattracker.exe";
	const necrodancerPlaylistPath = "C:\\Custom SSD Data\\Steam\\steamapps\\common\\Crypt of the NecroDancer\\mods\\playlist_76561198037725134_2";

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

	const audio = new AudioPlayer();
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
			let response = {};

			if (command === "request") {
				const { stdout: videoName } = await ytdl.exec(link, {
					getTitle: true
				});

				const { stdout: videoID } = await ytdl.exec(link, {
					getId: true
				});

				const audioFilePath = `C:\\Projects\\Local\\supinic-desktop-listener\\necrodancer-files\\${videoID}.mp3`;
				console.log({ audioFilePath });

				const data = await ytdl.exec(link, {
					extractAudio: true,
					restrictFilenames: true,
					format: "bestaudio",
					audioFormat: "mp3",
					postprocessorArgs: "-ar 44100",
					output: audioFilePath
				});

				console.log({ data });

				const zoneIdentifier = (bossIndex[zone])
					? `boss_${bossIndex[zone]}`
					: `zone${zone.replace("-", "_")}`;

				// if {necrodancerPlaylistPath}/music doesn't exist, make it here

				// if song/beatmap files exist, delete them here

				const beatmapFilePath = `${necrodancerPlaylistPath}\\music\\${zoneIdentifier}.txt`;
				console.log({ beatmapFilePath });
				try {
					await shell(`"${essentiaExecutablePath}" "${audioFilePath}" "${beatmapFilePath}"`);
				}
				catch (e) {
					console.warn("Essentia error", e);

					const errorResult =  JSON.stringify({ success: false, reason: "essentiar-error" });
					return res.end(String(errorResult));
				}

				const gameAudioFilePath = `${necrodancerPlaylistPath}\\music\\${zoneIdentifier}.ogg`;
				console.log({ gameAudioFilePath });
				await fs.copyFile(audioFilePath, gameAudioFilePath);

				const playlistDefinitionPath = `${necrodancerPlaylistPath}\\playlist.json`;
				const rawPlaylistDefinition = await fs.readFile(playlistDefinitionPath);
				const playlistDefinition = JSON.parse(rawPlaylistDefinition);

				const fakeAudioFilePath = `C:\\Projects\\Local\\supinic-desktop-listener\\necrodancer-files\\${videoName}.mp3`;
				const position = necrodancerPathPositions[zone];
				playlistDefinition.songFileNames[position] = fakeAudioFilePath;

				console.log({ playlistDefinition });

				await fs.writeFile(playlistDefinitionPath, JSON.stringify(playlistDefinition));

				response = {
					success: true,
					length: 0,
					beats: 0
				};
			}
			else if (command === "reset") {

			}

			result = JSON.stringify(response);
		}
		else if (parts.query.desktopEffect) {
			res.setHeader("Content-Type", "application/json");

			const { action, effect, data } = parts.query;
			const effectResult = await DesktopEffects.execute(effect, action, data);

			result = JSON.stringify(effectResult);
		}

		res.end(String(result));
	});

	app.listen(9999);
	console.log("Desktop listener listening...");
})();
