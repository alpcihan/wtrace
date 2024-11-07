import { Material } from "../material";
import { Object3D } from "./object-3d";
import { Object3DType } from "./object-3d-types";
import { Mesh } from "../mesh";

class MeshModel extends Object3D {
    public constructor(meshID: number, materialID: number, triangleCount: number, vertexCount: number) {
        super();
        this.m_meshID = meshID;
        this.m_materialID = materialID;
        this.m_triangleCount = triangleCount;
        this.m_vertexCount = vertexCount;
    }

    public override type: Object3DType = Object3DType.MeshModel;

    // setters
    public set vertexOffest(offset:number) {
        this.m_vertexOffset = offset;
    }

    public set indexOffset(offset:number) {
        this.m_indexOffset = offset;
    }

    // getters
    public get meshID(): Readonly<number> {
        return this.m_meshID;
    }

    public get materialID(): Readonly<number> {
        return this.m_materialID;
    }

    public get triangleCount(): Readonly<number> {
        return this.m_triangleCount;
    }

    public get vertexCount(): Readonly<number> {
        return this.m_vertexCount;
    }

    public get vertexOffset(): Readonly<number> {
        return this.m_vertexOffset;
    }

    public get indexOffset(): Readonly<number> {
        return this.m_indexOffset;
    }

    private m_meshID: number;
    private m_materialID: number;

    //stats
    private m_triangleCount: number;
    private m_vertexCount: number;
    private m_vertexOffset: number;
    private m_indexOffset: number;
}

export { MeshModel };
