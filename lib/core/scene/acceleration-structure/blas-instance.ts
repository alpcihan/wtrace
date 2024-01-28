import * as THREE from "three";

interface BLASInstance {
    transform: THREE.Matrix4,
    invTransform: THREE.Matrix4,
    blasOffset: number                          
};

const BLAS_INSTANCE_GPU_BYTE_SIZE: number = 16 * 4 + // transform
                                            16 * 4 + // invTransform  
                                             1 * 4 + // blas offset
                                             3 * 4;  // padding



export { BLASInstance, BLAS_INSTANCE_GPU_BYTE_SIZE };