import * as THREEOBJLoader from "three/examples/jsm/loaders/OBJLoader";

class OBJLoader {
    public static async load(path: string): Promise<[vertices: Float32Array, normals: Float32Array, uvs: Float32Array] | undefined> {
        if (this.m_loader === undefined) this.m_loader = new THREEOBJLoader.OBJLoader();

        var vertices: Float32Array = new Float32Array();
        var normals: Float32Array = new Float32Array();
        var uvs: Float32Array = new Float32Array();

        var object = await this.m_loader.loadAsync(path); // TODO: do not block
        if(object === undefined) return undefined;

        object.children.forEach(meshMap => {
            const mesh = meshMap as THREE.Mesh;
            const geometry = mesh.geometry;
            const attributes = geometry.attributes;

            if(attributes.position)
                vertices = new Float32Array([...vertices, ...new Float32Array(attributes.position.array)]);

            if(attributes.normal)
                normals = new Float32Array([...normals, ...new Float32Array(attributes.normal.array)]);

            if(attributes.uv)
                uvs = new Float32Array([...uvs, ...new Float32Array(attributes.uv.array)]);
        });

        return [vertices, normals, uvs];
    }
    private static m_loader: THREEOBJLoader.OBJLoader;

    private constructor() {}
}

export { OBJLoader };
