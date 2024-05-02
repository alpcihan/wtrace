import * as THREE from "three";
import { Object3DType } from "./object-3d-types";

abstract class Object3D {
    public constructor() {
        this.id = Object3D._id++;

        this.m_position = new THREE.Vector3();
        this.m_euler = new THREE.Euler();
        this.m_rotation = new THREE.Quaternion();
        this.m_scale = new THREE.Vector3(1,1,1);
        this.m_transform = new THREE.Matrix4();

        this.m_isInvTransformUpdated = false;
    }

    public readonly id: number;
    public abstract readonly type: Object3DType;

    // getters

    public get position(): Readonly<THREE.Vector3> {
        return this.m_position;
    }

    public get euler(): Readonly<THREE.Euler> {
        return this.m_euler;
    }

    public get scale(): Readonly<THREE.Vector3> {
        return this.m_scale;
    }

    public get transform(): Readonly<THREE.Matrix4> {
        return this.m_transform;
    }

    public get invTransform(): Readonly<THREE.Matrix4> {
        if(this.m_isInvTransformUpdated) {
            this.m_invTransform = this.m_transform.clone().invert();
            this.m_isInvTransformUpdated = true;
        }

        return this.m_invTransform;
    }

    // setters

    public set position(position: THREE.Vector3) {
        this.m_position = position.clone();
        this._updateTransform();
    }

    public set euler(euler: THREE.Euler) {
        this.m_euler = euler.clone();
        this.m_rotation.setFromEuler(this.m_euler);
        this._updateTransform();
    }

    public set scale(scale: THREE.Vector3) {
        this.m_scale = scale.clone();
        this._updateTransform();
    }

    private m_position: THREE.Vector3;
    private m_euler: THREE.Euler;
    private m_rotation: THREE.Quaternion;
    private m_scale: THREE.Vector3;
    private m_transform: THREE.Matrix4;
    private m_invTransform: THREE.Matrix4;
    private m_isInvTransformUpdated: boolean;

    private _updateTransform(): void {
        this.m_transform.compose(this.m_position, this.m_rotation, this.m_scale);
        this.m_isInvTransformUpdated = false;
    }

    private static _id: number = 0;
}

export { Object3D };
