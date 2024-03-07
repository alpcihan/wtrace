import * as THREE from "three";
import { Texture } from "../../wtrace";

export const MATERIAL_BYTE_SIZE: number =
    3 * 4 + // base color (float3)
    1 * 4 + // roughness
    3 * 4 + // emissive color (float3)
    1 * 4 + // metallic
    1 * 4 + // albedo map idx (int)
    1 * 4 + // emissive map idx (int)
    1 * 4 + // specular map idx (int)
    1 * 4; // metallic map idx (int)

export interface MaterialMap {
    albedoMapIdx: number;
    emissiveMapIdx: number;
    specularMapIdx: number;
    metallicMapIdx: number;
}

class Material {
    public constructor() {
        this.id = Material._id++;

        this.baseColor = new THREE.Vector3(1, 1, 1);
        this.emissiveColor = new THREE.Vector3(0, 0, 0);
        this.roughness = 0.5;
        this.metallic = 0.5;

        this.albedoMap = undefined;
        this.emissiveMap = undefined;
        this.specularMap = undefined;
        this.metallicMap = undefined;
    }

    public readonly id: number;

    public baseColor: THREE.Vector3;
    public emissiveColor: THREE.Vector3;
    public roughness: number;
    public metallic: number;

    public albedoMap: Texture | undefined;
    public emissiveMap: Texture | undefined;
    public specularMap: Texture | undefined;
    public metallicMap: Texture | undefined;

    public writeToArray(target: ArrayBuffer, offset: number, m?: MaterialMap) {
        const baseColorArrayF32: Float32Array = new Float32Array(target, offset, 3);
        const roughnessArrayF32: Float32Array = new Float32Array(target, offset + 12, 1);
        const emissiveColorArrayF32: Float32Array = new Float32Array(target, offset + 16, 3);
        const metallicArrayF32: Float32Array = new Float32Array(target, offset + 28, 1);
        const mapsI32: Int32Array = new Int32Array(target, offset + 32, 4);

        // set material properties
        baseColorArrayF32.set(this.baseColor.toArray());

        roughnessArrayF32.set([this.roughness]);
        
        emissiveColorArrayF32.set(this.emissiveColor.toArray());
        
        metallicArrayF32.set([this.metallic]);

        if (m) mapsI32.set([m.albedoMapIdx, m.emissiveMapIdx, m.metallicMapIdx, m.specularMapIdx]);
        else mapsI32.set([-1, -1, -1, -1]);
    }

    private static _id: number = 0;
}

export { Material };
