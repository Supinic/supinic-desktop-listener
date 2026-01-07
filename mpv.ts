import net, { type Socket } from "node:net";

const MPV_SOCKET = "/tmp/mpv.sock";
const MPV_TIMEOUT = 2000;
const MAX_COUNTER = 2**16 - 1;

type PromiseWithResolvers = ReturnType<typeof Promise.withResolvers<string>>;
type MpvResponse = {
    data: unknown;
    request_id: number;
    error: unknown;
};

const pending = new Map<number, PromiseWithResolvers>();
const timeouts = new Map<number, NodeJS.Timeout>();

let counter = 0;
let client: Socket;
const prepareSocket = (): Socket => {
    if (client && !client.destroyed) {
        return client;
    }

    client = net.createConnection({ path: MPV_SOCKET });
    client.on("connect", () => console.log("connected pog"));

    client.on("error", (err) => {
        console.error("MPV socket error", err);
        client.destroy(err);
    });

    client.on("close", () => {
        console.error("MPV socket close");
        client.destroy();
    });

    client.on("data", (rawData) => {
        const lines = rawData.toString().split("\n");
        for (const line of lines) {
            if (!line) {
                continue;
            }

            let data: MpvResponse;
            try {
                data = JSON.parse(line);
            }
            catch (e) {
                console.warn("Malformed MPV response", { line, e });
                continue;
            }

            const resolver = pending.get(data.request_id);
            if (!resolver) {
                continue;
            }

            resolver.resolve(JSON.stringify(data));
            pending.delete(data.request_id);

            const timeout = timeouts.get(data.request_id);
            if (timeout) {
                clearTimeout(timeout);
                timeouts.delete(data.request_id);
            }
        }
    });

    return client;
}

export default function query (rawData: string) {
    const socket = prepareSocket();

    const id = counter++ % MAX_COUNTER;
    const json: string[] = JSON.parse(rawData);
    const data = {
        request_id: id,
        command: json
    };

    socket.write(JSON.stringify(data) + "\n");

    const resolvers = Promise.withResolvers<string>();
    const abortTimeout = setTimeout(() => {
        resolvers.reject(new Error(`MPV request #${id} timed out`));
        timeouts.delete(id);
        pending.delete(id);
    }, MPV_TIMEOUT);

    timeouts.set(id, abortTimeout);
    pending.set(id, resolvers);

    return resolvers.promise;
}
