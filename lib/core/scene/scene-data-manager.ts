import { MeshModel } from "../objects/model/mesh-model";
import { IGPU } from "../renderer/igpu";
import { BVH } from "./bvh/bvh";

class SceneDataManager {
    public constructor() {
        this.m_vertices = new Float32Array();
        this._updateVertexBuffer();
        this.m_bvh = new BVH();
    }

    public addModel(model: MeshModel): void {
        this.m_vertices = new Float32Array([...this.m_vertices, ...model.mesh.vertices]);
        this._updateVertexBuffer();
        this._updateBVH();
    }

    public get vertexBuffer(): GPUBuffer {
        return this.m_vertexBuffer;
    }

    public get bvhNodeBuffer(): GPUBuffer {
        return this.m_bvhNodeBuffer;
    }

    public get triangleIdxBuffer(): GPUBuffer {
        return this.m_triangleIdxBuffer;
    }

    private m_vertices: Float32Array;
    private m_vertexBuffer: GPUBuffer;
    private m_bvh: BVH;
    private m_bvhNodeBuffer: GPUBuffer;
    private m_triangleIdxBuffer: GPUBuffer;

    private _updateVertexBuffer(): void {
        this.m_vertexBuffer = IGPU.get().createBuffer({
            size: this.m_vertices.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_vertexBuffer, 0, this.m_vertices);
    }

    private _updateBVH(): void {
        this.m_bvh.build(this.m_vertices);
        this._updateBVHBuffers();
    }
    
    private _updateBVHBuffers(): void {
        let bvhNodeBuffer = this.m_bvh.getBVHNodeBuffer();
        let triangleIdxBuffer = this.m_bvh.getTriangleIdxBuffer();

        this.m_bvhNodeBuffer = IGPU.get().createBuffer({
            size: bvhNodeBuffer.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
 
        this.m_triangleIdxBuffer = IGPU.get().createBuffer({
            size: triangleIdxBuffer.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_bvhNodeBuffer, 0, bvhNodeBuffer);
        IGPU.get().queue.writeBuffer(this.m_triangleIdxBuffer, 0, triangleIdxBuffer);
    }
}

export { SceneDataManager };