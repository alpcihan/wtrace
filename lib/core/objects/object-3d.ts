import { Object3DType } from "./object-types";

abstract class Object3D {
    public constructor() {
        this.id = Object3D._id++;
    }

    public readonly id: number;
    public abstract readonly type: Object3DType;

    private static _id: number = 0;
}

export { Object3D };
