const { promisify } = require("util");
const { exec } = require("child_process");
const shell = promisify(exec);

const DBUS_COMMAND = {
	enable: "loadEffect",
	disable: "unloadEffect",
	toggle: "toggleEffect",
	check: "isEffectLoaded"
};
export type CommandKey = keyof typeof DBUS_COMMAND;

const createCommand = (effect: string, action: string) => `dbus-send --print-reply --dest=org.kde.KWin /Effects org.kde.kwin.Effects.${action} string:"${effect}"`;
const runCommand = async (effect: string, action: string) => {
	const cmd = createCommand(effect, action);

	console.log({ cmd });

	return await shell(cmd);
};

const DEFAULT_TIMEOUT = 15_000; // TODO change to 5 minutes

const EFFECTS = {
	"wobbly-windows": "wobblywindows",
	invert: "invert"
};
export type EffectKey = keyof typeof EFFECTS;

const timeouts = new WeakSet();

export interface DesktopEffectData {
	timeout?: number
	skipTimeout?: boolean
}

export const execute = async (effectName: keyof typeof EFFECTS, actionName: keyof typeof DBUS_COMMAND, data: DesktopEffectData = {}) => {
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

	if (actionName === "enable") {
		const result = await runCommand(effect, action);
		if (!data.skipTimeout) {
			const timeoutObject = setTimeout(
				() => execute(effectName, "disable", data),
				data.timeout ?? DEFAULT_TIMEOUT
			);

			timeouts.add(timeoutObject);
		}

		return {
			success: true,
			stdout: result.stdout.split("\n").filter(Boolean),
			stderr: result.stderr.split("\n").filter(Boolean)
		};
	}
	else {
		const result = await runCommand(effect, action);

		return {
			success: true,
			stdout: result.stdout.split("\n").filter(Boolean),
			stderr: result.stderr.split("\n").filter(Boolean)
		};
	}
}

