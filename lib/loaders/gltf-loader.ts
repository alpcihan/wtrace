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

    private static _convertToWTScene(gltfScene: THREE.Group){

        let scene: Scene = new Scene();
        gltfScene.traverse((object: any) => {
            if (object.isMesh) {
                let vertices = object.geometry.attributes.position.array;
                let indices = object.geometry.index.array;
                let rearrangedVertices = new Float32Array(indices.length * 3);
    
                for (let i = 0; i < indices.length; i++) {
                    rearrangedVertices[i * 3] = vertices[indices[i] * 3];
                    rearrangedVertices[i * 3 + 1] = vertices[indices[i] * 3 + 1];
                    rearrangedVertices[i * 3 + 2] = vertices[indices[i] * 3 + 2];
                }
    
                const mesh = new Mesh();
                mesh.uvs = undefined;
                mesh.points = rearrangedVertices;
                if (object.geometry.attributes.uv !== undefined) {
                    let uvs = object.geometry.attributes.uv.array;
                    let rearrangedUvs = new Float32Array(indices.length * 2);
                    for (let i = 0; i < indices.length; i++) {
                        rearrangedUvs[i * 2] = uvs[indices[i] * 2];
                        rearrangedUvs[i * 2 + 1] = uvs[indices[i] * 2 + 1];
                    }
                    mesh.uvs = rearrangedUvs;
                }
                
                let material = new Material();
                //if (object.material.map !== null) {
                //    const texture = new WTTexture();
                //    texture.data = object.material.map.image;
                //    material = new Material(texture);
                //} else {
                //    material = new Material();
                //}
    
                const model = new MeshModel(mesh, material);
                scene.add(model);
            }
        });

        return scene;
    }

    private static m_gltfScene: THREE.Scene;
    private static m_loader: GLTFLoader;
    private constructor() {}
}

export { WTGLTFLoader };