import {XRInputManager} from "./XRInputManager.ts";
import * as B from "@babylonjs/core";

export class XRManager {
    private static _instance: XRManager;
    public xrInputManager!: XRInputManager;
    public xrHelper!: B.WebXRDefaultExperience;
    private _scene!: B.Scene;

    private constructor() {}

    public static getInstance(): XRManager {
        if (!this._instance) {
            this._instance = new XRManager();
        }
        return this._instance;
    }

    /**
     * Initialize the WebXR experience, XRInputs and XR features
     */
    public async init(scene: B.Scene): Promise<void> {
        this._scene = scene;
        this.xrHelper = await this._getWebXRExperience();
        this._initXRFeatures();
        this.xrInputManager = new XRInputManager(this.xrHelper);
        await this.xrInputManager.initControllers();
    }

    /**
     * Get the WebXR experience helper
     * @throws {Error} if WebXR is not supported
     */
    private async _getWebXRExperience(): Promise<B.WebXRDefaultExperience> {
        const isSupported: boolean = await B.WebXRSessionManager.IsSessionSupportedAsync('immersive-ar');
        if (!isSupported) {
            const errorMessage: string = 'WebXR is not supported on this browser';
            throw new Error(errorMessage);
        }
        else return await this._scene.createDefaultXRExperienceAsync();
    }

    private _initXRFeatures(): void {
        const featuresManager: B.WebXRFeaturesManager = this.xrHelper.baseExperience.featuresManager;
        featuresManager.disableFeature(B.WebXRFeatureName.TELEPORTATION);
        featuresManager.enableFeature(B.WebXRFeatureName.MOVEMENT, "latest", {
            xrInput: this.xrHelper.input,
            movementSpeed: 0.2,
            rotationSpeed: 0.3,
        });
    }
}