import * as THREE from "three";

const BLAS_INSTANCE_BYTE_SIZE: number = 16 * 4 + // transform (mat4)
                                        16 * 4 + // invTransform (mat4)
                                         1 * 4 + // blas offset (uint32)
                                         3 * 4;  // padding

class BLASInstance {
    constructor(transform: THREE.Matrix4, blasOffset: number) {
        this.m_transform = transform;
        this.m_invTransform = transform.clone().invert();
        this.m_blasOffset = blasOffset;
    }

    public get transform(): Readonly<THREE.Matrix4> {
        return this.m_transform;
    }

    public get invTransform(): Readonly<THREE.Matrix4> {
        return this.m_invTransform;
    }

    public get blasOffset(): Readonly<number> {
        return this.m_blasOffset;
    }

    public writeToArray(target: ArrayBuffer, offset: number) {
        // allocate
        const transformArrayF32: Float32Array = new Float32Array(target, offset, 16);
        const invTransformArrayF32: Float32Array = new Float32Array(target, offset+64, 16);
        const blasOffsetArrayU32: Uint32Array = new Uint32Array(target, offset+128, 4);
                        
        // copy
        transformArrayF32.set(this.m_transform.toArray());
        invTransformArrayF32.set(this.m_invTransform.toArray());
        blasOffsetArrayU32.set([this.m_blasOffset]);
    }

    private m_transform: THREE.Matrix4;
    private m_invTransform: THREE.Matrix4;
    private m_blasOffset: number;
}

export { BLASInstance, BLAS_INSTANCE_BYTE_SIZE };
