module.exports = (function () {
	const got = require("got");
	// const Player = require("node-wav-player");
	const { promisify } = require("util");
	const exec = promisify(require('child_process').exec);

	const getDuration = require("get-mp3-duration");

	return class AudioPlayer {
		async play (filename) {
			try {
				const params = [
					"vlc",
					// "--audio-filter normvol",
					// "--norm-max-level=1.500000",
					"-I dummy",
					"--no-volume-save",
					//"--waveout-volume=0.05",
					//"--waveout-volume=" + volume,
					"--gain=0.375",
					//"--gain=8",
					"--play-and-exit",
					"--no-one-instance",
					`.\\playsounds\\${filename}`
				];

				await exec(params.join(" "));

				// await Player.play({
				// 	path: `.\\playsounds\\${filename}`
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

		async playFromURL (list, volume, limit) {
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
				console.debug({duration, limit});
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
})();
