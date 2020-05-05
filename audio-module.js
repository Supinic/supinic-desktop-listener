module.exports = (function () {
	const fs = require("fs");
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
			if (!this.files[filename]) {
				this.files[filename] = await load("playsounds\\" + filename);
			}
			
			play(this.files[filename]);
		}
				
		async playFromURL (urls, volume, limit) {
			const resp = await Promise.all(urls.map(url => got({
				url,
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
		
			const stringURLs = urls.map(i => `"${i}"`).join(" ");
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
			
			await exec(params.join(" "));			
			return true;
		}
	}
})();