import { MeshModel } from "../objects/object-3d/mesh-model";
import { Object3D } from "../objects/object-3d/object-3d";
import { Object3DType } from "../objects/object-3d/object-3d-types";
import { SceneDataManager } from "./scene-data-manager";
import { Mesh } from "../objects/mesh";
import { Texture } from "../objects/texture";
import { Material } from "../objects/material";

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

    //Mesh Functions
    public addMesh(mesh: Mesh): number {
        return this.m_sceneDataManager.addMesh(mesh);
    }

    public getMeshID(id: string): number|undefined {
        return this.m_sceneDataManager.getMeshID(id);
    }

    //Texture Functions
    public addTexture(texture: Texture): number {
        return this.m_sceneDataManager.addTexture(texture);
    }

    public getTextureID(id: string): number|undefined {
        return this.m_sceneDataManager.getTextureID(id);
    }

    //Material Functions
    public addMaterial(material: Material): number {
        return this.m_sceneDataManager.addMaterial(material);
    }

    public getMaterialID(id: string): number|undefined {
        return this.m_sceneDataManager.getMaterialID(id);
    }

    private m_sceneDataManager: SceneDataManager;

    private _addMeshModel(model: MeshModel): void {
        this.m_sceneDataManager.addModel(model);
    }
}

export { Scene };
