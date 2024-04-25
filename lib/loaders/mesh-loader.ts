import { Mesh } from "../core/objects/model/mesh";
import { OBJLoader } from "./obj-loader";
import * as utils from './load_utils';
import { Console } from "console";

class MeshLoader {
    public static async load(path: string): Promise<Mesh | undefined> {
        // TODO: check file extension
        // load file
        let obj = await OBJLoader.load(path);
        if(obj === undefined) {
            console.error("Mesh loader failed to load (%s).", path);
            return undefined;
        } 

        let [points, normals, uvs] = obj;
        
        let mesh: Mesh = new Mesh();
        mesh.points = points;
        mesh.uvs = uvs;
        if(normals.length <= 0){
            await utils.populateNormals(mesh);
            console.log("Normals populated.");
        }
        else{
            console.log("Normals already loaded.");
            mesh.normals = normals;
        }

        return mesh;
    }
}

export { MeshLoader };
