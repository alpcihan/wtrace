class Mesh {
    constructor() {
        this.id = Mesh.m_idCount++;
    }

    public readonly id: number;

    public points: Float32Array;
    public uvs: Float32Array;

    private static m_idCount: number = 0; // TODO: use uuid from parent class
}

export { Mesh };
