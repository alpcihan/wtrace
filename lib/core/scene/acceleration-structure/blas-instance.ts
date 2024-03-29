import * as THREE from "three";

export const BLAS_INSTANCE_BYTE_SIZE: number = 16 * 4 + // transform (mat4)
                                               16 * 4 + // transform inverse (mat4)
                                                1 * 4 + // blas offset (uint32)
                                                1 * 4 + // material index (uint32)
                                                2 * 4; // padding
                                                //1 * 4 + // albedo texture index
                                                //1 * 4;  // padding(TODO: other texture index)

class BLASInstance {
    constructor(transform: THREE.Matrix4, blasOffset: number, materialIdx: number) {
        this.m_transform = transform.clone();
        this.m_transformInv = transform.clone().invert();
        this.m_blasOffset = blasOffset;
        this.m_materialIdx = materialIdx;
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
        const blasOffsetArrayU32: Uint32Array = new Uint32Array(target, offset+128, 1);
        const materialIDArrayU32: Uint32Array = new Uint32Array(target, offset+132, 1 + 2);
                        
        // copy
        transformArrayF32.set(this.m_transform.toArray());
        transformInvArrayF32.set(this.m_transformInv.toArray());
        blasOffsetArrayU32.set([this.m_blasOffset]);
        materialIDArrayU32.set([this.m_materialIdx]);
        }

    private m_transform: THREE.Matrix4;
    private m_transformInv: THREE.Matrix4;  // inverse
    private m_blasOffset: number;
    private m_materialIdx: number;
    }

export { BLASInstance };
