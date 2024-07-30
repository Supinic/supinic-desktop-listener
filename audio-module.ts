import * as path from "node:path";
import { promisify } from "node:util";
import { exec as raw_exec } from "node:child_process";
import got from "got";
import getDuration from "get-mp3-duration";

// const Player = require("node-wav-player");
const exec = promisify(raw_exec);

interface PlaybackUrl {
	url: string,
	searchParams?: string,
}

export class AudioPlayer {
	async play(filename: string) {
		const playsoundPath = path.join(".", "playsounds", filename);
		try {
			const params = [
				"vlc",
				// "--audio-filter normvol",
				// "--norm-max-level=1.500000",
				"-I dummy",
				"--no-volume-save",
				//"--waveout-volume=0.05",
				//"--waveout-volume=" + volume,
				"--gain=1.5",
				//"--gain=8",
				"--play-and-exit",
				"--no-one-instance",
				playsoundPath
			];

			await exec(params.join(" "));

			// await Player.play({
			// 	path: `.\\playsounds\\${ filename } `
			// });

			return {
				success: true
			};
		}
		catch (e) {
			return {
				success: false,
				cause: e
			};
		}
	}

	async playFromURL(list: Array<PlaybackUrl>, volume: number, limit: number) {
		const resp = await Promise.all(list.map(obj => got({
			url: obj.url,
			searchParams: obj.searchParams || "",
			responseType: "buffer"
		})));

		const duration = resp.reduce((acc, cur) => {
			const subDuration = getDuration(cur.body);
			return (acc + subDuration);
		}, 0);

		if (duration > limit) {
			console.debug({ duration, limit });
			return false;
		}

		const stringURLs = list.map(i => `"${i.url}?${i.searchParams}"`).join(" ");
		const params = [
			"vlc",
			// "--audio-filter normvol",
			// "--norm-max-level=1.500000",
			"-I dummy",
			"--no-volume-save",
			//"--waveout-volume=0.05",
			//"--waveout-volume=" + volume,
			"--gain=" + volume,
			//"--gain=8",
			"--play-and-exit",
			"--no-one-instance",
			stringURLs
		];

		console.debug(stringURLs);

		await exec(params.join(" "));
		return true;
	}
}
