import { MeshModel } from "../objects/model/mesh-model";
import { IGPU } from "../renderer/igpu";
import { BLAS, BLAS_NODE_SIZE } from "./acceleration-structure/blas";
import { BLASInstance, BLAS_INSTANCE_BYTE_SIZE } from "./acceleration-structure/blas-instance";

class SceneDataManager {
    public constructor() {
        this.m_models = new Array<MeshModel>();
        this.m_points = new Float32Array();
        this.m_blasNodeCount = 0;
        this.m_blasArray = new Array<BLAS>();
        this.m_blasInstanceArray = new Array<BLASInstance>();

        this._updateVertexBuffer();
    }

    public get vertexBuffer(): Readonly<GPUBuffer> {
        return this.m_vertexBuffer;
    }

    public get triangleIdxBuffer(): Readonly<GPUBuffer> {
        return this.m_triangleIdxBuffer;
    }

    public get blasBuffer(): Readonly<GPUBuffer> {
        return this.m_blasBuffer;
    }

    public get blasInstanceBuffer(): Readonly<GPUBuffer> {
        return this.m_blasInstanceBuffer;
    }

    public addModel(model: MeshModel) {
        this.m_models.push(model);
    }
 
    public buildSceneData() { // TODO: add build check
        this.m_models.forEach(model => {
            // add points
            this.m_points = new Float32Array([...this.m_points, ...model.mesh.points]);

            // add instance data
            const instance: BLASInstance = new BLASInstance(model.transform, this.m_blasNodeCount);
            this.m_blasInstanceArray.push(instance);
            
            // add blas
            const blas: BLAS = new BLAS(model.mesh.points);
            this.m_blasArray.push(blas);
            this.m_blasNodeCount += blas.nodes.length;
        });

        this._updateVertexBuffer();
        this._updateBLASBuffers();
    }

    private m_points: Float32Array;
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
            size: this.m_points.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_vertexBuffer, 0, this.m_points);
    }

    private _updateBLASBuffers(): void {
        // init arrays
        const blasArrayF32: Float32Array = new Float32Array(this.m_blasNodeCount * BLAS_NODE_SIZE);
        const triangleIdxArrayU32: Uint32Array = new Uint32Array((this.m_points.length / 9));
        const blasInstanceArrayByte: ArrayBuffer = new ArrayBuffer(BLAS_INSTANCE_BYTE_SIZE * this.m_blasInstanceArray.length); 
        
        // pack blas node and triangle index data   
        let blasNodeOffset: number = 0;
        let triangleIdxOffset: number = 0;
        this.m_blasArray.forEach(blas => {
            blas.writeNodesToArray(blasArrayF32.subarray(blasNodeOffset * BLAS_NODE_SIZE), blasNodeOffset, triangleIdxOffset);
            blasNodeOffset += blas.nodes.length;

            blas.writeTriangleIndicesToArray(triangleIdxArrayU32.subarray(triangleIdxOffset), triangleIdxOffset);
            triangleIdxOffset += blas.triangleIndices.length;
        });
        
        // pack blas instance data
        let blasInstanceByteOffset: number = 0;
        this.m_blasInstanceArray.forEach(instance => {
            instance.writeToArray(blasInstanceArrayByte, blasInstanceByteOffset);
            blasInstanceByteOffset += BLAS_INSTANCE_BYTE_SIZE;
        });       

        // create gpu resources
        this.m_blasBuffer = IGPU.get().createBuffer({
            size: blasArrayF32.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        IGPU.get().queue.writeBuffer(this.m_blasBuffer, 0, blasArrayF32);
        
        this.m_triangleIdxBuffer = IGPU.get().createBuffer({
            size: triangleIdxArrayU32.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        IGPU.get().queue.writeBuffer(this.m_triangleIdxBuffer, 0, triangleIdxArrayU32);
        
        this.m_blasInstanceBuffer = IGPU.get().createBuffer({
            size: blasInstanceArrayByte.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_blasInstanceBuffer, 0, blasInstanceArrayByte);
    }
}

export { SceneDataManager };
