import { Material } from "../../material/material";
import { Object3D } from "../object-3d";
import { Object3DType } from "../object-types";
import { Mesh } from "./mesh";
import * as THREE from "three";

class MeshModel extends Object3D {
    public constructor(mesh: Mesh, material: Material) {
        super();
        this.m_mesh = mesh;
        this.m_material = material;

        if (this.m_mesh.normals.length <= 0) this._populateNormals();
    }

    public override type: Object3DType = Object3DType.MeshModel;

    // getters
    public get mesh(): Readonly<Mesh> {
        return this.m_mesh;
    }

    public get material(): Readonly<Material> {
        return this.m_material;
    }

    private m_mesh: Mesh;
    private m_material: Material;

    private _populateNormals() {
        this.m_mesh.normals = new Float32Array(this.m_mesh.points.length);
        for(let i = 0; i < this.m_mesh.points.length; i+=9) {
            let v0: THREE.Vector3 = new THREE.Vector3(this.m_mesh.points[i], this.m_mesh.points[i+1], this.m_mesh.points[i+2]);
            let v1: THREE.Vector3 = new THREE.Vector3(this.m_mesh.points[i+3], this.m_mesh.points[i+4], this.m_mesh.points[i+5]);
            let v2: THREE.Vector3 = new THREE.Vector3(this.m_mesh.points[i+6], this.m_mesh.points[i+7], this.m_mesh.points[i+8]);
            let n: THREE.Vector3 = (v1.clone().sub(v0)).cross(v2.clone().sub(v0)).normalize();
            
            this.m_mesh.normals.set([n.x, n.y, n.z], i);
            this.m_mesh.normals.set([n.x, n.y, n.z], i+3);
            this.m_mesh.normals.set([n.x, n.y, n.z], i+6);
        }
    }
}

export { MeshModel };
