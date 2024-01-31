import * as THREE from "three";
import { BLAS } from "./blas";

interface TLASNode {
    aabb: THREE.Box3,
    leftBLAS: number,
    blas: number
};

class TLAS {
    public constructor(blasList: Array<BLAS>) {
        this.m_blasList = blasList;
        this.m_tlasNodes = new Array<TLASNode>(blasList.length * 2);
    }

    public build(): void {
        this.m_tlasNodes[2].leftBLAS = 0;
        this.m_tlasNodes[2].aabb = new THREE.Box3();
        //this.m_tlasNodes[2].blasNodeCount = true;
        this.m_tlasNodes[3].leftBLAS = 1;
        this.m_tlasNodes[3].aabb = new THREE.Box3();
        //this.m_tlasNodes[3].isLeaf = true;
        
        this.m_tlasNodes[0].leftBLAS = 2;
        this.m_tlasNodes[0].aabb = new THREE.Box3();
        //this.m_tlasNodes[0].isLeaf = false;
    }

    private m_blasList: Array<BLAS>;  
    private m_tlasNodes: Array<TLASNode>;
}

export { TLAS };
