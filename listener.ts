import * as http from "node:http";
import qs from "node:querystring";
import url from "node:url";

import { AudioPlayer } from "./audio-module.js";
import { clear as clearAutoplay, get as getAutoplayLink } from "./autoplay/index.js";
import queryMpv from "./mpv.js";
import * as DesktopEffects from "./desktop-effects.js";

const PORT = 9999;

const makeGoogleTTS = (text: string, locale: string = "en-gb", speed: number = 1) => {
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

interface TTSRequest {
	text: string,
	locale: string,
	speed: number,
}

const audio = new AudioPlayer();
const app = http.createServer(async (req, res) => {
	const parts = url.parse(req.url!, true);
	let result = "OK";

	if (typeof parts.query.audio === "string") {
		console.log(`playing audio from ${parts.query.audio}`);
		const status = await audio.play(parts.query.audio);
		result = (status.success) ? "OK" : String(false);
	}
	else if (parts.query.specialAudio) {
		const url = parts.query.url;
		result = String(await audio.playFromURL(
			[{ url: typeof url === "string" ? url : "", searchParams: "" }],
			Number(parts.query.volume || 4),
			Number(parts.query.limit || 10000)
		));
	}
	else if (typeof parts.query.tts === "string") {
		const data: Array<TTSRequest> = JSON.parse(parts.query.tts);

		result = String(await audio.playFromURL(
			data.map(i => makeGoogleTTS(i.text, i.locale, i.speed)),
			Number(parts.query.volume || 4),
			Number(parts.query.limit || 10000)
		));
	}
	else if (parts.query.desktopEffect) {
		res.setHeader("Content-Type", "application/json");

		const { action, effect, data } = parts.query;
		const effectResult = await DesktopEffects.execute(effect as DesktopEffects.EffectKey, action as DesktopEffects.CommandKey, data as DesktopEffects.DesktopEffectData);

		result = JSON.stringify(effectResult);
	}
	else if (typeof parts.query.mpv === "string") {
		res.setHeader("Content-Type", "application/json");

		try {
			JSON.parse(parts.query.mpv);
		}
		catch (e) {
			console.warn("Malformed MPV JSON received", e);
			return res.end(JSON.stringify({
				error: "malformed JSON received"
			}));
		}

		try {
			result = await queryMpv(parts.query.mpv);
		}
		catch (e: unknown) {
			if (!(e instanceof Error)) {
				throw new Error(String(e));
			}

			result = JSON.stringify({ error: e.message, cause: e });
		}
	}
	else if (typeof parts.query.autoplay === "string") {
		res.setHeader("Content-Type", "application/json");

		const cmd = parts.query.autoplay;
		if (cmd === "queue") {
			const { link } = await getAutoplayLink();
			try {
				result = await queryMpv(JSON.stringify(["loadfile", link, "append-play"]));
			}
			catch (e: unknown) {
				if (!(e instanceof Error)) {
					throw new Error(String(e));
				}

				result = JSON.stringify({ error: e.message, cause: e });
			}
		}
		else if (cmd === "reset" || cmd === "clear") {
			clearAutoplay();
			result = JSON.stringify({ success: true });
		}
		else {
			throw new Error("Unrecognized autoplay command");
		}
	}

	res.end(result);
});

app.listen(PORT);
console.log(`Desktop listener listening at ${PORT}...`);
