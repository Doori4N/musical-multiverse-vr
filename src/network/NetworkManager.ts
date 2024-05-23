import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import * as B from "@babylonjs/core";
import { AudioNodeState, PlayerState } from "./types.ts";
import { AudioNode3D } from "../audioNodes3D/AudioNode3D.ts";
import { Player } from "../Player.ts";

const TICK_RATE: number = 1000 / 30;
const SIGNALING_SERVER: string = 'wss://musical-multiverse-vr.onrender.com:4444';

export class NetworkManager {
    private readonly _doc: Y.Doc;
    private readonly _id: string;
    private readonly _currentPlayerId: string;

    // Audio nodes
    private _networkAudioNodes3D!: Y.Map<AudioNodeState>;
    private _audioNodes3D = new Map<string, AudioNode3D>();
    public onAudioNodeChangeObservable = new B.Observable<{ action: 'add' | 'delete', state: AudioNodeState }>();

    // Players
    private _networkPlayers!: Y.Map<PlayerState>;
    private _players = new Map<string, Player>();
    public onPlayerChangeObservable = new B.Observable<{ action: 'add' | 'delete', state: PlayerState }>();

    constructor(id: string) {
        this._doc = new Y.Doc();
        this._id = id;
        this._currentPlayerId = id;  // Set current player ID
    }

    public connect(roomName: string): void {
        new WebrtcProvider(roomName, this._doc, { signaling: [SIGNALING_SERVER] });

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

        setInterval(this._update.bind(this), TICK_RATE);
    }

    private _onAudioNode3DChange(change: { action: "add" | "update" | "delete", oldValue: any }, key: string): void {
        switch (change.action) {
            case "add":
                if (this._audioNodes3D.get(key)) return;
                this.onAudioNodeChangeObservable.notifyObservers({ action: 'add', state: this._networkAudioNodes3D.get(key)! });
                break;
            case "update":
                const state: AudioNodeState = this._networkAudioNodes3D.get(key)!;
                this._audioNodes3D.get(key)!.setState(state);
                console.log("update received:", state.position)
                break;
            case "delete":
                break;
            default:
                break;
        }
    }

    private _onPlayerChange(change: { action: "add" | "update" | "delete", oldValue: any }, key: string): void {
        if (key === this._id) return;
        switch (change.action) {
            case "add":
                if (this._players.get(key)) return;
                this.onPlayerChangeObservable.notifyObservers({ action: 'add', state: this._networkPlayers.get(key)! });
                break;
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

    public addRemotePlayer(player: Player): void {
        this._players.set(player.id, player);
    }

    public updatePlayerState(playerState: PlayerState): void {
        this._networkPlayers.set(playerState.id, playerState);
    }

    /**
     * Get the current player ID
     */
    public getCurrentPlayerId(): string {
        return this._currentPlayerId;
    }

    /**
     * Send modification status to the server
     */
    public sendModification(nodeId: string, isModified: boolean): void {
        // Logic to send the modification status of the node to the server
        // Example: update a map in Yjs doc to track modification status
        const modificationStatus = { nodeId, isModified };
        this._doc.getMap('modificationStatus').set(nodeId, modificationStatus);
    }

    /**
     * Update the network with the latest audio node states
     */
    private _update(): void {
        this._audioNodes3D.forEach((audioNode3D: AudioNode3D): void => {
            const state: AudioNodeState = audioNode3D.getState();
            if (state.isModified) {
                this._networkAudioNodes3D.set(state.id, state);
                console.log("update sent:", state.position);
            }
        });
    }
}
