import { MeshModel } from "../objects/model/mesh-model";
import { IGPU } from "../renderer/igpu";

class SceneDataManager {
    public constructor() {
        this.m_vertices = new Float32Array();
        this._updateVertexBuffer();
    }

    public addModel(model: MeshModel): void {
        this.m_vertices = new Float32Array([...this.m_vertices, ...model.mesh.vertices]);
        this._updateVertexBuffer();
    }

    public get vertexBuffer(): GPUBuffer {
        return this.m_vertexBuffer;
    }

    private m_vertices: Float32Array;
    private m_vertexBuffer: GPUBuffer;

    private _updateVertexBuffer(): void {
        this.m_vertexBuffer = IGPU.get().createBuffer({
            size: this.m_vertices.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_vertexBuffer, 0, this.m_vertices);
    }
}

export { SceneDataManager };