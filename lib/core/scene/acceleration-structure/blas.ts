import * as THREE from "three";

interface BLASNode {
    leftFirst: number;
    triangleCount: number;
    aabb: THREE.Box3;
}

const BLAS_NODE_SIZE: number = 12; // 12 floats
const BLAS_NODE_BYTE_SIZE: number = 1 * 4 + // leftFirst (float)
                                    1 * 4 + // triangleCount (float)
                                    2 * 4 + // padding
                                    3 * 4 + // aabb min (float3)
                                    1 * 4 + // padding
                                    3 * 4 + // aabb max (float3)
                                    1 * 4   // padding

class BLAS {
    public constructor(points: Float32Array) {
        this.m_points = points;

        let N: number = this.m_points.length / 9;
        this.m_nodes = new Array<BLASNode>(N * 2 - 1);
        this.m_centroids = new Float32Array(N * 3);
        this.m_triangleIndices = new Uint32Array(N);
        this.m_nodeCount = 1;

        this._buildBLAS();
    }

    public get nodes(): Readonly<Array<BLASNode>> {
        return this.m_nodes;
    }

    public get triangleIndices(): Readonly<Uint32Array> {
        return this.m_triangleIndices;
    }

    public writeNodesToArray(target: Float32Array, nodeOffset: number = 0, triangleIdxOffset: number = 0): void {
        this.m_nodes.forEach((node, i) => {            
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 0] = node.triangleCount > 0 ? node.leftFirst + triangleIdxOffset : node.leftFirst + nodeOffset;
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 1] = node.triangleCount;
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 2] = 0.0; // padding
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 3] = 0.0; // padding
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 4] = node.aabb.min.x;
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 5] = node.aabb.min.y;
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 6] = node.aabb.min.z;
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 7] = 0.0; // padding
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 8] = node.aabb.max.x;
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 9] = node.aabb.max.y;
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 10] = node.aabb.max.z;
            target[(nodeOffset + i) * BLAS_NODE_SIZE + 11] = 0.0; // padding
        });
    }

    public writeTriangleIndicesToArray(target: Uint32Array, triangleIdxOffset: number = 0) {
        this.m_triangleIndices.forEach((triangleIdx, i) => {
            target[triangleIdxOffset + i] = triangleIdxOffset + triangleIdx ;
        });
    }

    private m_points: Float32Array; // TODO: pack triangle data
    private m_nodes: Array<BLASNode>;
    private m_centroids: Float32Array;
    private m_rootNodeIdx: number = 0;
    private m_nodeCount: number = 0;
    private m_triangleIndices: Uint32Array;

    private _buildBLAS(): void {
        // set initial triangle indices
        for (let i = 0; i < this.m_triangleIndices.length; i++) {
            this.m_triangleIndices[i] = i;
        }

        // set centroids
        for (let i = 0; i < this.m_triangleIndices.length; i++) {
            // traverse triangles (as much as triangle count)
            let v0 = new Float32Array([
                this.m_points[i * 9 + 0],
                this.m_points[i * 9 + 1],
                this.m_points[i * 9 + 2],
            ]);
            let v1 = new Float32Array([
                this.m_points[i * 9 + 3],
                this.m_points[i * 9 + 4],
                this.m_points[i * 9 + 5],
            ]);
            let v2 = new Float32Array([
                this.m_points[i * 9 + 6],
                this.m_points[i * 9 + 7],
                this.m_points[i * 9 + 8],
            ]);

            this.m_centroids[i * 3 + 0] = (v0[0] + v1[0] + v2[0]) / 3.0;
            this.m_centroids[i * 3 + 1] = (v0[1] + v1[1] + v2[1]) / 3.0;
            this.m_centroids[i * 3 + 2] = (v0[2] + v1[2] + v2[2]) / 3.0;
        }

        this.m_nodes[this.m_rootNodeIdx] = {
            leftFirst: 0,
            triangleCount: this.m_triangleIndices.length,
            aabb: new THREE.Box3(),
        };

        this._updateAABBs(this.m_rootNodeIdx);
        this._subdivideNode(this.m_rootNodeIdx);

        this.m_nodes.splice(this.m_nodeCount); // only keep the used nodes
    }

    private _updateAABBs(nodeIdx: number): void {
        let node = this.m_nodes[nodeIdx];
        let first = node.leftFirst;

        let V0, V1, V2: THREE.Vector3;
        V0 = new THREE.Vector3();
        V1 = new THREE.Vector3();
        V2 = new THREE.Vector3();

        for (let i = 0; i < node.triangleCount; i++) {
            let triIdx = this.m_triangleIndices[first + i];

            V0.set(
                this.m_points[triIdx * 9 + 0],
                this.m_points[triIdx * 9 + 1],
                this.m_points[triIdx * 9 + 2]
            ); 

            V1.set(
                this.m_points[triIdx * 9 + 3],
                this.m_points[triIdx * 9 + 4],
                this.m_points[triIdx * 9 + 5]
            ); 

            V2.set(
                this.m_points[triIdx * 9 + 6],
                this.m_points[triIdx * 9 + 7],
                this.m_points[triIdx * 9 + 8]
            ); 

            // nodes
            node.aabb.min.min(V0); 
            node.aabb.min.min(V1); 
            node.aabb.min.min(V2); 

            node.aabb.max.max(V0); 
            node.aabb.max.max(V1); 
            node.aabb.max.max(V2); 
        }

        this.m_nodes[nodeIdx] = node;
    }

    private _subdivideNode(nodeIdx: number): void {
        let node = this.m_nodes[nodeIdx];

        if (node.triangleCount <= 2) {
            return;
        }

        // find split axis
        const extent: THREE.Vector3 = node.aabb.max.clone().sub(node.aabb.min); 
        let axis = 0;
        if (extent.y > extent.x) {
            axis = 1;
        } else if (extent.z > extent.getComponent(axis)) {
            axis = 2;
        }

        let splitPos = node.aabb.min.getComponent(axis) + extent.getComponent(axis) / 2;

        // Quicksort triangles based on split axis
        let i = node.leftFirst;
        let j = i + node.triangleCount - 1;

        while (i <= j) {
            let triIdx = this.m_triangleIndices[i];
            let centroid: Float32Array = this._getCentroid(triIdx);
            if (centroid[axis] < splitPos) {
                i++;
            } else {
                let tmp = this.m_triangleIndices[i];
                this.m_triangleIndices[i] = this.m_triangleIndices[j];
                this.m_triangleIndices[j] = tmp;
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

        this.m_nodes[leftChildIdx] = {
            leftFirst: node.leftFirst,
            triangleCount: leftCount,
            aabb: new THREE.Box3
        };

        this.m_nodes[rightChildIdx] = {
            leftFirst: i,
            triangleCount: node.triangleCount - leftCount,
            aabb: new THREE.Box3
        };

        node.leftFirst = leftChildIdx;
        node.triangleCount = 0;
        this.m_nodes[nodeIdx] = node;

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

export { BLAS, BLAS_NODE_SIZE };
