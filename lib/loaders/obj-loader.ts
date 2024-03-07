import * as THREEOBJLoader from "three/examples/jsm/loaders/OBJLoader";

class OBJLoader {
    public static async load(path: string): Promise<[vertices: Float32Array | undefined, uvs: Float32Array | undefined, normals: Float32Array | undefined]> {
        if (this.m_loader === undefined) this.m_loader = new THREEOBJLoader.OBJLoader();

        var triangleVertices: Float32Array | undefined = undefined;
        var triangleUVs: Float32Array | undefined = undefined;
        var triangleNormals: Float32Array | undefined = undefined;

        var object = await this.m_loader.loadAsync(path); // TODO: do not block

        object.children.forEach(meshMap => {
            const mesh = meshMap as THREE.Mesh;
            const geometry = mesh.geometry;
            const attributes = geometry.attributes;
            if (triangleVertices === undefined) {
                triangleVertices = new Float32Array(attributes.position.array);
            }
            else{
                triangleVertices = new Float32Array([...triangleVertices, ...new Float32Array(attributes.position.array)]);
            }
            if(attributes.uv) {
                if(triangleUVs === undefined) {
                    triangleUVs = new Float32Array(attributes.uv.array);
                }
                else {
                    triangleUVs = new Float32Array([...triangleUVs, ...new Float32Array(attributes.uv.array)]);
                }
            }
            if(attributes.normal) {
                if(triangleNormals === undefined) {
                    triangleNormals = new Float32Array(attributes.normal.array);
                }
                else {
                    triangleNormals = new Float32Array([...triangleNormals, ...new Float32Array(attributes.normal.array)]);
                }
            }
        });

        return [triangleVertices,triangleUVs,triangleNormals];
    }
    private static m_loader: THREEOBJLoader.OBJLoader;

    private constructor() {}
}

export { OBJLoader };