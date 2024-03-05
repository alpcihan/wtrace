import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { Scene } from "../wtrace";
import { MeshModel } from "../wtrace";
import { Mesh } from "../wtrace";
import { Material } from "../wtrace";
import { WTTexture } from "../wtrace";
import * as THREE from "three";

class WTGLTFLoader{
    public static async load(path: string): Promise<Scene>{
        if (this.m_loader === undefined){
            this.m_loader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath( '/examples/jsm/libs/draco/' );
            this.m_loader.setDRACOLoader( dracoLoader );
        } 

        // Load a glTF resource
        const gltf = await new Promise<any>((resolve, reject) => {
            this.m_loader.load(
                // resource URL
                path,
                // called when the resource is loaded
                (gltf) => {
                    resolve(gltf);
                },
                // called while loading is progressing
                (xhr) => {
                    console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
                },
                // called when loading has errors
                (error) => {
                    console.log( 'An error happened' );
                    reject(error);
                }
            );
        });

        return this._convertToWTScene(gltf.scene);
    }

    private static _rearrangePoints(points: Float32Array, indices: Uint32Array){
        let newPoints = new Float32Array(indices.length * 3);

        for (let i = 0; i < indices.length; i++) {
            newPoints[i * 3] = points[indices[i] * 3];
            newPoints[i * 3 + 1] = points[indices[i] * 3 + 1];
            newPoints[i * 3 + 2] = points[indices[i] * 3 + 2];
        }
    
        return newPoints;
    }

    private static _rearrangeUVs(uvs: Float32Array, indices: Uint32Array){
        let newUVs = new Float32Array(indices.length * 2);

        for (let i = 0; i < indices.length; i++) {
            newUVs[i * 2] = uvs[indices[i] * 2];
            newUVs[i * 2 + 1] = 1 - (uvs[indices[i] * 2 + 1]-1); //Flip Y
        }
        return newUVs;
    }

    private static _convertToWTScene(gltfScene: THREE.Group){

        let scene: Scene = new Scene();
        let texture: WTTexture | undefined = undefined;

        gltfScene.traverse((object: any) => {
            if (object.isMesh) {

                let initialPoints = new Float32Array(object.geometry.attributes.position.array);
                let indices = new Uint32Array(object.geometry.index.array);

                let mesh = new Mesh();
                mesh.points = this._rearrangePoints(initialPoints,indices);
                mesh.uvs = object.geometry.attributes.uv !== undefined ? this._rearrangeUVs(object.geometry.attributes.uv.array, indices) : undefined;

                let material: Material;
                let threeMat: THREE.MeshBasicMaterial;
                if (Array.isArray(object.material)) {
                    threeMat = object.material[0] as THREE.MeshBasicMaterial;

                } else {
                    threeMat = object.material as THREE.MeshBasicMaterial;
                }
                if(texture === undefined && threeMat.map!==null){
                    const texture = new WTTexture();
                    texture.data = threeMat.map.image;
                    material = new Material(texture);
                    material.baseColor = new THREE.Vector3(-1,-1,-1);
                }
                else{
                    material = new Material();
                }
    
                const model = new MeshModel(mesh, material);
                model.position = object.position;
                model.euler = object.rotation;
                model.scale = object.scale;
                scene.add(model);
            }
        });

        return scene;
    }

    private static m_loader: GLTFLoader;
    private constructor() {}
}

export { WTGLTFLoader };