import * as THREE from "three";

const BLAS_INSTANCE_BYTE_SIZE: number = 16 * 4 + // transform (mat4)
                                        16 * 4 + // transform inverse (mat4)
                                         1 * 4 + // blas offset (uint32)
                                         3 * 4;  // padding

class BLASInstance {
    constructor(transform: THREE.Matrix4, blasOffset: number) {
        this.m_transform = transform.clone();
        this.m_transformInv = transform.clone().invert();
        this.m_blasOffset = blasOffset;
    }

    public get transform(): Readonly<THREE.Matrix4> {
        return this.m_transform;
    }

    public get transformInv(): Readonly<THREE.Matrix4> {
        return this.m_transformInv;
    }

    public get blasOffset(): Readonly<number> {
        return this.m_blasOffset;
    }

    public writeToArray(target: ArrayBuffer, offset: number) {
        // allocate
        const transformArrayF32: Float32Array = new Float32Array(target, offset, 16);
        const transformInvArrayF32: Float32Array = new Float32Array(target, offset+64, 16);
        const blasOffsetArrayU32: Uint32Array = new Uint32Array(target, offset+128, 4);
                        
        // copy
        transformArrayF32.set(this.m_transform.toArray());
        transformInvArrayF32.set(this.m_transformInv.toArray());
        blasOffsetArrayU32.set([this.m_blasOffset]);
    }

    private m_transform: THREE.Matrix4;
    private m_transformInv: THREE.Matrix4;  // inverse
    private m_blasOffset: number;
}

export { BLASInstance, BLAS_INSTANCE_BYTE_SIZE };
