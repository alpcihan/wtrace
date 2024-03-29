import { MeshModel } from "../objects/model/mesh-model";
import { Object3D } from "../objects/object-3d";
import { Object3DType } from "../objects/object-types";
import { SceneDataManager } from "./scene-data-manager";

class Scene {
    public constructor() {
        this.m_sceneDataManager = new SceneDataManager();
    }

    public add(object: Object3D): void {
        switch (object.type) {
            case Object3DType.MeshModel: { this._addMeshModel(object as MeshModel); break; }
        }
    }

    public get sceneDataManager(): SceneDataManager {
        return this.m_sceneDataManager;
    }

    private m_sceneDataManager: SceneDataManager;

    private _addMeshModel(model: MeshModel): void {
        this.m_sceneDataManager.addModel(model);
    }
}

export { Scene };
