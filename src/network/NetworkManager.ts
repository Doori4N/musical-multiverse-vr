import * as Y from 'yjs';
import {WebsocketProvider} from 'y-websocket';
import * as B from "@babylonjs/core";
import {AudioNodeState, PlayerState} from "./types.ts";
import {AudioNode3D} from "../audioNodes3D/AudioNode3D.ts";
import {Player} from "../Player.ts";

const TICK_RATE: number = 1000 / 30;
const SERVER_URL: string = 'ws://localhost:4444/';

export class NetworkManager {
    private readonly _doc: Y.Doc;
    private readonly _id: string;

    // Audio nodes
    private _networkAudioNodes3D!: Y.Map<AudioNodeState>; // network audio nodes
    private _audioNodes3D = new Map<string, AudioNode3D>(); // local audio nodes
    public onAudioNodeChangeObservable = new B.Observable<{action: 'add' | 'delete', state: AudioNodeState}>();

    // Players
    private _networkPlayers!: Y.Map<PlayerState>; // network players
    private _players = new Map<string, Player>(); // local players
    public onPlayerChangeObservable = new B.Observable<{action: 'add' | 'delete', state: PlayerState}>();

    constructor(id: string) {
        this._doc = new Y.Doc();
        this._id = id;
    }

    /**
     * Connect to a room using the given room name
    */
    public connect(roomName: string): void {
        // Connect to the server
        new WebsocketProvider(SERVER_URL + roomName, roomName, this._doc);

        // Audio nodes
        this._networkAudioNodes3D = this._doc.getMap('audioNodes3D');
        this._networkAudioNodes3D.observe((event: Y.YMapEvent<any>): void => {
            event.changes.keys.forEach(this._onAudioNode3DChange.bind(this));
        });

        // Players
        this._networkPlayers = this._doc.getMap('players');
        this._networkPlayers.observe((event: Y.YMapEvent<any>): void => {
            event.changes.keys.forEach(this._onPlayerChange.bind(this));
        });

        // Start the update loop
        setInterval(this._update.bind(this), TICK_RATE);
    }

    /**
     * Handle changes to the network audio nodes
     */
    private _onAudioNode3DChange(change: {action: "add" | "update" | "delete", oldValue: any}, key: string): void {
        switch (change.action) {
            // Add a new audio node
            case "add":
                // If the audio node already exists, return
                if (this._audioNodes3D.get(key)) return;
                this.onAudioNodeChangeObservable.notifyObservers({action: 'add', state: this._networkAudioNodes3D.get(key)!});
                break;
            // Update an existing audio node
            case "update":
                const state: AudioNodeState = this._networkAudioNodes3D.get(key)!;
                this._audioNodes3D.get(key)!.setState(state);
                break;
            case "delete":
                break;
            default:
                break;
        }
    }

    /**
     * Handle changes to the network players
    */
    private _onPlayerChange(change: {action: "add" | "update" | "delete", oldValue: any}, key: string): void {
        if (key === this._id) return;
        switch (change.action) {
            // Add a new player
            case "add":
                // If the player already exists, return
                if (this._players.get(key)) return;
                this.onPlayerChangeObservable.notifyObservers({action: 'add', state: this._networkPlayers.get(key)!});
                break;
            // Update an existing player
            case "update":
                const playerState: PlayerState = this._networkPlayers.get(key)!;
                this._players.get(key)!.setState(playerState);
                break;
            case "delete":
                break;
            default:
                break;
        }
    }

    /**
     * Add a new audio node to the network that will be synchronized with other clients
     */
    public createNetworkAudioNode3D(audioNode3D: AudioNode3D): void {
        const state: AudioNodeState = audioNode3D.getState();
        this.addRemoteAudioNode3D(audioNode3D);
        this._networkAudioNodes3D.set(state.id, state);
    }

    /**
     * Add a remote audio node locally
     */
    public addRemoteAudioNode3D(audioNode3D: AudioNode3D): void {
        const state: AudioNodeState = audioNode3D.getState();
        this._audioNodes3D.set(state.id, audioNode3D);
    }

    public getAudioNode3D(id: string): AudioNode3D | undefined {
        return this._audioNodes3D.get(id);
    }

    /**
     * Add a new player locally
     * @param player
     */
    public addRemotePlayer(player: Player): void {
        this._players.set(player.id, player);
    }

    public updatePlayerState(playerState: PlayerState): void {
        this._networkPlayers.set(playerState.id, playerState);
    }

    /**
     * Update remote audio nodes states with local states (if different)
     */
    private _update(): void {
        this._audioNodes3D.forEach((audioNode3D: AudioNode3D): void => {
            const state: AudioNodeState = audioNode3D.getState();

            // if the local state is different from the network state, update the network state
            if (!this._compare(state, this._networkAudioNodes3D.get(state.id)!)) {
                this._networkAudioNodes3D.set(state.id, state);
            }
        });
    }

    /**
     * Compare two audio node states and return true if they are the same
     */
    private _compare(state1: AudioNodeState, state2: AudioNodeState): boolean {
        return JSON.stringify(state1) === JSON.stringify(state2);
    }
}