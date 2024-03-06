class Mesh {
    constructor() {
        this.id = Mesh.m_idCount++;
        
        // TODO: auto generate the undefined data
        this.uvs = undefined;
        this.normals = undefined;
    }

    public readonly id: number;

    public points: Float32Array;
    public uvs: Float32Array | undefined;
    public normals: Float32Array | undefined;

    private static m_idCount: number = 0; // TODO: use uuid from parent class
}

export { Mesh };
