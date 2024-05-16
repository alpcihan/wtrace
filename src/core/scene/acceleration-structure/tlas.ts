import * as THREE from "three";
import { BLAS } from "./blas";
import { BLASInstance } from "./blas-instance";

const TLAS_NODE_SIZE: number =  4 * 4 + // aabb min (float3) + padding
                                4 * 4 + // aabb max (float3) + padding
                                4 +     // left (int)
                                4 +     // right (int)
                                4 +     // blas (int)
                                4;      // padding
                                // = 48 bytes

interface TLASNode {
    aabb: THREE.Box3,
    left: number,
    right: number,
    blas: number, //Instance index which holds blas information
};

class TLAS {
    public constructor(
        blasInstances: Array<BLASInstance>,
        blasOffsetToMeshId: Map<number, number>,
        meshIDToBLAS: Map<number, BLAS>) {
        
        this.m_blasInstances = blasInstances;
        this.m_tlasNodes = new Array<TLASNode>(blasInstances.length * 2);
        this.m_nodeUsed = 1; // keep root node empty()
        this.m_offsetToMeshId = blasOffsetToMeshId;
        this.m_meshIDtoBLAS = meshIDToBLAS;
        this._build();
    }

    public get nodes(){
        return this.m_tlasNodes;
    }

    public writeNodesToArray(target: ArrayBuffer){
        this.m_tlasNodes.forEach((node, idx) => {
            let aabbMinArrayF32: Float32Array = new Float32Array(target, idx * TLAS_NODE_SIZE + 0, 4); // padding
            let aabbMaxArrayF32: Float32Array = new Float32Array(target, idx * TLAS_NODE_SIZE + 16, 4);// padding
            let leftArrayU32: Uint32Array = new Uint32Array(target, idx * TLAS_NODE_SIZE + 32, 1);
            let rightArrayU32: Uint32Array = new Uint32Array(target, idx * TLAS_NODE_SIZE + 36, 1);
            let blasIdxArrayU32: Uint32Array = new Uint32Array(target, idx * TLAS_NODE_SIZE + 40, 2); // padding

            aabbMinArrayF32.set([node.aabb.min.x, node.aabb.min.y, node.aabb.min.z, 0]);
            aabbMaxArrayF32.set([node.aabb.max.x, node.aabb.max.y, node.aabb.max.z, 0]);
            leftArrayU32.set([node.left]);
            rightArrayU32.set([node.right]);
            blasIdxArrayU32.set([node.blas, 0]);
        });
    }

    private _findBestMatch(nodeIdx: Uint32Array, nodeIndices: number, A: number){
        let smallestArea = Number.MAX_VALUE;
        let bestB: number = -1;

        for(let B = 0; B < nodeIndices; ++B ){
            if(A === B) continue;

            const bmax = this.m_tlasNodes[nodeIdx[A]].aabb.max.clone().max(this.m_tlasNodes[nodeIdx[B]].aabb.max);
            const bmin = this.m_tlasNodes[nodeIdx[A]].aabb.min.clone().min(this.m_tlasNodes[nodeIdx[B]].aabb.min);
            const e = bmax.sub(bmin);
            const surfaceArea = e.x * e.y + e.y * e.z + e.z * e.x;

            if (surfaceArea < smallestArea) {
                smallestArea = surfaceArea;
                bestB = B;
            }
        }
        return bestB;
    }

    private _build(): void {
        
        let nodeIndices = this.m_blasInstances.length;
        let nodeIdx: Uint32Array = new Uint32Array(nodeIndices);
        for(let i=0; i< this.m_blasInstances.length; ++i){
            nodeIdx[i] = this.m_nodeUsed;
            let meshID = this.m_offsetToMeshId.get(this.m_blasInstances[i].blasOffset);
            if(meshID === undefined) throw new Error("Mesh ID not found");
            let blas = this.m_meshIDtoBLAS.get(meshID);
            if(blas === undefined) throw new Error("BLAS not found");
            let blasAABB = blas.nodes[0].aabb.clone();
            let transform = this.m_blasInstances[i].transform.clone();
            blasAABB.applyMatrix4(transform);

            let tlasNode: TLASNode = {
                aabb: blasAABB,
                left: 0,
                right: 0,
                blas: i,
            };
            this.m_tlasNodes[this.m_nodeUsed] = tlasNode;
            this.m_nodeUsed++;
        }

        let A = 0;
        let B = this._findBestMatch(nodeIdx,nodeIndices,A);

        while(nodeIndices > 1){
            let C = this._findBestMatch(nodeIdx, nodeIndices, B);

            if(A === C){
                let newNode: TLASNode = {
                    aabb: this.m_tlasNodes[nodeIdx[A]].aabb.clone().union(this.m_tlasNodes[nodeIdx[B]].aabb),
                    left: nodeIdx[A],
                    right: nodeIdx[B],
                    blas: 0
                };
                this.m_tlasNodes[this.m_nodeUsed] = newNode;
                nodeIdx[A] = this.m_nodeUsed++;
                nodeIdx[B] = nodeIdx[nodeIndices - 1];
                B = this._findBestMatch(nodeIdx, --nodeIndices, A);
            }
            else{
                A = B;
                B = C;
            }
        }
        this.m_tlasNodes[0] = this.m_tlasNodes[nodeIdx[A]];
    }
    
    private m_tlasNodes: Array<TLASNode>;
    private m_offsetToMeshId: Map<number, number>;
    private m_nodeUsed: number;
    private m_blasInstances: Array<BLASInstance>;
    private m_meshIDtoBLAS: Map<number, BLAS>;
}

export { TLAS, TLAS_NODE_SIZE };