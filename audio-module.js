module.exports = (function () {
	const got = require("got");
	const play = require("audio-play");
	const load = require("audio-loader");
	const { promisify } = require("util");
	const exec = promisify(require('child_process').exec);
	const getDuration = require("get-mp3-duration");	

	return class AudioPlayer {
		constructor () {
			this.files = {};
		}
		
		async play (filename) {
			try {
				if (!this.files[filename]) {
					this.files[filename] = await load("playsounds\\" + filename);
				}
				
				play(this.files[filename]);
				
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
				return acc += subDuration;
			}, 0);			
			
			if (duration > limit) {
				console.log({duration, limit});
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
			
			console.log(stringURLs);
			
			await exec(params.join(" "));			
			return true;
		}
	}
})();