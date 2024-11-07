import { Matrix4 } from "three";

import { IGPU } from "../../renderer/igpu";
import { SceneDataManager } from "../scene-data-manager";

import structs_compute from "../../../shaders/tlasConstruction/structs.wgsl"
import sceneBBCal_compute from "../../../shaders/tlasConstruction/sceneBBCal_compute.wgsl"
import blasMortonGen_compute from "../../../shaders/tlasConstruction/blasMortonGen_compute.wgsl";
import radixSortHistogram_compute from "../../../shaders/tlasConstruction/radixSortHistogram_compute.wgsl";
import radixSortPrefixReorder_compute from "../../../shaders/tlasConstruction/radixSortPrefixReorder_compute.wgsl";
import tlasGen_compute from "../../../shaders/tlasConstruction/tlasGen_compute.wgsl"
import tlasBBCal_compute from "../../../shaders/tlasConstruction/tlasBBCal_compute.wgsl"

class GTLAS {
    private constructor() {}

    static buildTlasBuffer(dataManager:SceneDataManager): GPUBuffer
    {
        //output buffer
        //tlas buffer for leafs and internal nodes. 2N-1 nodes are needed for each blas in the scene
        let tlasBuffer: GPUBuffer = IGPU.createBuffer({
            size: Math.max(0, (dataManager.blasInstanceCount * 2)-1) * (12 * 4), //20 * f32
            usage: GPUBufferUsage.STORAGE,
        });

        if (!GTLAS.m_sceneBBCalPipeline) {
            GTLAS._initialize();
        }

        if(dataManager.blasInstanceCount)
        {
            GTLAS._createTempBuffers(dataManager.blasInstanceCount);
        
            //update uniform
            this._updateUniform(dataManager.blasInstanceCount);

            //bind data needed by shader
            {
                this.m_sceneBBCalPipelineBindGroup = IGPU.get().createBindGroup({
                    layout: this.m_sceneBBCalBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GTLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: dataManager.blasBuffer },
                        },
                        {
                            binding: 2,
                            resource: { buffer: dataManager.blasInstanceBuffer },
                        },
                        {
                            binding: 3,
                            resource: { buffer: GTLAS.m_sceneBBBuffer },
                        }
                    ],
                });
        
                this.m_blasMortonGenPipelineBindGroup = IGPU.get().createBindGroup({
                    layout: this.m_blasMortonGenBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GTLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: dataManager.blasBuffer },
                        },
                        {
                            binding: 2,
                            resource: { buffer: dataManager.blasInstanceBuffer },
                        },
                        {
                            binding: 3,
                            resource: { buffer: GTLAS.m_mortonInOutBuffer },
                        },
                        {
                            binding: 4,
                            resource: { buffer: GTLAS.m_sceneBBBuffer },
                        }
                    ],
                });
        
                this.m_radixSortHistogramPipelineBindGroup[0] = IGPU.get().createBindGroup({
                    layout: this.m_radixSortHistogramBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GTLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: GTLAS.m_histogramsBuffer },
                        },
                        {
                            binding: 2,
                            resource: { buffer: GTLAS.m_mortonInOutBuffer },
                        }
                    ],
                });
        
                this.m_radixSortHistogramPipelineBindGroup[1] = IGPU.get().createBindGroup({
                    layout: this.m_radixSortHistogramBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GTLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: GTLAS.m_histogramsBuffer },
                        },
                        {
                            binding: 2,
                            resource: { buffer: GTLAS.m_tempMortonBuffer },
                        }
                    ],
                });
        
                this.m_radixSortPrefixReorderPipelineBindGroup[0] = IGPU.get().createBindGroup({
                    layout: this.m_radixSortPrefixReorderBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GTLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: GTLAS.m_histogramsBuffer },
                        },
                        {
                            binding: 2,
                            resource: { buffer: GTLAS.m_mortonInOutBuffer },
                        },
                        {
                            binding: 3,
                            resource: { buffer: GTLAS.m_tempMortonBuffer },
                        },
                        {
                            binding: 4,
                            resource: { buffer: GTLAS.m_sortMapInOutBuffer },
                        },
                        {
                            binding: 5,
                            resource: { buffer: GTLAS.m_tempSortMapBuffer },
                        }
                    ],
                });
        
                this.m_radixSortPrefixReorderPipelineBindGroup[1] = IGPU.get().createBindGroup({
                    layout: this.m_radixSortPrefixReorderBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GTLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: GTLAS.m_histogramsBuffer },
                        },
                        {
                            binding: 2,
                            resource: { buffer: GTLAS.m_tempMortonBuffer },
                        },
                        {
                            binding: 3,
                            resource: { buffer: GTLAS.m_mortonInOutBuffer },
                        },
                        {
                            binding: 4,
                            resource: { buffer: GTLAS.m_tempSortMapBuffer },
                        },
                        {
                            binding: 5,
                            resource: { buffer: GTLAS.m_sortMapInOutBuffer },
                        }
                    ],
                });

                this.m_tlasGenPipelineBindGroup = IGPU.get().createBindGroup({
                    layout: this.m_tlasGenBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GTLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: GTLAS.m_sortMapInOutBuffer },
                        },
                        {
                            binding: 2,
                            resource: { buffer: GTLAS.m_mortonInOutBuffer },
                        },
                        {
                            binding: 3,
                            resource: { buffer: dataManager.blasInstanceBuffer },
                        },
                        {
                            binding: 4,
                            resource: { buffer: dataManager.blasBuffer },
                        },
                        {
                            binding: 5,
                            resource: { buffer: tlasBuffer },
                        },
                        {
                            binding: 6,
                            resource: { buffer: GTLAS.m_tlasConstructionBuffer },
                        }
                    ],
                });
        
                this.m_tlasBBCalPipelineBindGroup = IGPU.get().createBindGroup({
                    layout: this.m_tlasBBCalBindGroupLayout,
                    entries: [
                        {
                            binding: 0,
                            resource: { buffer: GTLAS.m_uniformBuffer },
                        },
                        {
                            binding: 1,
                            resource: { buffer: dataManager.blasInstanceBuffer },
                        },
                        {
                            binding: 2,
                            resource: { buffer: tlasBuffer },
                        },
                        {
                            binding: 3,
                            resource: { buffer: GTLAS.m_tlasConstructionBuffer },
                        }
                    ],
                });
            }

            //passes
            {
                const cmd: GPUCommandEncoder = IGPU.get().createCommandEncoder();

                // scene aabb calculation pass
                {
                    const sceneAABBCalculationPass: GPUComputePassEncoder = cmd.beginComputePass();
                    sceneAABBCalculationPass.setPipeline(this.m_sceneBBCalPipeline);
                    sceneAABBCalculationPass.setBindGroup(0, this.m_sceneBBCalPipelineBindGroup);
                    sceneAABBCalculationPass.dispatchWorkgroups(1, 1, 1);
                    sceneAABBCalculationPass.end();
                }

                // mortone generation pass
                {
                    const mortoneGenerationPass: GPUComputePassEncoder = cmd.beginComputePass();
                    mortoneGenerationPass.setPipeline(this.m_blasMortonGenPipeline);
                    mortoneGenerationPass.setBindGroup(0, this.m_blasMortonGenPipelineBindGroup);
                    let dispatchCount = Math.ceil(dataManager.blasInstanceCount/16); //WG is 16
                    mortoneGenerationPass.dispatchWorkgroups(dispatchCount, 1, 1);
                    mortoneGenerationPass.end();
                }

                // radix sort passes
                {
                    for(let i = 0; i < 8; i++)
                    {                
                        // radixSort Histogram pass
                        {
                            const radixSortHistogramPass: GPUComputePassEncoder = cmd.beginComputePass();
                            radixSortHistogramPass.setPipeline(this.m_radixSortHistogramPipeline);
                            radixSortHistogramPass.setBindGroup(0, this.m_radixSortHistogramPipelineBindGroup[i%2]);
                            radixSortHistogramPass.setBindGroup(1, this.m_shiftUnifromPipelineBindGroup[i]);
                            let dispatchCount = Math.ceil(dataManager.blasInstanceCount/16);
                            radixSortHistogramPass.dispatchWorkgroups(dispatchCount, 1, 1);
                            radixSortHistogramPass.end();
                        }
        
                        // radixSort PrefixReorder pass
                        {
                            const radixSortPrefixReorderPass: GPUComputePassEncoder = cmd.beginComputePass();
                            radixSortPrefixReorderPass.setPipeline(this.m_radixSortPrefixReorderPipeline);
                            radixSortPrefixReorderPass.setBindGroup(0, this.m_radixSortPrefixReorderPipelineBindGroup[i%2]);
                            radixSortPrefixReorderPass.setBindGroup(1, this.m_shiftUnifromPipelineBindGroup[i]);
                            let dispatchCount = Math.ceil(dataManager.blasInstanceCount/16);
                            radixSortPrefixReorderPass.dispatchWorkgroups(dispatchCount, 1, 1);
                            radixSortPrefixReorderPass.end();
                        }
                    }
                }

                // tlas generation pass
                {
                    const tlasGenerationPass: GPUComputePassEncoder = cmd.beginComputePass();
                    tlasGenerationPass.setPipeline(this.m_tlasGenPipeline);
                    tlasGenerationPass.setBindGroup(0, this.m_tlasGenPipelineBindGroup);
                    let dispatchCount = Math.ceil(dataManager.blasInstanceCount/16);
                    tlasGenerationPass.dispatchWorkgroups(dispatchCount, 1, 1);
                    tlasGenerationPass.end();
                }

                // tlas aabb construction pass
                {
                    const tlasAABBConstructionPass: GPUComputePassEncoder = cmd.beginComputePass();
                    tlasAABBConstructionPass.setPipeline(this.m_tlasBBCalPipeline);
                    tlasAABBConstructionPass.setBindGroup(0, this.m_tlasBBCalPipelineBindGroup);
                    let dispatchCount = Math.ceil(dataManager.blasInstanceCount/16);
                    tlasAABBConstructionPass.dispatchWorkgroups(dispatchCount, 1, 1);
                    tlasAABBConstructionPass.end();
                }

                IGPU.get().queue.submit([cmd.finish()]);
            }

            this._clear();
        }

        return tlasBuffer;
    }

    // passes
    ////scene AABB calculation
    private static m_sceneBBCalPipeline: GPUComputePipeline;
    private static m_sceneBBCalBindGroupLayout: GPUBindGroupLayout;
    private static m_sceneBBCalPipelineBindGroup: GPUBindGroup;

    ////morton generation
    private static m_blasMortonGenPipeline: GPUComputePipeline;
    private static m_blasMortonGenBindGroupLayout: GPUBindGroupLayout;
    private static m_blasMortonGenPipelineBindGroup: GPUBindGroup;

    ////radix sort
    private static m_radixSortHistogramPipeline: GPUComputePipeline;
    private static m_radixSortHistogramBindGroupLayout: GPUBindGroupLayout;
    private static m_radixSortHistogramPipelineBindGroup: GPUBindGroup[] = new Array<GPUBindGroup>(2);

    private static m_radixSortPrefixReorderPipeline: GPUComputePipeline;
    private static m_radixSortPrefixReorderBindGroupLayout: GPUBindGroupLayout;
    private static m_radixSortPrefixReorderPipelineBindGroup: GPUBindGroup[] = new Array<GPUBindGroup>(2);

    ////tlas generation
    private static m_tlasGenPipeline: GPUComputePipeline;
    private static m_tlasGenBindGroupLayout: GPUBindGroupLayout;
    private static m_tlasGenPipelineBindGroup: GPUBindGroup;

    ////tlas AABB reconstruction
    private static m_tlasBBCalPipeline: GPUComputePipeline;
    private static m_tlasBBCalBindGroupLayout: GPUBindGroupLayout;
    private static m_tlasBBCalPipelineBindGroup: GPUBindGroup;

    // additional set layout and sets (unifroms used as push constants)
    private static m_shiftUnifromBindGroupLayout: GPUBindGroupLayout;
    private static m_shiftUnifromPipelineBindGroup: GPUBindGroup[] = new Array<GPUBindGroup>(8);

    //uniforms
    private static m_uniformBuffer: GPUBuffer;
    private static m_uniformCPU: Float32Array;

    private static m_shiftUniformBuffer: GPUBuffer[] = new Array<GPUBuffer>(8);
    private static m_shiftUniformCPU: Float32Array[] = new Array<Float32Array>(8);

    //buffers
    private static m_sceneBBBuffer: GPUBuffer;
    private static m_histogramsBuffer: GPUBuffer;
    private static m_mortonInOutBuffer: GPUBuffer;
    private static m_tempMortonBuffer: GPUBuffer;
    private static m_sortMapInOutBuffer: GPUBuffer;
    private static m_tempSortMapBuffer: GPUBuffer;
    private static m_tlasConstructionBuffer: GPUBuffer;

    private static _initialize() 
    {
        // uniform buffer
        GTLAS.m_uniformCPU = new Float32Array(1);
        GTLAS.m_uniformBuffer = IGPU.get().createBuffer({
            size: GTLAS.m_uniformCPU.length * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        //shift uniform buffers
        ////to be used as a push constant since webgpu does not offer them
        ////this contains the variable shift since it is changed after every pass of the radix sort algorithm
        GTLAS.m_shiftUnifromBindGroupLayout = IGPU.get().createBindGroupLayout({
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
            GTLAS.m_shiftUniformCPU[i] = new Float32Array(1);

            GTLAS.m_shiftUniformBuffer[i] = IGPU.createBuffer({
                size: 4,
                usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            });

            GTLAS.m_shiftUniformCPU[i].set([i*4], 0);
            IGPU.get().queue.writeBuffer(GTLAS.m_shiftUniformBuffer[i], 0, GTLAS.m_shiftUniformCPU[i]);
      
            GTLAS.m_shiftUnifromPipelineBindGroup[i] = IGPU.get().createBindGroup({
                layout: GTLAS.m_shiftUnifromBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: GTLAS.m_shiftUniformBuffer[i] },
                    }
                ],
            });
        }
        
        // scene aabb calculation
        this.m_sceneBBCalBindGroupLayout = IGPU.get().createBindGroupLayout({
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
                        type: "read-only-storage",
                    },
                },
                {
                    // blas instances
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    // scene aabb buffer
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                }
            ],
        });

        const sceneBBCalPipelineLayout = IGPU.get().createPipelineLayout({
            bindGroupLayouts: [this.m_sceneBBCalBindGroupLayout],
        });

        const sceneBBCalShader = structs_compute + sceneBBCal_compute;

        this.m_sceneBBCalPipeline = IGPU.get().createComputePipeline({
            label: "scene aabb compute pipeline",
            layout: sceneBBCalPipelineLayout,
            compute: {
                module: IGPU.get().createShaderModule({
                    code: sceneBBCalShader,
                }),
                entryPoint: "main",
            },
        });

        // morton generation pass
        this.m_blasMortonGenBindGroupLayout = IGPU.get().createBindGroupLayout({
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
                        type: "read-only-storage",
                    },
                },
                {
                    // blas instances
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    // morton codes
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    // scene aabb
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                }
            ],
        });

        const blasMortonGenPipelineLayout = IGPU.get().createPipelineLayout({
            bindGroupLayouts: [this.m_blasMortonGenBindGroupLayout],
        });

        const blasMortonGenShader = structs_compute + blasMortonGen_compute;

        this.m_blasMortonGenPipeline = IGPU.get().createComputePipeline({
            label: "blas morton generation compute pipeline",
            layout: blasMortonGenPipelineLayout,
            compute: {
                module: IGPU.get().createShaderModule({
                    code: blasMortonGenShader,
                }),
                entryPoint: "main",
            },
        });

        // radixSort histogram pass
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
        
        // radixSort prefix reorder pass
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

        // tlas generation pass
        this.m_tlasGenBindGroupLayout = IGPU.get().createBindGroupLayout({
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
                    // sorted mortons
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    // blas instances
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
                        type: "read-only-storage",
                    },
                },
                {
                    // tlas nodes
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    // tlas construction info
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                }
            ],
        });

        const tlasGenPipelineLayout = IGPU.get().createPipelineLayout({
            bindGroupLayouts: [this.m_tlasGenBindGroupLayout],
        });

        const tlasGenShader = structs_compute + tlasGen_compute;

        this.m_tlasGenPipeline = IGPU.get().createComputePipeline({
            label: "tlas generation compute pipeline",
            layout: tlasGenPipelineLayout,
            compute: {
                module: IGPU.get().createShaderModule({
                    code: tlasGenShader,
                }),
                entryPoint: "main",
            },
        });

        // tlas AABB calculation pass
        this.m_tlasBBCalBindGroupLayout = IGPU.get().createBindGroupLayout({
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
                    // blas instances
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "read-only-storage",
                    },
                },
                {
                    // tlas nodes
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                },
                {
                    // tlas reconstruction info
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: "storage",
                    },
                }
            ],
        });

        const tlasAABBReconstructionPipelineLayout = IGPU.get().createPipelineLayout({
            bindGroupLayouts: [this.m_tlasBBCalBindGroupLayout],
        });

        const tlasBBCalShader = structs_compute + tlasBBCal_compute;

        this.m_tlasBBCalPipeline = IGPU.get().createComputePipeline({
            label: "tlas generation compute pipeline",
            layout: tlasAABBReconstructionPipelineLayout,
            compute: {
                module: IGPU.get().createShaderModule({
                    code: tlasBBCalShader,
                }),
                entryPoint: "main",
            },
        });
    }

    private static _createTempBuffers(blasInstanceCount:number)
    {
        this.m_sceneBBBuffer = IGPU.createBuffer({
            size: 8 * 4, //8 floats
            usage: GPUBufferUsage.STORAGE,
        });

        this.m_histogramsBuffer = IGPU.createBuffer({
            size: (4 * 16) * Math.ceil(blasInstanceCount/16), //mortons of 32-bit mortons
            usage: GPUBufferUsage.STORAGE,
        });
        
        this.m_mortonInOutBuffer = IGPU.createBuffer({
            size: blasInstanceCount * 4, //mortons of 32-bit mortons
            usage: GPUBufferUsage.STORAGE,
        });

        this.m_tempMortonBuffer = IGPU.createBuffer({
            size: blasInstanceCount * 4, //mortons of 32-bit mortons
            usage: GPUBufferUsage.STORAGE,
        });

        this.m_sortMapInOutBuffer = IGPU.createBuffer({
            size: blasInstanceCount * 4, //u32 index for each element
            usage: GPUBufferUsage.STORAGE,
        });

        this.m_tempSortMapBuffer = IGPU.createBuffer({
            size: blasInstanceCount * 4, //u32 index for each element
            usage: GPUBufferUsage.STORAGE,
        });

        this.m_tlasConstructionBuffer = IGPU.createBuffer({
            size: 8 * (2 * blasInstanceCount),
            usage: GPUBufferUsage.STORAGE,
        });
    }

    private static _updateUniform(blasCount:number) 
    {
        this.m_uniformCPU.set([blasCount], 0);
        IGPU.get().queue.writeBuffer(this.m_uniformBuffer, 0, this.m_uniformCPU);
    }

    private static _clear()
    {
        GTLAS.m_sceneBBBuffer.destroy();
        GTLAS.m_histogramsBuffer.destroy();
        GTLAS.m_mortonInOutBuffer.destroy();
        GTLAS.m_tempMortonBuffer.destroy();
        GTLAS.m_sortMapInOutBuffer.destroy();
        GTLAS.m_tempSortMapBuffer.destroy();
        GTLAS.m_tlasConstructionBuffer.destroy();
    }
}

export { GTLAS };
