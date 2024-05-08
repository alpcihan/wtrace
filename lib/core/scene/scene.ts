import { MeshModel } from "../objects/object-3d/mesh-model";
import { Object3D } from "../objects/object-3d/object-3d";
import { Object3DType } from "../objects/object-3d/object-3d-types";
import { SceneDataManager } from "./scene-data-manager";

class Scene {
    public constructor() {
        this.m_sceneDataManager = new SceneDataManager();
    }

    public camera: THREE.Camera;

    // TODO: do not expose to client side
    public get sceneDataManager(): SceneDataManager {
        return this.m_sceneDataManager;
    }

    public add(object: Object3D): void {
        switch (object.type) {
            case Object3DType.MeshModel: { this._addMeshModel(object as MeshModel); break; }
        }
    }

    private m_sceneDataManager: SceneDataManager;

    private _addMeshModel(model: MeshModel): void {
        this.m_sceneDataManager.addModel(model);
    }
}

export { Scene };
