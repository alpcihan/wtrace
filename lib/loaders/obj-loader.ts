import * as THREEOBJLoader from "three/examples/jsm/loaders/OBJLoader";

class OBJLoader {
    public static async load(path: string): Promise<[vertices: Float32Array | undefined, uvs: Float32Array | undefined]> {
        if (this.m_loader === undefined) this.m_loader = new THREEOBJLoader.OBJLoader();

        var triangleVertices: Float32Array | undefined = undefined;
        var triangleUVs: Float32Array | undefined = undefined;

        var object = await this.m_loader.loadAsync(path); // TODO: do not block

        object.children.forEach(meshMap => {
            const mesh = meshMap as THREE.Mesh;
            const geometry = mesh.geometry;
            const attributes = geometry.attributes;
            if (triangleVertices === undefined) {
                triangleVertices = new Float32Array(attributes.position.array);
            }
            if(triangleUVs === undefined) {
                triangleUVs = new Float32Array(attributes.uv.array);
            }
            else {
                triangleVertices = new Float32Array([...triangleVertices, ...new Float32Array(attributes.position.array)]);
                triangleUVs = new Float32Array([...triangleUVs, ...new Float32Array(attributes.uv.array)]);
            }
        });

        return [triangleVertices,triangleUVs];
    }
    private static m_loader: THREEOBJLoader.OBJLoader;

    private constructor() {}
}

export { OBJLoader };
