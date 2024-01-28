import * as THREE from "three";
import { Object3DType } from "./object-types";

abstract class Object3D {
    public constructor(transform?: THREE.Matrix4) {
        this.id = Object3D._id++;
        this.transform = transform ? transform.clone() : new THREE.Matrix4();
        this.invTransform = this.transform.clone().invert();
    }

    public readonly id: number;
    public abstract readonly type: Object3DType;

    public readonly transform: THREE.Matrix4;
    public readonly invTransform: THREE.Matrix4;

    private static _id: number = 0;
}

export { Object3D };
