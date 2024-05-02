import { Texture } from "../../wtrace";
import { MATERIAL_BYTE_SIZE, Material } from "../objects/material";
import { MeshModel } from "../objects/object-3d/mesh-model";
import { IGPU } from "../renderer/igpu";
import { BLAS, BLAS_NODE_SIZE } from "./acceleration-structure/blas";
import { BLASInstance, BLAS_INSTANCE_BYTE_SIZE } from "./acceleration-structure/blas-instance";
import { TLAS, TLAS_NODE_SIZE } from "./acceleration-structure/tlas";

class SceneDataManager {
    public constructor() {
        this.m_models = new Array<MeshModel>();

        this.m_points = new Float32Array();
        this.m_vertexInfo = new Float32Array();

        this.m_blasNodeCount = 0;
        this.m_blasArray = new Array<BLAS>();
        this.m_blasInstanceArray = new Array<BLASInstance>();

        this.m_materials = new Array<Material>();
        this.m_materialIDtoIdxMap = new Map<number, number>();
        this.m_meshIDtoBlasOffsetMap = new Map<number, number>();
        this.m_blasOffsetToMeshIDMap = new Map<number, number>();

        this.m_totalMapCount = 0;

        this._updateVertexBuffer();
    }

    public get vertexBuffer(): Readonly<GPUBuffer> {
        return this.m_vertexBuffer;
    }

    public get vertexInfoBuffer(): Readonly<GPUBuffer> {
        return this.m_vertexInfoBuffer;
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

    public get materialBuffer(): Readonly<GPUBuffer> {
        return this.m_materialBuffer;
    }

    public get tlasBuffer(): Readonly<GPUBuffer>{
        return this.m_tlasBuffer;
    }

    public get textureView(): Readonly<GPUTextureView> {
        return this.m_texture.createView({
            format: this.m_texture.format,
            dimension: "2d-array",
            mipLevelCount: 1,
            arrayLayerCount: this.m_totalMapCount,
        });
    }

    public addModel(model: MeshModel) {
        this.m_models.push(model);
    }

    public buildSceneData() {
        // TODO: add build check
        this.m_models.forEach(model => {
            let blasNodeOffset: number = this.m_blasNodeCount;

            // add mesh
            if (this.m_meshIDtoBlasOffsetMap.has(model.mesh.id)) {
                // if the mesh already created -> GET its index
                blasNodeOffset = this.m_meshIDtoBlasOffsetMap.get(model.mesh.id) as number;
            } else {
                // if the mesh is not created -> create and SET its index
                // add vertex data
                this.m_points = new Float32Array([...this.m_points, ...model.mesh.points]);

                let numberOfVertices = model.mesh.points.length / 3;
                let newVertexInfo = new Float32Array(numberOfVertices * 8); // 3 normals, 2 uvs, 3 padding
                for (let i = 0; i < numberOfVertices; i++) {
                    newVertexInfo[i * 8 + 0] = model.mesh.normals[i * 3 + 0];
                    newVertexInfo[i * 8 + 1] = model.mesh.normals[i * 3 + 1];
                    newVertexInfo[i * 8 + 2] = model.mesh.normals[i * 3 + 2];
                    newVertexInfo[i * 8 + 3] = 0; // padding
                    newVertexInfo[i * 8 + 4] = model.mesh.uvs[i * 2 + 0];
                    newVertexInfo[i * 8 + 5] = model.mesh.uvs[i * 2 + 1];
                    newVertexInfo[i * 8 + 6] = 0; // padding
                    newVertexInfo[i * 8 + 7] = 0; // padding
                }
                this.m_vertexInfo = new Float32Array([...this.m_vertexInfo, ...newVertexInfo]);

                // add blas
                const blas: BLAS = new BLAS(model.mesh.points);
                this.m_blasArray.push(blas);
                this.m_blasNodeCount += blas.nodes.length;

                this.m_meshIDtoBlasOffsetMap.set(model.mesh.id, blasNodeOffset);
                this.m_blasOffsetToMeshIDMap.set(blasNodeOffset, model.mesh.id);
            }

            // add material
            let materialIdx: number | undefined = this.m_materialIDtoIdxMap.get(model.material.id);
            if (materialIdx === undefined) {
                // material
                materialIdx = this.m_materials.length;
                this.m_materials.push(model.material);
                this.m_materialIDtoIdxMap.set(model.material.id, materialIdx);
            }

            // add instance data
            const instance: BLASInstance = new BLASInstance(
                model.transform,
                blasNodeOffset,
                materialIdx
            );
            this.m_blasInstanceArray.push(instance);
        });
        
        this._updateVertexBuffer();
        this._updateBLASBuffers();
        this._updateMaterialBuffer();
        this._updateTextures();

        this.m_tlas = new TLAS(this.m_blasArray, this.m_blasInstanceArray, this.m_blasOffsetToMeshIDMap);
        this._updateTLASBuffer();
    }

    private m_points: Float32Array;
    private m_vertexInfo: Float32Array; //normals and uvs

    private m_models: Array<MeshModel>;
    private m_blasArray: Array<BLAS>;
    private m_blasNodeCount: number; // total node count
    private m_blasInstanceArray: Array<BLASInstance>;
    private m_tlas: TLAS;

    private m_materials: Array<Material>;
    private m_totalMapCount: number;

    private m_materialIDtoIdxMap: Map<number, number>;
    private m_meshIDtoBlasOffsetMap: Map<number, number>;
    private m_blasOffsetToMeshIDMap: Map<number, number>;

    private m_vertexBuffer: GPUBuffer;
    private m_vertexInfoBuffer: GPUBuffer;

    private m_triangleIdxBuffer: GPUBuffer;
    private m_blasInstanceBuffer: GPUBuffer;
    private m_blasBuffer: GPUBuffer; // blas array
    private m_tlasBuffer: GPUBuffer; // tlas array
    private m_materialBuffer: GPUBuffer;
    private m_texture: GPUTexture;

    private _updateVertexBuffer(): void {
        this.m_vertexBuffer = IGPU.get().createBuffer({
            size: this.m_points.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        this.m_vertexInfoBuffer = IGPU.get().createBuffer({
            size: this.m_vertexInfo.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_vertexBuffer, 0, this.m_points);
        IGPU.get().queue.writeBuffer(this.m_vertexInfoBuffer, 0, this.m_vertexInfo);
    }

    private _updateBLASBuffers(): void {
        // init arrays
        const blasArrayF32: Float32Array = new Float32Array(this.m_blasNodeCount * BLAS_NODE_SIZE);
        const triangleIdxArrayU32: Uint32Array = new Uint32Array(this.m_points.length / 9);
        const blasInstanceArrayByte: ArrayBuffer = new ArrayBuffer(
            BLAS_INSTANCE_BYTE_SIZE * this.m_blasInstanceArray.length
        );

        // pack blas node and triangle index data
        let blasNodeOffset: number = 0;
        let triangleIdxOffset: number = 0;
        this.m_blasArray.forEach(blas => {
            blas.writeNodesToArray(blasArrayF32, blasNodeOffset, triangleIdxOffset);
            blasNodeOffset += blas.nodes.length;

            blas.writeTriangleIndicesToArray(triangleIdxArrayU32, triangleIdxOffset);
            triangleIdxOffset += blas.triangleIndices.length;
        });

        // pack blas instance data
        this.m_blasInstanceArray.forEach((instance, i) => {
            instance.writeToArray(blasInstanceArrayByte, i * BLAS_INSTANCE_BYTE_SIZE);
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

    private _updateMaterialBuffer(): void {
        const materialArrayByte: ArrayBuffer = new ArrayBuffer(
            MATERIAL_BYTE_SIZE * this.m_materials.length
        );

        this.m_materials.forEach((material, i) => {
            material.writeToArray(materialArrayByte, MATERIAL_BYTE_SIZE * i, {
                albedoMapIdx: material.albedoMap !== undefined ? this.m_totalMapCount++ : -1,
                emissiveMapIdx: material.emissiveMap !== undefined ? this.m_totalMapCount++ : -1,
                roughnessMapIdx: material.roughnessMap !== undefined ? this.m_totalMapCount++ : -1,
                metallicMapIdx: material.metallicMap !== undefined ? this.m_totalMapCount++ : -1,
            });
        });

        this.m_materialBuffer = IGPU.get().createBuffer({
            size: materialArrayByte.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_materialBuffer, 0, materialArrayByte);
    }

    private _updateTLASBuffer(): void{
        let arraySize = TLAS_NODE_SIZE*(this.m_blasInstanceArray.length*2);
        const tlasArrayByte: ArrayBuffer = new ArrayBuffer(arraySize);
        this.m_tlas.writeNodesToArray(tlasArrayByte);

        this.m_tlasBuffer = IGPU.get().createBuffer({
            size: arraySize,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_tlasBuffer, 0, tlasArrayByte);
    }

    private _updateTextures(): void {
        const texDescriptor: GPUTextureDescriptor = {
            label: "material.texture",
            size: {
                width: 1024, // TODO: make it generic
                height: 1024, // TODO: make it generic
                depthOrArrayLayers: this.m_totalMapCount,
            },
            format: "rgba8unorm", // TODO: read from the texture
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        };

        this.m_texture = IGPU.get().createTexture(texDescriptor);

        let textureCount: number = 0;
        // NOTE: Texture copy order matters rn due to the use of total map count.
        // TODO: Store texture indices.
        this.m_materials.forEach(mat => {
            const albedoTex: Texture | undefined = mat.albedoMap;
            if (albedoTex) {
                IGPU.get().queue.copyExternalImageToTexture(
                    { source: albedoTex.data, flipY: false },
                    { texture: this.m_texture, origin: { x: 0, y: 0, z: textureCount++ } },
                    { width: albedoTex.data.width, height: albedoTex.data.height, depthOrArrayLayers: 1 }
                );
            }

            const metallicTex: Texture | undefined = mat.metallicMap;
            if(metallicTex) {
                IGPU.get().queue.copyExternalImageToTexture(
                    { source: metallicTex.data, flipY: false },
                    { texture: this.m_texture, origin: { x: 0, y: 0, z: textureCount++ } },
                    { width: metallicTex.data.width, height: metallicTex.data.height, depthOrArrayLayers: 1 }
                );
            }
        });

    }
}

export { SceneDataManager };
