import * as THREE from "three";

const BVHNodeSize = 4+4+12+12; //leftChild + triangleCount + AABBMins + AABBMaxs = 32 bytes
interface BVHNode {
    leftFirst: number;          //4 bytes
    triangleCount: number;      //4 bytes
    AABBMins: THREE.Vector3;    //12 bytes
    AABBMaxs: THREE.Vector3;    //12 bytes
}

const FLT_MAX = 3.402823466e+38;

class BVH {
    
    public constructor() {
        this.m_BVHNodes = new Array<BVHNode>();
        this.m_triangleIdx = new Uint32Array();

    }
    public build(vertices: Float32Array): void {
        this.m_triangles = vertices;

        let N = vertices.length / 9; //triangle count
        console.log(N);
        this.m_BVHNodes = new Array<BVHNode>((N*2-1));
        this.m_centroids = new Array<THREE.Vector3>(N);
        this.m_triangleIdx = new Uint32Array(N);
        this.m_nodeCount = 1;
        this._buildBVH();
    }

    public getBVHNodeBuffer(): ArrayBuffer {
        //console.log("\nNode count: " + this.m_nodeCount);
        let buffer = new ArrayBuffer(this.m_nodeCount * BVHNodeSize);
        let view = new DataView(buffer);

       for(let i = 0; i < this.m_nodeCount; i++) {
          let node = this.m_BVHNodes[i];
          view.setUint32(i*BVHNodeSize + 0, node.leftFirst, true);
          view.setUint32(i*BVHNodeSize + 4, node.triangleCount, true);
          view.setFloat32(i*BVHNodeSize + 8, node.AABBMins.x, true);
          view.setFloat32(i*BVHNodeSize + 12, node.AABBMins.y, true);
          view.setFloat32(i*BVHNodeSize + 16, node.AABBMins.z, true);
          view.setFloat32(i*BVHNodeSize + 20, node.AABBMaxs.x, true);
          view.setFloat32(i*BVHNodeSize + 24, node.AABBMaxs.y, true);
          view.setFloat32(i*BVHNodeSize + 28, node.AABBMaxs.z, true);
       }

        return buffer;
    }

    public getBVHNodeBufferSize(): number {
        return this.m_BVHNodes.length * BVHNodeSize;
    }
        

    public getTriangleIdxBuffer(): Uint32Array {
        return this.m_triangleIdx;
    }

    private minVec3(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
        return new THREE.Vector3(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
    }

    private maxVec3(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
        return new THREE.Vector3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
    }

    private _updateAABBs(nodeIdx: number): void {

        let node = this.m_BVHNodes[nodeIdx];
        node.AABBMins = new THREE.Vector3(FLT_MAX,FLT_MAX,FLT_MAX);
        node.AABBMaxs = new THREE.Vector3(-FLT_MAX,-FLT_MAX,-FLT_MAX);
        let first = node.leftFirst;

        for( let i = 0; i < node.triangleCount; i++) {
            let triIdx = this.m_triangleIdx[first+i];

            let V0 = new THREE.Vector3(this.m_triangles[triIdx*9+0], this.m_triangles[triIdx*9+1], this.m_triangles[triIdx*9+2]);
            let V1 = new THREE.Vector3(this.m_triangles[triIdx*9+3], this.m_triangles[triIdx*9+4], this.m_triangles[triIdx*9+5]);
            let V2 = new THREE.Vector3(this.m_triangles[triIdx*9+6], this.m_triangles[triIdx*9+7], this.m_triangles[triIdx*9+8]);

            node.AABBMins = this.minVec3(node.AABBMins, V0);
            node.AABBMins = this.minVec3(node.AABBMins, V1);
            node.AABBMins = this.minVec3(node.AABBMins, V2);

            node.AABBMaxs = this.maxVec3(node.AABBMaxs, V0);
            node.AABBMaxs = this.maxVec3(node.AABBMaxs, V1);
            node.AABBMaxs = this.maxVec3(node.AABBMaxs, V2);
        }
        
        this.m_BVHNodes[nodeIdx] = node;
    }

    private _subdivideNode(nodeIdx: number): void {
        let node = this.m_BVHNodes[nodeIdx];

        //console.log("nodeIdx: " + nodeIdx + "\n\ttriangleCount: " + node.triangleCount);
        if(node.triangleCount <= 2) {
            return;
        }

        //find split axis
        let extent = node.AABBMaxs.sub(node.AABBMins);
        let axis = 0;
        if(extent.y > extent.x && extent.y > extent.z) {
            axis = 1;
        }
        else if(extent.z > extent.x && extent.z > extent.y) {
            axis = 2;
        }
        
        let splitPos = node.AABBMins.getComponent(axis) + extent.getComponent(axis) / 2;
        //console.log("\n\t splitPos: " + splitPos + "\n\t axis: " + axis + "\n\t extent: " + extent.x + ", " + extent.y + ", " + extent.z);
        //Quicksort triangles based on split axis
        let i = node.leftFirst;
        let j = i + node.triangleCount - 1;

        while(i<=j) {
            let triIdx = this.m_triangleIdx[i];
            let centroid = this.m_centroids[triIdx];
            if(centroid.getComponent(axis) < splitPos) {
                i++;
            }
            else {
                let tmp = this.m_triangleIdx[i];
                this.m_triangleIdx[i] = this.m_triangleIdx[j];
                this.m_triangleIdx[j] = tmp;
                j--;
            }
        }

        //abort if one side is empty
        let leftCount = i - node.leftFirst;
        if(leftCount == 0 || leftCount == node.triangleCount) {
            //console.log("\n\t leftCount: " + leftCount + "rightCount: " + (node.triangleCount - leftCount));
            return;
        }

        //create child nodes
        let leftChildIdx = this.m_nodeCount;
        this.m_nodeCount++;
        let rightChildIdx = this.m_nodeCount;
        this.m_nodeCount++;

        this.m_BVHNodes[leftChildIdx] = {
            leftFirst: node.leftFirst,
            triangleCount: leftCount,
            AABBMins: new THREE.Vector3(),
            AABBMaxs: new THREE.Vector3()
        };
        this.m_BVHNodes[rightChildIdx] = {
            leftFirst: i,
            triangleCount: node.triangleCount - leftCount,
            AABBMins: new THREE.Vector3(),
            AABBMaxs: new THREE.Vector3()
        };

        node.leftFirst = leftChildIdx;
        node.triangleCount = 0;
        this.m_BVHNodes[nodeIdx] = node;

        this._updateAABBs(leftChildIdx);
        this._updateAABBs(rightChildIdx);

        //recurse
        this._subdivideNode(leftChildIdx);
        this._subdivideNode(rightChildIdx);
    }
    private _printBVH(): void {
        for(let i = 0; i < this.m_nodeCount; i++) {
            let node = this.m_BVHNodes[i];
            console.log("nodeIdx: " + i + "\n\tleftFirst: " + node.leftFirst + "\n\ttriangleCount: " + node.triangleCount);

            //print triangles of bvh 
            for(let first = node.leftFirst, i=0; i < node.triangleCount; i++) {
                let triIdx = this.m_triangleIdx[first+i];
                console.log("\t\ttriIdx: " + triIdx);
            }

            console.log("\tAABBMins: " + node.AABBMins.x + ", " + node.AABBMins.y + ", " + node.AABBMins.z);
            console.log("\tAABBMaxs: " + node.AABBMaxs.x + ", " + node.AABBMaxs.y + ", " + node.AABBMaxs.z);
        }
    }

    private _buildBVH(): void {
        
        //set initial triangle indices
        for(let i = 0; i < this.m_triangleIdx.length; i++) {
            this.m_triangleIdx[i] = i;
        }

        for(let i = 0; i < this.m_centroids.length; i++) {
            this.m_centroids[i] = new THREE.Vector3();
        }

        //set centroids
        for(let i = 0; i < this.m_centroids.length; i++) {
            let v0 = new THREE.Vector3(this.m_triangles[i*9+0], this.m_triangles[i*9+1], this.m_triangles[i*9+2]);
            let v1 = new THREE.Vector3(this.m_triangles[i*9+3], this.m_triangles[i*9+4], this.m_triangles[i*9+5]);
            let v2 = new THREE.Vector3(this.m_triangles[i*9+6], this.m_triangles[i*9+7], this.m_triangles[i*9+8]);

            this.m_centroids[i] = v0.add(v1).add(v2).divideScalar(3);
        }

        console.log("triangleCount: " + this.m_triangleIdx.length);
        

        this.m_BVHNodes[this.m_rootNodeIdx] = {
            leftFirst: 0,
            triangleCount: this.m_triangleIdx.length,
            AABBMins: new THREE.Vector3(),
            AABBMaxs: new THREE.Vector3()
        };

        this._updateAABBs(this.m_rootNodeIdx);
        this._subdivideNode(this.m_rootNodeIdx);
        this._printBVH();
    }

    
    private m_triangles: Float32Array;
    private m_BVHNodes: Array<BVHNode>;
    private m_centroids: THREE.Vector3[];
    private m_rootNodeIdx: number = 0;
    private m_nodeCount: number = 0;
    private m_triangleIdx: Uint32Array;
    private m_minimumTriangleLocation: THREE.Vector3;
}

export { BVH };