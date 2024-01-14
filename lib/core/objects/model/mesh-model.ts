import { Object3D } from "../object-3d";
import { Object3DType } from "../object-types";
import { Mesh } from "./mesh";

class MeshModel extends Object3D {
    public constructor(mesh: Mesh) {
        super();
        this.m_mesh = mesh;
    }

    public override type: Object3DType = Object3DType.MeshModel;

    public get mesh(): Mesh {
        return this.m_mesh;
    }

    public set mesh(mesh: Mesh) {
        this.m_mesh = mesh;
    }

    private m_mesh: Mesh;
}

export { MeshModel };
