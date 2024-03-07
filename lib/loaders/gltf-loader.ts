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

    private static _populateF32ArrPerIndex(
        data: Float32Array,
        indices: Uint32Array,
        dataSize: number
    ): Float32Array {
        let populated = new Float32Array(indices.length * dataSize);

        for (let i = 0; i < indices.length; i++) {
            for (let j = 0; j < dataSize; j++) {
                populated[i * dataSize + j] = data[indices[i] * dataSize + j];
            }
        }

        return populated;
    }

    private static _gltfSceneToMeshModels(gltfScene: THREE.Group): MeshModel[] {
        let meshModels: MeshModel[] = [];

        gltfScene.traverse((object: any) => {
            if (!object.isMesh) return;

            let initialPoints = new Float32Array(object.geometry.attributes.position.array);
            let indices = new Uint32Array(object.geometry.index.array);

            // create mesh
            let mesh = new Mesh();

            mesh.points = this._populateF32ArrPerIndex(initialPoints, indices, 3);

            if (object.geometry.attributes.normal)
                mesh.normals = this._populateF32ArrPerIndex(
                    object.geometry.attributes.normal.array,
                    indices,
                    3
                );

            if (object.geometry.attributes.uv)
                mesh.uvs = this._populateF32ArrPerIndex(
                    object.geometry.attributes.uv.array,
                    indices,
                    2
                );

            // create material
            let material: Material = new Material();
            let threeMat = (
                Array.isArray(object.material) ? object.material[0] : object.material
            ) as THREE.MeshBasicMaterial;

            // load material textures
            if (threeMat.map !== null) {
                material.albedoMap = new Texture(threeMat.map.image);
                material.baseColor = new THREE.Vector3(-1, -1, -1);
            }

            //if(threeMat.specularMap !== null) {
            //    material.specularMap = new Texture(threeMat.specularMap.image);
            //}

            console.log(threeMat.map);

            // create model
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
