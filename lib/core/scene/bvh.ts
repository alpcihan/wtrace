const FLT_MAX = 3.402823466e+38;
const BVHNodeSizeAsFloats = 12; // 12 floats

interface BVHNode {
    leftFirst: number;      // 4 bytes
    triangleCount: number;  // 4 bytes
    AABBMins: Float32Array; // 12 bytes
    AABBMaxs: Float32Array; // 12 bytes
}

class BVH {
    
    public constructor() {
        this.m_BVHNodes = new Array<BVHNode>();
        this.m_triangleIdx = new Uint32Array();
    }

    public build(vertices: Float32Array): void {
        this.m_triangles = vertices;

        let N: number = vertices.length / 9; // triangle count
        this.m_BVHNodes = new Array<BVHNode>(N*2-1);
        this.m_centroids = new Float32Array(N*3);
        this.m_triangleIdx = new Uint32Array(N);
        this.m_nodeCount = 1;
        this._buildBVH();
    }

    public getBVHNodeBuffer(): Float32Array {
       //TODO: convert bvhnodes to float32array and return
        let bvhNodeBuffer = new Float32Array(this.m_nodeCount * BVHNodeSizeAsFloats);

        for(let i = 0; i < this.m_nodeCount; i++) {
            let node = this.m_BVHNodes[i];
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+0] = node.leftFirst;
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+1] = node.triangleCount;
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+2] = 0.0; //padding
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+3] = 0.0; //padding
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+4] = node.AABBMins[0];
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+5] = node.AABBMins[1];
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+6] = node.AABBMins[2];
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+7] = 0.0; //padding
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+8] = node.AABBMaxs[0];
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+9] = node.AABBMaxs[1];
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+10] = node.AABBMaxs[2];
            bvhNodeBuffer[i*BVHNodeSizeAsFloats+11] = 0.0; //padding
        }

        return bvhNodeBuffer;
    }

    public getTriangleIdxBuffer(): Uint32Array {
        return this.m_triangleIdx;
    }

    private _minVec3(a: Float32Array, b: Float32Array): Float32Array {
        return new Float32Array([Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])]);
    }

    private _maxVec3(a: Float32Array, b: Float32Array): Float32Array {
        return new Float32Array([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])]);
    }

    private _subVec3(a: Float32Array, b: Float32Array): Float32Array {
        return new Float32Array([a[0]-b[0], a[1]-b[1], a[2]-b[2]]);
    }

    private _getCentroid(triIdx: number): Float32Array {
        return new Float32Array([this.m_centroids[triIdx*3+0], this.m_centroids[triIdx*3+1], this.m_centroids[triIdx*3+2]]);
    }

    private _updateAABBs(nodeIdx: number): void {
        
        let node = this.m_BVHNodes[nodeIdx];
        node.AABBMins = new Float32Array([FLT_MAX,FLT_MAX,FLT_MAX]);
        node.AABBMaxs = new Float32Array([-FLT_MAX,-FLT_MAX,-FLT_MAX]);
        let first = node.leftFirst;

        for( let i = 0; i < node.triangleCount; i++) {
            let triIdx = this.m_triangleIdx[first+i];

            let V0 = new Float32Array([this.m_triangles[triIdx*9+0], this.m_triangles[triIdx*9+1], this.m_triangles[triIdx*9+2]]);
            let V1 = new Float32Array([this.m_triangles[triIdx*9+3], this.m_triangles[triIdx*9+4], this.m_triangles[triIdx*9+5]]);
            let V2 = new Float32Array([this.m_triangles[triIdx*9+6], this.m_triangles[triIdx*9+7], this.m_triangles[triIdx*9+8]]);

            node.AABBMins = this._minVec3(node.AABBMins, V0);
            node.AABBMins = this._minVec3(node.AABBMins, V1);
            node.AABBMins = this._minVec3(node.AABBMins, V2);

            node.AABBMaxs = this._maxVec3(node.AABBMaxs, V0);
            node.AABBMaxs = this._maxVec3(node.AABBMaxs, V1);
            node.AABBMaxs = this._maxVec3(node.AABBMaxs, V2);
        }
        
        this.m_BVHNodes[nodeIdx] = node;
    }

    private _subdivideNode(nodeIdx: number): void {
        let node = this.m_BVHNodes[nodeIdx];

        if(node.triangleCount <= 2) {
            return;
        }

        //find split axis
        let extent = this._subVec3(node.AABBMaxs, node.AABBMins);
        let axis = 0;
        if(extent[1] > extent[0]) {
            axis = 1;
        }
        else if(extent[2] > extent[axis]) {
            axis = 2;
        }
        
        let splitPos = node.AABBMins[axis] + (extent[axis] / 2);

        //Quicksort triangles based on split axis
        let i = node.leftFirst;
        let j = i + node.triangleCount - 1;

        while(i<=j) {
            let triIdx = this.m_triangleIdx[i];
            let centroid: Float32Array =  this._getCentroid(triIdx);
            if(centroid[axis] < splitPos) {
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
            AABBMins: new Float32Array(),
            AABBMaxs: new Float32Array()
        };
        
        this.m_BVHNodes[rightChildIdx] = {
            leftFirst: i,
            triangleCount: node.triangleCount - leftCount,
            AABBMins: new Float32Array(),
            AABBMaxs: new Float32Array()
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

            //print triangles of bvh 
            for(let first = node.leftFirst, i=0; i < node.triangleCount; i++) {
                let triIdx = this.m_triangleIdx[first+i];
            }
        }
    }

    private _buildBVH(): void {
        
        //set initial triangle indices
        for(let i = 0; i < this.m_triangleIdx.length; i++) {
            this.m_triangleIdx[i] = i;
        }
        
        //set centroids
        for(let i = 0; i < this.m_triangleIdx.length; i++) { //Traverse triangles (as much as triangle count)
            let v0 = new Float32Array([this.m_triangles[i*9+0], this.m_triangles[i*9+1], this.m_triangles[i*9+2]]);
            let v1 = new Float32Array([this.m_triangles[i*9+3], this.m_triangles[i*9+4], this.m_triangles[i*9+5]]);
            let v2 = new Float32Array([this.m_triangles[i*9+6], this.m_triangles[i*9+7], this.m_triangles[i*9+8]]);

            this.m_centroids[i*3+0] = (v0[0] + v1[0] + v2[0]) / 3.0;
            this.m_centroids[i*3+1] = (v0[1] + v1[1] + v2[1]) / 3.0;
            this.m_centroids[i*3+2] = (v0[2] + v1[2] + v2[2]) / 3.0;
        }

        this.m_BVHNodes[this.m_rootNodeIdx] = {
            leftFirst: 0,
            triangleCount: this.m_triangleIdx.length,
            AABBMins: new Float32Array(),
            AABBMaxs: new Float32Array()
        };

        this._updateAABBs(this.m_rootNodeIdx);
        this._subdivideNode(this.m_rootNodeIdx);
        this._printBVH();
    }

    private m_triangles: Float32Array;
    private m_BVHNodes: Array<BVHNode>;
    private m_centroids: Float32Array;
    private m_rootNodeIdx: number = 0;
    private m_nodeCount: number = 0;
    private m_triangleIdx: Uint32Array;
}

export { BVH };