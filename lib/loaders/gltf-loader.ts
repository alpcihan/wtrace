import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { MeshModel } from "../wtrace";
import { Mesh } from "../wtrace";
import { Material } from "../wtrace";
import { Texture } from "../wtrace";
import * as THREE from "three";

class WTGLTFLoader {
    public static async load(path: string): Promise<MeshModel[]> {
        if (this.m_loader === undefined) {
            this.m_loader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath("/examples/jsm/libs/draco/");
            this.m_loader.setDRACOLoader(dracoLoader);
        }

        // Load a glTF resource
        const gltf = await new Promise<any>((resolve, reject) => {
            this.m_loader.load(
                // resource URL
                path,
                // called when the resource is loaded
                gltf => {
                    resolve(gltf);
                },
                // called while loading is progressing
                xhr => {
                    // console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
                },
                // called when loading has errors
                error => {
                    console.log("An error happened while loading the gltf.");
                    reject(error);
                }
            );
        });

        return this._gltfSceneToMeshModels(gltf.scene);
    }

    private static _rearrangePoints(points: Float32Array, indices: Uint32Array) {
        let newPoints = new Float32Array(indices.length * 3);

        for (let i = 0; i < indices.length; i++) {
            newPoints[i * 3] = points[indices[i] * 3];
            newPoints[i * 3 + 1] = points[indices[i] * 3 + 1];
            newPoints[i * 3 + 2] = points[indices[i] * 3 + 2];
        }

        return newPoints;
    }

    private static _rearrangeUVs(uvs: Float32Array | undefined, indices: Uint32Array): Float32Array | undefined {
        if(uvs === undefined) return undefined; 

        let newUVs = new Float32Array(indices.length * 2);

        for (let i = 0; i < indices.length; i++) {
            newUVs[i * 2] = uvs[indices[i] * 2];
            newUVs[i * 2 + 1] = (uvs[indices[i] * 2 + 1]);
        }
        return newUVs;
    }

    private static _gltfSceneToMeshModels(gltfScene: THREE.Group): MeshModel[] {
        let meshModels: MeshModel[] = [];

        let texture: Texture | undefined = undefined;

        gltfScene.traverse((object: any) => {
            if (!object.isMesh) return;

            let initialPoints = new Float32Array(object.geometry.attributes.position.array);
            let indices = new Uint32Array(object.geometry.index.array);
            
            // create mesh
            let mesh = new Mesh();
            mesh.points = this._rearrangePoints(initialPoints, indices);
            mesh.uvs = this._rearrangeUVs(object.geometry.attributes.uv?.array, indices);
            
            // create material
            let material: Material = new Material();;
            let threeMat = (Array.isArray(object.material) ? object.material[0] : object.material) as THREE.MeshBasicMaterial;
 
            if (threeMat.map !== null) {
                const texture = new Texture();
                texture.data = threeMat.map.image;
                material.albedoTexture = texture;
                material.baseColor = new THREE.Vector3(-1, -1, -1);
            }

            const model = new MeshModel(mesh, material);
            model.position = object.position;
            model.euler = object.rotation;
            model.scale = object.scale;
            
            meshModels.push(model);
        });

        return meshModels;
    }

    private static m_loader: GLTFLoader;
    private constructor() {}
}

export { WTGLTFLoader };
