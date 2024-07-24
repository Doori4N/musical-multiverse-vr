import {App} from "./App.ts";
import * as Tone from "tone";
import {SessionMenu} from "./SessionMenu.ts";

const audioCtx: AudioContext = new AudioContext();

window.onload = (): void => {
    Tone.setContext(audioCtx);
    App.getInstance(audioCtx);
    const sessionMenu = new SessionMenu();
    sessionMenu.showMenu();
};

window.addEventListener('click', async (): Promise<void> => {
    await audioCtx.resume();
    await Tone.start();
    await Tone.Transport.context.resume();
}, { once: true });