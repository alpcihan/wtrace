import * as THREE from "three";
import { MeshModel } from "../objects/model/mesh-model";
import { IGPU } from "../renderer/igpu";
import { BVH } from "./bvh/bvh";

class SceneDataManager {
    public constructor() {
        this.m_models = new Array<MeshModel>();
        this.m_vertices = new Float32Array();
        this.m_bvhNodeCount = 0;
        this.m_BVHs = new Array<BVH>();
        this._updateVertexBuffer();
    }

    public addModel(model: MeshModel) {
        this.m_models.push(model);
    }

    public buildSceneData() { // TODO: add build check
        this.m_models.forEach(model => {
            // add vertices
            this.m_vertices = new Float32Array([...this.m_vertices, ...model.mesh.vertices]);

            // create bvh
            const bvh: BVH = new BVH(new THREE.Matrix4, model.mesh.vertices);
            bvh.build();
            this.m_bvhNodeCount += bvh.nodes.length;
            this.m_BVHs.push(bvh);
        });

        this._updateVertexBuffer();
        this._updateBVHBuffers();
    }

    public get vertexBuffer(): GPUBuffer {
        return this.m_vertexBuffer;
    }

    public get BVHBuffer(): GPUBuffer {
        return this.m_BVHBuffer;
    }

    public get triangleIdxBuffer(): GPUBuffer {
        return this.m_triangleIdxBuffer;
    }

    private m_vertices: Float32Array;
    private m_vertexBuffer: GPUBuffer;
    private m_models: Array<MeshModel>;
    
    private m_BVHs: Array<BVH>;
    private m_bvhNodeCount: number; // total node count
    private m_BVHBuffer: GPUBuffer; // bvh array
    private m_triangleIdxBuffer: GPUBuffer;

    private _updateVertexBuffer(): void {
        this.m_vertexBuffer = IGPU.get().createBuffer({
            size: this.m_vertices.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_vertexBuffer, 0, this.m_vertices);
    }
    
    private _updateBVHBuffers(): void {
        // pack bvh data
        const BVHArr: Float32Array = new Float32Array(this.m_bvhNodeCount * BVH.nodeSize);
        const triangleIdxArr: Uint32Array = new Uint32Array((this.m_vertices.length / 9) * 4);

        let nodeOffset: number = 0;
        let triangleIdxOffset: number = 0;
        this.m_BVHs.forEach(bvh => {
            // pack nodes
            bvh.nodes.forEach((node, i) => {
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 0] = node.leftFirst;
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 1] = node.triangleCount;
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 2] = 0.0; // padding
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 3] = 0.0; // padding
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 4] = node.aabb.min.x;
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 5] = node.aabb.min.y;
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 6] = node.aabb.min.z;
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 7] = 0.0; // padding
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 8] = node.aabb.max.x;
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 9] = node.aabb.max.y;
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 10] = node.aabb.max.z;
                BVHArr[(nodeOffset + i) * BVH.nodeSize + 11] = 0.0; // padding
            });
            nodeOffset += bvh.nodes.length;

            // pack triangle indices
            bvh.triangleIndices.forEach((triangleIdx, i) => {
                triangleIdxArr[triangleIdxOffset + i] = triangleIdx + triangleIdxOffset;
            })
            triangleIdxOffset += bvh.triangleIndices.length;
        });

        // create bvh gpu resources
        this.m_BVHBuffer = IGPU.get().createBuffer({
            size: BVHArr.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        IGPU.get().queue.writeBuffer(this.m_BVHBuffer, 0, BVHArr);

        this.m_triangleIdxBuffer = IGPU.get().createBuffer({
            size: triangleIdxArr.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        IGPU.get().queue.writeBuffer(this.m_triangleIdxBuffer, 0, triangleIdxArr);
    }
}

export { SceneDataManager };