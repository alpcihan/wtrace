import * as THREE from "three";

const FLT_MAX = 3.402823466e38;
const BVHNodeSizeAsFloats = 12; // 12 floats

interface BVHNode {
    leftFirst: number;
    triangleCount: number;
    bound: THREE.Box3;
}

class BVH {
    public constructor(transform: THREE.Matrix4) {
        this.m_BVHNodes = new Array<BVHNode>();
        this.m_triangleIdx = new Uint32Array();
    }

    public build(vertices: Float32Array): void {
        this.m_triangles = vertices;

        let N: number = vertices.length / 9; // triangle count
        this.m_BVHNodes = new Array<BVHNode>(N * 2 - 1);
        this.m_centroids = new Float32Array(N * 3);
        this.m_triangleIdx = new Uint32Array(N);
        this.m_nodeCount = 1;
        this._buildBVH();
    }

    public getBVHNodeBuffer(): Float32Array {
        const bvhNodeBuffer = new Float32Array(this.m_nodeCount * BVHNodeSizeAsFloats);

        this.m_BVHNodes.forEach((node, i) => {
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 0] = node.leftFirst;
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 1] = node.triangleCount;
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 2] = 0.0; //padding
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 3] = 0.0; //padding
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 4] = node.bound.min.x;
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 5] = node.bound.min.y;
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 6] = node.bound.min.z;
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 7] = 0.0; //padding
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 8] = node.bound.max.x;
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 9] = node.bound.max.y;
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 10] = node.bound.max.z;
            bvhNodeBuffer[i * BVHNodeSizeAsFloats + 11] = 0.0; //padding
        });

        return bvhNodeBuffer;
    }

    public getTriangleIdxBuffer(): Uint32Array {
        return this.m_triangleIdx;
    }

    private m_triangles: Float32Array;
    private m_BVHNodes: Array<BVHNode>;
    private m_centroids: Float32Array;
    private m_rootNodeIdx: number = 0;
    private m_nodeCount: number = 0;
    private m_triangleIdx: Uint32Array;

    private _buildBVH(): void {
        // set initial triangle indices
        for (let i = 0; i < this.m_triangleIdx.length; i++) {
            this.m_triangleIdx[i] = i;
        }

        // set centroids
        for (let i = 0; i < this.m_triangleIdx.length; i++) {
            // traverse triangles (as much as triangle count)
            let v0 = new Float32Array([
                this.m_triangles[i * 9 + 0],
                this.m_triangles[i * 9 + 1],
                this.m_triangles[i * 9 + 2],
            ]);
            let v1 = new Float32Array([
                this.m_triangles[i * 9 + 3],
                this.m_triangles[i * 9 + 4],
                this.m_triangles[i * 9 + 5],
            ]);
            let v2 = new Float32Array([
                this.m_triangles[i * 9 + 6],
                this.m_triangles[i * 9 + 7],
                this.m_triangles[i * 9 + 8],
            ]);

            this.m_centroids[i * 3 + 0] = (v0[0] + v1[0] + v2[0]) / 3.0;
            this.m_centroids[i * 3 + 1] = (v0[1] + v1[1] + v2[1]) / 3.0;
            this.m_centroids[i * 3 + 2] = (v0[2] + v1[2] + v2[2]) / 3.0;
        }

        this.m_BVHNodes[this.m_rootNodeIdx] = {
            leftFirst: 0,
            triangleCount: this.m_triangleIdx.length,
            bound: new THREE.Box3(),
        };

        this._updateAABBs(this.m_rootNodeIdx);
        this._subdivideNode(this.m_rootNodeIdx);
    }

    private _updateAABBs(nodeIdx: number): void {
        let node = this.m_BVHNodes[nodeIdx];
        let first = node.leftFirst;

        let V0, V1, V2: THREE.Vector3;
        V0 = new THREE.Vector3();
        V1 = new THREE.Vector3();
        V2 = new THREE.Vector3();

        for (let i = 0; i < node.triangleCount; i++) {
            let triIdx = this.m_triangleIdx[first + i];

            V0.set(
                this.m_triangles[triIdx * 9 + 0],
                this.m_triangles[triIdx * 9 + 1],
                this.m_triangles[triIdx * 9 + 2]
            ); 

            V1.set(
                this.m_triangles[triIdx * 9 + 3],
                this.m_triangles[triIdx * 9 + 4],
                this.m_triangles[triIdx * 9 + 5]
            ); 

            V2.set(
                this.m_triangles[triIdx * 9 + 6],
                this.m_triangles[triIdx * 9 + 7],
                this.m_triangles[triIdx * 9 + 8]
            ); 

            // nodes
            node.bound.min.min(V0); 
            node.bound.min.min(V1); 
            node.bound.min.min(V2); 

            node.bound.max.max(V0); 
            node.bound.max.max(V1); 
            node.bound.max.max(V2); 
        }

        this.m_BVHNodes[nodeIdx] = node;
    }

    private _subdivideNode(nodeIdx: number): void {
        let node = this.m_BVHNodes[nodeIdx];

        if (node.triangleCount <= 2) {
            return;
        }

        // find split axis
        const extent: THREE.Vector3 = node.bound.max.clone().sub(node.bound.min); 
        let axis = 0;
        if (extent.y > extent.x) {
            axis = 1;
        } else if (extent.z > extent.getComponent(axis)) {
            axis = 2;
        }

        let splitPos = node.bound.min.getComponent(axis) + extent.getComponent(axis) / 2;

        // Quicksort triangles based on split axis
        let i = node.leftFirst;
        let j = i + node.triangleCount - 1;

        while (i <= j) {
            let triIdx = this.m_triangleIdx[i];
            let centroid: Float32Array = this._getCentroid(triIdx);
            if (centroid[axis] < splitPos) {
                i++;
            } else {
                let tmp = this.m_triangleIdx[i];
                this.m_triangleIdx[i] = this.m_triangleIdx[j];
                this.m_triangleIdx[j] = tmp;
                j--;
            }
        }

        //abort if one side is empty
        let leftCount = i - node.leftFirst;
        if (leftCount == 0 || leftCount == node.triangleCount) {
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
            bound: new THREE.Box3
        };

        this.m_BVHNodes[rightChildIdx] = {
            leftFirst: i,
            triangleCount: node.triangleCount - leftCount,
            bound: new THREE.Box3
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

    private _getCentroid(triIdx: number): Float32Array {
        return new Float32Array([
            this.m_centroids[triIdx * 3 + 0],
            this.m_centroids[triIdx * 3 + 1],
            this.m_centroids[triIdx * 3 + 2],
        ]);
    }
}

export { BVH };
