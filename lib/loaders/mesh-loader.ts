import { Mesh } from "../core/objects/model/mesh";
import { OBJLoader } from "./obj-loader";

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
        mesh.normals = normals;
        mesh.uvs = uvs;
        
        return mesh;
    }
}

export { MeshLoader };
