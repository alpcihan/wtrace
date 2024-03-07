import { Mesh } from "../core/objects/model/mesh";
import { OBJLoader } from "./obj-loader";

class MeshLoader {
    public static async load(path: string): Promise<Mesh | undefined> {
        // TODO: check file extension
        let [points, uvs, normals] = await OBJLoader.load(path);

        let mesh: Mesh = new Mesh();

        if (points === undefined) {
            console.error("Mesh loader failed to load (%s).", path);
            return undefined;
        }
        
        mesh.points = points;

        if (uvs !== undefined) {
            mesh.uvs = uvs;
        } 

        if (normals !== undefined) {
            mesh.normals = normals;
        }
        
        return mesh;
    }
}

export { MeshLoader };