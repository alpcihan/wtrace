import { Mesh } from '../wtrace';
import * as THREE from 'three';


export async function populateNormals(mesh: Mesh) {
    mesh.normals = new Float32Array(mesh.points.length);
    for(let i = 0; i < mesh.points.length; i+=9) {
        let v0: THREE.Vector3 = new THREE.Vector3(mesh.points[i], mesh.points[i+1], mesh.points[i+2]);
        let v1: THREE.Vector3 = new THREE.Vector3(mesh.points[i+3], mesh.points[i+4], mesh.points[i+5]);
        let v2: THREE.Vector3 = new THREE.Vector3(mesh.points[i+6], mesh.points[i+7], mesh.points[i+8]);
        let n: THREE.Vector3 = (v1.clone().sub(v0)).cross(v2.clone().sub(v0)).normalize();
        
        mesh.normals.set([n.x, n.y, n.z], i);
        mesh.normals.set([n.x, n.y, n.z], i+3);
        mesh.normals.set([n.x, n.y, n.z], i+6);
    }
}