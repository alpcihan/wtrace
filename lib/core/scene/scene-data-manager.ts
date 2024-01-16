import { MeshModel } from "../objects/model/mesh-model";
import { IGPU } from "../renderer/igpu";
import { BVH } from "./bvh";

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
        // this.m_bvhNodeBuffer = IGPU.get().createBuffer({
        //     size: this.m_bvh.getBVHBufferSize(),
        //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        // });

        // this.m_triangleIdxBuffer = IGPU.get().createBuffer({
        //     size: this.m_bvh.getTriangleIdxBufferSize(),
        //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        // });

        // const bvhNodeViews = new ArrayBuffer(this.m_bvh.getBVHBufferSize()*this.m_bvh.getBVHNodeBuffer().length);
        // for(let i = 0; i < this.m_bvh.getBVHNodeBuffer().length; i++) {
        //     let node = this.m_bvh.getBVHNodeBuffer()[i];
        //     let view = {
                
        //     }
            
        // }

        // const bvhNodeValues = new ArrayBuffer(this.m_bvh.getBVHBufferSize());
    }
}

export { SceneDataManager };