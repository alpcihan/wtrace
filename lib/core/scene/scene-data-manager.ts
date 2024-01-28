import * as THREE from "three";
import { MeshModel } from "../objects/model/mesh-model";
import { IGPU } from "../renderer/igpu";
import { BLAS, BLAS_NODE_SIZE } from "./acceleration-structure/blas";

class SceneDataManager {
    public constructor() {
        this.m_models = new Array<MeshModel>();
        this.m_vertices = new Float32Array();
        this.m_blasNodeCount = 0;
        this.m_blasArray = new Array<BLAS>();
        this._updateVertexBuffer();
    }

    public addModel(model: MeshModel) {
        this.m_models.push(model);
    }

    public buildSceneData() { // TODO: add build check
        this.m_models.forEach(model => {
            // add vertices
            this.m_vertices = new Float32Array([...this.m_vertices, ...model.mesh.vertices]);
 
            // create blas
            const blas: BLAS = new BLAS(model.mesh.vertices);
            blas.build();
            this.m_blasNodeCount += blas.nodes.length;
            this.m_blasArray.push(blas);
        });

        this._updateVertexBuffer();
        this._updateBLASBuffers();
    }

    public get vertexBuffer(): GPUBuffer {
        return this.m_vertexBuffer;
    }

    public get blasBuffer(): GPUBuffer {
        return this.m_blasBuffer;
    }

    public get triangleIdxBuffer(): GPUBuffer {
        return this.m_triangleIdxBuffer;
    }

    private m_vertices: Float32Array;
    private m_vertexBuffer: GPUBuffer;
    private m_models: Array<MeshModel>;
    
    private m_blasArray: Array<BLAS>;
    private m_blasNodeCount: number;        // total node count
    private m_blasBuffer: GPUBuffer;        // blas array
    private m_triangleIdxBuffer: GPUBuffer;

    private _updateVertexBuffer(): void {
        this.m_vertexBuffer = IGPU.get().createBuffer({
            size: this.m_vertices.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_vertexBuffer, 0, this.m_vertices);
    }
    
    private _updateBLASBuffers(): void {
        // pack blas data
        const blasArrayF32: Float32Array = new Float32Array(this.m_blasNodeCount * BLAS_NODE_SIZE);
        const triangleIdxArrayF32: Uint32Array = new Uint32Array((this.m_vertices.length / 9) * 4);

        let nodeOffset: number = 0;
        let triangleIdxOffset: number = 0;
        this.m_blasArray.forEach(blas => {
            // pack nodes
            blas.nodes.forEach((node, i) => {
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 0] = node.leftFirst;
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 1] = node.triangleCount;
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 2] = 0.0; // padding
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 3] = 0.0; // padding
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 4] = node.aabb.min.x;
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 5] = node.aabb.min.y;
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 6] = node.aabb.min.z;
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 7] = 0.0; // padding
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 8] = node.aabb.max.x;
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 9] = node.aabb.max.y;
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 10] = node.aabb.max.z;
                blasArrayF32[(nodeOffset + i) * BLAS_NODE_SIZE + 11] = 0.0; // padding
            });
            nodeOffset += blas.nodes.length;

            // pack triangle indices
            blas.triangleIndices.forEach((triangleIdx, i) => {
                triangleIdxArrayF32[triangleIdxOffset + i] = triangleIdx + triangleIdxOffset;
            })
            triangleIdxOffset += blas.triangleIndices.length;
        });

        // create blas gpu resources
        this.m_blasBuffer = IGPU.get().createBuffer({
            size: blasArrayF32.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        IGPU.get().queue.writeBuffer(this.m_blasBuffer, 0, blasArrayF32);

        this.m_triangleIdxBuffer = IGPU.get().createBuffer({
            size: triangleIdxArrayF32.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        IGPU.get().queue.writeBuffer(this.m_triangleIdxBuffer, 0, triangleIdxArrayF32);
    }
}

export { SceneDataManager };