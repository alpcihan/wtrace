import * as THREEOBJLoader from "three/examples/jsm/loaders/OBJLoader";

class OBJLoader {
  public static async load(path: string): Promise<Float32Array | undefined> {
    if(this.m_loader === undefined) this.m_loader = new THREEOBJLoader.OBJLoader();

    var triangleVertices: Float32Array | undefined = undefined;

    var object = await this.m_loader.loadAsync(path); // TODO: do not block

    object.children.forEach(meshMap => {
      const mesh = meshMap as THREE.Mesh;
      const geometry = mesh.geometry;
      const attributes = geometry.attributes;
      triangleVertices = attributes.position.array as Float32Array;
    });

    return triangleVertices;
  }

  private static m_loader: THREEOBJLoader.OBJLoader;

  private constructor() {}
}

export { OBJLoader };
