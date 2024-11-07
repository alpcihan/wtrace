class Mesh {
    // TODO: add input data
    constructor(path:string) {
        this.id = path;
        
        // TODO: auto generate the undefined data
        this.indices = new Uint32Array();
        this.points = new Float32Array();
        this.normals = new Float32Array();
        this.uvs = new Float32Array();
    }

    public readonly id: string;

    public indices: Uint32Array;
    public points: Float32Array;
    public normals: Float32Array;
    public uvs: Float32Array;

    private static m_idCount: number = 0; // TODO: use uuid from parent class
}

export { Mesh };
