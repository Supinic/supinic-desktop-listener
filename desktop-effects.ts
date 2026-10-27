import { promisify } from "node:util";
import { execFile } from "node:child_process";
const runFile = promisify(execFile);

const MAX_TIMEOUT = 3_600_000;
const DEFAULT_TIMEOUT = 300_000;
export type DesktopEffectData = {
	timeout?: number;
	skipTimeout?: boolean;
};

const DBUS_COMMAND = {
	enable: "loadEffect",
	disable: "unloadEffect",
	toggle: "toggleEffect",
	check: "isEffectLoaded"
};
export type CommandKey = keyof typeof DBUS_COMMAND;

const EFFECTS = {
	"fall-apart": "fallapart",
	"wobbly-windows": "wobblywindows",
	invert: "invert"
};
export type EffectKey = keyof typeof EFFECTS;

const runCommand = async (effect: string, action: (typeof DBUS_COMMAND)[CommandKey]) => runFile("dbus-send", [
	"--session",
	"--print-reply",
	"--dest=org.kde.KWin",
	"/Effects",
	`org.kde.kwin.Effects.${action}`,
	`string:"${effect}"`
]);

const timeouts = new Map<EffectKey, NodeJS.Timeout>();
const clearEffectTimeout = (effectName: EffectKey) => {
	const existing = timeouts.get(effectName);
	if (existing) {
		clearTimeout(existing);
		timeouts.delete(effectName);
	}
};
const resetEffectTimeout = (effectName: EffectKey, data: DesktopEffectData) => {
	clearEffectTimeout(effectName);
	if (data.skipTimeout) {
		return;
	}

	const timeout = data.timeout ?? DEFAULT_TIMEOUT;
	const timer = setTimeout(async () => {
		if (timeouts.get(effectName) !== timer) {
			return;
		}

		timeouts.delete(effectName);

		try {
			await runCommand(EFFECTS[effectName], DBUS_COMMAND.disable)
		}
		catch (e) {
			console.error(`Failed to disable effect ${effectName}`, { e });
		}
	}, timeout);

	timeouts.set(effectName, timer);
};

export const execute = async (effectName: EffectKey, actionName: CommandKey, data: DesktopEffectData = {}) => {
	const effect = EFFECTS[effectName];
	if (!effect) {
		return {
			success: false,
			reason: "Unknown effect"
		};
	}

	const action = DBUS_COMMAND[actionName];
	if (!action) {
		return {
			success: false,
			reason: "Unknown action"
		};
	}

	if (actionName === "enable" && !data.skipTimeout) {
		const timeout = data.timeout ?? DEFAULT_TIMEOUT;
		if (!Number.isSafeInteger(timeout) || timeout < 0 || timeout > MAX_TIMEOUT) {
			return {
				success: false,
				reason: "Invalid timeout"
			};
		}
	}

	const result = await runCommand(effect, action);
	if (actionName === "enable") {
		resetEffectTimeout(effectName, data);
	}
	else if (actionName === "disable" || actionName === "toggle") {
		clearEffectTimeout(effectName);
	}

	return {
		success: true,
		stdout: result.stdout.split("\n").filter(Boolean),
		stderr: result.stderr.split("\n").filter(Boolean)
	};
}

