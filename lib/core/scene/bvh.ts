
class float3{
    public constructor(x?: number, y?: number, z?: number) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
        this.padding = 0;
    }

    public data(): Float32Array {
        return new Float32Array([this.x, this.y, this.z, this.padding]);
    }

    public static min(a: float3, b: float3): float3 {
        return new float3(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
    }

    public static max(a: float3, b: float3): float3 {
        return new float3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
    }

    public static sub(a: float3, b: float3): float3 {
        return new float3(a.x - b.x, a.y - b.y, a.z - b.z);
    }

    public static add(a: float3, b: float3): float3 {  
        return new float3(a.x + b.x, a.y + b.y, a.z + b.z);
    }

    public x: number;
    public y: number;
    public z: number;
    public padding: number;
}

interface BVHNode {
    leftChild: number;
    triangleIndex: number;
    triangleCount: number;
    AABBMins: float3;
    AABBMaxs: float3;
}

const FLT_MAX = 3.40282347e+38;

class BVH { 
    
    public constructor() {

    }
    public build(vertices: Float32Array): void {
        this.m_triangles = vertices;
        let N = vertices.length / 9; //triangle count
        this.m_BVHNodes = new Array<BVHNode>(N*2-1);
        this.m_centroids = new Array<float3>(N);
        this.m_triangleIdx = new Array<number>(N);
        this._buildBVH();
    }

    private _updateAABBs(nodeIdx: number): void {

        let node = this.m_BVHNodes[nodeIdx];
        node.AABBMins = new float3(FLT_MAX, FLT_MAX, FLT_MAX);
        node.AABBMaxs = new float3(-FLT_MAX, -FLT_MAX, -FLT_MAX);

        for(let i = node.triangleIndex; i < node.triangleIndex + node.triangleCount; i++) {
            let triIdx = this.m_triangleIdx[i];

            let V0 = new float3(this.m_triangles[triIdx *9], this.m_triangles[triIdx*9+1], this.m_triangles[triIdx*9+2]);
            let V1 = new float3(this.m_triangles[triIdx*9+3], this.m_triangles[triIdx*9+4], this.m_triangles[triIdx*9+5]);
            let V2 = new float3(this.m_triangles[triIdx*9+6], this.m_triangles[triIdx*9+7], this.m_triangles[triIdx*9+8]);

            node.AABBMins = float3.min(node.AABBMins, V0);
            node.AABBMins = float3.min(node.AABBMins, V1);
            node.AABBMins = float3.min(node.AABBMins, V2);

            node.AABBMaxs = float3.max(node.AABBMaxs, V0);
            node.AABBMaxs = float3.max(node.AABBMaxs, V1);
            node.AABBMaxs = float3.max(node.AABBMaxs, V2);
        }    
    }

    private _subdivideNode(nodeIdx: number): void {
        let node = this.m_BVHNodes[nodeIdx];
        if(node.triangleCount <= 2) {
            return;
        }

        //find split axis
        let extent = float3.sub(node.AABBMaxs, node.AABBMins);
        let axis = 0;
        if(extent.y > extent.x && extent.y > extent.z) {
            axis = 1;
        }
        else if(extent.z > extent.x && extent.z > extent.y) {
            axis = 2;
        }
        
        let splitPos = (node.AABBMaxs.data()[axis] + node.AABBMins.data()[axis]) * 0.5;

        //Quicksort triangles based on split axis
        let i = node.triangleIndex;
        let j = i + node.triangleCount - 1;

        while(i<=j) {
            let triIdx = this.m_triangleIdx[i];
            let centroid = this.m_centroids[triIdx];
            if(centroid.data()[axis] < splitPos) {
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
        let leftCount = i - node.triangleIndex;
        if(leftCount == 0 || leftCount == node.triangleCount) {
            return;
        }

        //create child nodes
        let leftChildIdx = this.m_nodeCount;
        this.m_nodeCount++;
        let rightChildIdx = this.m_nodeCount;
        this.m_nodeCount++;

        this.m_BVHNodes[leftChildIdx] = {
            leftChild: 0,
            triangleIndex: node.triangleIndex,
            triangleCount: leftCount,
            AABBMins: new float3(),
            AABBMaxs: new float3()
        };
        this.m_BVHNodes[rightChildIdx] = {
            leftChild: 0,
            triangleIndex: i,
            triangleCount: node.triangleCount - leftCount,
            AABBMins: new float3(),
            AABBMaxs: new float3()
        };

        node.leftChild = leftChildIdx;
        node.triangleCount = 0;
        this._updateAABBs(leftChildIdx);
        this._updateAABBs(rightChildIdx);

        //recurse
        this._subdivideNode(leftChildIdx);
        this._subdivideNode(rightChildIdx);
    }

    private _buildBVH(): void {
        
        //set initial triangle indices
        for(let i = 0; i < this.m_triangleIdx.length; i++) {
            this.m_triangleIdx[i] = i;
        }

        //set centroids
        for(let i = 0; i < this.m_centroids.length; i++) {
            let centroid_x = (this.m_triangles[i*9]   + this.m_triangles[i*9+3] + this.m_triangles[i*9+6]) * 0.333333333;
            let centroid_y = (this.m_triangles[i*9+1] + this.m_triangles[i*9+4] + this.m_triangles[i*9+7]) * 0.333333333;
            let centroid_z = (this.m_triangles[i*9+2] + this.m_triangles[i*9+5] + this.m_triangles[i*9+8]) * 0.333333333;
            this.m_centroids[i].x = centroid_x;
            this.m_centroids[i].y = centroid_y;
            this.m_centroids[i].z = centroid_z;
        }

        let rootNode: BVHNode = {
            leftChild: 0,
            triangleIndex: 0,
            triangleCount: this.m_triangleIdx.length,
            AABBMins: new float3(),
            AABBMaxs: new float3()
        };

        this.m_BVHNodes[this.m_rootNodeIdx] = rootNode;
        this._updateAABBs(this.m_rootNodeIdx);
        this._subdivideNode(this.m_rootNodeIdx);
    }

    private m_triangles: Float32Array;
    private m_BVHNodes: BVHNode[];
    private m_centroids: float3[];
    private m_rootNodeIdx: number = 0;
    private m_nodeCount: number = 1;
    private m_triangleIdx: number[];
}

export { BVH };