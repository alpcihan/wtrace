import { Mesh } from "../core/objects/mesh";
import { OBJLoader } from "./obj-loader";
import * as utils from './load_utils';

class MeshLoader {
    public static async load(pathOrID:string, points?:Float32Array, normals?:Float32Array, uvs?:Float32Array, indices?:Uint32Array)
    : Promise<Mesh | undefined> 
    {
        if (pathOrID === '') {
            console.error("The path or ID is empty. Please provide a valid entry.");
            return undefined;
        }

        if (pathOrID.endsWith(".obj")) {
            return MeshLoader.loadFromObj(pathOrID);
        }
        
        if(points === undefined || normals === undefined){
            console.error("For meshes not loaded through a file, both 'points' and 'normals' must be provided.")
            return undefined;
        }
        if(indices === undefined) {
                return MeshLoader.loadNonIndexed(pathOrID, points, normals, uvs);
        } else {
                return MeshLoader.loadIndexed(pathOrID, indices, points, normals, uvs);
        }
    }

    private static async loadFromObj(path: string): Promise<Mesh | undefined> 
    {
        const obj = await OBJLoader.load(path);
        if(obj === undefined) {
            console.error(`Mesh loader failed to load (${path}).`);
            return undefined;
        }

        const [points, normals, uvs] = obj;
        return MeshLoader.loadNonIndexed(path, points, normals, uvs);
    }

    private static async loadNonIndexed(meshID:string, points:Float32Array, normals:Float32Array, uvs?:Float32Array)
    : Promise<Mesh | undefined> 
    {
        let mesh: Mesh = new Mesh(meshID);
        mesh.points = points;
        mesh.normals = normals;
        
        return mesh;
    }
    
    private static async loadIndexed(meshID:string, indices:Uint32Array, points:Float32Array, normals:Float32Array, uvs?:Float32Array)
    : Promise<Mesh | undefined> 
    {
        const mesh = new Mesh(meshID);
    
        mesh.points = points;
        mesh.normals = normals;
        mesh.indices = indices;
        
        return mesh;
    }
}

export { MeshLoader };
