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
	async play (filename: string) {
		const playsoundPath = path.join(".", "playsounds", filename);
		try {
			// const params = [
			// 	"vlc",
			// 	// "--audio-filter normvol",
			// 	// "--norm-max-level=1.500000",
			// 	"-I dummy",
			// 	"--no-volume-save",
			// 	//"--waveout-volume=0.05",
			// 	//"--waveout-volume=" + volume,
			// 	"--gain=8",
			// 	//"--gain=8",
			// 	"--play-and-exit",
			// 	"--no-one-instance",
			// 	playsoundPath
			// ];

			const params = [
				"mpv",
				"--keep-open=no",
				"--video=no",
				`--title="Desktop listener: playsound ${filename}"`,
				"--volume=75",
				"--af=lavfi=[loudnorm=I=-27:TP=-4:LRA=4]",
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
			"mpv",
			"--keep-open=no",
			"--video=no",
			`--title="Desktop listener: special audio"`,
			"--volume=75",
			"--af=lavfi=[loudnorm=I=-27:TP=-4:LRA=4]",
			stringURLs,
			// "--af=lavfi=[dynaudnorm=f=75:g=25:p=0.55]"
		];

		console.debug(stringURLs);

		await exec(params.join(" "));
		return true;
	}
}
