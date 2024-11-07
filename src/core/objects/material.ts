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
    roughnessMapIdx: number;
    metallicMapIdx: number;
}

class Material {
    public constructor(
        baseColor:THREE.Vector3 = new THREE.Vector3(0, 0, 0), 
        emissiveColor:THREE.Vector3 = new THREE.Vector3(0, 0, 0), 
        roughness:number = 0.5, metallic:number = 0.5,
        albedoID: number|undefined , emissiveID: number|undefined,
        roughnessID: number|undefined, metallicID: number|undefined) {
        this.baseColor = baseColor;
        this.emissiveColor = emissiveColor;

        this.roughness = roughness;
        this.metallic = metallic;

        this.albedoMapID = albedoID;
        this.emissiveMapID = emissiveID;
        this.roughnessMapID = roughnessID;
        this.metallicMapID = metallicID;
        
        this.id = "" + this.baseColor.toArray() + this.emissiveColor.toArray() +
                    this.roughness + this.metallic +
                    this.albedoMapID + this.emissiveMapID +
                    this.roughnessMapID + this.metallicMapID;
    }

    public readonly id: string;

    public readonly baseColor: THREE.Vector3;
    public readonly emissiveColor: THREE.Vector3;
    public readonly roughness: number;
    public readonly metallic: number;

    public readonly albedoMapID: number | undefined;
    public readonly emissiveMapID: number| undefined;
    public readonly roughnessMapID: number| undefined;
    public readonly metallicMapID: number| undefined;

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

        if (m) mapsI32.set([m.albedoMapIdx, m.emissiveMapIdx, m.roughnessMapIdx, m.metallicMapIdx]);
        else mapsI32.set([-1, -1, -1, -1]);
    }
}

export { Material };
