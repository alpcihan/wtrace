import { Texture } from "../../wtrace";
import { MATERIAL_BYTE_SIZE, Material } from "../objects/material";
import { MeshModel } from "../objects/object-3d/mesh-model";
import { IGPU } from "../renderer/igpu";
import { BLASInstance, BLAS_INSTANCE_BYTE_SIZE } from "./acceleration-structure/blas-instance";
import { Mesh } from "../objects/mesh";
import { GBLAS } from "./acceleration-structure/gblas";
import { GTLAS } from "./acceleration-structure/gtlas";

class SceneDataManager {
    public constructor() 
    {
        this.m_meshes = new Array<Mesh>();
        this.m_meshCount = 0;
        this.m_meshIDSet = new Set<number>();
        this.m_meshNametoID = new Map<string, number>();
        
        this.m_indices  = new Uint32Array();
        this.m_points = new Float32Array();
        this.m_vertexInfo = new Float32Array();
        
        this.m_meshIndexOffsets = new Array<number>();
        this.m_currentIndexOffset = 0;
        this.m_meshVertexOffsets = new Array<number>();
        this.m_currentMeshVertexOffset = 0;
        
        this.m_meshIndexCounts = new Array<number>();
        
        this.m_models = new Array<MeshModel>();
        this.m_instanceCounts = new Array<number>();
        this.m_blasInstanceArray = new Array<BLASInstance>();
        this.m_currentMeshBlasOffset = 0;
        this.m_meshBlasOffsets = new Array<number>();

        this.m_materials = new Array<Material>();
        this.m_materialIDtoIdxMap = new Map<string, number>();

        this.m_textureCount = 0;
        this.m_textureIDtoIdxMap = new Map<string, number>();

        //TODO fix this
        const texDescriptor: GPUTextureDescriptor = {
            label: "material.texture",
            size: {
                width: 1024, // TODO: make it generic
                height: 1024, // TODO: make it generic
                depthOrArrayLayers: 50,
            },
            format: "rgba8unorm", // TODO: read from the texture
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        };

        this.m_textures = IGPU.get().createTexture(texDescriptor);
    }

    public get meshCount(): Readonly<number> {
        return this.m_meshCount;
    }

    public get indexCount(): Readonly<number> {
        return this.m_currentIndexOffset;
    }

    public get vertexBuffer(): Readonly<GPUBuffer> {
        return this.m_vertexBuffer;
    }

    public get meshIndexCounts(): Array<number> {
        return this.m_meshIndexCounts;
    }

    public get meshIndexOffsets(): Array<number> {
        return this.m_meshIndexOffsets;
    }

    public get meshVertexOffsets(): Array<number> {
        return this.m_meshVertexOffsets;
    }

    public get meshBlasOffsets(): Array<number> {
        return this.m_meshBlasOffsets;
    }
    
    public get normalBuffer(): Readonly<GPUBuffer> {
        return this.m_normalsBuffer;
    }

    public get uvBuffer(): Readonly<GPUBuffer> {
        return this.m_uvsBuffer;
    }

    public get indexBuffer(): Readonly<GPUBuffer> {
        return this.m_indexBuffer;
    }

    public get blasBuffer(): Readonly<GPUBuffer> {
        return this.m_blasBuffer;
    }

    public get blasInstanceBuffer(): Readonly<GPUBuffer> {
        return this.m_blasInstanceBuffer;
    }

    public get blasInstanceCount(): number {
        return this.m_blasInstanceArray.length;
    }

    public get materialBuffer(): Readonly<GPUBuffer> {
        return this.m_materialBuffer;
    }

    public get tlasBuffer(): Readonly<GPUBuffer> {
        return this.m_tlasBuffer;
    }

    public get textureView(): Readonly<GPUTextureView> {
        return this.m_textures.createView({
            format: this.m_textures.format,
            dimension: "2d-array",
            mipLevelCount: 1,
            arrayLayerCount: 50,
        });
    }

    public addMesh(mesh:Mesh) : number {
        let meshID:number|undefined = this.m_meshNametoID.get(mesh.id);
        if (meshID === undefined) {
            meshID = this.m_meshCount;
            this.m_meshIDSet.add(this.m_meshCount);
            this.m_meshNametoID.set(mesh.id, this.m_meshCount);
            this.m_meshCount++;

            this.m_meshBlasOffsets.push(this.m_currentMeshBlasOffset);
            this.m_meshVertexOffsets.push(this.m_currentMeshVertexOffset);
            this.m_meshIndexOffsets.push(this.m_currentIndexOffset);

            this.m_currentMeshVertexOffset += mesh.points.length;
            this.m_currentIndexOffset += mesh.indices.length;
            this.m_currentMeshBlasOffset += Math.max(0, 2*(mesh.indices.length/3)-1);
            
            this.m_meshIndexCounts.push(mesh.indices.length);
            this.m_instanceCounts.push(1);

            this.m_meshes.push(mesh);
        }
        else {
            this.m_instanceCounts[meshID] += 1;
        }

        return meshID;
    }

    public getMeshID(id:string): number|undefined {
        return this.m_meshNametoID.get(id);
    }

    public addTexture(texture:Texture) : number {
        let textureIdx = this.m_textureIDtoIdxMap.get(texture.id);

        if (textureIdx === undefined) {
            textureIdx = ++this.m_textureCount;
            IGPU.get().queue.copyExternalImageToTexture(
                { source: texture.data, flipY: false },
                { texture: this.m_textures, origin: { x: 0, y: 0, z: textureIdx } },
                { width: texture.data.width, height: texture.data.height, depthOrArrayLayers: 1 }
            );

            this.m_textureIDtoIdxMap.set(texture.id, textureIdx);
        }

        return textureIdx;
    }

    public getTextureID(id:string): number|undefined {
        return this.m_textureIDtoIdxMap.get(id);
    }

    public addMaterial(material:Material) : number {
        let materialIdx = this.m_materialIDtoIdxMap.get(material.id);
        if (materialIdx === undefined) {
            materialIdx = this.m_materials.length;
            this.m_materials.push(material);
            this.m_materialIDtoIdxMap.set(material.id, materialIdx);
        }

        return materialIdx;
    }

    public getMaterialID(id:string): number|undefined{
        return this.m_materialIDtoIdxMap.get(id);
    }

    public addModel(model: MeshModel) {
        this.m_models.push(model);
    }

    public buildSceneData() 
    {
        //create and upload blasInstance buffer
        {
            console.log("Objects to draw: ", this.m_models.length);

            //here we fill models in the correct places: 1st mesh object, 2nd mesh objects, ..., ...
            const exclusivePrefixSum: number[] = new Array(this.m_models.length);
            exclusivePrefixSum[0] = 0;
            for (let i = 1; i < this.m_models.length; i++) {
                exclusivePrefixSum[i] = exclusivePrefixSum[i - 1] + this.m_instanceCounts[i - 1];
            }

            this.m_models.forEach(model => {
                const meshIdx = model.meshID;   
                if(meshIdx === undefined) {
                    console.log("Trying to use a not-added mesh. Model will be ignored");
                    return;
                }

                const materialIdx = model.materialID;
                if(materialIdx === undefined) {
                    console.log("Trying to use a not-added material. Model will be ignored");
                    return;
                }

                //create blasInstance array
                const instance: BLASInstance = new BLASInstance(
                    model.transform,
                    this.m_meshBlasOffsets[model.meshID],
                    materialIdx
                );

                const instanceID = exclusivePrefixSum[model.meshID];
                this.m_blasInstanceArray[instanceID] = instance;
            });

            //create and upload the buffer
            const blasInstanceArrayByte: ArrayBuffer = new ArrayBuffer(
                BLAS_INSTANCE_BYTE_SIZE * this.m_models.length
            );
            this.m_blasInstanceArray.forEach((instance, i) => {
                instance.writeToArray(blasInstanceArrayByte, i * BLAS_INSTANCE_BYTE_SIZE);
            });
            this.m_blasInstanceBuffer = IGPU.createBuffer({
                size: blasInstanceArrayByte.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            IGPU.get().queue.writeBuffer(this.m_blasInstanceBuffer, 0, blasInstanceArrayByte);
        }

        //create mesh buffers
        {
            console.log("Triangles in scene: ", this.m_currentIndexOffset/3);
            console.log("Vertices in scene: ", this.m_currentMeshVertexOffset);

            this.m_indices = new Uint32Array(this.m_currentIndexOffset);
            this.m_points = new Float32Array(this.m_currentMeshVertexOffset);
            this.m_normals = new Float32Array(this.m_currentMeshVertexOffset);
            this.m_UVs = new Float32Array((this.m_currentMeshVertexOffset/9) * 6);

            for (let i = 0; i < this.m_meshes.length; i++) {
                const mesh = this.m_meshes[i];

                this.m_indices.set(mesh.indices, this.m_meshIndexOffsets[i]);
                this.m_points.set(mesh.points, this.m_meshVertexOffsets[i]);
                this.m_normals.set(mesh.normals, this.m_meshVertexOffsets[i]);
                this.m_UVs.set(mesh.uvs, (this.m_meshVertexOffsets[i]/9) * 6);
            }

            this.m_indexBuffer = IGPU.createBuffer({
                size: this.m_currentIndexOffset* 4, // 3 * u32
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            IGPU.get().queue.writeBuffer(this.m_indexBuffer, 0, this.m_indices);
            
            this.m_vertexBuffer = IGPU.createBuffer({
                size: this.m_currentMeshVertexOffset * 4, //f32
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            IGPU.get().queue.writeBuffer(this.m_vertexBuffer, 0, this.m_points);

            this.m_normalsBuffer = IGPU.createBuffer({
                size: this.m_currentMeshVertexOffset * 4, //f32
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            IGPU.get().queue.writeBuffer(this.m_normalsBuffer, 0, this.m_normals);

            this.m_uvsBuffer = IGPU.createBuffer({
                size: this.m_currentMeshVertexOffset/9 * 6 * 4, //f32
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            IGPU.get().queue.writeBuffer(this.m_uvsBuffer, 0, this.m_UVs);

            this.m_vertexInfoBuffer = IGPU.createBuffer({
                size: 0,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
            });
            IGPU.get().queue.writeBuffer(this.m_vertexInfoBuffer, 0, this.m_vertexInfo);
        }

        this.m_blasBuffer = GBLAS.buildBlasBuffer(this);
        this.m_tlasBuffer = GTLAS.buildTlasBuffer(this);

        this._updateMaterialBuffer();
        this._updateTextures();
    }

    public clear() {
        this.m_meshes = new Array();
        this.m_meshCount = 0
        this.m_meshIDSet.clear();
        this.m_meshNametoID.clear();
        
        this.m_indices = new Uint32Array();
        this.m_points = new Float32Array();
        this.m_vertexInfo = new Float32Array();
        
        this.m_meshIndexOffsets = new Array()
        this.m_currentIndexOffset = 0;
        this.m_meshVertexOffsets = new Array();
        this.m_currentMeshVertexOffset = 0;
        
        this.m_meshIndexCounts= new Array();
        
        this.m_models = new Array();
        this.m_instanceCounts = new Array();
        this.m_blasInstanceArray = new Array();
        this.m_currentMeshBlasOffset = 0;
        this.m_meshBlasOffsets = new Array();

        this.m_materials = new Array();
        this.m_materialIDtoIdxMap = new Map<string, number>();
        this.m_materialBuffer.destroy();
        
        this.m_textures.destroy();
        this.m_textureCount = 0;
        this.m_textureIDtoIdxMap= new Map<string, number>();
        
        this.m_indexBuffer.destroy();
        this.m_vertexBuffer.destroy();
        this.m_vertexInfoBuffer.destroy();
        
        this.m_blasBuffer.destroy();
        this.m_blasInstanceBuffer.destroy();
        this.m_tlasBuffer.destroy();
    }

    //meshes
    private m_meshes: Array<Mesh>;
    private m_meshCount: number;
    private m_meshIDSet: Set<number>;
    private m_meshNametoID: Map<string, number>;
    
    private m_indices : Uint32Array;
    private m_points: Float32Array;
    private m_normals: Float32Array;
    private m_UVs: Float32Array;
    private m_vertexInfo: Float32Array; //normals and uvs
    
    private m_meshIndexOffsets: Array<number>;
    private m_currentIndexOffset: number;
    private m_meshVertexOffsets: Array<number>;
    private m_currentMeshVertexOffset: number;
    
    private m_meshIndexCounts: Array<number>;
    
    //instances
    private m_models: Array<MeshModel>;
    private m_instanceCounts: Array<number>;
    private m_blasInstanceArray: Array<BLASInstance>;
    private m_currentMeshBlasOffset: number;
    private m_meshBlasOffsets: Array<number>;

    //materials
    private m_materials: Array<Material>;
    private m_materialIDtoIdxMap: Map<string, number>;
    private m_materialBuffer: GPUBuffer;
    
    //textures
    private m_textures: GPUTexture;
    private m_textureCount: number;
    private m_textureIDtoIdxMap: Map<string, number>;
    
    //gpu buffers
    private m_indexBuffer: GPUBuffer;
    private m_vertexBuffer: GPUBuffer;
    private m_normalsBuffer: GPUBuffer;
    private m_uvsBuffer: GPUBuffer;
    private m_vertexInfoBuffer: GPUBuffer;
    
    //blas buffers
    private m_blasBuffer: GPUBuffer;
    private m_blasInstanceBuffer: GPUBuffer;
    private m_tlasBuffer: GPUBuffer;
    
    private _updateMaterialBuffer(): void {
        const materialArrayByte: ArrayBuffer = new ArrayBuffer(
            MATERIAL_BYTE_SIZE * this.m_materials.length
        );

        this.m_materials.forEach((material, i) => {
            material.writeToArray(materialArrayByte, MATERIAL_BYTE_SIZE * i, {
                albedoMapIdx: material.albedoMapID !== undefined ? material.albedoMapID : -1,
                emissiveMapIdx: material.emissiveMapID !== undefined ? material.emissiveMapID : -1,
                roughnessMapIdx: material.roughnessMapID !== undefined ? material.roughnessMapID : -1,
                metallicMapIdx: material.metallicMapID !== undefined ? material.metallicMapID : -1,
            });
        });

        this.m_materialBuffer = IGPU.createBuffer({
            size: materialArrayByte.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        IGPU.get().queue.writeBuffer(this.m_materialBuffer, 0, materialArrayByte);
    }

    private _updateTextures(): void {
        // const texDescriptor: GPUTextureDescriptor = {
        //     label: "material.texture",
        //     size: {
        //         width: 1024, // TODO: make it generic
        //         height: 1024, // TODO: make it generic
        //         depthOrArrayLayers: this.m_totalMapCount,
        //     },
        //     format: "rgba8unorm", // TODO: read from the texture
        //     usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        // };

        // this.m_texture = IGPU.get().createTexture(texDescriptor);

        // let textureCount: number = 1;
        // //NOTE: Texture copy order matters rn due to the use of total map count.
        // //TODO: Store texture indices.
        // this.m_materials.forEach(mat => {
        //     const albedoTex: Texture | undefined = mat.albedoMap;
        //     if (albedoTex) {
        //         IGPU.get().queue.copyExternalImageToTexture(
        //             { source: albedoTex.data, flipY: false },
        //             { texture: this.m_texture, origin: { x: 0, y: 0, z: textureCount++ } },
        //             { width: albedoTex.data.width, height: albedoTex.data.height, depthOrArrayLayers: 1 }
        //         );
        //     }

        //     const metallicTex: Texture | undefined = mat.metallicMap;
        //     if(metallicTex) {
        //         IGPU.get().queue.copyExternalImageToTexture(
        //             { source: metallicTex.data, flipY: false },
        //             { texture: this.m_texture, origin: { x: 0, y: 0, z: textureCount++ } },
        //             { width: metallicTex.data.width, height: metallicTex.data.height, depthOrArrayLayers: 1 }
        //         );
        //     }
        // });
    }
}

export { SceneDataManager };
