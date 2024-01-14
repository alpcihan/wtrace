import { Mesh } from "../core/objects/model/mesh";
import { OBJLoader } from "./obj-loader";

class MeshLoader {
    public static async load(path: string): Promise<Mesh | undefined> {
        // TODO: check file extension
        let vertices: Float32Array | undefined = await OBJLoader.load(path);

        if (vertices === undefined) {
            console.error("Mesh loader failed to load (%s).", path);
            return undefined;
        }

        let mesh: Mesh = new Mesh();
        mesh.vertices = vertices;

        return mesh;
    }
}

export { MeshLoader };
