import * as THREE from "three";

export const MATERIAL_BYTE_SIZE: number = 3 * 4 + // base color (float3)
                                          1 * 4 + // roughness
                                          3 * 4 + // emissive color (float3)
                                          1 * 4;  // metallic

class Material {
    public constructor() {
        this.id = Material._id++;

        this.baseColor = new THREE.Vector3(1,1,1);
        this.emissiveColor = new THREE.Vector3(0,0,0);
        this.roughness = 0.5;
        this.metallic = 0.5;
    }

    public readonly id: number;

    public baseColor: THREE.Vector3;
    public emissiveColor: THREE.Vector3;
    public roughness: number;
    public metallic: number;

    public writeToArray(target: ArrayBuffer, offset: number) {
        const baseColorArrayF32: Float32Array = new Float32Array(target, offset, 3);
        const roughnessArrayF32: Float32Array = new Float32Array(target, offset + 12, 1);
        const emissiveColorArrayF32: Float32Array = new Float32Array(target, offset + 16, 3);
        const metallicArrayF32: Float32Array = new Float32Array(target, offset + 28, 1);

        baseColorArrayF32.set(this.baseColor.toArray());
        roughnessArrayF32.set([this.roughness]);
        emissiveColorArrayF32.set(this.emissiveColor.toArray());
        metallicArrayF32.set([this.metallic]);
    }

    private static _id: number = 0;
}

export { Material };
