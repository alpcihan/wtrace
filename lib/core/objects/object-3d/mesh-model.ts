import { Material } from "../material";
import { Object3D } from "./object-3d";
import { Object3DType } from "./object-3d-types";
import { Mesh } from "../mesh";

class MeshModel extends Object3D {
    public constructor(mesh: Mesh, material: Material) {
        super();
        this.m_mesh = mesh;
        this.m_material = material;
    }

    public override type: Object3DType = Object3DType.MeshModel;

    // getters
    public get mesh(): Readonly<Mesh> {
        return this.m_mesh;
    }

    public get material(): Readonly<Material> {
        return this.m_material;
    }

    private m_mesh: Mesh;
    private m_material: Material;
}

export { MeshModel };
