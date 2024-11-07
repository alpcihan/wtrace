import { IGPU } from "../../renderer/igpu";
import { SceneDataManager } from "../scene-data-manager";

import structs_compute from "../../../shaders/blasConstruction/structs.wgsl"
import objBBCal_compute from "../../../shaders/blasConstruction/objBBCal_compute.wgsl"
import objMortonGen_compute from "../../../shaders/blasConstruction/objMortonGen_compute.wgsl"
import radixSortHistogram_compute from "../../../shaders/blasConstruction/radixSortHistogram_compute.wgsl";
import radixSortPrefixReorder_compute from "../../../shaders/blasConstruction/radixSortPrefixReorder_compute.wgsl";
import blasGen_compute from "../../../shaders/blasConstruction/blasGen_compute.wgsl"
import blasBBCal_compute from "../../../shaders/blasConstruction/blasBBCal_compute.wgsl"

class GBLAS {
    private constructor() {}

    static buildBlasBuffer(dataManager:SceneDataManager): GPUBuffer
    {
        //output buffer
        //blas buffer for leafs and internal nodes. 2N-1 nodes are needed for each triangle in the scene
        let blasBuffer: GPUBuffer = IGPU.createBuffer({
            size: Math.max(0, (dataManager.indexCount/3 * 2)-1) * (12 * 4), //20 * f32
            usage: GPUBufferUsage.STORAGE,
        });

        if (!GBLAS.m_objBBCalPipeline) {
            GBLAS._initialize();
        }

        const meshIndexCountMax = dataManager.meshIndexCounts.reduce((max, value) => Math.max(max, value), 0);
        GBLAS._createTempBuffers(meshIndexCountMax/3);
        
        //build a blas for each mesh
        for (let i = 0; i < dataManager.meshCount; i++) 
        {
            let triCount:number = dataManager.meshIndexCounts[i]/3;
            let posOffset:number = dataManager.meshVertexOffsets[i];
            let blasOffset:number = dataManager.meshBlasOffsets[i];
            let indexOffset:number = dataManager.meshIndexOffsets[i];

            this._updateUniform(triCount, indexOffset, posOffset, blasOffset);

            //bind data needed by shader
            {
                GBLAS.m_objBBCalPipelineBindGroup = IGPU.get().createBindGroup({
                    layout: GBLAS.m_objBBCalBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GBLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: dataManager.indexBuffer},
                        },
                        {
                            binding: 2,
                            resource: { buffer: dataManager.vertexBuffer},
                        },
                        {
                            binding: 3,
                            resource: { buffer: this.m_bbBuffer },
                        }
                    ],
                });

                GBLAS.m_objMortonGenPipelineBindGroup = IGPU.get().createBindGroup({
                    layout: GBLAS.m_objMortonGenBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GBLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: this.m_bbBuffer },
                        },
                        {
                            binding: 2,
                            resource: { buffer: this.m_mortonInOutBuffer },
                        }
                    ],
                });

                for (let i = 0; i < 2; i++) {
                    const mortonInBuffer = i%2 ? this.m_tempMortonBuffer:this.m_mortonInOutBuffer;
                    const mortonOutBuffer = i%2 ? this.m_mortonInOutBuffer:this.m_tempMortonBuffer;
                    
                    const sortMapInBuffer = i%2 ? this.m_tempSortMapBuffer:this.m_sortMapInOutBuffer;
                    const sortMapOutBuffer = i%2 ? this.m_sortMapInOutBuffer:this.m_tempSortMapBuffer;

                    GBLAS.m_radixSortHistogramPipelineBindGroup[i] = IGPU.get().createBindGroup({
                        layout: GBLAS.m_radixSortHistogramBindGroupLayout,
                        entries: [
                            {
                                binding: 0,
                                resource: { buffer: GBLAS.m_uniformBuffer },
                            },
                            {
                                binding: 1,
                                resource: { buffer: this.m_histogramsBuffer },
                            },
                            {
                                binding: 2,
                                resource: { buffer: mortonInBuffer },
                            }
                        ],
                    });
    
                    GBLAS.m_radixSortPrefixReorderPipelineBindGroup[i] = IGPU.get().createBindGroup({
                        layout: GBLAS.m_radixSortPrefixReorderBindGroupLayout,
                        entries: [
                            {
                                binding: 0,
                                resource: { buffer: GBLAS.m_uniformBuffer },
                            },
                            {
                                binding: 1,
                                resource: { buffer: this.m_histogramsBuffer },
                            },
                            {
                                binding: 2,
                                resource: { buffer: mortonInBuffer },
                            },
                            {
                                binding: 3,
                                resource: { buffer: mortonOutBuffer },
                            },
                            {
                                binding: 4,
                                resource: { buffer: sortMapInBuffer },
                            },
                            {
                                binding: 5,
                                resource: { buffer: sortMapOutBuffer },
                            }
                        ],
                    });                 
                }

                GBLAS.m_blasGenPipelineBindGroup = IGPU.get().createBindGroup({
                    layout: GBLAS.m_blasGenBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GBLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: this.m_sortMapInOutBuffer },
                        },
                        {
                            binding: 2,
                            resource: { buffer: this.m_mortonInOutBuffer },
                        },
                        {
                            binding: 3,
                            resource: { buffer: this.m_bbBuffer },
                        },
                        {
                            binding: 4,
                            resource: { buffer: blasBuffer},
                        },
                        {
                            binding: 5,
                            resource: { buffer: this.m_blasConstructionBuffer },
                        }
                    ],
                });

                GBLAS.m_blasBBCalPipelineBindGroup = IGPU.get().createBindGroup({
                    layout: GBLAS.m_blasBBCalBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GBLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: blasBuffer},
                        },
                        {
                            binding: 2,
                            resource: { buffer: this.m_blasConstructionBuffer },
                        }
                    ],
                });
            }

            //passes
            {
                const cmd: GPUCommandEncoder = IGPU.get().createCommandEncoder();

                const objBBCalPass: GPUComputePassEncoder = cmd.beginComputePass();
                objBBCalPass.setPipeline(GBLAS.m_objBBCalPipeline);
                objBBCalPass.setBindGroup(0, GBLAS.m_objBBCalPipelineBindGroup);
                objBBCalPass.dispatchWorkgroups(1, 1, 1);
                objBBCalPass.end();

                const objMortonGen: GPUComputePassEncoder = cmd.beginComputePass();
                objMortonGen.setPipeline(GBLAS.m_objMortonGenPipeline);
                objMortonGen.setBindGroup(0, GBLAS.m_objMortonGenPipelineBindGroup);
                var dispatchCount = Math.ceil(triCount/16); //WG is 16
                objMortonGen.dispatchWorkgroups(dispatchCount, 1, 1);
                objMortonGen.end();

                for(let i = 0; i < 8; i++)
                {                
                    const radixSortHistogramPass: GPUComputePassEncoder = cmd.beginComputePass();
                    radixSortHistogramPass.setPipeline(GBLAS.m_radixSortHistogramPipeline);
                    radixSortHistogramPass.setBindGroup(0, GBLAS.m_radixSortHistogramPipelineBindGroup[i%2]);
                    radixSortHistogramPass.setBindGroup(1, GBLAS.m_shiftUnifromPipelineBindGroup[i]);
                    dispatchCount = Math.ceil(triCount/16);
                    radixSortHistogramPass.dispatchWorkgroups(dispatchCount, 1, 1);
                    radixSortHistogramPass.end();

                    const radixSortPrefixReorderPass: GPUComputePassEncoder = cmd.beginComputePass();
                    radixSortPrefixReorderPass.setPipeline(GBLAS.m_radixSortPrefixReorderPipeline);
                    radixSortPrefixReorderPass.setBindGroup(0, GBLAS.m_radixSortPrefixReorderPipelineBindGroup[i%2]);
                    radixSortPrefixReorderPass.setBindGroup(1, GBLAS.m_shiftUnifromPipelineBindGroup[i]);
                    dispatchCount = Math.ceil(triCount/16);
                    radixSortPrefixReorderPass.dispatchWorkgroups(dispatchCount, 1, 1);
                    radixSortPrefixReorderPass.end();
                }

                const blasGenPass: GPUComputePassEncoder = cmd.beginComputePass();
                blasGenPass.setPipeline(GBLAS.m_blasGenPipeline);
                blasGenPass.setBindGroup(0, GBLAS.m_blasGenPipelineBindGroup);
                dispatchCount = Math.ceil(triCount/16);
                blasGenPass.dispatchWorkgroups(dispatchCount, 1, 1);
                blasGenPass.end();

                const blasBBCalPass: GPUComputePassEncoder = cmd.beginComputePass();
                blasBBCalPass.setPipeline(GBLAS.m_blasBBCalPipeline);
                blasBBCalPass.setBindGroup(0, GBLAS.m_blasBBCalPipelineBindGroup);
                dispatchCount = Math.ceil(triCount/16);
                blasBBCalPass.dispatchWorkgroups(dispatchCount, 1, 1);
                blasBBCalPass.end();

                IGPU.get().queue.submit([cmd.finish()]);
            }
        }
        
        this._clear();

        return blasBuffer;
    }

    // passes
    ////object aabb calculation
    private static m_objBBCalPipeline: GPUComputePipeline;
    private static m_objBBCalBindGroupLayout: GPUBindGroupLayout;
    private static m_objBBCalPipelineBindGroup: GPUBindGroup;

    ////object morton calculation
    private static m_objMortonGenPipeline: GPUComputePipeline;
    private static m_objMortonGenBindGroupLayout: GPUBindGroupLayout;
    private static m_objMortonGenPipelineBindGroup: GPUBindGroup;

    ////radix sort
    private static m_radixSortHistogramPipeline: GPUComputePipeline;
    private static m_radixSortHistogramBindGroupLayout: GPUBindGroupLayout;
    private static m_radixSortHistogramPipelineBindGroup: GPUBindGroup[] = new Array<GPUBindGroup>(2);
    private static m_radixSortPrefixReorderPipeline: GPUComputePipeline;
    private static m_radixSortPrefixReorderBindGroupLayout: GPUBindGroupLayout;
    private static m_radixSortPrefixReorderPipelineBindGroup: GPUBindGroup[] = new Array<GPUBindGroup>(2);

    ////blas generation
    private static m_blasGenPipeline: GPUComputePipeline;
    private static m_blasGenBindGroupLayout: GPUBindGroupLayout;
    private static m_blasGenPipelineBindGroup: GPUBindGroup;

    ////blas aabb reconstruction
    private static m_blasBBCalPipeline: GPUComputePipeline;
    private static m_blasBBCalBindGroupLayout: GPUBindGroupLayout;
    private static m_blasBBCalPipelineBindGroup: GPUBindGroup;

    // additional set layout and sets (unifroms used as push constants)
    private static m_shiftUnifromBindGroupLayout: GPUBindGroupLayout;
    private static m_shiftUnifromPipelineBindGroup: GPUBindGroup[] = new Array<GPUBindGroup>(8);

    //uniforms
    private static m_uniformBuffer: GPUBuffer;
    private static m_uniformCPU: Float32Array;

    private static m_shiftUniformBuffer: GPUBuffer[] = new Array<GPUBuffer>(8);
    private static m_shiftUniformCPU: Float32Array[] = new Array<Float32Array>(8);

    //buffers
    private static m_bbBuffer: GPUBuffer;
    private static m_histogramsBuffer: GPUBuffer;
    private static m_mortonInOutBuffer: GPUBuffer;
    private static m_tempMortonBuffer: GPUBuffer;
    private static m_sortMapInOutBuffer: GPUBuffer;
    private static m_tempSortMapBuffer: GPUBuffer;
    private static m_blasConstructionBuffer: GPUBuffer;

    private static _initialize() 
    {
        //uniform buffer
        this.m_uniformCPU = new Float32Array(4);
            this.m_uniformBuffer = IGPU.createBuffer({
                size: GBLAS.m_uniformCPU.length * 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        
        //shift uniform buffers
        ////to be used as a push constant since webgpu does not offer them
        ////this contains the variable shift since it is changed after every pass of the radix sort algorithm
        this.m_shiftUnifromBindGroupLayout = IGPU.get().createBindGroupLayout({
            entries: [
                {
                    // uniform
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                    },
                }
            ],
        });

        for (let i = 0; i < 8; i++) {
            this.m_shiftUniformCPU[i] = new Float32Array(1);

            this.m_shiftUniformBuffer[i] = IGPU.createBuffer({
                size: 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            this.m_shiftUniformCPU[i].set([i*4], 0);
            IGPU.get().queue.writeBuffer(this.m_shiftUniformBuffer[i], 0, this.m_shiftUniformCPU[i]);
      
            GBLAS.m_shiftUnifromPipelineBindGroup[i] = IGPU.get().createBindGroup({
                layout: GBLAS.m_shiftUnifromBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: GBLAS.m_shiftUniformBuffer[i] },
                    }
                ],
            });
        }

        //objBB calculate pipeline
        this.m_objBBCalBindGroupLayout = IGPU.get().createBindGroupLayout({
            entries: [
                {
                    // uniform
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                    },
                },
                {
                    // indices
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    // positions
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    // AABBs list
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                }
            ],
        });

        const objBBCalPipelineLayout = IGPU.get().createPipelineLayout({
            bindGroupLayouts: [this.m_objBBCalBindGroupLayout],
        });

        const objBBCalShader = structs_compute + objBBCal_compute;

        this.m_objBBCalPipeline = IGPU.get().createComputePipeline({
            label: "bbCalculation compute pipeline",
            layout: objBBCalPipelineLayout,
            compute: {
                module: IGPU.get().createShaderModule({
                    code: objBBCalShader,
                }),
                entryPoint: "main",
            },
        });

        //objMorton generate pipeline
        this.m_objMortonGenBindGroupLayout = IGPU.get().createBindGroupLayout({
            entries: [
                {
                    // uniform
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                    },
                },
                {
                    // aabb list
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    // morton code
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                }
            ],
        });

        const objMortonGenPipelineLayout = IGPU.get().createPipelineLayout({
            bindGroupLayouts: [this.m_objMortonGenBindGroupLayout],
        });

        const objMortonGenShader = structs_compute + objMortonGen_compute;

        this.m_objMortonGenPipeline = IGPU.get().createComputePipeline({
            label: "objMortonGen compute pipeline",
            layout: objMortonGenPipelineLayout,
            compute: {
                module: IGPU.get().createShaderModule({
                    code: objMortonGenShader,
                }),
                entryPoint: "main",
            },
        });

        //radix sort pipeline
        this.m_radixSortHistogramBindGroupLayout = IGPU.get().createBindGroupLayout({
            entries: [
                {
                    // uniform
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                    },
                },
                {
                    // histograms
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    // morton code
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                }
            ],
        });

        const radixSortHistogramPipelineLayout = IGPU.get().createPipelineLayout({
            bindGroupLayouts: [this.m_radixSortHistogramBindGroupLayout,
                this.m_shiftUnifromBindGroupLayout
            ],
        });

        const radixSortHistogramShader = structs_compute + radixSortHistogram_compute;

        this.m_radixSortHistogramPipeline = IGPU.get().createComputePipeline({
            label: "radix sort histogram compute pipeline",
            layout: radixSortHistogramPipelineLayout,
            compute: {
                module: IGPU.get().createShaderModule({
                    code: radixSortHistogramShader,
                }),
                entryPoint: "main",
            },
        });

        this.m_radixSortPrefixReorderBindGroupLayout = IGPU.get().createBindGroupLayout({
            entries: [
                {
                    // uniform
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                    },
                },
                {
                    // histograms
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    // morton code in
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    // morton code out
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    // map in
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    // map out
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                }
            ],
        });

        const radixSortPrefixReorderPipelineLayout = IGPU.get().createPipelineLayout({
            bindGroupLayouts: [this.m_radixSortPrefixReorderBindGroupLayout,
                this.m_shiftUnifromBindGroupLayout
            ],
        });

        const radixSortPrefixReorderShader = "enable subgroups;" + structs_compute + radixSortPrefixReorder_compute;

        this.m_radixSortPrefixReorderPipeline = IGPU.get().createComputePipeline({
            label: "radix sort PrefixReorder compute pipeline",
            layout: radixSortPrefixReorderPipelineLayout,
            compute: {
                module: IGPU.get().createShaderModule({
                    code: radixSortPrefixReorderShader,
                }),
                entryPoint: "main",
            },
        });

        //blas generate pipeline
        this.m_blasGenBindGroupLayout = IGPU.get().createBindGroupLayout({
            entries: [
                {
                    // uniform
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                    },
                },
                {
                    // sort map
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    // mortons
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    // aabb
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    // blas nodes
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    // blas construction nodes
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                }
            ],
        });

        const blasGenPipelineLayout = IGPU.get().createPipelineLayout({
            bindGroupLayouts: [this.m_blasGenBindGroupLayout],
        });

        const blasGenShader = structs_compute + blasGen_compute;

        this.m_blasGenPipeline = IGPU.get().createComputePipeline({
            label: "blasGen compute pipeline",
            layout: blasGenPipelineLayout,
            compute: {
                module: IGPU.get().createShaderModule({
                    code: blasGenShader,
                }),
                entryPoint: "main",
            },
        });

        //blas aabb calculation
        this.m_blasBBCalBindGroupLayout = IGPU.get().createBindGroupLayout({
            entries: [
                {
                    // uniform
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "uniform",
                    },
                },
                {
                    // blas nodes
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    // construction nodes
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                }
            ],
        });

        const blasBBCalPipelineLayout = IGPU.get().createPipelineLayout({
            bindGroupLayouts: [this.m_blasBBCalBindGroupLayout],
        });

        const blasBBCalShader = structs_compute + blasBBCal_compute;

        this.m_blasBBCalPipeline = IGPU.get().createComputePipeline({
            label: "blasBBCal compute pipeline",
            layout: blasBBCalPipelineLayout,
            compute: {
                module: IGPU.get().createShaderModule({
                    code: blasBBCalShader,
                }),
                entryPoint: "main",
            },
        });
    }

    private static _createTempBuffers(meshTriangleMax:number)
    {
        //aabb for each triangle and one additional aabb for the object.
        this.m_bbBuffer = IGPU.createBuffer({
            size: (meshTriangleMax+1) * (8 * 4) , //8 * f32   
            usage: GPUBufferUsage.STORAGE,
        });
        
        //histograms for radix sort. 16 buckets for each wg.
        this.m_histogramsBuffer = IGPU.createBuffer({
            size: Math.ceil(meshTriangleMax/16) * (16 * 4), //16 * u32
            usage: GPUBufferUsage.STORAGE,
        });

        //32bit morton codes. one for each triangle.
        this.m_mortonInOutBuffer = IGPU.createBuffer({
            size: meshTriangleMax * 4 , //uint
            usage: GPUBufferUsage.STORAGE,
        });
        this.m_tempMortonBuffer = IGPU.createBuffer({
            size: meshTriangleMax * 4 , //uint
            usage: GPUBufferUsage.STORAGE,
        });

        //sort map used for non sorted buffer.
        this.m_sortMapInOutBuffer = IGPU.createBuffer({
            size: meshTriangleMax * 4 , //uint
            usage: GPUBufferUsage.STORAGE,
        });
        this.m_tempSortMapBuffer = IGPU.createBuffer({
            size: meshTriangleMax * 4 , //uint
            usage: GPUBufferUsage.STORAGE,
        });

        //blas construction buffer for leafs and internal nodes.
        this.m_blasConstructionBuffer = IGPU.createBuffer({
            size: Math.max(0, (meshTriangleMax * 2)-1) * (2 * 4) , //2 * u32
            usage: GPUBufferUsage.STORAGE,
        });
    }

    private static _updateUniform(triCount:number, indexOffset:number, posOffset:number, blasOffset:number) 
    {
        GBLAS.m_uniformCPU.set([triCount], 0);
        GBLAS.m_uniformCPU.set([indexOffset], 1);
        GBLAS.m_uniformCPU.set([posOffset], 2);
        GBLAS.m_uniformCPU.set([blasOffset], 3);
        IGPU.get().queue.writeBuffer(GBLAS.m_uniformBuffer, 0, GBLAS.m_uniformCPU);
    }

    private static _clear()
    {
        GBLAS.m_bbBuffer.destroy();
        GBLAS.m_histogramsBuffer.destroy();
        GBLAS.m_mortonInOutBuffer.destroy();
        GBLAS.m_tempMortonBuffer.destroy();
        GBLAS.m_sortMapInOutBuffer.destroy();
        GBLAS.m_tempSortMapBuffer.destroy();
        GBLAS.m_blasConstructionBuffer.destroy();
    }
}

export { GBLAS };
