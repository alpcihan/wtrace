import { Mesh } from "../core/objects/model/mesh";
import { OBJLoader } from "./obj-loader";

class MeshLoader {
    public static async load(path: string): Promise<Mesh | undefined> {
        // TODO: check file extension
        let points: Float32Array | undefined = await OBJLoader.load(path);

        if (points === undefined) {
            console.error("Mesh loader failed to load (%s).", path);
            return undefined;
        }

        let mesh: Mesh = new Mesh();
        mesh.points = points;

        return mesh;
    }
}

export { MeshLoader };
