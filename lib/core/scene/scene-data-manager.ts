import * as THREE from "three";
import { MeshModel } from "../objects/model/mesh-model";
import { IGPU } from "../renderer/igpu";
import { BLAS, BLAS_NODE_SIZE } from "./acceleration-structure/blas";
import { BLASInstance, BLAS_INSTANCE_GPU_BYTE_SIZE } from "./acceleration-structure/blas-instance";

class SceneDataManager {
    public constructor() {
        this.m_models = new Array<MeshModel>();
        this.m_vertices = new Float32Array();
        this.m_blasNodeCount = 0;
        this.m_blasArray = new Array<BLAS>();
        this.m_blasInstanceArray = new Array<BLASInstance>();

        this._updateVertexBuffer();
    }

    public addModel(model: MeshModel) {
        this.m_models.push(model);
    }

    public buildSceneData() {
        // TODO: add build check
        this.m_models.forEach(model => {
            // add vertices
            this.m_vertices = new Float32Array([...this.m_vertices, ...model.mesh.vertices]);

            // create instance data
            this.m_blasInstanceArray.push({
                transform: model.transform,
                invTransform: model.invTransform,
                blasOffset: this.m_blasNodeCount
            });

            // create blas
            const blas: BLAS = new BLAS(model.mesh.vertices);
            blas.build();
            this.m_blasArray.push(blas);
            this.m_blasNodeCount += blas.nodes.length;
        });

        this._updateVertexBuffer();
        this._updateBLASBuffers();
    }

    public get vertexBuffer(): GPUBuffer {
        return this.m_vertexBuffer;
    }

    public get triangleIdxBuffer(): GPUBuffer {
        return this.m_triangleIdxBuffer;
    }

    public get blasBuffer(): GPUBuffer {
        return this.m_blasBuffer;
    }

    public get blasInstanceBuffer(): GPUBuffer {
        return this.m_blasInstanceBuffer;
    }

    private m_vertices: Float32Array;
    private m_models: Array<MeshModel>;
    private m_blasArray: Array<BLAS>;
    private m_blasNodeCount: number; // total node count
    private m_blasInstanceArray: Array<BLASInstance>;

    private m_vertexBuffer: GPUBuffer;
    private m_triangleIdxBuffer: GPUBuffer;
    private m_blasInstanceBuffer: GPUBuffer;
    private m_blasBuffer: GPUBuffer; // blas array

    private _updateVertexBuffer(): void {
        this.m_vertexBuffer = IGPU.get().createBuffer({
            size: this.m_vertices.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_vertexBuffer, 0, this.m_vertices);
    }

    private _updateBLASBuffers(): void {
        // init arrays
        const blasArrayF32: Float32Array = new Float32Array(this.m_blasNodeCount * BLAS_NODE_SIZE);
        const triangleIdxArrayF32: Uint32Array = new Uint32Array((this.m_vertices.length / 9) * 4);
        const blasInstanceArrayByte: ArrayBuffer = new ArrayBuffer(BLAS_INSTANCE_GPU_BYTE_SIZE * this.m_blasInstanceArray.length); 

        // pack blas node and triangle index data
        {
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
                });
                triangleIdxOffset += blas.triangleIndices.length;
            });
        }

        // pack blas instance data
        {
            let byteOffset: number = 0;
            this.m_blasInstanceArray.forEach(instance => {
                // allocate
                const blasInstanceTransformArrayF32: Float32Array = new Float32Array(blasInstanceArrayByte, byteOffset, 16); byteOffset += 64;
                const blasInstanceInvTransformArrayF32: Float32Array = new Float32Array(blasInstanceArrayByte, byteOffset, 16); byteOffset += 64;
                const blasInstanceBlasOffsetArrayU32: Uint32Array = new Uint32Array(blasInstanceArrayByte, byteOffset, 4); byteOffset += 16;
                
                // copy
                blasInstanceTransformArrayF32.set(instance.transform.toArray());
                blasInstanceInvTransformArrayF32.set(instance.invTransform.toArray());
                blasInstanceBlasOffsetArrayU32.set([instance.blasOffset]);
            });     
        }   

        // create gpu resources
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

        this.m_blasInstanceBuffer = IGPU.get().createBuffer({
            size: blasInstanceArrayByte.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        IGPU.get().queue.writeBuffer(this.m_blasInstanceBuffer, 0, blasInstanceArrayByte);
    }
}

export { SceneDataManager };
