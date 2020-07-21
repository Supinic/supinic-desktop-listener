# supinic-desktop-listener
Reacts to various `http` requests sent over local network.

This module is created specifically to work with [Supibot's](https://github.com/Supinic/supibot) `tts` and `playounds` commands.

### Requirements
- `VLC Media Player`, version 3.0+
- any module mentioned in `package.json` simply installed with `npm`, `yarn` or managers alike

### TTS flow
1) The `tts` command is invoked successfully on Supibot.
2) Supibot initiates a local http request, targetted at e.g. `http://(local-url)/?tts=data&volume=1&limit=30`
3) This module triggers an event for `audio-module.js` to catch this request.
4) Audio module creates a new headless, play-and-quit VLC instance to play a request from the [StreamElements](https://github.com/StreamElements) TTS API.

### Playsound flow
1) The `ps` command is invoked successfully on Supibot.
2) Supibot initiates a local http request, targetted at e.g. `http://(local-url)/?audio=file.wav`
3) This module triggers an event for `audio-module.js` to catch this request.
4) Audio module uses the `audio-play` module to play a file located at `./playsounds/file.wav`.

### Notes
This module has been created to work for my specific needs on Windows. You might encounter platform- and version-specific bugs.
Any PRs are welcome, but my development on this module is usually restricted to when it breaks. 