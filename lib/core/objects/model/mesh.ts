class Mesh {
    // TODO: add input data
    constructor() {
        this.id = Mesh.m_idCount++;
        
        // TODO: auto generate the undefined data
        this.points = new Float32Array();
        this.normals = new Float32Array();
        this.uvs = new Float32Array();
    }

    public readonly id: number;

    public points: Float32Array;
    public normals: Float32Array;
    public uvs: Float32Array;

    private static m_idCount: number = 0; // TODO: use uuid from parent class
}

export { Mesh };
